import { Inject, Injectable } from "@nestjs/common";
import { TenantScopedDb } from "../../../platform/database/tenant-scoped-db.js";
import type {
  ReportExportRecord,
  ReportFormat,
  ReportingAnalyticsRepository
} from "../application/reporting-analytics.types.js";

@Injectable()
export class PostgresReportingAnalyticsRepository implements ReportingAnalyticsRepository {
  constructor(@Inject(TenantScopedDb) private readonly db: TenantScopedDb) {}

  async createExport(input: {
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
    assessmentSnapshotId?: string;
    reportTemplateId?: string;
    artifactBytes?: Buffer;
    signature?: string;
    completedAt?: Date;
  }): Promise<ReportExportRecord> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into report_exports (
            id, tenant_id, assessment_id, snapshot_id, template_version, format,
            idempotency_key, sha256, storage_uri, classification, created_by, updated_by,
            assessment_snapshot_id, report_template_id, artifact_bytes, signature, completed_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'confidential', $10, $10, $11, $12, $13, $14, $15)
          on conflict (tenant_id, idempotency_key) do update
          set updated_at = report_exports.updated_at
          returning ${exportColumns()}
        `,
        [
          input.id,
          input.tenantId,
          input.assessmentId,
          input.snapshotId,
          input.templateVersion,
          input.format,
          input.idempotencyKey,
          input.sha256,
          input.storageUri,
          input.actorId,
          input.assessmentSnapshotId ?? null,
          input.reportTemplateId ?? null,
          input.artifactBytes ?? null,
          input.signature ?? null,
          input.completedAt ?? null
        ]
      );
      return mapExport(result.rows[0]);
    });
  }

  async listExports(input: {
    tenantId: string;
    assessmentId?: string;
    pagination: { limit: number; offset: number };
  }): Promise<ReportExportRecord[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const values: unknown[] = [input.tenantId, input.pagination.limit, input.pagination.offset];
      const assessmentPredicate = input.assessmentId ? "and assessment_id = $4" : "";
      if (input.assessmentId) {
        values.push(input.assessmentId);
      }
      const result = await client.query(
        `
          select ${exportColumns()}
          from report_exports
          where tenant_id = $1
          ${assessmentPredicate}
          order by created_at desc
          limit $2 offset $3
        `,
        values
      );
      return result.rows.map(mapExport);
    });
  }

  async findExport(tenantId: string, exportId: string): Promise<ReportExportRecord | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${exportColumns()}
          from report_exports
          where tenant_id = $1 and id = $2
        `,
        [tenantId, exportId]
      );
      return result.rows[0] ? mapExport(result.rows[0]) : null;
    });
  }

  async findByIdempotencyKey(tenantId: string, idempotencyKey: string): Promise<ReportExportRecord | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${exportColumns()}
          from report_exports
          where tenant_id = $1 and idempotency_key = $2
        `,
        [tenantId, idempotencyKey]
      );
      return result.rows[0] ? mapExport(result.rows[0]) : null;
    });
  }

  // G-04: a deliberately separate, lean query — `artifact_bytes` is excluded from
  // `exportColumns()` so ordinary list/get/metadata calls never pull a (potentially
  // sizeable) blob off the wire; only an actual download needs it.
  async findArtifactBytes(tenantId: string, exportId: string): Promise<Buffer | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query<{ artifact_bytes: Buffer | null }>(
        `select artifact_bytes from report_exports where tenant_id = $1 and id = $2`,
        [tenantId, exportId]
      );
      return result.rows[0]?.artifact_bytes ?? null;
    });
  }

  // G-04: links a new export to the assessment's existing immutable snapshot root
  // (G-01, assessment_snapshots). Assessments don't yet support re-snapshotting after
  // creation, so the sequence=1 snapshot is always the correct one to link for now —
  // this becomes a real "latest" lookup once a re-snapshot mechanism exists.
  async findLatestAssessmentSnapshotId(tenantId: string, assessmentId: string): Promise<string | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query<{ id: string }>(
        `select id from assessment_snapshots where tenant_id = $1 and assessment_id = $2 order by sequence desc limit 1`,
        [tenantId, assessmentId]
      );
      return result.rows[0]?.id ?? null;
    });
  }

  async upsertReportTemplate(input: {
    tenantId: string;
    templateKey: string;
    templateVersion: string;
    format: ReportFormat;
    rendererVersion: string;
    checksum: string;
    actorId: string;
  }): Promise<string> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const result = await client.query<{ id: string }>(
        `
          insert into report_templates (
            tenant_id, template_key, template_version, format, renderer_version, checksum,
            created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $7)
          on conflict (tenant_id, template_key, template_version, format) do update
            set renderer_version = excluded.renderer_version,
                checksum = excluded.checksum,
                updated_by = excluded.updated_by,
                updated_at = now()
          returning id
        `,
        [
          input.tenantId,
          input.templateKey,
          input.templateVersion,
          input.format,
          input.rendererVersion,
          input.checksum,
          input.actorId
        ]
      );
      return result.rows[0].id;
    });
  }

  async createExportManifest(input: {
    tenantId: string;
    reportExportId: string;
    snapshotId: string;
    templateVersion: string;
    artifactHash: string;
    signature: string;
    manifestHash: string;
    manifestPayload: Record<string, unknown>;
    actorId: string;
  }): Promise<void> {
    await this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      await client.query(
        `
          insert into export_manifests (
            tenant_id, report_export_id, snapshot_id, template_version, artifact_hashes,
            manifest_hash, signing_key_ref, signature, manifest_payload, signed_at,
            created_by, updated_by
          )
          values ($1, $2, $3, $4, $5::text[], $6, $7, $8, $9::jsonb, now(), $10, $10)
          on conflict (tenant_id, snapshot_id, template_version, manifest_hash) do nothing
        `,
        [
          input.tenantId,
          input.reportExportId,
          input.snapshotId,
          input.templateVersion,
          [input.artifactHash],
          input.manifestHash,
          "local-sha256-v1",
          input.signature,
          JSON.stringify(input.manifestPayload),
          input.actorId
        ]
      );
    });
  }
}

function exportColumns(): string {
  return `
    id, tenant_id, version, assessment_id, snapshot_id, template_version, format,
    idempotency_key, sha256, storage_uri, classification, created_by, created_at, updated_by, updated_at,
    assessment_snapshot_id, report_template_id, completed_at
  `;
}

function mapExport(row: Record<string, unknown>): ReportExportRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    assessmentId: String(row.assessment_id),
    snapshotId: String(row.snapshot_id),
    templateVersion: String(row.template_version),
    format: row.format as ReportFormat,
    idempotencyKey: String(row.idempotency_key),
    sha256: String(row.sha256),
    storageUri: (row.storage_uri as string | null) ?? undefined,
    assessmentSnapshotId: (row.assessment_snapshot_id as string | null) ?? undefined,
    reportTemplateId: (row.report_template_id as string | null) ?? undefined,
    completedAt: (row.completed_at as Date | null) ?? undefined,
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}
