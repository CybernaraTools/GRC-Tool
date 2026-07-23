import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { loginPath } from "../../../src/lib/auth";
import { createServerApiClient } from "../../../src/lib/api/server";
import { accessTokenCookieName, readSessionContextFromAccessToken } from "../../../src/lib/session";

const evidenceId = "00000000-0000-4000-8000-000000000301";
const reportId = "00000000-0000-4000-8000-000000000302";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const session = await readSessionContextFromAccessToken(request.cookies.get(accessTokenCookieName)?.value);
  if (!session) {
    return redirectTo(request, loginPath("/privacy"));
  }

  const api = createServerApiClient(session);
  const intent = text(formData, "intent");

  if (intent === "createProcessing") {
    const placeholderInventoryId = randomUUID();
    const processing = await api.createProcessingActivity(
      {
        purpose: "Customer support",
        lawfulBasis: "contract",
        dataSubjectCategories: ["customer"],
        recipients: ["support"],
        transfers: ["US"],
        retentionMonths: 24,
        jurisdiction: "US",
        inventoryRecordIds: [placeholderInventoryId]
      },
      { idempotencyKey: idempotencyKey(formData, "processing") }
    );
    return redirectTo(request, `/privacy?processingId=${processing.id}`);
  }

  if (intent === "createInventory") {
    const processingId = text(formData, "processingId");
    const inventory = await api.createPrivacyInventoryRecord(
      {
        systemName: `Support CRM ${randomUUID().slice(0, 6)}`,
        dataElements: ["email", "ticket"],
        ownerId: session.userId,
        locations: ["us-east-1"],
        classification: "restricted",
        lineage: ["webform", "crm"],
        processingActivityIds: [processingId],
        controlIds: ["HARM-PRIV-001"],
        vendorIds: [],
        evidenceIds: []
      },
      { idempotencyKey: idempotencyKey(formData, "inventory") }
    );
    return redirectTo(request, `/privacy?processingId=${processingId}&inventoryId=${inventory.id}`);
  }

  if (intent === "createDpia") {
    const processingId = text(formData, "processingId");
    const dpia = await api.createDpiaAssessment(
      {
        processingActivityId: processingId,
        riskLevel: "high",
        residualRiskScore: 72,
        approvals: [{ actorId: session.userId, role: "privacy_owner", approvedAt: new Date().toISOString() }],
        findings: ["Cross-border transfer requires SCC review."]
      },
      { idempotencyKey: idempotencyKey(formData, "dpia") }
    );
    return redirectTo(request, `/privacy?processingId=${processingId}&dpiaId=${dpia.id}`);
  }

  if (intent === "createRights") {
    const rights = await api.createPrivacyRightsRequest(
      {
        subjectId: `subject-${randomUUID().slice(0, 8)}`,
        requestType: "access",
        openedAt: new Date().toISOString(),
        slaDays: 30
      },
      { idempotencyKey: idempotencyKey(formData, "rights") }
    );
    return redirectTo(request, `/privacy?rightsId=${rights.id}`);
  }

  if (intent === "verifyRights") {
    const rightsId = text(formData, "rightsId");
    const rights = await api.verifyPrivacyRightsRequestIdentity(rightsId, {
      idempotencyKey: idempotencyKey(formData, "rights-verify")
    });
    return redirectTo(request, `/privacy?rightsId=${rights.id}`);
  }

  if (intent === "addSearchTask") {
    const rightsId = text(formData, "rightsId");
    const rights = await api.addPrivacyRightsSearchTask(
      rightsId,
      { systemName: "Support CRM", ownerId: session.userId },
      { idempotencyKey: idempotencyKey(formData, "rights-search") }
    );
    return redirectTo(request, `/privacy?rightsId=${rights.id}`);
  }

  if (intent === "completeRights") {
    const rightsId = text(formData, "rightsId");
    const rights = await api.completePrivacyRightsRequest(
      rightsId,
      {
        completionEvidenceIds: [evidenceId],
        communication: {
          channel: "email",
          message: "Access package delivered.",
          sentAt: new Date().toISOString()
        }
      },
      { idempotencyKey: idempotencyKey(formData, "rights-complete") }
    );
    return redirectTo(request, `/privacy?rightsId=${rights.id}`);
  }

  if (intent === "grantConsent") {
    const consent = await api.grantPrivacyConsent(
      {
        subjectId: `subject-${randomUUID().slice(0, 8)}`,
        purpose: "marketing",
        version: "notice-v1",
        region: "US"
      },
      { idempotencyKey: idempotencyKey(formData, "consent") }
    );
    return redirectTo(request, `/privacy?consentId=${consent.id}`);
  }

  if (intent === "withdrawConsent") {
    const consentId = text(formData, "consentId");
    const consent = await api.withdrawPrivacyConsent(
      consentId,
      { reason: "Subject preference changed." },
      { idempotencyKey: idempotencyKey(formData, "consent-withdraw") }
    );
    return redirectTo(request, `/privacy?consentId=${consent.id}`);
  }

  if (intent === "createIncident") {
    const processingId = text(formData, "processingId");
    const incident = await api.createPrivacyIncident(
      {
        severity: "high",
        impactedProcessingActivityIds: [processingId],
        evidenceIds: [evidenceId],
        reportIds: [reportId],
        discoveredAt: new Date().toISOString()
      },
      { idempotencyKey: idempotencyKey(formData, "incident") }
    );
    return redirectTo(request, `/privacy?processingId=${processingId}&incidentId=${incident.id}`);
  }

  if (intent === "createRetention") {
    const retention = await api.createRetentionSchedule(
      {
        dataCategory: "support_ticket",
        jurisdiction: "US",
        residency: "US",
        transferMechanism: "SCC",
        retentionMonths: 24,
        legalHold: true,
        disposalEvidenceIds: [evidenceId]
      },
      { idempotencyKey: idempotencyKey(formData, "retention") }
    );
    return redirectTo(request, `/privacy?retentionId=${retention.id}&ageMonths=48`);
  }

  return NextResponse.json({ error: "Unsupported privacy action." }, { status: 400 });
}

function redirectTo(request: NextRequest, href: string) {
  return NextResponse.redirect(new URL(href, request.headers.get("origin") ?? request.url), 303);
}

function idempotencyKey(formData: FormData, prefix: string): string {
  return text(formData, "idempotencyKey") || `${prefix}-${randomUUID()}`;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
