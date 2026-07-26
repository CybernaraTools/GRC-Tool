import type {
  Finding,
  RemediationTask,
  RemediationTaskReview,
  Risk,
  RiskAcceptance,
  RiskAcceptanceReview,
  RiskLink,
  RiskModel,
  RiskTreatment
} from "../domain/risk.js";
import type { Pagination } from "../../../shared/pagination.js";

export interface FindingRecord extends Finding {
  version: number;
  classification: string;
  createdBy: string;
  updatedBy: string;
  updatedAt: Date;
}

export interface RemediationTaskRecord extends RemediationTask {
  tenantId: string;
  version: number;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface RemediationTaskReviewRecord extends RemediationTaskReview {
  tenantId: string;
  version: number;
}

export interface RiskAcceptanceRecord extends RiskAcceptance {
  version: number;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface RiskAcceptanceReviewRecord extends RiskAcceptanceReview {
  tenantId: string;
}

export interface RiskModelRecord extends RiskModel {
  version: number;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface RiskRecord extends Risk {
  version: number;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface RiskLinkRecord extends RiskLink {
  version: number;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface RiskTreatmentRecord extends RiskTreatment {
  version: number;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface RiskWorkflowRepository {
  createFinding(input: { finding: Finding; actorId: string }): Promise<FindingRecord>;
  listFindings(input: {
    tenantId: string;
    assessmentItemId?: string;
    testResultId?: string;
    pagination: Pagination;
  }): Promise<FindingRecord[]>;
  findFinding(tenantId: string, findingId: string): Promise<FindingRecord | null>;
  updateFinding(input: {
    tenantId: string;
    findingId: string;
    actorId: string;
    severity: Finding["severity"];
    impact?: Finding["impact"];
    likelihood?: Finding["likelihood"];
    ownerId?: string;
    dueAt?: Date;
    description: string;
  }): Promise<FindingRecord>;
  createRemediationTask(input: {
    tenantId: string;
    task: RemediationTask;
    actorId: string;
  }): Promise<RemediationTaskRecord>;
  listRemediationTasks(input: {
    tenantId: string;
    findingId?: string;
    pagination: Pagination;
  }): Promise<RemediationTaskRecord[]>;
  findRemediationTask(tenantId: string, taskId: string): Promise<RemediationTaskRecord | null>;
  updateRemediationTask(input: {
    tenantId: string;
    taskId: string;
    actorId: string;
    ownerId: string;
    dueAt: Date;
    status: RemediationTask["status"];
  }): Promise<RemediationTaskRecord>;
  createRemediationTaskReview(input: {
    tenantId: string;
    review: RemediationTaskReview;
  }): Promise<RemediationTaskReviewRecord>;
  listRemediationTaskReviews(input: {
    tenantId: string;
    taskId: string;
    pagination: Pagination;
  }): Promise<RemediationTaskReviewRecord[]>;
  createRiskAcceptance(input: {
    tenantId: string;
    acceptance: RiskAcceptance;
    actorId: string;
  }): Promise<RiskAcceptanceRecord>;
  hasRemediationEvidenceLinks(tenantId: string, remediationTaskId: string): Promise<boolean>;
  findActiveRiskAcceptanceForTask(tenantId: string, remediationTaskId: string): Promise<RiskAcceptanceRecord | null>;
  findRiskAcceptance(tenantId: string, riskAcceptanceId: string): Promise<RiskAcceptanceRecord | null>;
  listRiskAcceptances(input: { tenantId: string; pagination: Pagination }): Promise<RiskAcceptanceRecord[]>;
  createRiskAcceptanceReview(input: {
    tenantId: string;
    review: RiskAcceptanceReview;
  }): Promise<RiskAcceptanceReviewRecord>;

  // G-09 Phase 1 (0019_g09_enterprise_grc_risk_register.sql) — the enterprise risk register.
  createRiskModel(input: { model: RiskModel; actorId: string }): Promise<RiskModelRecord>;
  listRiskModels(input: { tenantId: string; pagination: Pagination }): Promise<RiskModelRecord[]>;
  createRisk(input: { risk: Risk; actorId: string }): Promise<RiskRecord>;
  listRisks(input: { tenantId: string; pagination: Pagination }): Promise<RiskRecord[]>;
  findRisk(tenantId: string, riskId: string): Promise<RiskRecord | null>;
  createRiskLink(input: { link: RiskLink; actorId: string }): Promise<RiskLinkRecord>;
  listRiskLinks(input: { tenantId: string; riskId: string; pagination: Pagination }): Promise<RiskLinkRecord[]>;
  createRiskTreatment(input: { treatment: RiskTreatment; actorId: string }): Promise<RiskTreatmentRecord>;
  listRiskTreatments(input: { tenantId: string; riskId: string; pagination: Pagination }): Promise<RiskTreatmentRecord[]>;
}

