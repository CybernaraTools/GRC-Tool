import type {
  AiFailureReason,
  AiGenerationRun,
  AiGenerationStatus,
  AiPublicationEvent,
  ApprovedControlContext,
  EvaluationCase,
  EvaluationResult,
  EvaluationSuite,
  GeneratedQuestionCandidate,
  GenerationCitation,
  GenerationParameters,
  KnowledgeChunk,
  ModelDeployment,
  PromptVersion,
  QuestionVersion,
  RetrievalIndex,
  RetrievalRun,
  RetrievedChunk,
  SafetyCheck
} from "../domain/governance.js";
import type { Pagination } from "../../../shared/pagination.js";

export interface AiOrchestrationRecordMetadata {
  versionNumber: number;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

// ai_publication_events is append-only (0020) with created_by/created_at generated columns and
// no updated_by/updated_at at all — matching the same pattern already established for
// risk_acceptance_reviews/policy_attestations/access_review_decisions.
export interface AiOrchestrationAppendOnlyMetadata {
  versionNumber: number;
  classification: string;
  createdBy: string;
  createdAt: Date;
}

export type KnowledgeChunkRow = KnowledgeChunk & AiOrchestrationRecordMetadata;
export type RetrievalRunRow = RetrievalRun & AiOrchestrationRecordMetadata;
export type RetrievedChunkRow = RetrievedChunk & AiOrchestrationRecordMetadata;
export type GenerationCitationRow = GenerationCitation & AiOrchestrationRecordMetadata;
export type SafetyCheckRow = SafetyCheck & AiOrchestrationRecordMetadata;
export type EvaluationSuiteRow = EvaluationSuite & AiOrchestrationRecordMetadata;
export type EvaluationCaseRow = EvaluationCase & AiOrchestrationRecordMetadata;
export type EvaluationResultRow = EvaluationResult & AiOrchestrationRecordMetadata;
export type AiPublicationEventRow = AiPublicationEvent & AiOrchestrationAppendOnlyMetadata;

export interface AiGenerationRunRecord extends AiGenerationRun {
  version: number;
  failureReason?: AiFailureReason;
  provenance: Record<string, unknown>;
  classification: string;
  createdBy: string;
  updatedBy: string;
  updatedAt: Date;
}

export interface AiQuestionVersionRecord extends QuestionVersion {
  tenantId: string;
  generationRunId: string;
  generationStatus: AiGenerationStatus;
  versionNumber: number;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface AiOutputReviewRecord {
  id: string;
  tenantId: string;
  generationRunId: string;
  reviewerId: string;
  decision: "approved" | "rejected" | "needs_changes";
  rationale: string;
  createdAt: Date;
}

export interface AiGovernanceBundle {
  promptVersion: PromptVersion;
  modelDeployment: ModelDeployment;
  retrievalIndex: RetrievalIndex;
}

export interface AiGenerationRequestInput {
  tenantId: string;
  actorId: string;
  generationParameters: GenerationParameters;
  controls: ApprovedControlContext[];
  providerQuestions?: GeneratedQuestionCandidate[];
  failureReason?: AiFailureReason;
}

export interface AiOrchestrationRepository {
  resolveControlContexts(input: {
    tenantId: string;
    actorId: string;
    query: string;
    limit: number;
    frameworkKeys?: string[];
  }): Promise<ApprovedControlContext[]>;
  ensureGovernance(input: {
    tenantId: string;
    actorId: string;
    controls: ApprovedControlContext[];
  }): Promise<AiGovernanceBundle>;
  createGenerationRun(run: AiGenerationRun): Promise<AiGenerationRunRecord>;
  listPendingQuestions(tenantId: string, pagination: Pagination): Promise<AiQuestionVersionRecord[]>;
  listApprovedQuestions(tenantId: string, pagination: Pagination): Promise<AiQuestionVersionRecord[]>;
  findGenerationRun(tenantId: string, generationRunId: string): Promise<AiGenerationRunRecord | null>;
  findQuestion(tenantId: string, questionId: string): Promise<AiQuestionVersionRecord | null>;
  recordReview(input: {
    tenantId: string;
    generationRunId: string;
    reviewerId: string;
    decision: "approved" | "rejected";
    rationale: string;
    questions: QuestionVersion[];
  }): Promise<AiGenerationRunRecord>;

  // G-06 Phase 1 (0020_g06_ai_provenance_lineage.sql).
  createKnowledgeChunk(input: { chunk: KnowledgeChunk; actorId: string }): Promise<KnowledgeChunkRow>;
  listKnowledgeChunks(input: { tenantId: string; pagination: Pagination }): Promise<KnowledgeChunkRow[]>;
  createRetrievalRun(input: { run: RetrievalRun; actorId: string }): Promise<RetrievalRunRow>;
  listRetrievalRuns(input: { tenantId: string; pagination: Pagination }): Promise<RetrievalRunRow[]>;
  createRetrievedChunk(input: { chunk: RetrievedChunk; actorId: string }): Promise<RetrievedChunkRow>;
  listRetrievedChunks(input: {
    tenantId: string;
    retrievalRunId: string;
    pagination: Pagination;
  }): Promise<RetrievedChunkRow[]>;
  createGenerationCitation(input: { citation: GenerationCitation; actorId: string }): Promise<GenerationCitationRow>;
  listGenerationCitations(input: {
    tenantId: string;
    generationRunId: string;
    pagination: Pagination;
  }): Promise<GenerationCitationRow[]>;
  createSafetyCheck(input: { check: SafetyCheck; actorId: string }): Promise<SafetyCheckRow>;
  listSafetyChecks(input: {
    tenantId: string;
    generationRunId: string;
    pagination: Pagination;
  }): Promise<SafetyCheckRow[]>;
  createEvaluationSuite(input: { suite: EvaluationSuite; actorId: string }): Promise<EvaluationSuiteRow>;
  listEvaluationSuites(input: { tenantId: string; pagination: Pagination }): Promise<EvaluationSuiteRow[]>;
  findEvaluationSuite(tenantId: string, suiteId: string): Promise<EvaluationSuiteRow | null>;
  createEvaluationCase(input: { evaluationCase: EvaluationCase; actorId: string }): Promise<EvaluationCaseRow>;
  listEvaluationCases(input: { tenantId: string; suiteId: string; pagination: Pagination }): Promise<EvaluationCaseRow[]>;
  findEvaluationCase(tenantId: string, caseId: string): Promise<EvaluationCaseRow | null>;
  createEvaluationResult(input: { result: EvaluationResult; actorId: string }): Promise<EvaluationResultRow>;
  listEvaluationResults(input: {
    tenantId: string;
    suiteId: string;
    pagination: Pagination;
  }): Promise<EvaluationResultRow[]>;
  createPublicationEvent(input: { event: AiPublicationEvent; actorId: string }): Promise<AiPublicationEventRow>;
  listPublicationEvents(input: {
    tenantId: string;
    targetType: string;
    targetId: string;
    pagination: Pagination;
  }): Promise<AiPublicationEventRow[]>;
}
