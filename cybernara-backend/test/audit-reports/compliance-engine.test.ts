import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { runComplianceEngine } from "../../src/modules/audit-reports/domain/compliance-engine.js";
import { buildClosureSnapshotPayload } from "../../src/modules/closure-snapshot/domain/closure-snapshot.js";
import type { PinnedControlRef, AssessmentItem } from "../../src/modules/assessment/public.js";

const actorId = randomUUID();

function controlRef(overrides: Partial<PinnedControlRef> = {}): PinnedControlRef {
  return {
    frameworkKey: "SOC2",
    frameworkVersion: "v1",
    mappingVersion: "m1",
    controlId: "CC6.1",
    harmonizedControlId: "HARM-1",
    questionVersion: "curated-v1",
    ...overrides
  };
}

function item(overrides: Partial<AssessmentItem> = {}): AssessmentItem {
  return {
    id: randomUUID(),
    controlRef: controlRef(),
    status: "approved",
    ownerId: actorId,
    answerText: "Evidence provided.",
    evidenceIds: [],
    applicability: { applicable: true, rationale: "Applies", approvedBy: actorId, approvedAt: new Date() },
    ...overrides
  };
}

function snapshotPayload(items: AssessmentItem[], overrides: Parameters<typeof buildClosureSnapshotPayload>[0] extends infer T ? Partial<T> : never = {}) {
  return buildClosureSnapshotPayload({
    assessment: {
      id: randomUUID(),
      scopeName: "Test Assessment",
      status: "closed",
      controlSnapshotVersion: "v1",
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-12-31"),
      createdBy: actorId,
      createdAt: new Date("2026-01-01")
    },
    items,
    findings: [],
    remediationTasks: [],
    risks: [],
    riskAcceptances: [],
    evidence: [],
    signoffs: [],
    reconstructed: false,
    ...overrides
  });
}

describe("deterministic compliance engine", () => {
  it("test 11: no findings -> satisfied and compliant", () => {
    const result = runComplianceEngine(snapshotPayload([item()]));
    expect(result.dispositions[0]?.disposition).toBe("satisfied");
    expect(result.frameworks[0]?.satisfiedCount).toBe(1);
    expect(result.frameworks[0]?.rawPercentage).toBe(100);
  });

  it("test 12: verified remediation counts as compliant", () => {
    const oneItem = item();
    const findingId = randomUUID();
    const taskId = randomUUID();
    const payload = snapshotPayload([oneItem], {
      findings: [
        {
          id: findingId,
          assessmentItemId: oneItem.id,
          testResultId: null,
          severity: "high",
          impact: null,
          likelihood: null,
          ownerId: null,
          dueAt: null,
          description: "Gap found",
          createdAt: new Date().toISOString()
        }
      ],
      remediationTasks: [
        {
          id: taskId,
          findingId,
          ownerId: actorId,
          dueAt: new Date().toISOString(),
          status: "verified",
          reviews: [
            { id: randomUUID(), reviewerId: actorId, decision: "approved", rationale: "Verified", evidenceVersionIds: [], reviewedAt: new Date().toISOString() }
          ]
        }
      ]
    } as never);
    const result = runComplianceEngine(payload);
    expect(result.dispositions[0]?.disposition).toBe("remediation_verified");
    expect(result.frameworks[0]?.remediatedCount).toBe(1);
    expect(result.frameworks[0]?.rawPercentage).toBe(100);
  });

  it("test 13: accepted residual risk does NOT count as compliant", () => {
    const oneItem = item();
    const findingId = randomUUID();
    const now = new Date();
    const payload = snapshotPayload([oneItem], {
      findings: [
        { id: findingId, assessmentItemId: oneItem.id, testResultId: null, severity: "medium", impact: null, likelihood: null, ownerId: null, dueAt: null, description: "Gap", createdAt: now.toISOString() }
      ],
      remediationTasks: [],
      riskAcceptances: [
        {
          id: randomUUID(),
          remediationTaskId: randomUUID(),
          findingId,
          riskId: null,
          rationale: "Accepted",
          approverId: actorId,
          approvedAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 86_400_000).toISOString(),
          nextReviewDueAt: new Date(now.getTime() + 86_400_000).toISOString(),
          compensatingControls: null,
          supersededAt: null,
          supersededById: null,
          isActiveAtCapture: true
        }
      ]
    } as never);
    const result = runComplianceEngine(payload);
    expect(result.dispositions[0]?.disposition).toBe("accepted_residual_risk");
    expect(result.frameworks[0]?.acceptedRiskCount).toBe(1);
    expect(result.frameworks[0]?.rawPercentage).toBe(0);
  });

  it("test 14: unresolved finding does NOT count as compliant", () => {
    const oneItem = item();
    const payload = snapshotPayload([oneItem], {
      findings: [
        { id: randomUUID(), assessmentItemId: oneItem.id, testResultId: null, severity: "critical", impact: null, likelihood: null, ownerId: null, dueAt: null, description: "Unresolved gap", createdAt: new Date().toISOString() }
      ]
    } as never);
    const result = runComplianceEngine(payload);
    expect(result.dispositions[0]?.disposition).toBe("unresolved");
    expect(result.frameworks[0]?.unresolvedCount).toBe(1);
    expect(result.frameworks[0]?.rawPercentage).toBe(0);
  });

  it("test 15: not-applicable control excluded from denominator", () => {
    const applicableItem = item();
    const naItem = item({ applicability: { applicable: false, rationale: "N/A", approvedBy: actorId, approvedAt: new Date() } });
    const result = runComplianceEngine(snapshotPayload([applicableItem, naItem]));
    const framework = result.frameworks[0]!;
    expect(framework.notApplicableCount).toBe(1);
    expect(framework.applicableCount).toBe(1);
    expect(framework.rawPercentage).toBe(100);
  });

  it("protects against division by zero when every control is not applicable", () => {
    const naItem = item({ applicability: { applicable: false, rationale: "N/A", approvedBy: actorId, approvedAt: new Date() } });
    const result = runComplianceEngine(snapshotPayload([naItem]));
    const framework = result.frameworks[0]!;
    expect(framework.applicableCount).toBe(0);
    expect(framework.rawPercentage).toBeNull();
    expect(framework.displayPercentage).toContain("N/A");
  });

  it("test 16: multi-framework percentages calculated independently", () => {
    const soc2Item = item({ controlRef: controlRef({ frameworkKey: "SOC2", controlId: "CC6.1" }) });
    const isoItemSatisfied = item({ controlRef: controlRef({ frameworkKey: "ISO27001", controlId: "A.9.1" }) });
    const isoItemUnresolved = item({ controlRef: controlRef({ frameworkKey: "ISO27001", controlId: "A.9.2" }) });
    const payload = snapshotPayload([soc2Item, isoItemSatisfied, isoItemUnresolved], {
      findings: [
        { id: randomUUID(), assessmentItemId: isoItemUnresolved.id, testResultId: null, severity: "low", impact: null, likelihood: null, ownerId: null, dueAt: null, description: "gap", createdAt: new Date().toISOString() }
      ]
    } as never);
    const result = runComplianceEngine(payload);
    const soc2 = result.frameworks.find((f) => f.frameworkKey === "SOC2")!;
    const iso = result.frameworks.find((f) => f.frameworkKey === "ISO27001")!;
    expect(soc2.rawPercentage).toBe(100);
    expect(iso.applicableCount).toBe(2);
    expect(iso.rawPercentage).toBe(50);
  });

  it("test 17: harmonized controls shared across frameworks do not double count within one framework", () => {
    // Same harmonizedControlId, but two DIFFERENT source controls within the
    // same framework — each is its own assessment item/control and must be
    // counted once each, not merged into a single harmonized-control count.
    const itemA = item({ controlRef: controlRef({ controlId: "CC6.1", harmonizedControlId: "HARM-SHARED" }) });
    const itemB = item({ controlRef: controlRef({ controlId: "CC6.2", harmonizedControlId: "HARM-SHARED" }) });
    const result = runComplianceEngine(snapshotPayload([itemA, itemB]));
    expect(result.frameworks[0]?.applicableCount).toBe(2);
    expect(result.dispositions).toHaveLength(2);
  });

  it("assessment item not approved at snapshot time is treated as unresolved, not silently satisfied", () => {
    const notApproved = item({ status: "needs_changes" });
    const result = runComplianceEngine(snapshotPayload([notApproved]));
    expect(result.dispositions[0]?.disposition).toBe("unresolved");
  });

  it("every disposition and framework result carries a citation ID", () => {
    const result = runComplianceEngine(snapshotPayload([item()]));
    expect(result.dispositions[0]?.citationId).toMatch(/^CONTROL:/);
    expect(result.frameworks[0]?.citationId).toMatch(/^FRAMEWORK_COMPLIANCE:/);
  });
});
