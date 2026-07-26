import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { loginPath } from "../../../src/lib/auth";
import { createServerApiClient, apiErrorMessage } from "../../../src/lib/api/server";
import { accessTokenCookieName, readSessionContextFromAccessToken } from "../../../src/lib/session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const session = await readSessionContextFromAccessToken(request.cookies.get(accessTokenCookieName)?.value);
  if (!session) {
    return redirectTo(request, loginPath("/reports"));
  }

  const api = createServerApiClient(session);
  const intent = text(formData, "intent");

  if (intent === "generateReport") {
    const assessmentId = text(formData, "assessmentId");
    try {
      const report = await api.generateAuditReport(assessmentId, {
        idempotencyKey: text(formData, "idempotencyKey") || `audit-report-generate-${assessmentId}-${randomUUID()}`
      });
      return redirectTo(request, `/reports/${report.id}`);
    } catch (error) {
      return redirectTo(request, `/reports?error=${encodeURIComponent(apiErrorMessage(error))}`);
    }
  }

  return redirectTo(request, "/reports");
}

function redirectTo(request: NextRequest, href: string) {
  revalidatePath("/reports");
  return NextResponse.redirect(new URL(href, request.headers.get("origin") ?? request.url), 303);
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
