import { randomUUID } from "node:crypto";
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../../audit-security/public.js";
import { AssessmentService } from "../../assessment/public.js";
import { ClosureSnapshotService, type ClosureSnapshotRecord } from "../../closure-snapshot/public.js";
import { OutboxService } from "../../outbox/public.js";
import { hashReportBytes, renderAuditReportPdf } from "../domain/report-pdf.js";
import { citationManifestToJson } from "../domain/citation-manifest.js";
import { validateNarrativeGroundedness, type ValidationAttemptResult } from "../domain/groundedness-validator.js";
import { emptyNarrativePayload, validateNarrativeSchema, type NarrativePayload } from "../domain/narrative-schema.js";
import { NARRATIVE_GENERATION_MAX_OUTPUT_TOKENS, NARRATIVE_GENERATION_TEMPERATURE, NARRATIVE_PROMPT_VERSION, NarrativeGeneratorService } from "./narrative-generator.service.js";
import { ReportContextService } from "./report-context.service.js";
import { AUDIT_REPORT_REPOSITORY } from "./tokens.js";
import type { AuditReportInsertInput, AuditReportRecord, AuditReportRepository, ClosedAssessmentSummary } from "./audit-report.types.js";
import type { Pagination } from "../../../shared/pagination.js";
import { summarizeIssuesForRetry } from "../domain/groundedness-validator.js";

export const REPORT_SCHEMA_VERSION = "1.0.0";
export const COMPLIANCE_METHODOLOGY_VERSION = "1.0.0";
const MAX_GENERATION_RETRIES = 2;

interface GeneratePayload extends Record<string, unknown> {
  reportId: string;
  assessmentId: string;
}

@Injectable()
export class AuditReportService {
  constructor(
    @Inject(AUDIT_REPORT_REPOSITORY) private readonly repository: AuditReportRepository,
    @Inject(AssessmentService) private readonly assessments: AssessmentService,
    @Inject(ClosureSnapshotService) private readonly closureSnapshot: ClosureSnapshotService,
    @Inject(ReportContextService) private readonly reportContext: ReportContextService,
    @Inject(NarrativeGeneratorService) private readonly narrativeGenerator: NarrativeGeneratorService,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(AuditLogService) private readonly auditLog: AuditLogService
  ) {}

  async listClosedAssessments(tenantId: string, actorId: string, pagination: Pagination): Promise<ClosedAssessmentSummary[]> {
    return this.repository.listClosedAssessments(tenantId, actorId, pagination);
  }

  async listReportsForAssessment(tenantId: string, actorId: string, assessmentId: string): Promise<AuditReportRecord[]> {
    return this.repository.listReportsForAssessment(tenantId, actorId, assessmentId);
  }

  async getReport(tenantId: string, actorId: string, reportId: string): Promise<AuditReportRecord> {
    const report = await this.repository.findReport(tenantId, actorId, reportId);
    if (!report) {
      throw new NotFoundException("Audit report not found.");
    }
    return report;
  }

  async downloadArtifact(tenantId: string, actorId: string, reportId: string): Promise<Buffer> {
    await this.getReport(tenantId, actorId, reportId);
    const bytes = await this.repository.findArtifactBytes(tenantId, actorId, reportId);
    if (!bytes) {
      throw new NotFoundException("Report artifact not available.");
    }
    return bytes;
  }

  async publish(tenantId: string, actorId: string, reportId: string): Promise<AuditReportRecord> {
    const report = await this.getReport(tenantId, actorId, reportId);
    if (report.lifecycleStatus === "published") {
      return report;
    }
    if (report.groundednessScore !== 100) {
      throw new BadRequestException("Report cannot be published: groundedness score is below 100%.");
    }
    const published = await this.repository.publishReport(tenantId, actorId, reportId);
    await this.auditLog.append({
      tenantId,
      eventType: "audit_report.published",
      actorId,
      targetType: "audit_report",
      targetId: reportId,
      traceId: randomUUID(),
      classification: "confidential",
      body: { reportId, assessmentId: report.assessmentId }
    });
    return published;
  }

  /**
   * Verifies: authenticated user (upstream, by PolicyGuard), tenant,
   * authorization (upstream), assessment exists, assessment belongs to
   * tenant, assessment.status === closed — then loads/reconstructs the
   * closure snapshot, runs the deterministic engine, generates and validates
   * the AI narrative (bounded retry, deterministic-only fallback on
   * exhaustion), renders the PDF, and persists the immutable report record.
   * Every regeneration produces its own new row; nothing here overwrites a
   * prior report.
   */
  async generateReport(input: { tenantId: string; actorId: string; assessmentId: string; idempotencyKey: string }): Promise<AuditReportRecord> {
    const replay = await this.replayedReport(input.tenantId, input.actorId, input.idempotencyKey);
    if (replay) {
      return replay;
    }

    const assessment = await this.assessments.get(input.tenantId, input.assessmentId);
    if (assessment.status !== "closed") {
      throw new ForbiddenException("Audit reports can only be generated for closed assessments.");
    }

    const snapshot = await this.resolveSnapshot(input.tenantId, input.actorId, assessment);
    const context = await this.reportContext.assemble(input.tenantId, snapshot);

    const generation = await this.generateValidatedNarrative(context);

    const reportId = randomUUID();
    const generatedAt = new Date();
    const pdfBytes = await renderAuditReportPdf({
      reportId,
      snapshotId: snapshot.id,
      reportHash: "pending",
      generatedAt,
      snapshot: snapshot.payload,
      engineResult: context.engineResult,
      narrative: generation.narrative,
      narrativeAvailable: generation.narrativeAvailable,
      finalValidation: generation.finalAttempt,
      groundednessScore: generation.finalAttempt.groundednessScore
    });
    const reportHash = hashReportBytes(pdfBytes);
    // Re-render is avoided: the cover page's reportHash field is informational
    // only and intentionally reflects the hash of THIS artifact's own bytes,
    // computed after render — recorded separately in provenance/DB rather
    // than looping renders to embed a self-referential hash in the PDF body.

    const insertInput: AuditReportInsertInput = {
      id: reportId,
      assessmentId: input.assessmentId,
      snapshotId: snapshot.id,
      reportType: "closure_audit",
      lifecycleStatus: "draft",
      reportSchemaVersion: REPORT_SCHEMA_VERSION,
      complianceMethodologyVersion: COMPLIANCE_METHODOLOGY_VERSION,
      aiPromptVersion: NARRATIVE_PROMPT_VERSION,
      aiModelMetadata: {
        provider: "openai",
        model: generation.model,
        temperature: NARRATIVE_GENERATION_TEMPERATURE,
        maxOutputTokens: NARRATIVE_GENERATION_MAX_OUTPUT_TOKENS
      },
      generatedBy: input.actorId,
      generatedAt,
      reportHash,
      snapshotHash: snapshot.contentHash,
      artifactBytes: pdfBytes,
      artifactMimeType: "application/pdf",
      structuredReportJson: {
        engineResult: context.engineResult,
        narrative: generation.narrative,
        evidenceLimitations: context.evidenceLimitations
      },
      provenance: {
        snapshotType: snapshot.snapshotType,
        historicalAssuranceLevel: snapshot.payload.historicalAssuranceLevel,
        reconstructed: snapshot.payload.reconstructed,
        generationAttempts: generation.attempts.length,
        evidenceLimitations: context.evidenceLimitations
      },
      citationManifest: citationManifestToJson(context.citationManifest),
      groundednessScore: generation.finalAttempt.groundednessScore,
      groundednessValidationLog: generation.attempts,
      narrativeAvailable: generation.narrativeAvailable
    };

    const record = await this.repository.insertReport({ tenantId: input.tenantId, actorId: input.actorId, record: insertInput });

    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "audit_report.generated",
      reportId: record.id,
      assessmentId: input.assessmentId,
      body: {
        reportId: record.id,
        assessmentId: input.assessmentId,
        snapshotId: snapshot.id,
        groundednessScore: record.groundednessScore,
        narrativeAvailable: record.narrativeAvailable,
        generationAttempts: generation.attempts.length
      }
    });

    return record;
  }

  private async resolveSnapshot(tenantId: string, actorId: string, assessment: Awaited<ReturnType<AssessmentService["get"]>>): Promise<ClosureSnapshotRecord> {
    const native = await this.closureSnapshot.findClosureSnapshot(tenantId, actorId, assessment.id);
    if (native) {
      return native;
    }
    // Legacy: assessment closed before this feature existed (or the
    // failure-isolated capture in AssessmentService.close() did not
    // succeed) — explicitly reconstruct rather than hide it from /reports.
    return this.closureSnapshot.reconstructLegacyClosureSnapshot({ tenantId, actorId, assessment });
  }

  private async generateValidatedNarrative(context: Awaited<ReturnType<ReportContextService["assemble"]>>): Promise<{
    narrative: NarrativePayload | null;
    narrativeAvailable: boolean;
    model: string;
    attempts: ValidationAttemptResult[];
    finalAttempt: ValidationAttemptResult;
  }> {
    const attempts: ValidationAttemptResult[] = [];
    let correctiveFeedback: string | undefined;
    let model = "unavailable";

    for (let attempt = 0; attempt <= MAX_GENERATION_RETRIES; attempt += 1) {
      const generation = await this.narrativeGenerator.generate({
        snapshot: context.snapshot.payload,
        engineResult: context.engineResult,
        citationManifest: context.citationManifest,
        correctiveFeedback
      });
      model = generation.model;
      const result = validateNarrativeGroundedness({
        rawPayload: generation.rawPayload,
        snapshot: context.snapshot.payload,
        citationManifest: context.citationManifest,
        engineResult: context.engineResult
      });
      attempts.push(result);
      if (result.passed) {
        const parsed = validateNarrativeSchema(generation.rawPayload);
        return {
          narrative: parsed.success ? parsed.data : null,
          narrativeAvailable: true,
          model,
          attempts,
          finalAttempt: result
        };
      }
      correctiveFeedback = summarizeIssuesForRetry(result.issues);
    }

    // Retry budget exhausted: fall back to deterministic-only. The full
    // compliance scorecards / control matrix / registers / evidence matrix
    // (all from the trusted deterministic engine) still publish in full;
    // only the narrative prose sections are explicitly marked unavailable —
    // see report-pdf.ts's renderSection() fallback text.
    return {
      narrative: emptyNarrativePayload(),
      narrativeAvailable: false,
      model,
      attempts,
      finalAttempt: attempts[attempts.length - 1]
    };
  }

  private async replayedReport(tenantId: string, actorId: string, idempotencyKey: string): Promise<AuditReportRecord | null> {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as Partial<GeneratePayload>;
    if (!payload.reportId) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    return this.repository.findReport(tenantId, actorId, payload.reportId);
  }

  private async publishMutation(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    eventType: string;
    reportId: string;
    assessmentId: string;
    body: Record<string, unknown>;
  }): Promise<void> {
    const now = new Date();
    const payload: GeneratePayload = { reportId: input.reportId, assessmentId: input.assessmentId };
    const outboxEvent = await this.outbox.publish({
      tenantId: input.tenantId,
      eventType: input.eventType,
      aggregateType: "audit_report",
      aggregateId: input.reportId,
      payload,
      idempotencyKey: input.idempotencyKey,
      createdBy: input.actorId,
      now
    });
    if (outboxEvent.createdAt.getTime() !== now.getTime()) {
      return;
    }
    await this.auditLog.append({
      tenantId: input.tenantId,
      eventType: input.eventType,
      actorId: input.actorId,
      targetType: "audit_report",
      targetId: input.reportId,
      traceId: input.idempotencyKey,
      classification: "confidential",
      body: input.body
    });
  }
}
