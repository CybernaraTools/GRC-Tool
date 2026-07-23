// G-05 Backfill stage (spec §24: Design -> Expand -> Backfill -> Dual operate -> Constrain ->
// Cutover -> Contract). Migration 0029_g05_target_catalog_expand.sql (Expand) added the 9
// target-state catalog tables plus 4 nullable link columns on the existing flat tables
// (framework_content_packs.framework_version_id, framework_requirements.control_id_ref/
// control_subcontrol_id, control_mappings.mapping_version_id) — this script populates both: the
// new normalized tables AND the links back to them, using the exact derivation logic documented
// in the Expand migration's own header comment.
//
// Processing order matters and is enforced by runCli(): framework_content_packs first (creates
// frameworks/framework_versions, needed before requirements can be linked to a framework_version's
// control_set), then framework_requirements (creates controls/control_subcontrols), then
// control_mappings (creates one mapping_versions row per tenant, a "legacy-import" pass identity
// since the source data has no real per-pass grouping).
//
// Idempotent and safely re-runnable, matching the G-01 backfill script's own established
// convention: every insert is `on conflict ... do update ... returning id` (never `do nothing`).
// controls' upsert specifically uses `coalesce(excluded.x, controls.x)` for requirement_text/
// citation/category so that a later subcontrol-bearing requirement row backfilling the same
// control_key never clobbers an earlier top-level (no-subcontrol) row's already-set text — order
// of requirement rows within one control_key is not guaranteed.
//
// Connects via SUPABASE_DB_URL (owner role) — a one-time administrative data migration writing
// across many tenants' rows in one pass, the same reasoning already used for G-01's backfill and
// the G-05 storage-incident cleanup.
//
// Usage: node scripts/backfill-g05-target-catalog.mjs [--dry-run] [--batch-size=50]

import process from "node:process";
import { pathToFileURL } from "node:url";

export function deriveFrameworkInsertValues(pack) {
  return {
    tenantId: pack.tenant_id,
    frameworkKey: pack.framework_key,
    name: pack.framework_key,
    ownerScope: pack.owner_scope,
    classification: pack.classification,
    createdBy: pack.created_by,
    createdAt: pack.created_at,
    updatedBy: pack.updated_by,
    updatedAt: pack.updated_at
  };
}

export function deriveFrameworkVersionInsertValues(pack, frameworkId) {
  return {
    tenantId: pack.tenant_id,
    frameworkId,
    versionKey: pack.pack_version,
    status: pack.status,
    publishedAt: pack.published_at,
    ownerScope: pack.owner_scope,
    classification: pack.classification,
    createdBy: pack.created_by,
    createdAt: pack.created_at,
    updatedBy: pack.updated_by,
    updatedAt: pack.updated_at
  };
}

// The source data (framework_requirements) has no grouping dimension beyond its parent pack, so
// each framework_version gets exactly one synthetic "default" control_set — not a fabrication of
// data that isn't there, just the smallest real structure the target schema requires.
export function deriveControlSetInsertValues(pack, frameworkVersionId) {
  return {
    tenantId: pack.tenant_id,
    frameworkVersionId,
    setKey: "default",
    name: `${pack.framework_key} default control set`,
    ownerScope: pack.owner_scope,
    classification: pack.classification,
    createdBy: pack.created_by,
    createdAt: pack.created_at,
    updatedBy: pack.updated_by,
    updatedAt: pack.updated_at
  };
}

export function deriveControlInsertValues(requirement, controlSetId) {
  const hasSubcontrol = Boolean(requirement.sub_control_id);
  return {
    tenantId: requirement.tenant_id,
    controlSetId,
    controlKey: requirement.control_id,
    title: requirement.control_title,
    category: requirement.category ?? null,
    // A control_id that appears across multiple requirement rows (one top-level + several
    // sub-control rows) must not have its own text overwritten by a sub-control row's insert —
    // only a genuinely top-level (no sub_control_id) row supplies the control's own text.
    requirementText: hasSubcontrol ? null : requirement.requirement_text,
    citation: hasSubcontrol ? null : requirement.citation,
    sourceWorkbook: requirement.source_workbook,
    sourceSheet: requirement.source_sheet,
    sourceRowNumber: requirement.source_row_number,
    classification: requirement.classification,
    createdBy: requirement.created_by,
    createdAt: requirement.created_at,
    updatedBy: requirement.updated_by,
    updatedAt: requirement.updated_at
  };
}

export function deriveControlSubcontrolInsertValues(requirement, controlId) {
  return {
    tenantId: requirement.tenant_id,
    controlId,
    subcontrolKey: requirement.sub_control_id,
    // sub_control_title is nullable in the source table; control_subcontrols.title is not —
    // falling back to the sub_control_id itself is an honest, documented approximation, not a
    // fabrication of a title that was never there.
    title: requirement.sub_control_title || requirement.sub_control_id,
    requirementText: requirement.requirement_text,
    citation: requirement.citation,
    sourceWorkbook: requirement.source_workbook,
    sourceSheet: requirement.source_sheet,
    sourceRowNumber: requirement.source_row_number,
    classification: requirement.classification,
    createdBy: requirement.created_by,
    createdAt: requirement.created_at,
    updatedBy: requirement.updated_by,
    updatedAt: requirement.updated_at
  };
}

// The source data (control_mappings) has no real per-harmonization-pass identity — every existing
// mapping is grouped under one synthetic "legacy-import" mapping_versions row per tenant, honestly
// named as what it is (a backfill of pre-existing data), not a real harmonization pass.
export function deriveMappingVersionInsertValues(tenantId, provenance) {
  return {
    tenantId,
    versionKey: "legacy-import",
    status: "published",
    ownerScope: provenance.owner_scope,
    classification: provenance.classification,
    createdBy: provenance.created_by,
    createdAt: provenance.created_at,
    updatedBy: provenance.updated_by,
    updatedAt: provenance.updated_at
  };
}

export async function backfillFrameworkContentPack(client, packId, summary) {
  summary.packsExamined += 1;
  const packResult = await client.query(
    `select id, tenant_id, framework_key, pack_version, status, published_at, owner_scope, classification,
            created_by, created_at, updated_by, updated_at, framework_version_id
     from framework_content_packs where id = $1`,
    [packId]
  );
  const pack = packResult.rows[0];
  if (!pack || pack.framework_version_id) {
    return;
  }

  const fw = deriveFrameworkInsertValues(pack);
  const frameworkResult = await client.query(
    `insert into frameworks (tenant_id, framework_key, name, owner_scope, classification, created_by, created_at, updated_by, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $6, $7)
     on conflict (tenant_id, framework_key) do update set updated_at = frameworks.updated_at
     returning id`,
    [fw.tenantId, fw.frameworkKey, fw.name, fw.ownerScope, fw.classification, fw.createdBy, fw.createdAt]
  );
  const frameworkId = frameworkResult.rows[0].id;

  const fv = deriveFrameworkVersionInsertValues(pack, frameworkId);
  const versionResult = await client.query(
    `insert into framework_versions (tenant_id, framework_id, version_key, status, published_at, owner_scope, classification, created_by, created_at, updated_by, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $8, $9)
     on conflict (tenant_id, framework_id, version_key) do update set updated_at = framework_versions.updated_at
     returning id`,
    [fv.tenantId, fv.frameworkId, fv.versionKey, fv.status, fv.publishedAt, fv.ownerScope, fv.classification, fv.createdBy, fv.createdAt]
  );
  const frameworkVersionId = versionResult.rows[0].id;

  const cs = deriveControlSetInsertValues(pack, frameworkVersionId);
  await client.query(
    `insert into control_sets (tenant_id, framework_version_id, set_key, name, owner_scope, classification, created_by, created_at, updated_by, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $7, $8)
     on conflict (tenant_id, framework_version_id, set_key) do update set updated_at = control_sets.updated_at`,
    [cs.tenantId, cs.frameworkVersionId, cs.setKey, cs.name, cs.ownerScope, cs.classification, cs.createdBy, cs.createdAt]
  );

  await client.query(`update framework_content_packs set framework_version_id = $1 where id = $2`, [frameworkVersionId, packId]);
  summary.packsLinked += 1;
}

export async function backfillFrameworkRequirement(client, requirementId, summary) {
  summary.requirementsExamined += 1;
  const reqResult = await client.query(
    `select fr.id, fr.tenant_id, fr.framework_pack_id, fr.control_id, fr.control_title, fr.sub_control_id,
            fr.sub_control_title, fr.requirement_text, fr.citation, fr.category, fr.source_workbook,
            fr.source_sheet, fr.source_row_number, fr.classification, fr.created_by, fr.created_at,
            fr.updated_by, fr.updated_at, fr.control_id_ref, fr.control_subcontrol_id,
            fcp.framework_version_id
     from framework_requirements fr
     join framework_content_packs fcp on fcp.id = fr.framework_pack_id
     where fr.id = $1`,
    [requirementId]
  );
  const requirement = reqResult.rows[0];
  if (!requirement || requirement.control_id_ref) {
    return;
  }
  if (!requirement.framework_version_id) {
    // Parent pack not backfilled yet (should not happen if the CLI processes packs first, but
    // defensive for direct backfillFrameworkRequirement calls in tests).
    summary.requirementsSkippedNoParentPack += 1;
    return;
  }

  const controlSet = await client.query(
    `select id from control_sets where tenant_id = $1 and framework_version_id = $2 and set_key = 'default'`,
    [requirement.tenant_id, requirement.framework_version_id]
  );
  if (!controlSet.rows[0]) {
    summary.requirementsSkippedNoParentPack += 1;
    return;
  }
  const controlSetId = controlSet.rows[0].id;

  const c = deriveControlInsertValues(requirement, controlSetId);
  const controlResult = await client.query(
    `insert into controls (
       tenant_id, control_set_id, control_key, title, category, requirement_text, citation,
       source_workbook, source_sheet, source_row_number, classification, created_by, created_at, updated_by, updated_at
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $12, $13)
     on conflict (tenant_id, control_set_id, control_key) do update set
       title = excluded.title,
       category = coalesce(excluded.category, controls.category),
       requirement_text = coalesce(excluded.requirement_text, controls.requirement_text),
       citation = coalesce(excluded.citation, controls.citation),
       updated_at = controls.updated_at
     returning id`,
    [
      c.tenantId,
      c.controlSetId,
      c.controlKey,
      c.title,
      c.category,
      c.requirementText,
      c.citation,
      c.sourceWorkbook,
      c.sourceSheet,
      c.sourceRowNumber,
      c.classification,
      c.createdBy,
      c.createdAt
    ]
  );
  const controlId = controlResult.rows[0].id;
  summary.controlsLinked += 1;

  let controlSubcontrolId = null;
  if (requirement.sub_control_id) {
    const sc = deriveControlSubcontrolInsertValues(requirement, controlId);
    const subResult = await client.query(
      `insert into control_subcontrols (
         tenant_id, control_id, subcontrol_key, title, requirement_text, citation,
         source_workbook, source_sheet, source_row_number, classification, created_by, created_at, updated_by, updated_at
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $11, $12)
       on conflict (tenant_id, control_id, subcontrol_key) do update set updated_at = control_subcontrols.updated_at
       returning id`,
      [
        sc.tenantId,
        sc.controlId,
        sc.subcontrolKey,
        sc.title,
        sc.requirementText,
        sc.citation,
        sc.sourceWorkbook,
        sc.sourceSheet,
        sc.sourceRowNumber,
        sc.classification,
        sc.createdBy,
        sc.createdAt
      ]
    );
    controlSubcontrolId = subResult.rows[0].id;
    summary.subcontrolsLinked += 1;
  }

  await client.query(`update framework_requirements set control_id_ref = $1, control_subcontrol_id = $2 where id = $3`, [
    controlId,
    controlSubcontrolId,
    requirementId
  ]);
}

export async function backfillControlMapping(client, mappingId, summary) {
  summary.mappingsExamined += 1;
  const mappingResult = await client.query(
    `select id, tenant_id, mapping_version_id from control_mappings where id = $1`,
    [mappingId]
  );
  const mapping = mappingResult.rows[0];
  if (!mapping || mapping.mapping_version_id) {
    return;
  }

  let versionRow = await client.query(
    `select id from mapping_versions where tenant_id = $1 and version_key = 'legacy-import'`,
    [mapping.tenant_id]
  );
  if (!versionRow.rows[0]) {
    const provenanceResult = await client.query(
      `select owner_scope, classification, created_by, created_at, updated_by, updated_at
       from control_mappings where tenant_id = $1 order by created_at limit 1`,
      [mapping.tenant_id]
    );
    const provenance = provenanceResult.rows[0];
    const mv = deriveMappingVersionInsertValues(mapping.tenant_id, provenance);
    versionRow = await client.query(
      `insert into mapping_versions (tenant_id, version_key, status, owner_scope, classification, created_by, created_at, updated_by, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $6, $7)
       on conflict (tenant_id, version_key) do update set updated_at = mapping_versions.updated_at
       returning id`,
      [mv.tenantId, mv.versionKey, mv.status, mv.ownerScope, mv.classification, mv.createdBy, mv.createdAt]
    );
    summary.mappingVersionsCreated += 1;
  }
  const mappingVersionId = versionRow.rows[0].id;

  await client.query(`update control_mappings set mapping_version_id = $1 where id = $2`, [mappingVersionId, mappingId]);
  summary.mappingsLinked += 1;
}

async function runCli() {
  const dotenv = await import("dotenv");
  const pg = await import("pg");
  dotenv.default.config();

  const dryRun = process.argv.includes("--dry-run");
  const batchSizeArg = process.argv.find((arg) => arg.startsWith("--batch-size="));
  const batchSize = batchSizeArg ? Number(batchSizeArg.split("=")[1]) : 50;

  if (!process.env.SUPABASE_DB_URL) {
    console.error("SUPABASE_DB_URL is not set.");
    process.exit(1);
  }

  const client = new pg.default.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  const summary = {
    packsExamined: 0,
    packsLinked: 0,
    requirementsExamined: 0,
    requirementsSkippedNoParentPack: 0,
    controlsLinked: 0,
    subcontrolsLinked: 0,
    mappingsExamined: 0,
    mappingsLinked: 0,
    mappingVersionsCreated: 0
  };

  await client.connect();
  try {
    async function processStage(label, findIdsSql, backfillFn) {
      const idsResult = await client.query(findIdsSql);
      const ids = idsResult.rows.map((row) => row.id);
      console.log(`${label}: found ${ids.length} row(s) needing backfill.${dryRun ? " (dry run — no writes)" : ""}`);
      if (dryRun) {
        return;
      }
      for (let offset = 0; offset < ids.length; offset += batchSize) {
        const batchIds = ids.slice(offset, offset + batchSize);
        await client.query("begin");
        try {
          for (const id of batchIds) {
            await backfillFn(client, id, summary);
          }
          await client.query("commit");
          console.log(`${label}: committed batch ${offset + 1}-${offset + batchIds.length} of ${ids.length}.`);
        } catch (error) {
          await client.query("rollback");
          throw error;
        }
      }
    }

    // Order matters: packs -> requirements (needs packs' framework_version_id) -> mappings
    // (independent, but processed last to keep the log narrative in spec-section order).
    await processStage(
      "framework_content_packs",
      `select id from framework_content_packs where framework_version_id is null order by created_at, id`,
      backfillFrameworkContentPack
    );
    await processStage(
      "framework_requirements",
      `select id from framework_requirements where control_id_ref is null order by created_at, id`,
      backfillFrameworkRequirement
    );
    await processStage(
      "control_mappings",
      `select id from control_mappings where mapping_version_id is null order by created_at, id`,
      backfillControlMapping
    );

    console.log("Backfill summary:", JSON.stringify(summary, null, 2));

    if (!dryRun) {
      const remaining = await client.query(
        `select
           (select count(*) from framework_content_packs where framework_version_id is null) as packs,
           (select count(*) from framework_requirements where control_id_ref is null) as requirements,
           (select count(*) from control_mappings where mapping_version_id is null) as mappings`
      );
      const row = remaining.rows[0];
      const totalRemaining = Number(row.packs) + Number(row.requirements) + Number(row.mappings);
      console.log("Reconciliation:", row);
      if (totalRemaining !== 0) {
        console.error(`RECONCILIATION FAILURE: ${totalRemaining} row(s) still unlinked after backfill.`);
        process.exit(1);
      }
    }
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}
