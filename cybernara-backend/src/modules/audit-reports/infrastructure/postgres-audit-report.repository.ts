import { Inject, Injectable } from "@nestjs/common";
import { TenantScopedDb, type TenantScopedClient } from "../../../platform/database/tenant-scoped-db.js";
import type { Pagination } from "../../../shared/pagination.js";
import type {
  AuditReportInsertInput,
  AuditReportRecord,
  AuditReportRepository,
  ClosedAssessmentSummary,
  ReportLifecycleStatus,
  StructuredReportJson
} from "../application/audit-report.types.js";
import type { ValidationAttemptResult } from "../domain/groundedness-validator.js";

/**
 * Entirely new read/write paths, independent of PostgresAssessmentRepository:
 * `listClosedAssessments` issues its own SELECT against `assessments` (status
 * filter + joins purpose-built for this reporting page) rather than calling
 * or modifying `AssessmentService.list()`/`listAssessments()` — normal
 * assessment listing is completely unaffected by this feature, exactly as
 * required. Writes/reads to `ai_audit_reports` are the only mutation surface
 * this repository exposes for that table: `insertReport` (full row,
 * lifecycle_status='draft') and `publishReport` (a narrow UPDATE touching
 * only lifecycle_status/updated_by/updated_at/version) — there is no third,
 * generic "update" method, so nothing in this codebase can overwrite a
 * report's historical content through this repository.
 */
@Injectable()
export class PostgresAuditReportRepository implements AuditReportRepository {
  constructor(@Inject(TenantScopedDb) private readonly db: TenantScopedDb) {}

  async listClosedAssessments(tenantId: string, actorId: string, pagination: Pagination): Promise<ClosedAssessmentSummary[]> {
    return this.db.withTenant(tenantId, actorId, async (client) => {
      const assessments = await client.query<{
        id: string;
        scope_name: string;
        period_start: Date;
        period_end: Date;
      }>(
        `select id, scope_name, period_start, period_end
         from assessments
         where tenant_id = $1 and status = 'closed'
         order by updated_at desc
         limit $2 offset $3`,
        [tenantId, pagination.limit, pagination.offset]
      );
      if (assessments.rows.length === 0) {
        return [];
      }
      const assessmentIds = assessments.rows.map((row) => row.id);

      const frameworks = await client.query<{ assessment_id: string; framework_key: string }>(
        `select assessment_id, framework_key from assessment_frameworks where tenant_id = $1 and assessment_id = any($2::uuid[])`,
        [tenantId, assessmentIds]
      );
      const frameworksByAssessment = new Map<string, string[]>();
      for (const row of frameworks.rows) {
        const list = frameworksByAssessment.get(row.assessment_id) ?? [];
        list.push(row.framework_key);
        frameworksByAssessment.set(row.assessment_id, list);
      }

      const itemCounts = await client.query<{ assessment_id: string; item_count: string }>(
        `select assessment_id, count(*)::text as item_count from assessment_items where tenant_id = $1 and assessment_id = any($2::uuid[]) group by assessment_id`,
        [tenantId, assessmentIds]
      );
      const itemCountByAssessment = new Map(itemCounts.rows.map((row) => [row.assessment_id, Number(row.item_count)]));

      const findingCounts = await client.query<{ assessment_id: string; finding_count: string }>(
        `select ai.assessment_id, count(f.id)::text as finding_count
         from assessment_items ai
         join findings f on f.tenant_id = $1 and f.assessment_item_id = ai.id
         where ai.tenant_id = $1 and ai.assessment_id = any($2::uuid[])
         group by ai.assessment_id`,
        [tenantId, assessmentIds]
      );
      const findingCountByAssessment = new Map(findingCounts.rows.map((row) => [row.assessment_id, Number(row.finding_count)]));

      const signoffs = await client.query<{ assessment_id: string; signer_id: string; signed_at: Date }>(
        `select assessment_id, signer_id, signed_at
         from assessment_signoffs
         where tenant_id = $1 and assessment_id = any($2::uuid[]) and scope_type = 'final' and decision = 'approved'
         order by signed_at desc`,
        [tenantId, assessmentIds]
      );
      const signoffByAssessment = new Map<string, { signerId: string; signedAt: Date }>();
      for (const row of signoffs.rows) {
        if (!signoffByAssessment.has(row.assessment_id)) {
          signoffByAssessment.set(row.assessment_id, { signerId: row.signer_id, signedAt: row.signed_at });
        }
      }

      const reports = await client.query<{
        assessment_id: string;
        id: string;
        lifecycle_status: ReportLifecycleStatus;
        generated_at: Date;
        groundedness_score: string;
      }>(
        `select distinct on (assessment_id) assessment_id, id, lifecycle_status, generated_at, groundedness_score
         from ai_audit_reports
         where tenant_id = $1 and assessment_id = any($2::uuid[])
         order by assessment_id, generated_at desc`,
        [tenantId, assessmentIds]
      );
      const latestReportByAssessment = new Map(reports.rows.map((row) => [row.assessment_id, row]));

      return assessments.rows.map((row) => {
        const latest = latestReportByAssessment.get(row.id);
        const signoff = signoffByAssessment.get(row.id);
        return {
          assessmentId: row.id,
          scopeName: row.scope_name,
          frameworks: frameworksByAssessment.get(row.id) ?? [],
          periodStart: row.period_start,
          periodEnd: row.period_end,
          closedAt: signoff?.signedAt ?? null,
          closedBy: signoff?.signerId ?? null,
          itemCount: itemCountByAssessment.get(row.id) ?? 0,
          findingCount: findingCountByAssessment.get(row.id) ?? 0,
          latestReport: latest
            ? {
                reportId: latest.id,
                lifecycleStatus: latest.lifecycle_status,
                generatedAt: latest.generated_at,
                groundednessScore: Number(latest.groundedness_score)
              }
            : null
        };
      });
    });
  }

  async insertReport(input: { tenantId: string; actorId: string; record: AuditReportInsertInput }): Promise<AuditReportRecord> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const now = new Date();
      const record = input.record;
      await client.query(
        `insert into ai_audit_reports (
           id, tenant_id, version, assessment_id, snapshot_id, report_type, lifecycle_status,
           report_schema_version, compliance_methodology_version, ai_prompt_version, ai_model_metadata,
           generated_by, generated_at, report_hash, snapshot_hash, artifact_bytes, artifact_mime_type,
           structured_report_json, provenance, citation_manifest, groundedness_score,
           groundedness_validation_log, narrative_available, classification,
           created_by, created_at, updated_by, updated_at
         ) values (
           $1, $2, 1, $3, $4, $5, $6,
           $7, $8, $9, $10::jsonb,
           $11, $12, $13, $14, $15, $16,
           $17::jsonb, $18::jsonb, $19::jsonb, $20,
           $21::jsonb, $22, 'confidential',
           $23, $24, $23, $24
         )`,
        [
          record.id,
          input.tenantId,
          record.assessmentId,
          record.snapshotId,
          record.reportType,
          record.lifecycleStatus,
          record.reportSchemaVersion,
          record.complianceMethodologyVersion,
          record.aiPromptVersion,
          JSON.stringify(record.aiModelMetadata),
          record.generatedBy,
          record.generatedAt,
          record.reportHash,
          record.snapshotHash,
          record.artifactBytes,
          record.artifactMimeType,
          JSON.stringify(record.structuredReportJson),
          JSON.stringify(record.provenance),
          JSON.stringify(record.citationManifest),
          record.groundednessScore,
          JSON.stringify(record.groundednessValidationLog),
          record.narrativeAvailable,
          input.actorId,
          now
        ]
      );
      const inserted = await this.findWithClient(client, input.tenantId, record.id);
      if (!inserted) {
        throw new Error("Failed to read back inserted audit report.");
      }
      return inserted;
    });
  }

  async findReport(tenantId: string, actorId: string, reportId: string): Promise<AuditReportRecord | null> {
    return this.db.withTenant(tenantId, actorId, (client) => this.findWithClient(client, tenantId, reportId));
  }

  async listReportsForAssessment(tenantId: string, actorId: string, assessmentId: string): Promise<AuditReportRecord[]> {
    return this.db.withTenant(tenantId, actorId, async (client) => {
      const rows = await client.query<AuditReportRow>(
        `select ${SELECT_COLUMNS} from ai_audit_reports where tenant_id = $1 and assessment_id = $2 order by generated_at desc`,
        [tenantId, assessmentId]
      );
      return rows.rows.map(mapRow);
    });
  }

  async findArtifactBytes(tenantId: string, actorId: string, reportId: string): Promise<Buffer | null> {
    return this.db.withTenant(tenantId, actorId, async (client) => {
      const result = await client.query<{ artifact_bytes: Buffer | null }>(
        `select artifact_bytes from ai_audit_reports where tenant_id = $1 and id = $2`,
        [tenantId, reportId]
      );
      return result.rows[0]?.artifact_bytes ?? null;
    });
  }

  async publishReport(tenantId: string, actorId: string, reportId: string): Promise<AuditReportRecord> {
    return this.db.withTenant(tenantId, actorId, async (client) => {
      // The CHECK constraint (lifecycle_status <> 'published' or groundedness_score = 100) is the
      // hard backstop; this WHERE clause additionally makes the operation a no-op (0 rows) rather
      // than an error if called on an already-published or sub-100 report.
      await client.query(
        `update ai_audit_reports
         set lifecycle_status = 'published', updated_by = $3, updated_at = now(), version = version + 1
         where tenant_id = $1 and id = $2 and lifecycle_status = 'draft' and groundedness_score = 100`,
        [tenantId, reportId, actorId]
      );
      const updated = await this.findWithClient(client, tenantId, reportId);
      if (!updated) {
        throw new Error("Report not found after publish attempt.");
      }
      return updated;
    });
  }

  private async findWithClient(
    client: TenantScopedClient,
    tenantId: string,
    reportId: string
  ): Promise<AuditReportRecord | null> {
    const result = await client.query<AuditReportRow>(
      `select ${SELECT_COLUMNS} from ai_audit_reports where tenant_id = $1 and id = $2`,
      [tenantId, reportId]
    );
    const row = result.rows[0];
    return row ? mapRow(row) : null;
  }
}

const SELECT_COLUMNS = `
  id, tenant_id, version, assessment_id, snapshot_id, report_type, lifecycle_status,
  report_schema_version, compliance_methodology_version, ai_prompt_version, ai_model_metadata,
  generated_by, generated_at, report_hash, snapshot_hash, artifact_mime_type,
  structured_report_json, provenance, citation_manifest, groundedness_score,
  groundedness_validation_log, narrative_available, classification,
  created_by, created_at, updated_by, updated_at
`;

interface AuditReportRow {
  id: string;
  tenant_id: string;
  version: number;
  assessment_id: string;
  snapshot_id: string;
  report_type: "closure_audit";
  lifecycle_status: ReportLifecycleStatus;
  report_schema_version: string;
  compliance_methodology_version: string;
  ai_prompt_version: string;
  ai_model_metadata: Record<string, unknown>;
  generated_by: string;
  generated_at: Date;
  report_hash: string;
  snapshot_hash: string;
  artifact_mime_type: string;
  structured_report_json: StructuredReportJson;
  provenance: Record<string, unknown>;
  citation_manifest: Record<string, unknown>;
  groundedness_score: string;
  groundedness_validation_log: ValidationAttemptResult[];
  narrative_available: boolean;
  classification: string;
  created_by: string;
  created_at: Date;
  updated_by: string;
  updated_at: Date;
  [key: string]: unknown;
}

function mapRow(row: AuditReportRow): AuditReportRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    version: row.version,
    assessmentId: row.assessment_id,
    snapshotId: row.snapshot_id,
    reportType: row.report_type,
    lifecycleStatus: row.lifecycle_status,
    reportSchemaVersion: row.report_schema_version,
    complianceMethodologyVersion: row.compliance_methodology_version,
    aiPromptVersion: row.ai_prompt_version,
    aiModelMetadata: row.ai_model_metadata,
    generatedBy: row.generated_by,
    generatedAt: row.generated_at,
    reportHash: row.report_hash,
    snapshotHash: row.snapshot_hash,
    artifactMimeType: row.artifact_mime_type,
    structuredReportJson: row.structured_report_json,
    provenance: row.provenance,
    citationManifest: row.citation_manifest,
    groundednessScore: Number(row.groundedness_score),
    groundednessValidationLog: row.groundedness_validation_log,
    narrativeAvailable: row.narrative_available,
    classification: row.classification,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at
  };
}
