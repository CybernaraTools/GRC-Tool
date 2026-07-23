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
import { createOutboxEvent } from "../../src/modules/outbox/domain/outbox-event.js";
import type { OutboxEvent, OutboxService } from "../../src/modules/outbox/public.js";
import {
  addRightsSearchTask,
  completeRightsRequest,
  createDataInventoryRecord,
  createDpiaAssessment,
  createPrivacyIncident,
  createProcessingActivity,
  createRetentionSchedule,
  createRightsRequest,
  evaluateRetention,
  grantConsent,
  PrivacyOperationsService,
  type ConsentEvent,
  type ConsentEventRow,
  type ConsentPurposeVersion,
  type ConsentPurposeVersionRow,
  type ConsentRecord,
  type ConsentRecordRow,
  type DataCategory,
  type DataCategoryRow,
  type DataDiscoveryFinding,
  type DataDiscoveryFindingRow,
  type DataDiscoveryScan,
  type DataDiscoveryScanRow,
  type DataInventoryRecord,
  type DataInventoryRecordRow,
  type DataSubjectCategory,
  type DataSubjectCategoryRow,
  type Dpia,
  type DpiaAssessment,
  type DpiaAssessmentRow,
  type DpiaRisk,
  type DpiaRiskRow,
  type DpiaRow,
  type IncidentAssessment,
  type IncidentAssessmentRow,
  type IncidentNotification,
  type IncidentNotificationRow,
  type LawfulBasis,
  type LawfulBasisRow,
  type PrivacyIncident,
  type PrivacyIncidentRow,
  type PrivacyNotice,
  type PrivacyNoticeRow,
  type PrivacyNoticeVersion,
  type PrivacyNoticeVersionRow,
  type PrivacyOperationsRepository,
  type ProcessingActivity,
  type ProcessingActivityRow,
  type ProcessingInventoryLink,
  type ProcessingInventoryLinkRow,
  type ProcessingPurposeAssignment,
  type ProcessingPurposeAssignmentRow,
  type ProcessingRecipientLink,
  type ProcessingRecipientLinkRow,
  type Purpose,
  type PurposeRow,
  type Recipient,
  type RecipientRow,
  type RetentionRule,
  type RetentionRuleRow,
  type RetentionSchedule,
  type RetentionScheduleRow,
  type RightsRequest,
  type RightsRequestRow,
  type RightsRequestTask,
  type RightsRequestTaskRow,
  type SystemAsset,
  type SystemAssetRow,
  type DeletionItem,
  type DeletionItemRow,
  type DeletionJob,
  type DeletionJobRow,
  type LegalHold,
  type LegalHoldItem,
  type LegalHoldItemRow,
  type LegalHoldRow,
  type RetentionAssignment,
  type RetentionAssignmentRow,
  type Transfer,
  type TransferRow,
  verifyRightsRequestIdentity,
  withdrawConsent
} from "../../src/modules/privacy-operations/public.js";
import { PostgresPrivacyOperationsRepository } from "../../src/modules/privacy-operations/infrastructure/postgres-privacy-operations.repository.js";
import { TenantScopedDb } from "../../src/platform/database/tenant-scoped-db.js";
import { DATABASE_POOL } from "../../src/platform/database/tokens.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";

const actorId = randomUUID();
const tenantId = randomUUID();
const ownerId = randomUUID();
const evidenceId = randomUUID();
const vendorId = randomUUID();
const reportId = randomUUID();

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

describe("A7 PrivacyOperations repository", () => {
  it("persists privacy inventory, RoPA, DPIA, rights, consent, incidents, and retention against real Supabase", async () => {
    const repository = new PostgresPrivacyOperationsRepository(repositoryDb);
    const repositoryTenant = randomUUID();
    const placeholderInventoryId = randomUUID();
    const processing = await repository.createProcessingActivity({
      activity: createProcessingActivity({
        tenantId: repositoryTenant,
        purpose: "Customer support",
        lawfulBasis: "contract",
        dataSubjectCategories: ["customer"],
        recipients: ["support"],
        transfers: ["US"],
        retentionMonths: 24,
        jurisdiction: "US",
        inventoryRecordIds: [placeholderInventoryId]
      }),
      actorId
    });
    const inventory = await repository.createInventory({
      record: createDataInventoryRecord({
        tenantId: repositoryTenant,
        systemName: "Support CRM",
        dataElements: ["email", "ticket"],
        ownerId,
        locations: ["us-east-1"],
        classification: "restricted",
        lineage: ["webform", "crm"],
        processingActivityIds: [processing.id],
        controlIds: ["SOC2:CC6.1"],
        vendorIds: [vendorId],
        evidenceIds: [evidenceId]
      }),
      actorId
    });
    const dpia = await repository.createDpia({
      dpia: createDpiaAssessment({
        tenantId: repositoryTenant,
        processingActivityId: processing.id,
        riskLevel: "high",
        residualRiskScore: 72,
        approvals: [{ actorId, role: "privacy_owner", approvedAt: new Date("2026-07-03T00:00:00.000Z") }],
        findings: ["Cross-border transfer requires SCC review."]
      }),
      actorId
    });
    const rights = await repository.createRightsRequest({
      request: createRightsRequest({
        tenantId: repositoryTenant,
        subjectId: "subject-repository",
        requestType: "access",
        openedAt: new Date("2026-07-03T00:00:00.000Z"),
        slaDays: 30
      }),
      actorId
    });
    const completedRights = await repository.updateRightsRequest({
      request: completeRightsRequest(
        addRightsSearchTask(verifyRightsRequestIdentity(rights), { systemName: inventory.systemName, ownerId }),
        {
          completionEvidenceIds: [evidenceId],
          communication: {
            channel: "email",
            message: "Access package delivered.",
            sentAt: new Date("2026-07-04T00:00:00.000Z")
          }
        }
      ),
      actorId
    });
    const consent = await repository.createConsent({
      consent: grantConsent({
        tenantId: repositoryTenant,
        subjectId: "subject-repository",
        purpose: "marketing",
        version: "notice-v1",
        region: "US",
        actorId
      }),
      actorId
    });
    const withdrawn = await repository.updateConsent({
      consent: withdrawConsent(consent, { actorId, reason: "Subject preference changed." }),
      actorId
    });
    const incident = await repository.createIncident({
      incident: createPrivacyIncident({
        tenantId: repositoryTenant,
        severity: "high",
        impactedProcessingActivityIds: [processing.id],
        evidenceIds: [evidenceId],
        reportIds: [reportId],
        discoveredAt: new Date("2026-07-03T00:00:00.000Z"),
        actorId
      }),
      actorId
    });
    const retention = await repository.createRetentionSchedule({
      schedule: createRetentionSchedule({
        tenantId: repositoryTenant,
        dataCategory: "support_ticket",
        jurisdiction: "US",
        residency: "US",
        transferMechanism: "SCC",
        retentionMonths: 24,
        legalHold: true,
        disposalEvidenceIds: [evidenceId]
      }),
      actorId
    });

    expect(processing.inventoryRecordIds).toContain(placeholderInventoryId);
    expect(inventory.processingActivityIds).toContain(processing.id);
    expect(dpia.reviewObligationIds).toHaveLength(1);
    expect(completedRights.status).toBe("completed");
    expect(withdrawn.status).toBe("withdrawn");
    expect(incident.regulatorNotificationDueAt.toISOString()).toBe("2026-07-06T00:00:00.000Z");
    expect(evaluateRetention(retention, 48)).toBe("legal_hold_exception");
    // G-10 cutover: this test's 7 sequential withTenant calls occasionally
    // exceed vitest's 5s default under the full suite's concurrent
    // real-Supabase load (26 test files opening connections at once); it
    // consistently completes in well under 5s in isolation. Timing
    // tolerance, not a weakened assertion.
  }, 30_000);
});

describe("A7 PrivacyOperations service orchestration", () => {
  it("deduplicates privacy mutations and emits outbox/audit side effects", async () => {
    const repository = new InMemoryPrivacyRepository();
    const outbox = new InMemoryOutbox();
    const audit = new InMemoryAuditLog();
    const service = new PrivacyOperationsService(
      repository,
      outbox as unknown as OutboxService,
      audit as unknown as AuditLogService
    );

    const first = await service.createRightsRequest({
      tenantId,
      actorId,
      idempotencyKey: "a7-service-rights",
      subjectId: "subject-service",
      requestType: "delete",
      openedAt: new Date("2026-07-03T00:00:00.000Z"),
      slaDays: 30
    });
    const second = await service.createRightsRequest({
      tenantId,
      actorId,
      idempotencyKey: "a7-service-rights",
      subjectId: "subject-service",
      requestType: "delete",
      openedAt: new Date("2026-07-03T00:00:00.000Z"),
      slaDays: 30
    });
    const verified = await service.verifyRightsRequest({
      tenantId,
      actorId,
      idempotencyKey: "a7-service-verify",
      requestId: first.id
    });

    expect(second.id).toBe(first.id);
    expect(verified.status).toBe("verified");
    expect(outbox.events).toHaveLength(2);
    expect(audit.events).toHaveLength(2);
  });
});

describe("A7 PrivacyOperations HTTP exposure", () => {
  it("rejects missing context, missing scopes, and missing idempotency keys", async () => {
    const unauthenticated = await fetch(`${baseUrl}/v1/privacy-operations/inventory-records`);
    expect(unauthenticated.status).toBe(401);

    const unauthorized = await fetch(`${baseUrl}/v1/privacy-operations/inventory-records`, {
      headers: headers("assessment:read")
    });
    expect(unauthorized.status).toBe(403);

    const missingIdempotency = await fetch(`${baseUrl}/v1/privacy-operations/rights-requests`, {
      method: "POST",
      headers: headers("privacy_rights_request:write"),
      body: JSON.stringify(rightsBody())
    });
    expect(missingIdempotency.status).toBe(400);
  });

  it("runs inventory, RoPA, DPIA, rights, consent, incident, and retention flows through HTTP", async () => {
    const placeholderInventoryId = randomUUID();
    const processingResponse = await requestJson(
      "POST",
      "/v1/privacy-operations/processing-activities",
      processingBody(placeholderInventoryId),
      "processing_activity:write",
      "a7-processing"
    );
    expect(processingResponse.status).toBe(201);
    const processing = (await processingResponse.json()) as ProcessingActivityResponse;

    const inventoryResponse = await requestJson(
      "POST",
      "/v1/privacy-operations/inventory-records",
      inventoryBody(processing.id),
      "data_inventory_record:write",
      "a7-inventory"
    );
    const replayedInventoryResponse = await requestJson(
      "POST",
      "/v1/privacy-operations/inventory-records",
      inventoryBody(processing.id),
      "data_inventory_record:write",
      "a7-inventory"
    );
    expect(inventoryResponse.status).toBe(201);
    expect(replayedInventoryResponse.status).toBe(201);
    const inventory = (await inventoryResponse.json()) as InventoryResponse;
    expect(((await replayedInventoryResponse.json()) as InventoryResponse).id).toBe(inventory.id);

    // G-10 cutover note: appPool now connects as the RLS-scoped app_runtime
    // role, so this test-assertion helper query uses the owner-role
    // repositoryPool instead of appPool.
    const outboxCount = await repositoryPool.query(
      `select count(*)::int as count from outbox_events where tenant_id = $1 and idempotency_key = $2`,
      [tenantId, "a7-inventory"]
    );
    expect(outboxCount.rows[0].count).toBe(1);

    const dpiaResponse = await requestJson(
      "POST",
      "/v1/privacy-operations/dpia-assessments",
      dpiaBody(processing.id),
      "dpia_assessment:write",
      "a7-dpia"
    );
    expect(dpiaResponse.status).toBe(201);
    const dpia = (await dpiaResponse.json()) as DpiaResponse;
    expect(dpia.reviewObligationIds).toHaveLength(1);

    const rightsResponse = await requestJson(
      "POST",
      "/v1/privacy-operations/rights-requests",
      rightsBody(),
      "privacy_rights_request:write",
      "a7-rights"
    );
    expect(rightsResponse.status).toBe(201);
    const rights = (await rightsResponse.json()) as RightsResponse;

    const verifiedResponse = await requestJson(
      "POST",
      `/v1/privacy-operations/rights-requests/${rights.id}/verify-identity`,
      {},
      "privacy_rights_request:write",
      "a7-rights-verify"
    );
    expect(verifiedResponse.status).toBe(201);
    const searchResponse = await requestJson(
      "POST",
      `/v1/privacy-operations/rights-requests/${rights.id}/search-tasks`,
      { systemName: "Support CRM", ownerId },
      "privacy_rights_request:write",
      "a7-rights-search"
    );
    expect(searchResponse.status).toBe(201);
    const completedResponse = await requestJson(
      "POST",
      `/v1/privacy-operations/rights-requests/${rights.id}/complete`,
      {
        completionEvidenceIds: [evidenceId],
        communication: {
          channel: "email",
          message: "Access package delivered.",
          sentAt: "2026-07-04T00:00:00.000Z"
        }
      },
      "privacy_rights_request:write",
      "a7-rights-complete"
    );
    expect(completedResponse.status).toBe(201);
    expect(((await completedResponse.json()) as RightsResponse).status).toBe("completed");

    const consentResponse = await requestJson(
      "POST",
      "/v1/privacy-operations/consents",
      consentBody(),
      "consent_record:write",
      "a7-consent"
    );
    expect(consentResponse.status).toBe(201);
    const consent = (await consentResponse.json()) as ConsentResponse;
    const withdrawnResponse = await requestJson(
      "POST",
      `/v1/privacy-operations/consents/${consent.id}/withdraw`,
      { reason: "Subject preference changed." },
      "consent_record:write",
      "a7-consent-withdraw"
    );
    expect(withdrawnResponse.status).toBe(201);
    expect(((await withdrawnResponse.json()) as ConsentResponse).status).toBe("withdrawn");

    const incidentResponse = await requestJson(
      "POST",
      "/v1/privacy-operations/incidents",
      incidentBody(processing.id),
      "privacy_incident:write",
      "a7-incident"
    );
    expect(incidentResponse.status).toBe(201);
    expect(((await incidentResponse.json()) as IncidentResponse).impactedProcessingActivityIds).toContain(processing.id);

    const retentionResponse = await requestJson(
      "POST",
      "/v1/privacy-operations/retention-schedules",
      retentionBody(),
      "retention_schedule:write",
      "a7-retention"
    );
    expect(retentionResponse.status).toBe(201);
    const retention = (await retentionResponse.json()) as RetentionResponse;
    const retentionDecision = await getJson<{ scheduleId: string; decision: string }>(
      `/v1/privacy-operations/retention-schedules/${retention.id}/evaluation?ageMonths=48`,
      "retention_schedule:read"
    );
    expect(retentionDecision.decision).toBe("legal_hold_exception");

    const inventories = await getJson<InventoryResponse[]>(
      "/v1/privacy-operations/inventory-records",
      "data_inventory_record:read"
    );
    expect(inventories.some((candidate) => candidate.id === inventory.id)).toBe(true);
    const activities = await getJson<ProcessingActivityResponse[]>(
      "/v1/privacy-operations/processing-activities",
      "processing_activity:read"
    );
    expect(activities.some((candidate) => candidate.id === processing.id)).toBe(true);
    const dpias = await getJson<DpiaResponse[]>("/v1/privacy-operations/dpia-assessments", "dpia_assessment:read");
    expect(dpias.some((candidate) => candidate.id === dpia.id)).toBe(true);
    const rightsRequests = await getJson<RightsResponse[]>(
      "/v1/privacy-operations/rights-requests",
      "privacy_rights_request:read"
    );
    expect(rightsRequests.some((candidate) => candidate.id === rights.id)).toBe(true);
    const consents = await getJson<ConsentResponse[]>("/v1/privacy-operations/consents", "consent_record:read");
    expect(consents.some((candidate) => candidate.id === consent.id)).toBe(true);
  }, 120_000);
});

// G-08 (privacy normalization, migration 0022_g08_privacy_normalization.sql): the real HTTP-level
// proof that guard/DTO/controller/service/repository all wire together for the new privacy-graph
// routes. No frontend UI exists yet for these routes, so this HTTP exercise (bootstrapping the full
// NestJS app, same as A7's own HTTP describe block above) is the strongest available substitute for
// a Playwright e2e, matching the honest limitation already documented for G-01/G-04/G-06/G-07/G-09's
// newest tables.
describe("G-08 PrivacyGraph HTTP exposure", () => {
  it("exercises the full processing-graph/consent/incident/retention chain through real HTTP", async () => {
    const graphTenantId = randomUUID();

    const systemAsset = (await (
      await requestJsonAs(graphTenantId, "POST", "/v1/privacy/systems-assets", { name: "crm-db", assetType: "database", ownerId: actorId }, "systems_asset:write", `g08-system-${graphTenantId}`)
    ).json()) as { id: string };

    const systemAssets = await getJsonAs<{ id: string }[]>(graphTenantId, "/v1/privacy/systems-assets", "systems_asset:read");
    expect(systemAssets.some((a) => a.id === systemAsset.id)).toBe(true);

    const dataCategory = (await (
      await requestJsonAs(graphTenantId, "POST", "/v1/privacy/data-categories", { categoryKey: "pii", name: "PII", sensitivity: "high" }, "data_category:write", `g08-category-${graphTenantId}`)
    ).json()) as { id: string };

    const connector = await repositoryPool.query(
      `insert into connectors (tenant_id, connector_key, provider, kind, secret_ref, created_by, updated_by)
       values ($1, $2, 'aws', 'iam', 'secret-ref', $3, $3) returning id`,
      [graphTenantId, `g08-connector-${randomUUID()}`, actorId]
    );

    const scan = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        `/v1/privacy/systems-assets/${systemAsset.id}/discovery-scans`,
        { connectorId: connector.rows[0].id, classifierVersion: "v1" },
        "data_discovery_scan:write",
        `g08-scan-${graphTenantId}`
      )
    ).json()) as { id: string };

    const finding = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        `/v1/privacy/discovery-scans/${scan.id}/findings`,
        { locatorHash: "hash-1", dataCategoryId: dataCategory.id, confidence: 0.95 },
        "data_discovery_finding:write",
        `g08-finding-${graphTenantId}`
      )
    ).json()) as { reviewStatus: string };
    expect(finding.reviewStatus).toBe("pending");

    const notice = (await (
      await requestJsonAs(graphTenantId, "POST", "/v1/privacy/notices", { noticeKey: "privacy-policy", audience: "customers", ownerId: actorId }, "privacy_notice:write", `g08-notice-${graphTenantId}`)
    ).json()) as { id: string };

    const noticeFetched = await getJsonAs<{ id: string }>(graphTenantId, `/v1/privacy/notices/${notice.id}`, "privacy_notice:read");
    expect(noticeFetched.id).toBe(notice.id);

    const noticeVersion = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        `/v1/privacy/notices/${notice.id}/versions`,
        { contentUri: "s3://bucket/notice.html", sha256: "b".repeat(64), jurisdictions: ["EU"], effectiveFrom: new Date().toISOString() },
        "privacy_notice_version:write",
        `g08-notice-version-${graphTenantId}`
      )
    ).json()) as { id: string; noticeVersionNo: number };
    expect(noticeVersion.noticeVersionNo).toBe(1);

    const activity = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        "/v1/privacy-operations/processing-activities",
        processingBody(randomUUID()),
        "processing_activity:write",
        `g08-activity-${graphTenantId}`
      )
    ).json()) as { id: string };

    const purpose = (await (
      await requestJsonAs(graphTenantId, "POST", "/v1/privacy/purposes", { purposeKey: "marketing", name: "Marketing" }, "purpose:write", `g08-purpose-${graphTenantId}`)
    ).json()) as { id: string };

    const lawfulBasis = (await (
      await requestJsonAs(graphTenantId, "POST", "/v1/privacy/lawful-bases", { jurisdiction: "EU", basisKey: "consent", name: "Consent" }, "lawful_basis:write", `g08-basis-${graphTenantId}`)
    ).json()) as { id: string };

    const purposeAssignment = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        `/v1/privacy/processing-activities/${activity.id}/purposes`,
        { purposeId: purpose.id, lawfulBasisId: lawfulBasis.id },
        "processing_purpose_assignment:write",
        `g08-assignment-${graphTenantId}`
      )
    ).json()) as { id: string };
    expect(purposeAssignment.id).toBeTruthy();

    const recipient = (await (
      await requestJsonAs(graphTenantId, "POST", "/v1/privacy/recipients", { name: "Analytics Co", recipientType: "processor", country: "US" }, "recipient:write", `g08-recipient-${graphTenantId}`)
    ).json()) as { id: string };

    const recipientLink = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        `/v1/privacy/processing-activities/${activity.id}/recipients`,
        { recipientId: recipient.id, purposeId: purpose.id },
        "processing_recipient_link:write",
        `g08-recipient-link-${graphTenantId}`
      )
    ).json()) as { id: string };
    expect(recipientLink.id).toBeTruthy();

    const transfer = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        `/v1/privacy/processing-activities/${activity.id}/transfers`,
        { fromCountry: "DE", toCountry: "US", mechanism: "sccs" },
        "transfer:write",
        `g08-transfer-${graphTenantId}`
      )
    ).json()) as { status: string };
    expect(transfer.status).toBe("active");

    const dpia = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        `/v1/privacy/processing-activities/${activity.id}/dpias`,
        { triggerReason: "new-vendor", ownerId: actorId },
        "dpia:write",
        `g08-dpia-${graphTenantId}`
      )
    ).json()) as { id: string; status: string };
    expect(dpia.status).toBe("draft");

    const dpiaRisk = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        `/v1/privacy/dpias-v2/${dpia.id}/risks`,
        { description: "Excessive retention", likelihood: "medium", impact: "high", residualScore: 40 },
        "dpia_risk:write",
        `g08-dpia-risk-${graphTenantId}`
      )
    ).json()) as { residualScore: number };
    expect(dpiaRisk.residualScore).toBe(40);

    const rightsRequest = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        "/v1/privacy-operations/rights-requests",
        { subjectId: randomUUID(), requestType: "access", openedAt: new Date().toISOString(), slaDays: 30 },
        "privacy_rights_request:write",
        `g08-rights-${graphTenantId}`
      )
    ).json()) as { id: string };

    const rightsTask = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        `/v1/privacy/rights-requests/${rightsRequest.id}/tasks`,
        { systemId: systemAsset.id, ownerId: actorId, taskType: "search" },
        "rights_request_task:write",
        `g08-rights-task-${graphTenantId}`
      )
    ).json()) as { status: string; message?: string; error?: string };
    if (rightsTask.status !== "pending") {
      console.error("rightsTask error:", rightsTask);
    }
    expect(rightsTask.status).toBe("pending");

    const consentPurposeVersion = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        "/v1/privacy/consent-purposes",
        { purposeId: purpose.id, noticeVersionId: noticeVersion.id, channel: "web", region: "EU" },
        "consent_purpose_version:write",
        `g08-consent-purpose-${graphTenantId}`
      )
    ).json()) as { id: string };

    const subjectToken = `subject-${randomUUID()}`;
    const consentEvent = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        "/v1/privacy/consent-events",
        { subjectToken, consentPurposeId: consentPurposeVersion.id, eventType: "granted", source: "web-form", proofHash: "hash-1" },
        "consent_event:write",
        `g08-consent-event-${graphTenantId}`
      )
    ).json()) as { eventType: string };
    expect(consentEvent.eventType).toBe("granted");

    const consentEvents = await getJsonAs<{ id: string }[]>(
      graphTenantId,
      `/v1/privacy/consent-events?subjectToken=${encodeURIComponent(subjectToken)}`,
      "consent_event:read"
    );
    expect(consentEvents).toHaveLength(1);

    const incident = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        "/v1/privacy-operations/incidents",
        { severity: "high", impactedProcessingActivityIds: [activity.id], evidenceIds: [], reportIds: [], discoveredAt: new Date().toISOString() },
        "privacy_incident:write",
        `g08-incident-${graphTenantId}`
      )
    ).json()) as { id: string };

    const incidentAssessment = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        `/v1/privacy/incidents/${incident.id}/assessments`,
        { jurisdiction: "EU", reportable: true, rationale: "Meets breach threshold" },
        "incident_assessment:write",
        `g08-incident-assessment-${graphTenantId}`
      )
    ).json()) as { reportable: boolean };
    expect(incidentAssessment.reportable).toBe(true);

    const incidentNotification = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        `/v1/privacy/incidents/${incident.id}/notifications`,
        { recipientType: "regulator", jurisdiction: "EU", dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
        "incident_notification:write",
        `g08-incident-notification-${graphTenantId}`
      )
    ).json()) as { recipientType: string };
    expect(incidentNotification.recipientType).toBe("regulator");

    const retentionRule = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        "/v1/privacy/retention-rules",
        { dataCategoryId: dataCategory.id, jurisdiction: "EU", retentionTrigger: "contract_end", durationDays: 365, disposition: "delete" },
        "retention_rule:write",
        `g08-retention-rule-${graphTenantId}`
      )
    ).json()) as { disposition: string };
    expect(retentionRule.disposition).toBe("delete");
  }, 120_000);
});

// G-12 (retention and deletion, migration 0023_g12_retention_deletion.sql): the real HTTP-level
// proof that guard/DTO/controller/service/repository all wire together for the new retention/
// legal-hold/deletion routes, and — critically — that spec §22's own workflow ("Legal holds resolve
// to explicit protected objects before deletion") is real, enforced behavior and not just another
// CRUD table. No frontend UI exists yet for these routes, so this HTTP exercise is the strongest
// available substitute for a Playwright e2e, matching the honest limitation already documented for
// every other gap's newest tables this campaign.
describe("G-12 RetentionDeletion HTTP exposure", () => {
  it("assigns retention, then proves an active legal hold blocks deletion while an unheld target deletes normally", async () => {
    const graphTenantId = randomUUID();

    const dataCategory = (await (
      await requestJsonAs(graphTenantId, "POST", "/v1/privacy/data-categories", { categoryKey: "pii", name: "PII", sensitivity: "high" }, "data_category:write", `g12-category-${graphTenantId}`)
    ).json()) as { id: string };

    const retentionRule = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        "/v1/privacy/retention-rules",
        { dataCategoryId: dataCategory.id, jurisdiction: "EU", retentionTrigger: "contract_end", durationDays: 365, disposition: "delete" },
        "retention_rule:write",
        `g12-rule-${graphTenantId}`
      )
    ).json()) as { id: string };

    const heldTargetId = randomUUID();
    const assignment = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        "/v1/privacy/retention-assignments",
        { retentionRuleId: retentionRule.id, targetType: "evidence_object", targetId: heldTargetId },
        "retention_assignment:write",
        `g12-assignment-${graphTenantId}`
      )
    ).json()) as { id: string };
    expect(assignment.id).toBeTruthy();

    const assignments = await getJsonAs<{ id: string }[]>(
      graphTenantId,
      `/v1/privacy/retention-assignments?targetType=evidence_object&targetId=${heldTargetId}`,
      "retention_assignment:read"
    );
    expect(assignments.some((a) => a.id === assignment.id)).toBe(true);

    const legalHold = (await (
      await requestJsonAs(graphTenantId, "POST", "/v1/privacy/legal-holds", { holdKey: "litigation-2026-01", reason: "Active litigation hold" }, "legal_hold:write", `g12-hold-${graphTenantId}`)
    ).json()) as { id: string; releasedAt?: string };
    expect(legalHold.releasedAt).toBeFalsy();

    const holdFetched = await getJsonAs<{ id: string }>(graphTenantId, `/v1/privacy/legal-holds/${legalHold.id}`, "legal_hold:read");
    expect(holdFetched.id).toBe(legalHold.id);

    const holdItem = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        `/v1/privacy/legal-holds/${legalHold.id}/items`,
        { targetType: "evidence_object", targetId: heldTargetId },
        "legal_hold_item:write",
        `g12-hold-item-${graphTenantId}`
      )
    ).json()) as { targetType: string };
    expect(holdItem.targetType).toBe("evidence_object");

    const deletionJob = (await (
      await requestJsonAs(graphTenantId, "POST", "/v1/privacy/deletion-jobs", { deletionTrigger: "subject_request" }, "deletion_job:write", `g12-job-${graphTenantId}`)
    ).json()) as { id: string; status: string };
    expect(deletionJob.status).toBe("requested");

    // The held target: the service must override the requested disposition to
    // 'blocked_by_hold' and refuse to record key destruction, even though the
    // caller asked for a normal deletion.
    const blockedItem = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        `/v1/privacy/deletion-jobs/${deletionJob.id}/items`,
        { targetType: "evidence_object", targetId: heldTargetId, requestedDisposition: "deleted", keyDestroyed: true, proofHash: "hash-1" },
        "deletion_item:write",
        `g12-item-held-${graphTenantId}`
      )
    ).json()) as { disposition: string; keyDestroyed: boolean };
    expect(blockedItem.disposition).toBe("blocked_by_hold");
    expect(blockedItem.keyDestroyed).toBe(false);

    // An unrelated, unheld target in the same job deletes normally.
    const freeTargetId = randomUUID();
    const deletedItem = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        `/v1/privacy/deletion-jobs/${deletionJob.id}/items`,
        { targetType: "evidence_object", targetId: freeTargetId, requestedDisposition: "deleted", keyDestroyed: true, proofHash: "hash-2" },
        "deletion_item:write",
        `g12-item-free-${graphTenantId}`
      )
    ).json()) as { disposition: string; keyDestroyed: boolean; proofHash?: string };
    expect(deletedItem.disposition).toBe("deleted");
    expect(deletedItem.keyDestroyed).toBe(true);
    expect(deletedItem.proofHash).toBe("hash-2");

    const items = await getJsonAs<{ id: string }[]>(graphTenantId, `/v1/privacy/deletion-jobs/${deletionJob.id}/items`, "deletion_item:read");
    expect(items).toHaveLength(2);

    const jobFetched = await getJsonAs<{ id: string }>(graphTenantId, `/v1/privacy/deletion-jobs/${deletionJob.id}`, "deletion_job:read");
    expect(jobFetched.id).toBe(deletionJob.id);

    // Releasing the hold, then re-attempting deletion for the same target now
    // succeeds normally (proving the block is really tied to the hold's
    // released_at state, not the target permanently).
    const released = (await (
      await requestJsonAs(graphTenantId, "POST", `/v1/privacy/legal-holds/${legalHold.id}/release`, {}, "legal_hold:write", `g12-release-${graphTenantId}`)
    ).json()) as { releasedAt?: string };
    expect(released.releasedAt).toBeTruthy();

    const secondJob = (await (
      await requestJsonAs(graphTenantId, "POST", "/v1/privacy/deletion-jobs", { deletionTrigger: "subject_request" }, "deletion_job:write", `g12-job-2-${graphTenantId}`)
    ).json()) as { id: string };
    const nowUnblockedItem = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        `/v1/privacy/deletion-jobs/${secondJob.id}/items`,
        { targetType: "evidence_object", targetId: heldTargetId, requestedDisposition: "deleted", keyDestroyed: true, proofHash: "hash-3" },
        "deletion_item:write",
        `g12-item-unblocked-${graphTenantId}`
      )
    ).json()) as { disposition: string };
    expect(nowUnblockedItem.disposition).toBe("deleted");
  }, 120_000);
});

interface InventoryResponse {
  id: string;
}

interface ProcessingActivityResponse {
  id: string;
}

interface DpiaResponse {
  id: string;
  reviewObligationIds: string[];
}

interface RightsResponse {
  id: string;
  status: string;
}

interface ConsentResponse {
  id: string;
  status: string;
}

interface IncidentResponse {
  impactedProcessingActivityIds: string[];
}

interface RetentionResponse {
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

function headersFor(forTenantId: string, scopes: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-tenant-id": forTenantId,
    "x-user-id": actorId,
    "x-user-clearance": "restricted",
    "x-user-scopes": scopes
  };
}

async function requestJsonAs(
  forTenantId: string,
  method: "POST",
  route: string,
  body: unknown,
  scopes: string,
  idempotencyKey?: string
): Promise<Response> {
  return fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      ...headersFor(forTenantId, scopes),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
    },
    body: JSON.stringify(body)
  });
}

async function getJsonAs<T>(forTenantId: string, route: string, scopes: string): Promise<T> {
  const response = await fetch(`${baseUrl}${route}`, { headers: headersFor(forTenantId, scopes) });
  expect(response.status).toBe(200);
  return (await response.json()) as T;
}

function processingBody(inventoryRecordId: string) {
  return {
    purpose: "Customer support",
    lawfulBasis: "contract",
    dataSubjectCategories: ["customer"],
    recipients: ["support"],
    transfers: ["US"],
    retentionMonths: 24,
    jurisdiction: "US",
    inventoryRecordIds: [inventoryRecordId]
  };
}

function inventoryBody(processingActivityId: string) {
  return {
    systemName: "Support CRM",
    dataElements: ["email", "ticket"],
    ownerId,
    locations: ["us-east-1"],
    classification: "restricted",
    lineage: ["webform", "crm"],
    processingActivityIds: [processingActivityId],
    controlIds: ["SOC2:CC6.1"],
    vendorIds: [vendorId],
    evidenceIds: [evidenceId]
  };
}

function dpiaBody(processingActivityId: string) {
  return {
    processingActivityId,
    riskLevel: "high",
    residualRiskScore: 72,
    approvals: [{ actorId, role: "privacy_owner", approvedAt: "2026-07-03T00:00:00.000Z" }],
    findings: ["Cross-border transfer requires SCC review."]
  };
}

function rightsBody() {
  return {
    subjectId: "subject-http",
    requestType: "access",
    openedAt: "2026-07-03T00:00:00.000Z",
    slaDays: 30
  };
}

function consentBody() {
  return {
    subjectId: "subject-http",
    purpose: "marketing",
    version: "notice-v1",
    region: "US"
  };
}

function incidentBody(processingActivityId: string) {
  return {
    severity: "high",
    impactedProcessingActivityIds: [processingActivityId],
    evidenceIds: [evidenceId],
    reportIds: [reportId],
    discoveredAt: "2026-07-03T00:00:00.000Z"
  };
}

function retentionBody() {
  return {
    dataCategory: "support_ticket",
    jurisdiction: "US",
    residency: "US",
    transferMechanism: "SCC",
    retentionMonths: 24,
    legalHold: true,
    disposalEvidenceIds: [evidenceId]
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

class InMemoryPrivacyRepository implements PrivacyOperationsRepository {
  readonly inventories = new Map<string, DataInventoryRecordRow>();
  readonly processing = new Map<string, ProcessingActivityRow>();
  readonly dpias = new Map<string, DpiaAssessmentRow>();
  readonly rights = new Map<string, RightsRequestRow>();
  readonly consents = new Map<string, ConsentRecordRow>();
  readonly incidents = new Map<string, PrivacyIncidentRow>();
  readonly retention = new Map<string, RetentionScheduleRow>();
  readonly systemAssets = new Map<string, SystemAssetRow>();
  readonly dataCategories = new Map<string, DataCategoryRow>();
  readonly dataSubjectCategories = new Map<string, DataSubjectCategoryRow>();
  readonly dataDiscoveryScans = new Map<string, DataDiscoveryScanRow>();
  readonly dataDiscoveryFindings = new Map<string, DataDiscoveryFindingRow>();
  readonly privacyNotices = new Map<string, PrivacyNoticeRow>();
  readonly privacyNoticeVersions = new Map<string, PrivacyNoticeVersionRow>();
  readonly processingInventoryLinks = new Map<string, ProcessingInventoryLinkRow>();
  readonly purposes = new Map<string, PurposeRow>();
  readonly lawfulBases = new Map<string, LawfulBasisRow>();
  readonly processingPurposeAssignments = new Map<string, ProcessingPurposeAssignmentRow>();
  readonly recipients = new Map<string, RecipientRow>();
  readonly processingRecipientLinks = new Map<string, ProcessingRecipientLinkRow>();
  readonly transfers = new Map<string, TransferRow>();
  readonly dpiasV2 = new Map<string, DpiaRow>();
  readonly dpiaRisks = new Map<string, DpiaRiskRow>();
  readonly rightsRequestTasks = new Map<string, RightsRequestTaskRow>();
  readonly consentPurposeVersions = new Map<string, ConsentPurposeVersionRow>();
  readonly consentEvents = new Map<string, ConsentEventRow>();
  readonly incidentAssessments = new Map<string, IncidentAssessmentRow>();
  readonly incidentNotifications = new Map<string, IncidentNotificationRow>();
  readonly retentionRules = new Map<string, RetentionRuleRow>();
  readonly retentionAssignments = new Map<string, RetentionAssignmentRow>();
  readonly legalHolds = new Map<string, LegalHoldRow>();
  readonly legalHoldItems = new Map<string, LegalHoldItemRow>();
  readonly deletionJobs = new Map<string, DeletionJobRow>();
  readonly deletionItems = new Map<string, DeletionItemRow>();

  async createInventory(input: { record: DataInventoryRecord; actorId: string }): Promise<DataInventoryRecordRow> {
    const record = withMetadata(input.record, input.actorId);
    this.inventories.set(record.id, record);
    return record;
  }

  async listInventory(): Promise<DataInventoryRecordRow[]> {
    return [...this.inventories.values()];
  }

  async findInventory(_tenantId: string, recordId: string): Promise<DataInventoryRecordRow | null> {
    return this.inventories.get(recordId) ?? null;
  }

  async createProcessingActivity(input: {
    activity: ProcessingActivity;
    actorId: string;
  }): Promise<ProcessingActivityRow> {
    const record = withMetadata(input.activity, input.actorId);
    this.processing.set(record.id, record);
    return record;
  }

  async listProcessingActivities(): Promise<ProcessingActivityRow[]> {
    return [...this.processing.values()];
  }

  async findProcessingActivity(_tenantId: string, activityId: string): Promise<ProcessingActivityRow | null> {
    return this.processing.get(activityId) ?? null;
  }

  async createDpia(input: { dpia: DpiaAssessment; actorId: string }): Promise<DpiaAssessmentRow> {
    const record = withMetadata(input.dpia, input.actorId);
    this.dpias.set(record.id, record);
    return record;
  }

  async listDpias(): Promise<DpiaAssessmentRow[]> {
    return [...this.dpias.values()];
  }

  async findDpia(_tenantId: string, dpiaId: string): Promise<DpiaAssessmentRow | null> {
    return this.dpias.get(dpiaId) ?? null;
  }

  async createRightsRequest(input: { request: RightsRequest; actorId: string }): Promise<RightsRequestRow> {
    const record = withMetadata(input.request, input.actorId);
    this.rights.set(record.id, record);
    return record;
  }

  async updateRightsRequest(input: { request: RightsRequest; actorId: string }): Promise<RightsRequestRow> {
    const record = withMetadata(input.request, input.actorId, this.rights.get(input.request.id)?.versionNumber ?? 1);
    this.rights.set(record.id, record);
    return record;
  }

  async listRightsRequests(): Promise<RightsRequestRow[]> {
    return [...this.rights.values()];
  }

  async findRightsRequest(_tenantId: string, requestId: string): Promise<RightsRequestRow | null> {
    return this.rights.get(requestId) ?? null;
  }

  async createConsent(input: { consent: ConsentRecord; actorId: string }): Promise<ConsentRecordRow> {
    const record = withMetadata(input.consent, input.actorId);
    this.consents.set(record.id, record);
    return record;
  }

  async updateConsent(input: { consent: ConsentRecord; actorId: string }): Promise<ConsentRecordRow> {
    const record = withMetadata(input.consent, input.actorId, this.consents.get(input.consent.id)?.versionNumber ?? 1);
    this.consents.set(record.id, record);
    return record;
  }

  async listConsents(): Promise<ConsentRecordRow[]> {
    return [...this.consents.values()];
  }

  async findConsent(_tenantId: string, consentId: string): Promise<ConsentRecordRow | null> {
    return this.consents.get(consentId) ?? null;
  }

  async createIncident(input: { incident: PrivacyIncident; actorId: string }): Promise<PrivacyIncidentRow> {
    const record = withMetadata(input.incident, input.actorId);
    this.incidents.set(record.id, record);
    return record;
  }

  async listIncidents(): Promise<PrivacyIncidentRow[]> {
    return [...this.incidents.values()];
  }

  async findIncident(_tenantId: string, incidentId: string): Promise<PrivacyIncidentRow | null> {
    return this.incidents.get(incidentId) ?? null;
  }

  async createRetentionSchedule(input: {
    schedule: RetentionSchedule;
    actorId: string;
  }): Promise<RetentionScheduleRow> {
    const record = withMetadata(input.schedule, input.actorId);
    this.retention.set(record.id, record);
    return record;
  }

  async listRetentionSchedules(): Promise<RetentionScheduleRow[]> {
    return [...this.retention.values()];
  }

  async findRetentionSchedule(_tenantId: string, scheduleId: string): Promise<RetentionScheduleRow | null> {
    return this.retention.get(scheduleId) ?? null;
  }

  async createSystemAsset(input: { asset: SystemAsset; actorId: string }): Promise<SystemAssetRow> {
    const record = withMetadata(input.asset, input.actorId);
    this.systemAssets.set(record.id, record);
    return record;
  }

  async listSystemAssets(): Promise<SystemAssetRow[]> {
    return [...this.systemAssets.values()];
  }

  async createDataCategory(input: { category: DataCategory; actorId: string }): Promise<DataCategoryRow> {
    const record = withMetadata(input.category, input.actorId);
    this.dataCategories.set(record.id, record);
    return record;
  }

  async listDataCategories(): Promise<DataCategoryRow[]> {
    return [...this.dataCategories.values()];
  }

  async createDataSubjectCategory(input: {
    category: DataSubjectCategory;
    actorId: string;
  }): Promise<DataSubjectCategoryRow> {
    const record = withMetadata(input.category, input.actorId);
    this.dataSubjectCategories.set(record.id, record);
    return record;
  }

  async listDataSubjectCategories(): Promise<DataSubjectCategoryRow[]> {
    return [...this.dataSubjectCategories.values()];
  }

  async createDataDiscoveryScan(input: { scan: DataDiscoveryScan; actorId: string }): Promise<DataDiscoveryScanRow> {
    const record = withMetadata(input.scan, input.actorId);
    this.dataDiscoveryScans.set(record.id, record);
    return record;
  }

  async listDataDiscoveryScans(): Promise<DataDiscoveryScanRow[]> {
    return [...this.dataDiscoveryScans.values()];
  }

  async createDataDiscoveryFinding(input: {
    finding: DataDiscoveryFinding;
    actorId: string;
  }): Promise<DataDiscoveryFindingRow> {
    const record = withMetadata(input.finding, input.actorId);
    this.dataDiscoveryFindings.set(record.id, record);
    return record;
  }

  async listDataDiscoveryFindings(): Promise<DataDiscoveryFindingRow[]> {
    return [...this.dataDiscoveryFindings.values()];
  }

  async createPrivacyNotice(input: { notice: PrivacyNotice; actorId: string }): Promise<PrivacyNoticeRow> {
    const record = withMetadata(input.notice, input.actorId);
    this.privacyNotices.set(record.id, record);
    return record;
  }

  async listPrivacyNotices(): Promise<PrivacyNoticeRow[]> {
    return [...this.privacyNotices.values()];
  }

  async findPrivacyNotice(_tenantId: string, noticeId: string): Promise<PrivacyNoticeRow | null> {
    return this.privacyNotices.get(noticeId) ?? null;
  }

  async createPrivacyNoticeVersion(input: {
    version: PrivacyNoticeVersion;
    actorId: string;
  }): Promise<PrivacyNoticeVersionRow> {
    const record = withMetadata(input.version, input.actorId);
    this.privacyNoticeVersions.set(record.id, record);
    return record;
  }

  async listPrivacyNoticeVersions(): Promise<PrivacyNoticeVersionRow[]> {
    return [...this.privacyNoticeVersions.values()];
  }

  async findPrivacyNoticeVersion(_tenantId: string, versionId: string): Promise<PrivacyNoticeVersionRow | null> {
    return this.privacyNoticeVersions.get(versionId) ?? null;
  }

  async createProcessingInventoryLink(input: {
    link: ProcessingInventoryLink;
    actorId: string;
  }): Promise<ProcessingInventoryLinkRow> {
    const record = withMetadata(input.link, input.actorId);
    this.processingInventoryLinks.set(record.id, record);
    return record;
  }

  async listProcessingInventoryLinks(): Promise<ProcessingInventoryLinkRow[]> {
    return [...this.processingInventoryLinks.values()];
  }

  async createPurpose(input: { purpose: Purpose; actorId: string }): Promise<PurposeRow> {
    const record = withMetadata(input.purpose, input.actorId);
    this.purposes.set(record.id, record);
    return record;
  }

  async listPurposes(): Promise<PurposeRow[]> {
    return [...this.purposes.values()];
  }

  async createLawfulBasis(input: { basis: LawfulBasis; actorId: string }): Promise<LawfulBasisRow> {
    const record = withMetadata(input.basis, input.actorId);
    this.lawfulBases.set(record.id, record);
    return record;
  }

  async listLawfulBases(): Promise<LawfulBasisRow[]> {
    return [...this.lawfulBases.values()];
  }

  async createProcessingPurposeAssignment(input: {
    assignment: ProcessingPurposeAssignment;
    actorId: string;
  }): Promise<ProcessingPurposeAssignmentRow> {
    const record = withMetadata(input.assignment, input.actorId);
    this.processingPurposeAssignments.set(record.id, record);
    return record;
  }

  async listProcessingPurposeAssignments(): Promise<ProcessingPurposeAssignmentRow[]> {
    return [...this.processingPurposeAssignments.values()];
  }

  async createRecipient(input: { recipient: Recipient; actorId: string }): Promise<RecipientRow> {
    const record = withMetadata(input.recipient, input.actorId);
    this.recipients.set(record.id, record);
    return record;
  }

  async listRecipients(): Promise<RecipientRow[]> {
    return [...this.recipients.values()];
  }

  async createProcessingRecipientLink(input: {
    link: ProcessingRecipientLink;
    actorId: string;
  }): Promise<ProcessingRecipientLinkRow> {
    const record = withMetadata(input.link, input.actorId);
    this.processingRecipientLinks.set(record.id, record);
    return record;
  }

  async listProcessingRecipientLinks(): Promise<ProcessingRecipientLinkRow[]> {
    return [...this.processingRecipientLinks.values()];
  }

  async createTransfer(input: { transfer: Transfer; actorId: string }): Promise<TransferRow> {
    const record = withMetadata(input.transfer, input.actorId);
    this.transfers.set(record.id, record);
    return record;
  }

  async listTransfers(): Promise<TransferRow[]> {
    return [...this.transfers.values()];
  }

  async createDpiaV2(input: { dpia: Dpia; actorId: string }): Promise<DpiaRow> {
    const record = withMetadata(input.dpia, input.actorId);
    this.dpiasV2.set(record.id, record);
    return record;
  }

  async listDpiasV2(): Promise<DpiaRow[]> {
    return [...this.dpiasV2.values()];
  }

  async createDpiaRisk(input: { risk: DpiaRisk; actorId: string }): Promise<DpiaRiskRow> {
    const record = withMetadata(input.risk, input.actorId);
    this.dpiaRisks.set(record.id, record);
    return record;
  }

  async listDpiaRisks(): Promise<DpiaRiskRow[]> {
    return [...this.dpiaRisks.values()];
  }

  async createRightsRequestTask(input: {
    task: RightsRequestTask;
    actorId: string;
  }): Promise<RightsRequestTaskRow> {
    const record = withMetadata(input.task, input.actorId);
    this.rightsRequestTasks.set(record.id, record);
    return record;
  }

  async listRightsRequestTasks(): Promise<RightsRequestTaskRow[]> {
    return [...this.rightsRequestTasks.values()];
  }

  async createConsentPurposeVersion(input: {
    version: ConsentPurposeVersion;
    actorId: string;
  }): Promise<ConsentPurposeVersionRow> {
    const record = withMetadata(input.version, input.actorId);
    this.consentPurposeVersions.set(record.id, record);
    return record;
  }

  async listConsentPurposeVersions(): Promise<ConsentPurposeVersionRow[]> {
    return [...this.consentPurposeVersions.values()];
  }

  async createConsentEvent(input: { event: ConsentEvent; actorId: string }): Promise<ConsentEventRow> {
    const record = withMetadata(input.event, input.actorId);
    this.consentEvents.set(record.id, record);
    return record;
  }

  async listConsentEvents(): Promise<ConsentEventRow[]> {
    return [...this.consentEvents.values()];
  }

  async createIncidentAssessment(input: {
    assessment: IncidentAssessment;
    actorId: string;
  }): Promise<IncidentAssessmentRow> {
    const record = withMetadata(input.assessment, input.actorId);
    this.incidentAssessments.set(record.id, record);
    return record;
  }

  async listIncidentAssessments(): Promise<IncidentAssessmentRow[]> {
    return [...this.incidentAssessments.values()];
  }

  async createIncidentNotification(input: {
    notification: IncidentNotification;
    actorId: string;
  }): Promise<IncidentNotificationRow> {
    const record = withMetadata(input.notification, input.actorId);
    this.incidentNotifications.set(record.id, record);
    return record;
  }

  async listIncidentNotifications(): Promise<IncidentNotificationRow[]> {
    return [...this.incidentNotifications.values()];
  }

  async createRetentionRule(input: { rule: RetentionRule; actorId: string }): Promise<RetentionRuleRow> {
    const record = withMetadata(input.rule, input.actorId);
    this.retentionRules.set(record.id, record);
    return record;
  }

  async listRetentionRules(): Promise<RetentionRuleRow[]> {
    return [...this.retentionRules.values()];
  }

  async createRetentionAssignment(input: {
    assignment: RetentionAssignment;
    actorId: string;
  }): Promise<RetentionAssignmentRow> {
    const record = withMetadata(input.assignment, input.actorId);
    this.retentionAssignments.set(record.id, record);
    return record;
  }

  async listRetentionAssignments(): Promise<RetentionAssignmentRow[]> {
    return [...this.retentionAssignments.values()];
  }

  async createLegalHold(input: { hold: LegalHold; actorId: string }): Promise<LegalHoldRow> {
    const record = withMetadata(input.hold, input.actorId);
    this.legalHolds.set(record.id, record);
    return record;
  }

  async updateLegalHold(input: { hold: LegalHold; actorId: string }): Promise<LegalHoldRow> {
    const record = withMetadata(input.hold, input.actorId, this.legalHolds.get(input.hold.id)?.versionNumber ?? 1);
    this.legalHolds.set(record.id, record);
    return record;
  }

  async listLegalHolds(): Promise<LegalHoldRow[]> {
    return [...this.legalHolds.values()];
  }

  async findLegalHold(_tenantId: string, legalHoldId: string): Promise<LegalHoldRow | null> {
    return this.legalHolds.get(legalHoldId) ?? null;
  }

  async createLegalHoldItem(input: { item: LegalHoldItem; actorId: string }): Promise<LegalHoldItemRow> {
    const record = withMetadata(input.item, input.actorId);
    this.legalHoldItems.set(record.id, record);
    return record;
  }

  async listLegalHoldItems(): Promise<LegalHoldItemRow[]> {
    return [...this.legalHoldItems.values()];
  }

  async findActiveLegalHoldForTarget(_tenantId: string, targetType: string, targetId: string): Promise<LegalHoldItemRow | null> {
    const item = [...this.legalHoldItems.values()].find((candidate) => candidate.targetType === targetType && candidate.targetId === targetId);
    if (!item) {
      return null;
    }
    const hold = this.legalHolds.get(item.legalHoldId);
    return hold && !hold.releasedAt ? item : null;
  }

  async createDeletionJob(input: { job: DeletionJob; actorId: string }): Promise<DeletionJobRow> {
    const record = withMetadata(input.job, input.actorId);
    this.deletionJobs.set(record.id, record);
    return record;
  }

  async updateDeletionJob(input: { job: DeletionJob; actorId: string }): Promise<DeletionJobRow> {
    const record = withMetadata(input.job, input.actorId, this.deletionJobs.get(input.job.id)?.versionNumber ?? 1);
    this.deletionJobs.set(record.id, record);
    return record;
  }

  async listDeletionJobs(): Promise<DeletionJobRow[]> {
    return [...this.deletionJobs.values()];
  }

  async findDeletionJob(_tenantId: string, deletionJobId: string): Promise<DeletionJobRow | null> {
    return this.deletionJobs.get(deletionJobId) ?? null;
  }

  async createDeletionItem(input: { item: DeletionItem; actorId: string }): Promise<DeletionItemRow> {
    const record = withMetadata(input.item, input.actorId);
    this.deletionItems.set(record.id, record);
    return record;
  }

  async listDeletionItems(): Promise<DeletionItemRow[]> {
    return [...this.deletionItems.values()];
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
