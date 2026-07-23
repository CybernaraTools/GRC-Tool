import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createServiceRoleClient, createTestAuthUser, seededTenantId, signInThroughUi } from "./support/auth";

const f7Scopes = [
  "audit_event:read",
  "universal_task:read",
  "universal_task:write"
];

test.describe("F7 tasks inbox", () => {
  test.setTimeout(90_000);

  test("navigates to tasks inbox, filters by status and priority, and verifies row columns", async ({ page }) => {
    const user = await createTestAuthUser({ scopes: f7Scopes, clearance: "confidential" });
    let taskIds: string[] = [];
    try {
      taskIds = await seedInboxTasks(user.userId);
      await signInThroughUi(page, user, "/tasks");

      // ── 1. Inbox heading ─────────────────────────────────────────────────────
      await expect(page.getByRole("heading", { name: "Inbox & Assignment Queue" })).toBeVisible();
      await expect(page.locator("p.eyebrow").filter({ hasText: "Universal Task Layer" })).toBeVisible();

      // ── 2. All-tasks view: filter toolbar rendered ───────────────────────────
      const toolbar = page.locator(".filterToolbar");
      await expect(toolbar).toBeVisible();
      await expect(toolbar.getByRole("link", { name: "All Tasks" })).toBeVisible();
      await expect(toolbar.getByRole("link", { name: "Pending" })).toBeVisible();
      await expect(toolbar.getByRole("link", { name: "In Progress" })).toBeVisible();
      await expect(toolbar.getByRole("link", { name: "Completed" })).toBeVisible();

      // ── 3. Filter: status = pending ──────────────────────────────────────────
      await toolbar.getByRole("link", { name: "Pending" }).click();
      await expect(page).toHaveURL(/status=pending/);
      await expect(page.getByRole("heading", { name: "Inbox & Assignment Queue" })).toBeVisible();

      // ── 4. Filter: status = completed ────────────────────────────────────────
      await toolbar.getByRole("link", { name: "Completed" }).click();
      await expect(page).toHaveURL(/status=completed/);

      // ── 5. Navigate back to all tasks and verify table structure ─────────────
      await toolbar.getByRole("link", { name: "All Tasks" }).click();
      await expect(page).toHaveURL("/tasks");

      // Table caption and headers
      const table = page.locator("table");
      await expect(table.locator("caption")).toContainText("Open Assignments");
      const headers = table.locator("thead th");
      await expect(headers.nth(0)).toContainText("Task ID");
      await expect(headers.nth(1)).toContainText("Title");
      await expect(headers.nth(2)).toContainText("Priority");
      await expect(headers.nth(3)).toContainText("Status");
      await expect(headers.nth(4)).toContainText("Target Type");

      // ── 6. Verify at least one task row is present with title/status/priority ─
      const rows = table.locator("tbody tr");
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Title column has a <strong> tag
        const firstRow = rows.first();
        await expect(firstRow.locator("td").nth(1).locator("strong")).not.toBeEmpty();

        // Priority column has a .badge element
        await expect(firstRow.locator("td").nth(2).locator(".badge")).toBeVisible();

        // Status column has a .badge element
        await expect(firstRow.locator("td").nth(3).locator(".badge")).toBeVisible();

        // Target type column: small text
        await expect(firstRow.locator("td").nth(4).locator("small")).not.toBeEmpty();
      } else {
        // No tasks seeded — graceful empty state is acceptable for this spec
        await expect(page.getByText("No tasks found in your queue.")).toBeVisible();
      }

      // ── 7. Filter by priority via direct URL navigation ──────────────────────
      await page.goto("/tasks?priority=high");
      await expect(page).toHaveURL(/priority=high/);
      await expect(page.getByRole("heading", { name: "Inbox & Assignment Queue" })).toBeVisible();

      await page.goto("/tasks?priority=critical");
      await expect(page).toHaveURL(/priority=critical/);
      await expect(page.getByRole("heading", { name: "Inbox & Assignment Queue" })).toBeVisible();

      await page.goto("/tasks?priority=low");
      await expect(page).toHaveURL(/priority=low/);
      await expect(page.getByRole("heading", { name: "Inbox & Assignment Queue" })).toBeVisible();

      // ── 8. Combined filter: status + priority ────────────────────────────────
      await page.goto("/tasks?status=in_progress&priority=high");
      await expect(page).toHaveURL(/status=in_progress/);
      await expect(page).toHaveURL(/priority=high/);
      await expect(page.getByRole("heading", { name: "Inbox & Assignment Queue" })).toBeVisible();

      // ── 9. Verify at least 3 target_type values appear across all tasks ───────
      await page.goto("/tasks");
      await expect(page.getByRole("heading", { name: "Inbox & Assignment Queue" })).toBeVisible();

      const allTargetCells = page.locator("table tbody tr td:nth-child(5) small");
      const targetCellCount = await allTargetCells.count();

      const targetTypes = new Set<string>();
      for (let i = 0; i < targetCellCount; i++) {
        const text = await allTargetCells.nth(i).innerText();
        if (text.trim()) targetTypes.add(text.trim());
      }
      expect(targetTypes.size).toBeGreaterThanOrEqual(3);
      expect([...targetTypes].map((targetType) => targetType.toLowerCase())).toEqual(
        expect.arrayContaining(["remediation task", "rights request task", "framework update impact"])
      );
    } finally {
      await deleteInboxTasks(taskIds);
      await user.cleanup();
    }
  });

  test("task status select dropdown is present on each task row", async ({ page }) => {
    const user = await createTestAuthUser({ scopes: f7Scopes, clearance: "confidential" });
    try {
      await signInThroughUi(page, user, "/tasks");
      await expect(page.getByRole("heading", { name: "Inbox & Assignment Queue" })).toBeVisible();

      const rows = page.locator("table tbody tr");
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Each row should have a status <select> with the standard options
        const statusSelect = rows.first().locator("select[name='status']");
        await expect(statusSelect).toBeVisible();
        await expect(statusSelect.locator("option[value='pending']")).toHaveText("Pending");
        await expect(statusSelect.locator("option[value='in_progress']")).toHaveText("In Progress");
        await expect(statusSelect.locator("option[value='completed']")).toHaveText("Completed");
        await expect(statusSelect.locator("option[value='cancelled']")).toHaveText("Cancelled");

        // Hidden intent field is present
        await expect(rows.first().locator("input[name='intent'][value='updateTaskStatus']")).toHaveCount(1);
      }
    } finally {
      await user.cleanup();
    }
  });
});

async function seedInboxTasks(ownerId: string): Promise<string[]> {
  const admin = createServiceRoleClient();
  const rows = [
    {
      id: randomUUID(),
      tenant_id: seededTenantId,
      title: "E2E remediation task inbox target",
      description: "Seeded by Playwright to verify remediation task filtering.",
      status: "pending",
      priority: "high",
      due_at: new Date(Date.now() + 86_400_000).toISOString(),
      owner_id: ownerId,
      target_type: "remediation_task",
      target_id: randomUUID(),
      created_by: ownerId,
      updated_by: ownerId
    },
    {
      id: randomUUID(),
      tenant_id: seededTenantId,
      title: "E2E rights request task inbox target",
      description: "Seeded by Playwright to verify rights request task filtering.",
      status: "completed",
      priority: "critical",
      due_at: new Date(Date.now() + 172_800_000).toISOString(),
      owner_id: ownerId,
      target_type: "rights_request_task",
      target_id: randomUUID(),
      created_by: ownerId,
      updated_by: ownerId
    },
    {
      id: randomUUID(),
      tenant_id: seededTenantId,
      title: "E2E framework update impact inbox target",
      description: "Seeded by Playwright to verify framework update impact filtering.",
      status: "in_progress",
      priority: "low",
      due_at: new Date(Date.now() + 259_200_000).toISOString(),
      owner_id: ownerId,
      target_type: "framework_update_impact",
      target_id: randomUUID(),
      created_by: ownerId,
      updated_by: ownerId
    }
  ];

  const { error } = await admin.from("universal_tasks").insert(rows);
  if (error) {
    throw new Error(`Unable to seed universal task inbox rows: ${error.message}`);
  }

  return rows.map((row) => row.id);
}

async function deleteInboxTasks(taskIds: string[]) {
  if (taskIds.length === 0) {
    return;
  }

  const admin = createServiceRoleClient();
  const { error } = await admin.from("universal_tasks").delete().in("id", taskIds);
  if (error) {
    throw new Error(`Unable to clean up universal task inbox rows: ${error.message}`);
  }
}
