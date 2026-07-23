import { AppShell } from "../../../src/components/app-shell";
import { ErrorState } from "../../../src/components/ui-states";
import { apiErrorMessage, createServerApiClient } from "../../../src/lib/api/server";
import type { PlatformTenant } from "../../../src/lib/api/generated";
import { requirePlatformSession } from "../../../src/lib/protected-session";
import { PlatformTenantsConsole } from "./platform-tenants-console";

export default async function PlatformTenantsPage() {
  const session = await requirePlatformSession("/platform/tenants");
  const api = createServerApiClient(session);
  let tenants: PlatformTenant[] = [];
  let apiError: string | null = null;

  try {
    tenants = await api.listPlatformTenants();
  } catch (error) {
    apiError = apiErrorMessage(error);
  }

  return (
    <AppShell session={session} title="Client Onboarding">
      {apiError ? (
        <ErrorState title="Client onboarding could not be loaded" detail={apiError} />
      ) : (
        <PlatformTenantsConsole tenants={tenants} />
      )}
    </AppShell>
  );
}

