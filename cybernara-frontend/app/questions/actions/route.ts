import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { loginPath } from "../../../src/lib/auth";
import { createServerApiClient, apiErrorMessage } from "../../../src/lib/api/server";
import type { TenantQuestion } from "../../../src/lib/api/generated";
import { accessTokenCookieName, readSessionContextFromAccessToken } from "../../../src/lib/session";

const validResponseTypes = new Set<TenantQuestion["responseType"]>(["boolean", "text", "maturity", "multi_select"]);

function responseTypeValue(value: string): TenantQuestion["responseType"] {
  return validResponseTypes.has(value as TenantQuestion["responseType"]) ? (value as TenantQuestion["responseType"]) : "text";
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const session = await readSessionContextFromAccessToken(request.cookies.get(accessTokenCookieName)?.value);
  if (!session) {
    return redirectTo(request, loginPath("/questions"));
  }

  const api = createServerApiClient(session);
  const intent = text(formData, "intent");

  if (intent === "createCustomQuestion") {
    try {
      await api.createTenantQuestion({
        questionText: text(formData, "questionText"),
        responseType: responseTypeValue(text(formData, "responseType")),
        description: text(formData, "description") || undefined,
        frameworkKeys: splitList(text(formData, "frameworkKeys"))
      });
      return redirectTo(request, "/questions");
    } catch (error) {
      return redirectTo(request, `/questions?error=${encodeURIComponent(apiErrorMessage(error))}`);
    }
  }

  if (intent === "createAssessmentFromCustomQuestion") {
    const customQuestionId = text(formData, "customQuestionId");
    try {
      const assessment = await api.createAssessmentForCustomQuestion(
        customQuestionId,
        {
          scopeName: text(formData, "scopeName"),
          ownerId: text(formData, "ownerId") || session.userId,
          periodStart: text(formData, "periodStart"),
          periodEnd: text(formData, "periodEnd")
        },
        { idempotencyKey: text(formData, "idempotencyKey") || `custom-question-assessment-${customQuestionId}-${randomUUID()}` }
      );
      revalidatePath("/assessments");
      return redirectTo(request, `/assessments?assessmentId=${assessment.id}`);
    } catch (error) {
      return redirectTo(request, `/assessments?customQuestionId=${customQuestionId}&error=${encodeURIComponent(apiErrorMessage(error))}`);
    }
  }

  return redirectTo(request, "/questions");
}

function redirectTo(request: NextRequest, href: string) {
  revalidatePath("/questions");
  revalidatePath("/dashboard");
  return NextResponse.redirect(new URL(href, request.headers.get("origin") ?? request.url), 303);
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
