import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAutomatedTest,
  createAutomatedTestRun,
  createEvidenceCustodyEvent,
  createEvidenceExpiryEvent,
  createEvidenceLink,
  createEvidenceRequest,
  createEvidenceReview,
  createEvidenceSample,
  createEvidenceVersion,
  createMalwareScanResult
} from "../../src/modules/evidence-assurance/domain/evidence.js";

// G-07 (evidence graph, migration 0021_g07_evidence_graph.sql): pure
// domain-function unit tests plus real-Supabase integrity tests proving the
// new tables' own constraints actually reject bad data at the database
// layer. See the migration's own header comment for the full scoping and
// reconciliation record (Full spec §11 in one pass, confirmed via
// AskUserQuestion).

describe("G-07 domain: evidence graph pure functions", () => {
  it("createEvidenceVersion rejects a sha256 that is not a 64-character hex digest", () => {
    expect(() =>
      createEvidenceVersion({
        tenantId: randomUUID(),
        evidenceId: randomUUID(),
        evidenceVersionNo: 1,
        objectUri: "s3://bucket/object",
        sha256: "not-a-real-hash",
        sizeBytes: 100,
        mimeType: "application/pdf",
        observedAt: new Date(),
        periodStart: new Date("2026-01-01"),
        periodEnd: new Date("2026-12-31"),
        uploadedBy: randomUUID()
      })
    ).toThrow(/64-character hex digest/i);
  });

  it("createEvidenceVersion rejects periodEnd before periodStart", () => {
    expect(() =>
      createEvidenceVersion({
        tenantId: randomUUID(),
        evidenceId: randomUUID(),
        evidenceVersionNo: 1,
        objectUri: "s3://bucket/object",
        sha256: "a".repeat(64),
        sizeBytes: 100,
        mimeType: "application/pdf",
        observedAt: new Date(),
        periodStart: new Date("2026-12-31"),
        periodEnd: new Date("2026-01-01"),
        uploadedBy: randomUUID()
      })
    ).toThrow(/periodEnd cannot precede/i);
  });

  it("createEvidenceLink rejects a blank purpose", () => {
    expect(() =>
      createEvidenceLink({
        tenantId: randomUUID(),
        evidenceVersionId: randomUUID(),
        targetType: "control_instance",
        targetId: randomUUID(),
        purpose: "   "
      })
    ).toThrow(/purpose/i);
  });

  it("createEvidenceRequest rejects a blank requestedFrom", () => {
    expect(() =>
      createEvidenceRequest({
        tenantId: randomUUID(),
        assessmentId: randomUUID(),
        controlInstanceId: randomUUID(),
        requestedFrom: "  ",
        dueAt: new Date()
      })
    ).toThrow(/requestedFrom/i);
  });

  it("createEvidenceReview enforces reviewer separation (reviewer cannot own the evidence)", () => {
    const sameId = randomUUID();
    expect(() =>
      createEvidenceReview({
        tenantId: randomUUID(),
        evidenceVersionId: randomUUID(),
        reviewerId: sameId,
        evidenceOwnerId: sameId,
        decision: "sufficient",
        rationale: "Looks complete."
      })
    ).toThrow(/reviewer separation/i);
  });

  it("createAutomatedTest rejects a blank connectorType", () => {
    expect(() =>
      createAutomatedTest({
        tenantId: randomUUID(),
        controlId: randomUUID(),
        connectorType: "  ",
        queryTemplate: "select 1",
        schedule: "0 * * * *",
        severity: "high"
      })
    ).toThrow(/connectorType/i);
  });

  it("createAutomatedTestRun rejects a blank idempotencyKey", () => {
    expect(() =>
      createAutomatedTestRun({
        tenantId: randomUUID(),
        automatedTestId: randomUUID(),
        connectorId: randomUUID(),
        idempotencyKey: "  "
      })
    ).toThrow(/idempotencyKey/i);
  });

  it("createEvidenceSample rejects a negative sampleSize", () => {
    expect(() =>
      createEvidenceSample({
        tenantId: randomUUID(),
        testResultId: randomUUID(),
        populationRef: "population-1",
        method: "random",
        sampleSize: -1
      })
    ).toThrow(/sampleSize/i);
  });

  it("createMalwareScanResult rejects a blank engine", () => {
    expect(() =>
      createMalwareScanResult({
        tenantId: randomUUID(),
        evidenceVersionId: randomUUID(),
        engine: "  ",
        signatureVersion: "2026.07.01",
        status: "clean"
      })
    ).toThrow(/engine/i);
  });

  it("createEvidenceExpiryEvent rejects a blank reason", () => {
    expect(() =>
      createEvidenceExpiryEvent({
        tenantId: randomUUID(),
        evidenceId: randomUUID(),
        previousState: "committed",
        newState: "rejected",
        reason: "  ",
        actorId: randomUUID()
      })
    ).toThrow(/reason/i);
  });

  it("createEvidenceCustodyEvent rejects a blank locationRef", () => {
    expect(() =>
      createEvidenceCustodyEvent({
        tenantId: randomUUID(),
        evidenceVersionId: randomUUID(),
        eventType: "created",
        actorId: randomUUID(),
        locationRef: "  ",
        eventHash: "a".repeat(64)
      })
    ).toThrow(/locationRef/i);
  });
});

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("SUPABASE_DB_URL is not set; G-07 integrity tests must run against a real database.");
}

let pool: pg.Pool;

beforeAll(() => {
  pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
});

afterAll(async () => {
  await pool.end();
});

async function seedEvidenceObject(): Promise<{ tenantId: string; evidenceId: string; ownerId: string; actorId: string }> {
  const tenantId = randomUUID();
  const ownerId = randomUUID();
  const actorId = randomUUID();
  const evidence = await pool.query(
    `insert into evidence_objects (tenant_id, owner_id, file_name, period_start, period_end, created_by, updated_by)
     values ($1, $2, 'g07-fixture.pdf', '2026-01-01', '2026-12-31', $3, $3) returning id`,
    [tenantId, ownerId, actorId]
  );
  return { tenantId, evidenceId: evidence.rows[0].id as string, ownerId, actorId };
}

async function seedEvidenceVersion(
  tenantId: string,
  evidenceId: string,
  actorId: string,
  versionNo = 1
): Promise<string> {
  const version = await pool.query(
    `insert into evidence_versions (
       tenant_id, evidence_id, evidence_version_no, object_uri, sha256, size_bytes, mime_type,
       observed_at, period_start, period_end, uploaded_by
     )
     values ($1, $2, $3, 's3://bucket/g07', $4, 1024, 'application/pdf', now(), '2026-01-01', '2026-12-31', $5)
     returning id`,
    [tenantId, evidenceId, versionNo, "b".repeat(64), actorId]
  );
  return version.rows[0].id as string;
}

async function seedAssessmentAndControlInstance(
  tenantId: string,
  actorId: string
): Promise<{ assessmentId: string; controlInstanceId: string }> {
  const assessment = await pool.query(
    `insert into assessments (tenant_id, scope_name, control_snapshot_version, period_start, period_end, created_by, updated_by)
     values ($1, $2, 'v1', '2026-01-01', '2026-12-31', $3, $3) returning id`,
    [tenantId, `g07-fixture-assessment-${randomUUID()}`, actorId]
  );
  const controlInstance = await pool.query(
    `insert into control_instances (tenant_id, assessment_id, control_id, framework_key, framework_version, mapping_version, owner_id, created_by, updated_by)
     values ($1, $2, 'CC1.1', 'SOC2', 'v1', 'm1', $3, $3, $3) returning id`,
    [tenantId, assessment.rows[0].id, actorId]
  );
  return { assessmentId: assessment.rows[0].id as string, controlInstanceId: controlInstance.rows[0].id as string };
}

async function seedHarmonizedControl(tenantId: string, actorId: string): Promise<string> {
  const control = await pool.query(
    `insert into harmonized_controls (
       tenant_id, harmonized_id, domain, control_name, control_description, source_workbook,
       source_sheet, source_row_number, created_by, updated_by
     )
     values ($1, $2, 'access-control', 'Access reviews', 'Periodic access reviews', 'wb.xlsx', 'sheet1', 1, $3, $3)
     returning id`,
    [tenantId, `HARM-G07-${randomUUID()}`, actorId]
  );
  return control.rows[0].id as string;
}

async function seedConnector(tenantId: string, actorId: string): Promise<string> {
  const connector = await pool.query(
    `insert into connectors (tenant_id, connector_key, provider, kind, secret_ref, created_by, updated_by)
     values ($1, $2, 'aws', 'iam', 'secret-ref', $3, $3) returning id`,
    [tenantId, `g07-connector-${randomUUID()}`, actorId]
  );
  return connector.rows[0].id as string;
}

async function seedAutomatedTest(tenantId: string, controlId: string, actorId: string): Promise<string> {
  const test = await pool.query(
    `insert into automated_tests (tenant_id, control_id, connector_type, query_template, schedule, severity, created_by, updated_by)
     values ($1, $2, 'aws-iam', 'select * from iam_users', '0 * * * *', 'high', $3, $3) returning id`,
    [tenantId, controlId, actorId]
  );
  return test.rows[0].id as string;
}

describe("G-07: evidence_versions constraints", () => {
  it("rejects a duplicate (evidence_id, evidence_version_no)", async () => {
    const { tenantId, evidenceId, actorId } = await seedEvidenceObject();
    await seedEvidenceVersion(tenantId, evidenceId, actorId, 1);
    await expect(seedEvidenceVersion(tenantId, evidenceId, actorId, 1)).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects a sha256 that is not exactly 64 characters", async () => {
    const { tenantId, evidenceId, actorId } = await seedEvidenceObject();
    await expect(
      pool.query(
        `insert into evidence_versions (
           tenant_id, evidence_id, evidence_version_no, object_uri, sha256, size_bytes, mime_type,
           observed_at, period_start, period_end, uploaded_by
         )
         values ($1, $2, 1, 's3://bucket/bad', 'too-short', 1024, 'application/pdf', now(), '2026-01-01', '2026-12-31', $3)`,
        [tenantId, evidenceId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });

  it("is append-only: rejects an update to an existing version row", async () => {
    const { tenantId, evidenceId, actorId } = await seedEvidenceObject();
    const versionId = await seedEvidenceVersion(tenantId, evidenceId, actorId, 1);
    await expect(
      pool.query(`update evidence_versions set mime_type = 'application/json' where id = $1`, [versionId])
    ).rejects.toThrow(/append-only/i);
  });
});

describe("G-07: evidence_links constraints", () => {
  it("rejects a duplicate (evidence_version_id, target_type, target_id, purpose)", async () => {
    const { tenantId, evidenceId, actorId } = await seedEvidenceObject();
    const versionId = await seedEvidenceVersion(tenantId, evidenceId, actorId);
    const targetId = randomUUID();
    await pool.query(
      `insert into evidence_links (tenant_id, evidence_version_id, target_type, target_id, purpose, created_by, updated_by)
       values ($1, $2, 'control_instance', $3, 'coverage', $4, $4)`,
      [tenantId, versionId, targetId, actorId]
    );
    await expect(
      pool.query(
        `insert into evidence_links (tenant_id, evidence_version_id, target_type, target_id, purpose, created_by, updated_by)
         values ($1, $2, 'control_instance', $3, 'coverage', $4, $4)`,
        [tenantId, versionId, targetId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects an invalid target_type", async () => {
    const { tenantId, evidenceId, actorId } = await seedEvidenceObject();
    const versionId = await seedEvidenceVersion(tenantId, evidenceId, actorId);
    await expect(
      pool.query(
        `insert into evidence_links (tenant_id, evidence_version_id, target_type, target_id, purpose, created_by, updated_by)
         values ($1, $2, 'not_a_real_target', $3, 'coverage', $4, $4)`,
        [tenantId, versionId, randomUUID(), actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});

describe("G-07: evidence_requests constraints", () => {
  it("rejects a duplicate (assessment_id, control_instance_id, requested_from)", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const { assessmentId, controlInstanceId } = await seedAssessmentAndControlInstance(tenantId, actorId);
    await pool.query(
      `insert into evidence_requests (tenant_id, assessment_id, control_instance_id, requested_from, due_at, created_by, updated_by)
       values ($1, $2, $3, 'vendor-portal', now() + interval '7 days', $4, $4)`,
      [tenantId, assessmentId, controlInstanceId, actorId]
    );
    await expect(
      pool.query(
        `insert into evidence_requests (tenant_id, assessment_id, control_instance_id, requested_from, due_at, created_by, updated_by)
         values ($1, $2, $3, 'vendor-portal', now() + interval '14 days', $4, $4)`,
        [tenantId, assessmentId, controlInstanceId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects an invalid status", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const { assessmentId, controlInstanceId } = await seedAssessmentAndControlInstance(tenantId, actorId);
    await expect(
      pool.query(
        `insert into evidence_requests (tenant_id, assessment_id, control_instance_id, requested_from, due_at, status, created_by, updated_by)
         values ($1, $2, $3, 'vendor-portal', now() + interval '7 days', 'not_a_real_status', $4, $4)`,
        [tenantId, assessmentId, controlInstanceId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});

describe("G-07: evidence_reviews constraints", () => {
  it("rejects an invalid decision", async () => {
    const { tenantId, evidenceId, actorId } = await seedEvidenceObject();
    const versionId = await seedEvidenceVersion(tenantId, evidenceId, actorId);
    await expect(
      pool.query(
        `insert into evidence_reviews (tenant_id, evidence_version_id, reviewer_id, decision, rationale, created_by, updated_by)
         values ($1, $2, $3, 'not_a_real_decision', 'looks fine', $3, $3)`,
        [tenantId, versionId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});

describe("G-07: automated_tests/automated_test_runs constraints", () => {
  it("rejects a duplicate (tenant_id, control_id, connector_type)", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const controlId = await seedHarmonizedControl(tenantId, actorId);
    await seedAutomatedTest(tenantId, controlId, actorId);
    await expect(
      pool.query(
        `insert into automated_tests (tenant_id, control_id, connector_type, query_template, schedule, severity, created_by, updated_by)
         values ($1, $2, 'aws-iam', 'select * from iam_users again', '0 * * * *', 'high', $3, $3)`,
        [tenantId, controlId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects a duplicate (tenant_id, idempotency_key) on automated_test_runs", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const controlId = await seedHarmonizedControl(tenantId, actorId);
    const testId = await seedAutomatedTest(tenantId, controlId, actorId);
    const connectorId = await seedConnector(tenantId, actorId);
    const idempotencyKey = `g07-run-${randomUUID()}`;
    await pool.query(
      `insert into automated_test_runs (tenant_id, automated_test_id, connector_id, idempotency_key, created_by, updated_by)
       values ($1, $2, $3, $4, $5, $5)`,
      [tenantId, testId, connectorId, idempotencyKey, actorId]
    );
    await expect(
      pool.query(
        `insert into automated_test_runs (tenant_id, automated_test_id, connector_id, idempotency_key, created_by, updated_by)
         values ($1, $2, $3, $4, $5, $5)`,
        [tenantId, testId, connectorId, idempotencyKey, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });
});

describe("G-07: evidence_samples/malware_scan_results constraints", () => {
  it("rejects a negative sample_size", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const controlId = await seedHarmonizedControl(tenantId, actorId);
    const testId = await seedAutomatedTest(tenantId, controlId, actorId);
    const connectorId = await seedConnector(tenantId, actorId);
    const run = await pool.query(
      `insert into automated_test_runs (tenant_id, automated_test_id, connector_id, idempotency_key, created_by, updated_by)
       values ($1, $2, $3, $4, $5, $5) returning id`,
      [tenantId, testId, connectorId, `g07-run-${randomUUID()}`, actorId]
    );
    await expect(
      pool.query(
        `insert into evidence_samples (tenant_id, test_result_id, population_ref, method, sample_size, created_by, updated_by)
         values ($1, $2, 'population-1', 'random', -5, $3, $3)`,
        [tenantId, run.rows[0].id, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });

  it("rejects a duplicate (evidence_version_id, engine)", async () => {
    const { tenantId, evidenceId, actorId } = await seedEvidenceObject();
    const versionId = await seedEvidenceVersion(tenantId, evidenceId, actorId);
    await pool.query(
      `insert into malware_scan_results (tenant_id, evidence_version_id, engine, signature_version, status, created_by, updated_by)
       values ($1, $2, 'clamav', '2026.07.01', 'clean', $3, $3)`,
      [tenantId, versionId, actorId]
    );
    await expect(
      pool.query(
        `insert into malware_scan_results (tenant_id, evidence_version_id, engine, signature_version, status, created_by, updated_by)
         values ($1, $2, 'clamav', '2026.07.02', 'infected', $3, $3)`,
        [tenantId, versionId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });
});

describe("G-07: evidence_expiry_events/evidence_custody_events append-only + checks", () => {
  it("evidence_expiry_events is append-only: rejects a delete of an existing event", async () => {
    const { tenantId, evidenceId, actorId } = await seedEvidenceObject();
    const event = await pool.query(
      `insert into evidence_expiry_events (tenant_id, evidence_id, previous_state, new_state, reason, actor_id)
       values ($1, $2, 'committed', 'rejected', 'Retention window elapsed.', $3) returning id`,
      [tenantId, evidenceId, actorId]
    );
    await expect(pool.query(`delete from evidence_expiry_events where id = $1`, [event.rows[0].id])).rejects.toThrow(
      /append-only/i
    );
  });

  it("evidence_custody_events is append-only and rejects an invalid event_type", async () => {
    const { tenantId, evidenceId, actorId } = await seedEvidenceObject();
    const versionId = await seedEvidenceVersion(tenantId, evidenceId, actorId);
    const event = await pool.query(
      `insert into evidence_custody_events (tenant_id, evidence_version_id, event_type, actor_id, location_ref, event_hash)
       values ($1, $2, 'created', $3, 'vault-1', $4) returning id`,
      [tenantId, versionId, actorId, "c".repeat(64)]
    );
    await expect(
      pool.query(`update evidence_custody_events set location_ref = 'vault-2' where id = $1`, [event.rows[0].id])
    ).rejects.toThrow(/append-only/i);

    await expect(
      pool.query(
        `insert into evidence_custody_events (tenant_id, evidence_version_id, event_type, actor_id, location_ref, event_hash)
         values ($1, $2, 'not_a_real_event_type', $3, 'vault-1', $4)`,
        [tenantId, versionId, actorId, "d".repeat(64)]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});
