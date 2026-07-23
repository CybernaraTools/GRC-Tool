import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Real-Supabase integrity tests for the schema-remediation gaps that add or
// change constraints at the database layer (not just application-level
// validation). These prove the constraints actually reject bad data when
// applied against the live database — not superficial "table exists" checks.

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("SUPABASE_DB_URL is not set; schema integrity tests must run against a real database.");
}

let pool: pg.Pool;

beforeAll(() => {
  pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
});

afterAll(async () => {
  await pool.end();
});

async function seedAssessmentItem(): Promise<{
  tenantId: string;
  itemId: string;
  actorId: string;
  controlInstanceId: string;
}> {
  const tenantId = randomUUID();
  const actorId = randomUUID();
  const assessment = await pool.query(
    `insert into assessments (tenant_id, scope_name, control_snapshot_version, period_start, period_end, created_by, updated_by)
     values ($1, $2, 'v1', '2026-01-01', '2026-12-31', $3, $3) returning id`,
    [tenantId, `integrity-assessment-${randomUUID()}`, actorId]
  );
  // G-01 Constrain (0026): assessment_items.control_instance_id/question_version_id are now
  // NOT NULL — seed a real control_instances row and a real question_sets/question_versions row
  // first, matching what the live dual-write path does.
  const controlInstance = await pool.query(
    `insert into control_instances (tenant_id, assessment_id, control_id, framework_key, framework_version, mapping_version, owner_id, created_by, updated_by)
     values ($1, $2, 'HARM-1', 'SOC2', 'v1', 'm1', $3, $3, $3) returning id`,
    [tenantId, assessment.rows[0].id, actorId]
  );
  const questionSet = await pool.query(
    `insert into question_sets (tenant_id, control_id, question_set_key, created_by, updated_by)
     values ($1, 'HARM-1', 'q1', $2, $2) returning id`,
    [tenantId, actorId]
  );
  const questionVersion = await pool.query(
    `insert into question_versions (tenant_id, question_set_id, question_version, payload_json, checksum, created_by, updated_by)
     values ($1, $2, 1, '{}'::jsonb, 'a3-schema-integrity-checksum', $3, $3) returning id`,
    [tenantId, questionSet.rows[0].id, actorId]
  );
  const item = await pool.query(
    `insert into assessment_items (
       tenant_id, assessment_id, framework_key, framework_version, mapping_version,
       control_id, harmonized_control_id, question_version, owner_id, control_instance_id,
       question_version_id, created_by, updated_by
     )
     values ($1, $2, 'SOC2', 'v1', 'm1', 'CC1.1', 'HARM-1', 'q1', $3, $4, $5, $3, $3)
     returning id`,
    [tenantId, assessment.rows[0].id, actorId, controlInstance.rows[0].id, questionVersion.rows[0].id]
  );
  return {
    tenantId,
    itemId: item.rows[0].id as string,
    actorId,
    controlInstanceId: controlInstance.rows[0].id as string
  };
}

async function insertLegacyRemediationTaskForTest(input: {
  tenantId: string;
  findingId: string;
  actorId: string;
}): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local app.allow_legacy_write = '1'");
    const task = await client.query<{ id: string }>(
      `insert into remediation_tasks (tenant_id, finding_id, owner_id, due_at, created_by, updated_by)
       values ($1, $2, $3, now() + interval '30 days', $3, $3)
       returning id`,
      [input.tenantId, input.findingId, input.actorId]
    );
    await client.query("commit");
    return task.rows[0].id;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function seedControlTestResult(tenantId: string, controlInstanceId: string, actorId: string): Promise<string> {
  const procedure = await pool.query(
    `insert into test_procedures (tenant_id, control_id, procedure_key, method, expected_result, created_by, updated_by)
     values ($1, 'HARM-1', $2, 'Inspect the access review log.', 'Every grant has a documented approver.', $3, $3)
     returning id`,
    [tenantId, `tp-${randomUUID()}`, actorId]
  );
  const result = await pool.query(
    `insert into control_test_results (tenant_id, control_instance_id, test_procedure_id, result, tested_by, created_by, updated_by)
     values ($1, $2, $3, 'pass', $4, $4, $4)
     returning id`,
    [tenantId, controlInstanceId, procedure.rows[0].id, actorId]
  );
  return result.rows[0].id as string;
}

describe("G-02: findings.assessment_item_id foreign key", () => {
  it("rejects a finding that references a non-existent assessment item", async () => {
    const tenantId = randomUUID();
    await expect(
      pool.query(
        `insert into findings (tenant_id, assessment_item_id, severity, description, created_by, updated_by)
         values ($1, $2, 'high', 'Orphan finding attempt', $3, $3)`,
        [tenantId, randomUUID(), randomUUID()]
      )
    ).rejects.toThrow(/foreign key/i);
  });

  it("accepts a finding that references a real assessment item", async () => {
    const { tenantId, itemId, actorId } = await seedAssessmentItem();
    const result = await pool.query(
      `insert into findings (tenant_id, assessment_item_id, severity, description, created_by, updated_by)
       values ($1, $2, 'high', 'Valid finding', $3, $3)
       returning id`,
      [tenantId, itemId, actorId]
    );
    expect(result.rows[0].id).toBeTruthy();
  });
});

// G-03 remaining shape gap (spec §11/§12): findings_has_source CHECK constraint proves the
// database itself enforces "at least one source", not just the domain layer. control_test_results
// (the alternative source) only exists as of this session's G-01 work.
describe("G-03: findings_has_source constraint", () => {
  it("rejects a finding with neither assessment_item_id nor test_result_id", async () => {
    const tenantId = randomUUID();
    await expect(
      pool.query(
        `insert into findings (tenant_id, severity, description, created_by, updated_by)
         values ($1, 'high', 'Sourceless finding attempt', $2, $2)`,
        [tenantId, randomUUID()]
      )
    ).rejects.toThrow(/findings_has_source/);
  });

  it("accepts a finding sourced only from a control test result", async () => {
    const { tenantId, controlInstanceId, actorId } = await seedAssessmentItem();
    const testResultId = await seedControlTestResult(tenantId, controlInstanceId, actorId);
    const result = await pool.query(
      `insert into findings (tenant_id, test_result_id, severity, description, created_by, updated_by)
       values ($1, $2, 'high', 'Automated test surfaced a control gap', $3, $3)
       returning id, assessment_item_id, test_result_id`,
      [tenantId, testResultId, actorId]
    );
    expect(result.rows[0].id).toBeTruthy();
    expect(result.rows[0].assessment_item_id).toBeNull();
    expect(result.rows[0].test_result_id).toBe(testResultId);
  });

  it("rejects a finding whose test_result_id references a non-existent control test result", async () => {
    const tenantId = randomUUID();
    await expect(
      pool.query(
        `insert into findings (tenant_id, test_result_id, severity, description, created_by, updated_by)
         values ($1, $2, 'high', 'Orphan test-result finding attempt', $3, $3)`,
        [tenantId, randomUUID(), randomUUID()]
      )
    ).rejects.toThrow(/foreign key/i);
  });
});

describe("G-05: catalog owner-scope groundwork", () => {
  it("adds a not-null owner_scope column defaulting to 'tenant' on all three catalog tables", async () => {
    const result = await pool.query(
      `select table_name, column_default, is_nullable
       from information_schema.columns
       where table_schema = 'public' and column_name = 'owner_scope'
         and table_name in ('framework_content_packs', 'harmonized_controls', 'control_mappings')
       order by table_name`
    );
    expect(result.rows).toHaveLength(3);
    for (const row of result.rows) {
      expect(row.is_nullable).toBe("NO");
      expect(row.column_default).toMatch(/'tenant'/);
    }
  });

  it("defines the catalog_owner_scope enum with exactly 'global' and 'tenant'", async () => {
    const result = await pool.query(
      `select e.enumlabel
       from pg_type t
       join pg_enum e on e.enumtypid = t.oid
       where t.typname = 'catalog_owner_scope'
       order by e.enumsortorder`
    );
    expect(result.rows.map((row) => row.enumlabel)).toEqual(["global", "tenant"]);
  });
});

describe("G-03: risk_acceptances database constraints", () => {
  async function seedRiskAcceptanceFixture() {
    const { tenantId, itemId, actorId } = await seedAssessmentItem();
    const finding = await pool.query(
      `insert into findings (tenant_id, assessment_item_id, severity, description, created_by, updated_by)
       values ($1, $2, 'high', 'Integrity fixture finding', $3, $3)
       returning id`,
      [tenantId, itemId, actorId]
    );
    const taskId = await insertLegacyRemediationTaskForTest({
      tenantId,
      findingId: finding.rows[0].id as string,
      actorId
    });
    return { tenantId, findingId: finding.rows[0].id as string, taskId, actorId };
  }

  it("rejects an acceptance whose expiry is not after the approval time", async () => {
    const { tenantId, findingId, taskId, actorId } = await seedRiskAcceptanceFixture();
    await expect(
      pool.query(
        `insert into risk_acceptances (
           tenant_id, remediation_task_id, finding_id, rationale, approver_id,
           approved_at, expires_at, next_review_due_at, created_by, updated_by
         )
         values ($1, $2, $3, 'Bad expiry', $4, now(), now() - interval '1 day', now() + interval '30 days', $4, $4)`,
        [tenantId, taskId, findingId, actorId]
      )
    ).rejects.toThrow(/check/i);
  });

  it("rejects an acceptance whose next review date is not after the approval time", async () => {
    const { tenantId, findingId, taskId, actorId } = await seedRiskAcceptanceFixture();
    await expect(
      pool.query(
        `insert into risk_acceptances (
           tenant_id, remediation_task_id, finding_id, rationale, approver_id,
           approved_at, expires_at, next_review_due_at, created_by, updated_by
         )
         values ($1, $2, $3, 'Bad review date', $4, now(), now() + interval '30 days', now() - interval '1 day', $4, $4)`,
        [tenantId, taskId, findingId, actorId]
      )
    ).rejects.toThrow(/check/i);
  });

  it("rejects an acceptance with a blank rationale", async () => {
    const { tenantId, findingId, taskId, actorId } = await seedRiskAcceptanceFixture();
    await expect(
      pool.query(
        `insert into risk_acceptances (
           tenant_id, remediation_task_id, finding_id, rationale, approver_id,
           expires_at, next_review_due_at, created_by, updated_by
         )
         values ($1, $2, $3, '   ', $4, now() + interval '30 days', now() + interval '10 days', $4, $4)`,
        [tenantId, taskId, findingId, actorId]
      )
    ).rejects.toThrow(/check/i);
  });

  it("rejects an acceptance referencing a remediation task from a different tenant's data (FK does not imply tenant match, so the app layer must still scope by tenant_id)", async () => {
    // This documents a real, currently-open limitation: the FK on
    // remediation_task_id only guarantees the task exists somewhere, not
    // that it belongs to the same tenant_id on the risk_acceptances row.
    // Today's application code always derives remediation_task_id from a
    // tenant-scoped lookup first (see RiskWorkflowService.acceptRisk), so
    // this can't happen through the API — but it is not enforced by the
    // schema itself, and is tracked as a known gap in the remediation
    // report rather than silently assumed safe.
    const fixtureA = await seedRiskAcceptanceFixture();
    const fixtureB = await seedRiskAcceptanceFixture();
    const result = await pool.query(
      `insert into risk_acceptances (
         tenant_id, remediation_task_id, finding_id, rationale, approver_id,
         expires_at, next_review_due_at, created_by, updated_by
       )
       values ($1, $2, $3, 'Cross-tenant reference accepted by FK alone', $4, now() + interval '30 days', now() + interval '10 days', $4, $4)
       returning id`,
      [fixtureA.tenantId, fixtureB.taskId, fixtureA.findingId, fixtureA.actorId]
    );
    expect(result.rows[0].id).toBeTruthy();
  });
});

describe("G-03: risk_acceptance_reviews append-only enforcement", () => {
  async function seedReview(): Promise<{ tenantId: string; reviewId: string }> {
    const { tenantId, itemId, actorId } = await seedAssessmentItem();
    const finding = await pool.query(
      `insert into findings (tenant_id, assessment_item_id, severity, description, created_by, updated_by)
       values ($1, $2, 'high', 'Review fixture finding', $3, $3)
       returning id`,
      [tenantId, itemId, actorId]
    );
    const taskId = await insertLegacyRemediationTaskForTest({
      tenantId,
      findingId: finding.rows[0].id as string,
      actorId
    });
    const acceptance = await pool.query(
      `insert into risk_acceptances (
         tenant_id, remediation_task_id, finding_id, rationale, approver_id,
         expires_at, next_review_due_at, created_by, updated_by
       )
       values ($1, $2, $3, 'Fixture acceptance', $4, now() + interval '30 days', now() + interval '10 days', $4, $4)
       returning id`,
      [tenantId, taskId, finding.rows[0].id, actorId]
    );
    const review = await pool.query(
      `insert into risk_acceptance_reviews (tenant_id, risk_acceptance_id, reviewer_id, decision, reason)
       values ($1, $2, $3, 'reaffirmed', 'Initial review')
       returning id`,
      [tenantId, acceptance.rows[0].id, actorId]
    );
    return { tenantId, reviewId: review.rows[0].id as string };
  }

  it("rejects an update to an existing review row", async () => {
    const { reviewId } = await seedReview();
    await expect(
      pool.query(`update risk_acceptance_reviews set reason = 'changed my mind' where id = $1`, [reviewId])
    ).rejects.toThrow(/append-only/i);
  });

  it("rejects a delete of an existing review row", async () => {
    const { reviewId } = await seedReview();
    await expect(pool.query(`delete from risk_acceptance_reviews where id = $1`, [reviewId])).rejects.toThrow(
      /append-only/i
    );
  });
});

// G-05 target-state catalog structure (spec §9), Expand stage: proves the new tables' own
// constraints reject bad data at the database layer, not just that the tables exist.
describe("G-05: target-state catalog constraints", () => {
  it("rejects a duplicate (tenant_id, framework_key) on frameworks", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const frameworkKey = `g05-framework-${randomUUID()}`;
    await pool.query(
      `insert into frameworks (tenant_id, framework_key, name, created_by, updated_by)
       values ($1, $2, 'G-05 framework', $3, $3)`,
      [tenantId, frameworkKey, actorId]
    );
    await expect(
      pool.query(
        `insert into frameworks (tenant_id, framework_key, name, created_by, updated_by)
         values ($1, $2, 'Duplicate attempt', $3, $3)`,
        [tenantId, frameworkKey, actorId]
      )
    ).rejects.toThrow(/duplicate key/i);
  });

  it("rejects a control_subcontrols row referencing a non-existent control", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    await expect(
      pool.query(
        `insert into control_subcontrols (tenant_id, control_id, subcontrol_key, title, created_by, updated_by)
         values ($1, $2, 'orphan-subcontrol', 'Orphan attempt', $3, $3)`,
        [tenantId, randomUUID(), actorId]
      )
    ).rejects.toThrow(/foreign key/i);
  });

  it("mapping_conflicts: rejects a 'resolved' status without resolved_by/resolved_at, accepts one with both", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const mapping = await pool.query(`select id from control_mappings limit 1`);
    const controlMappingId = mapping.rows[0].id;

    await expect(
      pool.query(
        `insert into mapping_conflicts (tenant_id, control_mapping_id, description, resolution_status, created_by, updated_by)
         values ($1, $2, 'Missing resolver attempt', 'resolved', $3, $3)`,
        [tenantId, controlMappingId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);

    const resolved = await pool.query(
      `insert into mapping_conflicts (
         tenant_id, control_mapping_id, description, resolution_status, resolved_by, resolved_at,
         created_by, updated_by
       )
       values ($1, $2, 'Resolved conflict', 'resolved', $3, now(), $3, $3)
       returning id`,
      [tenantId, controlMappingId, actorId]
    );
    expect(resolved.rows[0].id).toBeTruthy();
  });

  it("tenant_catalog_subscriptions: rejects a subscription with neither framework_id nor source_package_id", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    await expect(
      pool.query(
        `insert into tenant_catalog_subscriptions (tenant_id, created_by, updated_by)
         values ($1, $2, $2)`,
        [tenantId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });

  it("controls: rejects a duplicate (tenant_id, control_set_id, control_key)", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const framework = await pool.query(
      `insert into frameworks (tenant_id, framework_key, name, created_by, updated_by)
       values ($1, $2, 'G-05 framework', $3, $3) returning id`,
      [tenantId, `g05-framework-${randomUUID()}`, actorId]
    );
    const version = await pool.query(
      `insert into framework_versions (tenant_id, framework_id, version_key, created_by, updated_by)
       values ($1, $2, $3, $4, $4) returning id`,
      [tenantId, framework.rows[0].id, `g05-version-${randomUUID()}`, actorId]
    );
    const set = await pool.query(
      `insert into control_sets (tenant_id, framework_version_id, set_key, name, created_by, updated_by)
       values ($1, $2, $3, 'G-05 control set', $4, $4) returning id`,
      [tenantId, version.rows[0].id, `g05-set-${randomUUID()}`, actorId]
    );
    const controlKey = `g05-control-${randomUUID()}`;
    await pool.query(
      `insert into controls (tenant_id, control_set_id, control_key, title, created_by, updated_by)
       values ($1, $2, $3, 'G-05 control', $4, $4)`,
      [tenantId, set.rows[0].id, controlKey, actorId]
    );
    await expect(
      pool.query(
        `insert into controls (tenant_id, control_set_id, control_key, title, created_by, updated_by)
         values ($1, $2, $3, 'Duplicate attempt', $4, $4)`,
        [tenantId, set.rows[0].id, controlKey, actorId]
      )
    ).rejects.toThrow(/duplicate key/i);
  });
});
