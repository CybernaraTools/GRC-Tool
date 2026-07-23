import type { Pagination } from "../../../shared/pagination.js";
import type { ComplianceEngineResult } from "../domain/compliance-engine.js";
import type { NarrativePayload } from "../domain/narrative-schema.js";
import type { ValidationAttemptResult } from "../domain/groundedness-validator.js";

export type ReportLifecycleStatus = "draft" | "published";

export interface AuditReportRecord {
  id: string;
  tenantId: string;
  version: number;
  assessmentId: string;
  snapshotId: string;
  reportType: "closure_audit";
  lifecycleStatus: ReportLifecycleStatus;
  reportSchemaVersion: string;
  complianceMethodologyVersion: string;
  aiPromptVersion: string;
  aiModelMetadata: Record<string, unknown>;
  generatedBy: string;
  generatedAt: Date;
  reportHash: string;
  snapshotHash: string;
  artifactMimeType: string;
  structuredReportJson: StructuredReportJson;
  provenance: Record<string, unknown>;
  citationManifest: Record<string, unknown>;
  groundednessScore: number;
  groundednessValidationLog: ValidationAttemptResult[];
  narrativeAvailable: boolean;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface StructuredReportJson {
  engineResult: ComplianceEngineResult;
  narrative: NarrativePayload | null;
  evidenceLimitations: string[];
}

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
    lifecycleStatus: ReportLifecycleStatus;
    generatedAt: Date;
    groundednessScore: number;
  } | null;
}

export type AuditReportInsertInput = Omit<
  AuditReportRecord,
  "tenantId" | "version" | "classification" | "createdBy" | "createdAt" | "updatedBy" | "updatedAt"
> & { artifactBytes: Buffer };

export interface AuditReportRepository {
  listClosedAssessments(tenantId: string, actorId: string, pagination: Pagination): Promise<ClosedAssessmentSummary[]>;
  insertReport(input: { tenantId: string; actorId: string; record: AuditReportInsertInput }): Promise<AuditReportRecord>;
  findReport(tenantId: string, actorId: string, reportId: string): Promise<AuditReportRecord | null>;
  listReportsForAssessment(tenantId: string, actorId: string, assessmentId: string): Promise<AuditReportRecord[]>;
  findArtifactBytes(tenantId: string, actorId: string, reportId: string): Promise<Buffer | null>;
  publishReport(tenantId: string, actorId: string, reportId: string): Promise<AuditReportRecord>;
}
