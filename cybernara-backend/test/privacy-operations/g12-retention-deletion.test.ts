import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createDeletionItem,
  createDeletionJob,
  createLegalHold,
  createLegalHoldItem,
  createRetentionAssignment,
  releaseLegalHold
} from "../../src/modules/privacy-operations/domain/privacy.js";

// G-12 (retention and deletion, migration 0023_g12_retention_deletion.sql): pure domain-function
// unit tests plus real-Supabase integrity tests proving the new tables' own constraints actually
// reject bad data at the database layer. See the migration's own header comment for the full
// scoping/reconciliation record — these are exactly the 5 tables deferred out of G-08 because
// G-12's own gap sentence claims them directly, so no AskUserQuestion scope-fork was needed here.

describe("G-12 domain: retention/legal-hold/deletion pure functions", () => {
  it("createLegalHold rejects a blank holdKey", () => {
    expect(() =>
      createLegalHold({ tenantId: randomUUID(), holdKey: "  ", reason: "litigation", issuedBy: randomUUID() })
    ).toThrow(/holdKey/i);
  });

  it("createLegalHold rejects a blank reason", () => {
    expect(() =>
      createLegalHold({ tenantId: randomUUID(), holdKey: "hold-1", reason: "  ", issuedBy: randomUUID() })
    ).toThrow(/reason/i);
  });

  it("releaseLegalHold rejects releasing an already-released hold", () => {
    const hold = createLegalHold({ tenantId: randomUUID(), holdKey: "hold-1", reason: "litigation", issuedBy: randomUUID() });
    const released = releaseLegalHold(hold);
    expect(released.releasedAt).toBeInstanceOf(Date);
    expect(() => releaseLegalHold(released)).toThrow(/already been released/i);
  });

  it("createDeletionJob rejects a blank deletionTrigger", () => {
    expect(() =>
      createDeletionJob({ tenantId: randomUUID(), deletionTrigger: "  ", requestedBy: randomUUID() })
    ).toThrow(/deletionTrigger/i);
  });

  it("createDeletionJob starts in 'requested' status", () => {
    const job = createDeletionJob({ tenantId: randomUUID(), deletionTrigger: "subject_request", requestedBy: randomUUID() });
    expect(job.status).toBe("requested");
  });

  it("createDeletionItem defaults keyDestroyed to false", () => {
    const item = createDeletionItem({
      tenantId: randomUUID(),
      deletionJobId: randomUUID(),
      targetType: "evidence_object",
      targetId: randomUUID(),
      disposition: "deleted"
    });
    expect(item.keyDestroyed).toBe(false);
  });

  it("createRetentionAssignment defaults effectiveFrom to now", () => {
    const assignment = createRetentionAssignment({
      tenantId: randomUUID(),
      retentionRuleId: randomUUID(),
      targetType: "data_inventory_record",
      targetId: randomUUID()
    });
    expect(assignment.effectiveFrom).toBeInstanceOf(Date);
  });

  it("createLegalHoldItem builds an item with the given target", () => {
    const item = createLegalHoldItem({
      tenantId: randomUUID(),
      legalHoldId: randomUUID(),
      targetType: "rights_request",
      targetId: randomUUID()
    });
    expect(item.targetType).toBe("rights_request");
  });
});

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("SUPABASE_DB_URL is not set; G-12 integrity tests must run against a real database.");
}

let pool: pg.Pool;

beforeAll(() => {
  pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
});

afterAll(async () => {
  await pool.end();
});

async function seedRetentionRule(tenantId: string, actorId: string): Promise<string> {
  const category = await pool.query(
    `insert into data_categories (tenant_id, category_key, name, sensitivity, created_by, updated_by)
     values ($1, $2, 'PII', 'high', $3, $3) returning id`,
    [tenantId, `g12-category-${randomUUID()}`, actorId]
  );
  const rule = await pool.query(
    `insert into retention_rules (tenant_id, data_category_id, jurisdiction, retention_trigger, duration_days, disposition, created_by, updated_by)
     values ($1, $2, 'EU', 'contract_end', 365, 'delete', $3, $3) returning id`,
    [tenantId, category.rows[0].id, actorId]
  );
  return rule.rows[0].id as string;
}

async function seedLegalHold(tenantId: string, actorId: string): Promise<string> {
  const hold = await pool.query(
    `insert into legal_holds (tenant_id, hold_key, reason, issued_by, created_by, updated_by)
     values ($1, $2, 'litigation', $3, $3, $3) returning id`,
    [tenantId, `g12-hold-${randomUUID()}`, actorId]
  );
  return hold.rows[0].id as string;
}

async function seedDeletionJob(tenantId: string, actorId: string): Promise<string> {
  const job = await pool.query(
    `insert into deletion_jobs (tenant_id, deletion_trigger, requested_by, created_by, updated_by)
     values ($1, 'subject_request', $2, $2, $2) returning id`,
    [tenantId, actorId]
  );
  return job.rows[0].id as string;
}

describe("G-12: retention_assignments constraints", () => {
  it("rejects a second active assignment for the same (target_type, target_id)", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const ruleId = await seedRetentionRule(tenantId, actorId);
    const targetId = randomUUID();
    await pool.query(
      `insert into retention_assignments (tenant_id, retention_rule_id, target_type, target_id, created_by, updated_by)
       values ($1, $2, 'evidence_object', $3, $4, $4)`,
      [tenantId, ruleId, targetId, actorId]
    );
    await expect(
      pool.query(
        `insert into retention_assignments (tenant_id, retention_rule_id, target_type, target_id, created_by, updated_by)
         values ($1, $2, 'evidence_object', $3, $4, $4)`,
        [tenantId, ruleId, targetId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects an invalid target_type", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const ruleId = await seedRetentionRule(tenantId, actorId);
    await expect(
      pool.query(
        `insert into retention_assignments (tenant_id, retention_rule_id, target_type, target_id, created_by, updated_by)
         values ($1, $2, 'not_a_real_target', $3, $4, $4)`,
        [tenantId, ruleId, randomUUID(), actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });

  it("allows a new active assignment once the prior one is closed out (effective_to set)", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const ruleId = await seedRetentionRule(tenantId, actorId);
    const targetId = randomUUID();
    const first = await pool.query(
      `insert into retention_assignments (tenant_id, retention_rule_id, target_type, target_id, created_by, updated_by)
       values ($1, $2, 'evidence_object', $3, $4, $4) returning id`,
      [tenantId, ruleId, targetId, actorId]
    );
    await pool.query(`update retention_assignments set effective_to = now() where id = $1`, [first.rows[0].id]);
    const second = await pool.query(
      `insert into retention_assignments (tenant_id, retention_rule_id, target_type, target_id, created_by, updated_by)
       values ($1, $2, 'evidence_object', $3, $4, $4) returning id`,
      [tenantId, ruleId, targetId, actorId]
    );
    expect(second.rows[0].id).toBeTruthy();
  });
});

describe("G-12: legal_holds/legal_hold_items constraints", () => {
  it("rejects a duplicate (tenant_id, hold_key)", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const holdKey = `g12-dup-hold-${randomUUID()}`;
    await pool.query(
      `insert into legal_holds (tenant_id, hold_key, reason, issued_by, created_by, updated_by) values ($1, $2, 'litigation', $3, $3, $3)`,
      [tenantId, holdKey, actorId]
    );
    await expect(
      pool.query(
        `insert into legal_holds (tenant_id, hold_key, reason, issued_by, created_by, updated_by) values ($1, $2, 'litigation-2', $3, $3, $3)`,
        [tenantId, holdKey, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects a duplicate (legal_hold_id, target_type, target_id)", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const holdId = await seedLegalHold(tenantId, actorId);
    const targetId = randomUUID();
    await pool.query(
      `insert into legal_hold_items (tenant_id, legal_hold_id, target_type, target_id, created_by, updated_by)
       values ($1, $2, 'evidence_object', $3, $4, $4)`,
      [tenantId, holdId, targetId, actorId]
    );
    await expect(
      pool.query(
        `insert into legal_hold_items (tenant_id, legal_hold_id, target_type, target_id, created_by, updated_by)
         values ($1, $2, 'evidence_object', $3, $4, $4)`,
        [tenantId, holdId, targetId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });
});

describe("G-12: deletion_jobs/deletion_items constraints", () => {
  it("rejects an invalid deletion_jobs status", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    await expect(
      pool.query(
        `insert into deletion_jobs (tenant_id, deletion_trigger, requested_by, status, created_by, updated_by)
         values ($1, 'subject_request', $2, 'not_a_real_status', $2, $2)`,
        [tenantId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });

  it("rejects a duplicate (deletion_job_id, target_type, target_id) on deletion_items", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const jobId = await seedDeletionJob(tenantId, actorId);
    const targetId = randomUUID();
    await pool.query(
      `insert into deletion_items (tenant_id, deletion_job_id, target_type, target_id, disposition, created_by, updated_by)
       values ($1, $2, 'evidence_object', $3, 'deleted', $4, $4)`,
      [tenantId, jobId, targetId, actorId]
    );
    await expect(
      pool.query(
        `insert into deletion_items (tenant_id, deletion_job_id, target_type, target_id, disposition, created_by, updated_by)
         values ($1, $2, 'evidence_object', $3, 'anonymized', $4, $4)`,
        [tenantId, jobId, targetId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects an invalid deletion_items disposition", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const jobId = await seedDeletionJob(tenantId, actorId);
    await expect(
      pool.query(
        `insert into deletion_items (tenant_id, deletion_job_id, target_type, target_id, disposition, created_by, updated_by)
         values ($1, $2, 'evidence_object', $3, 'not_a_real_disposition', $4, $4)`,
        [tenantId, jobId, randomUUID(), actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});
