import { NextResponse, type NextRequest } from "next/server";
import { apiErrorMessage, createServerApiClient } from "../../../../src/lib/api/server";
import { accessTokenCookieName, isTenantSession, readSessionContextFromAccessToken } from "../../../../src/lib/session";

export async function POST(request: NextRequest) {
  const session = await readSessionContextFromAccessToken(request.cookies.get(accessTokenCookieName)?.value);
  if (!isTenantSession(session)) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const formData = await request.formData();
  const api = createServerApiClient(session);
  const intent = text(formData, "intent");

  try {
    if (intent === "invite") {
      const invited = await api.inviteAdminUser({
        email: text(formData, "email"),
        displayName: text(formData, "displayName") || undefined,
        roleKey: roleKey(formData),
        clearance: clearance(formData)
      });
      return NextResponse.json({ user: invited, temporaryPassword: invited.temporaryPassword });
    }

    if (intent === "updateAssignment") {
      const updated = await api.updateAdminUser(text(formData, "userId"), {
        roleKey: roleKey(formData),
        clearance: clearance(formData)
      });
      return NextResponse.json({ user: updated });
    }

    if (intent === "setStatus") {
      const updated = await api.updateAdminUser(text(formData, "userId"), {
        status: status(formData)
      });
      return NextResponse.json({ user: updated });
    }

    return NextResponse.json({ error: "Unsupported admin action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: apiErrorMessage(error) }, { status: 400 });
  }
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function roleKey(formData: FormData): "platform_admin" | "compliance_manager" | "auditor" | "viewer" {
  const value = text(formData, "roleKey");
  return value === "platform_admin" || value === "compliance_manager" || value === "auditor" ? value : "viewer";
}

function clearance(formData: FormData): "public" | "internal" | "confidential" | "restricted" {
  const value = text(formData, "clearance");
  if (value === "public" || value === "internal" || value === "confidential" || value === "restricted") {
    return value;
  }
  return "internal";
}

function status(formData: FormData): "active" | "disabled" {
  return text(formData, "status") === "disabled" ? "disabled" : "active";
}
