// G-05 backfill derivation unit tests — imports from the .mjs script use explicit type declarations
import { describe, expect, it } from "vitest";
import {
  deriveControlInsertValues,
  deriveControlSetInsertValues,
  deriveControlSubcontrolInsertValues,
  deriveFrameworkInsertValues,
  deriveFrameworkVersionInsertValues,
  deriveMappingVersionInsertValues
} from "../../scripts/backfill-g05-target-catalog.mjs";

// G-05 Backfill stage: pure derivation-function unit tests, no database. These prove the exact
// mapping the backfill script uses to populate the target-state catalog tables (frameworks/
// framework_versions/control_sets/controls/control_subcontrols/mapping_versions) from the existing
// flat framework_content_packs/framework_requirements/control_mappings rows.

const basePack = {
  id: "pack-1",
  tenant_id: "tenant-1",
  framework_key: "SOC2",
  pack_version: "v1",
  status: "published",
  published_at: new Date("2026-01-01T00:00:00.000Z"),
  owner_scope: "tenant",
  classification: "restricted",
  created_by: "creator-1",
  created_at: new Date("2026-01-01T00:00:00.000Z"),
  updated_by: "updater-1",
  updated_at: new Date("2026-01-02T00:00:00.000Z")
};

const baseRequirementNoSubcontrol = {
  id: "req-1",
  tenant_id: "tenant-1",
  framework_pack_id: "pack-1",
  framework_key: "SOC2",
  control_id: "CC1.1",
  control_title: "Control Environment",
  sub_control_id: null,
  sub_control_title: null,
  requirement_text: "The entity demonstrates a commitment to integrity.",
  citation: "COSO Principle 1",
  category: "governance",
  source_workbook: "SOC2.xlsx",
  source_sheet: "Controls",
  source_row_number: 5,
  classification: "restricted",
  created_by: "creator-1",
  created_at: new Date("2026-01-01T00:00:00.000Z"),
  updated_by: "updater-1",
  updated_at: new Date("2026-01-02T00:00:00.000Z")
};

const baseRequirementWithSubcontrol = {
  ...baseRequirementNoSubcontrol,
  id: "req-2",
  sub_control_id: "CC1.1.a",
  sub_control_title: "Sets the tone at the top",
  requirement_text: "Management establishes and communicates standards of conduct.",
  citation: "COSO Principle 1.a"
};

describe("G-05 backfill: deriveFrameworkInsertValues", () => {
  it("uses the pack's framework_key as both the key and the name", () => {
    const values = deriveFrameworkInsertValues(basePack);
    expect(values.frameworkKey).toBe("SOC2");
    expect(values.name).toBe("SOC2");
  });

  it("preserves the pack's own historical tenant/owner/classification/actor/time fields, not the backfill run's own", () => {
    const values = deriveFrameworkInsertValues(basePack);
    expect(values.tenantId).toBe("tenant-1");
    expect(values.ownerScope).toBe("tenant");
    expect(values.classification).toBe("restricted");
    expect(values.createdBy).toBe("creator-1");
    expect(values.createdAt).toEqual(new Date("2026-01-01T00:00:00.000Z"));
    expect(values.updatedBy).toBe("updater-1");
    expect(values.updatedAt).toEqual(new Date("2026-01-02T00:00:00.000Z"));
  });
});

describe("G-05 backfill: deriveFrameworkVersionInsertValues", () => {
  it("uses the pack's pack_version as version_key and links to the given frameworkId", () => {
    const values = deriveFrameworkVersionInsertValues(basePack, "framework-123");
    expect(values.versionKey).toBe("v1");
    expect(values.frameworkId).toBe("framework-123");
  });

  it("carries the pack's status and published_at through unchanged", () => {
    const values = deriveFrameworkVersionInsertValues(basePack, "framework-123");
    expect(values.status).toBe("published");
    expect(values.publishedAt).toEqual(new Date("2026-01-01T00:00:00.000Z"));
  });
});

describe("G-05 backfill: deriveControlSetInsertValues", () => {
  it("always uses the synthetic 'default' set_key, since source data has no real set grouping", () => {
    const values = deriveControlSetInsertValues(basePack, "version-123");
    expect(values.setKey).toBe("default");
    expect(values.frameworkVersionId).toBe("version-123");
  });

  it("names the set after the pack's framework_key", () => {
    const values = deriveControlSetInsertValues(basePack, "version-123");
    expect(values.name).toBe("SOC2 default control set");
  });
});

describe("G-05 backfill: deriveControlInsertValues", () => {
  it("uses the requirement's own text/citation when there is no sub-control", () => {
    const values = deriveControlInsertValues(baseRequirementNoSubcontrol, "set-1");
    expect(values.controlKey).toBe("CC1.1");
    expect(values.requirementText).toBe("The entity demonstrates a commitment to integrity.");
    expect(values.citation).toBe("COSO Principle 1");
  });

  it("nulls out requirement_text/citation when the row has a sub-control, so a later merge cannot clobber a top-level row's text", () => {
    const values = deriveControlInsertValues(baseRequirementWithSubcontrol, "set-1");
    expect(values.controlKey).toBe("CC1.1");
    expect(values.requirementText).toBeNull();
    expect(values.citation).toBeNull();
  });

  it("preserves source provenance fields", () => {
    const values = deriveControlInsertValues(baseRequirementNoSubcontrol, "set-1");
    expect(values.sourceWorkbook).toBe("SOC2.xlsx");
    expect(values.sourceSheet).toBe("Controls");
    expect(values.sourceRowNumber).toBe(5);
  });
});

describe("G-05 backfill: deriveControlSubcontrolInsertValues", () => {
  it("uses the requirement's sub_control_id as the subcontrol_key", () => {
    const values = deriveControlSubcontrolInsertValues(baseRequirementWithSubcontrol, "control-1");
    expect(values.subcontrolKey).toBe("CC1.1.a");
    expect(values.controlId).toBe("control-1");
  });

  it("uses sub_control_title as the title when present", () => {
    const values = deriveControlSubcontrolInsertValues(baseRequirementWithSubcontrol, "control-1");
    expect(values.title).toBe("Sets the tone at the top");
  });

  it("falls back to sub_control_id as the title when sub_control_title is null, since title is NOT NULL", () => {
    const requirementNoTitle = { ...baseRequirementWithSubcontrol, sub_control_title: null };
    const values = deriveControlSubcontrolInsertValues(requirementNoTitle, "control-1");
    expect(values.title).toBe("CC1.1.a");
  });

  it("carries the sub-control row's own requirement_text/citation, not the parent control's", () => {
    const values = deriveControlSubcontrolInsertValues(baseRequirementWithSubcontrol, "control-1");
    expect(values.requirementText).toBe("Management establishes and communicates standards of conduct.");
    expect(values.citation).toBe("COSO Principle 1.a");
  });
});

describe("G-05 backfill: deriveMappingVersionInsertValues", () => {
  const provenance = {
    tenant_id: "tenant-1",
    owner_scope: "tenant",
    classification: "restricted",
    created_by: "creator-1",
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_by: "updater-1",
    updated_at: new Date("2026-01-02T00:00:00.000Z")
  };

  it("always uses the synthetic 'legacy-import' version_key, honestly naming this as a backfill of pre-existing data, not a real harmonization pass", () => {
    const values = deriveMappingVersionInsertValues("tenant-1", provenance);
    expect(values.versionKey).toBe("legacy-import");
    expect(values.tenantId).toBe("tenant-1");
  });

  it("derives owner_scope/classification/actor/time from the given provenance row", () => {
    const values = deriveMappingVersionInsertValues("tenant-1", provenance);
    expect(values.ownerScope).toBe("tenant");
    expect(values.classification).toBe("restricted");
    expect(values.createdBy).toBe("creator-1");
  });
});
