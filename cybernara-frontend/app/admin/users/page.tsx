import { AppShell } from "../../../src/components/app-shell";
import { ErrorState } from "../../../src/components/ui-states";
import { apiErrorMessage, createServerApiClient } from "../../../src/lib/api/server";
import { requireSession } from "../../../src/lib/protected-session";
import { AdminUsersConsole } from "./admin-users-console";
import type { AdminRole, AdminUser } from "../../../src/lib/api/generated";

export default async function AdminUsersPage() {
  const session = await requireSession("/admin/users");
  const api = createServerApiClient(session);
  let users: AdminUser[] = [];
  let roles: AdminRole[] = [];
  let clearanceLevels: Array<"public" | "internal" | "confidential" | "restricted"> = [];
  let apiError: string | null = null;

  try {
    const [roleCatalog, tenantUsers] = await Promise.all([api.listAdminRoles(), api.listAdminUsers()]);
    roles = roleCatalog.roles;
    clearanceLevels = roleCatalog.clearanceLevels;
    users = tenantUsers;
  } catch (error) {
    apiError = apiErrorMessage(error);
  }

  return (
    <AppShell session={session} title="User & Role Admin">
      {apiError ? (
        <ErrorState title="User administration could not be loaded" detail={apiError} />
      ) : (
        <AdminUsersConsole users={users} roles={roles} clearanceLevels={clearanceLevels} />
      )}
    </AppShell>
  );
}
