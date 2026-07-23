import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
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

  if (intent === "createAssessment") {
    const assessment = await api.createAssessment(
      {
        scopeName: text(formData, "scopeName"),
        ownerId: text(formData, "ownerId") || session.userId,
        periodStart: text(formData, "periodStart"),
        periodEnd: text(formData, "periodEnd"),
        controls: [
          {
            questionVersionId: text(formData, "questionVersionId")
          }
        ]
      },
      { idempotencyKey: idempotencyKey(formData, "assessment-create") }
    );
    return redirectTo(request, `/assessments?assessmentId=${assessment.id}`);
  }

  if (intent === "updateAssessment") {
    const assessmentId = text(formData, "assessmentId");
    const assessment = await api.updateDraftAssessment(
      assessmentId,
      {
        scopeName: text(formData, "scopeName"),
        ownerId: text(formData, "ownerId") || session.userId,
        periodStart: text(formData, "periodStart"),
        periodEnd: text(formData, "periodEnd"),
        controls: [
          {
            questionVersionId: text(formData, "questionVersionId")
          }
        ]
      },
      { idempotencyKey: idempotencyKey(formData, "assessment-update") }
    );
    return redirectTo(request, `/assessments?assessmentId=${assessment.id}`);
  }

  if (intent === "approveApplicability") {
    await api.approveAssessmentApplicability(
      text(formData, "assessmentId"),
      text(formData, "itemId"),
      {
        applicable: text(formData, "applicable") !== "false",
        rationale: text(formData, "rationale")
      },
      { idempotencyKey: idempotencyKey(formData, "applicability") }
    );
    return redirectTo(request, selectedHref(formData));
  }

  if (intent === "submitAnswer") {
    const evidenceNotRequired = text(formData, "evidenceNotRequired") === "true";
    if (text(formData, "autoApplicability") === "true" || evidenceNotRequired) {
      await api.approveAssessmentApplicability(
        text(formData, "assessmentId"),
        text(formData, "itemId"),
        {
          applicable: evidenceNotRequired ? false : text(formData, "applicable") !== "false",
          rationale: evidenceNotRequired
            ? "Submitter marked this answer as not requiring evidence."
            : text(formData, "rationale")
        },
        { idempotencyKey: `${idempotencyKey(formData, "answer")}:applicability${evidenceNotRequired ? "-no-evidence" : ""}` }
      );
    }
    await api.submitAssessmentAnswer(
      text(formData, "assessmentId"),
      text(formData, "itemId"),
      {
        answerText: answerText(formData),
        evidenceIds: evidenceNotRequired ? [] : evidenceIds(formData)
      },
      { idempotencyKey: idempotencyKey(formData, "answer") }
    );
    return redirectTo(request, selectedHref(formData));
  }

  if (intent === "reviewItem") {
    await api.reviewAssessmentItem(
      text(formData, "assessmentId"),
      text(formData, "itemId"),
      {
        approved: text(formData, "approved") !== "false",
        reason: text(formData, "reason") || undefined
      },
      { idempotencyKey: idempotencyKey(formData, "review") }
    );
    return redirectTo(request, selectedHref(formData));
  }

  if (intent === "closeAssessment") {
    await api.closeAssessment(text(formData, "assessmentId"), { idempotencyKey: idempotencyKey(formData, "close") });
    return redirectTo(request, selectedHref(formData));
  }

  if (intent === "reopenItem") {
    await api.reopenAssessmentItem(
      text(formData, "assessmentId"),
      text(formData, "itemId"),
      { reason: text(formData, "reason") },
      { idempotencyKey: idempotencyKey(formData, "reopen") }
    );
    return redirectTo(request, selectedHref(formData));
  }

  if (intent === "refreshScanStatus") {
    // Just revalidate/redirect to refresh the server components
    return redirectTo(request, selectedHref(formData));
  }

  if (intent === "initiateEvidence") {
    const evidence = await api.initiateEvidenceUpload(
      {
        ownerId: text(formData, "ownerId") || session.userId,
        fileName: text(formData, "fileName"),
        classification: classification(formData),
        periodStart: text(formData, "periodStart"),
        periodEnd: text(formData, "periodEnd"),
        scopeTags: splitList(text(formData, "scopeTags"))
      },
      { idempotencyKey: idempotencyKey(formData, "evidence-create") }
    );
    return redirectTo(request, `${selectedHref(formData)}&evidenceId=${evidence.id}`);
  }

  if (intent === "quarantineEvidence") {
    const evidenceId = text(formData, "evidenceId");
    await api.quarantineEvidenceObject(
      evidenceId,
      { storageUri: text(formData, "storageUri") || undefined },
      { idempotencyKey: idempotencyKey(formData, "evidence-quarantine") }
    );
    return redirectTo(request, `${selectedHref(formData)}&evidenceId=${evidenceId}`);
  }

  if (intent === "commitEvidence") {
    const evidenceId = text(formData, "evidenceId");
    const content = text(formData, "content") || "quarterly access review evidence";
    await api.commitEvidenceObject(
      evidenceId,
      {
        scannerVerdict: "clean",
        bytesBase64: Buffer.from(content).toString("base64"),
        storageUri: text(formData, "storageUri") || undefined
      },
      { idempotencyKey: idempotencyKey(formData, "evidence-commit") }
    );
    return redirectTo(request, `${selectedHref(formData)}&evidenceId=${evidenceId}`);
  }

  if (intent === "checkEvidenceReuse") {
    const evidenceId = text(formData, "evidenceId");
    const decision = await api.checkEvidenceReuse(evidenceId, {
      periodStart: text(formData, "periodStart"),
      periodEnd: text(formData, "periodEnd"),
      scopeTags: splitList(text(formData, "scopeTags"))
    });
    return redirectTo(request, `${selectedHref(formData)}&evidenceId=${evidenceId}&reuse=${decision.reusable ? "yes" : "no"}`);
  }

  if (intent === "createFinding") {
    const finding = await api.createRiskFinding(
      {
        assessmentItemId: text(formData, "itemId"),
        severity: severity(formData),
        description: text(formData, "description")
      },
      { idempotencyKey: idempotencyKey(formData, "finding-create") }
    );
    return redirectTo(request, `${selectedHref(formData)}&findingId=${finding.id}`);
  }

  if (intent === "updateFinding") {
    const findingId = text(formData, "findingId");
    await api.updateRiskFinding(
      findingId,
      {
        severity: severity(formData),
        description: text(formData, "description")
      },
      { idempotencyKey: idempotencyKey(formData, "finding-update") }
    );
    return redirectTo(request, `${selectedHref(formData)}&findingId=${findingId}`);
  }

  if (intent === "createRemediationTask") {
    const task = await api.createRemediationTask(
      {
        findingId: text(formData, "findingId"),
        ownerId: text(formData, "ownerId") || session.userId,
        dueAt: text(formData, "dueAt")
      },
      { idempotencyKey: idempotencyKey(formData, "task-create") }
    );
    return redirectTo(request, `${selectedHref(formData)}&findingId=${task.findingId}&taskId=${task.id}`);
  }

  if (intent === "updateRemediationTask") {
    await api.updateRemediationTask(
      text(formData, "taskId"),
      {
        ownerId: text(formData, "ownerId") || session.userId,
        dueAt: text(formData, "dueAt"),
        status: status(formData)
      },
      { idempotencyKey: idempotencyKey(formData, "task-update") }
    );
    return redirectTo(request, selectedHref(formData));
  }

  if (intent === "acceptRisk") {
    await api.acceptRemediationTaskRisk(
      text(formData, "taskId"),
      {
        reason: text(formData, "reason"),
        expiresAt: text(formData, "expiresAt"),
        nextReviewDueAt: text(formData, "nextReviewDueAt"),
        compensatingControls: text(formData, "compensatingControls") || undefined
      },
      { idempotencyKey: idempotencyKey(formData, "risk-accept") }
    );
    return redirectTo(request, selectedHref(formData));
  }

  if (intent === "createTestProcedure") {
    await api.createAssessmentTestProcedure(
      text(formData, "assessmentId"),
      text(formData, "itemId"),
      {
        procedureKey: text(formData, "procedureKey"),
        method: text(formData, "method"),
        expectedResult: text(formData, "expectedResult")
      },
      { idempotencyKey: idempotencyKey(formData, "test-procedure-create") }
    );
    return redirectTo(request, selectedHref(formData));
  }

  if (intent === "recordControlTestResult") {
    await api.recordAssessmentControlTestResult(
      text(formData, "assessmentId"),
      text(formData, "itemId"),
      {
        testProcedureId: text(formData, "testProcedureId"),
        result: testResult(formData),
        population: text(formData, "population") || undefined
      },
      { idempotencyKey: idempotencyKey(formData, "test-result-record") }
    );
    return redirectTo(request, selectedHref(formData));
  }

  if (intent === "requestReportExport") {
    const exportRecord = await api.requestReportExport(
      {
        assessmentId: text(formData, "assessmentId"),
        snapshotId: text(formData, "snapshotId"),
        templateVersion: text(formData, "templateVersion"),
        format: reportFormat(formData)
      },
      { idempotencyKey: reportExportIdempotencyKey(formData) }
    );
    return redirectTo(request, `${selectedHref(formData)}&exportId=${exportRecord.id}`);
  }

  return NextResponse.json({ error: "Unsupported assessment action." }, { status: 400 });
}

function redirectTo(request: NextRequest, href: string) {
  revalidatePath("/assessments");
  revalidatePath("/assessments/review");
  return NextResponse.redirect(new URL(href, request.headers.get("origin") ?? request.url), 303);
}

function selectedHref(formData: FormData): string {
  const assessmentId = text(formData, "assessmentId");
  const itemId = text(formData, "itemId");
  const returnTo = returnToPath(formData);
  const query = new URLSearchParams();
  if (assessmentId) {
    query.set("assessmentId", assessmentId);
  }
  if (itemId) {
    query.set("itemId", itemId);
  }
  const suffix = query.toString();
  return suffix ? `${returnTo}?${suffix}` : returnTo;
}

function returnToPath(formData: FormData): "/assessments" | "/assessments/review" {
  return text(formData, "returnTo") === "/assessments/review" ? "/assessments/review" : "/assessments";
}

function idempotencyKey(formData: FormData, prefix: string): string {
  return text(formData, "idempotencyKey") || `${prefix}-${randomUUID()}`;
}

function reportExportIdempotencyKey(formData: FormData): string {
  return [text(formData, "snapshotId"), text(formData, "templateVersion"), reportFormat(formData)].join(":");
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

function evidenceIds(formData: FormData): string[] {
  return formData
    .getAll("evidenceIds")
    .flatMap((entry) => typeof entry === "string" ? splitList(entry) : [])
    .filter((entry, index, values) => values.indexOf(entry) === index);
}

function answerText(formData: FormData): string {
  const explicit = text(formData, "answerText");
  if (explicit) {
    return explicit;
  }
  return formData
    .getAll("answerChoice")
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim())
    .join(", ");
}

function classification(formData: FormData): "internal" | "confidential" | "restricted" {
  const value = text(formData, "classification");
  return value === "internal" || value === "confidential" || value === "restricted" ? value : "restricted";
}

function severity(formData: FormData): "low" | "medium" | "high" | "critical" {
  const value = text(formData, "severity");
  return value === "low" || value === "medium" || value === "critical" ? value : "high";
}

function status(formData: FormData): "open" | "in_progress" | "verified" {
  const value = text(formData, "status");
  return value === "open" || value === "verified" ? value : "in_progress";
}

function testResult(formData: FormData): "pass" | "fail" | "not_tested" {
  const value = text(formData, "result");
  return value === "fail" || value === "not_tested" ? value : "pass";
}

function reportFormat(formData: FormData): "pdf" | "xlsx" {
  return text(formData, "format") === "xlsx" ? "xlsx" : "pdf";
}
