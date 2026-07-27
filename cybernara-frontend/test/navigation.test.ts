import { describe, expect, it } from "vitest";
import { canAccessFeature } from "../src/lib/authorization";
import {
  operationalNavItems,
  visibleNavForRole,
  visibleNavForSession
} from "../src/lib/navigation";

const realFrontendRoutes = [
  "/",
  "/login",
  "/admin/users",
  "/audit",
  "/audit/verify",
  "/tasks",
  "/frameworks",
  "/frameworks/updates",
  "/harmonization",
  "/questions",
  "/dashboard",
  "/assessments",
  "/assessments/review",
  "/reports",
  "/findings",
  "/risks",
  "/ai",
  "/integrations",
  "/privacy",
  "/privacy/retention",
  "/enterprise"
];

describe("operational shell hardening helpers", () => {
  it("filters navigation by role", () => {
    const viewerItems = visibleNavForRole("viewer").map((item) => item.label);
    const adminItems = visibleNavForRole("platform_admin").map((item) => item.label);
    const auditorItems = visibleNavForRole("auditor").map((item) => item.label);

    expect(viewerItems).toEqual(["Tasks & Notifications", "Framework Library", "Harmonization", "Dashboard", "Audit Reports"]);
    expect(auditorItems).toContain("Audit Log");
    expect(auditorItems).toContain("Assessments");
    expect(auditorItems).toContain("Assessment Review");
    expect(adminItems).toContain("User Admin");
  });

  it("never declares a nav item whose href has no backing page route", () => {
    const danglingHrefs = operationalNavItems.map((item) => item.href).filter((href) => !realFrontendRoutes.includes(href));
    expect(danglingHrefs).toEqual([]);
  });

  it("filters navigation by session role", () => {
    expect(
      visibleNavForSession({
        roles: ["platform_admin"],
        scopes: []
      }).length
    ).toBeGreaterThan(0);
  });

  it("requires role for feature access", () => {
    const privacyUser = {
      roles: ["compliance_manager"],
      scopes: []
    };

    expect(canAccessFeature(privacyUser, "privacy")).toBe(true);
    expect(canAccessFeature({ ...privacyUser, roles: ["viewer"] }, "privacy")).toBe(false);
  });
});
