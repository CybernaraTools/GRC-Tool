import path from "node:path";
import { describe, expect, it } from "vitest";
import { ingestFrameworkContentPacks } from "../../src/modules/framework-content/application/framework-workbook-adapters.js";
import { ingestHarmonizationWorkbooks } from "../../src/modules/harmonization/public.js";

const sourcesDir = path.resolve(process.cwd(), "sources");

describe("FrameworkContent source ingestion", () => {
  it("ingests all 13 framework workbooks into immutable content-pack summaries", async () => {
    const packs = await ingestFrameworkContentPacks(sourcesDir);

    expect(packs).toHaveLength(13);
    for (const pack of packs) {
      expect(pack.requirementCount, pack.frameworkKey).toBeGreaterThan(0);
      expect(pack.controlCount, pack.frameworkKey).toBeGreaterThan(0);
      expect(pack.sourceChecksum).toMatch(/^[a-f0-9]{64}$/);
      expect(pack.signature).toMatch(/^[a-f0-9]{64}$/);
      expect(pack.rejectedRecords, pack.frameworkKey).toEqual([]);
    }
  }, 30_000);

  it("ingests harmonization workbooks and only accepts mappings with resolvable source IDs", async () => {
    const packs = await ingestFrameworkContentPacks(sourcesDir);
    const sourceIdsByFramework = new Map(
      packs.map((pack) => [
        pack.frameworkKey,
        new Set(
          pack.requirements.flatMap((requirement) =>
            [requirement.controlId, requirement.subControlId].filter((value): value is string => Boolean(value))
          )
        )
      ])
    );

    const harmonization = await ingestHarmonizationWorkbooks(sourcesDir, sourceIdsByFramework);
    const harmonizedIds = new Set(harmonization.controls.map((control) => control.harmonizedId));

    expect(harmonization.controls.length).toBeGreaterThan(300);
    expect(harmonization.mappings.length).toBeGreaterThan(100);
    for (const mapping of harmonization.mappings.filter((candidate) => candidate.classification !== "unique")) {
      expect(sourceIdsByFramework.get(mapping.frameworkKey)?.has(mapping.sourceControlId), JSON.stringify(mapping)).toBe(
        true
      );
      expect(harmonizedIds.has(mapping.targetControlId), JSON.stringify(mapping)).toBe(true);
    }
    expect(harmonization.rejectedRecords.length).toBeGreaterThan(0);
  }, 30_000);
});
