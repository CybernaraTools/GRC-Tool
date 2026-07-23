import { expect, test } from "@playwright/test";
import {
  createPlatformAuthUser,
  createTenantWithEnabledFrameworks,
  createTestAuthUser,
  signInThroughUi
} from "./support/auth";

const tenantPlatformAdminScopes = [
  "audit_event:read",
  "assessment:read",
  "assessment:write",
  "assessment:review",
  "framework-content:read",
  "framework-content:write",
  "framework_diff:read",
  "framework_diff:write",
  "framework_update_impact:read",
  "framework_update_impact:write",
  "harmonization:read",
  "question_version:read",
  "ai_generation_run:read",
  "ai_generation_run:write",
  "ai_generation_run:review",
  "ai_question_version:read",
  "ai_question_version:write"
];

test.describe("F11 post-implementation repository and framework-scope regressions", () => {
  test.setTimeout(240_000);

  test("platform super-admin can load repository and global content-governance pages", async ({ page }) => {
    const platformUser = await createPlatformAuthUser();
    try {
      await signInThroughUi(page, platformUser, "/platform/questions");

      await expect(page.getByRole("heading", { name: "Question Repository", exact: true })).toBeVisible();
      await expect(page.getByText("Question repository could not be loaded")).toHaveCount(0);
      await expect(page.getByText("Expected string, received null")).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Governed question repository" })).toBeVisible();
      const questionVersionsTable = page.getByRole("table", { name: "Question versions" });
      await expect(questionVersionsTable).toBeVisible();
      await expect(page.getByText("Baseline seed batch size")).toHaveCount(0);
      await expect(page.getByText("Seed baseline questions")).toHaveCount(0);
      const repositoryFilters = page.getByRole("form", { name: "Question repository filters" });
      await expect(repositoryFilters.locator('input[name="search"]')).toBeVisible();
      await expect(repositoryFilters.locator('select[name="harmonizedControlId"]')).toBeVisible();
      await expect(repositoryFilters.locator('select[name="frameworkKey"]')).toBeVisible();
      await expect(page.getByText("Showing up to 20 questions per page")).toBeVisible();
      const repositoryRows = questionVersionsTable.locator("tbody tr");
      await expect(repositoryRows.first().locator("td").first()).toHaveText("1");
      expect(await repositoryRows.count()).toBeLessThanOrEqual(20);
      await repositoryRows.first().getByRole("link", { name: "Edit" }).click();
      await expect(page.getByRole("heading", { name: /Edit v\d+ as a new draft/ })).toBeVisible();
      await expect(page.locator('select[name="harmonizedControlSelector"]')).toBeEnabled();
      await expect(page.locator('select[name="responseType"] option')).toContainText(["Text", "Boolean", "Maturity", "Multi-select"]);

      await expect(page.getByRole("link", { name: "Framework Library" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Framework Updates" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Harmonization" })).toBeVisible();

      await page.getByRole("link", { name: "Framework Library" }).click();
      await expect(page.getByRole("heading", { name: "Framework Library" })).toBeVisible();
      await expect(page.getByText("Platform super-admin view: global catalog content only.")).toBeVisible();
      await expect(page.getByRole("button", { name: "Enable framework" })).toHaveCount(0);

      await page.getByRole("link", { name: "Harmonization" }).click();
      await expect(page.getByRole("heading", { name: "Harmonization Explorer" })).toBeVisible();
      await expect(page.getByText("Platform super-admin view: global harmonized controls and mappings only.")).toBeVisible();

      await page.getByRole("link", { name: "Framework Updates" }).click();
      await expect(page.getByRole("heading", { name: "Framework Update Analysis" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Available content packs" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Tenant impact queue hidden" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Run version comparison" })).toHaveCount(0);
    } finally {
      await platformUser.cleanup();
    }
  });

  test("tenant Platform Admin sees enabled-framework scope and unique assessment question options", async ({ page }) => {
    const tenant = await createTenantWithEnabledFrameworks(["SOC2", "ISO_27001"]);
    const tenantAdmin = await createTestAuthUser({
      tenantId: tenant.tenantId,
      roles: ["platform_admin"],
      clearance: "restricted",
      scopes: tenantPlatformAdminScopes
    });

    try {
      await signInThroughUi(page, tenantAdmin, "/assessments");

      await expect(page.getByRole("heading", { name: "Assessment Workspace" })).toBeVisible();
      await expect(page.getByText("Assessment workspace could not be loaded")).toHaveCount(0);
      await expect(page.getByRole("form", { name: "Create assessment scope" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Create assessment" })).toBeVisible();
      await expect(page.locator('[aria-label="Approved question selection context"]')).toBeVisible();

      const optionValues = await page
        .locator('select[name="questionVersionId"] option')
        .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
      expect(optionValues.length).toBeGreaterThan(0);
      expect(new Set(optionValues).size).toBe(optionValues.length);
      const firstOptionText = await page.locator('select[name="questionVersionId"] option').first().textContent();
      expect(firstOptionText).toMatch(/\[(Boolean|Text|Maturity|Multi-select) \| /);

      await page.goto("/ai");
      await expect(page.getByRole("heading", { name: "Governed AI Review" })).toBeVisible();
      await expect(page.getByLabel("Prompt Workspace", { exact: true })).toBeChecked();
      await expect(page.getByRole("checkbox", { name: "SOC2" })).toBeChecked();
      await expect(page.getByRole("checkbox", { name: "ISO_27001" })).toBeChecked();
      await expect(page.getByRole("checkbox", { name: "PCI_DSS" })).toHaveCount(0);
      await expect(page.getByRole("checkbox", { name: "HITRUST" })).toHaveCount(0);
      await expect(page.getByRole("checkbox", { name: "GDPR" })).toHaveCount(0);

      await page.goto("/harmonization?frameworkKey=SOC2");
      await expect(page.getByRole("heading", { name: "Harmonization Explorer" })).toBeVisible();
      await expect(page.getByText("Tenant view: harmonized controls and mappings are limited to frameworks enabled for this tenant.")).toBeVisible();
      await expect(page.locator('select[name="frameworkKey"] option')).toContainText(["Enabled frameworks only", "ISO_27001", "SOC2"]);
      await expect(page.locator('select[name="frameworkKey"] option', { hasText: "PCI_DSS" })).toHaveCount(0);
      await expect(page.locator('select[name="frameworkKey"] option', { hasText: "HITRUST" })).toHaveCount(0);

      await page.goto("/frameworks/updates");
      await expect(page.getByRole("heading", { name: "Framework Update Analysis" })).toBeVisible();
      await expect(page.locator('select[name="frameworkKey"] option')).toContainText(["ISO_27001", "SOC2"]);
      await expect(page.locator('select[name="frameworkKey"] option', { hasText: "PCI_DSS" })).toHaveCount(0);
      await expect(page.locator('select[name="frameworkKey"] option', { hasText: "HITRUST" })).toHaveCount(0);
    } finally {
      await tenantAdmin.cleanup();
      await tenant.cleanup();
    }
  });
});
