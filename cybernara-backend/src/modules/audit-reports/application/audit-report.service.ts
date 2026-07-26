import { randomUUID } from "node:crypto";
import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../../audit-security/public.js";
import { AssessmentService } from "../../assessment/public.js";
import { OutboxService } from "../../outbox/public.js";
import { hashReportBytes, renderAuditReportPdf } from "../domain/report-pdf.js";
import { AuditReportContextService } from "./audit-report-context.service.js";
import { AUDIT_REPORT_REPOSITORY } from "./tokens.js";
import type { AuditReportInsertInput, AuditReportRecord, AuditReportRepository, ClosedAssessmentSummary } from "./audit-report.types.js";
import type { Pagination } from "../../../shared/pagination.js";

export const REPORT_SCHEMA_VERSION = "3.0.0";

@Injectable()
export class AuditReportService {
  constructor(
    @Inject(AUDIT_REPORT_REPOSITORY) private readonly repository: AuditReportRepository,
    @Inject(AssessmentService) private readonly assessments: AssessmentService,
    @Inject(AuditReportContextService) private readonly reportContext: AuditReportContextService,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(AuditLogService) private readonly auditLog: AuditLogService
  ) {}

  async listClosedAssessments(tenantId: string, pagination: Pagination): Promise<ClosedAssessmentSummary[]> {
    return this.repository.listClosedAssessments(tenantId, pagination);
  }

  async listReportsForAssessment(tenantId: string, assessmentId: string): Promise<AuditReportRecord[]> {
    return this.repository.listReportsForAssessment(tenantId, assessmentId);
  }

  async getReport(tenantId: string, reportId: string): Promise<AuditReportRecord> {
    const report = await this.repository.findReport(tenantId, reportId);
    if (!report) {
      throw new NotFoundException("Audit report not found.");
    }
    return report;
  }

  async downloadArtifact(tenantId: string, reportId: string): Promise<Buffer> {
    await this.getReport(tenantId, reportId);
    const bytes = await this.repository.findArtifactBytes(tenantId, reportId);
    if (!bytes) {
      throw new NotFoundException("Report artifact not available.");
    }
    return bytes;
  }

  /**
   * Fetches everything real for this one closed assessment (items, findings,
   * remediation, risk acceptances, linked evidence, reviewer signoffs) and
   * renders the report directly from it. No AI call anywhere in this path.
   * Every regeneration produces its own new row; nothing is ever overwritten.
   */
  async generateReport(input: { tenantId: string; actorId: string; assessmentId: string; idempotencyKey: string }): Promise<AuditReportRecord> {
    const replay = await this.replayedReport(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }

    const assessment = await this.assessments.get(input.tenantId, input.assessmentId);
    if (assessment.status !== "closed") {
      throw new ForbiddenException("Audit reports can only be generated for closed assessments.");
    }

    const reportJson = await this.reportContext.assemble(input.tenantId, input.actorId, assessment);

    const reportId = randomUUID();
    const generatedAt = new Date();
    const pdfBytes = await renderAuditReportPdf({ reportId, generatedAt, report: reportJson });
    const reportHash = hashReportBytes(pdfBytes);

    const insertInput: AuditReportInsertInput = {
      id: reportId,
      assessmentId: input.assessmentId,
      reportType: "closure_audit",
      generatedBy: input.actorId,
      generatedAt,
      reportHash,
      artifactBytes: pdfBytes,
      artifactMimeType: "application/pdf",
      structuredReportJson: reportJson
    };

    const record = await this.repository.insertReport({ tenantId: input.tenantId, actorId: input.actorId, record: insertInput });

    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      reportId: record.id,
      assessmentId: input.assessmentId,
      body: {
        reportId: record.id,
        assessmentId: input.assessmentId,
        findingCount: reportJson.findings.total
      }
    });

    return record;
  }

  private async replayedReport(tenantId: string, idempotencyKey: string): Promise<AuditReportRecord | null> {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as { reportId?: string };
    if (!payload.reportId) {
      return null;
    }
    return this.repository.findReport(tenantId, payload.reportId);
  }

  private async publishMutation(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    reportId: string;
    assessmentId: string;
    body: Record<string, unknown>;
  }): Promise<void> {
    const now = new Date();
    const outboxEvent = await this.outbox.publish({
      tenantId: input.tenantId,
      eventType: "audit_report.generated",
      aggregateType: "audit_report",
      aggregateId: input.reportId,
      payload: { reportId: input.reportId, assessmentId: input.assessmentId },
      idempotencyKey: input.idempotencyKey,
      createdBy: input.actorId,
      now
    });
    if (outboxEvent.createdAt.getTime() !== now.getTime()) {
      return;
    }
    await this.auditLog.append({
      tenantId: input.tenantId,
      eventType: "audit_report.generated",
      actorId: input.actorId,
      targetType: "audit_report",
      targetId: input.reportId,
      traceId: input.idempotencyKey,
      classification: "confidential",
      body: input.body
    });
  }
}
