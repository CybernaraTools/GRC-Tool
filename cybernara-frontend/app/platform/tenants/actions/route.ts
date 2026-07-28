import { NextResponse, type NextRequest } from "next/server";
import { apiErrorMessage, createServerApiClient } from "../../../../src/lib/api/server";
import { accessTokenCookieName, isPlatformSession, readSessionContextFromAccessToken } from "../../../../src/lib/session";

export async function POST(request: NextRequest) {
  const session = await readSessionContextFromAccessToken(request.cookies.get(accessTokenCookieName)?.value);
  if (!isPlatformSession(session)) {
    return NextResponse.json({ error: "Platform super-admin authentication is required." }, { status: 401 });
  }

  const formData = await request.formData();
  const api = createServerApiClient(session);
  const intent = text(formData, "intent");

  try {
    if (intent === "createTenant") {
      const tenant = await api.createPlatformTenant({
        name: text(formData, "name"),
        classification: clearance(formData, "classification", "confidential")
      });
      return NextResponse.json({ tenant });
    }

    if (intent === "inviteFirstAdmin") {
      const invited = await api.invitePlatformTenantAdmin(text(formData, "tenantId"), {
        email: text(formData, "email"),
        displayName: text(formData, "displayName") || undefined,
        roleKey: "platform_admin",
        clearance: clearance(formData, "clearance", "restricted")
      });
      return NextResponse.json({ user: invited, temporaryPassword: invited.temporaryPassword });
    }

    if (intent === "deactivateTenant") {
      const tenant = await api.deactivatePlatformTenant(text(formData, "tenantId"));
      return NextResponse.json({ tenant });
    }

    if (intent === "activateTenant") {
      const tenant = await api.activatePlatformTenant(text(formData, "tenantId"));
      return NextResponse.json({ tenant });
    }

    return NextResponse.json({ error: "Unsupported platform onboarding action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: apiErrorMessage(error) }, { status: 400 });
  }
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function clearance(
  formData: FormData,
  key: string,
  fallback: "public" | "internal" | "confidential" | "restricted"
): "public" | "internal" | "confidential" | "restricted" {
  const value = text(formData, key);
  if (value === "public" || value === "internal" || value === "confidential" || value === "restricted") {
    return value;
  }
  return fallback;
}
