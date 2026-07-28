import { describe, expect, it } from "vitest";
import { computeNotifications } from "../../src/modules/notification-hub/domain/notification.js";

describe("notification ownership", () => {
  it("matches assessment owners through alternate actor IDs", () => {
    const notifications = computeNotifications({
      role: "compliance_manager",
      actorId: "00000000-0000-4000-8000-000000000001",
      actorIds: ["00000000-0000-4000-8000-000000000002"],
      items: [
        {
          itemId: "00000000-0000-4000-8000-000000000010",
          assessmentId: "00000000-0000-4000-8000-000000000020",
          scopeName: "FY26 readiness",
          assessmentStatus: "not_started",
          itemStatus: "not_started",
          applicable: true,
          ownerId: "00000000-0000-4000-8000-000000000002",
          frameworkKey: "SOC2",
          controlId: "CC1.1",
          referenceAt: "2026-07-28T00:00:00.000Z"
        }
      ],
      remediations: [],
      assessments: []
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].category).toBe("pending_answer");
  });

  it("groups multi-framework pending answers into one assessment notification", () => {
    const notifications = computeNotifications({
      role: "compliance_manager",
      actorId: "00000000-0000-4000-8000-000000000001",
      items: [
        pendingAssessmentItem("00000000-0000-4000-8000-000000000010", "ISO_27001", "8"),
        pendingAssessmentItem("00000000-0000-4000-8000-000000000011", "E8", "ADMIN-PRIV-13"),
        pendingAssessmentItem("00000000-0000-4000-8000-000000000012", "HITRUST", "10.a Security Requirements Analysis and Specification"),
        pendingAssessmentItem("00000000-0000-4000-8000-000000000013", "PCI_DSS", "6.1"),
        pendingAssessmentItem("00000000-0000-4000-8000-000000000014", "SOC2", "CC8.2")
      ],
      remediations: [],
      assessments: []
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      id: "pending_answer:00000000-0000-4000-8000-000000000020",
      title: "Submit answer & evidence for Test Assessment 7"
    });
    expect(notifications[0].description).toContain("5 framework mappings");
    expect(notifications[0].description).toContain("ISO_27001 8");
    expect(notifications[0].description).toContain("SOC2 CC8.2");
  });

  it("groups multi-framework review items into one assessment notification for auditors", () => {
    const notifications = computeNotifications({
      role: "auditor",
      actorId: "00000000-0000-4000-8000-000000000001",
      items: [
        pendingAssessmentItem("00000000-0000-4000-8000-000000000010", "ISO_27001", "8", "submitted"),
        pendingAssessmentItem("00000000-0000-4000-8000-000000000011", "E8", "ADMIN-PRIV-13", "submitted"),
        pendingAssessmentItem("00000000-0000-4000-8000-000000000012", "HITRUST", "10.a Security Requirements Analysis and Specification", "submitted"),
        pendingAssessmentItem("00000000-0000-4000-8000-000000000013", "PCI_DSS", "6.1", "submitted"),
        pendingAssessmentItem("00000000-0000-4000-8000-000000000014", "SOC2", "CC8.2", "submitted")
      ],
      remediations: [],
      assessments: []
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      id: "review_item:00000000-0000-4000-8000-000000000020",
      title: "Review required: answer submitted for Test Assessment 7"
    });
    expect(notifications[0].description).toContain("5 framework mappings");
    expect(notifications[0].description).toContain("ISO_27001 8");
    expect(notifications[0].description).toContain("SOC2 CC8.2");
  });
});

function pendingAssessmentItem(itemId: string, frameworkKey: string, controlId: string, itemStatus = "not_started") {
  return {
    itemId,
    assessmentId: "00000000-0000-4000-8000-000000000020",
    scopeName: "Test Assessment 7",
    assessmentStatus: "not_started",
    itemStatus,
    applicable: true,
    ownerId: "00000000-0000-4000-8000-000000000001",
    frameworkKey,
    controlId,
    referenceAt: "2026-07-28T00:00:00.000Z"
  };
}
