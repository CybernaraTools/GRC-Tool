import { createHash, randomUUID } from "node:crypto";

export type AiUseCase =
  | "assessment_question"
  | "mapping_suggestion"
  | "evidence_classification"
  | "control_summary"
  | "policy_draft"
  | "regulatory_impact"
  | "security_questionnaire_response";

export type AiActorKind = "human" | "ai" | "service";
export type AiRiskTier = "low" | "medium" | "high" | "critical";
export type AiGenerationStatus = "awaiting_review" | "fallback_used" | "approved" | "rejected";
export type AiReviewState = "pending_review" | "approved" | "rejected";
export type AiResponseType = "boolean" | "text" | "maturity" | "multi_select";
export type AiFailureReason =
  | "model_unavailable"
  | "retrieval_unavailable"
  | "policy_failed"
  | "evaluation_failed";

export type AiAction =
  | "draft_content"
  | "classify_evidence"
  | "summarize_control"
  | "publish_content"
  | "score_assessment"
  | "approve_output"
  | "accept_risk";

export interface GoldenSetEvaluation {
  id: string;
  score: number;
  passed: boolean;
  adversarialPassed: boolean;
  tenantIsolationPassed: boolean;
  driftWithinThreshold: boolean;
  approvedBy: string;
  approvedAt: Date;
}

export interface PromptVersion {
  id: string;
  key: string;
  version: string;
  templateSha256: string;
  status: "draft" | "approved" | "retired";
  evaluationId?: string;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface ModelDeployment {
  id: string;
  provider: string;
  modelName: string;
  deploymentVersion: string;
  region: string;
  riskTier: AiRiskTier;
  noTraining: boolean;
  egressAllowList: string[];
  status: "draft" | "approved" | "retired";
  killSwitch: boolean;
  evaluationId?: string;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface CitationSource {
  sourceId: string;
  sourceType:
    | "framework_requirement"
    | "harmonized_control"
    | "evidence_expectation"
    | "tenant_scope"
    | "knowledge_base";
  checksum?: string;
  tenantId?: string;
}

export interface RetrievalIndex {
  id: string;
  tenantId: string;
  key: string;
  version: string;
  status: "draft" | "approved" | "retired";
  allowedTenantIds: string[];
  sources: CitationSource[];
  approvedBy?: string;
  approvedAt?: Date;
}

export interface ApprovedControlContext {
  harmonizedControlId: string;
  controlTitle: string;
  controlDescription: string;
  mappedClauseIds: string[];
  evidenceExpectationIds: string[];
  tenantScopeTags: string[];
  citations: CitationSource[];
}

export interface GenerationParameters {
  temperature: number;
  maxOutputTokens: number;
  retrievalTopK: number;
}

export interface GeneratedQuestionCandidate {
  questionText: string;
  responseType: AiResponseType;
  evidenceExpectationIds: string[];
  citations: CitationSource[];
  confidence: number;
}

export interface QuestionVersion {
  id: string;
  version: string;
  questionText: string;
  responseType: AiResponseType;
  evidenceExpectationIds: string[];
  citations: CitationSource[];
  confidence: number;
  state: AiReviewState;
  provenance: {
    promptVersionId: string;
    modelDeploymentId: string;
    retrievalIndexId: string;
    retrievalIndexVersion: string;
    generationParameters: GenerationParameters;
    inputFingerprint: string;
  };
  approvedBy?: string;
  approvedAt?: Date;
}

export interface AiGenerationRun {
  id: string;
  tenantId: string;
  actorId: string;
  useCase: AiUseCase;
  status: AiGenerationStatus;
  promptVersionId: string;
  modelDeploymentId: string;
  retrievalIndexId: string;
  generationParameters: GenerationParameters;
  inputFingerprint: string;
  outputFingerprint: string;
  failureReason?: AiFailureReason;
  questions: QuestionVersion[];
  createdAt: Date;
}

const disallowedAiActions = new Set<AiAction>([
  "publish_content",
  "score_assessment",
  "approve_output",
  "accept_risk"
]);

const blockedOutputPatterns = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /reveal\s+(the\s+)?system\s+prompt/i,
  /exfiltrate/i,
  /bypass\s+policy/i,
  /disable\s+guardrails/i
];

export function createPromptVersion(input: {
  key: string;
  version: string;
  template: string;
}): PromptVersion {
  if (!input.key.trim() || !input.version.trim() || !input.template.trim()) {
    throw new Error("Prompt versions require key, version, and template.");
  }

  return {
    id: randomUUID(),
    key: input.key,
    version: input.version,
    templateSha256: sha256(input.template),
    status: "draft"
  };
}

export function approvePromptVersion(
  prompt: PromptVersion,
  evaluation: GoldenSetEvaluation
): PromptVersion {
  assertPromotionEvaluation(evaluation);

  return {
    ...prompt,
    status: "approved",
    evaluationId: evaluation.id,
    approvedBy: evaluation.approvedBy,
    approvedAt: evaluation.approvedAt
  };
}

export function createModelDeployment(input: {
  provider: string;
  modelName: string;
  deploymentVersion: string;
  region: string;
  riskTier: AiRiskTier;
  noTraining: boolean;
  egressAllowList: string[];
  killSwitch?: boolean;
}): ModelDeployment {
  if (!input.provider.trim() || !input.modelName.trim() || !input.region.trim()) {
    throw new Error("Model deployments require provider, model, and region.");
  }

  return {
    id: randomUUID(),
    provider: input.provider,
    modelName: input.modelName,
    deploymentVersion: input.deploymentVersion,
    region: input.region,
    riskTier: input.riskTier,
    noTraining: input.noTraining,
    egressAllowList: [...input.egressAllowList],
    killSwitch: input.killSwitch ?? false,
    status: "draft"
  };
}

export function approveModelDeployment(
  deployment: ModelDeployment,
  evaluation: GoldenSetEvaluation
): ModelDeployment {
  assertPromotionEvaluation(evaluation);
  if (!deployment.noTraining) {
    throw new Error("Model deployment must enforce a no-training policy.");
  }
  if (deployment.egressAllowList.length === 0) {
    throw new Error("Model deployment requires an egress allow-list.");
  }

  return {
    ...deployment,
    status: "approved",
    evaluationId: evaluation.id,
    approvedBy: evaluation.approvedBy,
    approvedAt: evaluation.approvedAt
  };
}

export function approveRetrievalIndex(
  index: Omit<RetrievalIndex, "id" | "status" | "approvedBy" | "approvedAt">,
  approval: { approvedBy: string; approvedAt?: Date }
): RetrievalIndex {
  if (!index.allowedTenantIds.includes(index.tenantId)) {
    throw new Error("Retrieval index ACL must include its owning tenant.");
  }
  if (index.sources.length === 0) {
    throw new Error("Retrieval index requires citation sources.");
  }

  return {
    ...index,
    id: randomUUID(),
    status: "approved",
    approvedBy: approval.approvedBy,
    approvedAt: approval.approvedAt ?? new Date()
  };
}

export function createQuestionGenerationRun(input: {
  tenantId: string;
  actorId: string;
  promptVersion: PromptVersion;
  modelDeployment: ModelDeployment;
  retrievalIndex: RetrievalIndex;
  generationParameters: GenerationParameters;
  controls: ApprovedControlContext[];
  providerQuestions?: GeneratedQuestionCandidate[];
  failureReason?: AiFailureReason;
  now?: Date;
}): AiGenerationRun {
  assertAiActionPermitted("ai", "draft_content");
  assertGenerationInputs(input);

  const inputFingerprint = hashObject({
    tenantId: input.tenantId,
    promptVersionId: input.promptVersion.id,
    modelDeploymentId: input.modelDeployment.id,
    retrievalIndexId: input.retrievalIndex.id,
    retrievalIndexVersion: input.retrievalIndex.version,
    generationParameters: input.generationParameters,
    controls: input.controls
  });

  const usingFallback = Boolean(input.failureReason) || !input.providerQuestions;
  const candidates = usingFallback
    ? buildCuratedFallbackQuestions(input.controls)
    : input.providerQuestions ?? [];

  assertQuestionCandidates(candidates, input.controls, input.retrievalIndex);

  const questions = candidates.map((candidate) =>
    toQuestionVersion(candidate, {
      promptVersion: input.promptVersion,
      modelDeployment: input.modelDeployment,
      retrievalIndex: input.retrievalIndex,
      generationParameters: input.generationParameters,
      inputFingerprint
    })
  );

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    actorId: input.actorId,
    useCase: "assessment_question",
    status: usingFallback ? "fallback_used" : "awaiting_review",
    promptVersionId: input.promptVersion.id,
    modelDeploymentId: input.modelDeployment.id,
    retrievalIndexId: input.retrievalIndex.id,
    generationParameters: input.generationParameters,
    inputFingerprint,
    outputFingerprint: hashObject(questions),
    failureReason: input.failureReason,
    questions,
    createdAt: input.now ?? new Date()
  };
}

export function approveGeneratedQuestionSet(
  run: AiGenerationRun,
  review: { reviewerId: string; reviewerKind: AiActorKind; rationale: string; approvedAt?: Date }
): AiGenerationRun {
  assertAiActionPermitted(review.reviewerKind, "approve_output");
  if (!review.rationale.trim()) {
    throw new Error("Reviewer approval requires rationale.");
  }
  if (run.status !== "awaiting_review" && run.status !== "fallback_used") {
    throw new Error("Only pending AI generation runs can be approved.");
  }

  const approvedAt = review.approvedAt ?? new Date();
  return {
    ...run,
    status: "approved",
    questions: run.questions.map((question) => ({
      ...question,
      state: "approved",
      approvedBy: review.reviewerId,
      approvedAt
    })),
    outputFingerprint: hashObject({
      status: "approved",
      questions: run.questions.map((question) => question.id),
      approvedBy: review.reviewerId,
      approvedAt: approvedAt.toISOString()
    })
  };
}

export function assertAiActionPermitted(actorKind: AiActorKind, action: AiAction): void {
  if (actorKind === "ai" && disallowedAiActions.has(action)) {
    throw new Error(`AI actors cannot ${action.replaceAll("_", " ")}.`);
  }
}

export function requiresSmeReview(
  candidates: GeneratedQuestionCandidate[],
  confidenceThreshold = 0.75
): boolean {
  return candidates.some((candidate) => candidate.confidence < confidenceThreshold);
}

function assertPromotionEvaluation(evaluation: GoldenSetEvaluation): void {
  if (
    !evaluation.passed ||
    !evaluation.adversarialPassed ||
    !evaluation.tenantIsolationPassed ||
    !evaluation.driftWithinThreshold
  ) {
    throw new Error("Prompt or model promotion requires a passing documented evaluation.");
  }
  if (!evaluation.approvedBy) {
    throw new Error("Promotion evaluation requires approval.");
  }
}

function assertGenerationInputs(input: {
  tenantId: string;
  promptVersion: PromptVersion;
  modelDeployment: ModelDeployment;
  retrievalIndex: RetrievalIndex;
  generationParameters: GenerationParameters;
  controls: ApprovedControlContext[];
}): void {
  if (input.promptVersion.status !== "approved") {
    throw new Error("AI generation requires an approved prompt version.");
  }
  if (input.modelDeployment.status !== "approved" || input.modelDeployment.killSwitch) {
    throw new Error("AI generation requires an approved model deployment without kill switch.");
  }
  if (!input.modelDeployment.noTraining || input.modelDeployment.egressAllowList.length === 0) {
    throw new Error("Model deployment must enforce no-training and egress allow-list controls.");
  }
  if (input.retrievalIndex.status !== "approved") {
    throw new Error("AI generation requires an approved retrieval index.");
  }
  if (!input.retrievalIndex.allowedTenantIds.includes(input.tenantId)) {
    throw new Error("Tenant is not allowed to use the retrieval index.");
  }
  if (
    input.generationParameters.temperature < 0 ||
    input.generationParameters.temperature > 0.3 ||
    input.generationParameters.maxOutputTokens <= 0 ||
    input.generationParameters.retrievalTopK <= 0
  ) {
    throw new Error("Generation parameters must be deterministic and bounded.");
  }
  if (input.controls.length === 0) {
    throw new Error("Assessment-question generation requires approved control context.");
  }

  for (const control of input.controls) {
    if (
      !control.harmonizedControlId ||
      control.mappedClauseIds.length === 0 ||
      control.evidenceExpectationIds.length === 0 ||
      control.tenantScopeTags.length === 0 ||
      control.citations.length === 0
    ) {
      throw new Error("Control context must include mappings, evidence expectations, tenant scope, and citations.");
    }
  }
}

function assertQuestionCandidates(
  candidates: GeneratedQuestionCandidate[],
  controls: ApprovedControlContext[],
  retrievalIndex: RetrievalIndex
): void {
  if (candidates.length === 0) {
    throw new Error("AI generation produced no question candidates.");
  }

  const allowedCitationIds = new Set(retrievalIndex.sources.map((source) => source.sourceId));
  const allowedEvidenceIds = new Set(controls.flatMap((control) => control.evidenceExpectationIds));
  const seenQuestions = new Set<string>();

  for (const candidate of candidates) {
    const normalized = normalizeQuestion(candidate.questionText);
    if (normalized.length < 12) {
      throw new Error("Generated questions must contain substantive text.");
    }
    if (seenQuestions.has(normalized)) {
      throw new Error("Generated question output contains duplicates.");
    }
    seenQuestions.add(normalized);

    if (candidate.confidence < 0 || candidate.confidence > 1) {
      throw new Error("Generated question confidence must be within [0, 1].");
    }
    if (candidate.citations.length === 0) {
      throw new Error("Generated questions require citations.");
    }
    if (blockedOutputPatterns.some((pattern) => pattern.test(candidate.questionText))) {
      throw new Error("Generated question failed prompt-injection or safety policy validation.");
    }

    for (const citation of candidate.citations) {
      if (!allowedCitationIds.has(citation.sourceId)) {
        throw new Error(`Generated question cites an unauthorized source: ${citation.sourceId}`);
      }
    }
    for (const evidenceExpectationId of candidate.evidenceExpectationIds) {
      if (!allowedEvidenceIds.has(evidenceExpectationId)) {
        throw new Error(`Generated question references an unknown evidence expectation: ${evidenceExpectationId}`);
      }
    }
  }
}

function buildCuratedFallbackQuestions(
  controls: ApprovedControlContext[]
): GeneratedQuestionCandidate[] {
  return controls.map((control) => ({
    questionText: [
      `Describe how ${control.controlTitle} is implemented for ${control.tenantScopeTags.join(", ")}.`,
      "Include objective evidence, exceptions, owner, frequency, and testing performed during the assessment period."
    ].join(" "),
    responseType: "text",
    evidenceExpectationIds: [...control.evidenceExpectationIds],
    citations: control.citations,
    confidence: 1
  }));
}

function toQuestionVersion(
  candidate: GeneratedQuestionCandidate,
  context: {
    promptVersion: PromptVersion;
    modelDeployment: ModelDeployment;
    retrievalIndex: RetrievalIndex;
    generationParameters: GenerationParameters;
    inputFingerprint: string;
  }
): QuestionVersion {
  return {
    id: randomUUID(),
    version: hashObject({
      text: candidate.questionText,
      citations: candidate.citations,
      evidenceExpectationIds: candidate.evidenceExpectationIds,
      promptVersionId: context.promptVersion.id,
      retrievalIndexVersion: context.retrievalIndex.version
    }),
    questionText: candidate.questionText,
    responseType: candidate.responseType,
    evidenceExpectationIds: [...candidate.evidenceExpectationIds],
    citations: [...candidate.citations],
    confidence: candidate.confidence,
    state: "pending_review",
    provenance: {
      promptVersionId: context.promptVersion.id,
      modelDeploymentId: context.modelDeployment.id,
      retrievalIndexId: context.retrievalIndex.id,
      retrievalIndexVersion: context.retrievalIndex.version,
      generationParameters: context.generationParameters,
      inputFingerprint: context.inputFingerprint
    }
  };
}

function normalizeQuestion(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashObject(value: unknown): string {
  return sha256(stableStringify(value));
}

// G-06 Phase 1 (AI provenance lineage, migration 0020_g06_ai_provenance_lineage.sql): the 5 nouns
// the gap sentence names directly — retrieved chunks, citations, safety checks, evaluation
// suites/cases/results, publication approval — built alongside, not replacing, the generation
// flow above. See the migration's header comment for the full scoping/reconciliation rationale
// (why `knowledge_chunks` is built even though only "retrieved chunks" is named; why
// `evaluation_suites`/`cases`/`results` reuse the pre-existing `ai_evaluation_runs` identity
// rather than a second "evaluation_runs" concept).

export type KnowledgeChunkSourceType = "framework_requirement" | "harmonized_control" | "policy_version" | "evidence_object";
export type RetrievedChunkAclDecision = "allowed" | "denied";
export type SafetyCheckType = "prompt_injection" | "pii_exposure" | "toxicity" | "policy_bypass" | "jailbreak";
export type SafetyCheckResult = "pass" | "fail" | "warn";
export type EvaluationSuiteStatus = "draft" | "active" | "retired";
export type AiPublicationTargetType = "ai_question_version" | "prompt_version" | "model_deployment";

export interface KnowledgeChunk {
  id: string;
  tenantId: string;
  retrievalIndexId: string;
  sourceType: KnowledgeChunkSourceType;
  sourceId: string;
  sourceVersion: string;
  contentHash: string;
  aclJson: Record<string, unknown>;
  textUri: string;
}

export function createKnowledgeChunk(input: {
  tenantId: string;
  retrievalIndexId: string;
  sourceType: KnowledgeChunkSourceType;
  sourceId: string;
  sourceVersion: string;
  contentHash: string;
  aclJson?: Record<string, unknown>;
  textUri: string;
}): KnowledgeChunk {
  if (!input.sourceId.trim() || !input.textUri.trim()) {
    throw new Error("Knowledge chunks require a source id and a text URI.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    retrievalIndexId: input.retrievalIndexId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    sourceVersion: input.sourceVersion,
    contentHash: input.contentHash,
    aclJson: input.aclJson ?? {},
    textUri: input.textUri
  };
}

export interface RetrievalRun {
  id: string;
  tenantId: string;
  queryHash: string;
  filtersJson: Record<string, unknown>;
  retrievalIndexId: string;
  topK: number;
  startedAt: Date;
  finishedAt?: Date;
}

export function createRetrievalRun(input: {
  tenantId: string;
  queryHash: string;
  filtersJson?: Record<string, unknown>;
  retrievalIndexId: string;
  topK: number;
  now?: Date;
}): RetrievalRun {
  if (input.topK < 1 || input.topK > 50) {
    throw new Error("Retrieval run top_k must be between 1 and 50.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    queryHash: input.queryHash,
    filtersJson: input.filtersJson ?? {},
    retrievalIndexId: input.retrievalIndexId,
    topK: input.topK,
    startedAt: input.now ?? new Date()
  };
}

export interface RetrievedChunk {
  id: string;
  tenantId: string;
  retrievalRunId: string;
  knowledgeChunkId: string;
  rank: number;
  score: number;
  aclDecision: RetrievedChunkAclDecision;
}

export function createRetrievedChunk(input: {
  tenantId: string;
  retrievalRunId: string;
  knowledgeChunkId: string;
  rank: number;
  score: number;
  aclDecision: RetrievedChunkAclDecision;
}): RetrievedChunk {
  if (input.rank < 1) {
    throw new Error("Retrieved chunk rank must start at 1.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    retrievalRunId: input.retrievalRunId,
    knowledgeChunkId: input.knowledgeChunkId,
    rank: input.rank,
    score: input.score,
    aclDecision: input.aclDecision
  };
}

export interface GenerationCitation {
  id: string;
  tenantId: string;
  generationRunId: string;
  outputPath: string;
  knowledgeChunkId: string;
  locator?: string;
  entailmentScore?: number;
}

export function createGenerationCitation(input: {
  tenantId: string;
  generationRunId: string;
  outputPath: string;
  knowledgeChunkId: string;
  locator?: string;
  entailmentScore?: number;
}): GenerationCitation {
  if (!input.outputPath.trim()) {
    throw new Error("Generation citations require an output path.");
  }
  if (input.entailmentScore !== undefined && (input.entailmentScore < 0 || input.entailmentScore > 1)) {
    throw new Error("Generation citation entailment score must be within [0, 1].");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    generationRunId: input.generationRunId,
    outputPath: input.outputPath,
    knowledgeChunkId: input.knowledgeChunkId,
    locator: input.locator,
    entailmentScore: input.entailmentScore
  };
}

export interface SafetyCheck {
  id: string;
  tenantId: string;
  generationRunId: string;
  checkType: SafetyCheckType;
  policyVersion: string;
  result: SafetyCheckResult;
  score?: number;
  redactionSummary: Record<string, unknown>;
}

export function createSafetyCheck(input: {
  tenantId: string;
  generationRunId: string;
  checkType: SafetyCheckType;
  policyVersion: string;
  result: SafetyCheckResult;
  score?: number;
  redactionSummary?: Record<string, unknown>;
}): SafetyCheck {
  if (!input.policyVersion.trim()) {
    throw new Error("Safety checks require a policy version.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    generationRunId: input.generationRunId,
    checkType: input.checkType,
    policyVersion: input.policyVersion,
    result: input.result,
    score: input.score,
    redactionSummary: input.redactionSummary ?? {}
  };
}

export interface EvaluationSuite {
  id: string;
  tenantId: string;
  useCase: string;
  suiteKey: string;
  suiteVersion: string;
  status: EvaluationSuiteStatus;
  thresholdPolicy: Record<string, unknown>;
}

export function createEvaluationSuite(input: {
  tenantId: string;
  useCase: string;
  suiteKey: string;
  suiteVersion: string;
  thresholdPolicy?: Record<string, unknown>;
}): EvaluationSuite {
  if (!input.useCase.trim() || !input.suiteKey.trim()) {
    throw new Error("Evaluation suites require a use case and a suite key.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    useCase: input.useCase,
    suiteKey: input.suiteKey,
    suiteVersion: input.suiteVersion,
    status: "draft",
    thresholdPolicy: input.thresholdPolicy ?? {}
  };
}

export interface EvaluationCase {
  id: string;
  tenantId: string;
  suiteId: string;
  caseKey: string;
  inputFixtureUri: string;
  expectedJson: Record<string, unknown>;
}

export function createEvaluationCase(input: {
  tenantId: string;
  suiteId: string;
  caseKey: string;
  inputFixtureUri: string;
  expectedJson?: Record<string, unknown>;
}): EvaluationCase {
  if (!input.caseKey.trim() || !input.inputFixtureUri.trim()) {
    throw new Error("Evaluation cases require a case key and an input fixture URI.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    suiteId: input.suiteId,
    caseKey: input.caseKey,
    inputFixtureUri: input.inputFixtureUri,
    expectedJson: input.expectedJson ?? {}
  };
}

export interface EvaluationResult {
  id: string;
  tenantId: string;
  evaluationRunId: string;
  caseId: string;
  metric: string;
  score: number;
  threshold: number;
  passed: boolean;
  artifactUri?: string;
}

export function createEvaluationResult(input: {
  tenantId: string;
  evaluationRunId: string;
  caseId: string;
  metric: string;
  score: number;
  threshold: number;
  artifactUri?: string;
}): EvaluationResult {
  if (!input.metric.trim()) {
    throw new Error("Evaluation results require a metric name.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    evaluationRunId: input.evaluationRunId,
    caseId: input.caseId,
    metric: input.metric,
    score: input.score,
    threshold: input.threshold,
    passed: input.score >= input.threshold,
    artifactUri: input.artifactUri
  };
}

export interface AiPublicationEvent {
  id: string;
  tenantId: string;
  targetType: AiPublicationTargetType;
  targetId: string;
  generationRunId?: string;
  approvedVersionId: string;
  approverId: string;
  publishedAt: Date;
}

export function createAiPublicationEvent(input: {
  tenantId: string;
  targetType: AiPublicationTargetType;
  targetId: string;
  generationRunId?: string;
  approvedVersionId: string;
  approverId: string;
  now?: Date;
}): AiPublicationEvent {
  if (!input.approverId) {
    throw new Error("AI publication events require an approver.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    targetType: input.targetType,
    targetId: input.targetId,
    generationRunId: input.generationRunId,
    approvedVersionId: input.approvedVersionId,
    approverId: input.approverId,
    publishedAt: input.now ?? new Date()
  };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right)
    );
    return `{${entries
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
