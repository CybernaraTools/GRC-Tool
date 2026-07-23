import { describe, expect, it } from "vitest";
import {
  deriveAnswerRevisionInsertValues,
  deriveApplicabilityDecisionInsertValues,
  deriveApplicabilityStatus,
  deriveControlInstanceInsertValues,
  deriveQuestionSetInsertValues,
  deriveQuestionVersionInsertValues
} from "../../scripts/backfill-g01-execution-graph.mjs";

// G-01 Backfill stage: pure derivation-function unit tests, no database. These prove the exact
// mapping the backfill script uses to reconstruct `control_instances`/`question_sets`/
// `question_versions`/`applicability_decisions`/`answer_revisions` from a legacy `assessment_items`
// row's flat columns — the same logic `PostgresAssessmentRepository.createAssessment` already uses
// for new assessments, applied retroactively to historical rows.

const baseItem = {
  id: "item-1",
  tenant_id: "tenant-1",
  assessment_id: "assessment-1",
  framework_key: "SOC2",
  framework_version: "v1",
  mapping_version: "m1",
  control_id: "CC1.1",
  harmonized_control_id: "HARM-1",
  question_version: "q1",
  status: "in_progress",
  owner_id: "owner-1",
  answer_text: null,
  applicability: null,
  evidence_ids: [],
  created_by: "creator-1",
  created_at: new Date("2026-01-01T00:00:00.000Z"),
  updated_by: "updater-1",
  updated_at: new Date("2026-01-02T00:00:00.000Z")
};

describe("G-01 backfill: deriveApplicabilityStatus", () => {
  it("returns 'pending' when no applicability decision exists", () => {
    expect(deriveApplicabilityStatus(null)).toBe("pending");
  });

  it("returns 'applicable' when applicability.applicable is true", () => {
    expect(deriveApplicabilityStatus({ applicable: true })).toBe("applicable");
  });

  it("returns 'not_applicable' when applicability.applicable is false", () => {
    expect(deriveApplicabilityStatus({ applicable: false })).toBe("not_applicable");
  });
});

describe("G-01 backfill: deriveControlInstanceInsertValues", () => {
  it("uses harmonized_control_id as control_instances.control_id, not the raw control_id", () => {
    const values = deriveControlInstanceInsertValues(baseItem);
    expect(values.controlId).toBe("HARM-1");
  });

  it("preserves the item's own historical created_by/created_at/updated_by/updated_at, not the backfill run's own actor/time", () => {
    const values = deriveControlInstanceInsertValues(baseItem);
    expect(values.createdBy).toBe("creator-1");
    expect(values.createdAt).toEqual(new Date("2026-01-01T00:00:00.000Z"));
    expect(values.updatedBy).toBe("updater-1");
  });

  it("derives applicabilityStatus and copies status straight through", () => {
    const values = deriveControlInstanceInsertValues({
      ...baseItem,
      status: "approved",
      applicability: { applicable: true, rationale: "In scope.", approvedBy: "approver-1", approvedAt: new Date() }
    });
    expect(values.applicabilityStatus).toBe("applicable");
    expect(values.status).toBe("approved");
  });
});

describe("G-01 backfill: deriveApplicabilityDecisionInsertValues", () => {
  it("returns null when the item has no applicability at all (nothing to reconstruct)", () => {
    expect(deriveApplicabilityDecisionInsertValues(baseItem, "ci-1")).toBeNull();
  });

  it("flags a blank rationale as skipped rather than silently fabricating one", () => {
    const item = { ...baseItem, applicability: { applicable: true, rationale: "   ", approvedBy: "x", approvedAt: new Date() } };
    const result = deriveApplicabilityDecisionInsertValues(item, "ci-1");
    expect(result).toEqual({ skippedBlankRationale: true });
  });

  it("builds a real decision row from a populated legacy applicability, with approvedBy null (single-actor legacy model, not fabricating a second approver)", () => {
    const approvedAt = new Date("2026-02-01T00:00:00.000Z");
    const item = {
      ...baseItem,
      applicability: { applicable: false, rationale: "Not in scope this period.", approvedBy: "approver-1", approvedAt }
    };
    const result = deriveApplicabilityDecisionInsertValues(item, "ci-1");
    expect(result).toMatchObject({
      tenantId: "tenant-1",
      controlInstanceId: "ci-1",
      decision: "not_applicable",
      rationale: "Not in scope this period.",
      decidedBy: "approver-1",
      approvedBy: null,
      decidedAt: approvedAt
    });
  });
});

describe("G-01 backfill: deriveAnswerRevisionInsertValues", () => {
  it("returns null when the item has no legacy answer_text", () => {
    expect(deriveAnswerRevisionInsertValues(baseItem)).toBeNull();
  });

  it("builds revision 1 from the legacy answer_text/evidence_ids, using updated_by/updated_at as the best-available submitted_by/submitted_at approximation", () => {
    const item = { ...baseItem, answer_text: "We enforce MFA.", evidence_ids: ["ev-1", "ev-2"] };
    const result = deriveAnswerRevisionInsertValues(item);
    expect(result).toMatchObject({
      tenantId: "tenant-1",
      assessmentItemId: "item-1",
      revision: 1,
      responseJson: { answerText: "We enforce MFA.", evidenceIds: ["ev-1", "ev-2"] },
      submittedBy: "updater-1",
      submittedAt: baseItem.updated_at,
      supersedesId: null
    });
  });
});

describe("G-01 backfill: deriveQuestionSetInsertValues / deriveQuestionVersionInsertValues", () => {
  it("uses harmonized_control_id and the legacy question_version string as the question_set_key", () => {
    const values = deriveQuestionSetInsertValues(baseItem);
    expect(values.controlId).toBe("HARM-1");
    expect(values.questionSetKey).toBe("q1");
  });

  it("always builds question_version = 1, wrapping the legacy string in payload_json, with a stable sha256 checksum", () => {
    const values = deriveQuestionVersionInsertValues(baseItem, "qs-1");
    expect(values.questionSetId).toBe("qs-1");
    expect(values.questionVersion).toBe(1);
    expect(values.payloadJson).toEqual({ legacyQuestionVersion: "q1" });
    expect(values.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces the same checksum for the same legacy question_version string (deterministic, not random)", () => {
    const a = deriveQuestionVersionInsertValues(baseItem, "qs-1");
    const b = deriveQuestionVersionInsertValues({ ...baseItem, id: "item-2" }, "qs-2");
    expect(a.checksum).toBe(b.checksum);
  });
});
