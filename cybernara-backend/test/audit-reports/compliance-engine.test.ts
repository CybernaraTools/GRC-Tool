import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  runComplianceEngine,
  type ComplianceEngineFinding,
  type ComplianceEngineInput,
  type ComplianceEngineItem,
  type ComplianceEngineRemediationTask,
  type ComplianceEngineRiskAcceptance
} from "../../src/modules/audit-reports/domain/compliance-engine.js";

function controlItem(overrides: Partial<ComplianceEngineItem> = {}): ComplianceEngineItem {
  return {
    itemId: randomUUID(),
    status: "approved",
    applicability: { applicable: true },
    controlRef: {
      frameworkKey: "SOC2",
      frameworkVersion: "v1",
      controlId: "CC6.1",
      harmonizedControlId: "HARM-1"
    },
    ...overrides
  };
}

function input(overrides: Partial<ComplianceEngineInput> = {}): ComplianceEngineInput {
  return {
    items: [],
    findings: [],
    remediationTasks: [],
    riskAcceptances: [],
    ...overrides
  };
}

describe("deterministic compliance engine (platform-wide, live data)", () => {
  it("test 11: no findings -> satisfied and compliant", () => {
    const result = runComplianceEngine(input({ items: [controlItem()] }));
    expect(result.dispositions[0]?.disposition).toBe("satisfied");
    expect(result.frameworks[0]?.satisfiedCount).toBe(1);
    expect(result.frameworks[0]?.rawPercentage).toBe(100);
  });

  it("test 12: verified remediation counts as compliant", () => {
    const oneItem = controlItem();
    const findingId = randomUUID();
    const findings: ComplianceEngineFinding[] = [{ id: findingId, assessmentItemId: oneItem.itemId }];
    const remediationTasks: ComplianceEngineRemediationTask[] = [
      { id: randomUUID(), findingId, status: "verified", reviews: [{ decision: "approved" }] }
    ];
    const result = runComplianceEngine(input({ items: [oneItem], findings, remediationTasks }));
    expect(result.dispositions[0]?.disposition).toBe("remediation_verified");
    expect(result.frameworks[0]?.remediatedCount).toBe(1);
    expect(result.frameworks[0]?.rawPercentage).toBe(100);
  });

  it("test 13: accepted residual risk does NOT count as compliant", () => {
    const oneItem = controlItem();
    const findingId = randomUUID();
    const findings: ComplianceEngineFinding[] = [{ id: findingId, assessmentItemId: oneItem.itemId }];
    const riskAcceptances: ComplianceEngineRiskAcceptance[] = [{ findingId, active: true }];
    const result = runComplianceEngine(input({ items: [oneItem], findings, riskAcceptances }));
    expect(result.dispositions[0]?.disposition).toBe("accepted_residual_risk");
    expect(result.frameworks[0]?.acceptedRiskCount).toBe(1);
    expect(result.frameworks[0]?.rawPercentage).toBe(0);
  });

  it("test 14: unresolved finding does NOT count as compliant", () => {
    const oneItem = controlItem();
    const findings: ComplianceEngineFinding[] = [{ id: randomUUID(), assessmentItemId: oneItem.itemId }];
    const result = runComplianceEngine(input({ items: [oneItem], findings }));
    expect(result.dispositions[0]?.disposition).toBe("unresolved");
    expect(result.frameworks[0]?.unresolvedCount).toBe(1);
    expect(result.frameworks[0]?.rawPercentage).toBe(0);
  });

  it("test 15: not-applicable control excluded from denominator", () => {
    const applicableItem = controlItem();
    const naItem = controlItem({ applicability: { applicable: false } });
    const result = runComplianceEngine(input({ items: [applicableItem, naItem] }));
    const framework = result.frameworks[0]!;
    expect(framework.notApplicableCount).toBe(1);
    expect(framework.applicableCount).toBe(1);
    expect(framework.rawPercentage).toBe(100);
  });

  it("protects against division by zero when every control is not applicable", () => {
    const naItem = controlItem({ applicability: { applicable: false } });
    const result = runComplianceEngine(input({ items: [naItem] }));
    const framework = result.frameworks[0]!;
    expect(framework.applicableCount).toBe(0);
    expect(framework.rawPercentage).toBeNull();
    expect(framework.displayPercentage).toContain("N/A");
  });

  it("test 16: multi-framework percentages calculated independently", () => {
    const soc2Item = controlItem({ controlRef: { frameworkKey: "SOC2", frameworkVersion: "v1", controlId: "CC6.1", harmonizedControlId: "HARM-1" } });
    const isoItemSatisfied = controlItem({ controlRef: { frameworkKey: "ISO27001", frameworkVersion: "v1", controlId: "A.9.1", harmonizedControlId: "HARM-2" } });
    const isoItemUnresolved = controlItem({ controlRef: { frameworkKey: "ISO27001", frameworkVersion: "v1", controlId: "A.9.2", harmonizedControlId: "HARM-3" } });
    const findings: ComplianceEngineFinding[] = [{ id: randomUUID(), assessmentItemId: isoItemUnresolved.itemId }];
    const result = runComplianceEngine(input({ items: [soc2Item, isoItemSatisfied, isoItemUnresolved], findings }));
    const soc2 = result.frameworks.find((f) => f.frameworkKey === "SOC2")!;
    const iso = result.frameworks.find((f) => f.frameworkKey === "ISO27001")!;
    expect(soc2.rawPercentage).toBe(100);
    expect(iso.applicableCount).toBe(2);
    expect(iso.rawPercentage).toBe(50);
  });

  it("test 17: harmonized controls shared across frameworks do not double count within one framework", () => {
    const itemA = controlItem({ controlRef: { frameworkKey: "SOC2", frameworkVersion: "v1", controlId: "CC6.1", harmonizedControlId: "HARM-SHARED" } });
    const itemB = controlItem({ controlRef: { frameworkKey: "SOC2", frameworkVersion: "v1", controlId: "CC6.2", harmonizedControlId: "HARM-SHARED" } });
    const result = runComplianceEngine(input({ items: [itemA, itemB] }));
    expect(result.frameworks[0]?.applicableCount).toBe(2);
    expect(result.dispositions).toHaveLength(2);
  });

  it("assessment item not approved is treated as unresolved, not silently satisfied", () => {
    const notApproved = controlItem({ status: "needs_changes" });
    const result = runComplianceEngine(input({ items: [notApproved] }));
    expect(result.dispositions[0]?.disposition).toBe("unresolved");
  });

  it("every disposition and framework result carries a citation ID", () => {
    const result = runComplianceEngine(input({ items: [controlItem()] }));
    expect(result.dispositions[0]?.citationId).toMatch(/^CONTROL:/);
    expect(result.frameworks[0]?.citationId).toMatch(/^FRAMEWORK_COMPLIANCE:/);
  });
});
