import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createRisk,
  createRiskLink,
  createRiskModel,
  createRiskTreatment
} from "../../src/modules/risk-workflow/domain/risk.js";

// G-09 Phase 1 (enterprise risk register, migration
// 0019_g09_enterprise_grc_risk_register.sql): pure domain-function unit
// tests plus real-Supabase integrity tests proving the new tables' own
// constraints actually reject bad data at the database layer.

describe("G-09 domain: risk register pure functions", () => {
  it("createRiskModel rejects a blank model key", () => {
    expect(() =>
      createRiskModel({
        tenantId: randomUUID(),
        modelKey: "   ",
        modelVersion: "v1",
        scalesJson: {},
        formula: "sum",
        thresholds: {}
      })
    ).toThrow(/model key/i);
  });

  it("createRisk starts in identified status", () => {
    const risk = createRisk({
      tenantId: randomUUID(),
      riskKey: "RISK-1",
      title: "Third-party data exposure",
      category: "vendor",
      inherentScore: 80,
      residualScore: 40,
      ownerId: randomUUID()
    });
    expect(risk.status).toBe("identified");
  });

  it("createRisk rejects a blank risk key", () => {
    expect(() =>
      createRisk({
        tenantId: randomUUID(),
        riskKey: "  ",
        title: "x",
        category: "vendor",
        inherentScore: 10,
        residualScore: 5,
        ownerId: randomUUID()
      })
    ).toThrow(/risk key/i);
  });

  it("createRisk rejects a score outside 0-100", () => {
    expect(() =>
      createRisk({
        tenantId: randomUUID(),
        riskKey: "RISK-2",
        title: "x",
        category: "vendor",
        inherentScore: 150,
        residualScore: 5,
        ownerId: randomUUID()
      })
    ).toThrow(/score must be between 0 and 100/i);
  });

  it("createRiskLink builds a link with the given target and relationship", () => {
    const link = createRiskLink({
      tenantId: randomUUID(),
      riskId: randomUUID(),
      targetType: "finding",
      targetId: randomUUID(),
      relationship: "caused_by"
    });
    expect(link.targetType).toBe("finding");
    expect(link.relationship).toBe("caused_by");
  });

  it("createRiskTreatment starts planned and rejects a blank plan", () => {
    expect(() =>
      createRiskTreatment({
        tenantId: randomUUID(),
        riskId: randomUUID(),
        strategy: "mitigate",
        plan: "   ",
        ownerId: randomUUID(),
        dueAt: new Date("2027-01-01")
      })
    ).toThrow(/plan/i);

    const treatment = createRiskTreatment({
      tenantId: randomUUID(),
      riskId: randomUUID(),
      strategy: "mitigate",
      plan: "Rotate credentials and add MFA.",
      ownerId: randomUUID(),
      dueAt: new Date("2027-01-01")
    });
    expect(treatment.status).toBe("planned");
  });
});

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("SUPABASE_DB_URL is not set; G-09 integrity tests must run against a real database.");
}

let pool: pg.Pool;

beforeAll(() => {
  pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
});

afterAll(async () => {
  await pool.end();
});

async function seedRisk(): Promise<{ tenantId: string; riskId: string; actorId: string }> {
  const tenantId = randomUUID();
  const actorId = randomUUID();
  const risk = await pool.query(
    `insert into risks (tenant_id, risk_key, title, category, inherent_score, residual_score, owner_id, created_by, updated_by)
     values ($1, 'RISK-1', 'Seed risk', 'vendor', 70, 30, $2, $2, $2) returning id`,
    [tenantId, actorId]
  );
  return { tenantId, riskId: risk.rows[0].id as string, actorId };
}

describe("G-09: risk_models constraints", () => {
  it("rejects a duplicate (tenant_id, model_key, model_version)", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    await pool.query(
      `insert into risk_models (tenant_id, model_key, model_version, formula, created_by, updated_by)
       values ($1, 'standard', 'v1', 'sum(a,b)', $2, $2)`,
      [tenantId, actorId]
    );
    await expect(
      pool.query(
        `insert into risk_models (tenant_id, model_key, model_version, formula, created_by, updated_by)
         values ($1, 'standard', 'v1', 'sum(a,b) again', $2, $2)`,
        [tenantId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });
});

describe("G-09: risks constraints", () => {
  it("rejects a duplicate (tenant_id, risk_key)", async () => {
    const { tenantId, actorId } = await seedRisk();
    await expect(
      pool.query(
        `insert into risks (tenant_id, risk_key, title, category, inherent_score, residual_score, owner_id, created_by, updated_by)
         values ($1, 'RISK-1', 'Duplicate', 'vendor', 50, 20, $2, $2, $2)`,
        [tenantId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects an inherent_score outside 0-100", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    await expect(
      pool.query(
        `insert into risks (tenant_id, risk_key, title, category, inherent_score, residual_score, owner_id, created_by, updated_by)
         values ($1, 'RISK-BAD', 'x', 'vendor', 150, 20, $2, $2, $2)`,
        [tenantId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });

  it("accepts a risk scoped to a real grc_workspaces row", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const workspace = await pool.query(
      `insert into grc_workspaces (tenant_id, business_unit, inherited_control_ids, delegated_admin_ids, created_by, updated_by)
       values ($1, 'Finance', array['CTRL-1'], array[$2::uuid], $2, $2) returning id`,
      [tenantId, actorId]
    );
    const risk = await pool.query(
      `insert into risks (tenant_id, workspace_id, risk_key, title, category, inherent_score, residual_score, owner_id, created_by, updated_by)
       values ($1, $2, 'RISK-WS', 'x', 'vendor', 60, 30, $3, $3, $3) returning id`,
      [tenantId, workspace.rows[0].id, actorId]
    );
    expect(risk.rows[0].id).toBeTruthy();
  });
});

describe("G-09: risk_links constraints", () => {
  it("rejects a duplicate (risk_id, target_type, target_id, relationship)", async () => {
    const { tenantId, riskId, actorId } = await seedRisk();
    const targetId = randomUUID();
    await pool.query(
      `insert into risk_links (tenant_id, risk_id, target_type, target_id, relationship, created_by, updated_by)
       values ($1, $2, 'finding', $3, 'caused_by', $4, $4)`,
      [tenantId, riskId, targetId, actorId]
    );
    await expect(
      pool.query(
        `insert into risk_links (tenant_id, risk_id, target_type, target_id, relationship, created_by, updated_by)
         values ($1, $2, 'finding', $3, 'caused_by', $4, $4)`,
        [tenantId, riskId, targetId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects an invalid target_type", async () => {
    const { tenantId, riskId, actorId } = await seedRisk();
    await expect(
      pool.query(
        `insert into risk_links (tenant_id, risk_id, target_type, target_id, relationship, created_by, updated_by)
         values ($1, $2, 'not_a_real_type', $3, 'caused_by', $4, $4)`,
        [tenantId, riskId, randomUUID(), actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });

  it("rejects a risk_id that does not exist in risks", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    await expect(
      pool.query(
        `insert into risk_links (tenant_id, risk_id, target_type, target_id, relationship, created_by, updated_by)
         values ($1, $2, 'finding', $3, 'caused_by', $4, $4)`,
        [tenantId, randomUUID(), randomUUID(), actorId]
      )
    ).rejects.toThrow(/foreign key|violates/i);
  });
});

describe("G-09: risk_treatments constraints", () => {
  it("rejects an invalid strategy", async () => {
    const { tenantId, riskId, actorId } = await seedRisk();
    await expect(
      pool.query(
        `insert into risk_treatments (tenant_id, risk_id, strategy, plan, owner_id, due_at, created_by, updated_by)
         values ($1, $2, 'ignore', 'plan text', $3, '2027-01-01', $3, $3)`,
        [tenantId, riskId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });

  it("accepts a valid treatment linked to a real risk", async () => {
    const { tenantId, riskId, actorId } = await seedRisk();
    const treatment = await pool.query(
      `insert into risk_treatments (tenant_id, risk_id, strategy, plan, owner_id, due_at, created_by, updated_by)
       values ($1, $2, 'mitigate', 'plan text', $3, '2027-01-01', $3, $3) returning id`,
      [tenantId, riskId, actorId]
    );
    expect(treatment.rows[0].id).toBeTruthy();
  });
});

describe("G-09: risk_acceptances.risk_id linkage (completing G-03's deferred FK)", () => {
  it("accepts a risk_acceptance linked to a real risk, and rejects a non-existent risk_id", async () => {
    const { tenantId, riskId, actorId } = await seedRisk();
    const assessment = await pool.query(
      `insert into assessments (tenant_id, scope_name, control_snapshot_version, period_start, period_end, created_by, updated_by)
       values ($1, $2, 'v1', '2026-01-01', '2026-12-31', $3, $3) returning id`,
      [tenantId, `g09-risk-acceptance-${randomUUID()}`, actorId]
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
       values ($1, $2, 1, '{}'::jsonb, 'g09-risk-register-checksum', $3, $3) returning id`,
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
    const finding = await pool.query(
      `insert into findings (tenant_id, assessment_item_id, severity, description, created_by, updated_by)
       values ($1, $2, 'high', 'seed finding', $3, $3) returning id`,
      [tenantId, item.rows[0].id, actorId]
    );
    const client = await pool.connect();
    let task;
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL app.allow_legacy_write = '1'`);
      task = await client.query(
        `insert into remediation_tasks (tenant_id, finding_id, owner_id, due_at, created_by, updated_by)
         values ($1, $2, $3, '2027-01-01', $3, $3) returning id`,
        [tenantId, finding.rows[0].id, actorId]
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const acceptance = await pool.query(
      `insert into risk_acceptances (
         tenant_id, remediation_task_id, finding_id, risk_id, rationale, approver_id,
         expires_at, next_review_due_at, created_by, updated_by
       )
       values ($1, $2, $3, $4, 'accepted for now', $5, '2027-06-01', '2027-03-01', $5, $5)
       returning risk_id`,
      [tenantId, task.rows[0].id, finding.rows[0].id, riskId, actorId]
    );
    expect(acceptance.rows[0].risk_id).toBe(riskId);

    await expect(
      pool.query(
        `insert into risk_acceptances (
           tenant_id, remediation_task_id, finding_id, risk_id, rationale, approver_id,
           expires_at, next_review_due_at, created_by, updated_by
         )
         values ($1, $2, $3, $4, 'bad risk id', $5, '2027-06-01', '2027-03-01', $5, $5)`,
        [tenantId, task.rows[0].id, finding.rows[0].id, randomUUID(), actorId]
      )
    ).rejects.toThrow(/foreign key|violates/i);
  });
});
