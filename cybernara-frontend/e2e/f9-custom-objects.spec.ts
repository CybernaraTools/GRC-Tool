import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createServiceRoleClient, createTestAuthUser, seededTenantId, signInThroughUi } from "./support/auth";

const customObjectScopes = [
  "custom_object_definition:read",
  "custom_object_definition:write",
  "custom_field_definition:read",
  "custom_field_definition:write",
  "custom_record:read",
  "custom_record:write",
  "custom_value:read",
  "custom_value:write"
];

test.describe("F9 custom object round trip", () => {
  test.setTimeout(90_000);

  test("creates a definition, adds a field, creates a record, sets a value, and retrieves it", async ({ page }) => {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const objectKey = `reg_action_${suffix}`;
    const initialFieldKey = `initial_reference_${suffix}`;
    const fieldKey = `owner_note_${suffix}`;
    const recordKey = `Regulatory action ${suffix}`;
    const searchText = `round-trip-${suffix}`;
    const valueJson = JSON.stringify(searchText);
    const user = await createTestAuthUser({ scopes: customObjectScopes, clearance: "restricted" });

    try {
      await signInThroughUi(page, user, "/enterprise/custom-objects");
      await expect(page.getByRole("heading", { name: "Create Custom Object Definition" })).toBeVisible();

      await page.getByLabel("Object Key (Unique Identifier)").fill(objectKey);
      await page.getByLabel("Workflow States (Comma-separated)").fill("open, in_review, closed");
      await page.getByLabel("Initial Field Key").fill(initialFieldKey);
      await page.getByLabel("Initial Field Type").selectOption("text");
      await page.getByLabel("Permission Role ID").fill(randomUUID());
      await page.getByLabel("Enable Connector SDK integration").check();
      await page.getByRole("button", { name: "Create Definition" }).click();

      await expect(page).toHaveURL(/definitionId=/);
      await expect(page.getByRole("cell", { name: objectKey })).toBeVisible();
      await expect(page.getByRole("heading", { name: `Fields for ${objectKey}` })).toBeVisible();

      const addFieldPanel = page.locator("section").filter({ has: page.getByRole("heading", { name: "Add Field" }) });
      await addFieldPanel.getByLabel("Field Key").fill(fieldKey);
      await addFieldPanel.getByLabel("Data Type").selectOption("text");
      await addFieldPanel.getByLabel("Field is required").check();
      await addFieldPanel.getByRole("button", { name: "Add Field Definition" }).click();

      await expect(page.getByRole("cell", { name: fieldKey })).toBeVisible();
      await expect(page.getByRole("cell", { name: "Required" })).toBeVisible();

      await page.getByLabel("Record Key / Title").fill(recordKey);
      await page.getByRole("button", { name: "Create Record" }).click();

      await expect(page).toHaveURL(/recordId=/);
      await expect(page.getByRole("cell", { name: recordKey })).toBeVisible();
      await expect(page.getByRole("heading", { name: `Field values for: ${recordKey}` })).toBeVisible();

      await page.getByLabel("Select Field").selectOption({ label: `${fieldKey} (text)` });
      await page.getByLabel("Value JSON string").fill(valueJson);
      await page.getByLabel("Search text representation").fill(searchText);
      await page.getByRole("button", { name: "Set Value" }).click();

      await expect(page.getByText(valueJson, { exact: true })).toBeVisible();
      await expect(page.getByText(searchText, { exact: true })).toBeVisible();

      await page.reload();
      await expect(page.getByText(valueJson, { exact: true })).toBeVisible();
      await expect(page.getByText(searchText, { exact: true })).toBeVisible();

      const accessibility = await new AxeBuilder({ page }).analyze();
      expect(seriousViolations(accessibility.violations)).toEqual([]);

      const duration = await page.evaluate(() => {
        const [navigation] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
        return navigation ? navigation.domContentLoadedEventEnd - navigation.startTime : 0;
      });
      expect(duration).toBeLessThan(10_000);
    } finally {
      await cleanupCustomObject(objectKey);
      await user.cleanup();
    }
  });
});

async function cleanupCustomObject(objectKey: string) {
  const admin = createServiceRoleClient();
  const { data: definitions, error: definitionError } = await admin
    .from("custom_object_definitions")
    .select("id")
    .eq("tenant_id", seededTenantId)
    .eq("object_key", objectKey);

  if (definitionError) {
    throw new Error(`Unable to find custom object definitions for cleanup: ${definitionError.message}`);
  }

  const definitionIds = (definitions ?? []).map((definition) => String(definition.id));
  if (definitionIds.length === 0) {
    return;
  }

  const { data: records, error: recordListError } = await admin
    .from("custom_records")
    .select("id")
    .in("object_definition_id", definitionIds);

  if (recordListError) {
    throw new Error(`Unable to find custom records for cleanup: ${recordListError.message}`);
  }

  const recordIds = (records ?? []).map((record) => String(record.id));
  if (recordIds.length > 0) {
    const { error } = await admin.from("custom_values").delete().in("record_id", recordIds);
    if (error) {
      throw new Error(`Unable to clean up custom values: ${error.message}`);
    }
  }

  const childDeletes = await Promise.all([
    admin.from("custom_records").delete().in("object_definition_id", definitionIds),
    admin.from("custom_field_definitions").delete().in("object_definition_id", definitionIds)
  ]);

  for (const result of childDeletes) {
    if (result.error) {
      throw new Error(`Unable to clean up custom object children: ${result.error.message}`);
    }
  }

  const { error: definitionDeleteError } = await admin.from("custom_object_definitions").delete().in("id", definitionIds);
  if (definitionDeleteError) {
    throw new Error(`Unable to clean up custom object definitions: ${definitionDeleteError.message}`);
  }
}

function seriousViolations(violations: Array<{ id: string; impact?: string | null }>): string[] {
  return violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => violation.id);
}
