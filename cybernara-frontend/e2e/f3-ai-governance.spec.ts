import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createTestAuthUser, signInThroughUi } from "./support/auth";

const f3Scopes = [
  "ai_generation_run:read",
  "ai_generation_run:write",
  "ai_generation_run:review",
  "ai_question_version:read",
  "ai_question_version:write"
];

test.describe("F3 governed AI surfaces", () => {
  test.setTimeout(120_000);

  test("requires human approval before publishing AI-origin assessment questions", async ({ page }) => {
    const user = await createTestAuthUser({ scopes: f3Scopes });
    try {
      await signInThroughUi(page, user, "/ai");

      await expect(page.getByRole("heading", { name: "Governed AI Review" })).toBeVisible();
      await expect(page.getByText("Advisory, human-gated")).toBeVisible();
      await expect(page.getByLabel("Prompt Workspace", { exact: true })).toBeChecked();

      await page.getByRole("button", { name: "Generate with OpenAI" }).click();
      await expect(page).toHaveURL(/generationRunId=/);
      const generatedSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Questions for this focus" }) });
      await expect(generatedSection).toBeVisible();
      await expect(generatedSection.getByText("Multi-factor authentication enforcement")).toBeVisible();
      await expect(generatedSection.getByRole("list", { name: "Questions generated for the selected focus" })).toBeVisible();
      await expect(generatedSection.getByText("evidence expectations").first()).toBeVisible();
      await expect(page.getByText("pending_review").first()).toBeVisible();

      const publishButton = page.getByRole("button", { name: "Publish approved question" });
      await expect(publishButton).toBeDisabled();

      await page.getByRole("button", { name: "Approve as human reviewer" }).click();
      await expect(page).toHaveURL(/reviewed=1/);
      await expect(page.getByText("Human review recorded")).toBeVisible();
      await expect(publishButton).toBeEnabled();

      await publishButton.click();
      await expect(page).toHaveURL(/published=1/);
      await expect(page.getByText("Question published after human approval.")).toBeVisible();
      await expect(page.getByRole("navigation", { name: "pending AI questions pagination" })).toBeVisible();
      const approvedSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Human-approved AI questions" }) });
      await expect(approvedSection).toBeVisible();
      await expect(approvedSection.getByText("approved").first()).toBeVisible();
      await expect(page.getByRole("navigation", { name: "approved AI questions pagination" })).toBeVisible();

      await page.getByLabel("Fallback", { exact: true }).check();
      await expect(page.getByLabel("Fallback", { exact: true })).toBeChecked();
      await page.getByRole("button", { name: "Trigger fallback generation" }).click();
      await expect(page).toHaveURL(/fallback=1/);
      await expect(page.getByText("Fallback path active")).toBeVisible();

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
