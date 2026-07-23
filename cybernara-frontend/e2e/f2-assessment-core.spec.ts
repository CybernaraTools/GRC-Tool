import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createTenantWithEnabledFrameworks, createTestAuthUser, signInThroughUi } from "./support/auth";
import { uploadEvidenceFile } from "./support/evidence";

const f2Scopes = [
  "audit_event:read",
  "assessment:read",
  "assessment:write",
  "assessment:review",
  "evidence_object:read",
  "evidence_object:write",
  "evidence_version:read",
  "evidence_link:read",
  "evidence_link:write",
  "finding:read",
  "finding:write",
  "remediation_task:read",
  "remediation_task:write",
  "report_export:read",
  "report_export:write"
];

test.describe("F2 assessment core workflow", () => {
  // Each form submission here is a real server action -> BFF proxy -> NestJS -> Supabase round
  // trip followed by a full server-rendered page reload (observed ~9-12s per mutating click via
  // trace inspection, not a hang — TenantScopedDb.withTenant's per-call connect/begin/commit/
  // release cost, the same latency source already documented elsewhere in this campaign). This
  // flow chains create + 4 evidence-lifecycle actions + applicability + 2 answer submissions + 2
  // reviews + reopen + 2 test-procedure actions + close + 2 more mutations — comfortably exceeds
  // the default 120s budget once G-01's new history/test-procedure/sign-off sections added their
  // own read calls to every page load.
  test.setTimeout(300_000);

  test("creates an assessment, reviews evidence, closes the scope, and requests a report", async ({ page }) => {
    const tenant = await createTenantWithEnabledFrameworks(["SOC2"]);
    const preparer = await createTestAuthUser({ tenantId: tenant.tenantId, scopes: f2Scopes });
    const reviewer = await createTestAuthUser({ tenantId: tenant.tenantId, scopes: f2Scopes });
    try {
      await signInThroughUi(page, preparer, "/assessments");

      await expect(page.getByRole("heading", { name: "Assessment Workspace" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Workspace overview" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Create assessment scope" })).toBeVisible();
      await expect(page.getByRole("table", { name: /Draft/ })).toBeVisible();

      await page.getByRole("button", { name: "Create assessment" }).click();
      await expect(page).toHaveURL(/assessmentId=/);
      await expect(page.getByRole("heading", { name: "FY26 readiness" }).first()).toBeVisible();
      const questionSummary = page.getByLabel("Assessment question summary");
      await expect(questionSummary).toBeVisible();
      await expect(questionSummary.getByText("Question type")).toBeVisible();
      await expect(questionSummary.getByText("Frameworks")).toBeVisible();
      await expect(questionSummary.getByText("Harmonized control")).toBeVisible();
      await expect(questionSummary.getByText("Source control")).toBeVisible();
      await expect(questionSummary.getByText("Evidence required")).toBeVisible();
      await expect(page.getByText("AI provenance")).toHaveCount(0);
      await expect(page.getByText("Question version", { exact: true })).toHaveCount(0);

      await uploadEvidenceFile(page);
      await expect(page).toHaveURL(/evidenceId=/);
      await expect(page.getByRole("heading", { name: "Quarantine, scan, and submit evidence" })).toBeVisible();
      await expect(page.getByText("committed").first()).toBeVisible();
      await expect(page.getByText("Committed hash")).toBeVisible();
      await expect(page.getByText("Live scan status")).toBeVisible();
      await expect(page.getByText("committed").last()).toBeVisible();
      await expect(page.getByRole("button", { name: "Check reuse" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Approve applicability" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Approve item" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Create finding" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Request report export" })).toHaveCount(0);

      await page.getByRole("button", { name: "Submit answer" }).click();
      await expect(itemStatus(page)).toHaveText("submitted");

      let selectedPath = selectedReviewPath(page.url());
      await page.context().clearCookies();
      await signInThroughUi(page, reviewer, selectedPath);
      await expect(page.getByRole("heading", { name: "Assessment Review", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Evidence checks and reuse" })).toBeVisible();
      await expect(page.getByRole("form", { name: "Upload evidence file" })).toHaveCount(0);
      await page.getByRole("button", { name: "Check reuse" }).click();
      await expect(page.getByText("Reuse check result: Reusable")).toBeVisible();

      // G-01 Final Completion Pass: the applicability decision just approved must show up in the
      // real applicability-decision history section, not just as a status flag.
      await expect(page.getByRole("heading", { name: "Answer, applicability, and review history" })).toBeVisible();
      await expect(page.getByText("Selected enabled framework, harmonized control, and approved question are in scope for this assessment.").first()).toBeVisible();

      // The real answer-revision history (append-only, not just the latest overwritten value).
      await expect(page.getByText("Rev 1").first()).toBeVisible();
      await expect(page.getByText("Quarterly access review completed for the scoped population.").first()).toBeVisible();

      await expect(itemStatus(page)).toHaveText("submitted");

      await page.getByRole("button", { name: "Approve item" }).click();
      await expect(itemStatus(page)).toHaveText("approved");

      const reopenForm = page.getByRole("form", { name: "Reopen assessment item" });
      await reopenForm.getByLabel("Reason").fill("Evidence requires clarification before approval.");
      await reopenForm.getByRole("button", { name: "Reopen item" }).click();
      await expect(itemStatus(page)).toHaveText("needs_changes");

      selectedPath = selectedOwnerPath(page.url());
      await page.context().clearCookies();
      await signInThroughUi(page, preparer, selectedPath);
      await expect(itemStatus(page)).toHaveText("needs_changes");
      await expect(page.getByRole("button", { name: "Approve item" })).toHaveCount(0);

      await page.getByRole("button", { name: "Submit answer" }).click();
      await expect(itemStatus(page)).toHaveText("submitted");

      selectedPath = selectedReviewPath(page.url());
      await page.context().clearCookies();
      await signInThroughUi(page, reviewer, selectedPath);
      await expect(itemStatus(page)).toHaveText("submitted");
      await expect(page.getByText("Rev 2")).toBeVisible();

      await page.getByRole("button", { name: "Approve item" }).click();
      await expect(itemStatus(page)).toHaveText("approved");

      // Test procedures/results: a completely new capability this pass wires up end to end.
      await expect(page.getByRole("heading", { name: "Test procedures and results" })).toBeVisible();
      await page.getByRole("button", { name: "Define test procedure" }).click();
      await expect(page.getByText("active").first()).toBeVisible();

      await page.getByRole("button", { name: /Record result for/ }).click();
      await expect(page.getByRole("cell", { name: "pass" }).first()).toBeVisible();

      // Sign-offs: none before close.
      await expect(page.getByText("No sign-off recorded yet")).toBeVisible();

      await page.getByRole("button", { name: "Close assessment" }).click();
      await expect(assessmentSummaryStatus(page)).toHaveText("closed");

      // A real 'final' sign-off row now exists, not just assessments.status flipping to 'closed'.
      await expect(page.getByRole("heading", { name: "Assessment sign-offs" })).toBeVisible();
      await expect(page.getByRole("cell", { name: "final" })).toBeVisible();
      await expect(page.getByRole("cell", { name: "approved" }).first()).toBeVisible();

      await page.getByRole("button", { name: "Create finding" }).click();
      await expect(page).toHaveURL(/findingId=/);
      await expect(page.getByText("1 findings")).toBeVisible();

      const updateFindingForm = page.getByRole("form", { name: "Update finding" });
      await updateFindingForm.getByLabel("Severity").selectOption("critical");
      const updateFindingDescription = updateFindingForm.locator('[name="description"]');
      await updateFindingDescription.fill("Updated after remediation review: escalated to critical.");
      await expect(updateFindingDescription).toHaveValue("Updated after remediation review: escalated to critical.");
      await updateFindingForm.getByRole("button", { name: "Update finding" }).click();
      const updatedFindingForm = page.getByRole("form", { name: "Update finding" });
      await expect(updatedFindingForm.getByLabel("Severity")).toHaveValue("critical");
      await expect(updatedFindingForm.locator('[name="description"]')).toHaveValue(
        "Updated after remediation review: escalated to critical."
      );

      await page.getByRole("button", { name: "Create remediation task" }).click();
      await expect(page).toHaveURL(/taskId=/);
      await expect(page.getByText("Remediation tasks")).toBeVisible();

      await page.getByRole("button", { name: "Mark task in progress" }).click();
      await expect(page.getByText("in_progress").first()).toBeVisible();

      await page.getByRole("button", { name: "Accept risk" }).click();
      await expect(page.getByText("risk_accepted").first()).toBeVisible();

      await page.getByRole("button", { name: "Request report export" }).click();
      await expect(page).toHaveURL(/exportId=/);
      await expect(page.getByText("Report exports")).toBeVisible();
      await expect(page.getByRole("link", { name: /Download/ }).first()).toHaveAttribute("href", /\/api\/backend\/v1\/report-exports\/.+\/download/);

      const results = await new AxeBuilder({ page }).analyze();
      expect(seriousViolations(results.violations)).toEqual([]);
    } finally {
      await reviewer.cleanup();
      await preparer.cleanup();
      await tenant.cleanup();
    }
  });

  test("creates an assessment from a non-text catalog question and renders the matching answer control", async ({ page }) => {
    const tenant = await createTenantWithEnabledFrameworks(["SOC2"]);
    const preparer = await createTestAuthUser({ tenantId: tenant.tenantId, scopes: f2Scopes });
    try {
      await signInThroughUi(page, preparer, "/assessments");

      await expect(page.getByRole("heading", { name: "Create assessment scope" })).toBeVisible();
      const typeSummary = page.getByLabel("Available assessment question response types");
      await expect(typeSummary.getByText("Boolean")).toBeVisible();
      await expect(typeSummary.getByText("Maturity")).toBeVisible();
      await expect(typeSummary.getByText("Multi-select")).toBeVisible();

      const approvedQuestion = page.locator('select[name="questionVersionId"]');
      const booleanOption = await approvedQuestion.locator("option").evaluateAll((options) =>
        options
          .map((option) => ({ value: (option as HTMLOptionElement).value, text: option.textContent ?? "" }))
          .find((option) => option.text.includes("[Boolean"))
      );
      expect(booleanOption).toBeTruthy();
      await approvedQuestion.selectOption(booleanOption!.value);

      await page.getByRole("button", { name: "Create assessment" }).click();
      await expect(page).toHaveURL(/assessmentId=/);
      await expect(page.getByText("Question type")).toBeVisible();
      await expect(page.getByText("Boolean", { exact: true }).first()).toBeVisible();
      await expect(page.getByLabel("Boolean answer")).toBeVisible();
      await expect(page.getByLabel("Boolean answer")).toHaveValue("Yes");
    } finally {
      await preparer.cleanup();
      await tenant.cleanup();
    }
  });
});

function selectedOwnerPath(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.pathname = "/assessments";
  return `${url.pathname}${url.search}`;
}

function selectedReviewPath(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.pathname = "/assessments/review";
  return `${url.pathname}${url.search}`;
}

function itemStatus(page: Page) {
  return page.locator('section[aria-labelledby="item-workflow-heading"] .sectionHeader > span');
}

function assessmentSummaryStatus(page: Page) {
  return page.locator('section[aria-labelledby="assessment-summary-heading"] .sectionHeader > span');
}

function seriousViolations(
  violations: Array<{
    id: string;
    impact?: string | null;
    nodes?: Array<{ target?: unknown[]; html?: string; failureSummary?: string }>;
  }>
): string[] {
  return violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => {
      const node = violation.nodes?.[0];
      return [violation.id, node?.target?.map(String).join(" "), node?.html, node?.failureSummary].filter(Boolean).join(" | ");
    });
}
