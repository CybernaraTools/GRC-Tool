import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { apiErrorMessage, createServerApiClient } from "../../../src/lib/api/server";
import { accessTokenCookieName, readSessionContextFromAccessToken } from "../../../src/lib/session";

export async function POST(request: NextRequest) {
  const session = await readSessionContextFromAccessToken(request.cookies.get(accessTokenCookieName)?.value);
  if (!session) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const formData = await request.formData();
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required." }, { status: 400 });
  }

  const api = createServerApiClient(session);
  const idempotencyKey = text(formData, "idempotencyKey") || `evidence-browser-upload-${randomUUID()}`;
  const assessmentId = text(formData, "assessmentId");
  const itemId = text(formData, "itemId");

  try {
    const initiated = await api.initiateEvidenceUpload(
      {
        ownerId: text(formData, "ownerId") || session.userId,
        fileName: file.name,
        classification: classification(formData),
        periodStart: text(formData, "periodStart"),
        periodEnd: text(formData, "periodEnd"),
        scopeTags: splitList(text(formData, "scopeTags"))
      },
      { idempotencyKey: `${idempotencyKey}:initiate` }
    );

    const bytesBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const mimeType = file.type || "application/octet-stream";
    const uploaded = await api.uploadEvidenceObject(
      initiated.id,
      {
        bytesBase64,
        mimeType,
        storageUri: `cybernara://evidence/${initiated.id}/${encodeURIComponent(file.name)}`
      },
      { idempotencyKey: `${idempotencyKey}:upload` }
    );

    const versions = await api.listEvidenceVersions(uploaded.id, { limit: 1, offset: 0 });
    const latestVersion = versions[0] ?? null;
    const link = latestVersion && itemId
      ? await api.createEvidenceLink(
          latestVersion.id,
          {
            targetType: "assessment_item",
            targetId: itemId,
            purpose: "assessment_workspace_browser_upload",
            scopeMatch: true,
            periodMatch: Boolean(assessmentId)
          },
          { idempotencyKey: `${idempotencyKey}:link` }
        )
      : null;

    if (!wantsJson) {
      const query = new URLSearchParams({ assessmentId, evidenceId: uploaded.id, upload: "success" });
      if (itemId) {
        query.set("itemId", itemId);
      }
      return NextResponse.redirect(new URL(`/assessments?${query.toString()}`, request.url), 303);
    }

    return NextResponse.json({
      evidence: uploaded,
      evidenceVersionId: latestVersion?.id ?? null,
      evidenceLinkId: link?.id ?? null
    });
  } catch (error) {
    return NextResponse.json({ error: apiErrorMessage(error) }, { status: 400 });
  }
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

function classification(formData: FormData): "internal" | "confidential" | "restricted" {
  const value = text(formData, "classification");
  return value === "internal" || value === "confidential" ? value : "restricted";
}
