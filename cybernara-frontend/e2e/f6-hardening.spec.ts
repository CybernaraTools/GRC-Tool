import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createTestAuthUser, signInThroughUi } from "./support/auth";

const privacyReadScopes = [
  "data_inventory_record:read",
  "processing_activity:read",
  "dpia_assessment:read",
  "privacy_rights_request:read",
  "consent_record:read",
  "privacy_incident:read",
  "retention_schedule:read"
];

const enterpriseReadScopes = [
  "policy_version:read",
  "access_review:read",
  "vendor:read",
  "audit_engagement:read",
  "trust_center_artifact:read",
  "grc_workspace:read",
  "custom_object_definition:read"
];

test.describe("F6 role and scope hardening", () => {
  test.setTimeout(120_000);

  test("viewer role cannot see or open manager-only Privacy Operations", async ({ page }) => {
    const user = await createTestAuthUser({
      roles: ["viewer"],
      scopes: ["audit_event:read", ...privacyReadScopes, ...enterpriseReadScopes]
    });
    try {
      await signInThroughUi(page, user, "/audit");
      const primaryNav = page.getByRole("navigation", { name: "Primary navigation" });
      await expect(primaryNav).toBeVisible();
      await expect(primaryNav).not.toContainText("Privacy Operations");
      await expect(primaryNav).not.toContainText("Enterprise GRC");

      await page.goto("/privacy");
      await expect(page.getByRole("heading", { name: "Privacy Operations" })).toBeVisible();
      await expect(page.locator(".errorState")).toContainText("Feature access unavailable");
      await expect(page.getByRole("button", { name: "Create processing activity" })).toHaveCount(0);
    } finally {
      await user.cleanup();
    }
  });

  test("read-only privacy user can browse but sees no mutating actions", async ({ page }) => {
    const user = await createTestAuthUser({ roles: ["compliance_manager"], scopes: privacyReadScopes });
    try {
      await signInThroughUi(page, user, "/privacy");
      await expect(page.getByRole("heading", { name: "Privacy Operations" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Create processing activity" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Create rights request" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Withdraw consent" })).toHaveCount(0);

      const results = await new AxeBuilder({ page }).analyze();
      expect(seriousViolations(results.violations)).toEqual([]);
    } finally {
      await user.cleanup();
    }
  });

  test("auditor can browse enterprise records but cannot mutate them", async ({ page }) => {
    const user = await createTestAuthUser({ roles: ["auditor"], scopes: enterpriseReadScopes });
    try {
      await signInThroughUi(page, user, "/enterprise");
      await expect(page.getByRole("heading", { name: "Enterprise GRC" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Draft policy" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Create vendor record" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Record trust download" })).toHaveCount(0);

      const results = await new AxeBuilder({ page }).analyze();
      expect(seriousViolations(results.violations)).toEqual([]);
    } finally {
      await user.cleanup();
    }
  });
});

function seriousViolations(violations: Array<{ id: string; impact?: string | null }>): string[] {
  return violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => violation.id);
}
