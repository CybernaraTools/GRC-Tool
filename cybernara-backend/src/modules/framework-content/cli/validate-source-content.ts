import "dotenv/config";
import path from "node:path";
import pg from "pg";
import { ingestFrameworkContentPacks } from "../application/framework-workbook-adapters.js";
import { ingestHarmonizationWorkbooks } from "../../harmonization/public.js";
import { PostgresFrameworkContentRepository } from "../infrastructure/postgres-framework-content.repository.js";
import { TenantScopedDb } from "../../../platform/database/tenant-scoped-db.js";
import { CANONICAL_CONTENT_ACTOR_ID, CANONICAL_CONTENT_TENANT_ID } from "../domain/canonical-catalog.js";

const sourcesDir = path.resolve(process.cwd(), "sources");
const tenantId = process.env.CONTENT_INGESTION_TENANT_ID ?? CANONICAL_CONTENT_TENANT_ID;
const actorId = process.env.CONTENT_INGESTION_ACTOR_ID ?? CANONICAL_CONTENT_ACTOR_ID;
if (!process.env.SUPABASE_DB_URL) {
  throw new Error("SUPABASE_DB_URL is required to validate and publish source content.");
}

const packs = await ingestFrameworkContentPacks(sourcesDir);
const resolvable = new Map(
  packs.map((pack) => [
    pack.frameworkKey,
    new Set(
      pack.requirements.flatMap((requirement) =>
        [requirement.controlId, requirement.subControlId].filter((value): value is string => Boolean(value))
      )
    )
  ])
);
const harmonization = await ingestHarmonizationWorkbooks(sourcesDir, resolvable);
const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
const repository = new PostgresFrameworkContentRepository(new TenantScopedDb(pool));
const published = await repository.publishIngestion({ tenantId, actorId, packs, harmonization });
const rowCounts = await repository.countRows(tenantId);
await pool.end();

console.log(
  JSON.stringify(
    {
      contentPacks: packs.map((pack) => ({
        frameworkKey: pack.frameworkKey,
        version: pack.version,
        requirementCount: pack.requirementCount,
        controlCount: pack.controlCount,
        subControlCount: pack.subControlCount,
        rejectedRecordCount: pack.rejectedRecords.length
      })),
      harmonizedControlCount: harmonization.controls.length,
      acceptedMappingCount: harmonization.mappings.length,
      rejectedMappingCount: harmonization.rejectedRecords.length,
      published,
      rowCounts
    },
    null,
    2
  )
);
