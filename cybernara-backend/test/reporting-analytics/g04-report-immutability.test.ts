import "dotenv/config";
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { ADMIN_DATABASE_POOL } from "../../src/platform/database/tokens.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";
import { approvedControlSelectionForTenant } from "../helpers/question-repository-fixture.js";

// G-04 report immutability (0014/0015/0016_g04_*.sql): real-Supabase integrity tests for
// the new constraints, plus the actual behavioral proof the gap report demands — that
// `download()` serves the frozen artifact instead of re-rendering it from live state.

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("SUPABASE_DB_URL is not set; G-04 tests must run against a real database.");
}

let pool: pg.Pool;

beforeAll(() => {
  pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
});

afterAll(async () => {
  await pool.end();
});

async function seedAssessmentAndSnapshot(): Promise<{ tenantId: string; assessmentId: string; actorId: string }> {
  const tenantId = randomUUID();
  const actorId = randomUUID();
  const assessment = await pool.query(
    `insert into assessments (tenant_id, scope_name, control_snapshot_version, period_start, period_end, created_by, updated_by)
     values ($1, $2, 'v1', '2026-01-01', '2026-12-31', $3, $3) returning id`,
    [tenantId, `g04-integrity-assessment-${randomUUID()}`, actorId]
  );
  await pool.query(
    `insert into assessment_snapshots (tenant_id, assessment_id, snapshot_type, sequence, content_hash, created_by)
     values ($1, $2, 'created', 1, 'hash-1', $3)`,
    [tenantId, assessment.rows[0].id, actorId]
  );
  return { tenantId, assessmentId: assessment.rows[0].id as string, actorId };
}

describe("G-04: report_templates constraints", () => {
  it("rejects a second template with the same key/version/format for the same tenant", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    await pool.query(
      `insert into report_templates (tenant_id, template_key, template_version, format, renderer_version, checksum, created_by, updated_by)
       values ($1, 'm2-readiness-v1', 'm2-readiness-v1', 'pdf', 'v1', 'hash-1', $2, $2)`,
      [tenantId, actorId]
    );
    await expect(
      pool.query(
        `insert into report_templates (tenant_id, template_key, template_version, format, renderer_version, checksum, created_by, updated_by)
         values ($1, 'm2-readiness-v1', 'm2-readiness-v1', 'pdf', 'v2', 'hash-2', $2, $2)`,
        [tenantId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects an invalid format", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    await expect(
      pool.query(
        `insert into report_templates (tenant_id, template_key, template_version, format, renderer_version, checksum, created_by, updated_by)
         values ($1, 'bad-format-template', 'v1', 'docx', 'v1', 'hash', $2, $2)`,
        [tenantId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});

describe("G-04: report_exports new FK links", () => {
  it("rejects a report_export referencing a non-existent assessment_snapshot", async () => {
    const { tenantId, assessmentId, actorId } = await seedAssessmentAndSnapshot();
    await expect(
      pool.query(
        `insert into report_exports (
           tenant_id, assessment_id, snapshot_id, template_version, format, idempotency_key, sha256,
           created_by, updated_by, assessment_snapshot_id
         )
         values ($1, $2, 'snap-1', 'v1', 'pdf', $3, 'sha-1', $4, $4, $5)`,
        [tenantId, assessmentId, `g04-fk-test-${randomUUID()}`, actorId, randomUUID()]
      )
    ).rejects.toThrow(/foreign key/i);
  });

  it("accepts a report_export correctly linked to a real assessment_snapshot", async () => {
    const { tenantId, assessmentId, actorId } = await seedAssessmentAndSnapshot();
    const snapshot = await pool.query(
      `select id from assessment_snapshots where tenant_id = $1 and assessment_id = $2`,
      [tenantId, assessmentId]
    );
    const result = await pool.query(
      `insert into report_exports (
         tenant_id, assessment_id, snapshot_id, template_version, format, idempotency_key, sha256,
         created_by, updated_by, assessment_snapshot_id
       )
       values ($1, $2, 'snap-1', 'v1', 'pdf', $3, 'sha-1', $4, $4, $5)
       returning id`,
      [tenantId, assessmentId, `g04-fk-test-${randomUUID()}`, actorId, snapshot.rows[0].id]
    );
    expect(result.rows[0].id).toBeTruthy();
  });
});

describe("G-04: export_manifests append-only + uniqueness (extending the pre-existing 0007 table)", () => {
  it("rejects a second manifest with the same (tenant, snapshot_id, template_version, manifest_hash)", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const snapshotId = `g04-manifest-snapshot-${randomUUID()}`;
    await pool.query(
      `insert into export_manifests (
         tenant_id, snapshot_id, template_version, artifact_hashes, manifest_hash, signing_key_ref,
         signature, created_by, updated_by
       )
       values ($1, $2, 'v1', array['hash-1'], 'manifest-hash-1', 'local-sha256-v1', 'sig-1', $3, $3)`,
      [tenantId, snapshotId, actorId]
    );
    await expect(
      pool.query(
        `insert into export_manifests (
           tenant_id, snapshot_id, template_version, artifact_hashes, manifest_hash, signing_key_ref,
           signature, created_by, updated_by
         )
         values ($1, $2, 'v1', array['hash-2'], 'manifest-hash-1', 'local-sha256-v1', 'sig-2', $3, $3)`,
        [tenantId, snapshotId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects an update to an existing manifest (append-only, newly added by 0014)", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const manifest = await pool.query(
      `insert into export_manifests (
         tenant_id, snapshot_id, template_version, artifact_hashes, manifest_hash, signing_key_ref,
         signature, created_by, updated_by
       )
       values ($1, $2, 'v1', array['hash-1'], $3, 'local-sha256-v1', 'sig-1', $4, $4)
       returning id`,
      [tenantId, `g04-manifest-update-${randomUUID()}`, `manifest-hash-${randomUUID()}`, actorId]
    );
    await expect(
      pool.query(`update export_manifests set signature = 'tampered' where id = $1`, [manifest.rows[0].id])
    ).rejects.toThrow(/append-only/i);
  });

  it("rejects a delete of an existing manifest", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const manifest = await pool.query(
      `insert into export_manifests (
         tenant_id, snapshot_id, template_version, artifact_hashes, manifest_hash, signing_key_ref,
         signature, created_by, updated_by
       )
       values ($1, $2, 'v1', array['hash-1'], $3, 'local-sha256-v1', 'sig-1', $4, $4)
       returning id`,
      [tenantId, `g04-manifest-delete-${randomUUID()}`, `manifest-hash-${randomUUID()}`, actorId]
    );
    await expect(pool.query(`delete from export_manifests where id = $1`, [manifest.rows[0].id])).rejects.toThrow(
      /append-only/i
    );
  });
});

describe("G-04: download() serves the frozen artifact, proven by mutating the live assessment after export", () => {
  let app: INestApplication;
  let baseUrl: string;
  let adminPool: pg.Pool;

  const tenantId = randomUUID();
  const userId = randomUUID();
  const ownerId = randomUUID();

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalFilters(new ProblemDetailsFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidUnknownValues: true, transform: true }));
    await app.listen(0);
    adminPool = app.get<pg.Pool>(ADMIN_DATABASE_POOL);
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  }, 120_000);

  afterAll(async () => {
    await app.close();
  });

  function headers(scopes: string): Record<string, string> {
    return {
      "content-type": "application/json",
      "x-tenant-id": tenantId,
      "x-user-id": userId,
      "x-user-clearance": "restricted",
      "x-user-scopes": scopes
    };
  }

  it("returns byte-identical downloads even after the underlying assessment_items row is mutated directly", async () => {
    const assessmentResponse = await fetch(`${baseUrl}/v1/assessments`, {
      method: "POST",
      headers: { ...headers("assessment:write"), "Idempotency-Key": `g04-e2e-assessment-${tenantId}` },
      body: JSON.stringify({
        scopeName: "G-04 frozen artifact proof",
        ownerId,
        periodStart: "2026-01-01",
        periodEnd: "2026-12-31",
        controls: [await approvedControlSelectionForTenant({ pool, tenantId, actorId: userId })]
      })
    });
    expect(assessmentResponse.status).toBe(201);
    const assessment = (await assessmentResponse.json()) as { id: string; controlSnapshotVersion: string };

    const exportKey = `${assessment.controlSnapshotVersion}:m2-readiness-v1:pdf`;
    const exportResponse = await fetch(`${baseUrl}/v1/report-exports`, {
      method: "POST",
      headers: { ...headers("report_export:write"), "Idempotency-Key": exportKey },
      body: JSON.stringify({
        assessmentId: assessment.id,
        snapshotId: assessment.controlSnapshotVersion,
        templateVersion: "m2-readiness-v1",
        format: "pdf"
      })
    });
    expect(exportResponse.status).toBe(201);
    const reportExport = (await exportResponse.json()) as { id: string };

    const firstDownload = await fetch(`${baseUrl}/v1/report-exports/${reportExport.id}/download`, {
      headers: headers("report_export:read")
    });
    expect(firstDownload.status).toBe(200);
    const firstBytes = Buffer.from(await firstDownload.arrayBuffer());
    expect(firstBytes.length).toBeGreaterThan(0);

    // Directly mutate the underlying assessment_items row (bypassing the service layer
    // entirely) to simulate the exact scenario the gap report warns about: if download()
    // re-rendered from live state, this would silently change what gets served. Using
    // the admin pool since this is a deliberate out-of-band mutation, not a normal
    // tenant-scoped application write.
    const updateResult = await adminPool.query(
      `update assessment_items set status = 'approved' where tenant_id = $1 and assessment_id = $2`,
      [tenantId, assessment.id]
    );
    expect(updateResult.rowCount).toBeGreaterThan(0);

    const secondDownload = await fetch(`${baseUrl}/v1/report-exports/${reportExport.id}/download`, {
      headers: headers("report_export:read")
    });
    expect(secondDownload.status).toBe(200);
    const secondBytes = Buffer.from(await secondDownload.arrayBuffer());

    // The decisive assertion: byte-identical despite the live assessment state changing
    // underneath it. Before this migration, download() re-rendered from live state on
    // every call — this would have produced *different* bytes (the item's new status
    // text), and the old defensive sha256 check would have thrown a ConflictException
    // instead of silently serving stale-vs-live-mismatched content. Neither happens now.
    expect(secondBytes.equals(firstBytes)).toBe(true);

    // Confirm the persisted artifact and manifest are really there, not just that the
    // HTTP response happened to look right.
    const persisted = await adminPool.query(
      `select octet_length(artifact_bytes) as len from report_exports where tenant_id = $1 and id = $2`,
      [tenantId, reportExport.id]
    );
    expect(persisted.rows[0].len).toBe(firstBytes.length);
    const manifest = await adminPool.query(`select id from export_manifests where report_export_id = $1`, [
      reportExport.id
    ]);
    expect(manifest.rows).toHaveLength(1);
  }, 60_000);
});
