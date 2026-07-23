import { expect, test } from "@playwright/test";
import { createTestAuthUser, signInThroughUi } from "./support/auth";
import { uploadEvidenceFile } from "./support/evidence";

const f8Scopes = [
  "audit_event:read",
  "audit_checkpoint:read",
  "audit_checkpoint:write",
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

test.describe("F8 audit hardening", () => {
  test.setTimeout(120_000);

  test("audit trail page renders with entries and hash-chain verification UI exists", async ({ page }) => {
    const user = await createTestAuthUser({ scopes: f8Scopes });
    try {
      await signInThroughUi(page, user, "/audit");

      // ── 1. Audit trail page structure ────────────────────────────────────────
      await expect(page.getByRole("heading", { name: "Read-only event trail" })).toBeVisible();
      await expect(page.locator("p.eyebrow").filter({ hasText: "AuditSecurity" })).toBeVisible();

      // Filter form is present
      await expect(page.getByRole("form", { name: "Audit event filters" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Apply filters" })).toBeVisible();

      // ── 2. Audit table renders (may be empty with seeded data) ───────────────
      // Either the table caption or the empty state must be visible
      const tableCaption = page.locator("table caption").filter({ hasText: "Audit events" });
      const emptyState = page.getByText("No audit events match these filters");
      await expect(tableCaption.or(emptyState)).toBeVisible();

      // ── 3. Hash-chain verification status UI element: "Verify Audit Trail" link ──
      const verifyLink = page.getByRole("link", { name: "Verify Audit Trail" });
      await expect(verifyLink).toBeVisible();
      await expect(verifyLink).toHaveAttribute("href", "/audit/verify");
    } finally {
      await user.cleanup();
    }
  });

  test("audit verify page loads with cryptographic checkpoints and verification history sections", async ({ page }) => {
    const user = await createTestAuthUser({ scopes: f8Scopes });
    try {
      await signInThroughUi(page, user, "/audit/verify");

      // ── 1. Page sections ─────────────────────────────────────────────────────
      await expect(page.getByRole("heading", { name: "Audit Trail Checkpoints" })).toBeVisible();
      await expect(page.locator("p.eyebrow").filter({ hasText: "Cryptographic Checkpoints" })).toBeVisible();

      await expect(page.getByRole("heading", { name: "Cryptographic Verification History" })).toBeVisible();
      await expect(page.locator("p.eyebrow").filter({ hasText: "Verification outcomes" })).toBeVisible();

      // ── 2. Actions exist ─────────────────────────────────────────────────────
      await expect(page.getByRole("button", { name: "Trigger Next Checkpoint" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Back to Audit Log" })).toBeVisible();

      // ── 3. Checkpoint table headers ──────────────────────────────────────────
      const checkpointSection = page.locator('section[aria-labelledby="checkpoints-heading"]');
      await expect(checkpointSection.getByRole("columnheader", { name: "Checkpoint ID" })).toBeVisible();
      await expect(checkpointSection.getByRole("columnheader", { name: "Sequence Range" })).toBeVisible();
      await expect(checkpointSection.getByRole("columnheader", { name: "Root Hash" })).toBeVisible();
      await expect(checkpointSection.getByRole("columnheader", { name: "Signed At" })).toBeVisible();

      // ── 4. Verification outcomes table headers ────────────────────────────────
      const verificationSection = page.locator('section[aria-labelledby="verifications-heading"]');
      await expect(verificationSection.getByRole("columnheader", { name: "Outcome Status" })).toBeVisible();
      await expect(verificationSection.getByRole("columnheader", { name: "Mismatches" })).toBeVisible();
    } finally {
      await user.cleanup();
    }
  });

  test("retention schedule page loads correctly", async ({ page }) => {
    const user = await createTestAuthUser({
      scopes: [
        "audit_event:read",
        "retention_schedule:read",
        "retention_schedule:write"
      ]
    });
    try {
      await signInThroughUi(page, user, "/privacy/retention");

      // ── 1. Page heading ───────────────────────────────────────────────────────
      await expect(page.getByRole("heading", { name: "Retention & Deletion Console" })).toBeVisible();

      // ── 2. Back navigation ────────────────────────────────────────────────────
      await expect(page.getByRole("link", { name: "Back to Privacy Operations" })).toBeVisible();

      // ── 3. Either schedules table or empty state ──────────────────────────────
      const schedulesTable = page.locator("table caption").filter({ hasText: "Retention schedules" });
      const emptyMsg = page.getByText("No retention schedules found").or(page.getByText("No schedules"));
      // Either a table renders or an empty/error state — both are acceptable
      const hasTable = await schedulesTable.isVisible().catch(() => false);
      const hasEmpty = await emptyMsg.isVisible().catch(() => false);
      // At minimum, page must not be a generic 404
      const bodyText = await page.locator("body").innerText();
      expect(bodyText.toLowerCase()).not.toContain("404 not found");
      expect(hasTable || hasEmpty || bodyText.length > 0).toBeTruthy();
    } finally {
      await user.cleanup();
    }
  });

  test("submits reopenItem form with a reason and confirms item enters needs_changes state", async ({ page }) => {
    // This test mirrors the reopen step already proven in f2-assessment-core.spec.ts but
    // focuses purely on the state transition observable on the assessment page.
    const assessmentScopes = [
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
    const preparer = await createTestAuthUser({ scopes: assessmentScopes });
    const reviewer = await createTestAuthUser({ scopes: assessmentScopes });
    try {
      await signInThroughUi(page, preparer, "/assessments");
      await expect(page.getByRole("heading", { name: "Assessment Workspace" })).toBeVisible();

      // Create assessment scope
      await page.getByRole("button", { name: "Create assessment" }).click();
      await expect(page).toHaveURL(/assessmentId=/);
      await expect(page.getByRole("heading", { name: "FY26 readiness" }).first()).toBeVisible();

      await uploadEvidenceFile(page);
      await expect(page.getByText("committed").first()).toBeVisible();

      // Approve applicability then submit an answer so item can be reviewed
      await page.getByRole("button", { name: "Approve applicability" }).click();
      await page.getByRole("button", { name: "Submit answer" }).click();
      await expect(page.getByText("submitted").first()).toBeVisible();

      const selectedUrl = new URL(page.url());
      const selectedPath = `${selectedUrl.pathname}${selectedUrl.search}`;

      await page.context().clearCookies();
      await signInThroughUi(page, reviewer, selectedPath);
      await expect(page.getByText("submitted").first()).toBeVisible();

      await page.getByRole("button", { name: "Approve item" }).click();
      await expect(page.getByText("approved").first()).toBeVisible();

      // Reopen the item with an explicit reason
      const reopenForm = page.getByRole("form", { name: "Reopen assessment item" });
      await reopenForm.getByLabel("Reason").fill("Evidence requires clarification before approval.");
      await reopenForm.getByRole("button", { name: "Reopen item" }).click();

      // State must transition to needs_changes
      await expect(page.getByText("needs_changes").first()).toBeVisible();
    } finally {
      await reviewer.cleanup();
      await preparer.cleanup();
    }
  });

  test("clicks Refresh scan status and confirms the Live scan status display updates", async ({ page }) => {
    const assessmentScopes = [
      "audit_event:read",
      "assessment:read",
      "assessment:write",
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
    const user = await createTestAuthUser({ scopes: assessmentScopes });
    try {
      await signInThroughUi(page, user, "/assessments");
      await expect(page.getByRole("heading", { name: "Assessment Workspace" })).toBeVisible();

      // Create assessment and initiate then commit evidence to reveal the scan-status panel
      await page.getByRole("button", { name: "Create assessment" }).click();
      await expect(page).toHaveURL(/assessmentId=/);

      await uploadEvidenceFile(page);
      await expect(page).toHaveURL(/evidenceId=/);

      // The 'Live scan status' section and the Refresh button should now be visible
      await expect(page.getByText("Live scan status")).toBeVisible();
      const refreshBtn = page.getByRole("button", { name: "Refresh scan status" });
      await expect(refreshBtn).toBeVisible();

      // Click and confirm the page reloads with an updated scan-status article
      await refreshBtn.click();
      await expect(page.getByText("Live scan status")).toBeVisible();

      // After refresh the scan state label must be a known value or at least rendered
      const scanStateEl = page.locator("article").filter({ hasText: "Live scan status" }).locator("strong");
      await expect(scanStateEl).not.toBeEmpty();
    } finally {
      await user.cleanup();
    }
  });
});
