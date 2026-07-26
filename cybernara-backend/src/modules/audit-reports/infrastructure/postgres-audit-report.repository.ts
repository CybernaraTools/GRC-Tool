import { Inject, Injectable } from "@nestjs/common";
import { TenantScopedDb, type TenantScopedClient } from "../../../platform/database/tenant-scoped-db.js";
import type { Pagination } from "../../../shared/pagination.js";
import type {
  AuditReportInsertInput,
  AuditReportJson,
  AuditReportRecord,
  AuditReportRepository,
  ClosedAssessmentSummary
} from "../application/audit-report.types.js";

@Injectable()
export class PostgresAuditReportRepository implements AuditReportRepository {
  constructor(@Inject(TenantScopedDb) private readonly db: TenantScopedDb) {}

  async listClosedAssessments(tenantId: string, pagination: Pagination): Promise<ClosedAssessmentSummary[]> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
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

      const reports = await client.query<{ assessment_id: string; id: string; generated_at: Date }>(
        `select distinct on (assessment_id) assessment_id, id, generated_at
         from audit_reports
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
          latestReport: latest ? { reportId: latest.id, generatedAt: latest.generated_at } : null
        };
      });
    });
  }

  async insertReport(input: { tenantId: string; actorId: string; record: AuditReportInsertInput }): Promise<AuditReportRecord> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const now = new Date();
      const record = input.record;
      await client.query(
        `insert into audit_reports (
           id, tenant_id, version, assessment_id, report_type, generated_by, generated_at, report_hash,
           artifact_bytes, artifact_mime_type, structured_report_json, classification,
           created_by, created_at, updated_by, updated_at
         ) values (
           $1, $2, 1, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, 'confidential', $11, $12, $11, $12
         )`,
        [
          record.id,
          input.tenantId,
          record.assessmentId,
          record.reportType,
          record.generatedBy,
          record.generatedAt,
          record.reportHash,
          record.artifactBytes,
          record.artifactMimeType,
          JSON.stringify(record.structuredReportJson),
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

  async findReport(tenantId: string, reportId: string): Promise<AuditReportRecord | null> {
    return this.db.withTenant(tenantId, undefined, (client) => this.findWithClient(client, tenantId, reportId));
  }

  async listReportsForAssessment(tenantId: string, assessmentId: string): Promise<AuditReportRecord[]> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const rows = await client.query<AuditReportRow>(
        `select ${SELECT_COLUMNS} from audit_reports where tenant_id = $1 and assessment_id = $2 order by generated_at desc`,
        [tenantId, assessmentId]
      );
      return rows.rows.map(mapRow);
    });
  }

  async findArtifactBytes(tenantId: string, reportId: string): Promise<Buffer | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query<{ artifact_bytes: Buffer | null }>(
        `select artifact_bytes from audit_reports where tenant_id = $1 and id = $2`,
        [tenantId, reportId]
      );
      return result.rows[0]?.artifact_bytes ?? null;
    });
  }

  private async findWithClient(
    client: TenantScopedClient,
    tenantId: string,
    reportId: string
  ): Promise<AuditReportRecord | null> {
    const result = await client.query<AuditReportRow>(
      `select ${SELECT_COLUMNS} from audit_reports where tenant_id = $1 and id = $2`,
      [tenantId, reportId]
    );
    const row = result.rows[0];
    return row ? mapRow(row) : null;
  }
}

const SELECT_COLUMNS = `
  id, tenant_id, version, assessment_id, report_type, generated_by, generated_at, report_hash,
  artifact_mime_type, structured_report_json, classification,
  created_by, created_at, updated_by, updated_at
`;

interface AuditReportRow {
  id: string;
  tenant_id: string;
  version: number;
  assessment_id: string;
  report_type: "closure_audit";
  generated_by: string;
  generated_at: Date;
  report_hash: string;
  artifact_mime_type: string;
  structured_report_json: AuditReportJson;
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
    reportType: row.report_type,
    generatedBy: row.generated_by,
    generatedAt: row.generated_at,
    reportHash: row.report_hash,
    artifactMimeType: row.artifact_mime_type,
    structuredReportJson: row.structured_report_json,
    classification: row.classification,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at
  };
}
