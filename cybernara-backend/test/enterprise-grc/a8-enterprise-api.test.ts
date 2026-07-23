import "dotenv/config";
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import type { AuditEventInput, AuditLogService } from "../../src/modules/audit-security/public.js";
import {
  addPolicyException,
  createAccessReview,
  createAuditEngagement,
  createCustomFieldDefinition,
  createCustomObjectDefinition,
  createCustomRecord,
  createCustomValue,
  createVendorRecord,
  createWorkspace,
  draftPolicy,
  EnterpriseGrcService,
  publishPolicy,
  publishTrustCenterArtifact,
  recordTrustCenterDownload,
  type AccessReview,
  type AccessReviewDecisionRecord,
  type AccessReviewDecisionRow,
  type AccessReviewItem,
  type AccessReviewItemRow,
  type AccessReviewRow,
  type AuditEngagement,
  type AuditEngagementRow,
  type AuditRequestRecord,
  type AuditRequestRow,
  type AuditTestRecord,
  type AuditTestRow,
  type CustomFieldDefinition,
  type CustomFieldDefinitionRow,
  type CustomObjectDefinition,
  type CustomObjectDefinitionRow,
  type CustomRecord,
  type CustomRecordRow,
  type CustomValue,
  type CustomValueRow,
  type EnterpriseGrcRepository,
  type GrcWorkspace,
  type GrcWorkspaceRow,
  type PolicyAttestation,
  type PolicyAttestationRow,
  type PolicyControlLink,
  type PolicyControlLinkRow,
  type PolicyRecord,
  type PolicyRecordRow,
  type PolicyVersion,
  type PolicyVersionRow,
  type TrustCenterArtifact,
  type TrustCenterArtifactRow,
  type VendorAssessmentRecord,
  type VendorAssessmentRow,
  type VendorFindingRecord,
  type VendorFindingRow,
  type VendorRecord,
  type VendorRecordRow
} from "../../src/modules/enterprise-grc/public.js";
import { PostgresEnterpriseGrcRepository } from "../../src/modules/enterprise-grc/infrastructure/postgres-enterprise-grc.repository.js";
import { createOutboxEvent } from "../../src/modules/outbox/domain/outbox-event.js";
import type { OutboxEvent, OutboxService } from "../../src/modules/outbox/public.js";
import { TenantScopedDb } from "../../src/platform/database/tenant-scoped-db.js";
import { DATABASE_POOL } from "../../src/platform/database/tokens.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";

const actorId = randomUUID();
const tenantId = randomUUID();
const approverId = randomUUID();
const ownerId = randomUUID();
const evidenceId = randomUUID();
const roleId = randomUUID();

let app: INestApplication;
let baseUrl: string;
let appPool: pg.Pool;
const repositoryPool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
const repositoryDb = new TenantScopedDb(repositoryPool);

beforeAll(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidUnknownValues: true,
      transform: true
    })
  );
  await app.listen(0);
  appPool = app.get<pg.Pool>(DATABASE_POOL);
  const address = app.getHttpServer().address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
}, 120_000);

afterAll(async () => {
  await app.close();
  await appPool.end();
  await repositoryPool.end();
});

describe("A8 EnterpriseGRC repository", () => {
  it("persists policies, access reviews, vendors, audits, trust artifacts, workspaces, and custom objects", async () => {
    const repository = new PostgresEnterpriseGrcRepository(repositoryDb);
    const repositoryTenant = randomUUID();
    const policy = await repository.createPolicy({
      policy: draftPolicy({
        tenantId: repositoryTenant,
        templateKey: `acceptable-use-${randomUUID()}`,
        title: "Acceptable Use Policy",
        version: "2026.07",
        content: "Employees must protect company systems and data."
      }),
      actorId
    });
    const published = await repository.updatePolicy({
      policy: addPolicyException(
        publishPolicy(policy, {
          approverId,
          attestationEvidenceIds: [evidenceId],
          publishedAt: new Date("2026-07-03T00:00:00.000Z")
        }),
        { ownerId, reason: "Temporary legacy exception.", expiresAt: new Date("2026-08-01T00:00:00.000Z") }
      ),
      actorId
    });
    const accessReview = await repository.createAccessReview({
      review: createAccessReview({
        tenantId: repositoryTenant,
        populationSource: "okta-prod",
        certifierId: approverId,
        decisions: [{ subjectId: "alice", resourceId: "finance-admin", decision: "revoked", evidenceId }]
      }),
      actorId
    });
    const vendor = await repository.createVendor({
      vendor: createVendorRecord({
        tenantId: repositoryTenant,
        name: "Support Processor",
        tier: "high",
        systems: ["Support CRM"],
        contractIds: ["dpa-2026"],
        controlIds: ["HARM-PRIV-001"],
        incidentIds: ["incident-privacy"],
        questionnaireIds: ["questionnaire-soc2"],
        monitoringFindings: ["finding-high-risk-transfer"],
        renewalAt: new Date("2027-07-03T00:00:00.000Z")
      }),
      actorId
    });
    const audit = await repository.createAuditEngagement({
      engagement: createAuditEngagement({
        tenantId: repositoryTenant,
        name: "FY26 SOC 2 Readiness",
        status: "fieldwork",
        requestListIds: ["request-list-1"],
        evidenceIds: [evidenceId],
        findingIds: ["finding-high-risk-transfer"],
        managementResponses: [{ ownerId, response: "Remediation accepted.", dueAt: new Date("2026-08-01T00:00:00.000Z") }]
      }),
      actorId
    });
    const artifact = await repository.createTrustArtifact({
      artifact: publishTrustCenterArtifact({
        tenantId: repositoryTenant,
        title: "SOC 2 Bridge Letter",
        version: "2026.07",
        approved: true,
        visibility: "private",
        artifactEvidenceId: evidenceId,
        ndaRequired: true,
        crmAccountId: "acct-123"
      }),
      actorId
    });
    const downloaded = await repository.updateTrustArtifact({
      artifact: recordTrustCenterDownload(artifact, {
        actorId,
        downloadedAt: new Date("2026-07-03T00:00:00.000Z")
      }),
      actorId
    });
    const workspace = await repository.createWorkspace({
      workspace: createWorkspace({
        tenantId: repositoryTenant,
        businessUnit: "North America",
        inheritedControlIds: ["HARM-PRIV-001"],
        delegatedAdminIds: [ownerId]
      }),
      actorId
    });
    const customObject = await repository.createCustomObject({
      definition: createCustomObjectDefinition({
        tenantId: repositoryTenant,
        objectKey: `local_regulator_action_${randomUUID()}`,
        fields: [{ key: "deadline", type: "date", required: true }],
        workflowStates: ["open", "submitted", "closed"],
        permissionRoleIds: [roleId],
        upgradeSafe: true,
        connectorSdkEnabled: true
      }),
      actorId
    });

    // G-13 (0025_g13_custom_platform.sql): the normalized field/record/value tables underneath
    // `custom_object_definitions`, proven against real Supabase in the same chain.
    const customFieldDefinition = await repository.createCustomFieldDefinition({
      field: createCustomFieldDefinition({
        tenantId: repositoryTenant,
        objectDefinitionId: customObject.id,
        fieldKey: "deadline",
        dataType: "date",
        required: true,
        validationJson: {}
      }),
      actorId
    });
    const customRecord = await repository.createCustomRecord({
      record: createCustomRecord({
        tenantId: repositoryTenant,
        objectDefinitionId: customObject.id,
        recordKey: `action-${randomUUID()}`
      }),
      actorId
    });
    const customValue = await repository.createCustomValue({
      value: createCustomValue(
        {
          tenantId: repositoryTenant,
          recordId: customRecord.id,
          fieldDefinitionId: customFieldDefinition.id,
          valueJson: "2026-08-01"
        },
        customFieldDefinition
      ),
      actorId
    });

    expect(published.status).toBe("published");
    expect(published.exceptions).toHaveLength(1);
    expect(accessReview.remediationTaskIds).toContain("remediate:alice:finance-admin");
    expect(vendor.systems).toContain("Support CRM");
    expect(audit.evidenceIds).toContain(evidenceId);
    expect(downloaded.downloadEvents).toHaveLength(1);
    expect(workspace.delegatedAdminIds).toContain(ownerId);
    expect(customObject.connectorSdkEnabled).toBe(true);
    expect(customFieldDefinition.objectDefinitionId).toBe(customObject.id);
    expect(customRecord.objectDefinitionId).toBe(customObject.id);
    expect(customValue.recordId).toBe(customRecord.id);
    expect(customValue.valueJson).toBe("2026-08-01");
    // This test chains many sequential real-Supabase withTenant calls; its
    // duration sits right at vitest's 5000ms default (observed 5031ms under
    // concurrent-test-file load), the same timing-tolerance pattern already
    // documented elsewhere in this campaign — not a functional regression.
  }, 30_000);
});

describe("A8 EnterpriseGRC service orchestration", () => {
  it("deduplicates policy drafting and emits outbox/audit side effects for policy publication", async () => {
    const repository = new InMemoryEnterpriseRepository();
    const outbox = new InMemoryOutbox();
    const audit = new InMemoryAuditLog();
    const service = new EnterpriseGrcService(
      repository,
      outbox as unknown as OutboxService,
      audit as unknown as AuditLogService
    );
    const first = await service.draftPolicy({
      tenantId,
      actorId,
      idempotencyKey: "a8-service-policy",
      templateKey: "acceptable-use",
      title: "Acceptable Use Policy",
      version: "2026.07",
      content: "Employees must protect company systems and data."
    });
    const replayed = await service.draftPolicy({
      tenantId,
      actorId,
      idempotencyKey: "a8-service-policy",
      templateKey: "acceptable-use",
      title: "Acceptable Use Policy",
      version: "2026.07",
      content: "Employees must protect company systems and data."
    });
    const published = await service.publishPolicy({
      tenantId,
      actorId,
      idempotencyKey: "a8-service-publish",
      policyId: first.id,
      approverId,
      attestationEvidenceIds: [evidenceId],
      publishedAt: new Date("2026-07-03T00:00:00.000Z")
    });

    expect(replayed.id).toBe(first.id);
    expect(published.status).toBe("published");
    expect(outbox.events).toHaveLength(2);
    expect(audit.events).toHaveLength(2);
  });
});

describe("A8 EnterpriseGRC HTTP exposure", () => {
  it("rejects missing context, missing scopes, and missing idempotency keys", async () => {
    const unauthenticated = await fetch(`${baseUrl}/v1/enterprise-grc/policies`);
    expect(unauthenticated.status).toBe(401);

    const unauthorized = await fetch(`${baseUrl}/v1/enterprise-grc/policies`, {
      headers: headers("assessment:read")
    });
    expect(unauthorized.status).toBe(403);

    const missingIdempotency = await fetch(`${baseUrl}/v1/enterprise-grc/policies`, {
      method: "POST",
      headers: headers("policy_version:write"),
      body: JSON.stringify(policyBody())
    });
    expect(missingIdempotency.status).toBe(400);
  });

  it("runs enterprise GRC policy, access, vendor, audit, trust, workspace, and custom object flows through HTTP", async () => {
    const policyResponse = await requestJson(
      "POST",
      "/v1/enterprise-grc/policies",
      policyBody(),
      "policy_version:write",
      "a8-policy"
    );
    const replayedPolicyResponse = await requestJson(
      "POST",
      "/v1/enterprise-grc/policies",
      policyBody(),
      "policy_version:write",
      "a8-policy"
    );
    expect(policyResponse.status).toBe(201);
    expect(replayedPolicyResponse.status).toBe(201);
    const policy = (await policyResponse.json()) as PolicyResponse;
    expect(((await replayedPolicyResponse.json()) as PolicyResponse).id).toBe(policy.id);

    // G-10 cutover note: appPool now connects as the RLS-scoped app_runtime
    // role, so this test-assertion helper query uses the owner-role
    // repositoryPool instead of appPool.
    const outboxCount = await repositoryPool.query(
      `select count(*)::int as count from outbox_events where tenant_id = $1 and idempotency_key = $2`,
      [tenantId, "a8-policy"]
    );
    expect(outboxCount.rows[0].count).toBe(1);

    const publishedResponse = await requestJson(
      "POST",
      `/v1/enterprise-grc/policies/${policy.id}/publish`,
      {
        approverId,
        attestationEvidenceIds: [evidenceId],
        publishedAt: "2026-07-03T00:00:00.000Z"
      },
      "policy_version:write",
      "a8-policy-publish"
    );
    expect(publishedResponse.status).toBe(201);
    expect(((await publishedResponse.json()) as PolicyResponse).status).toBe("published");

    const exceptionResponse = await requestJson(
      "POST",
      `/v1/enterprise-grc/policies/${policy.id}/exceptions`,
      { ownerId, reason: "Temporary legacy exception.", expiresAt: "2026-08-01T00:00:00.000Z" },
      "policy_version:write",
      "a8-policy-exception"
    );
    expect(exceptionResponse.status).toBe(201);
    expect(((await exceptionResponse.json()) as PolicyResponse).exceptions).toHaveLength(1);

    const accessReviewResponse = await requestJson(
      "POST",
      "/v1/enterprise-grc/access-reviews",
      accessReviewBody(),
      "access_review:write",
      "a8-access-review"
    );
    expect(accessReviewResponse.status).toBe(201);
    const accessReview = (await accessReviewResponse.json()) as AccessReviewResponse;
    expect(accessReview.remediationTaskIds).toContain("remediate:alice:finance-admin");

    const vendorResponse = await requestJson(
      "POST",
      "/v1/enterprise-grc/vendors",
      vendorBody(),
      "vendor:write",
      "a8-vendor"
    );
    expect(vendorResponse.status).toBe(201);
    const vendor = (await vendorResponse.json()) as VendorResponse;

    const auditResponse = await requestJson(
      "POST",
      "/v1/enterprise-grc/audit-engagements",
      auditBody(),
      "audit_engagement:write",
      "a8-audit"
    );
    expect(auditResponse.status).toBe(201);
    const audit = (await auditResponse.json()) as AuditResponse;

    const trustResponse = await requestJson(
      "POST",
      "/v1/enterprise-grc/trust-center-artifacts",
      trustArtifactBody(),
      "trust_center_artifact:write",
      "a8-trust"
    );
    expect(trustResponse.status).toBe(201);
    const artifact = (await trustResponse.json()) as TrustArtifactResponse;
    const downloadResponse = await requestJson(
      "POST",
      `/v1/enterprise-grc/trust-center-artifacts/${artifact.id}/downloads`,
      { downloadedAt: "2026-07-03T00:00:00.000Z" },
      "trust_center_artifact:write",
      "a8-trust-download"
    );
    expect(downloadResponse.status).toBe(201);
    expect(((await downloadResponse.json()) as TrustArtifactResponse).downloadEvents).toHaveLength(1);

    const workspaceResponse = await requestJson(
      "POST",
      "/v1/enterprise-grc/workspaces",
      workspaceBody(),
      "grc_workspace:write",
      "a8-workspace"
    );
    expect(workspaceResponse.status).toBe(201);
    const workspace = (await workspaceResponse.json()) as WorkspaceResponse;

    const customObjectResponse = await requestJson(
      "POST",
      "/v1/enterprise-grc/custom-object-definitions",
      customObjectBody(),
      "custom_object_definition:write",
      "a8-custom-object"
    );
    expect(customObjectResponse.status).toBe(201);
    const customObject = (await customObjectResponse.json()) as CustomObjectResponse;

    const policies = await getJson<PolicyResponse[]>("/v1/enterprise-grc/policies", "policy_version:read");
    expect(policies.some((candidate) => candidate.id === policy.id)).toBe(true);
    const reviews = await getJson<AccessReviewResponse[]>("/v1/enterprise-grc/access-reviews", "access_review:read");
    expect(reviews.some((candidate) => candidate.id === accessReview.id)).toBe(true);
    const vendors = await getJson<VendorResponse[]>("/v1/enterprise-grc/vendors", "vendor:read");
    expect(vendors.some((candidate) => candidate.id === vendor.id)).toBe(true);
    const audits = await getJson<AuditResponse[]>("/v1/enterprise-grc/audit-engagements", "audit_engagement:read");
    expect(audits.some((candidate) => candidate.id === audit.id)).toBe(true);
    const artifacts = await getJson<TrustArtifactResponse[]>(
      "/v1/enterprise-grc/trust-center-artifacts",
      "trust_center_artifact:read"
    );
    expect(artifacts.some((candidate) => candidate.id === artifact.id)).toBe(true);
    const workspaces = await getJson<WorkspaceResponse[]>("/v1/enterprise-grc/workspaces", "grc_workspace:read");
    expect(workspaces.some((candidate) => candidate.id === workspace.id)).toBe(true);
    const customObjects = await getJson<CustomObjectResponse[]>(
      "/v1/enterprise-grc/custom-object-definitions",
      "custom_object_definition:read"
    );
    expect(customObjects.some((candidate) => candidate.id === customObject.id)).toBe(true);
  }, 120_000);
});

// G-09 Phase 1 (enterprise GRC depth): a real HTTP-level proof that the new
// routes (policy-definitions, policy control-links/attestations, access
// review items/decisions, vendor assessments/findings, audit
// requests/tests) are actually reachable through the full
// guard/controller/service/repository chain, not just direct-SQL integrity
// tests (see test/enterprise-grc/g09-grc-depth.test.ts for those). No
// frontend UI exists yet for these routes, so there is no Playwright e2e to
// run against them — this HTTP-level test is the practical substitute
// evidence, same pattern used for G-01/G-04's e2e limitations.
describe("G-09 EnterpriseGRC HTTP exposure", () => {
  it("runs policy-definition, control-link, attestation, access-review-item, vendor-assessment, and audit-request/test flows through HTTP", async () => {
    const key = randomUUID();

    const policyRecordResponse = await requestJson(
      "POST",
      "/v1/enterprise-grc/policy-definitions",
      { policyKey: `g09-policy-${key}`, title: "Acceptable Use Policy", ownerId, category: "security" },
      "policy:write",
      `g09-policy-record-${key}`
    );
    expect(policyRecordResponse.status).toBe(201);
    const policyRecord = (await policyRecordResponse.json()) as { id: string; policyKey: string };

    const fetchedPolicyRecord = await getJson<{ id: string }>(
      `/v1/enterprise-grc/policy-definitions/${policyRecord.id}`,
      "policy:read"
    );
    expect(fetchedPolicyRecord.id).toBe(policyRecord.id);

    const policyVersionResponse = await requestJson(
      "POST",
      "/v1/enterprise-grc/policies",
      { templateKey: `g09-template-${key}`, title: "Acceptable Use Policy", version: "v1", content: "Policy content." },
      "policy_version:write",
      `g09-policy-version-${key}`
    );
    const policyVersion = (await policyVersionResponse.json()) as PolicyResponse;

    const controlLinkResponse = await requestJson(
      "POST",
      `/v1/enterprise-grc/policies/${policyVersion.id}/control-links`,
      { controlId: "CC1.1" },
      "policy_control_link:write",
      `g09-control-link-${key}`
    );
    expect(controlLinkResponse.status).toBe(201);
    const controlLinks = await getJson<Array<{ controlId: string }>>(
      `/v1/enterprise-grc/policies/${policyVersion.id}/control-links`,
      "policy_control_link:read"
    );
    expect(controlLinks.some((link) => link.controlId === "CC1.1")).toBe(true);

    const attestationResponse = await requestJson(
      "POST",
      `/v1/enterprise-grc/policies/${policyVersion.id}/attestations`,
      { decision: "attested", evidenceHash: "hash-1" },
      "policy_attestation:write",
      `g09-attestation-${key}`
    );
    expect(attestationResponse.status).toBe(201);
    const attestations = await getJson<Array<{ decision: string }>>(
      `/v1/enterprise-grc/policies/${policyVersion.id}/attestations`,
      "policy_attestation:read"
    );
    expect(attestations.some((attestation) => attestation.decision === "attested")).toBe(true);

    const accessReviewResponse = await requestJson(
      "POST",
      "/v1/enterprise-grc/access-reviews",
      accessReviewBody(),
      "access_review:write",
      `g09-access-review-${key}`
    );
    const accessReview = (await accessReviewResponse.json()) as AccessReviewResponse;

    const itemResponse = await requestJson(
      "POST",
      `/v1/enterprise-grc/access-reviews/${accessReview.id}/items`,
      { principalRef: "user:dave", resourceRef: "db:prod", entitlementRef: "role:read" },
      "access_review_item:write",
      `g09-review-item-${key}`
    );
    expect(itemResponse.status).toBe(201);
    const item = (await itemResponse.json()) as { id: string };

    const decisionResponse = await requestJson(
      "POST",
      `/v1/enterprise-grc/access-reviews/${accessReview.id}/items/${item.id}/decisions`,
      { decision: "approved" },
      "access_review_decision:write",
      `g09-review-decision-${key}`
    );
    expect(decisionResponse.status).toBe(201);
    const decisions = await getJson<Array<{ decision: string }>>(
      `/v1/enterprise-grc/access-reviews/${accessReview.id}/items/${item.id}/decisions`,
      "access_review_decision:read"
    );
    expect(decisions.some((decision) => decision.decision === "approved")).toBe(true);

    const vendorResponse = await requestJson(
      "POST",
      "/v1/enterprise-grc/vendors",
      vendorBody(),
      "vendor:write",
      `g09-vendor-${key}`
    );
    const vendor = (await vendorResponse.json()) as VendorResponse;

    const assessmentResponse = await requestJson(
      "POST",
      `/v1/enterprise-grc/vendors/${vendor.id}/assessments`,
      { assessmentType: "onboarding", period: "2027-Q1" },
      "vendor_assessment:write",
      `g09-vendor-assessment-${key}`
    );
    expect(assessmentResponse.status).toBe(201);
    const assessment = (await assessmentResponse.json()) as { id: string };

    const findingResponse = await requestJson(
      "POST",
      `/v1/enterprise-grc/vendors/${vendor.id}/assessments/${assessment.id}/findings`,
      { severity: "high", title: "Missing encryption at rest" },
      "vendor_finding:write",
      `g09-vendor-finding-${key}`
    );
    expect(findingResponse.status).toBe(201);
    const vendorFindings = await getJson<Array<{ title: string }>>(
      `/v1/enterprise-grc/vendors/${vendor.id}/assessments/${assessment.id}/findings`,
      "vendor_finding:read"
    );
    expect(vendorFindings.some((finding) => finding.title === "Missing encryption at rest")).toBe(true);

    const auditResponse = await requestJson(
      "POST",
      "/v1/enterprise-grc/audit-engagements",
      auditBody(),
      "audit_engagement:write",
      `g09-audit-${key}`
    );
    const audit = (await auditResponse.json()) as AuditResponse;

    const requestResponse = await requestJson(
      "POST",
      `/v1/enterprise-grc/audit-engagements/${audit.id}/requests`,
      { controlId: "CC1.1", requestedFrom: "it-team@acme.test", dueAt: "2027-06-01T00:00:00.000Z" },
      "audit_request:write",
      `g09-audit-request-${key}`
    );
    expect(requestResponse.status).toBe(201);
    const auditRequests = await getJson<Array<{ requestedFrom: string }>>(
      `/v1/enterprise-grc/audit-engagements/${audit.id}/requests`,
      "audit_request:read"
    );
    expect(auditRequests.some((request) => request.requestedFrom === "it-team@acme.test")).toBe(true);

    const testResponse = await requestJson(
      "POST",
      `/v1/enterprise-grc/audit-engagements/${audit.id}/tests`,
      { procedure: "Sample 25 access logs" },
      "audit_test:write",
      `g09-audit-test-${key}`
    );
    expect(testResponse.status).toBe(201);
    const auditTests = await getJson<Array<{ procedure: string }>>(
      `/v1/enterprise-grc/audit-engagements/${audit.id}/tests`,
      "audit_test:read"
    );
    expect(auditTests.some((test) => test.procedure === "Sample 25 access logs")).toBe(true);
  }, 120_000);
});

describe("G-13 CustomPlatform HTTP exposure", () => {
  it("runs the full definitions -> fields -> records -> values chain through HTTP, including real validation rejections", async () => {
    const key = randomUUID();

    const definitionResponse = await requestJson(
      "POST",
      "/v1/enterprise-grc/custom-object-definitions",
      {
        objectKey: `g13-regulator-action-${key}`,
        fields: [{ key: "deadline", type: "date", required: true }],
        workflowStates: ["open", "closed"],
        permissionRoleIds: [randomUUID()],
        upgradeSafe: true,
        connectorSdkEnabled: false
      },
      "custom_object_definition:write",
      `g13-definition-${key}`
    );
    expect(definitionResponse.status).toBe(201);
    const definition = (await definitionResponse.json()) as CustomObjectResponse & { status: string };
    expect(definition.status).toBe("active");

    const statusResponse = await requestJson(
      "POST",
      `/v1/enterprise-grc/custom-object-definitions/${definition.id}/status`,
      { status: "deprecated", validationSchema: { type: "object" } },
      "custom_object_definition:write"
    );
    expect(statusResponse.status).toBe(201);
    const updatedDefinition = (await statusResponse.json()) as { status: string; validationSchema: unknown };
    expect(updatedDefinition.status).toBe("deprecated");

    const fieldResponse = await requestJson(
      "POST",
      `/v1/enterprise-grc/custom-object-definitions/${definition.id}/fields`,
      { fieldKey: "deadline", dataType: "date", required: true },
      "custom_field_definition:write",
      `g13-field-${key}`
    );
    expect(fieldResponse.status).toBe(201);
    const field = (await fieldResponse.json()) as { id: string; fieldKey: string };

    const fieldsListed = await getJson<Array<{ fieldKey: string }>>(
      `/v1/enterprise-grc/custom-object-definitions/${definition.id}/fields`,
      "custom_field_definition:read"
    );
    expect(fieldsListed.some((row) => row.fieldKey === "deadline")).toBe(true);

    const recordResponse = await requestJson(
      "POST",
      `/v1/enterprise-grc/custom-object-definitions/${definition.id}/records`,
      { recordKey: `g13-action-${key}` },
      "custom_record:write",
      `g13-record-${key}`
    );
    expect(recordResponse.status).toBe(201);
    const record = (await recordResponse.json()) as { id: string; recordKey: string };

    const fetchedRecord = await getJson<{ id: string }>(`/v1/enterprise-grc/custom-records/${record.id}`, "custom_record:read");
    expect(fetchedRecord.id).toBe(record.id);

    // Real "validation" business logic (the gap sentence's own word), not just a schema column:
    // omitting the value for a required field must be rejected through the real HTTP surface.
    const missingRequiredValue = await requestJson(
      "POST",
      `/v1/enterprise-grc/custom-records/${record.id}/values`,
      { fieldDefinitionId: field.id },
      "custom_value:write",
      `g13-value-missing-${key}`
    );
    expect(missingRequiredValue.status).toBe(400);

    // A value whose type does not match the field's declared dataType must also be rejected.
    const mismatchedTypeValue = await requestJson(
      "POST",
      `/v1/enterprise-grc/custom-records/${record.id}/values`,
      { fieldDefinitionId: field.id, valueJson: 12345 },
      "custom_value:write",
      `g13-value-mismatched-${key}`
    );
    expect(mismatchedTypeValue.status).toBe(400);

    const valueResponse = await requestJson(
      "POST",
      `/v1/enterprise-grc/custom-records/${record.id}/values`,
      { fieldDefinitionId: field.id, valueJson: "2026-08-01", searchText: "2026-08-01" },
      "custom_value:write",
      `g13-value-${key}`
    );
    expect(valueResponse.status).toBe(201);
    const value = (await valueResponse.json()) as { id: string; valueJson: unknown };
    expect(value.valueJson).toBe("2026-08-01");

    const valuesListed = await getJson<Array<{ id: string }>>(
      `/v1/enterprise-grc/custom-records/${record.id}/values`,
      "custom_value:read"
    );
    expect(valuesListed.some((row) => row.id === value.id)).toBe(true);
  }, 120_000);
});

interface PolicyResponse {
  id: string;
  status: string;
  exceptions: unknown[];
}

interface AccessReviewResponse {
  id: string;
  remediationTaskIds: string[];
}

interface VendorResponse {
  id: string;
}

interface AuditResponse {
  id: string;
}

interface TrustArtifactResponse {
  id: string;
  downloadEvents: unknown[];
}

interface WorkspaceResponse {
  id: string;
}

interface CustomObjectResponse {
  id: string;
}

function headers(scopes: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-tenant-id": tenantId,
    "x-user-id": actorId,
    "x-user-clearance": "restricted",
    "x-user-scopes": scopes
  };
}

async function requestJson(
  method: "POST",
  route: string,
  body: unknown,
  scopes: string,
  idempotencyKey?: string
): Promise<Response> {
  return fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      ...headers(scopes),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
    },
    body: JSON.stringify(body)
  });
}

async function getJson<T>(route: string, scopes: string): Promise<T> {
  const response = await fetch(`${baseUrl}${route}`, { headers: headers(scopes) });
  expect(response.status).toBe(200);
  return (await response.json()) as T;
}

function policyBody() {
  return {
    templateKey: "acceptable-use-http",
    title: "Acceptable Use Policy",
    version: "2026.07",
    content: "Employees must protect company systems and data."
  };
}

function accessReviewBody() {
  return {
    populationSource: "okta-prod",
    certifierId: approverId,
    decisions: [{ subjectId: "alice", resourceId: "finance-admin", decision: "revoked", evidenceId }]
  };
}

function vendorBody() {
  return {
    name: "Support Processor",
    tier: "high",
    systems: ["Support CRM"],
    contractIds: ["dpa-2026"],
    controlIds: ["HARM-PRIV-001"],
    incidentIds: ["incident-privacy"],
    questionnaireIds: ["questionnaire-soc2"],
    monitoringFindings: ["finding-high-risk-transfer"],
    renewalAt: "2027-07-03T00:00:00.000Z"
  };
}

function auditBody() {
  return {
    name: "FY26 SOC 2 Readiness",
    status: "fieldwork",
    requestListIds: ["request-list-1"],
    evidenceIds: [evidenceId],
    findingIds: ["finding-high-risk-transfer"],
    managementResponses: [{ ownerId, response: "Remediation accepted.", dueAt: "2026-08-01T00:00:00.000Z" }]
  };
}

function trustArtifactBody() {
  return {
    title: "SOC 2 Bridge Letter",
    version: "2026.07",
    approved: true,
    visibility: "private",
    artifactEvidenceId: evidenceId,
    ndaRequired: true,
    crmAccountId: "acct-123"
  };
}

function workspaceBody() {
  return {
    businessUnit: "North America",
    inheritedControlIds: ["HARM-PRIV-001"],
    delegatedAdminIds: [ownerId]
  };
}

function customObjectBody() {
  return {
    objectKey: "local_regulator_action_http",
    fields: [{ key: "deadline", type: "date", required: true }],
    workflowStates: ["open", "submitted", "closed"],
    permissionRoleIds: [roleId],
    upgradeSafe: true,
    connectorSdkEnabled: true
  };
}

class InMemoryOutbox {
  readonly events: OutboxEvent[] = [];

  async findByIdempotencyKey(tenant: string, idempotencyKey: string): Promise<OutboxEvent | null> {
    return this.events.find((event) => event.tenantId === tenant && event.idempotencyKey === idempotencyKey) ?? null;
  }

  async publish(input: {
    tenantId: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    payload: Record<string, unknown>;
    idempotencyKey: string;
    createdBy: string;
    now?: Date;
  }): Promise<OutboxEvent> {
    const existing = await this.findByIdempotencyKey(input.tenantId, input.idempotencyKey);
    if (existing) {
      return existing;
    }
    const event = createOutboxEvent(input);
    this.events.push(event);
    return event;
  }
}

class InMemoryAuditLog {
  readonly events: AuditEventInput[] = [];

  async append(input: AuditEventInput): Promise<AuditEventInput> {
    this.events.push(input);
    return input;
  }
}

class InMemoryEnterpriseRepository implements EnterpriseGrcRepository {
  readonly policies = new Map<string, PolicyVersionRow>();
  readonly accessReviews = new Map<string, AccessReviewRow>();
  readonly vendors = new Map<string, VendorRecordRow>();
  readonly auditEngagements = new Map<string, AuditEngagementRow>();
  readonly trustArtifacts = new Map<string, TrustCenterArtifactRow>();
  readonly workspaces = new Map<string, GrcWorkspaceRow>();
  readonly customObjects = new Map<string, CustomObjectDefinitionRow>();
  readonly customFieldDefinitions = new Map<string, CustomFieldDefinitionRow>();
  readonly customRecords = new Map<string, CustomRecordRow>();
  readonly customValues = new Map<string, CustomValueRow>();
  readonly policyRecords = new Map<string, PolicyRecordRow>();
  readonly policyControlLinks = new Map<string, PolicyControlLinkRow>();
  readonly policyAttestations = new Map<string, PolicyAttestationRow>();
  readonly accessReviewItems = new Map<string, AccessReviewItemRow>();
  readonly accessReviewDecisions = new Map<string, AccessReviewDecisionRow>();
  readonly vendorAssessments = new Map<string, VendorAssessmentRow>();
  readonly vendorFindings = new Map<string, VendorFindingRow>();
  readonly auditRequests = new Map<string, AuditRequestRow>();
  readonly auditTests = new Map<string, AuditTestRow>();

  async createPolicy(input: { policy: PolicyVersion; actorId: string }): Promise<PolicyVersionRow> {
    const record = withMetadata(input.policy, input.actorId);
    this.policies.set(record.id, record);
    return record;
  }

  async updatePolicy(input: { policy: PolicyVersion; actorId: string }): Promise<PolicyVersionRow> {
    const record = withMetadata(input.policy, input.actorId, this.policies.get(input.policy.id)?.versionNumber ?? 1);
    this.policies.set(record.id, record);
    return record;
  }

  async listPolicies(): Promise<PolicyVersionRow[]> {
    return [...this.policies.values()];
  }

  async findPolicy(_tenantId: string, policyId: string): Promise<PolicyVersionRow | null> {
    return this.policies.get(policyId) ?? null;
  }

  async createAccessReview(input: { review: AccessReview; actorId: string }): Promise<AccessReviewRow> {
    const record = withMetadata(input.review, input.actorId);
    this.accessReviews.set(record.id, record);
    return record;
  }

  async listAccessReviews(): Promise<AccessReviewRow[]> {
    return [...this.accessReviews.values()];
  }

  async findAccessReview(_tenantId: string, reviewId: string): Promise<AccessReviewRow | null> {
    return this.accessReviews.get(reviewId) ?? null;
  }

  async createVendor(input: { vendor: VendorRecord; actorId: string }): Promise<VendorRecordRow> {
    const record = withMetadata(input.vendor, input.actorId);
    this.vendors.set(record.id, record);
    return record;
  }

  async listVendors(): Promise<VendorRecordRow[]> {
    return [...this.vendors.values()];
  }

  async findVendor(_tenantId: string, vendorId: string): Promise<VendorRecordRow | null> {
    return this.vendors.get(vendorId) ?? null;
  }

  async createAuditEngagement(input: { engagement: AuditEngagement; actorId: string }): Promise<AuditEngagementRow> {
    const record = withMetadata(input.engagement, input.actorId);
    this.auditEngagements.set(record.id, record);
    return record;
  }

  async listAuditEngagements(): Promise<AuditEngagementRow[]> {
    return [...this.auditEngagements.values()];
  }

  async findAuditEngagement(_tenantId: string, engagementId: string): Promise<AuditEngagementRow | null> {
    return this.auditEngagements.get(engagementId) ?? null;
  }

  async createTrustArtifact(input: {
    artifact: TrustCenterArtifact;
    actorId: string;
  }): Promise<TrustCenterArtifactRow> {
    const record = withMetadata(input.artifact, input.actorId);
    this.trustArtifacts.set(record.id, record);
    return record;
  }

  async updateTrustArtifact(input: {
    artifact: TrustCenterArtifact;
    actorId: string;
  }): Promise<TrustCenterArtifactRow> {
    const record = withMetadata(
      input.artifact,
      input.actorId,
      this.trustArtifacts.get(input.artifact.id)?.versionNumber ?? 1
    );
    this.trustArtifacts.set(record.id, record);
    return record;
  }

  async listTrustArtifacts(): Promise<TrustCenterArtifactRow[]> {
    return [...this.trustArtifacts.values()];
  }

  async findTrustArtifact(_tenantId: string, artifactId: string): Promise<TrustCenterArtifactRow | null> {
    return this.trustArtifacts.get(artifactId) ?? null;
  }

  async createWorkspace(input: { workspace: GrcWorkspace; actorId: string }): Promise<GrcWorkspaceRow> {
    const record = withMetadata(input.workspace, input.actorId);
    this.workspaces.set(record.id, record);
    return record;
  }

  async listWorkspaces(): Promise<GrcWorkspaceRow[]> {
    return [...this.workspaces.values()];
  }

  async findWorkspace(_tenantId: string, workspaceId: string): Promise<GrcWorkspaceRow | null> {
    return this.workspaces.get(workspaceId) ?? null;
  }

  async createCustomObject(input: {
    definition: CustomObjectDefinition;
    actorId: string;
  }): Promise<CustomObjectDefinitionRow> {
    const record = withMetadata(input.definition, input.actorId);
    this.customObjects.set(record.id, record);
    return record;
  }

  async listCustomObjects(): Promise<CustomObjectDefinitionRow[]> {
    return [...this.customObjects.values()];
  }

  async findCustomObject(_tenantId: string, definitionId: string): Promise<CustomObjectDefinitionRow | null> {
    return this.customObjects.get(definitionId) ?? null;
  }

  async updateCustomObjectStatus(input: {
    tenantId: string;
    definitionId: string;
    status: string;
    validationSchema?: Record<string, unknown>;
    actorId: string;
  }): Promise<CustomObjectDefinitionRow> {
    const existing = this.customObjects.get(input.definitionId);
    if (!existing) {
      throw new Error("Custom object definition not found.");
    }
    const updated: CustomObjectDefinitionRow = {
      ...existing,
      status: input.status as CustomObjectDefinitionRow["status"],
      validationSchema: input.validationSchema ?? existing.validationSchema,
      versionNumber: existing.versionNumber + 1,
      updatedBy: input.actorId,
      updatedAt: new Date()
    };
    this.customObjects.set(updated.id, updated);
    return updated;
  }

  async createCustomFieldDefinition(input: { field: CustomFieldDefinition; actorId: string }): Promise<CustomFieldDefinitionRow> {
    const record = withMetadata(input.field, input.actorId);
    this.customFieldDefinitions.set(record.id, record);
    return record;
  }

  async listCustomFieldDefinitions(input: { objectDefinitionId: string }): Promise<CustomFieldDefinitionRow[]> {
    return [...this.customFieldDefinitions.values()].filter((row) => row.objectDefinitionId === input.objectDefinitionId);
  }

  async findCustomFieldDefinition(_tenantId: string, fieldDefinitionId: string): Promise<CustomFieldDefinitionRow | null> {
    return this.customFieldDefinitions.get(fieldDefinitionId) ?? null;
  }

  async createCustomRecord(input: { record: CustomRecord; actorId: string }): Promise<CustomRecordRow> {
    const record = withMetadata(input.record, input.actorId);
    this.customRecords.set(record.id, record);
    return record;
  }

  async listCustomRecords(input: { objectDefinitionId: string }): Promise<CustomRecordRow[]> {
    return [...this.customRecords.values()].filter((row) => row.objectDefinitionId === input.objectDefinitionId);
  }

  async findCustomRecord(_tenantId: string, recordId: string): Promise<CustomRecordRow | null> {
    return this.customRecords.get(recordId) ?? null;
  }

  async createCustomValue(input: { value: CustomValue; actorId: string }): Promise<CustomValueRow> {
    const record = withMetadata(input.value, input.actorId);
    this.customValues.set(record.id, record);
    return record;
  }

  async listCustomValues(input: { recordId: string }): Promise<CustomValueRow[]> {
    return [...this.customValues.values()].filter((row) => row.recordId === input.recordId);
  }

  async findCustomValue(_tenantId: string, valueId: string): Promise<CustomValueRow | null> {
    return this.customValues.get(valueId) ?? null;
  }

  async createPolicyRecord(input: { policy: PolicyRecord; actorId: string }): Promise<PolicyRecordRow> {
    const record = withMetadata(input.policy, input.actorId);
    this.policyRecords.set(record.id, record);
    return record;
  }

  async listPolicyRecords(): Promise<PolicyRecordRow[]> {
    return [...this.policyRecords.values()];
  }

  async findPolicyRecord(_tenantId: string, policyRecordId: string): Promise<PolicyRecordRow | null> {
    return this.policyRecords.get(policyRecordId) ?? null;
  }

  async createPolicyControlLink(input: { link: PolicyControlLink; actorId: string }): Promise<PolicyControlLinkRow> {
    const record = withMetadata(input.link, input.actorId);
    this.policyControlLinks.set(record.id, record);
    return record;
  }

  async listPolicyControlLinks(input: { policyVersionId: string }): Promise<PolicyControlLinkRow[]> {
    return [...this.policyControlLinks.values()].filter((link) => link.policyVersionId === input.policyVersionId);
  }

  async createPolicyAttestation(input: { attestation: PolicyAttestation; actorId: string }): Promise<PolicyAttestationRow> {
    const record = withMetadata(input.attestation, input.actorId);
    this.policyAttestations.set(record.id, record);
    return record;
  }

  async listPolicyAttestations(input: { policyVersionId: string }): Promise<PolicyAttestationRow[]> {
    return [...this.policyAttestations.values()].filter((attestation) => attestation.policyVersionId === input.policyVersionId);
  }

  async createAccessReviewItem(input: { item: AccessReviewItem; actorId: string }): Promise<AccessReviewItemRow> {
    const record = withMetadata(input.item, input.actorId);
    this.accessReviewItems.set(record.id, record);
    return record;
  }

  async listAccessReviewItems(input: { accessReviewId: string }): Promise<AccessReviewItemRow[]> {
    return [...this.accessReviewItems.values()].filter((item) => item.accessReviewId === input.accessReviewId);
  }

  async findAccessReviewItem(_tenantId: string, itemId: string): Promise<AccessReviewItemRow | null> {
    return this.accessReviewItems.get(itemId) ?? null;
  }

  async createAccessReviewDecision(input: {
    decision: AccessReviewDecisionRecord;
    actorId: string;
  }): Promise<AccessReviewDecisionRow> {
    const record = withMetadata(input.decision, input.actorId);
    this.accessReviewDecisions.set(record.id, record);
    return record;
  }

  async listAccessReviewDecisions(input: { reviewItemId: string }): Promise<AccessReviewDecisionRow[]> {
    return [...this.accessReviewDecisions.values()].filter((decision) => decision.reviewItemId === input.reviewItemId);
  }

  async createVendorAssessment(input: { assessment: VendorAssessmentRecord; actorId: string }): Promise<VendorAssessmentRow> {
    const record = withMetadata(input.assessment, input.actorId);
    this.vendorAssessments.set(record.id, record);
    return record;
  }

  async listVendorAssessments(input: { vendorId: string }): Promise<VendorAssessmentRow[]> {
    return [...this.vendorAssessments.values()].filter((assessment) => assessment.vendorId === input.vendorId);
  }

  async findVendorAssessment(_tenantId: string, assessmentId: string): Promise<VendorAssessmentRow | null> {
    return this.vendorAssessments.get(assessmentId) ?? null;
  }

  async createVendorFinding(input: { finding: VendorFindingRecord; actorId: string }): Promise<VendorFindingRow> {
    const record = withMetadata(input.finding, input.actorId);
    this.vendorFindings.set(record.id, record);
    return record;
  }

  async listVendorFindings(input: { vendorAssessmentId: string }): Promise<VendorFindingRow[]> {
    return [...this.vendorFindings.values()].filter((finding) => finding.vendorAssessmentId === input.vendorAssessmentId);
  }

  async createAuditRequest(input: { request: AuditRequestRecord; actorId: string }): Promise<AuditRequestRow> {
    const record = withMetadata(input.request, input.actorId);
    this.auditRequests.set(record.id, record);
    return record;
  }

  async listAuditRequests(input: { auditEngagementId: string }): Promise<AuditRequestRow[]> {
    return [...this.auditRequests.values()].filter((request) => request.auditEngagementId === input.auditEngagementId);
  }

  async createAuditTest(input: { test: AuditTestRecord; actorId: string }): Promise<AuditTestRow> {
    const record = withMetadata(input.test, input.actorId);
    this.auditTests.set(record.id, record);
    return record;
  }

  async listAuditTests(input: { auditEngagementId: string }): Promise<AuditTestRow[]> {
    return [...this.auditTests.values()].filter((test) => test.auditEngagementId === input.auditEngagementId);
  }
}

function withMetadata<T extends { tenantId: string }>(record: T, userId: string, versionNumber = 1): T & {
  versionNumber: number;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
} {
  const now = new Date();
  return {
    ...record,
    versionNumber,
    classification: "confidential",
    createdBy: userId,
    createdAt: now,
    updatedBy: userId,
    updatedAt: now
  };
}
