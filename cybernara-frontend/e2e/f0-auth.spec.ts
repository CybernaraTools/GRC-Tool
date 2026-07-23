import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createTestAuthUser, signInThroughUi } from "./support/auth";

test.describe("F0 Supabase Auth flow", () => {
  test("login screen has no serious axe violations", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in to Cybernara" })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(seriousViolations(results.violations)).toEqual([]);
  });

  test("protected audit route redirects to login with the original destination", async ({ page }) => {
    await page.goto("/audit?eventType=audit.login");
    await expect(page.getByRole("heading", { name: "Sign in to Cybernara" })).toBeVisible();
    await expect(page).toHaveURL(/\/login\?next=%2Faudit%3FeventType%3Daudit\.login/);
  });

  test("signs in and signs out through a real Supabase email/password session", async ({ page }) => {
    const user = await createTestAuthUser();
    try {
      await signInThroughUi(page, user);

      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole("heading", { name: "Cybernara Operations Console" })).toBeVisible();
      await expect(page.getByLabel("Signed-in user")).toContainText(user.email);

      const results = await new AxeBuilder({ page }).analyze();
      expect(seriousViolations(results.violations)).toEqual([]);

      await page.getByRole("button", { name: "Sign out" }).click();
      await expect(page.getByRole("heading", { name: "Sign in to Cybernara" })).toBeVisible();

      await page.goto("/");
      await expect(page.getByRole("heading", { name: "Sign in to Cybernara" })).toBeVisible();
      await expect(page).toHaveURL(/\/login\?next=%2F/);
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
