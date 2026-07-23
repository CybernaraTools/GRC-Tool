import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createTestAuthUser, signInThroughUi } from "./support/auth";

const f5Scopes = [
  "data_inventory_record:read",
  "data_inventory_record:write",
  "processing_activity:read",
  "processing_activity:write",
  "dpia_assessment:read",
  "dpia_assessment:write",
  "privacy_rights_request:read",
  "privacy_rights_request:write",
  "consent_record:read",
  "consent_record:write",
  "privacy_incident:read",
  "privacy_incident:write",
  "retention_schedule:read",
  "retention_schedule:write",
  "policy_version:read",
  "policy_version:write",
  "access_review:read",
  "access_review:write",
  "vendor:read",
  "vendor:write",
  "audit_engagement:read",
  "audit_engagement:write",
  "trust_center_artifact:read",
  "trust_center_artifact:write",
  "grc_workspace:read",
  "grc_workspace:write",
  "risk_model:read",
  "risk_model:write",
  "risk:read",
  "risk:write",
  "custom_object_definition:read",
  "custom_object_definition:write"
];

test.describe("F5 privacy operations and enterprise GRC", () => {
  test.setTimeout(300_000);

  test("runs privacy workflows through real protected screens", async ({ page }) => {
    const user = await createTestAuthUser({ scopes: f5Scopes });
    try {
      await signInThroughUi(page, user, "/privacy");

      await expect(page.getByRole("heading", { name: "Privacy Operations" })).toBeVisible();
      await page.getByRole("button", { name: "Create processing activity" }).click();
      await expect(page).toHaveURL(/processingId=/);
      await expect(page.getByText("Customer support").first()).toBeVisible();

      await page.getByRole("button", { name: "Create inventory record" }).click();
      await expect(page.getByText("restricted").first()).toBeVisible();

      await page.getByRole("button", { name: "Create DPIA assessment" }).click();
      await expect(page.locator("article").filter({ hasText: "Latest DPIA risk" })).toContainText("72 residual score");

      await page.getByRole("button", { name: "Create rights request" }).click();
      await expect(page).toHaveURL(/rightsId=/);
      await page.getByRole("button", { name: "Verify identity" }).click();
      await expect(page.locator("article").filter({ hasText: "Identity verified" })).toContainText("Yes");
      await page.getByRole("button", { name: "Add search task" }).click();
      await expect(page.locator("article").filter({ hasText: "Identity verified" })).toContainText("1 search tasks");
      await page.getByRole("button", { name: "Complete rights request" }).click();
      await expect(page.locator("article").filter({ hasText: "Selected rights request" })).toContainText("completed");

      await page.getByRole("button", { name: "Grant consent" }).click();
      await expect(page).toHaveURL(/consentId=/);
      await page.getByRole("button", { name: "Withdraw consent" }).click();
      await expect(page.locator("article").filter({ hasText: "Latest consent" })).toContainText("withdrawn");

      await page.getByRole("button", { name: "Create privacy incident" }).click();
      await expect(page.locator("article").filter({ hasText: "Latest incident severity" })).toContainText("high");
      await page.getByRole("button", { name: "Create retention schedule" }).click();
      await expect(page.locator("article").filter({ hasText: "Evaluation at 48 months" })).toContainText("legal_hold_exception");

      const privacyAxe = await new AxeBuilder({ page }).analyze();
      expect(seriousViolations(privacyAxe.violations)).toEqual([]);
    } finally {
      await user.cleanup();
    }
  });

  test("runs enterprise workflows through real protected screens", async ({ page }) => {
    const user = await createTestAuthUser({ scopes: f5Scopes });
    try {
      await signInThroughUi(page, user, "/enterprise");
      await expect(page.getByRole("heading", { name: "Enterprise GRC" })).toBeVisible();

      await page.getByRole("button", { name: "Draft policy" }).click();
      await expect(page).toHaveURL(/policyId=/);
      await expect(page.locator("article").filter({ hasText: "Selected policy" })).toContainText("draft");
      await page.getByRole("button", { name: "Publish selected policy" }).click();
      await expect(page.locator("article").filter({ hasText: "Selected policy" })).toContainText("published");
      await page.getByRole("button", { name: "Add policy exception" }).click();
      await expect(page.locator("article").filter({ hasText: "Exceptions" })).toContainText("1");

      await page.getByRole("button", { name: "Create access review" }).click();
      await expect(page.locator("article").filter({ hasText: "Latest review" })).toContainText("okta-prod");
      await page.getByRole("button", { name: "Create vendor record" }).click();
      await expect(page.locator("article").filter({ hasText: "Latest vendor" })).toContainText("Support Processor");
      await page.getByRole("button", { name: "Create audit engagement" }).click();
      await expect(page.locator("article").filter({ hasText: "Latest audit" })).toContainText("FY26 SOC 2 Readiness");

      await page.getByRole("button", { name: "Publish trust artifact" }).click();
      await expect(page).toHaveURL(/artifactId=/);
      await page.getByRole("button", { name: "Record trust download" }).click();
      await expect(page.locator("article").filter({ hasText: "Selected artifact" })).toContainText("1 downloads recorded");
      await page.getByRole("button", { name: "Create workspace" }).click();
      await expect(page.locator("article").filter({ hasText: "Latest workspace" })).toContainText("North America");
      await page.getByRole("button", { name: "Create custom object definition" }).click();
      await expect(page.locator("article").filter({ hasText: "Latest custom object" })).toContainText("local_regulator_action");

      const riskModelKey = `COSO-E2E-${Date.now()}`;
      const riskKey = `R-E2E-${Date.now()}`;
      const riskModelForm = page.getByRole("form", { name: "Create risk model" });
      await riskModelForm.getByLabel("Model key").fill(riskModelKey);
      await riskModelForm.getByLabel("Version").fill("v1");
      await riskModelForm.getByRole("button", { name: "Create risk model" }).click();
      await expect(page.locator("article").filter({ hasText: "Risk models" })).toContainText(riskModelKey);

      const riskForm = page.getByRole("form", { name: "Register risk" });
      await riskForm.getByLabel("Risk key").fill(riskKey);
      await riskForm.getByLabel("Inherent score (0-100)").fill("75");
      await riskForm.getByLabel("Title").fill("Unauthorized data access");
      await riskForm.getByRole("button", { name: "Register risk" }).click();
      await expect(page.locator("article").filter({ hasText: "Top risk" })).toContainText(riskKey);

      const enterpriseAxe = await new AxeBuilder({ page }).analyze();
      expect(seriousViolations(enterpriseAxe.violations)).toEqual([]);
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
