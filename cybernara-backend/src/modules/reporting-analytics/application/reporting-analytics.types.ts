import type { Pagination } from "../../../shared/pagination.js";

export type ReportFormat = "pdf" | "xlsx";

export interface ReportExportRecord {
  id: string;
  tenantId: string;
  version: number;
  assessmentId: string;
  snapshotId: string;
  templateVersion: string;
  format: ReportFormat;
  idempotencyKey: string;
  sha256: string;
  storageUri?: string;
  // G-04: present once the frozen artifact has been persisted (every export
  // created from this point forward); absent on legacy pre-G-04 exports,
  // which fall back to the old re-render-on-download path.
  assessmentSnapshotId?: string;
  reportTemplateId?: string;
  completedAt?: Date;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface ReportingAnalyticsRepository {
  createExport(input: {
    id: string;
    tenantId: string;
    assessmentId: string;
    snapshotId: string;
    templateVersion: string;
    format: ReportFormat;
    idempotencyKey: string;
    sha256: string;
    storageUri: string;
    actorId: string;
    // G-04 additions — all optional so legacy call sites (and any future
    // caller that genuinely cannot resolve them) keep working; a real
    // export request always supplies them (see ReportingAnalyticsService).
    assessmentSnapshotId?: string;
    reportTemplateId?: string;
    artifactBytes?: Buffer;
    signature?: string;
    completedAt?: Date;
  }): Promise<ReportExportRecord>;
  listExports(input: { tenantId: string; assessmentId?: string; pagination: Pagination }): Promise<ReportExportRecord[]>;
  findExport(tenantId: string, exportId: string): Promise<ReportExportRecord | null>;
  findByIdempotencyKey(tenantId: string, idempotencyKey: string): Promise<ReportExportRecord | null>;

  // G-04 additions.
  findArtifactBytes(tenantId: string, exportId: string): Promise<Buffer | null>;
  findLatestAssessmentSnapshotId(tenantId: string, assessmentId: string): Promise<string | null>;
  upsertReportTemplate(input: {
    tenantId: string;
    templateKey: string;
    templateVersion: string;
    format: ReportFormat;
    rendererVersion: string;
    checksum: string;
    actorId: string;
  }): Promise<string>;
  createExportManifest(input: {
    tenantId: string;
    reportExportId: string;
    // snapshotId/templateVersion/artifactHash/signature: export_manifests predates this
    // migration (0007_m6_platform_hardening.sql) with these as required columns of its
    // own — populated here from the export's real values rather than relaxed to
    // nullable, preserving the pre-existing table's intent.
    snapshotId: string;
    templateVersion: string;
    artifactHash: string;
    signature: string;
    manifestHash: string;
    manifestPayload: Record<string, unknown>;
    actorId: string;
  }): Promise<void>;
}

