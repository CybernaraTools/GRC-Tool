import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { AssessmentService } from "../../assessment/public.js";
import { AuditLogService } from "../../audit-security/public.js";
import { OutboxService } from "../../outbox/public.js";
import {
  renderAssessmentPdf,
  renderAssessmentWorkbook,
  reportIdempotencyKey,
  type ReportArtifact
} from "../domain/reporting.js";
import { REPORTING_ANALYTICS_REPOSITORY } from "./tokens.js";
import type {
  ReportExportRecord,
  ReportFormat,
  ReportingAnalyticsRepository
} from "./reporting-analytics.types.js";
import type { Pagination } from "../../../shared/pagination.js";

@Injectable()
export class ReportingAnalyticsService {
  constructor(
    @Inject(REPORTING_ANALYTICS_REPOSITORY) private readonly repository: ReportingAnalyticsRepository,
    @Inject(AssessmentService) private readonly assessments: AssessmentService,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(AuditLogService) private readonly auditLog: AuditLogService
  ) {}

  async requestExport(input: {
    tenantId: string;
    actorId: string;
    requestIdempotencyKey: string;
    assessmentId: string;
    snapshotId: string;
    templateVersion: string;
    format: ReportFormat;
  }): Promise<ReportExportRecord> {
    const expectedKey = reportIdempotencyKey({
      snapshotId: input.snapshotId,
      templateVersion: input.templateVersion,
      format: input.format
    });
    if (input.requestIdempotencyKey !== expectedKey) {
      throw new BadRequestException("Idempotency-Key must equal snapshotId:templateVersion:format.");
    }

    const existing = await this.repository.findByIdempotencyKey(input.tenantId, expectedKey);
    if (existing) {
      return existing;
    }

    const assessment = await this.assessments.get(input.tenantId, input.assessmentId);
    if (assessment.controlSnapshotVersion !== input.snapshotId) {
      throw new BadRequestException("snapshotId must match the assessment controlSnapshotVersion.");
    }

    const artifact = await this.render(assessment, input.format, input.templateVersion);
    const exportId = randomUUID();

    // G-04: persist the frozen artifact itself (not just its hash), plus real links to
    // the immutable snapshot root (G-01) and a template record, so `download()` can serve
    // this exact export forever without re-rendering. No real renderer-file/template-asset
    // concept exists in this codebase (rendering is inline code, not a data-driven
    // template) — `checksum` here is a stable hash of the renderer/format identity rather
    // than a template file's own hash, which is the honest equivalent given what actually
    // exists to hash.
    const rendererVersion = "pdfkit-exceljs-v1";
    const templateChecksum = createHash("sha256").update(`${rendererVersion}:${input.format}`).digest("hex");
    const reportTemplateId = await this.repository.upsertReportTemplate({
      tenantId: input.tenantId,
      templateKey: input.templateVersion,
      templateVersion: input.templateVersion,
      format: input.format,
      rendererVersion,
      checksum: templateChecksum,
      actorId: input.actorId
    });
    const assessmentSnapshotId = await this.repository.findLatestAssessmentSnapshotId(
      input.tenantId,
      input.assessmentId
    );
    const completedAt = new Date();
    // Real KMS/HSM-backed signing does not exist anywhere in this codebase (see
    // 0014_g04_report_immutability.sql's header comment) — this is a local SHA-256-based
    // placeholder proving the artifact/manifest weren't tampered with after being frozen,
    // not a real asymmetric signature. Named honestly, not presented as more than it is.
    const signature = createHash("sha256")
      .update(`${artifact.sha256}:${exportId}:${completedAt.toISOString()}`)
      .digest("hex");

    const persisted = await this.repository.createExport({
      id: exportId,
      tenantId: input.tenantId,
      assessmentId: input.assessmentId,
      snapshotId: input.snapshotId,
      templateVersion: input.templateVersion,
      format: input.format,
      idempotencyKey: artifact.idempotencyKey,
      sha256: artifact.sha256,
      storageUri: `/v1/report-exports/${exportId}/download`,
      actorId: input.actorId,
      assessmentSnapshotId: assessmentSnapshotId ?? undefined,
      reportTemplateId,
      artifactBytes: artifact.bytes,
      signature,
      completedAt
    });

    const manifestPayload = {
      exportId: persisted.id,
      assessmentId: persisted.assessmentId,
      snapshotId: persisted.snapshotId,
      templateVersion: persisted.templateVersion,
      format: persisted.format,
      sha256: persisted.sha256,
      signature,
      completedAt: completedAt.toISOString()
    };
    const manifestHash = createHash("sha256").update(JSON.stringify(manifestPayload)).digest("hex");
    await this.repository.createExportManifest({
      tenantId: input.tenantId,
      reportExportId: persisted.id,
      snapshotId: input.snapshotId,
      templateVersion: input.templateVersion,
      artifactHash: artifact.sha256,
      signature,
      manifestHash,
      manifestPayload,
      actorId: input.actorId
    });

    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: artifact.idempotencyKey,
      exportId: persisted.id,
      body: {
        exportId: persisted.id,
        assessmentId: persisted.assessmentId,
        snapshotId: persisted.snapshotId,
        templateVersion: persisted.templateVersion,
        format: persisted.format,
        sha256: persisted.sha256
      }
    });
    return persisted;
  }

  async list(input: { tenantId: string; assessmentId?: string; pagination: Pagination }): Promise<ReportExportRecord[]> {
    return this.repository.listExports(input);
  }

  async get(tenantId: string, exportId: string): Promise<ReportExportRecord> {
    const record = await this.repository.findExport(tenantId, exportId);
    if (!record) {
      throw new NotFoundException("Report export not found.");
    }
    return record;
  }

  async download(tenantId: string, exportId: string): Promise<{ record: ReportExportRecord; artifact: ReportArtifact }> {
    const record = await this.get(tenantId, exportId);

    // G-04: serve the frozen artifact exactly as it was at export time — no re-render.
    // Falls back to the legacy re-render-and-verify path only for exports created before
    // this migration (which have no persisted bytes to serve); every export created from
    // this point forward always has them.
    const persistedBytes = await this.repository.findArtifactBytes(tenantId, exportId);
    if (persistedBytes) {
      const rehashed = createHash("sha256").update(persistedBytes).digest("hex");
      if (rehashed !== record.sha256) {
        throw new ConflictException("Persisted report artifact no longer matches its recorded hash.");
      }
      return {
        record,
        artifact: {
          format: record.format,
          idempotencyKey: record.idempotencyKey,
          sha256: record.sha256,
          bytes: persistedBytes
        }
      };
    }

    const assessment = await this.assessments.get(tenantId, record.assessmentId);
    const artifact = await this.render(assessment, record.format, record.templateVersion);
    if (artifact.sha256 !== record.sha256) {
      throw new ConflictException("Rendered report no longer matches the stored export hash.");
    }
    return { record, artifact };
  }

  private async render(
    assessment: Awaited<ReturnType<AssessmentService["get"]>>,
    format: ReportFormat,
    templateVersion: string
  ): Promise<ReportArtifact> {
    return format === "pdf"
      ? renderAssessmentPdf(assessment, templateVersion)
      : renderAssessmentWorkbook(assessment, templateVersion);
  }

  private async publishMutation(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    exportId: string;
    body: Record<string, unknown>;
  }): Promise<void> {
    const now = new Date();
    const outboxEvent = await this.outbox.publish({
      tenantId: input.tenantId,
      eventType: "report_export.requested",
      aggregateType: "report_export",
      aggregateId: input.exportId,
      payload: { exportId: input.exportId },
      idempotencyKey: input.idempotencyKey,
      createdBy: input.actorId,
      now
    });
    if (outboxEvent.createdAt.getTime() !== now.getTime()) {
      return;
    }
    await this.auditLog.append({
      tenantId: input.tenantId,
      eventType: "report_export.requested",
      actorId: input.actorId,
      targetType: "report_export",
      targetId: input.exportId,
      traceId: input.idempotencyKey,
      classification: "confidential",
      body: input.body
    });
  }
}

