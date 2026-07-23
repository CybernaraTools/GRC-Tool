import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { loginPath } from "../../../../src/lib/auth";
import { createServerApiClient } from "../../../../src/lib/api/server";
import { accessTokenCookieName, isPlatformSession, readSessionContextFromAccessToken } from "../../../../src/lib/session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const session = await readSessionContextFromAccessToken(request.cookies.get(accessTokenCookieName)?.value);
  if (!isPlatformSession(session)) {
    return redirectTo(request, loginPath("/platform/questions"));
  }

  const api = createServerApiClient(session);
  const intent = text(formData, "intent");

  if (intent === "populateBaseline") {
    await api.populateQuestionRepositoryBaseline({
      frameworkVersionId: text(formData, "frameworkVersionId") || undefined,
      limit: numberValue(formData, "limit")
    });
    return redirectTo(request, "/platform/questions");
  }

  if (intent === "createDraft") {
    await api.createQuestionRepositoryDraft({
      harmonizedControlId: text(formData, "harmonizedControlId"),
      questionText: text(formData, "questionText"),
      responseType: responseType(formData),
      evidenceExpectationIds: splitList(text(formData, "evidenceExpectationIds")),
      citations: citationsValue(formData),
      confidence: numberValue(formData, "confidence") ?? 1
    });
    return redirectTo(request, "/platform/questions?status=draft");
  }

  if (intent === "createRevision") {
    await api.createQuestionRepositoryRevision(text(formData, "baseQuestionVersionId"), {
      harmonizedControlId: text(formData, "harmonizedControlId"),
      questionText: text(formData, "questionText"),
      responseType: responseType(formData),
      evidenceExpectationIds: splitList(text(formData, "evidenceExpectationIds")),
      citations: citationsValue(formData),
      confidence: numberValue(formData, "confidence") ?? 1
    });
    return redirectTo(request, "/platform/questions?status=draft");
  }

  if (intent === "approve") {
    await api.approveQuestionRepositoryEntry(text(formData, "questionVersionId"));
    return redirectTo(request, "/platform/questions?status=approved");
  }

  if (intent === "updateStatus") {
    await api.updateQuestionRepositoryStatus(text(formData, "questionVersionId"), {
      status: lifecycleStatus(formData)
    });
    return redirectTo(request, "/platform/questions");
  }

  return NextResponse.json({ error: "Unsupported question repository action." }, { status: 400 });
}

function redirectTo(request: NextRequest, href: string) {
  revalidatePath("/platform/questions");
  return NextResponse.redirect(new URL(href, request.headers.get("origin") ?? request.url), 303);
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function splitList(value: string): string[] {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function numberValue(formData: FormData, key: string): number | undefined {
  const value = Number(text(formData, key));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function responseType(formData: FormData): "boolean" | "text" | "maturity" | "multi_select" {
  const value = text(formData, "responseType");
  return value === "boolean" || value === "maturity" || value === "multi_select" ? value : "text";
}

function citationsValue(formData: FormData): Array<Record<string, unknown>> {
  const value = text(formData, "citationsJson");
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
      : [];
  } catch {
    return [];
  }
}

function lifecycleStatus(formData: FormData): "approved" | "inactive" | "retired" | "deprecated" {
  const value = text(formData, "status");
  return value === "inactive" || value === "retired" || value === "deprecated" ? value : "approved";
}
