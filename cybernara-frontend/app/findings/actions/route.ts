import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { loginPath } from "../../../src/lib/auth";
import { createServerApiClient } from "../../../src/lib/api/server";
import { accessTokenCookieName, readSessionContextFromAccessToken } from "../../../src/lib/session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const session = await readSessionContextFromAccessToken(request.cookies.get(accessTokenCookieName)?.value);
  if (!session) {
    return redirectTo(request, loginPath(selectedHref(formData)));
  }

  const api = createServerApiClient(session);
  const intent = text(formData, "intent");
  const ownerId = text(formData, "ownerId") || session.userId;

  if (intent === "createFinding") {
    await api.createRiskFinding(
      {
        assessmentItemId: text(formData, "itemId"),
        severity: severity(formData),
        impact: impact(formData),
        likelihood: likelihood(formData),
        ownerId,
        dueAt: dueAt(formData),
        description: text(formData, "description")
      },
      { idempotencyKey: idempotencyKey(formData, "finding-create") }
    );
    return redirectTo(request, selectedHref(formData));
  }

  if (intent === "updateFinding") {
    const findingId = text(formData, "findingId");
    await api.updateRiskFinding(
      findingId,
      {
        severity: severity(formData),
        impact: impact(formData),
        likelihood: likelihood(formData),
        ownerId,
        dueAt: dueAt(formData),
        description: text(formData, "description")
      },
      { idempotencyKey: idempotencyKey(formData, "finding-update") }
    );
    return redirectTo(request, selectedHref(formData));
  }

  return NextResponse.json({ error: "Unsupported findings action." }, { status: 400 });
}

function redirectTo(request: NextRequest, href: string) {
  revalidatePath("/findings");
  revalidatePath("/assessments");
  revalidatePath("/assessments/review");
  return NextResponse.redirect(new URL(href, request.headers.get("origin") ?? request.url), 303);
}

function selectedHref(formData: FormData): string {
  const query = new URLSearchParams();
  const assessmentId = text(formData, "assessmentId");
  const itemId = text(formData, "itemId");
  if (assessmentId) {
    query.set("assessmentId", assessmentId);
  }
  if (itemId) {
    query.set("itemId", itemId);
  }
  const suffix = query.toString();
  return suffix ? `/findings?${suffix}` : "/findings";
}

function idempotencyKey(formData: FormData, prefix: string): string {
  return text(formData, "idempotencyKey") || `${prefix}-${randomUUID()}`;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function severity(formData: FormData): "low" | "medium" | "high" | "critical" {
  const value = text(formData, "severity");
  return value === "low" || value === "medium" || value === "critical" ? value : "high";
}

function impact(formData: FormData): "low" | "medium" | "high" | "critical" | undefined {
  const value = text(formData, "impact");
  return value === "low" || value === "medium" || value === "high" || value === "critical" ? value : undefined;
}

function likelihood(formData: FormData): "rare" | "unlikely" | "possible" | "likely" | "almost_certain" | undefined {
  const value = text(formData, "likelihood");
  return value === "rare" || value === "unlikely" || value === "possible" || value === "almost_certain"
    ? value
    : value === "likely" ? "likely" : undefined;
}

function dueAt(formData: FormData): string | undefined {
  const value = text(formData, "dueAt");
  return value ? `${value}T00:00:00.000Z` : undefined;
}
