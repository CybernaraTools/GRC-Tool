import { Buffer } from "node:buffer";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function uploadEvidenceFile(page: Page, fileName = "access-review-q2.txt") {
  const uploadForm = page.getByRole("form", { name: "Upload evidence file" });
  await uploadForm.getByLabel("File").setInputFiles({
    name: fileName,
    mimeType: "text/plain",
    buffer: Buffer.from("quarterly access review evidence")
  });
  await uploadForm.getByRole("button", { name: "Upload evidence file" }).click();
  await expect(page).toHaveURL(/evidenceId=/, { timeout: 30_000 });
  await expect(page.getByText("committed").first()).toBeVisible();
}
