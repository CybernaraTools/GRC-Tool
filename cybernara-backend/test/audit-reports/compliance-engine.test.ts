import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  runComplianceEngine,
  type ComplianceEngineFinding,
  type ComplianceEngineInput,
  type ComplianceEngineItem
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
    ...overrides
  };
}

describe("deterministic compliance engine (review-outcome based, not re-derived from findings)", () => {
  it("an approved item with no findings counts as approved and compliant", () => {
    const result = runComplianceEngine(input({ items: [controlItem()] }));
    expect(result.dispositions[0]?.disposition).toBe("approved");
    expect(result.dispositions[0]?.findingCount).toBe(0);
    expect(result.frameworks[0]?.approvedCount).toBe(1);
    expect(result.frameworks[0]?.rawPercentage).toBe(100);
  });

  it("an approved item with open findings still counts as approved - findings are informational, not a second scoring pass", () => {
    const oneItem = controlItem();
    const findings: ComplianceEngineFinding[] = [
      { id: randomUUID(), assessmentItemId: oneItem.itemId },
      { id: randomUUID(), assessmentItemId: oneItem.itemId }
    ];
    const result = runComplianceEngine(input({ items: [oneItem], findings }));
    expect(result.dispositions[0]?.disposition).toBe("approved");
    expect(result.dispositions[0]?.findingCount).toBe(2);
    expect(result.dispositions[0]?.reason).toContain("2 associated finding");
    expect(result.frameworks[0]?.approvedCount).toBe(1);
    expect(result.frameworks[0]?.rawPercentage).toBe(100);
  });

  it("an item that was never approved by the reviewer counts as not approved, regardless of findings", () => {
    const notApproved = controlItem({ status: "needs_changes" });
    const result = runComplianceEngine(input({ items: [notApproved] }));
    expect(result.dispositions[0]?.disposition).toBe("not_approved");
    expect(result.frameworks[0]?.notApprovedCount).toBe(1);
    expect(result.frameworks[0]?.rawPercentage).toBe(0);
  });

  it("not-applicable control excluded from denominator", () => {
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

  it("multi-framework percentages calculated independently", () => {
    const soc2Item = controlItem({ controlRef: { frameworkKey: "SOC2", frameworkVersion: "v1", controlId: "CC6.1", harmonizedControlId: "HARM-1" } });
    const isoItemApproved = controlItem({ controlRef: { frameworkKey: "ISO27001", frameworkVersion: "v1", controlId: "A.9.1", harmonizedControlId: "HARM-2" } });
    const isoItemNotApproved = controlItem({
      status: "needs_changes",
      controlRef: { frameworkKey: "ISO27001", frameworkVersion: "v1", controlId: "A.9.2", harmonizedControlId: "HARM-3" }
    });
    const result = runComplianceEngine(input({ items: [soc2Item, isoItemApproved, isoItemNotApproved] }));
    const soc2 = result.frameworks.find((f) => f.frameworkKey === "SOC2")!;
    const iso = result.frameworks.find((f) => f.frameworkKey === "ISO27001")!;
    expect(soc2.rawPercentage).toBe(100);
    expect(iso.applicableCount).toBe(2);
    expect(iso.rawPercentage).toBe(50);
  });

  it("harmonized controls shared across frameworks do not double count within one framework", () => {
    const itemA = controlItem({ controlRef: { frameworkKey: "SOC2", frameworkVersion: "v1", controlId: "CC6.1", harmonizedControlId: "HARM-SHARED" } });
    const itemB = controlItem({ controlRef: { frameworkKey: "SOC2", frameworkVersion: "v1", controlId: "CC6.2", harmonizedControlId: "HARM-SHARED" } });
    const result = runComplianceEngine(input({ items: [itemA, itemB] }));
    expect(result.frameworks[0]?.applicableCount).toBe(2);
    expect(result.dispositions).toHaveLength(2);
  });

  it("findings on a not-applicable item are still counted and surfaced, but disposition stays not_applicable", () => {
    const naItem = controlItem({ applicability: { applicable: false } });
    const findings: ComplianceEngineFinding[] = [{ id: randomUUID(), assessmentItemId: naItem.itemId }];
    const result = runComplianceEngine(input({ items: [naItem], findings }));
    expect(result.dispositions[0]?.disposition).toBe("not_applicable");
    expect(result.dispositions[0]?.findingCount).toBe(1);
    expect(result.dispositions[0]?.reason).toContain("1 associated finding");
  });

  it("every disposition and framework result carries a citation ID", () => {
    const result = runComplianceEngine(input({ items: [controlItem()] }));
    expect(result.dispositions[0]?.citationId).toMatch(/^CONTROL:/);
    expect(result.frameworks[0]?.citationId).toMatch(/^FRAMEWORK_COMPLIANCE:/);
  });
});
