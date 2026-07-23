import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createTestAuthUser, signInThroughUi } from "./support/auth";

const f4Scopes = [
  "connector:read",
  "connector:write",
  "connector_sync_run:read",
  "connector_sync_run:write",
  "connector_object:read",
  "connector_object:write",
  "webhook_contract:read",
  "webhook_contract:write",
  "webhook_delivery:read",
  "webhook_delivery:write",
  "automated_control_test:read",
  "automated_control_test:write",
  "assurance_alert:read"
];

test.describe("F4 integrations and continuous assurance", () => {
  test.setTimeout(120_000);

  test("registers a secret-referenced connector and records assurance telemetry", async ({ page }) => {
    const user = await createTestAuthUser({ scopes: f4Scopes });
    try {
      await signInThroughUi(page, user, "/integrations");

      await expect(page.getByRole("heading", { name: "Integration Command Center" })).toBeVisible();
      await expect(page.getByText("Secret references only")).toBeVisible();

      await page.getByRole("button", { name: "Register connector" }).click();
      await expect(page).toHaveURL(/connectorId=/);
      await expect(page.getByRole("heading", { name: "Registered connectors" })).toBeVisible();
      await expect(page.getByText("secret://tenant/okta").first()).toBeVisible();

      await page.getByRole("button", { name: "Record sync status" }).click();
      await expect(page).toHaveURL(/syncRunId=/);
      await expect(page.locator("article").filter({ hasText: "Sync runs" })).toContainText("succeeded");

      await page.getByRole("button", { name: "Record connector object" }).click();
      await expect(page.getByText("Connector objects")).toBeVisible();

      await page.getByRole("button", { name: "Register webhook contract" }).click();
      await expect(page).toHaveURL(/webhookId=/);
      await expect(page.getByText("secret://tenant/webhooks/ticket-created").first()).toBeVisible();

      await page.getByRole("button", { name: "Record delivery" }).click();
      await expect(page.getByText("delivered").first()).toBeVisible();

      await page.getByRole("button", { name: "Record failing control test" }).click();
      await expect(page.getByText("Attention required")).toBeVisible();
      await expect(page.getByText("MFA missing.").first()).toBeVisible();

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
