import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
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
  if (session.kind !== "tenant") {
    return NextResponse.json({ error: "Risk and acceptance workflows require a tenant session." }, { status: 403 });
  }

  const api = createServerApiClient(session);
  const intent = text(formData, "intent");
  const ownerId = text(formData, "ownerId") || session.userId;

  if (intent === "createRiskFromFinding") {
    const findingId = text(formData, "findingId");
    const riskIdempotencyKey = idempotencyKey(formData, "risk-create");
    const mitigationDueAt = dateTime(formData, "mitigationDueAt", dateDaysFromNowIso(45));
    const risk = await api.createRisk(
      {
        riskModelId: optionalText(formData, "riskModelId"),
        riskKey: text(formData, "riskKey"),
        title: text(formData, "title"),
        category: text(formData, "category") || "compliance",
        inherentScore: score(formData, "inherentScore", 75),
        residualScore: score(formData, "residualScore", 45),
        ownerId
      },
      { idempotencyKey: riskIdempotencyKey }
    );
    await api.createRiskLink(
      risk.id,
      {
        targetType: "finding",
        targetId: findingId,
        relationship: "caused_by"
      },
      { idempotencyKey: `${riskIdempotencyKey}:link` }
    );
    const mitigationPlan = optionalText(formData, "mitigationPlan");
    if (mitigationPlan) {
      await api.createRiskTreatment(
        risk.id,
        {
          strategy: treatmentStrategy(formData),
          plan: mitigationPlan,
          ownerId,
          dueAt: mitigationDueAt
        },
        { idempotencyKey: `${riskIdempotencyKey}:treatment` }
      );
    }
    const task = await api.createRemediationTask(
      {
        findingId,
        ownerId,
        dueAt: mitigationDueAt
      },
      { idempotencyKey: `${riskIdempotencyKey}:task` }
    );
    return redirectTo(request, `/risks?findingId=${findingId}&riskId=${risk.id}&taskId=${task.id}`);
  }

  if (intent === "createRemediationTask") {
    const findingId = text(formData, "findingId");
    const task = await api.createRemediationTask(
      {
        findingId,
        ownerId,
        dueAt: dateTime(formData, "dueAt")
      },
      { idempotencyKey: idempotencyKey(formData, "task-create") }
    );
    return redirectTo(request, `/risks?findingId=${findingId}&taskId=${task.id}${riskSuffix(formData)}`);
  }

  if (intent === "completeRiskSetup") {
    const findingId = text(formData, "findingId");
    const riskId = text(formData, "riskId");
    const setupKey = idempotencyKey(formData, "risk-setup");
    let taskId = optionalText(formData, "taskId");
    if (!taskId) {
      const task = await api.createRemediationTask(
        {
          findingId,
          ownerId,
          dueAt: dateTime(formData, "dueAt")
        },
        { idempotencyKey: `${setupKey}:task` }
      );
      taskId = task.id;
    }
    if (text(formData, "hasTreatment") !== "true") {
      await api.createRiskTreatment(
        riskId,
        {
          strategy: treatmentStrategy(formData),
          plan: text(formData, "plan"),
          ownerId,
          dueAt: dateTime(formData, "dueAt")
        },
        { idempotencyKey: `${setupKey}:treatment` }
      );
    }
    return redirectTo(request, `/risks?findingId=${findingId}&riskId=${riskId}&taskId=${taskId}`);
  }

  if (intent === "createRiskTreatment") {
    const riskId = text(formData, "riskId");
    await api.createRiskTreatment(
      riskId,
      {
        strategy: treatmentStrategy(formData),
        plan: text(formData, "plan"),
        ownerId,
        dueAt: dateTime(formData, "dueAt")
      },
      { idempotencyKey: idempotencyKey(formData, "risk-treatment-create") }
    );
    return redirectTo(request, selectedHref(formData));
  }

  if (intent === "acceptRisk") {
    const taskId = text(formData, "taskId");
    const reason = text(formData, "reason");
    if (reason.length < 40) {
      return NextResponse.json({ error: "Risk acceptance requires a meaningful explanation of at least 40 characters." }, { status: 400 });
    }
    const linkedRemediationEvidence = await hasLinkedRemediationEvidence(api, taskId);
    if (linkedRemediationEvidence) {
      return NextResponse.json(
        { error: "This remediation task already has remediation evidence. Choose remediation review instead of risk acceptance for this attempt." },
        { status: 409 }
      );
    }
    await api.acceptRemediationTaskRisk(
      taskId,
      {
        riskId: optionalText(formData, "riskId"),
        reason,
        expiresAt: dateTime(formData, "expiresAt"),
        nextReviewDueAt: dateTime(formData, "nextReviewDueAt"),
        compensatingControls: optionalText(formData, "compensatingControls")
      },
      { idempotencyKey: idempotencyKey(formData, "risk-acceptance-create") }
    );
    return redirectTo(request, selectedHref(formData));
  }

  if (intent === "submitRemediation") {
    const findingId = text(formData, "findingId");
    const riskId = optionalText(formData, "riskId");
    const taskId = text(formData, "taskId");
    const uploadKey = idempotencyKey(formData, "remediation-submit");
    const acceptance = await api.getRemediationTaskRiskAcceptance(taskId).catch(() => null);
    if (acceptance) {
      return NextResponse.json(
        { error: "This remediation task already has a risk acceptance. Create a new remediation attempt only after the acceptance is revoked or rejected." },
        { status: 409 }
      );
    }
    const remediationAnswer = text(formData, "remediationAnswer");
    if (remediationAnswer.length < 20) {
      return NextResponse.json({ error: "A remediation answer of at least 20 characters is required." }, { status: 400 });
    }
    const dueAt = dateTime(formData, "dueAt", dateDaysFromNowIso(30));
    const scopeTags = splitList(text(formData, "scopeTags"));
    const periodStart = dateTime(formData, "periodStart");
    const periodEnd = dateTime(formData, "periodEnd");

    const answerFileName = `remediation-answer-${taskId.slice(0, 8)}.txt`;
    const answerEvidence = await api.initiateEvidenceUpload(
      {
        ownerId,
        fileName: answerFileName,
        classification: "restricted",
        periodStart,
        periodEnd,
        scopeTags: [...new Set([...scopeTags, "remediation-answer"])]
      },
      { idempotencyKey: `${uploadKey}:answer:initiate` }
    );
    const uploadedAnswer = await api.uploadEvidenceObject(
      answerEvidence.id,
      {
        bytesBase64: Buffer.from(remediationAnswer, "utf8").toString("base64"),
        mimeType: "text/plain",
        storageUri: `cybernara://evidence/${answerEvidence.id}/${encodeURIComponent(answerFileName)}`
      },
      { idempotencyKey: `${uploadKey}:answer:upload` }
    );
    const answerVersion = await latestEvidenceVersion(api, uploadedAnswer.id);
    await api.createEvidenceLink(
      answerVersion.id,
      {
        targetType: "remediation_task",
        targetId: taskId,
        purpose: "remediation_answer",
        scopeMatch: true,
        periodMatch: true
      },
      { idempotencyKey: `${uploadKey}:answer:link` }
    );

    const existingVersionIds = formData
      .getAll("existingEvidenceVersionIds")
      .map((val) => (typeof val === "string" ? val.trim() : ""))
      .filter(Boolean);

    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (files.length === 0 && existingVersionIds.length === 0) {
      return NextResponse.json(
        { error: "Provide at least one evidence file (either upload new files or select from previously submitted evidence)." },
        { status: 400 }
      );
    }

    for (const [index, versionId] of existingVersionIds.entries()) {
      await api
        .createEvidenceLink(
          versionId,
          {
            targetType: "remediation_task",
            targetId: taskId,
            purpose: "remediation_evidence_reuse",
            scopeMatch: true,
            periodMatch: true
          },
          { idempotencyKey: `${uploadKey}:existing:${index}:${versionId}` }
        )
        .catch(() => null);
    }

    for (const [index, file] of files.entries()) {
      const initiated = await api.initiateEvidenceUpload(
        {
          ownerId,
          fileName: file.name,
          classification: "restricted",
          periodStart,
          periodEnd,
          scopeTags
        },
        { idempotencyKey: `${uploadKey}:file:${index}:initiate` }
      );
      const uploaded = await api.uploadEvidenceObject(
        initiated.id,
        {
          bytesBase64: Buffer.from(await file.arrayBuffer()).toString("base64"),
          mimeType: file.type || "application/octet-stream",
          storageUri: `cybernara://evidence/${initiated.id}/${encodeURIComponent(file.name)}`
        },
        { idempotencyKey: `${uploadKey}:file:${index}:upload` }
      );
      const version = await latestEvidenceVersion(api, uploaded.id);
      await api.createEvidenceLink(
        version.id,
        {
          targetType: "remediation_task",
          targetId: taskId,
          purpose: "remediation_evidence_upload",
          scopeMatch: true,
          periodMatch: true
        },
        { idempotencyKey: `${uploadKey}:file:${index}:link` }
      );
    }
    await api.updateRemediationTask(
      taskId,
      {
        ownerId,
        dueAt,
        status: "in_progress"
      },
      { idempotencyKey: `${uploadKey}:task-status` }
    );
    return redirectTo(request, `/risks?findingId=${findingId}${riskId ? `&riskId=${riskId}` : ""}&taskId=${taskId}&mode=review`);
  }

  if (intent === "reviewAcceptance") {
    await api.reviewRemediationTaskRiskAcceptance(
      text(formData, "taskId"),
      {
        decision: acceptanceDecision(formData),
        reason: text(formData, "reason")
      },
      { idempotencyKey: idempotencyKey(formData, "risk-acceptance-review") }
    );
    return redirectTo(request, selectedHref(formData));
  }

  if (intent === "linkExistingRemediationEvidence") {
    const taskId = text(formData, "taskId");
    const acceptance = await api.getRemediationTaskRiskAcceptance(taskId).catch(() => null);
    if (acceptance) {
      return NextResponse.json(
        { error: "This remediation task already has a risk acceptance. Evidence cannot be linked to the same acceptance attempt." },
        { status: 409 }
      );
    }
    const evidenceId = text(formData, "evidenceId");
    const version = await latestEvidenceVersion(api, evidenceId);
    await api.createEvidenceLink(
      version.id,
      {
        targetType: "remediation_task",
        targetId: taskId,
        purpose: "remediation_evidence",
        scopeMatch: true,
        periodMatch: true
      },
      { idempotencyKey: idempotencyKey(formData, "remediation-evidence-link") }
    );
    return redirectTo(request, selectedHref(formData));
  }

  if (intent === "uploadRemediationEvidence") {
    const files = formData
      .getAll("file")
      .filter((value): value is File => value instanceof File && value.size > 0);
    if (files.length === 0) {
      return NextResponse.json({ error: "A remediation evidence file is required." }, { status: 400 });
    }
    const taskId = text(formData, "taskId");
    const acceptance = await api.getRemediationTaskRiskAcceptance(taskId).catch(() => null);
    if (acceptance) {
      return NextResponse.json(
        { error: "This remediation task already has a risk acceptance. Evidence cannot be uploaded to the same acceptance attempt." },
        { status: 409 }
      );
    }
    const uploadKey = idempotencyKey(formData, "remediation-evidence-upload");
    for (const [index, file] of files.entries()) {
      const initiated = await api.initiateEvidenceUpload(
        {
          ownerId,
          fileName: file.name,
          classification: classification(formData),
          periodStart: dateTime(formData, "periodStart"),
          periodEnd: dateTime(formData, "periodEnd"),
          scopeTags: splitList(text(formData, "scopeTags"))
        },
        { idempotencyKey: `${uploadKey}:${index}:initiate` }
      );
      const uploaded = await api.uploadEvidenceObject(
        initiated.id,
        {
          bytesBase64: Buffer.from(await file.arrayBuffer()).toString("base64"),
          mimeType: file.type || "application/octet-stream",
          storageUri: `cybernara://evidence/${initiated.id}/${encodeURIComponent(file.name)}`
        },
        { idempotencyKey: `${uploadKey}:${index}:upload` }
      );
      const version = await latestEvidenceVersion(api, uploaded.id);
      await api.createEvidenceLink(
        version.id,
        {
          targetType: "remediation_task",
          targetId: taskId,
          purpose: "remediation_evidence_upload",
          scopeMatch: true,
          periodMatch: true
        },
        { idempotencyKey: `${uploadKey}:${index}:link` }
      );
    }
    return redirectTo(request, selectedHref(formData));
  }

  if (intent === "reviewRemediationTask") {
    await api.reviewRemediationTask(
      text(formData, "taskId"),
      {
        decision: remediationDecision(formData),
        rationale: text(formData, "rationale"),
        evidenceVersionIds: splitList(text(formData, "evidenceVersionIds"))
      },
      { idempotencyKey: idempotencyKey(formData, "remediation-task-review") }
    );
    return redirectTo(request, selectedHref(formData));
  }

  return NextResponse.json({ error: "Unsupported risk action." }, { status: 400 });
}

function redirectTo(request: NextRequest, href: string) {
  revalidatePath("/risks");
  revalidatePath("/findings");
  revalidatePath("/enterprise");
  return NextResponse.redirect(new URL(href, request.headers.get("origin") ?? request.url), 303);
}

function selectedHref(formData: FormData): string {
  const query = new URLSearchParams();
  for (const key of ["findingId", "riskId", "taskId", "mode", "choice"]) {
    const value = text(formData, key);
    if (value) {
      query.set(key, value);
    }
  }
  const suffix = query.toString();
  return suffix ? `/risks?${suffix}` : "/risks";
}

function riskSuffix(formData: FormData): string {
  const riskId = text(formData, "riskId");
  return riskId ? `&riskId=${riskId}` : "";
}

function idempotencyKey(formData: FormData, prefix: string): string {
  return text(formData, "idempotencyKey") || `${prefix}-${randomUUID()}`;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(formData: FormData, key: string): string | undefined {
  const value = text(formData, key);
  return value.length > 0 ? value : undefined;
}

function score(formData: FormData, key: string, fallback: number): number {
  const parsed = Number.parseInt(text(formData, key), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, parsed));
}

function dateTime(formData: FormData, key: string, fallback?: string): string {
  const value = text(formData, key);
  if (!value) {
    return fallback ?? new Date().toISOString();
  }
  return value.includes("T") ? value : `${value}T00:00:00.000Z`;
}

function treatmentStrategy(formData: FormData): "accept" | "mitigate" | "transfer" | "avoid" {
  const value = text(formData, "strategy");
  return value === "accept" || value === "transfer" || value === "avoid" ? value : "mitigate";
}

function acceptanceDecision(formData: FormData): "reaffirmed" | "revoked" | "escalated" {
  const value = text(formData, "decision");
  return value === "revoked" || value === "escalated" ? value : "reaffirmed";
}

function remediationDecision(formData: FormData): "approved" | "rejected" {
  return text(formData, "decision") === "approved" ? "approved" : "rejected";
}

function classification(formData: FormData): "internal" | "confidential" | "restricted" {
  const value = text(formData, "classification");
  return value === "internal" || value === "confidential" ? value : "restricted";
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function latestEvidenceVersion(
  api: ReturnType<typeof createServerApiClient>,
  evidenceId: string
): Promise<{ id: string }> {
  const versions = await api.listEvidenceVersions(evidenceId, { limit: 1, offset: 0 });
  const latest = versions[0] ?? null;
  if (!latest) {
    throw new Error("Evidence object has no committed version to link.");
  }
  return latest;
}

async function hasLinkedRemediationEvidence(
  api: ReturnType<typeof createServerApiClient>,
  taskId: string
): Promise<boolean> {
  const objects = await api.listEvidenceObjects({ limit: 100, offset: 0, state: "committed" }).catch(() => []);
  for (const object of objects) {
    const versions = await api.listEvidenceVersions(object.id, { limit: 1, offset: 0 }).catch(() => []);
    const version = versions[0] ?? null;
    if (!version) {
      continue;
    }
    const links = await api.listEvidenceLinks(version.id, { limit: 100, offset: 0 }).catch(() => []);
    if (links.some((link) => link.targetType === "remediation_task" && link.targetId === taskId)) {
      return true;
    }
  }
  return false;
}

function dateDaysFromNowIso(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.toISOString().slice(0, 10)}T00:00:00.000Z`;
}
