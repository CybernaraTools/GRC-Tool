import { randomUUID } from "node:crypto";
import type { AssessmentStatus } from "./assessment.js";

// G-01 Phase 1: the normalized execution graph (spec §10), built alongside
// the existing flat Assessment/AssessmentItem domain in assessment.ts rather
// than replacing it — see 0013_g01_assessment_execution_normalization.sql's
// header comment for the full scoping rationale. These types and functions
// are pure domain logic with no persistence concerns, mirroring the style of
// assessment.ts.
//
// G-01 completion (0017_g01_completion_remaining_tables.sql) adds the 4
// tables Phase 1 explicitly deferred: RequirementInstance, QuestionSet,
// QuestionVersion, AssessmentSignoff — see that migration's header comment
// for the reconciliation with the pre-existing ai_question_versions table.

export type ApplicabilityStatus = "pending" | "applicable" | "not_applicable";

export interface ControlInstance {
  id: string;
  tenantId: string;
  assessmentId: string;
  controlId: string;
  frameworkKey: string;
  frameworkVersion: string;
  mappingVersion: string;
  ownerId: string;
  applicabilityStatus: ApplicabilityStatus;
  status: AssessmentStatus;
  score: number | null;
  maturity: string | null;
}

export function createControlInstance(input: {
  tenantId: string;
  assessmentId: string;
  controlId: string;
  frameworkKey: string;
  frameworkVersion: string;
  mappingVersion: string;
  ownerId: string;
}): ControlInstance {
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    assessmentId: input.assessmentId,
    controlId: input.controlId,
    frameworkKey: input.frameworkKey,
    frameworkVersion: input.frameworkVersion,
    mappingVersion: input.mappingVersion,
    ownerId: input.ownerId,
    applicabilityStatus: "pending",
    status: "not_started",
    score: null,
    maturity: null
  };
}

export interface ApplicabilityDecision {
  id: string;
  controlInstanceId: string;
  decision: "applicable" | "not_applicable";
  rationale: string;
  decidedBy: string;
  approvedBy: string | null;
  decidedAt: Date;
}

export function createApplicabilityDecision(input: {
  controlInstanceId: string;
  applicable: boolean;
  rationale: string;
  decidedBy: string;
  approvedBy?: string;
  now?: Date;
}): ApplicabilityDecision {
  if (!input.rationale.trim()) {
    throw new Error("Applicability decisions require rationale.");
  }
  if (input.approvedBy && input.approvedBy === input.decidedBy) {
    throw new Error("Applicability approval requires a different principal than the decider.");
  }
  return {
    id: randomUUID(),
    controlInstanceId: input.controlInstanceId,
    decision: input.applicable ? "applicable" : "not_applicable",
    rationale: input.rationale,
    decidedBy: input.decidedBy,
    approvedBy: input.approvedBy ?? null,
    decidedAt: input.now ?? new Date()
  };
}

export interface AnswerRevision {
  id: string;
  assessmentItemId: string;
  revision: number;
  responseJson: Record<string, unknown>;
  submittedBy: string;
  submittedAt: Date;
  supersedesId: string | null;
}

export function createAnswerRevision(input: {
  assessmentItemId: string;
  revision: number;
  responseJson: Record<string, unknown>;
  submittedBy: string;
  supersedesId?: string;
  now?: Date;
}): AnswerRevision {
  if (input.revision < 1) {
    throw new Error("Answer revisions must start at 1.");
  }
  return {
    id: randomUUID(),
    assessmentItemId: input.assessmentItemId,
    revision: input.revision,
    responseJson: input.responseJson,
    submittedBy: input.submittedBy,
    submittedAt: input.now ?? new Date(),
    supersedesId: input.supersedesId ?? null
  };
}

export interface ReviewDecision {
  id: string;
  assessmentItemId: string;
  answerRevisionId: string;
  reviewerId: string;
  decision: "approved" | "needs_changes";
  rationale: string | null;
  decidedAt: Date;
}

export function createReviewDecision(input: {
  assessmentItemId: string;
  answerRevisionId: string;
  reviewerId: string;
  answerSubmittedBy: string;
  approved: boolean;
  reason?: string;
  now?: Date;
}): ReviewDecision {
  if (input.reviewerId === input.answerSubmittedBy) {
    throw new Error("Reviewer must not be the same principal as the answer submitter.");
  }
  if (!input.approved && !input.reason?.trim()) {
    throw new Error("Needs-changes review requires a reason.");
  }
  return {
    id: randomUUID(),
    assessmentItemId: input.assessmentItemId,
    answerRevisionId: input.answerRevisionId,
    reviewerId: input.reviewerId,
    decision: input.approved ? "approved" : "needs_changes",
    rationale: input.reason ?? null,
    decidedAt: input.now ?? new Date()
  };
}

export interface AssessmentScope {
  id: string;
  tenantId: string;
  name: string;
  periodStart: Date;
  periodEnd: Date;
  approvedBy: string;
  approvedAt: Date;
}

export function createAssessmentScope(input: {
  tenantId: string;
  name: string;
  periodStart: Date;
  periodEnd: Date;
  approvedBy: string;
  now?: Date;
}): AssessmentScope {
  if (input.periodEnd < input.periodStart) {
    throw new Error("Assessment scope period_end must not precede period_start.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    name: input.name,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    approvedBy: input.approvedBy,
    approvedAt: input.now ?? new Date()
  };
}

export interface AssessmentSnapshot {
  id: string;
  assessmentId: string;
  snapshotType: string;
  sequence: number;
  contentHash: string;
  snapshotPayload: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
}

export function createAssessmentSnapshot(input: {
  assessmentId: string;
  snapshotType: string;
  sequence: number;
  contentHash: string;
  snapshotPayload: Record<string, unknown>;
  createdBy: string;
  now?: Date;
}): AssessmentSnapshot {
  if (input.sequence < 1) {
    throw new Error("Assessment snapshot sequence must start at 1.");
  }
  return {
    id: randomUUID(),
    assessmentId: input.assessmentId,
    snapshotType: input.snapshotType,
    sequence: input.sequence,
    contentHash: input.contentHash,
    snapshotPayload: input.snapshotPayload,
    createdBy: input.createdBy,
    createdAt: input.now ?? new Date()
  };
}

export type CoverageStatus = "uncovered" | "partially_covered" | "covered";

export interface RequirementInstance {
  id: string;
  tenantId: string;
  assessmentId: string;
  requirementId: string;
  applicabilityStatus: ApplicabilityStatus;
  coverageStatus: CoverageStatus;
  ownerId: string;
  status: AssessmentStatus;
}

export function createRequirementInstance(input: {
  tenantId: string;
  assessmentId: string;
  requirementId: string;
  ownerId: string;
}): RequirementInstance {
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    assessmentId: input.assessmentId,
    requirementId: input.requirementId,
    applicabilityStatus: "pending",
    coverageStatus: "uncovered",
    ownerId: input.ownerId,
    status: "not_started"
  };
}

export interface QuestionSet {
  id: string;
  tenantId: string;
  controlId: string;
  questionSetKey: string;
  sourceType: "curated" | "ai_generated";
}

export function createQuestionSet(input: {
  tenantId: string;
  controlId: string;
  questionSetKey: string;
  sourceType?: "curated" | "ai_generated";
}): QuestionSet {
  if (!input.questionSetKey.trim()) {
    throw new Error("Question set requires a non-blank key.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    controlId: input.controlId,
    questionSetKey: input.questionSetKey,
    sourceType: input.sourceType ?? "curated"
  };
}

export interface QuestionVersion {
  id: string;
  tenantId: string;
  questionSetId: string;
  questionVersion: number;
  payloadJson: Record<string, unknown>;
  sourceAiQuestionVersionId: string | null;
  checksum: string;
}

export function createQuestionVersion(input: {
  tenantId: string;
  questionSetId: string;
  questionVersion: number;
  payloadJson: Record<string, unknown>;
  checksum: string;
  sourceAiQuestionVersionId?: string;
}): QuestionVersion {
  if (input.questionVersion < 1) {
    throw new Error("Question version must start at 1.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    questionSetId: input.questionSetId,
    questionVersion: input.questionVersion,
    payloadJson: input.payloadJson,
    sourceAiQuestionVersionId: input.sourceAiQuestionVersionId ?? null,
    checksum: input.checksum
  };
}

export type SignoffScopeType = "section" | "final";

export interface AssessmentSignoff {
  id: string;
  assessmentId: string;
  scopeType: SignoffScopeType;
  scopeId: string;
  signerId: string;
  decision: "approved" | "rejected";
  signedAt: Date;
}

export function createAssessmentSignoff(input: {
  assessmentId: string;
  scopeType: SignoffScopeType;
  scopeId: string;
  signerId: string;
  approved: boolean;
  now?: Date;
}): AssessmentSignoff {
  return {
    id: randomUUID(),
    assessmentId: input.assessmentId,
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    signerId: input.signerId,
    decision: input.approved ? "approved" : "rejected",
    signedAt: input.now ?? new Date()
  };
}

// G-01 Final Completion Pass: test_procedures/control_test_results (spec §10) were added by
// migration 0013 but never wired into the domain/repository/service/controller layers — this
// closes that gap so an assessor can record a manual test procedure and its result against a
// control instance, not just an applicability decision and a free-text answer.

export type TestProcedureStatus = "active" | "deprecated";

export interface TestProcedure {
  id: string;
  tenantId: string;
  controlId: string;
  procedureKey: string;
  method: string;
  expectedResult: string;
  status: TestProcedureStatus;
}

export function createTestProcedure(input: {
  tenantId: string;
  controlId: string;
  procedureKey: string;
  method: string;
  expectedResult: string;
}): TestProcedure {
  if (!input.procedureKey.trim()) {
    throw new Error("Test procedure requires a non-blank procedure key.");
  }
  if (!input.method.trim() || !input.expectedResult.trim()) {
    throw new Error("Test procedure requires both a method and an expected result.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    controlId: input.controlId,
    procedureKey: input.procedureKey,
    method: input.method,
    expectedResult: input.expectedResult,
    status: "active"
  };
}

export type ControlTestOutcome = "pass" | "fail" | "not_tested";

export interface ControlTestResult {
  id: string;
  tenantId: string;
  controlInstanceId: string;
  testProcedureId: string;
  runId: string;
  population: string | null;
  sampleJson: Record<string, unknown>;
  result: ControlTestOutcome;
  testedBy: string;
  testedAt: Date;
}

export function createControlTestResult(input: {
  tenantId: string;
  controlInstanceId: string;
  testProcedureId: string;
  population?: string;
  sampleJson?: Record<string, unknown>;
  result: ControlTestOutcome;
  testedBy: string;
  now?: Date;
}): ControlTestResult {
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    controlInstanceId: input.controlInstanceId,
    testProcedureId: input.testProcedureId,
    runId: randomUUID(),
    population: input.population ?? null,
    sampleJson: input.sampleJson ?? {},
    result: input.result,
    testedBy: input.testedBy,
    testedAt: input.now ?? new Date()
  };
}
