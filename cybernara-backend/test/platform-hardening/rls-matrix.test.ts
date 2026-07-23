import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// G-10 remediation proof: migration 0008_g10_rls_foundation.sql introduces a
// non-owner `app_runtime` role plus additive, transaction-context-scoped RLS
// policies on every tenant table. This suite is the actual evidence that the
// mechanism works — it connects AS app_runtime (never as the table-owning
// `postgres` role) against the real, live Supabase database and proves, per
// table, that Postgres itself (not application code) enforces tenant
// isolation once app.tenant_id is set via set_config the way
// TenantScopedDb (src/platform/database/tenant-scoped-db.ts) does it.
//
// G-10 cutover update: the connection cutover (app_runtime is now the live
// application connection, see database.module.ts) and FORCE ROW LEVEL
// SECURITY (migration 0012_g10_force_rls.sql) have both landed. The suite
// below still also documents one honest, permanent characteristic of this
// specific Supabase project rather than a gap in this migration: the
// `postgres` role has `rolbypassrls = true` set at the Supabase platform
// level (confirmed by querying pg_roles directly; not something any
// migration in this repo sets or can safely unset — `postgres` is Supabase's
// own managed admin role, used by its dashboard SQL editor, backups/PITR,
// and this repo's own migration runner, all of which need unrestricted
// access). FORCE ROW LEVEL SECURITY has no effect on a bypassrls role by
// Postgres's own design (bypassrls is checked before FORCE is even
// consulted), so enabling it did not and could not change `postgres`'s
// behavior. The real, load-bearing security boundary is that the
// application's actual runtime connection (`app_runtime`) is non-owner and
// non-bypassrls, and is correctly subject to every policy below.

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("SUPABASE_DB_URL is not set; the RLS matrix must run against a real database.");
}

const APP_RUNTIME_PASSWORD = process.env.APP_RUNTIME_DB_PASSWORD ?? "change-me-before-production-cutover";

let adminPool: pg.Pool;
let runtimePool: pg.Pool;

beforeAll(() => {
  adminPool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });

  const runtimeUrl = new URL(process.env.SUPABASE_DB_URL as string);
  const [, projectRef] = runtimeUrl.username.split(".");
  runtimeUrl.username = projectRef ? `app_runtime.${projectRef}` : "app_runtime";
  runtimeUrl.password = APP_RUNTIME_PASSWORD;
  runtimePool = new pg.Pool({ connectionString: runtimeUrl.toString() });
}, 30_000);

afterAll(async () => {
  await adminPool.end();
  await runtimePool.end();
});

async function withRuntimeContext<T>(
  tenantId: string | null,
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await runtimePool.connect();
  try {
    await client.query("begin");
    if (tenantId) {
      await client.query("select set_config('app.tenant_id', $1, true)", [tenantId]);
    }
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

interface InsertPayload {
  columns: string[];
  values: unknown[];
}

interface TableFixture {
  table: string;
  buildInsert: (tenantId: string) => Promise<InsertPayload> | InsertPayload;
}

// G-11 (0024): a fixed sequence number would collide with `unique(chain_partition, sequence)` /
// `unique(chain_partition, start_sequence|end_sequence)` whenever `buildInsert` is called more than
// once for the same tenant (the generic suite below does exactly that).
function randomSequence(): number {
  return Math.floor(Math.random() * 1_000_000_000) + 1;
}

async function seedRow(fixture: TableFixture, tenantId: string): Promise<string> {
  const { columns, values } = await fixture.buildInsert(tenantId);
  const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
  const result = await adminPool.query(
    `insert into ${fixture.table} (${columns.join(", ")}) values (${placeholders}) returning id`,
    values
  );
  return result.rows[0].id as string;
}

// Creates only the assessment/assessment_item prerequisite chain — callers
// insert the actual `findings` row themselves, since both the `findings`
// fixture and the `risk_acceptances` fixture need exactly one finding row
// each rather than sharing (or accidentally duplicating) one.
async function seedAssessmentItemChain(tenantId: string): Promise<{ itemId: string; actorId: string }> {
  const actorId = randomUUID();
  const assessment = await adminPool.query(
    `insert into assessments (tenant_id, scope_name, control_snapshot_version, period_start, period_end, created_by, updated_by)
     values ($1, $2, 'v1', '2026-01-01', '2026-12-31', $3, $3) returning id`,
    [tenantId, `rls-matrix-assessment-${randomUUID()}`, actorId]
  );
  // G-01 Constrain (0026): assessment_items.control_instance_id/question_version_id are now
  // NOT NULL, so every fixture inserting an item must seed a real control_instances row and a
  // real question_sets/question_versions row first, matching what the live dual-write path does.
  const controlInstance = await adminPool.query(
    `insert into control_instances (tenant_id, assessment_id, control_id, framework_key, framework_version, mapping_version, owner_id, created_by, updated_by)
     values ($1, $2, 'HARM-1', 'SOC2', 'v1', 'm1', $3, $3, $3) returning id`,
    [tenantId, assessment.rows[0].id, actorId]
  );
  // Callers within this file share tenantB across multiple fixtures, so a second call with the
  // same tenantId would collide on (tenant_id, control_id, question_set_key) — resolve to the
  // existing row instead of erroring, matching the idempotent on-conflict pattern used elsewhere.
  const questionSet = await adminPool.query(
    `insert into question_sets (tenant_id, control_id, question_set_key, created_by, updated_by)
     values ($1, 'HARM-1', 'q1', $2, $2)
     on conflict (tenant_id, control_id, question_set_key) do update set updated_at = question_sets.updated_at
     returning id`,
    [tenantId, actorId]
  );
  const questionVersion = await adminPool.query(
    `insert into question_versions (tenant_id, question_set_id, question_version, payload_json, checksum, created_by, updated_by)
     values ($1, $2, 1, '{}'::jsonb, 'rls-matrix-checksum', $3, $3)
     on conflict (tenant_id, question_set_id, question_version) do update set updated_at = question_versions.updated_at
     returning id`,
    [tenantId, questionSet.rows[0].id, actorId]
  );
  const item = await adminPool.query(
    `insert into assessment_items (
       tenant_id, assessment_id, framework_key, framework_version, mapping_version,
       control_id, harmonized_control_id, question_version, owner_id, control_instance_id,
       question_version_id, created_by, updated_by
     )
     values ($1, $2, 'SOC2', 'v1', 'm1', 'CC1.1', 'HARM-1', 'q1', $3, $4, $5, $3, $3)
     returning id`,
    [tenantId, assessment.rows[0].id, actorId, controlInstance.rows[0].id, questionVersion.rows[0].id]
  );
  return { itemId: item.rows[0].id as string, actorId };
}

const fixtures: TableFixture[] = [
  {
    // identity_tenants is the one table where id === tenant_id (its own
    // check constraint); this is the record the tenant scope itself hangs off.
    table: "identity_tenants",
    buildInsert: (tenantId) => ({
      columns: ["id", "tenant_id", "name", "created_by", "updated_by"],
      values: [tenantId, tenantId, `RLS matrix tenant ${tenantId}`, randomUUID(), randomUUID()]
    })
  },
  {
    table: "findings",
    buildInsert: async (tenantId) => {
      const chain = await seedAssessmentItemChain(tenantId);
      return {
        columns: ["tenant_id", "assessment_item_id", "severity", "description", "created_by", "updated_by"],
        values: [tenantId, chain.itemId, "high", "RLS matrix finding", chain.actorId, chain.actorId]
      };
    }
  },
  {
    table: "evidence_objects",
    buildInsert: (tenantId) => ({
      columns: ["tenant_id", "owner_id", "file_name", "period_start", "period_end", "created_by", "updated_by"],
      values: [tenantId, randomUUID(), "rls-matrix.pdf", "2026-01-01", "2026-12-31", randomUUID(), randomUUID()]
    })
  },
  {
    // G-07 (0021). evidence_versions is append-only and needs a parent
    // evidence_objects row, seeded here the same way ai_generation_runs
    // above seeds its own prerequisite chain.
    table: "evidence_versions",
    buildInsert: async (tenantId) => {
      const actorId = randomUUID();
      const evidence = await adminPool.query(
        `insert into evidence_objects (tenant_id, owner_id, file_name, period_start, period_end, created_by, updated_by)
         values ($1, $2, 'rls-matrix-versioned.pdf', '2026-01-01', '2026-12-31', $2, $2) returning id`,
        [tenantId, actorId]
      );
      return {
        columns: [
          "tenant_id", "evidence_id", "evidence_version_no", "object_uri", "sha256", "size_bytes",
          "mime_type", "observed_at", "period_start", "period_end", "uploaded_by"
        ],
        values: [
          tenantId, evidence.rows[0].id, 1, "s3://bucket/rls-matrix", "e".repeat(64), 1024,
          "application/pdf", new Date(), "2026-01-01", "2026-12-31", actorId
        ]
      };
    }
  },
  {
    table: "ai_generation_runs",
    buildInsert: async (tenantId) => {
      const actorId = randomUUID();
      const index = await adminPool.query(
        `insert into ai_retrieval_indexes (tenant_id, index_key, index_version, created_by, updated_by)
         values ($1, $2, 'v1', $3, $3) returning id`,
        [tenantId, `rls-matrix-index-${randomUUID()}`, actorId]
      );
      const prompt = await adminPool.query(
        `insert into ai_prompt_versions (tenant_id, prompt_key, prompt_version, template_sha256, created_by, updated_by)
         values ($1, $2, 'v1', $3, $4, $4) returning id`,
        [tenantId, `rls-matrix-prompt-${randomUUID()}`, "a".repeat(64), actorId]
      );
      const model = await adminPool.query(
        `insert into ai_model_deployments (
           tenant_id, provider, model_name, deployment_version, region, risk_tier, no_training, created_by, updated_by
         )
         values ($1, 'openai', 'gpt-4o-mini', $2, 'us-east-1', 'medium', true, $3, $3)
         returning id`,
        [tenantId, `rls-matrix-${randomUUID()}`, actorId]
      );
      return {
        columns: [
          "tenant_id", "use_case", "status", "actor_id", "prompt_version_id", "model_deployment_id",
          "retrieval_index_id", "generation_parameters", "input_fingerprint", "output_fingerprint",
          "created_by", "updated_by"
        ],
        values: [
          tenantId, "control_narrative", "approved", actorId, prompt.rows[0].id, model.rows[0].id,
          index.rows[0].id, JSON.stringify({}), "fp-in", "fp-out", actorId, actorId
        ]
      };
    }
  },
  {
    table: "connectors",
    buildInsert: (tenantId) => ({
      columns: ["tenant_id", "connector_key", "provider", "kind", "secret_ref", "created_by", "updated_by"],
      values: [tenantId, `rls-matrix-${randomUUID()}`, "aws", "cloud", "secret-ref", randomUUID(), randomUUID()]
    })
  },
  {
    table: "data_inventory_records",
    buildInsert: (tenantId) => ({
      columns: ["tenant_id", "system_name", "owner_id", "created_by", "updated_by"],
      values: [tenantId, "RLS matrix system", randomUUID(), randomUUID(), randomUUID()]
    })
  },
  {
    table: "policy_versions",
    buildInsert: (tenantId) => ({
      columns: ["tenant_id", "template_key", "title", "policy_version", "status", "content_hash", "created_by", "updated_by"],
      values: [tenantId, `rls-matrix-${randomUUID()}`, "RLS matrix policy", "v1", "draft", "hash", randomUUID(), randomUUID()]
    })
  },
  {
    // G-11 (0024): `sequence` lost its `generated always as identity` default (per-partition
    // allocation now happens in application code under an advisory lock — see the migration's own
    // header comment), so this fixture must supply it explicitly. `buildInsert` can be (and is,
    // for this exact table's own RLS test suite) called more than once for the same tenant, so a
    // fixed sequence number would collide with `unique(chain_partition, sequence)` on the second
    // call — a real bug this session's own first test run caught for the two fixtures below;
    // fixed here defensively for all three by using a random per-call sequence/range instead of a
    // fixed `1`.
    table: "audit_events",
    buildInsert: (tenantId) => ({
      columns: ["tenant_id", "sequence", "event_type", "actor_id", "target_type", "target_id", "trace_id", "body", "previous_hash", "event_hash"],
      values: [tenantId, randomSequence(), "rls.matrix.test", randomUUID(), "test", "test-1", randomUUID(), JSON.stringify({}), "0".repeat(64), randomUUID()]
    })
  },
  {
    // G-11 (0024). audit_checkpoints needs no prerequisite chain at all — `chain_partition` is a
    // free-standing uuid (no FK to audit_events), making it a good "no prerequisite chain" fixture
    // like G-08/G-12's own additions above.
    table: "audit_checkpoints",
    buildInsert: (tenantId) => {
      const sequence = randomSequence();
      return {
        columns: ["tenant_id", "chain_partition", "start_sequence", "end_sequence", "root_hash", "signature", "created_by"],
        values: [tenantId, tenantId, sequence, sequence, "a".repeat(64), "b".repeat(64), randomUUID()]
      };
    }
  },
  {
    // G-11 (0024). audit_verifications has a real FK to audit_checkpoints, so its fixture seeds
    // that prerequisite row itself first, matching the `evidence_versions`/`findings` prerequisite
    // pattern above. The real bug this session's first test run caught: `buildInsert` is called
    // more than once for the same tenant by the generic suite (once to seed the row, again to
    // build a cross-tenant insert payload for the "rejects an insert" test) — a fixed
    // start_sequence/end_sequence collided with the prerequisite checkpoint already seeded for
    // that same tenant. Fixed by giving each call its own random sequence range.
    table: "audit_verifications",
    buildInsert: async (tenantId) => {
      const actorId = randomUUID();
      const sequence = randomSequence();
      const checkpoint = await adminPool.query(
        `insert into audit_checkpoints (tenant_id, chain_partition, start_sequence, end_sequence, root_hash, signature, created_by)
         values ($1, $1, $2, $2, $3, $4, $5) returning id`,
        [tenantId, sequence, "c".repeat(64), "d".repeat(64), actorId]
      );
      return {
        columns: ["tenant_id", "checkpoint_id", "result", "verifier_version", "created_by"],
        values: [tenantId, checkpoint.rows[0].id, "pass", "rls-matrix-test-v1", actorId]
      };
    }
  },
  {
    table: "outbox_events",
    buildInsert: (tenantId) => ({
      columns: ["tenant_id", "event_type", "aggregate_type", "aggregate_id", "payload", "idempotency_key", "created_by", "updated_by"],
      values: [tenantId, "rls.matrix.test", "test_aggregate", randomUUID(), JSON.stringify({}), `rls-matrix-${randomUUID()}`, randomUUID(), randomUUID()]
    })
  },
  {
    table: "authorization_decision_logs",
    buildInsert: (tenantId) => ({
      columns: ["tenant_id", "actor_id", "resource_type", "resource_id", "action", "decision", "reason", "trace_id", "created_by", "updated_by"],
      values: [tenantId, randomUUID(), "test_resource", "res-1", "read", "allow", "test decision", randomUUID(), randomUUID(), randomUUID()]
    })
  },
  {
    table: "risk_acceptances",
    buildInsert: async (tenantId) => {
      const chain = await seedAssessmentItemChain(tenantId);
      const finding = await adminPool.query(
        `insert into findings (tenant_id, assessment_item_id, severity, description, created_by, updated_by)
         values ($1, $2, 'high', 'RLS matrix seed finding', $3, $3)
         returning id`,
        [tenantId, chain.itemId, chain.actorId]
      );
      const client = await adminPool.connect();
      let task;
      try {
        await client.query("begin");
        await client.query("set local app.allow_legacy_write = '1'");
        task = await client.query(
          `insert into remediation_tasks (tenant_id, finding_id, owner_id, due_at, created_by, updated_by)
           values ($1, $2, $3, now() + interval '30 days', $3, $3)
           returning id`,
          [tenantId, finding.rows[0].id, chain.actorId]
        );
        await client.query("commit");
      } catch (e) {
        await client.query("rollback");
        throw e;
      } finally {
        client.release();
      }
      return {
        columns: [
          "tenant_id", "remediation_task_id", "finding_id", "rationale", "approver_id",
          "expires_at", "next_review_due_at", "created_by", "updated_by"
        ],
        values: [
          tenantId, task.rows[0].id, finding.rows[0].id, "RLS matrix rationale", chain.actorId,
          "2027-01-01", "2026-10-01", chain.actorId, chain.actorId
        ]
      };
    }
  },
  {
    // G-01 assessment execution normalization (0013). control_instances only
    // needs a parent assessment, not the full assessment_item chain.
    table: "control_instances",
    buildInsert: async (tenantId) => {
      const actorId = randomUUID();
      const assessment = await adminPool.query(
        `insert into assessments (tenant_id, scope_name, control_snapshot_version, period_start, period_end, created_by, updated_by)
         values ($1, $2, 'v1', '2026-01-01', '2026-12-31', $3, $3) returning id`,
        [tenantId, `rls-matrix-control-instance-assessment-${randomUUID()}`, actorId]
      );
      return {
        columns: [
          "tenant_id", "assessment_id", "control_id", "framework_key", "framework_version",
          "mapping_version", "owner_id", "created_by", "updated_by"
        ],
        values: [tenantId, assessment.rows[0].id, "HARM-1", "SOC2", "v1", "m1", actorId, actorId, actorId]
      };
    }
  },
  {
    // G-04 report immutability (0014). The one genuinely new tenant table this gap adds.
    table: "report_templates",
    buildInsert: (tenantId) => {
      const actorId = randomUUID();
      return {
        columns: [
          "tenant_id", "template_key", "template_version", "format", "renderer_version",
          "checksum", "created_by", "updated_by"
        ],
        values: [tenantId, `rls-matrix-${randomUUID()}`, "v1", "pdf", "v1", "hash", actorId, actorId]
      };
    }
  },
  {
    // G-01 completion (0017). question_sets needs no prerequisite chain at
    // all — control_id is a plain text reference, not an FK — making it the
    // simplest of the 4 completion tables to use as the RLS-matrix fixture.
    table: "question_sets",
    buildInsert: (tenantId) => {
      const actorId = randomUUID();
      return {
        columns: ["tenant_id", "control_id", "question_set_key", "created_by", "updated_by"],
        values: [tenantId, "HARM-1", `rls-matrix-${randomUUID()}`, actorId, actorId]
      };
    }
  },
  {
    // G-09 Phase 1 (0019). risks is the top-level enterprise risk register
    // entity the gap report names directly; it needs no prerequisite chain
    // (workspace_id/risk_model_id are both nullable).
    table: "risks",
    buildInsert: (tenantId) => {
      const actorId = randomUUID();
      return {
        columns: [
          "tenant_id", "risk_key", "title", "category", "inherent_score", "residual_score",
          "owner_id", "created_by", "updated_by"
        ],
        values: [tenantId, `rls-matrix-${randomUUID()}`, "Seed risk", "vendor", 50, 25, actorId, actorId, actorId]
      };
    }
  },
  {
    // G-06 Phase 1 (0020). evaluation_suites needs no prerequisite chain at
    // all, making it the simplest of the 9 new AI-provenance tables to use
    // as the RLS-matrix fixture.
    table: "evaluation_suites",
    buildInsert: (tenantId) => {
      const actorId = randomUUID();
      return {
        columns: ["tenant_id", "use_case", "suite_key", "suite_version", "created_by", "updated_by"],
        values: [tenantId, "assessment_question", `rls-matrix-${randomUUID()}`, "v1", actorId, actorId]
      };
    }
  },
  {
    // G-08 (0022). data_categories needs no prerequisite chain at all,
    // making it the simplest of the 22 new privacy-normalization tables to
    // use as the RLS-matrix fixture.
    table: "data_categories",
    buildInsert: (tenantId) => {
      const actorId = randomUUID();
      return {
        columns: ["tenant_id", "category_key", "name", "sensitivity", "created_by", "updated_by"],
        values: [tenantId, `rls-matrix-${randomUUID()}`, "PII", "high", actorId, actorId]
      };
    }
  },
  {
    // G-12 (0023). legal_holds needs no prerequisite chain at all, making it
    // the simplest of the 5 new retention/deletion tables to use as the
    // RLS-matrix fixture.
    table: "legal_holds",
    buildInsert: (tenantId) => {
      const actorId = randomUUID();
      return {
        columns: ["tenant_id", "hold_key", "reason", "issued_by", "created_by", "updated_by"],
        values: [tenantId, `rls-matrix-${randomUUID()}`, "litigation", actorId, actorId, actorId]
      };
    }
  },
  {
    // G-13 (0025). `custom_object_definitions` itself pre-dates this gap (migration 0006) but had
    // no RLS-matrix fixture at all until now — a real, pre-existing coverage gap surfaced while
    // building its children, closed here alongside the 3 genuinely new tables.
    table: "custom_object_definitions",
    buildInsert: (tenantId) => {
      const actorId = randomUUID();
      return {
        columns: [
          "tenant_id", "object_key", "fields", "workflow_states", "permission_role_ids",
          "upgrade_safe", "connector_sdk_enabled", "created_by", "updated_by"
        ],
        values: [tenantId, `rls-matrix-${randomUUID()}`, "[]", "{open}", `{${randomUUID()}}`, true, false, actorId, actorId]
      };
    }
  },
  {
    table: "custom_field_definitions",
    buildInsert: async (tenantId) => {
      const actorId = randomUUID();
      const objectDefinition = await adminPool.query(
        `insert into custom_object_definitions (tenant_id, object_key, fields, workflow_states, permission_role_ids, upgrade_safe, connector_sdk_enabled, created_by, updated_by)
         values ($1, $2, '[]'::jsonb, '{open}', $3, true, false, $4, $4) returning id`,
        [tenantId, `rls-matrix-object-${randomUUID()}`, `{${randomUUID()}}`, actorId]
      );
      return {
        columns: ["tenant_id", "object_definition_id", "field_key", "data_type", "required", "created_by", "updated_by"],
        values: [tenantId, objectDefinition.rows[0].id, `rls-matrix-field-${randomUUID()}`, "text", false, actorId, actorId]
      };
    }
  },
  {
    table: "custom_records",
    buildInsert: async (tenantId) => {
      const actorId = randomUUID();
      const objectDefinition = await adminPool.query(
        `insert into custom_object_definitions (tenant_id, object_key, fields, workflow_states, permission_role_ids, upgrade_safe, connector_sdk_enabled, created_by, updated_by)
         values ($1, $2, '[]'::jsonb, '{open}', $3, true, false, $4, $4) returning id`,
        [tenantId, `rls-matrix-object-${randomUUID()}`, `{${randomUUID()}}`, actorId]
      );
      return {
        columns: ["tenant_id", "object_definition_id", "record_key", "created_by", "updated_by"],
        values: [tenantId, objectDefinition.rows[0].id, `rls-matrix-record-${randomUUID()}`, actorId, actorId]
      };
    }
  },
  {
    table: "custom_values",
    buildInsert: async (tenantId) => {
      const actorId = randomUUID();
      const objectDefinition = await adminPool.query(
        `insert into custom_object_definitions (tenant_id, object_key, fields, workflow_states, permission_role_ids, upgrade_safe, connector_sdk_enabled, created_by, updated_by)
         values ($1, $2, '[]'::jsonb, '{open}', $3, true, false, $4, $4) returning id`,
        [tenantId, `rls-matrix-object-${randomUUID()}`, `{${randomUUID()}}`, actorId]
      );
      const field = await adminPool.query(
        `insert into custom_field_definitions (tenant_id, object_definition_id, field_key, data_type, required, created_by, updated_by)
         values ($1, $2, $3, 'text', false, $4, $4) returning id`,
        [tenantId, objectDefinition.rows[0].id, `rls-matrix-field-${randomUUID()}`, actorId]
      );
      const record = await adminPool.query(
        `insert into custom_records (tenant_id, object_definition_id, record_key, created_by, updated_by)
         values ($1, $2, $3, $4, $4) returning id`,
        [tenantId, objectDefinition.rows[0].id, `rls-matrix-record-${randomUUID()}`, actorId]
      );
      return {
        columns: ["tenant_id", "record_id", "field_definition_id", "created_by", "updated_by"],
        values: [tenantId, record.rows[0].id, field.rows[0].id, actorId, actorId]
      };
    }
  },
  // G-05 (0029_g05_target_catalog_expand.sql): target-state catalog structure — Expand stage.
  {
    table: "frameworks",
    buildInsert: (tenantId) => {
      const actorId = randomUUID();
      return {
        columns: ["tenant_id", "framework_key", "name", "created_by", "updated_by"],
        values: [tenantId, `rls-matrix-framework-${randomUUID()}`, "RLS matrix framework", actorId, actorId]
      };
    }
  },
  {
    table: "framework_versions",
    buildInsert: async (tenantId) => {
      const actorId = randomUUID();
      const framework = await adminPool.query(
        `insert into frameworks (tenant_id, framework_key, name, created_by, updated_by)
         values ($1, $2, 'RLS matrix framework', $3, $3) returning id`,
        [tenantId, `rls-matrix-framework-${randomUUID()}`, actorId]
      );
      return {
        columns: ["tenant_id", "framework_id", "version_key", "created_by", "updated_by"],
        values: [tenantId, framework.rows[0].id, `rls-matrix-version-${randomUUID()}`, actorId, actorId]
      };
    }
  },
  {
    table: "control_sets",
    buildInsert: async (tenantId) => {
      const actorId = randomUUID();
      const framework = await adminPool.query(
        `insert into frameworks (tenant_id, framework_key, name, created_by, updated_by)
         values ($1, $2, 'RLS matrix framework', $3, $3) returning id`,
        [tenantId, `rls-matrix-framework-${randomUUID()}`, actorId]
      );
      const version = await adminPool.query(
        `insert into framework_versions (tenant_id, framework_id, version_key, created_by, updated_by)
         values ($1, $2, $3, $4, $4) returning id`,
        [tenantId, framework.rows[0].id, `rls-matrix-version-${randomUUID()}`, actorId]
      );
      return {
        columns: ["tenant_id", "framework_version_id", "set_key", "name", "created_by", "updated_by"],
        values: [tenantId, version.rows[0].id, `rls-matrix-set-${randomUUID()}`, "RLS matrix control set", actorId, actorId]
      };
    }
  },
  {
    table: "controls",
    buildInsert: async (tenantId) => {
      const actorId = randomUUID();
      const framework = await adminPool.query(
        `insert into frameworks (tenant_id, framework_key, name, created_by, updated_by)
         values ($1, $2, 'RLS matrix framework', $3, $3) returning id`,
        [tenantId, `rls-matrix-framework-${randomUUID()}`, actorId]
      );
      const version = await adminPool.query(
        `insert into framework_versions (tenant_id, framework_id, version_key, created_by, updated_by)
         values ($1, $2, $3, $4, $4) returning id`,
        [tenantId, framework.rows[0].id, `rls-matrix-version-${randomUUID()}`, actorId]
      );
      const set = await adminPool.query(
        `insert into control_sets (tenant_id, framework_version_id, set_key, name, created_by, updated_by)
         values ($1, $2, $3, 'RLS matrix control set', $4, $4) returning id`,
        [tenantId, version.rows[0].id, `rls-matrix-set-${randomUUID()}`, actorId]
      );
      return {
        columns: ["tenant_id", "control_set_id", "control_key", "title", "created_by", "updated_by"],
        values: [tenantId, set.rows[0].id, `rls-matrix-control-${randomUUID()}`, "RLS matrix control", actorId, actorId]
      };
    }
  },
  {
    table: "control_subcontrols",
    buildInsert: async (tenantId) => {
      const actorId = randomUUID();
      const framework = await adminPool.query(
        `insert into frameworks (tenant_id, framework_key, name, created_by, updated_by)
         values ($1, $2, 'RLS matrix framework', $3, $3) returning id`,
        [tenantId, `rls-matrix-framework-${randomUUID()}`, actorId]
      );
      const version = await adminPool.query(
        `insert into framework_versions (tenant_id, framework_id, version_key, created_by, updated_by)
         values ($1, $2, $3, $4, $4) returning id`,
        [tenantId, framework.rows[0].id, `rls-matrix-version-${randomUUID()}`, actorId]
      );
      const set = await adminPool.query(
        `insert into control_sets (tenant_id, framework_version_id, set_key, name, created_by, updated_by)
         values ($1, $2, $3, 'RLS matrix control set', $4, $4) returning id`,
        [tenantId, version.rows[0].id, `rls-matrix-set-${randomUUID()}`, actorId]
      );
      const control = await adminPool.query(
        `insert into controls (tenant_id, control_set_id, control_key, title, created_by, updated_by)
         values ($1, $2, $3, 'RLS matrix control', $4, $4) returning id`,
        [tenantId, set.rows[0].id, `rls-matrix-control-${randomUUID()}`, actorId]
      );
      return {
        columns: ["tenant_id", "control_id", "subcontrol_key", "title", "created_by", "updated_by"],
        values: [tenantId, control.rows[0].id, `rls-matrix-subcontrol-${randomUUID()}`, "RLS matrix subcontrol", actorId, actorId]
      };
    }
  },
  {
    table: "mapping_versions",
    buildInsert: (tenantId) => {
      const actorId = randomUUID();
      return {
        columns: ["tenant_id", "version_key", "created_by", "updated_by"],
        values: [tenantId, `rls-matrix-mapping-version-${randomUUID()}`, actorId, actorId]
      };
    }
  },
  {
    table: "mapping_reviews",
    buildInsert: async (tenantId) => {
      const actorId = randomUUID();
      // control_mappings is canonical-content-owned (no per-tenant rows exist to seed here); any
      // real row's id is a valid FK target regardless of this fixture's own random tenantId — the
      // same cross-tenant-reference pattern already used throughout this campaign for canonical
      // shared-catalog references (e.g. G-01's requirement_instances -> framework_requirements).
      const mapping = await adminPool.query(`select id from control_mappings limit 1`);
      return {
        columns: ["tenant_id", "control_mapping_id", "reviewer_id", "decision", "rationale", "created_by", "updated_by"],
        values: [tenantId, mapping.rows[0].id, actorId, "approved", "RLS matrix review rationale.", actorId, actorId]
      };
    }
  },
  {
    table: "mapping_conflicts",
    buildInsert: async (tenantId) => {
      const actorId = randomUUID();
      const mapping = await adminPool.query(`select id from control_mappings limit 1`);
      return {
        columns: ["tenant_id", "control_mapping_id", "description", "created_by", "updated_by"],
        values: [tenantId, mapping.rows[0].id, "RLS matrix conflict description.", actorId, actorId]
      };
    }
  },
  {
    table: "tenant_catalog_subscriptions",
    buildInsert: async (tenantId) => {
      const actorId = randomUUID();
      const framework = await adminPool.query(
        `insert into frameworks (tenant_id, framework_key, name, created_by, updated_by)
         values ($1, $2, 'RLS matrix framework', $3, $3) returning id`,
        [tenantId, `rls-matrix-framework-${randomUUID()}`, actorId]
      );
      return {
        columns: ["tenant_id", "framework_id", "created_by", "updated_by"],
        values: [tenantId, framework.rows[0].id, actorId, actorId]
      };
    }
  },
  {
    table: "framework_diffs",
    buildInsert: async (tenantId) => {
      const actorId = randomUUID();
      const framework = await adminPool.query(
        "insert into frameworks (tenant_id, framework_key, name, created_by, updated_by) values ($1, $2, 'RLS matrix diff framework', $3, $3) returning id",
        [tenantId, "rls-matrix-" + randomUUID(), actorId]
      );
      const version1 = await adminPool.query(
        "insert into framework_versions (tenant_id, framework_id, version_key, created_by, updated_by) values ($1, $2, $3, $4, $4) returning id",
        [tenantId, framework.rows[0].id, "rls-matrix-v1-" + randomUUID(), actorId]
      );
      const version2 = await adminPool.query(
        "insert into framework_versions (tenant_id, framework_id, version_key, created_by, updated_by) values ($1, $2, $3, $4, $4) returning id",
        [tenantId, framework.rows[0].id, "rls-matrix-v2-" + randomUUID(), actorId]
      );
      return {
        columns: ["tenant_id", "framework_id", "from_version_id", "to_version_id", "created_by", "updated_by"],
        values: [tenantId, framework.rows[0].id, version1.rows[0].id, version2.rows[0].id, actorId, actorId]
      };
    }
  },
  {
    table: "framework_diff_items",
    buildInsert: async (tenantId) => {
      const actorId = randomUUID();
      const framework = await adminPool.query(
        "insert into frameworks (tenant_id, framework_key, name, created_by, updated_by) values ($1, $2, 'RLS matrix diff item framework', $3, $3) returning id",
        [tenantId, "rls-matrix-" + randomUUID(), actorId]
      );
      const version1 = await adminPool.query(
        "insert into framework_versions (tenant_id, framework_id, version_key, created_by, updated_by) values ($1, $2, $3, $4, $4) returning id",
        [tenantId, framework.rows[0].id, "rls-matrix-v1-" + randomUUID(), actorId]
      );
      const version2 = await adminPool.query(
        "insert into framework_versions (tenant_id, framework_id, version_key, created_by, updated_by) values ($1, $2, $3, $4, $4) returning id",
        [tenantId, framework.rows[0].id, "rls-matrix-v2-" + randomUUID(), actorId]
      );
      const diff = await adminPool.query(
        "insert into framework_diffs (tenant_id, framework_id, from_version_id, to_version_id, created_by, updated_by) values ($1, $2, $3, $4, $5, $5) returning id",
        [tenantId, framework.rows[0].id, version1.rows[0].id, version2.rows[0].id, actorId]
      );
      return {
        columns: ["tenant_id", "diff_id", "change_type", "control_key", "created_by", "updated_by"],
        values: [tenantId, diff.rows[0].id, "added", "rls-matrix-control", actorId, actorId]
      };
    }
  },
  {
    table: "framework_update_impacts",
    buildInsert: async (tenantId) => {
      const actorId = randomUUID();
      const framework = await adminPool.query(
        "insert into frameworks (tenant_id, framework_key, name, created_by, updated_by) values ($1, $2, 'RLS matrix impact framework', $3, $3) returning id",
        [tenantId, "rls-matrix-" + randomUUID(), actorId]
      );
      const version1 = await adminPool.query(
        "insert into framework_versions (tenant_id, framework_id, version_key, created_by, updated_by) values ($1, $2, $3, $4, $4) returning id",
        [tenantId, framework.rows[0].id, "rls-matrix-v1-" + randomUUID(), actorId]
      );
      const version2 = await adminPool.query(
        "insert into framework_versions (tenant_id, framework_id, version_key, created_by, updated_by) values ($1, $2, $3, $4, $4) returning id",
        [tenantId, framework.rows[0].id, "rls-matrix-v2-" + randomUUID(), actorId]
      );
      const diff = await adminPool.query(
        "insert into framework_diffs (tenant_id, framework_id, from_version_id, to_version_id, created_by, updated_by) values ($1, $2, $3, $4, $5, $5) returning id",
        [tenantId, framework.rows[0].id, version1.rows[0].id, version2.rows[0].id, actorId]
      );
      const diffItem = await adminPool.query(
        "insert into framework_diff_items (tenant_id, diff_id, change_type, control_key, created_by, updated_by) values ($1, $2, 'added', 'rls-matrix-control', $3, $3) returning id",
        [tenantId, diff.rows[0].id, actorId]
      );
      const assessment = await adminPool.query(
        "insert into assessments (tenant_id, scope_name, control_snapshot_version, period_start, period_end, created_by, updated_by) values ($1, $2, 'v1', '2026-01-01', '2026-12-31', $3, $3) returning id",
        [tenantId, "rls-matrix-assessment-" + randomUUID(), actorId]
      );
      return {
        columns: ["tenant_id", "diff_item_id", "assessment_id", "created_by", "updated_by"],
        values: [tenantId, diffItem.rows[0].id, assessment.rows[0].id, actorId, actorId]
      };
    }
  },
];

describe("RLS matrix — app_runtime role against real Supabase", () => {
  for (const fixture of fixtures) {
    describe(fixture.table, () => {
      let tenantA: string;
      let tenantB: string;
      let rowAId: string;
      let rowBId: string;

      beforeAll(async () => {
        tenantA = randomUUID();
        tenantB = randomUUID();
        rowAId = await seedRow(fixture, tenantA);
        rowBId = await seedRow(fixture, tenantB);
      }, 30_000);

      it("allows a tenant to read its own row", async () => {
        const rows = await withRuntimeContext(tenantA, async (client) => {
          const result = await client.query(`select id from ${fixture.table} where id = $1`, [rowAId]);
          return result.rows;
        });
        expect(rows).toHaveLength(1);
      });

      it("denies reading another tenant's row", async () => {
        const rows = await withRuntimeContext(tenantA, async (client) => {
          const result = await client.query(`select id from ${fixture.table} where id = $1`, [rowBId]);
          return result.rows;
        });
        expect(rows).toHaveLength(0);
      });

      it("denies reading anything when no tenant context is set", async () => {
        const rows = await withRuntimeContext(null, async (client) => {
          const result = await client.query(`select id from ${fixture.table} where id in ($1, $2)`, [rowAId, rowBId]);
          return result.rows;
        });
        expect(rows).toHaveLength(0);
      });

      it("denies reading anything under a forged/unrelated tenant context", async () => {
        const rows = await withRuntimeContext(randomUUID(), async (client) => {
          const result = await client.query(`select id from ${fixture.table} where id in ($1, $2)`, [rowAId, rowBId]);
          return result.rows;
        });
        expect(rows).toHaveLength(0);
      });

      it("rejects an insert whose tenant_id does not match the session context (WITH CHECK)", async () => {
        const payload = await fixture.buildInsert(tenantB);
        const placeholders = payload.values.map((_, index) => `$${index + 1}`).join(", ");
        await expect(
          withRuntimeContext(tenantA, async (client) => {
            await client.query(
              `insert into ${fixture.table} (${payload.columns.join(", ")}) values (${placeholders})`,
              payload.values
            );
          })
        ).rejects.toThrow(/row-level security/i);
      });
    });
  }

  // Proves FORCE ROW LEVEL SECURITY is actually set on every tenant table
  // (not just that policies exist) — the direct catalog check, rather than
  // relying on behavioral inference.
  it("has FORCE ROW LEVEL SECURITY enabled on every tenant table in the RLS matrix", async () => {
    const tables = fixtures.map((fixture) => fixture.table);
    const result = await adminPool.query(
      `select relname, relforcerowsecurity
       from pg_class
       where relname = any($1) and relnamespace = 'public'::regnamespace`,
      [tables]
    );
    expect(result.rows).toHaveLength(tables.length);
    for (const row of result.rows) {
      expect(row.relforcerowsecurity, `${row.relname} should have FORCE ROW LEVEL SECURITY set`).toBe(true);
    }
  });

  // Documents the one honest, permanent characteristic of this Supabase
  // project (see the file header comment): `postgres` has `rolbypassrls =
  // true` at the platform level, so it bypasses RLS regardless of FORCE.
  // This is not a gap in this migration — it is why the load-bearing
  // assertion is that `app_runtime` (the app's real runtime connection, see
  // database.module.ts) is correctly denied, not that `postgres` is somehow
  // also restricted.
  it("documents that the postgres role bypasses RLS via rolbypassrls, independent of FORCE ROW LEVEL SECURITY", async () => {
    const fixture = fixtures.find((candidate) => candidate.table === "findings")!;
    const tenantId = randomUUID();
    await seedRow(fixture, tenantId);

    const roleAttributes = await adminPool.query(
      `select rolbypassrls from pg_roles where rolname = 'postgres'`
    );
    expect(roleAttributes.rows[0].rolbypassrls).toBe(true);

    const ownerVisibleCount = await adminPool.query(
      `select count(*)::int as count from findings where tenant_id = $1`,
      [tenantId]
    );
    expect(ownerVisibleCount.rows[0].count).toBe(1);

    const runtimeVisibleWithNoContext = await withRuntimeContext(null, async (client) => {
      const result = await client.query(`select count(*)::int as count from findings where tenant_id = $1`, [tenantId]);
      return result.rows[0].count;
    });
    expect(runtimeVisibleWithNoContext).toBe(0);
  });
});
