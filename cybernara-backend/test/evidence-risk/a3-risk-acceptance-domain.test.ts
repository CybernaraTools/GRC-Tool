import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createFinding,
  createRiskAcceptance,
  isRiskAcceptanceActive,
  reviewRiskAcceptance,
  type RiskAcceptance
} from "../../src/modules/risk-workflow/domain/risk.js";

// G-03 completeness: risk acceptance must not be representable by task
// status alone (schema spec §12/§18). These tests exercise every branch of
// the completeness rule directly against the domain functions, independent
// of the database — the DB-level constraints (check (expires_at >
// approved_at) etc.) are covered separately in
// test/evidence-risk/a3-schema-integrity.test.ts against real Supabase.

function baseInput(overrides: Partial<Parameters<typeof createRiskAcceptance>[0]> = {}) {
  return {
    tenantId: randomUUID(),
    remediationTaskId: randomUUID(),
    findingId: randomUUID(),
    rationale: "Compensating control approved by the risk committee.",
    approverId: randomUUID(),
    expiresAt: new Date("2027-01-01T00:00:00.000Z"),
    nextReviewDueAt: new Date("2026-10-01T00:00:00.000Z"),
    now: new Date("2026-07-01T00:00:00.000Z"),
    ...overrides
  };
}

describe("createRiskAcceptance", () => {
  it("requires a non-empty approver id", () => {
    expect(() => createRiskAcceptance(baseInput({ approverId: "" }))).toThrow(/approver/i);
  });

  it("requires a non-blank rationale", () => {
    expect(() => createRiskAcceptance(baseInput({ rationale: "   " }))).toThrow(/rationale/i);
  });

  it("rejects an expiry at or before the approval time", () => {
    const now = new Date("2026-07-01T00:00:00.000Z");
    expect(() => createRiskAcceptance(baseInput({ now, expiresAt: now }))).toThrow(/expiry/i);
    expect(() =>
      createRiskAcceptance(baseInput({ now, expiresAt: new Date("2026-06-01T00:00:00.000Z") }))
    ).toThrow(/expiry/i);
  });

  it("rejects a next-review date at or before the approval time", () => {
    const now = new Date("2026-07-01T00:00:00.000Z");
    expect(() => createRiskAcceptance(baseInput({ now, nextReviewDueAt: now }))).toThrow(/review/i);
  });

  it("builds a well-formed acceptance record when all inputs are valid", () => {
    const acceptance = createRiskAcceptance(baseInput());
    expect(acceptance.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(acceptance.approvedAt).toEqual(new Date("2026-07-01T00:00:00.000Z"));
    expect(acceptance.supersededAt).toBeUndefined();
  });
});

describe("isRiskAcceptanceActive", () => {
  const acceptance: RiskAcceptance = createRiskAcceptance(baseInput());

  it("is active strictly between approval and both the expiry and next-review dates", () => {
    expect(isRiskAcceptanceActive(acceptance, new Date("2026-08-01T00:00:00.000Z"))).toBe(true);
  });

  it("is not active once the expiry date has passed, even if the review date has not", () => {
    const expiredButReviewNotDue = createRiskAcceptance(
      baseInput({
        now: new Date("2026-01-01T00:00:00.000Z"),
        expiresAt: new Date("2026-02-01T00:00:00.000Z"),
        nextReviewDueAt: new Date("2030-01-01T00:00:00.000Z")
      })
    );
    expect(isRiskAcceptanceActive(expiredButReviewNotDue, new Date("2026-03-01T00:00:00.000Z"))).toBe(false);
  });

  it("is not active once the next-review date has lapsed, even if not yet expired — a stale review is not a valid acceptance", () => {
    const reviewOverdueButNotExpired = createRiskAcceptance(
      baseInput({
        now: new Date("2026-01-01T00:00:00.000Z"),
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
        nextReviewDueAt: new Date("2026-02-01T00:00:00.000Z")
      })
    );
    expect(isRiskAcceptanceActive(reviewOverdueButNotExpired, new Date("2026-03-01T00:00:00.000Z"))).toBe(false);
  });

  it("is never active once superseded, regardless of expiry or review dates", () => {
    const superseded: RiskAcceptance = { ...acceptance, supersededAt: new Date("2026-07-15T00:00:00.000Z") };
    expect(isRiskAcceptanceActive(superseded, new Date("2026-08-01T00:00:00.000Z"))).toBe(false);
  });

  it("treats exact boundary timestamps as no longer active (expiresAt/nextReviewDueAt are exclusive upper bounds)", () => {
    expect(isRiskAcceptanceActive(acceptance, acceptance.expiresAt)).toBe(false);
    expect(isRiskAcceptanceActive(acceptance, acceptance.nextReviewDueAt)).toBe(false);
  });
});

describe("reviewRiskAcceptance", () => {
  it("requires a reviewer id", () => {
    expect(() =>
      reviewRiskAcceptance({ riskAcceptanceId: randomUUID(), reviewerId: "", decision: "reaffirmed", reason: "ok" })
    ).toThrow(/reviewer/i);
  });

  it("requires a non-blank reason", () => {
    expect(() =>
      reviewRiskAcceptance({ riskAcceptanceId: randomUUID(), reviewerId: randomUUID(), decision: "reaffirmed", reason: "  " })
    ).toThrow(/reason/i);
  });

  it("accepts each of the three decision outcomes", () => {
    for (const decision of ["reaffirmed", "revoked", "escalated"] as const) {
      const review = reviewRiskAcceptance({
        riskAcceptanceId: randomUUID(),
        reviewerId: randomUUID(),
        decision,
        reason: `Review recorded as ${decision}.`
      });
      expect(review.decision).toBe(decision);
    }
  });
});

// G-03 remaining shape gap (spec §11/§12): a finding must originate from at least one real
// source — a manual assessment item or a control test result — but not necessarily both. These
// tests exercise the domain-level guard directly; the matching DB-level findings_has_source CHECK
// constraint is covered separately in test/evidence-risk/a3-schema-integrity.test.ts against real
// Supabase.
describe("createFinding: at-least-one-source rule", () => {
  function baseFindingInput(overrides: Partial<Parameters<typeof createFinding>[0]> = {}) {
    return {
      tenantId: randomUUID(),
      assessmentItemId: null,
      testResultId: null,
      severity: "high" as const,
      description: "Access review evidence is stale.",
      ...overrides
    };
  }

  it("rejects a finding with neither an assessment item nor a test result", () => {
    expect(() => createFinding(baseFindingInput())).toThrow(/at least one source/i);
  });

  it("accepts a finding sourced only from an assessment item", () => {
    const finding = createFinding(baseFindingInput({ assessmentItemId: randomUUID() }));
    expect(finding.assessmentItemId).toBeTruthy();
    expect(finding.testResultId).toBeNull();
  });

  it("accepts a finding sourced only from a control test result", () => {
    const finding = createFinding(baseFindingInput({ testResultId: randomUUID() }));
    expect(finding.testResultId).toBeTruthy();
    expect(finding.assessmentItemId).toBeNull();
  });

  it("accepts a finding sourced from both", () => {
    const finding = createFinding(baseFindingInput({ assessmentItemId: randomUUID(), testResultId: randomUUID() }));
    expect(finding.assessmentItemId).toBeTruthy();
    expect(finding.testResultId).toBeTruthy();
  });
});
