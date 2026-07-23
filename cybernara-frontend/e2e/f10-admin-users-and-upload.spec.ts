import { Buffer } from "node:buffer";
import { expect, test } from "@playwright/test";
import {
  createServiceRoleClient,
  createTestAuthUser,
  seededTenantId,
  signInThroughUi
} from "./support/auth";
import { uploadEvidenceFile } from "./support/evidence";

const adminScopes = ["admin_user:read", "admin_user:write", "admin_role:read", "audit_event:read"];
const assessmentUploadScopes = [
  "assessment:read",
  "assessment:write",
  "evidence_object:read",
  "evidence_object:write",
  "evidence_version:read",
  "evidence_link:read",
  "evidence_link:write",
  "finding:read",
  "remediation_task:read",
  "report_export:read"
];

test.describe("F10 admin users and browser evidence upload", () => {
  test.setTimeout(180_000);

  test("admin invites, assigns, deactivates, and deactivated login is rejected", async ({ page }) => {
    const admin = await createTestAuthUser({ roles: ["platform_admin"], scopes: adminScopes, clearance: "restricted" });
    const invitedEmail = `cybernara-e2e-invite-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    let invitedSupabaseUserId: string | null = null;
    try {
      await signInThroughUi(page, admin, "/admin/users");
      await expect(page.getByRole("heading", { name: "User & Role Admin" })).toBeVisible();

      const inviteForm = page.getByRole("form", { name: "Invite user" });
      await inviteForm.getByLabel("Email").fill(invitedEmail);
      await inviteForm.getByLabel("Display name").fill("E2E Invited User");
      await inviteForm.getByLabel("Initial role").selectOption("viewer");
      await inviteForm.getByLabel("Clearance").selectOption("internal");
      await inviteForm.getByRole("button", { name: "Invite user" }).click();

      await expect(page.getByText(`Invited ${invitedEmail}`)).toBeVisible();
      const temporaryPassword = await page.locator("code").filter({ hasText: "Cybernara-" }).last().textContent();
      expect(temporaryPassword).toBeTruthy();

      const row = page.getByRole("row").filter({ hasText: invitedEmail });
      await expect(row).toBeVisible();
      await row.getByLabel("Role").selectOption("auditor");
      await row.getByLabel("Clearance").selectOption("confidential");
      await row.getByRole("button", { name: "Save assignment" }).click();
      await expect(page.getByText(`Updated ${invitedEmail}.`)).toBeVisible();
      await expect(row.getByRole("cell", { name: "auditor" })).toBeVisible();
      await expect(row.getByRole("cell", { name: "confidential" })).toBeVisible();

      await row.getByRole("button", { name: "Deactivate" }).click();
      await expect(page.getByText(`Updated ${invitedEmail}.`)).toBeVisible();
      await expect(row.getByText("disabled")).toBeVisible();

      await page.context().clearCookies();
      await signInThroughUi(page, { email: invitedEmail, password: temporaryPassword ?? "" }, "/");
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByRole("alert")).toContainText("deactivated");

      invitedSupabaseUserId = await findSupabaseUserId(invitedEmail);
    } finally {
      invitedSupabaseUserId ??= await findSupabaseUserId(invitedEmail).catch(() => null);
      if (invitedSupabaseUserId) {
        const deleted = await createServiceRoleClient().auth.admin.deleteUser(invitedSupabaseUserId);
        expect(deleted.error).toBeNull();
      }
      await admin.cleanup();
    }
  });

  test("browser file picker rejects invalid evidence and uploads a valid linked file", async ({ page }) => {
    const user = await createTestAuthUser({ scopes: assessmentUploadScopes, clearance: "restricted" });
    try {
      await signInThroughUi(page, user, "/assessments");
      await expect(page.getByRole("heading", { name: "Assessment Workspace" })).toBeVisible();

      await page.getByRole("button", { name: "Create assessment" }).click();
      await expect(page).toHaveURL(/assessmentId=/);

      const uploadForm = page.getByRole("form", { name: "Upload evidence file" });
      await uploadForm.getByLabel("File").setInputFiles({
        name: "blocked.exe",
        mimeType: "application/x-msdownload",
        buffer: Buffer.from("safe non-executable fixture")
      });
      await uploadForm.getByRole("button", { name: "Upload evidence file" }).click();
      await expect(uploadForm.getByRole("alert")).toContainText("not an allowed evidence file type");

      await uploadEvidenceFile(page, "linked-evidence.txt");
      const evidenceId = new URL(page.url()).searchParams.get("evidenceId");
      expect(evidenceId).toBeTruthy();
      await expect(page.getByText("Live scan status")).toBeVisible();

      await page.getByRole("button", { name: "Approve applicability" }).click();
      await page.getByRole("button", { name: "Submit answer" }).click();
      await expect(page.locator("article").filter({ hasText: "Evidence IDs" }).first()).toContainText(evidenceId ?? "");
    } finally {
      await user.cleanup();
    }
  });
});

async function findSupabaseUserId(email: string): Promise<string | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("identity_users")
    .select("supabase_user_id")
    .eq("tenant_id", seededTenantId)
    .eq("email", email)
    .maybeSingle();
  if (error) {
    throw new Error(`Unable to look up invited user for cleanup: ${error.message}`);
  }
  return typeof data?.supabase_user_id === "string" ? data.supabase_user_id : null;
}
