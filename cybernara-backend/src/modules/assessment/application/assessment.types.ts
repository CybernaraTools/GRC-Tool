import type { Pagination } from "../../../shared/pagination.js";
import type { Assessment, AssessmentItem, AssessmentStatus } from "../domain/assessment.js";
import type { AssessmentControlSelection } from "./question-repository.service.js";
import type {
  AnswerRevision,
  ApplicabilityDecision,
  AssessmentSignoff,
  ControlInstance,
  ControlTestResult,
  ReviewDecision,
  TestProcedure
} from "../domain/execution-graph.js";

export interface AssessmentRecord extends Assessment {
  periodStart: Date;
  periodEnd: Date;
  version: number;
  classification: string;
  updatedBy: string;
  updatedAt: Date;
}

export interface AssessmentCreateInput {
  tenantId: string;
  actorId: string;
  ownerId: string;
  scopeName: string;
  periodStart: Date;
  periodEnd: Date;
  controls: AssessmentControlSelection[];
  idempotencyKey: string;
}

export interface AssessmentUpdateInput extends AssessmentCreateInput {
  assessmentId: string;
}

// G-01 Phase 1: the normalized execution-graph rows a repository must
// return/accept alongside the legacy flat AssessmentItem, so callers that
// need the new tables (tests, future read paths) can reach them without a
// second round-trip. `AssessmentItem` itself is untouched.
export interface ExecutionGraphRow {
  controlInstance: ControlInstance;
  itemId: string;
}

export interface AssessmentRepository {
  createAssessment(input: {
    assessment: Assessment;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<AssessmentRecord>;
  updateDraftAssessment(input: {
    assessment: Assessment;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<AssessmentRecord>;
  listAssessments(tenantId: string, pagination: Pagination): Promise<AssessmentRecord[]>;
  findAssessment(tenantId: string, assessmentId: string): Promise<AssessmentRecord | null>;
  findItem(tenantId: string, assessmentId: string, itemId: string): Promise<AssessmentItem | null>;
  updateItem(input: {
    tenantId: string;
    assessmentId: string;
    item: AssessmentItem;
    actorId: string;
  }): Promise<AssessmentItem>;
  updateAssessmentStatus(input: {
    tenantId: string;
    assessmentId: string;
    status: AssessmentStatus;
    actorId: string;
  }): Promise<AssessmentRecord>;

  // G-01 Phase 1 additions — dual-write into the normalized execution graph
  // alongside the legacy flat tables. See 0013_g01_assessment_execution_normalization.sql.
  findControlInstanceByItem(tenantId: string, itemId: string): Promise<ControlInstance | null>;
  recordApplicabilityDecision(input: {
    tenantId: string;
    decision: ApplicabilityDecision;
  }): Promise<void>;
  recordAnswerRevision(input: { tenantId: string; revision: AnswerRevision }): Promise<AnswerRevision>;
  findLatestAnswerRevision(tenantId: string, assessmentItemId: string): Promise<AnswerRevision | null>;
  recordReviewDecision(input: { tenantId: string; decision: ReviewDecision }): Promise<void>;

  // G-01 completion (0017) — final sign-off record on close().
  recordAssessmentSignoff(input: { tenantId: string; signoff: AssessmentSignoff }): Promise<void>;
  findAssessmentSignoffs(tenantId: string, assessmentId: string): Promise<AssessmentSignoff[]>;

  // G-01 Final Completion Pass — history reads for the append-only tables (previously only a
  // "latest" read existed, needed by the dual-write mutation flows themselves) and the
  // test_procedures/control_test_results tables (previously entirely unwired).
  listAnswerRevisions(tenantId: string, assessmentItemId: string): Promise<AnswerRevision[]>;
  listApplicabilityDecisions(tenantId: string, controlInstanceId: string): Promise<ApplicabilityDecision[]>;
  listReviewDecisions(tenantId: string, assessmentItemId: string): Promise<ReviewDecision[]>;
  createTestProcedure(input: { tenantId: string; actorId: string; procedure: TestProcedure }): Promise<TestProcedure>;
  listTestProcedures(tenantId: string, controlId: string): Promise<TestProcedure[]>;
  recordControlTestResult(input: { tenantId: string; result: ControlTestResult }): Promise<ControlTestResult>;
  listControlTestResults(tenantId: string, controlInstanceId: string): Promise<ControlTestResult[]>;
}
