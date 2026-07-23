import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { loginPath } from "../../../../src/lib/auth";
import { createServerApiClient } from "../../../../src/lib/api/server";
import { accessTokenCookieName, readSessionContextFromAccessToken } from "../../../../src/lib/session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const session = await readSessionContextFromAccessToken(request.cookies.get(accessTokenCookieName)?.value);
  if (!session) {
    return redirectTo(request, loginPath("/privacy/retention"));
  }

  const api = createServerApiClient(session);
  const intent = text(formData, "intent");
  const currentJobId = text(formData, "deletionJobId");

  if (intent === "createSchedule") {
    const dataCategory = text(formData, "dataCategory");
    const retentionMonths = Number.parseInt(text(formData, "retentionMonths"), 10);
    const legalHold = formData.get("legalHold") === "on";

    try {
      await api.createRetentionSchedule({
        dataCategory,
        retentionMonths,
        legalHold,
        jurisdiction: "global",
        residency: "local",
        transferMechanism: "none",
        disposalEvidenceIds: []
      }, { idempotencyKey: randomUUID() });
      return redirectTo(request, `/privacy/retention`);
    } catch (error) {
      console.error("Failed to create retention schedule:", error);
      return redirectTo(request, `/privacy/retention`);
    }
  }

  if (intent === "createDeletionJob") {
    const deletionTrigger = text(formData, "deletionTrigger");

    try {
      const job = await api.createDeletionJob({
        deletionTrigger
      }, { idempotencyKey: randomUUID() });
      return redirectTo(request, `/privacy/retention?jobId=${job.id}`);
    } catch (error) {
      console.error("Failed to initialize deletion job:", error);
      return redirectTo(request, `/privacy/retention`);
    }
  }

  if (intent === "createProof") {
    const targetType = text(formData, "targetType");
    const targetId = text(formData, "targetId");
    const keyDestroyed = formData.get("keyDestroyed") === "on";
    const proofHash = text(formData, "proofHash");

    try {
      await api.createDeletionItem(currentJobId, {
        targetType: targetType as "evidence_object" | "data_inventory_record" | "evidence_version" | "rights_request" | "consent_event",
        targetId,
        keyDestroyed,
        proofHash
      }, { idempotencyKey: randomUUID() });
      return redirectTo(request, `/privacy/retention?jobId=${currentJobId}`);
    } catch (error) {
      console.error("Failed to record deletion proof:", error);
      return redirectTo(request, `/privacy/retention?jobId=${currentJobId}`);
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
