import { describe, expect, it } from "vitest";
import { canAccessFeature, canPerform } from "../src/lib/authorization";
import {
  operationalNavItems,
  redactSensitiveError,
  uploadAccessState,
  visibleNavForRole,
  visibleNavForSession
} from "../src/lib/navigation";

// Every route the frontend actually implements, per its app/ directory. If a NavItem's href
// isn't in this list, it's a dangling link (see the "Evidence Vault" / "Administration" defect:
// both were declared as visible nav entries with no backing app/**/page.tsx behind them).
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
  "/assessments",
  "/assessments/review",
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

    expect(viewerItems).toEqual(["My Tasks", "Framework Library", "Harmonization", "Assessments", "Enterprise GRC"]);
    expect(visibleNavForRole("auditor").map((item) => item.label)).toContain("Audit Log");
    expect(adminItems).toContain("Enterprise GRC");
  });

  it("never declares a nav item whose href has no backing page route", () => {
    const danglingHrefs = operationalNavItems.map((item) => item.href).filter((href) => !realFrontendRoutes.includes(href));
    expect(danglingHrefs).toEqual([]);
  });

  it("filters navigation by the same session scopes sent to the backend policy guard", () => {
    expect(
      visibleNavForSession({
        roles: ["platform_admin"],
        scopes: ["audit_event:read", "framework-content:read"]
      }).map((item) => item.label)
    ).toEqual(["Audit Log", "Framework Library"]);

    expect(canPerform({ roles: ["compliance_manager"], scopes: ["privacy_rights_request:read"] }, "privacy_rights_request:write")).toBe(false);
  });

  it("requires both role and read scopes for feature access", () => {
    const privacyReader = {
      roles: ["compliance_manager"],
      scopes: [
        "data_inventory_record:read",
        "processing_activity:read",
        "dpia_assessment:read",
        "privacy_rights_request:read",
        "consent_record:read",
        "privacy_incident:read",
        "retention_schedule:read"
      ]
    };

    expect(canAccessFeature(privacyReader, "privacy")).toBe(true);
    expect(canAccessFeature({ ...privacyReader, roles: ["viewer"] }, "privacy")).toBe(false);
  });

  it("keeps evidence inaccessible until the upload scan is clean", () => {
    expect(uploadAccessState("quarantined")).toEqual({
      accessible: false,
      label: "Quarantined pending validation"
    });
    expect(uploadAccessState("clean").accessible).toBe(true);
  });

  it("redacts secrets from browser-safe errors", () => {
    expect(
      redactSensitiveError("failed with sk-live-secret and Bearer ey.secret.token from secret://tenant/key")
    ).toBe("failed with [redacted-api-key] and Bearer [redacted-token] from secret://[redacted]");
  });
});
