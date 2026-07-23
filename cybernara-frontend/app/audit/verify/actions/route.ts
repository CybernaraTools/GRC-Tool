import { NextResponse, type NextRequest } from "next/server";
import { loginPath } from "../../../../src/lib/auth";
import { createServerApiClient } from "../../../../src/lib/api/server";
import { accessTokenCookieName, readSessionContextFromAccessToken } from "../../../../src/lib/session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const session = await readSessionContextFromAccessToken(request.cookies.get(accessTokenCookieName)?.value);
  if (!session) {
    return redirectTo(request, loginPath("/audit/verify"));
  }

  const api = createServerApiClient(session);
  const intent = text(formData, "intent");

  if (intent === "createCheckpoint") {
    try {
      await api.createAuditCheckpoint();
      return redirectTo(request, `/audit/verify`);
    } catch (error) {
      console.error("Failed to create audit checkpoint:", error);
      return redirectTo(request, `/audit/verify`);
    }
  }

  if (intent === "verifyCheckpoint") {
    const checkpointId = text(formData, "checkpointId");
    try {
      await api.verifyAuditCheckpoint(checkpointId);
      return redirectTo(request, `/audit/verify`);
    } catch (error) {
      console.error("Failed to verify checkpoint:", error);
      return redirectTo(request, `/audit/verify`);
    }
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}

function redirectTo(request: NextRequest, href: string) {
  return NextResponse.redirect(new URL(href, request.headers.get("origin") ?? request.url), 303);
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
