import { describe, expect, it } from "vitest";
import { auditQuery, parseAuditFilters } from "../src/lib/audit";

describe("audit filter handling", () => {
  it("normalizes supported query parameters for the generated client", () => {
    const parsed = parseAuditFilters({
      eventType: "assessment.answer_submitted",
      targetType: "assessment",
      targetId: "assessment-1",
      classification: "confidential",
      from: "2026-03-01T00:00:00.000Z",
      to: "2026-03-31T23:59:59.999Z",
      limit: "25",
      offset: "50"
    });

    expect(parsed.errors).toEqual([]);
    expect(auditQuery(parsed.filters)).toEqual({
      eventType: "assessment.answer_submitted",
      targetType: "assessment",
      targetId: "assessment-1",
      actorId: undefined,
      classification: "confidential",
      from: "2026-03-01T00:00:00.000Z",
      to: "2026-03-31T23:59:59.999Z",
      limit: 25,
      offset: 50
    });
  });

  it("rejects invalid classification and actor IDs before an API call", () => {
    const parsed = parseAuditFilters({
      actorId: "not-a-uuid",
      classification: "public"
    });

    expect(parsed.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("rejects invalid date ranges before an API call", () => {
    const parsed = parseAuditFilters({
      from: "2026-04-01T00:00:00.000Z",
      to: "2026-03-01T00:00:00.000Z"
    });

    expect(parsed.errors).toContain("From must be before or equal to To.");
  });
});
