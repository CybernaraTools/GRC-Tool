import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { loginPath } from "../../../src/lib/auth";
import { createServerApiClient } from "../../../src/lib/api/server";
import { accessTokenCookieName, readSessionContextFromAccessToken } from "../../../src/lib/session";

const evidenceId = "00000000-0000-4000-8000-000000000401";
const roleId = "00000000-0000-4000-8000-000000000402";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const session = await readSessionContextFromAccessToken(request.cookies.get(accessTokenCookieName)?.value);
  if (!session) {
    return redirectTo(request, loginPath("/enterprise"));
  }

  const api = createServerApiClient(session);
  const intent = text(formData, "intent");

  if (intent === "draftPolicy") {
    const suffix = randomUUID().slice(0, 8);
    const policy = await api.draftEnterprisePolicy(
      {
        templateKey: `acceptable-use-${suffix}`,
        title: "Acceptable Use Policy",
        version: "2026.07",
        content: "Employees must protect company systems and data."
      },
      { idempotencyKey: idempotencyKey(formData, "policy") }
    );
    return redirectTo(request, `/enterprise?policyId=${policy.id}`);
  }

  if (intent === "publishPolicy") {
    const policyId = text(formData, "policyId");
    const policy = await api.publishEnterprisePolicy(
      policyId,
      {
        approverId: session.userId,
        attestationEvidenceIds: [evidenceId],
        publishedAt: new Date().toISOString()
      },
      { idempotencyKey: idempotencyKey(formData, "policy-publish") }
    );
    return redirectTo(request, `/enterprise?policyId=${policy.id}`);
  }

  if (intent === "addPolicyException") {
    const policyId = text(formData, "policyId");
    const policy = await api.addEnterprisePolicyException(
      policyId,
      {
        ownerId: session.userId,
        reason: "Temporary legacy exception.",
        expiresAt: "2026-08-01T00:00:00.000Z"
      },
      { idempotencyKey: idempotencyKey(formData, "policy-exception") }
    );
    return redirectTo(request, `/enterprise?policyId=${policy.id}`);
  }

  if (intent === "createAccessReview") {
    const review = await api.createEnterpriseAccessReview(
      {
        populationSource: "okta-prod",
        certifierId: session.userId,
        decisions: [{ subjectId: "alice", resourceId: "finance-admin", decision: "revoked", evidenceId }]
      },
      { idempotencyKey: idempotencyKey(formData, "access-review") }
    );
    return redirectTo(request, `/enterprise?reviewId=${review.id}`);
  }

  if (intent === "createVendor") {
    const vendor = await api.createEnterpriseVendor(
      {
        name: `Support Processor ${randomUUID().slice(0, 6)}`,
        tier: "high",
        systems: ["Support CRM"],
        contractIds: ["dpa-2026"],
        controlIds: ["HARM-PRIV-001"],
        incidentIds: ["incident-privacy"],
        questionnaireIds: ["questionnaire-soc2"],
        monitoringFindings: ["mfa-review"],
        renewalAt: "2026-09-01T00:00:00.000Z"
      },
      { idempotencyKey: idempotencyKey(formData, "vendor") }
    );
    return redirectTo(request, `/enterprise?vendorId=${vendor.id}`);
  }

  if (intent === "createAudit") {
    const audit = await api.createEnterpriseAuditEngagement(
      {
        name: "FY26 SOC 2 Readiness",
        status: "fieldwork",
        requestListIds: ["request-list-1"],
        evidenceIds: [evidenceId],
        findingIds: ["finding-high-risk-transfer"],
        managementResponses: [{ ownerId: session.userId, response: "Remediation accepted.", dueAt: "2026-08-01T00:00:00.000Z" }]
      },
      { idempotencyKey: idempotencyKey(formData, "audit") }
    );
    return redirectTo(request, `/enterprise?auditId=${audit.id}`);
  }

  if (intent === "publishTrustArtifact") {
    const artifact = await api.publishEnterpriseTrustArtifact(
      {
        title: "SOC 2 Bridge Letter",
        version: "2026.07",
        approved: true,
        visibility: "private",
        artifactEvidenceId: evidenceId,
        ndaRequired: true,
        crmAccountId: "acct-123"
      },
      { idempotencyKey: idempotencyKey(formData, "trust") }
    );
    return redirectTo(request, `/enterprise?artifactId=${artifact.id}`);
  }

  if (intent === "recordTrustDownload") {
    const artifactId = text(formData, "artifactId");
    const artifact = await api.recordEnterpriseTrustArtifactDownload(
      artifactId,
      { downloadedAt: new Date().toISOString() },
      { idempotencyKey: idempotencyKey(formData, "trust-download") }
    );
    return redirectTo(request, `/enterprise?artifactId=${artifact.id}`);
  }

  if (intent === "createWorkspace") {
    const workspace = await api.createEnterpriseWorkspace(
      {
        businessUnit: "North America",
        inheritedControlIds: ["HARM-PRIV-001"],
        delegatedAdminIds: [session.userId]
      },
      { idempotencyKey: idempotencyKey(formData, "workspace") }
    );
    return redirectTo(request, `/enterprise?workspaceId=${workspace.id}`);
  }

  if (intent === "createCustomObject") {
    const definition = await api.createEnterpriseCustomObjectDefinition(
      {
        objectKey: `local_regulator_action_${randomUUID().slice(0, 8)}`,
        fields: [{ key: "deadline", type: "date", required: true }],
        workflowStates: ["open", "submitted", "closed"],
        permissionRoleIds: [roleId],
        upgradeSafe: true,
        connectorSdkEnabled: true
      },
      { idempotencyKey: idempotencyKey(formData, "custom-object") }
    );
    return redirectTo(request, `/enterprise?definitionId=${definition.id}`);
  }

  if (intent === "createRiskModel") {
    const modelKey = text(formData, "modelKey");
    const modelVersion = text(formData, "modelVersion");
    await api.createRiskModel({
      modelKey,
      modelVersion,
      scalesJson: { low: 1, high: 100 },
      formula: "sum(impact,likelihood)",
      thresholds: { high: 70 }
    });
    return redirectTo(request, `/enterprise`);
  }

  if (intent === "createRisk") {
    const riskKey = text(formData, "riskKey");
    const title = text(formData, "title");
    const inherentScore = Number.parseInt(text(formData, "inherentScore") || "50", 10);
    const models = await api.listRiskModels({ limit: 1, offset: 0 });
    const riskModelId = models[0]?.id;

    await api.createRisk(
      {
        riskModelId,
        riskKey,
        title,
        category: "security",
        inherentScore,
        residualScore: Math.round(inherentScore / 2),
        ownerId: session.userId
      },
      { idempotencyKey: idempotencyKey(formData, "risk") }
    );
    return redirectTo(request, `/enterprise`);
  }

  return NextResponse.json({ error: "Unsupported enterprise action." }, { status: 400 });
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
