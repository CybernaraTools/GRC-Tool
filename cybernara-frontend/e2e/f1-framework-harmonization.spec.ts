import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createTestAuthUser, signInThroughUi } from "./support/auth";

const f1Scopes = ["audit_event:read", "framework-content:read", "harmonization:read"];

test.describe("F1 framework and harmonization browsing", () => {
  test("browses published framework packs, pins a version, and inspects harmonized mappings", async ({ page }) => {
    const user = await createTestAuthUser({ scopes: f1Scopes });
    try {
      await signInThroughUi(page, user, "/frameworks?frameworkKey=SOC2");

      await expect(page.getByRole("heading", { name: "Framework Library" })).toBeVisible();
      await expect(page.getByText("Published framework content packs")).toBeVisible();
      await expect(page.getByText("Canonical requirements")).toBeVisible();
      await expect(
        page.locator("table:has(caption:text('Published framework content packs')) tbody tr").filter({ hasText: "SOC2" }).first()
      ).toBeVisible();

      await page.getByRole("link", { name: "Pin version" }).first().click();
      await expect(page.getByText("Pinned immutable version")).toBeVisible();
      await expect(page.getByText("Read-only")).toBeVisible();

      await page.goto("/harmonization?frameworkKey=SOC2&harmonizedId=HARM-00001");
      await expect(page.getByRole("heading", { name: "Harmonization Explorer" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "HARM-00001" }).first()).toBeVisible();
      await expect(page.getByText("Mappings by framework")).toBeVisible();
      await expect(page.getByText("SOC2 unique entries")).toBeVisible();

      const results = await new AxeBuilder({ page }).analyze();
      expect(seriousViolations(results.violations)).toEqual([]);
    } finally {
      await user.cleanup();
    }
  });

  // Closes a coverage gap the original audit flagged: pagination was verified by reading
  // listing.ts/pagination-controls.tsx, not by watching an actual page fetch a second page.
  // Since these are server components, the browser never sees the backend-facing fetch
  // directly (createServerApiClient calls the backend from the Next.js server, not from the
  // browser) — the network-observable signal of a real server-side refetch is the page
  // navigation itself. This asserts the "Next" link changes the offset query param AND that
  // the server actually returned a different page of rows, which client-side slicing of one
  // pre-fetched page could never produce.
  test("requirement browsing performs a real server-side paginated fetch per page, not client-side slicing", async ({
    page
  }) => {
    const user = await createTestAuthUser({ scopes: f1Scopes });
    try {
      await signInThroughUi(page, user, "/frameworks?frameworkKey=SOC2");
      await expect(page.getByRole("heading", { name: "Canonical requirements" })).toBeVisible();

      const firstPageControlId = await page.locator("table:has(caption:text('Framework requirements')) tbody tr").first().locator("strong").first().textContent();

      const nextRequest = page.waitForRequest(
        (request) => request.url().includes("requirementsOffset=25") && request.method() === "GET"
      );
      await page.getByRole("navigation", { name: "requirements pagination" }).getByRole("link", { name: "Next" }).click();
      const nextNav = await nextRequest;
      expect(new URL(nextNav.url()).searchParams.get("requirementsOffset")).toBe("25");

      await expect(page).toHaveURL(/requirementsOffset=25/);
      const secondPageControlId = await page.locator("table:has(caption:text('Framework requirements')) tbody tr").first().locator("strong").first().textContent();

      // A genuinely different row proves the server was queried again with offset=25 rather
      // than the client re-rendering a subset of an already-fetched array.
      expect(secondPageControlId).not.toBe(firstPageControlId);
    } finally {
      await user.cleanup();
    }
  });

  test("harmonized control browsing performs a real server-side paginated fetch per page, not client-side slicing", async ({
    page
  }) => {
    const user = await createTestAuthUser({ scopes: f1Scopes });
    try {
      await signInThroughUi(page, user, "/harmonization");
      await expect(page.getByRole("heading", { name: "Harmonized control library" })).toBeVisible();

      const firstPageHarmonizedId = await page.locator("table:has(caption:text('Harmonized controls')) tbody tr").first().locator("strong").first().textContent();

      const nextRequest = page.waitForRequest(
        (request) => request.url().includes("controlsOffset=25") && request.method() === "GET"
      );
      await page.getByRole("navigation", { name: "controls pagination" }).getByRole("link", { name: "Next" }).click();
      const nextNav = await nextRequest;
      expect(new URL(nextNav.url()).searchParams.get("controlsOffset")).toBe("25");

      await expect(page).toHaveURL(/controlsOffset=25/);
      const secondPageHarmonizedId = await page.locator("table:has(caption:text('Harmonized controls')) tbody tr").first().locator("strong").first().textContent();

      expect(secondPageHarmonizedId).not.toBe(firstPageHarmonizedId);
    } finally {
      await user.cleanup();
    }
  });
});

function seriousViolations(
  violations: Array<{ id: string; impact?: string | null; nodes?: Array<{ target: unknown[] }> }>
): string[] {
  return violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .flatMap((violation) => {
      const targets = violation.nodes?.map((node) => node.target.map(String).join(", ")).filter(Boolean) ?? [];
      return targets.length > 0 ? targets.map((target) => `${violation.id}: ${target}`) : [violation.id];
    });
}
