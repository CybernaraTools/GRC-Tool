// G-01 Backfill stage (spec §24: Design -> Expand -> Backfill -> Dual operate -> Constrain -> Cut
// over -> Contract). Migrations 0013/0017 (Expand) added `control_instance_id`/`question_version_id`
// to `assessment_items` and the application layer (`PostgresAssessmentRepository.createAssessment`)
// has dual-written both for every assessment created since — but every `assessment_items` row
// created BEFORE those migrations landed (or created directly via raw SQL, e.g. this test suite's
// own RLS-matrix fixtures) still has both columns null. This script populates them for every
// existing null row, using the EXACT SAME derivation logic `createAssessment` already uses for new
// assessments (harmonized_control_id as control_instances.control_id; question_set_key = the legacy
// question_version string; question_version = 1), so backfilled rows are indistinguishable in shape
// from rows written by the live dual-write path.
//
// Beyond the bare FK link, this also reconstructs real history where the legacy row actually has
// some to reconstruct: a non-null `applicability` jsonb becomes a real `applicability_decisions` row
// (not just a status flag), and a non-null `answer_text` becomes a real `answer_revisions` row
// (revision 1). Historical rows never separately tracked "who submitted the answer" apart from
// `updated_by` — `submitted_by`/`decided_by` are backfilled from the row's own `updated_by`/
// `applicability.approvedBy`, an honest best-available approximation, not exact original
// provenance (documented here and in the ledger, not silently assumed to be more precise than it is).
//
// Connects via SUPABASE_DB_URL (owner role), not app_runtime — this is a one-time administrative
// data migration writing across many tenants' rows in one pass, the same reasoning already used for
// the G-05 storage-incident cleanup. Idempotent and safely re-runnable: every insert is
// `on conflict ... do update ... returning id` (never `do nothing`, so a rerun always resolves to
// the same id rather than silently no-op-ing), and the two historical-reconstruction inserts each
// check for an existing row first.
//
// The derivation functions below are pure (no I/O) and exported for direct unit testing
// (test/assessment/g01-backfill-derivation.test.ts); `backfillItem` is exported for a real-Supabase
// integration test (test/assessment/g01-execution-graph.test.ts) that seeds a synthetic
// legacy-shaped row and runs it directly, rather than only trusting the one-time CLI run's own
// self-reported summary.
//
// Usage: node scripts/backfill-g01-execution-graph.mjs [--dry-run] [--batch-size=100]

import { createHash } from "node:crypto";
import process from "node:process";
import { pathToFileURL } from "node:url";

export function deriveApplicabilityStatus(applicability) {
  if (!applicability) {
    return "pending";
  }
  return applicability.applicable ? "applicable" : "not_applicable";
}

export function deriveControlInstanceInsertValues(item) {
  return {
    tenantId: item.tenant_id,
    assessmentId: item.assessment_id,
    controlId: item.harmonized_control_id,
    frameworkKey: item.framework_key,
    frameworkVersion: item.framework_version,
    mappingVersion: item.mapping_version,
    ownerId: item.owner_id,
    applicabilityStatus: deriveApplicabilityStatus(item.applicability),
    status: item.status,
    createdBy: item.created_by,
    createdAt: item.created_at,
    updatedBy: item.updated_by,
    updatedAt: item.updated_at
  };
}

// Returns null if there is nothing to reconstruct (no applicability at all) or the legacy
// rationale is blank (a real, pre-existing data-quality gap in the historical row — logged by the
// caller as `applicabilitySkippedBlankRationale`, not silently treated as "nothing to do").
export function deriveApplicabilityDecisionInsertValues(item, controlInstanceId) {
  if (!item.applicability) {
    return null;
  }
  const rationale = String(item.applicability.rationale ?? "").trim();
  if (!rationale) {
    return { skippedBlankRationale: true };
  }
  return {
    tenantId: item.tenant_id,
    controlInstanceId,
    decision: item.applicability.applicable ? "applicable" : "not_applicable",
    rationale,
    decidedBy: item.applicability.approvedBy,
    approvedBy: null,
    decidedAt: item.applicability.approvedAt
  };
}

export function deriveAnswerRevisionInsertValues(item) {
  if (!item.answer_text) {
    return null;
  }
  return {
    tenantId: item.tenant_id,
    assessmentItemId: item.id,
    revision: 1,
    responseJson: { answerText: item.answer_text, evidenceIds: item.evidence_ids ?? [] },
    submittedBy: item.updated_by,
    submittedAt: item.updated_at,
    supersedesId: null
  };
}

export function deriveQuestionSetInsertValues(item) {
  return {
    tenantId: item.tenant_id,
    controlId: item.harmonized_control_id,
    questionSetKey: item.question_version,
    createdBy: item.created_by,
    createdAt: item.created_at,
    updatedBy: item.updated_by,
    updatedAt: item.updated_at
  };
}

export function deriveQuestionVersionInsertValues(item, questionSetId) {
  return {
    tenantId: item.tenant_id,
    questionSetId,
    questionVersion: 1,
    payloadJson: { legacyQuestionVersion: item.question_version },
    checksum: createHash("sha256").update(item.question_version).digest("hex"),
    createdBy: item.created_by,
    createdAt: item.created_at,
    updatedBy: item.updated_by,
    updatedAt: item.updated_at
  };
}

export async function backfillItem(client, itemId, summary) {
  summary.rowsExamined += 1;
  const itemResult = await client.query(
    `select id, tenant_id, assessment_id, framework_key, framework_version, mapping_version,
            control_id, harmonized_control_id, question_version, status, owner_id, answer_text,
            applicability, evidence_ids, control_instance_id, question_version_id,
            created_by, created_at, updated_by, updated_at
     from assessment_items where id = $1`,
    [itemId]
  );
  const item = itemResult.rows[0];
  if (!item) {
    return;
  }

  let controlInstanceId = item.control_instance_id;
  if (!controlInstanceId) {
    const ci = deriveControlInstanceInsertValues(item);
    const ciResult = await client.query(
      `insert into control_instances (
         tenant_id, assessment_id, control_id, framework_key, framework_version, mapping_version,
         owner_id, applicability_status, status, created_by, created_at, updated_by, updated_at
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       on conflict (tenant_id, assessment_id, control_id) do update set updated_at = control_instances.updated_at
       returning id`,
      [
        ci.tenantId,
        ci.assessmentId,
        ci.controlId,
        ci.frameworkKey,
        ci.frameworkVersion,
        ci.mappingVersion,
        ci.ownerId,
        ci.applicabilityStatus,
        ci.status,
        ci.createdBy,
        ci.createdAt,
        ci.updatedBy,
        ci.updatedAt
      ]
    );
    controlInstanceId = ciResult.rows[0].id;
    await client.query(`update assessment_items set control_instance_id = $1 where id = $2`, [controlInstanceId, itemId]);
    summary.controlInstancesLinked += 1;

    const ad = deriveApplicabilityDecisionInsertValues(item, controlInstanceId);
    if (ad?.skippedBlankRationale) {
      summary.applicabilitySkippedBlankRationale += 1;
    } else if (ad) {
      const existing = await client.query(
        `select id from applicability_decisions where control_instance_id = $1 limit 1`,
        [controlInstanceId]
      );
      if (existing.rows.length === 0) {
        await client.query(
          `insert into applicability_decisions (
             tenant_id, control_instance_id, decision, rationale, decided_by, approved_by, decided_at
           )
           values ($1, $2, $3, $4, $5, $6, $7)`,
          [ad.tenantId, ad.controlInstanceId, ad.decision, ad.rationale, ad.decidedBy, ad.approvedBy, ad.decidedAt]
        );
        summary.applicabilityDecisionsBackfilled += 1;
      }
    }

    const ar = deriveAnswerRevisionInsertValues(item);
    if (ar) {
      const existingRevision = await client.query(
        `select id from answer_revisions where assessment_item_id = $1 limit 1`,
        [itemId]
      );
      if (existingRevision.rows.length === 0) {
        await client.query(
          `insert into answer_revisions (
             tenant_id, assessment_item_id, revision, response_json, submitted_by, submitted_at, supersedes_id
           )
           values ($1, $2, $3, $4::jsonb, $5, $6, $7)`,
          [ar.tenantId, ar.assessmentItemId, ar.revision, JSON.stringify(ar.responseJson), ar.submittedBy, ar.submittedAt, ar.supersedesId]
        );
        summary.answerRevisionsBackfilled += 1;
      }
    }
  }

  if (!item.question_version_id) {
    const qs = deriveQuestionSetInsertValues(item);
    const questionSetResult = await client.query(
      `insert into question_sets (tenant_id, control_id, question_set_key, created_by, created_at, updated_by, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (tenant_id, control_id, question_set_key) do update set updated_at = question_sets.updated_at
       returning id`,
      [qs.tenantId, qs.controlId, qs.questionSetKey, qs.createdBy, qs.createdAt, qs.updatedBy, qs.updatedAt]
    );
    const questionSetId = questionSetResult.rows[0].id;
    const qv = deriveQuestionVersionInsertValues(item, questionSetId);
    const questionVersionResult = await client.query(
      `insert into question_versions (
         tenant_id, question_set_id, question_version, payload_json, checksum, created_by, created_at, updated_by, updated_at
       )
       values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9)
       on conflict (tenant_id, question_set_id, question_version) do update set updated_at = question_versions.updated_at
       returning id`,
      [qv.tenantId, qv.questionSetId, qv.questionVersion, JSON.stringify(qv.payloadJson), qv.checksum, qv.createdBy, qv.createdAt, qv.updatedBy, qv.updatedAt]
    );
    await client.query(`update assessment_items set question_version_id = $1 where id = $2`, [
      questionVersionResult.rows[0].id,
      itemId
    ]);
    summary.questionVersionsLinked += 1;
  }
}

async function runCli() {
  const dotenv = await import("dotenv");
  const pg = await import("pg");
  dotenv.default.config();

  const dryRun = process.argv.includes("--dry-run");
  const batchSizeArg = process.argv.find((arg) => arg.startsWith("--batch-size="));
  const batchSize = batchSizeArg ? Number(batchSizeArg.split("=")[1]) : 100;

  if (!process.env.SUPABASE_DB_URL) {
    console.error("SUPABASE_DB_URL is not set.");
    process.exit(1);
  }

  const client = new pg.default.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  const summary = {
    rowsExamined: 0,
    controlInstancesLinked: 0,
    questionVersionsLinked: 0,
    applicabilityDecisionsBackfilled: 0,
    answerRevisionsBackfilled: 0,
    applicabilitySkippedBlankRationale: 0
  };

  await client.connect();
  try {
    const idsResult = await client.query(
      `select id from assessment_items where control_instance_id is null or question_version_id is null order by created_at, id`
    );
    const ids = idsResult.rows.map((row) => row.id);
    console.log(`Found ${ids.length} assessment_items row(s) needing backfill.${dryRun ? " (dry run — no writes)" : ""}`);

    for (let offset = 0; offset < ids.length; offset += batchSize) {
      const batchIds = ids.slice(offset, offset + batchSize);
      if (dryRun) {
        summary.rowsExamined += batchIds.length;
        console.log(`[dry-run] would process batch ${offset + 1}-${offset + batchIds.length} of ${ids.length}`);
        continue;
      }
      await client.query("begin");
      try {
        for (const itemId of batchIds) {
          await backfillItem(client, itemId, summary);
        }
        await client.query("commit");
        console.log(`Committed batch ${offset + 1}-${offset + batchIds.length} of ${ids.length}.`);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }

    if (!dryRun) {
      const remaining = await client.query(
        `select count(*) as count from assessment_items where control_instance_id is null or question_version_id is null`
      );
      summary.remainingNulls = Number(remaining.rows[0].count);
    }

    console.log("Backfill summary:", JSON.stringify(summary, null, 2));
    if (!dryRun && summary.remainingNulls !== 0) {
      console.error(`RECONCILIATION FAILURE: ${summary.remainingNulls} row(s) still null after backfill.`);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}
