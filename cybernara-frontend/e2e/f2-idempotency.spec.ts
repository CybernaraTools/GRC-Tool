import { expect, test } from "@playwright/test";
import { createTestAuthUser, signInThroughUi } from "./support/auth";

/**
 * Closes a coverage gap the original audit flagged: the "no duplicate side effect on retry"
 * guarantee was only verified on the backend's own test suite, never through the actual
 * frontend BFF path a browser retry/double-click would take. This submits the real
 * create-assessment form once through the UI, then replays the exact same form body (same
 * Idempotency-Key, taken straight from the rendered hidden input) a second time via an
 * in-browser fetch — the same cookie/session context a real double-click retry would use —
 * and confirms only one assessment was created.
 */
test.describe("F2 idempotent retry through the BFF", () => {
  test.setTimeout(90_000);

  test("resubmitting the same create-assessment form body with the same Idempotency-Key does not create a duplicate assessment", async ({
    page
  }) => {
    // The e2e fixture tenant is shared across every spec file, so it already has assessments
    // (with items) from other runs by the time this test executes. /assessments picks up the
    // most recent one and also lists its evidence, report exports, and risk findings, so this
    // user needs the full F2 read scope set or the page silently swaps the create form for an
    // error state on an API call this test never intended to exercise.
    const user = await createTestAuthUser({
      scopes: [
        "assessment:read",
        "assessment:write",
        "evidence_object:read",
        "report_export:read",
        "finding:read",
        "remediation_task:read"
      ]
    });
    try {
      await signInThroughUi(page, user, "/assessments");

      const scopeName = `Idempotency check ${Date.now()}`;
      const form = page.locator('form[aria-label="Create assessment scope"]');
      await page.getByLabel("Scope name").fill(scopeName);

      const formSnapshot = await form.evaluate((element: HTMLFormElement): Array<[string, string]> => {
        const data = new FormData(element);
        return Array.from(data.entries()).map(([key, value]) => [key, String(value)] as [string, string]);
      });

      await page.getByRole("button", { name: "Create assessment" }).click();
      await expect(page).toHaveURL(/assessmentId=/);
      const firstUrl = page.url();
      const firstAssessmentId = new URL(firstUrl).searchParams.get("assessmentId");
      expect(firstAssessmentId).toBeTruthy();

      // Replay the exact same body (including the same Idempotency-Key) through a real
      // in-browser fetch, exactly as a browser retry/double-submit would.
      const replay = await page.evaluate(async (entries: Array<[string, string]>) => {
        const body = new URLSearchParams(entries);
        const response = await fetch("/assessments/actions", {
          method: "POST",
          body,
          redirect: "follow"
        });
        return { url: response.url, ok: response.ok };
      }, formSnapshot);

      expect(replay.ok).toBe(true);
      const replayAssessmentId = new URL(replay.url).searchParams.get("assessmentId");

      // Same Idempotency-Key -> the backend must return the same already-created resource,
      // not a second one, so both requests resolve to the exact same assessmentId.
      expect(replayAssessmentId).toBe(firstAssessmentId);

      // Secondary corroboration: the tenant this fixture user runs in is shared across every
      // e2e spec file, so scan a generous page for this run's unique scope name rather than
      // assuming it is the only assessment in the tenant.
      const list = await page.request.get("/api/backend/v1/assessments?limit=500&offset=0");
      expect(list.ok()).toBe(true);
      const assessments = (await list.json()) as Array<{ id: string; scopeName: string }>;
      const matches = assessments.filter((entry) => entry.scopeName === scopeName);
      expect(matches).toHaveLength(1);
      expect(matches[0].id).toBe(firstAssessmentId);
    } finally {
      await user.cleanup();
    }
  });
});
