import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { AuditLogService } from "../../audit-security/public.js";
import { OutboxService } from "../../outbox/public.js";
import { QuestionRepositoryService } from "../../assessment/public.js";
import {
  approveGeneratedQuestionSet,
  assertAiActionPermitted,
  createAiPublicationEvent,
  createEvaluationCase,
  createEvaluationResult,
  createEvaluationSuite,
  createGenerationCitation,
  createKnowledgeChunk,
  createRetrievalRun,
  createRetrievedChunk,
  createSafetyCheck,
  type AiResponseType,
  type AiActorKind,
  type AiFailureReason,
  type ApprovedControlContext,
  type GeneratedQuestionCandidate,
  type GenerationParameters,
  type KnowledgeChunkSourceType,
  type RetrievedChunkAclDecision,
  type SafetyCheckResult,
  type SafetyCheckType
} from "../domain/governance.js";
import { createQuestionGenerationRun } from "../domain/governance.js";
import { AI_ORCHESTRATION_REPOSITORY } from "./tokens.js";
import type {
  AiGenerationRunRecord,
  AiOrchestrationRepository,
  AiPublicationEventRow,
  AiQuestionVersionRecord,
  EvaluationCaseRow,
  EvaluationResultRow,
  EvaluationSuiteRow,
  GenerationCitationRow,
  KnowledgeChunkRow,
  RetrievalRunRow,
  RetrievedChunkRow,
  SafetyCheckRow
} from "./ai-orchestration.types.js";
import type { Pagination } from "../../../shared/pagination.js";
import { OpenAiQuestionGeneratorService } from "./openai-question-generator.service.js";

interface AiOperationPayload extends Record<string, unknown> {
  generationRunId?: string;
  questionId?: string;
  knowledgeChunkId?: string;
  retrievalRunId?: string;
  retrievedChunkId?: string;
  generationCitationId?: string;
  safetyCheckId?: string;
  evaluationSuiteId?: string;
  evaluationCaseId?: string;
  evaluationResultId?: string;
}

@Injectable()
export class AiOrchestrationService {
  constructor(
    @Inject(AI_ORCHESTRATION_REPOSITORY) private readonly repository: AiOrchestrationRepository,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(AuditLogService) private readonly auditLog: AuditLogService,
    @Optional() @Inject(OpenAiQuestionGeneratorService) private readonly questionGenerator?: OpenAiQuestionGeneratorService,
    @Optional() @Inject(QuestionRepositoryService) private readonly questionRepository?: QuestionRepositoryService
  ) {}

  async requestGeneration(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    generationParameters: GenerationParameters;
    controls?: ApprovedControlContext[];
    providerQuestions?: GeneratedQuestionCandidate[];
    responseTypes?: AiResponseType[];
    questionFocus?: string;
    frameworkKeys?: string[];
  }): Promise<AiGenerationRunRecord> {
    const replay = await this.replayedGeneration(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const controls = await this.resolveGenerationControls(input);
    const providerQuestions = input.providerQuestions ?? await this.generateProviderQuestions({ ...input, controls });
    return this.createGeneration({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      generationParameters: input.generationParameters,
      controls,
      providerQuestions,
      eventType: "ai.generation_requested"
    });
  }

  async triggerFallback(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    generationParameters: GenerationParameters;
    controls?: ApprovedControlContext[];
    questionFocus?: string;
    frameworkKeys?: string[];
    failureReason: AiFailureReason;
  }): Promise<AiGenerationRunRecord> {
    const controls = await this.resolveGenerationControls(input);
    return this.createGeneration({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      generationParameters: input.generationParameters,
      controls,
      failureReason: input.failureReason,
      eventType: "ai.fallback_triggered"
    });
  }

  async listPendingQuestions(tenantId: string, pagination: Pagination): Promise<AiQuestionVersionRecord[]> {
    return this.repository.listPendingQuestions(tenantId, pagination);
  }

  async listApprovedQuestions(tenantId: string, pagination: Pagination): Promise<AiQuestionVersionRecord[]> {
    return this.repository.listApprovedQuestions(tenantId, pagination);
  }

  async getGeneration(tenantId: string, generationRunId: string): Promise<AiGenerationRunRecord> {
    const run = await this.repository.findGenerationRun(tenantId, generationRunId);
    if (!run) {
      throw new NotFoundException("AI generation run not found.");
    }
    return run;
  }

  async getProvenance(tenantId: string, generationRunId: string): Promise<Record<string, unknown>> {
    const run = await this.getGeneration(tenantId, generationRunId);
    const safetyChecks = await this.repository.listSafetyChecks({
      tenantId,
      generationRunId,
      pagination: { limit: 50, offset: 0 }
    });
    const citations = await this.repository.listGenerationCitations({
      tenantId,
      generationRunId,
      pagination: { limit: 50, offset: 0 }
    });

    return {
      generationRunId: run.id,
      status: run.status,
      promptVersionId: run.promptVersionId,
      modelDeploymentId: run.modelDeploymentId,
      retrievalIndexId: run.retrievalIndexId,
      generationParameters: run.generationParameters,
      inputFingerprint: run.inputFingerprint,
      outputFingerprint: run.outputFingerprint,
      failureReason: run.failureReason ?? null,
      safetyChecks: safetyChecks.map(check => ({
        checkType: check.checkType,
        policyVersion: check.policyVersion,
        result: check.result,
        score: check.score,
        redactionSummary: check.redactionSummary
      })),
      citations: citations.map(citation => ({
        outputPath: citation.outputPath,
        knowledgeChunkId: citation.knowledgeChunkId,
        locator: citation.locator,
        entailmentScore: citation.entailmentScore
      })),
      questions: run.questions.map((question) => ({
        id: question.id,
        questionVersion: question.version,
        questionText: question.questionText,
        responseType: question.responseType,
        evidenceExpectationIds: question.evidenceExpectationIds,
        state: question.state,
        confidence: question.confidence,
        citations: question.citations
      }))
    };
  }

  async review(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    generationRunId: string;
    decision: "approved" | "rejected";
    rationale: string;
    reviewerKind: AiActorKind;
  }): Promise<AiGenerationRunRecord> {
    const replay = await this.replayedGeneration(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    if (input.reviewerKind !== "human") {
      throw new BadRequestException("AI output review requires a human reviewer.");
    }
    assertAiActionPermitted(input.reviewerKind, "approve_output");
    const run = await this.getGeneration(input.tenantId, input.generationRunId);
    const reviewed =
      input.decision === "approved"
        ? approveGeneratedQuestionSet(run, {
            reviewerId: input.actorId,
            reviewerKind: input.reviewerKind,
            rationale: input.rationale
          })
        : { ...run, status: "rejected" as const, questions: run.questions.map((question) => ({ ...question, state: "rejected" as const })) };
    const persisted = await this.repository.recordReview({
      tenantId: input.tenantId,
      generationRunId: input.generationRunId,
      reviewerId: input.actorId,
      decision: input.decision,
      rationale: input.rationale,
      questions: reviewed.questions
    });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: `ai.generation_${input.decision}`,
      aggregateType: "ai_generation_run",
      aggregateId: persisted.id,
      payload: { generationRunId: persisted.id },
      body: { generationRunId: persisted.id, decision: input.decision, rationale: input.rationale }
    });
    return persisted;
  }

  async publishQuestion(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    questionId: string;
  }): Promise<AiQuestionVersionRecord> {
    const replay = await this.replayedQuestion(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const question = await this.repository.findQuestion(input.tenantId, input.questionId);
    if (!question) {
      throw new NotFoundException("AI question version not found.");
    }
    if (question.state !== "approved" || question.generationStatus !== "approved" || !question.approvedBy) {
      throw new ConflictException("AI-origin content requires prior human approval before publish.");
    }
    await this.ensureQuestionPublished({ tenantId: input.tenantId, actorId: input.actorId, question });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "ai.question_published",
      aggregateType: "ai_question_version",
      aggregateId: question.id,
      payload: { questionId: question.id, generationRunId: question.generationRunId },
      body: { questionId: question.id, generationRunId: question.generationRunId }
    });
    return question;
  }

  async publishGenerationQuestions(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    generationRunId: string;
  }): Promise<AiGenerationRunRecord> {
    const replay = await this.replayedGeneration(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const run = await this.getGeneration(input.tenantId, input.generationRunId);
    if (run.status !== "approved") {
      throw new ConflictException("AI-origin question set requires prior human approval before publish.");
    }
    const approvedQuestions = run.questions.filter((question) => question.state === "approved" && question.approvedBy);
    if (approvedQuestions.length === 0) {
      throw new ConflictException("AI-origin question set has no approved questions to publish.");
    }
    for (const question of approvedQuestions) {
      await this.ensureQuestionPublished({
        tenantId: input.tenantId,
        actorId: input.actorId,
        question: {
          ...question,
          tenantId: input.tenantId,
          generationRunId: run.id,
          generationStatus: run.status,
          versionNumber: run.version,
          classification: run.classification,
          createdBy: run.createdBy,
          createdAt: run.createdAt,
          updatedBy: run.updatedBy,
          updatedAt: run.updatedAt
        }
      });
    }
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "ai.generation_published",
      aggregateType: "ai_generation_run",
      aggregateId: run.id,
      payload: { generationRunId: run.id },
      body: { generationRunId: run.id, publishedQuestionCount: approvedQuestions.length }
    });
    return this.getGeneration(input.tenantId, run.id);
  }

  async getPublicationEvents(
    tenantId: string,
    targetType: string,
    targetId: string,
    pagination: Pagination
  ): Promise<AiPublicationEventRow[]> {
    return this.repository.listPublicationEvents({ tenantId, targetType, targetId, pagination });
  }

  private async ensureQuestionPublished(input: {
    tenantId: string;
    actorId: string;
    question: AiQuestionVersionRecord;
  }): Promise<void> {
    // G-06 Phase 1: "publish" used to be an outbox event only, with no real persisted
    // approval-to-publish record. Keep the append-only publication event, but make the
    // operation idempotent across individual and whole-run publish actions.
    const existingEvents = await this.repository.listPublicationEvents({
      tenantId: input.tenantId,
      targetType: "ai_question_version",
      targetId: input.question.id,
      pagination: { limit: 1, offset: 0 }
    });
    if (existingEvents.length === 0) {
      const event = createAiPublicationEvent({
        tenantId: input.tenantId,
        targetType: "ai_question_version",
        targetId: input.question.id,
        generationRunId: input.question.generationRunId,
        approvedVersionId: input.question.id,
        approverId: input.question.approvedBy ?? input.actorId
      });
      await this.repository.createPublicationEvent({ event, actorId: input.actorId });
    }
    await this.questionRepository?.publishAiQuestion({
      actorId: input.actorId,
      question: input.question
    });
  }

  private async createGeneration(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    generationParameters: GenerationParameters;
    controls: ApprovedControlContext[];
    providerQuestions?: GeneratedQuestionCandidate[];
    failureReason?: AiFailureReason;
    eventType: string;
  }): Promise<AiGenerationRunRecord> {
    const replay = await this.replayedGeneration(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const governance = await this.repository.ensureGovernance({
      tenantId: input.tenantId,
      actorId: input.actorId,
      controls: input.controls
    });
    const run = createQuestionGenerationRun({
      tenantId: input.tenantId,
      actorId: input.actorId,
      promptVersion: governance.promptVersion,
      modelDeployment: governance.modelDeployment,
      retrievalIndex: governance.retrievalIndex,
      generationParameters: input.generationParameters,
      controls: input.controls,
      providerQuestions: input.providerQuestions,
      failureReason: input.failureReason
    });
    const persisted = await this.repository.createGenerationRun(run);
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: input.eventType,
      aggregateType: "ai_generation_run",
      aggregateId: persisted.id,
      payload: { generationRunId: persisted.id },
      body: { generationRunId: persisted.id, status: persisted.status }
    });
    return persisted;
  }

  private async generateProviderQuestions(input: {
    generationParameters: GenerationParameters;
    controls: ApprovedControlContext[];
    responseTypes?: AiResponseType[];
    questionFocus?: string;
  }): Promise<GeneratedQuestionCandidate[]> {
    if (!this.questionGenerator) {
      throw new BadRequestException("OpenAI question generation is not configured.");
    }
    return this.questionGenerator.generateQuestions({
      generationParameters: input.generationParameters,
      controls: input.controls,
      responseTypes: normalizeResponseTypes(input.responseTypes),
      questionFocus: input.questionFocus
    });
  }

  private async resolveGenerationControls(input: {
    tenantId: string;
    actorId: string;
    generationParameters: GenerationParameters;
    controls?: ApprovedControlContext[];
    questionFocus?: string;
    frameworkKeys?: string[];
  }): Promise<ApprovedControlContext[]> {
    if (input.controls && input.controls.length > 0) {
      return input.controls;
    }
    const query = input.questionFocus?.trim();
    if (!query) {
      throw new BadRequestException("questionFocus is required when control context is not supplied.");
    }
    const contexts = await this.repository.resolveControlContexts({
      tenantId: input.tenantId,
      actorId: input.actorId,
      query,
      limit: 1,
      frameworkKeys: normalizeFrameworkKeys(input.frameworkKeys)
    });
    if (contexts.length === 0) {
      throw new BadRequestException("No relevant control context was found for the requested AI question focus.");
    }
    return contexts;
  }

  // G-06 Phase 1 (AI provenance lineage, migration 0020_g06_ai_provenance_lineage.sql). Simple
  // create+list surfaces without idempotency replay for the platform-config-style entities
  // (knowledge chunks, evaluation suites/cases) — matching the same pattern used for G-09's
  // risk_models, since there is no meaningful "retry the same creation" scenario for these.
  async createKnowledgeChunk(input: {
    tenantId: string;
    actorId: string;
    retrievalIndexId: string;
    sourceType: KnowledgeChunkSourceType;
    sourceId: string;
    sourceVersion: string;
    contentHash: string;
    aclJson?: Record<string, unknown>;
    textUri: string;
  }): Promise<KnowledgeChunkRow> {
    const chunk = this.fromDomain(() => createKnowledgeChunk(input));
    return this.repository.createKnowledgeChunk({ chunk, actorId: input.actorId });
  }

  listKnowledgeChunks(tenantId: string, pagination: Pagination): Promise<KnowledgeChunkRow[]> {
    return this.repository.listKnowledgeChunks({ tenantId, pagination });
  }

  async createRetrievalRun(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    queryHash: string;
    filtersJson?: Record<string, unknown>;
    retrievalIndexId: string;
    topK: number;
  }): Promise<RetrievalRunRow> {
    const replay = await this.replayedRetrievalRun(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const run = this.fromDomain(() => createRetrievalRun(input));
    const persisted = await this.repository.createRetrievalRun({ run, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "ai.retrieval_run_created",
      aggregateType: "retrieval_run",
      aggregateId: persisted.id,
      payload: { retrievalRunId: persisted.id },
      body: { retrievalRunId: persisted.id, topK: persisted.topK }
    });
    return persisted;
  }

  listRetrievalRuns(tenantId: string, pagination: Pagination): Promise<RetrievalRunRow[]> {
    return this.repository.listRetrievalRuns({ tenantId, pagination });
  }

  async createRetrievedChunk(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    retrievalRunId: string;
    knowledgeChunkId: string;
    rank: number;
    score: number;
    aclDecision: RetrievedChunkAclDecision;
  }): Promise<RetrievedChunkRow> {
    const replayed = await this.outbox.findByIdempotencyKey(input.tenantId, input.idempotencyKey);
    if (replayed) {
      const chunks = await this.repository.listRetrievedChunks({
        tenantId: input.tenantId,
        retrievalRunId: input.retrievalRunId,
        pagination: { limit: 200, offset: 0 }
      });
      const payload = replayed.payload as Partial<AiOperationPayload>;
      const match = chunks.find((chunk) => chunk.id === payload.retrievedChunkId);
      if (match) {
        return match;
      }
    }
    const chunk = this.fromDomain(() => createRetrievedChunk(input));
    const persisted = await this.repository.createRetrievedChunk({ chunk, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "ai.retrieved_chunk_recorded",
      aggregateType: "retrieved_chunk",
      aggregateId: persisted.id,
      payload: { retrievedChunkId: persisted.id },
      body: { retrievedChunkId: persisted.id, rank: persisted.rank }
    });
    return persisted;
  }

  listRetrievedChunks(tenantId: string, retrievalRunId: string, pagination: Pagination): Promise<RetrievedChunkRow[]> {
    return this.repository.listRetrievedChunks({ tenantId, retrievalRunId, pagination });
  }

  async createGenerationCitation(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    generationRunId: string;
    outputPath: string;
    knowledgeChunkId: string;
    locator?: string;
    entailmentScore?: number;
  }): Promise<GenerationCitationRow> {
    const replayed = await this.outbox.findByIdempotencyKey(input.tenantId, input.idempotencyKey);
    if (replayed) {
      const citations = await this.repository.listGenerationCitations({
        tenantId: input.tenantId,
        generationRunId: input.generationRunId,
        pagination: { limit: 200, offset: 0 }
      });
      const payload = replayed.payload as Partial<AiOperationPayload>;
      const match = citations.find((citation) => citation.id === payload.generationCitationId);
      if (match) {
        return match;
      }
    }
    await this.getGeneration(input.tenantId, input.generationRunId);
    const citation = this.fromDomain(() => createGenerationCitation(input));
    const persisted = await this.repository.createGenerationCitation({ citation, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "ai.generation_citation_recorded",
      aggregateType: "generation_citation",
      aggregateId: persisted.id,
      payload: { generationCitationId: persisted.id },
      body: { generationCitationId: persisted.id, outputPath: persisted.outputPath }
    });
    return persisted;
  }

  async listGenerationCitations(tenantId: string, generationRunId: string, pagination: Pagination): Promise<GenerationCitationRow[]> {
    await this.getGeneration(tenantId, generationRunId);
    return this.repository.listGenerationCitations({ tenantId, generationRunId, pagination });
  }

  async createSafetyCheck(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    generationRunId: string;
    checkType: SafetyCheckType;
    policyVersion: string;
    result: SafetyCheckResult;
    score?: number;
    redactionSummary?: Record<string, unknown>;
  }): Promise<SafetyCheckRow> {
    const replayed = await this.outbox.findByIdempotencyKey(input.tenantId, input.idempotencyKey);
    if (replayed) {
      const checks = await this.repository.listSafetyChecks({
        tenantId: input.tenantId,
        generationRunId: input.generationRunId,
        pagination: { limit: 200, offset: 0 }
      });
      const payload = replayed.payload as Partial<AiOperationPayload>;
      const match = checks.find((check) => check.id === payload.safetyCheckId);
      if (match) {
        return match;
      }
    }
    await this.getGeneration(input.tenantId, input.generationRunId);
    const check = this.fromDomain(() => createSafetyCheck(input));
    const persisted = await this.repository.createSafetyCheck({ check, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "ai.safety_check_recorded",
      aggregateType: "safety_check",
      aggregateId: persisted.id,
      payload: { safetyCheckId: persisted.id },
      body: { safetyCheckId: persisted.id, result: persisted.result }
    });
    return persisted;
  }

  async listSafetyChecks(tenantId: string, generationRunId: string, pagination: Pagination): Promise<SafetyCheckRow[]> {
    await this.getGeneration(tenantId, generationRunId);
    return this.repository.listSafetyChecks({ tenantId, generationRunId, pagination });
  }

  async createEvaluationSuite(input: {
    tenantId: string;
    actorId: string;
    useCase: string;
    suiteKey: string;
    suiteVersion: string;
    thresholdPolicy?: Record<string, unknown>;
  }): Promise<EvaluationSuiteRow> {
    const suite = this.fromDomain(() => createEvaluationSuite(input));
    return this.repository.createEvaluationSuite({ suite, actorId: input.actorId });
  }

  listEvaluationSuites(tenantId: string, pagination: Pagination): Promise<EvaluationSuiteRow[]> {
    return this.repository.listEvaluationSuites({ tenantId, pagination });
  }

  async getEvaluationSuite(tenantId: string, suiteId: string): Promise<EvaluationSuiteRow> {
    const suite = await this.repository.findEvaluationSuite(tenantId, suiteId);
    if (!suite) {
      throw new NotFoundException("Evaluation suite not found.");
    }
    return suite;
  }

  async createEvaluationCase(input: {
    tenantId: string;
    actorId: string;
    suiteId: string;
    caseKey: string;
    inputFixtureUri: string;
    expectedJson?: Record<string, unknown>;
  }): Promise<EvaluationCaseRow> {
    await this.getEvaluationSuite(input.tenantId, input.suiteId);
    const evaluationCase = this.fromDomain(() => createEvaluationCase(input));
    return this.repository.createEvaluationCase({ evaluationCase, actorId: input.actorId });
  }

  async listEvaluationCases(tenantId: string, suiteId: string, pagination: Pagination): Promise<EvaluationCaseRow[]> {
    await this.getEvaluationSuite(tenantId, suiteId);
    return this.repository.listEvaluationCases({ tenantId, suiteId, pagination });
  }

  async createEvaluationResult(input: {
    tenantId: string;
    actorId: string;
    suiteId: string;
    evaluationRunId: string;
    caseId: string;
    metric: string;
    score: number;
    threshold: number;
    artifactUri?: string;
  }): Promise<EvaluationResultRow> {
    const evaluationCase = await this.repository.findEvaluationCase(input.tenantId, input.caseId);
    if (!evaluationCase || evaluationCase.suiteId !== input.suiteId) {
      throw new NotFoundException("Evaluation case not found for this suite.");
    }
    const result = this.fromDomain(() => createEvaluationResult(input));
    return this.repository.createEvaluationResult({ result, actorId: input.actorId });
  }

  async listEvaluationResults(tenantId: string, suiteId: string, pagination: Pagination): Promise<EvaluationResultRow[]> {
    await this.getEvaluationSuite(tenantId, suiteId);
    return this.repository.listEvaluationResults({ tenantId, suiteId, pagination });
  }

  private async replayedRetrievalRun(tenantId: string, idempotencyKey: string): Promise<RetrievalRunRow | null> {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as Partial<AiOperationPayload>;
    if (!payload.retrievalRunId) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    const runs = await this.repository.listRetrievalRuns({ tenantId, pagination: { limit: 200, offset: 0 } });
    const match = runs.find((run) => run.id === payload.retrievalRunId);
    if (!match) {
      throw new NotFoundException("Retrieval run not found.");
    }
    return match;
  }

  private fromDomain<T>(operation: () => T): T {
    try {
      return operation();
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  private async replayedGeneration(tenantId: string, idempotencyKey: string): Promise<AiGenerationRunRecord | null> {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as Partial<AiOperationPayload>;
    if (!payload.generationRunId) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    return this.getGeneration(tenantId, payload.generationRunId);
  }

  private async replayedQuestion(tenantId: string, idempotencyKey: string): Promise<AiQuestionVersionRecord | null> {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as Partial<AiOperationPayload>;
    if (!payload.questionId) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    const question = await this.repository.findQuestion(tenantId, payload.questionId);
    if (!question) {
      throw new NotFoundException("AI question version not found.");
    }
    return question;
  }

  private async publishMutation(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    payload: AiOperationPayload;
    body: Record<string, unknown>;
  }): Promise<void> {
    const now = new Date();
    const outboxEvent = await this.outbox.publish({
      tenantId: input.tenantId,
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload,
      idempotencyKey: input.idempotencyKey,
      createdBy: input.actorId,
      now
    });
    if (outboxEvent.createdAt.getTime() !== now.getTime()) {
      return;
    }
    await this.auditLog.append({
      tenantId: input.tenantId,
      eventType: input.eventType,
      actorId: input.actorId,
      targetType: input.aggregateType,
      targetId: input.aggregateId,
      traceId: input.idempotencyKey,
      classification: "confidential",
      body: input.body
    });
  }
}

function normalizeResponseTypes(values: AiResponseType[] | undefined): AiResponseType[] {
  const requested: AiResponseType[] = values && values.length > 0 ? values : ["text"];
  return Array.from(new Set(requested));
}

function normalizeFrameworkKeys(values: string[] | undefined): string[] | undefined {
  const normalized = Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)));
  return normalized.length > 0 ? normalized : undefined;
}
