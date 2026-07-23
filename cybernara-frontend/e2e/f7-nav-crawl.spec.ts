import { expect, test } from "@playwright/test";
import { createTestAuthUser, signInThroughUi } from "./support/auth";

test.describe("F7 Navigation Crawl", () => {
  test("every top-level navigation item resolves without a 404 or error state", async ({ page }) => {
    const user = await createTestAuthUser();
    try {
      await signInThroughUi(page, user);
      
      // Wait for the dashboard/sidebar to load
      await expect(page.locator("nav.sidebarNav")).toBeVisible();

      // Collect all hrefs from the sidebar navigation items
      const navLinks = page.locator("nav.sidebarNav a.sidebarNavItem");
      const linkCount = await navLinks.count();
      expect(linkCount).toBeGreaterThan(0);
      
      const hrefs = [];
      for (let i = 0; i < linkCount; i++) {
        const href = await navLinks.nth(i).getAttribute("href");
        if (href) {
          hrefs.push(href);
        }
      }

      // Visit each link and verify
      for (const href of hrefs) {
        const response = await page.goto(href, { waitUntil: "networkidle" });
        expect(response?.status()).toBeLessThan(400); // Verify HTTP status is 2xx or 3xx
        
        // Also ensure no generic error messages or 404 text is on the page
        const bodyText = await page.locator("body").innerText();
        expect(bodyText.toLowerCase()).not.toContain("404 not found");
        expect(bodyText.toLowerCase()).not.toContain("this page could not be found");
      }
    } finally {
      await user.cleanup();
    }
  });
});
