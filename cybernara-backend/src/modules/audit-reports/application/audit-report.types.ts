import type { ComplianceEngineResult } from "../domain/compliance-engine.js";
import type { Pagination } from "../../../shared/pagination.js";

export interface RiskAcceptanceSummaryRow {
  id: string;
  findingId: string;
  riskId?: string;
  riskTitle?: string;
  riskCategory?: string;
  riskInherentScore?: number;
  riskResidualScore?: number;
  rationale: string;
  approverId: string;
  approvedAt: Date;
  expiresAt: Date;
  active: boolean;
}

export interface FindingSummaryRow {
  id: string;
  severity: string;
  description: string;
  assessmentItemId: string | null;
  frameworkKey: string | null;
  controlId: string | null;
  ownerId: string | null;
  dueAt: Date | null;
  remediationStatus: string | null;
  riskAccepted: boolean;
}

export interface QuestionAnswerRow {
  itemId: string;
  frameworkKey: string;
  controlId: string;
  questionText: string;
  answerText: string | null;
  applicable: boolean;
  applicabilityRationale: string | null;
  evidenceCount: number;
}

export interface RemediationTaskSummaryRow {
  id: string;
  findingId: string;
  status: string;
  ownerId: string;
  dueAt: Date;
}

export interface EvidenceSummaryRow {
  id: string;
  fileName: string;
  state: string;
  classification: string;
  linkedItemIds: string[];
}

export interface SignoffRow {
  id: string;
  scopeType: string;
  scopeId: string;
  signerId: string;
  decision: string;
  signedAt: Date;
}

export interface AuditReportJson {
  assessment: {
    id: string;
    scopeName: string;
    status: string;
    periodStart: Date;
    periodEnd: Date;
    frameworkKeys: string[];
    itemCount: number;
    closedAt: Date | null;
    closedBy: string | null;
  };
  questionsAndAnswers: QuestionAnswerRow[];
  compliance: ComplianceEngineResult;
  evidence: {
    total: number;
    byState: Record<string, number>;
    items: EvidenceSummaryRow[];
  };
  findings: {
    total: number;
    bySeverity: Record<string, number>;
    items: FindingSummaryRow[];
  };
  remediationTasks: {
    total: number;
    byStatus: Record<string, number>;
    items: RemediationTaskSummaryRow[];
  };
  riskAcceptances: {
    total: number;
    active: number;
    items: RiskAcceptanceSummaryRow[];
  };
  signoffs: SignoffRow[];
}

export interface AuditReportRecord {
  id: string;
  tenantId: string;
  version: number;
  assessmentId: string;
  reportType: "closure_audit";
  generatedBy: string;
  generatedAt: Date;
  reportHash: string;
  artifactMimeType: string;
  structuredReportJson: AuditReportJson;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export type AuditReportInsertInput = Omit<
  AuditReportRecord,
  "tenantId" | "version" | "classification" | "createdBy" | "createdAt" | "updatedBy" | "updatedAt"
> & { artifactBytes: Buffer };

export interface ClosedAssessmentSummary {
  assessmentId: string;
  scopeName: string;
  frameworks: string[];
  periodStart: Date;
  periodEnd: Date;
  closedAt: Date | null;
  closedBy: string | null;
  itemCount: number;
  findingCount: number;
  latestReport: {
    reportId: string;
    generatedAt: Date;
  } | null;
}

export interface AuditReportRepository {
  listClosedAssessments(tenantId: string, pagination: Pagination): Promise<ClosedAssessmentSummary[]>;
  insertReport(input: { tenantId: string; actorId: string; record: AuditReportInsertInput }): Promise<AuditReportRecord>;
  findReport(tenantId: string, reportId: string): Promise<AuditReportRecord | null>;
  listReportsForAssessment(tenantId: string, assessmentId: string): Promise<AuditReportRecord[]>;
  findArtifactBytes(tenantId: string, reportId: string): Promise<Buffer | null>;
}
