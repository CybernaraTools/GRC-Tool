import "dotenv/config";
import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import {
  backfillControlMapping,
  backfillFrameworkContentPack,
  backfillFrameworkRequirement
} from "../../scripts/backfill-g05-target-catalog.mjs";

const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });

afterAll(async () => {
  await pool.end();
});

describe("G-05 Backfill: live constrained database reconciliation", () => {
  it("has no remaining nullable G-05 links after the constrain stage", async () => {
    const result = await pool.query<{
      packs: string;
      requirements: string;
      mappings: string;
    }>(
      `select
         (select count(*) from framework_content_packs where framework_version_id is null)::text as packs,
         (select count(*) from framework_requirements where control_id_ref is null)::text as requirements,
         (select count(*) from control_mappings where mapping_version_id is null)::text as mappings`
    );

    expect(result.rows[0]).toEqual({ packs: "0", requirements: "0", mappings: "0" });
  });

  it("treats an already-linked framework_content_packs row as an idempotent no-op", async () => {
    const pack = await pool.query<{ id: string }>(
      `select id from framework_content_packs where framework_version_id is not null order by created_at limit 1`
    );
    expect(pack.rows[0]?.id).toBeTruthy();

    const summary = { packsExamined: 0, packsLinked: 0 };
    await backfillFrameworkContentPack(pool, pack.rows[0].id, summary);
    expect(summary).toEqual({ packsExamined: 1, packsLinked: 0 });
  });

  it("treats an already-linked framework_requirements row as an idempotent no-op", async () => {
    const requirement = await pool.query<{ id: string }>(
      `select id from framework_requirements where control_id_ref is not null order by created_at limit 1`
    );
    expect(requirement.rows[0]?.id).toBeTruthy();

    const summary = {
      requirementsExamined: 0,
      requirementsSkippedNoParentPack: 0,
      controlsLinked: 0,
      subcontrolsLinked: 0
    };
    await backfillFrameworkRequirement(pool, requirement.rows[0].id, summary);
    expect(summary).toEqual({
      requirementsExamined: 1,
      requirementsSkippedNoParentPack: 0,
      controlsLinked: 0,
      subcontrolsLinked: 0
    });
  });

  it("treats an already-linked control_mappings row as an idempotent no-op", async () => {
    const mapping = await pool.query<{ id: string }>(
      `select id from control_mappings where mapping_version_id is not null order by created_at limit 1`
    );
    expect(mapping.rows[0]?.id).toBeTruthy();

    const summary = { mappingsExamined: 0, mappingsLinked: 0, mappingVersionsCreated: 0 };
    await backfillControlMapping(pool, mapping.rows[0].id, summary);
    expect(summary).toEqual({ mappingsExamined: 1, mappingsLinked: 0, mappingVersionsCreated: 0 });
  });
});
