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
  IntegrationPlatformService,
  type AssuranceAlertRecord,
  type AutomatedControlTestRecord,
  type ConnectorObjectRecord,
  type ConnectorRecord,
  type IntegrationPlatformRepository,
  type SyncRunRecord,
  type WebhookContractRecord,
  type WebhookDeliveryRecord
} from "../../src/modules/integration-platform/public.js";
import {
  createWebhookContract,
  detectControlTestFailure,
  reconcileConnectorObject,
  recordAutomatedControlTest,
  recordSyncRun,
  recordWebhookDelivery,
  registerConnector,
  type AssuranceAlert,
  type AutomatedControlTest,
  type Connector,
  type ConnectorObject,
  type SyncRun,
  type WebhookContract,
  type WebhookDelivery
} from "../../src/modules/integration-platform/domain/integration.js";
import { PostgresIntegrationPlatformRepository } from "../../src/modules/integration-platform/infrastructure/postgres-integration-platform.repository.js";
import { createOutboxEvent } from "../../src/modules/outbox/domain/outbox-event.js";
import type { OutboxEvent, OutboxService } from "../../src/modules/outbox/public.js";
import { TenantScopedDb } from "../../src/platform/database/tenant-scoped-db.js";
import { DATABASE_POOL } from "../../src/platform/database/tokens.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";

const actorId = randomUUID();
const ownerId = randomUUID();
const tenantId = randomUUID();

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

describe("A6 IntegrationPlatform repository", () => {
  it("persists connectors, sync runs, objects, webhooks, control tests, and alerts against real Supabase", async () => {
    const repository = new PostgresIntegrationPlatformRepository(repositoryDb);
    const repositoryTenant = randomUUID();
    const connector = await repository.createConnector({
      connector: registerConnector({
        tenantId: repositoryTenant,
        key: `okta-${randomUUID()}`,
        provider: "Okta",
        kind: "identity",
        secretRef: "secret://tenant/okta",
        scopes: [{ name: "users.read", access: "read", reason: "Collect users for access-review tests." }]
      }),
      actorId
    });
    const recorded = recordSyncRun(connector, {
      status: "succeeded",
      cursorAfter: "cursor-a6",
      objectCounts: { read: 1, created: 1, updated: 0, deleted: 0 },
      finishedAt: new Date("2026-07-03T00:00:00.000Z")
    });
    const sync = await repository.createSyncRun({
      tenantId: repositoryTenant,
      connector: recorded.connector,
      syncRun: recorded.syncRun,
      actorId
    });
    const object = await repository.createConnectorObject({
      tenantId: repositoryTenant,
      object: reconcileConnectorObject({
        connector: sync.connector,
        syncRun: sync.syncRun,
        objectType: "user",
        externalId: "00u-repository",
        sourcePayload: { id: "00u-repository", mfa: true },
        deliveryStatus: "delivered",
        sourceTimestamp: new Date("2026-07-03T00:00:00.000Z")
      }),
      actorId
    });
    const webhook = await repository.createWebhookContract({
      webhook: createWebhookContract({
        tenantId: repositoryTenant,
        key: `ticket-created-${randomUUID()}`,
        version: "v1.0.0",
        direction: "outbound",
        signingSecretRef: "secret://tenant/webhooks/ticket-created",
        rateLimitPerMinute: 120
      }),
      actorId
    });
    const delivery = await repository.createWebhookDelivery({
      tenantId: repositoryTenant,
      delivery: recordWebhookDelivery(webhook, {
        idempotencyKey: "repository-delivery",
        payload: { ticketId: "A6-1" },
        deliveryStatus: "delivered",
        attempts: 1
      }),
      actorId
    });
    const controlTest = await repository.createAutomatedControlTest({
      tenantId: repositoryTenant,
      test: recordAutomatedControlTest({
        connector: sync.connector,
        controlRef: "SOC2:CC6.1",
        query: "users where mfa = false",
        population: { users: 1 },
        sample: { users: ["00u-repository"] },
        result: { status: "fail", summary: "MFA missing.", evidenceObjectIds: [] },
        sourceTimestamp: new Date("2026-07-03T00:00:00.000Z")
      }),
      actorId
    });
    const alert = detectControlTestFailure({ tenantId: repositoryTenant, test: controlTest, ownerId });
    expect(alert).not.toBeNull();
    const persistedAlert = await repository.createAssuranceAlert({ alert: alert!, actorId });

    expect(sync.connector.syncCursor).toBe("cursor-a6");
    expect(object.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(delivery.payloadHash).toMatch(/^[a-f0-9]{64}$/);
    expect(persistedAlert.sourceId).toBe(controlTest.id);
    // Caught by the full-gate run 2026-07-06: this test chains 6 sequential
    // real-Supabase calls (connector, sync run, object, webhook, control
    // test, alert) with no timeout override, and tipped over the default
    // 5000ms under general suite latency — unrelated to this session's
    // G-01/G-09 work (IntegrationPlatform is untouched by either), but a
    // real regression against the default timeout worth fixing now that the
    // gate surfaced it. Same fix already applied to a2/a4's assessment-chain
    // tests.
  }, 30_000);
});

describe("A6 IntegrationPlatform service orchestration", () => {
  it("deduplicates connector registration and emits alert side effects for failed control tests", async () => {
    const repository = new InMemoryIntegrationRepository();
    const outbox = new InMemoryOutbox();
    const audit = new InMemoryAuditLog();
    const service = new IntegrationPlatformService(
      repository,
      outbox as unknown as OutboxService,
      audit as unknown as AuditLogService
    );
    const connector = await service.registerConnector({
      tenantId,
      actorId,
      idempotencyKey: "service-connector",
      key: "service-okta",
      provider: "Okta",
      kind: "identity",
      secretRef: "secret://tenant/service-okta",
      scopes: [{ name: "users.read", access: "read", reason: "Collect users for access-review tests." }]
    });
    const replayed = await service.registerConnector({
      tenantId,
      actorId,
      idempotencyKey: "service-connector",
      key: "service-okta",
      provider: "Okta",
      kind: "identity",
      secretRef: "secret://tenant/service-okta",
      scopes: [{ name: "users.read", access: "read", reason: "Collect users for access-review tests." }]
    });
    const result = await service.recordAutomatedControlTest({
      tenantId,
      actorId,
      idempotencyKey: "service-control-test",
      connectorId: connector.id,
      controlRef: "SOC2:CC6.1",
      query: "users where mfa = false",
      population: { users: 1 },
      sample: { users: ["00u-service"] },
      result: { status: "fail", summary: "MFA missing.", evidenceObjectIds: [] },
      sourceTimestamp: new Date("2026-07-03T00:00:00.000Z"),
      ownerId
    });

    expect(replayed.id).toBe(connector.id);
    expect(result.alert?.severity).toBe("high");
    expect(outbox.events).toHaveLength(2);
    expect(audit.events).toHaveLength(2);
  });
});

describe("A6 IntegrationPlatform HTTP exposure", () => {
  it("rejects missing context, missing scopes, missing idempotency keys, and raw secrets", async () => {
    const unauthenticated = await fetch(`${baseUrl}/v1/integration-platform/connectors`);
    expect(unauthenticated.status).toBe(401);

    const unauthorized = await fetch(`${baseUrl}/v1/integration-platform/connectors`, {
      headers: headers("assessment:read")
    });
    expect(unauthorized.status).toBe(403);

    const missingIdempotency = await fetch(`${baseUrl}/v1/integration-platform/connectors`, {
      method: "POST",
      headers: headers("connector:write"),
      body: JSON.stringify(connectorBody())
    });
    expect(missingIdempotency.status).toBe(400);

    const rawSecret = await requestJson(
      "POST",
      "/v1/integration-platform/connectors",
      { ...connectorBody(), key: `raw-${randomUUID()}`, secretRef: "plain-secret" },
      "connector:write",
      "a6-raw-secret"
    );
    expect(rawSecret.status).toBe(400);
  });

  it("runs connector, sync, object, webhook, control-test, and alert flows through HTTP", async () => {
    const connectorKey = "a6-connector";
    const firstConnector = await requestJson(
      "POST",
      "/v1/integration-platform/connectors",
      connectorBody(connectorKey),
      "connector:write",
      "a6-connector"
    );
    const secondConnector = await requestJson(
      "POST",
      "/v1/integration-platform/connectors",
      connectorBody(connectorKey),
      "connector:write",
      "a6-connector"
    );
    expect(firstConnector.status).toBe(201);
    expect(secondConnector.status).toBe(201);
    const connector = (await firstConnector.json()) as ConnectorResponse;
    expect(((await secondConnector.json()) as ConnectorResponse).id).toBe(connector.id);

    // G-10 cutover note: appPool now connects as the RLS-scoped app_runtime
    // role, so an ad-hoc query with no tenant context set would (correctly)
    // see zero rows. This is a test-assertion helper query, not application
    // behavior under test, so it uses the owner-role repositoryPool instead.
    const outboxCount = await repositoryPool.query(
      `select count(*)::int as count from outbox_events where tenant_id = $1 and idempotency_key = $2`,
      [tenantId, "a6-connector"]
    );
    expect(outboxCount.rows[0].count).toBe(1);

    const syncResponse = await requestJson(
      "POST",
      `/v1/integration-platform/connectors/${connector.id}/sync-runs`,
      {
        status: "succeeded",
        cursorAfter: "cursor-http-a6",
        objectCounts: { read: 1, created: 1, updated: 0, deleted: 0 },
        finishedAt: "2026-07-03T00:00:00.000Z"
      },
      "connector_sync_run:write",
      "a6-sync"
    );
    expect(syncResponse.status).toBe(201);
    const syncBody = (await syncResponse.json()) as { connector: ConnectorResponse; syncRun: SyncRunResponse };
    expect(syncBody.connector.syncCursor).toBe("cursor-http-a6");

    const objectResponse = await requestJson(
      "POST",
      `/v1/integration-platform/connectors/${connector.id}/objects`,
      {
        syncRunId: syncBody.syncRun.id,
        objectType: "user",
        externalId: "00u-http",
        sourcePayload: { id: "00u-http", mfa: false },
        deliveryStatus: "delivered",
        sourceTimestamp: "2026-07-03T00:00:00.000Z"
      },
      "connector_object:write",
      "a6-object"
    );
    expect(objectResponse.status).toBe(201);
    expect(((await objectResponse.json()) as ConnectorObjectResponse).sourceHash).toMatch(/^[a-f0-9]{64}$/);

    const webhookResponse = await requestJson(
      "POST",
      "/v1/integration-platform/webhook-contracts",
      {
        key: "ticket-created",
        version: "v1.0.0",
        direction: "outbound",
        signingSecretRef: "secret://tenant/webhooks/ticket-created",
        rateLimitPerMinute: 120
      },
      "webhook_contract:write",
      "a6-webhook"
    );
    expect(webhookResponse.status).toBe(201);
    const webhook = (await webhookResponse.json()) as WebhookResponse;

    const deliveryResponse = await requestJson(
      "POST",
      `/v1/integration-platform/webhook-contracts/${webhook.id}/deliveries`,
      {
        deliveryIdempotencyKey: "ticket-created:A6-1",
        payload: { ticketId: "A6-1", status: "open" },
        deliveryStatus: "delivered",
        attempts: 1,
        observedAt: "2026-07-03T00:00:00.000Z"
      },
      "webhook_delivery:write",
      "a6-delivery"
    );
    expect(deliveryResponse.status).toBe(201);
    expect(((await deliveryResponse.json()) as WebhookDeliveryResponse).payloadHash).toMatch(/^[a-f0-9]{64}$/);

    const controlTestResponse = await requestJson(
      "POST",
      "/v1/integration-platform/control-tests",
      {
        connectorId: connector.id,
        controlRef: "SOC2:CC6.1",
        query: "users where mfa = false",
        population: { users: 1 },
        sample: { users: ["00u-http"] },
        result: { status: "fail", summary: "MFA missing.", evidenceObjectIds: [] },
        sourceTimestamp: "2026-07-03T00:00:00.000Z",
        ownerId
      },
      "automated_control_test:write",
      "a6-control-test"
    );
    expect(controlTestResponse.status).toBe(201);
    const controlTestBody = (await controlTestResponse.json()) as {
      controlTest: ControlTestResponse;
      alert?: AlertResponse;
    };
    expect(controlTestBody.alert?.sourceId).toBe(controlTestBody.controlTest.id);

    const connectors = await getJson<ConnectorResponse[]>("/v1/integration-platform/connectors", "connector:read");
    expect(connectors.some((candidate) => candidate.id === connector.id)).toBe(true);
    const syncRuns = await getJson<SyncRunResponse[]>(
      `/v1/integration-platform/connectors/${connector.id}/sync-runs`,
      "connector_sync_run:read"
    );
    expect(syncRuns.some((candidate) => candidate.id === syncBody.syncRun.id)).toBe(true);
    const objects = await getJson<ConnectorObjectResponse[]>(
      `/v1/integration-platform/connectors/${connector.id}/objects`,
      "connector_object:read"
    );
    expect(objects.some((candidate) => candidate.externalId === "00u-http")).toBe(true);
    const deliveries = await getJson<WebhookDeliveryResponse[]>(
      `/v1/integration-platform/webhook-contracts/${webhook.id}/deliveries`,
      "webhook_delivery:read"
    );
    expect(deliveries.some((candidate) => candidate.deliveryStatus === "delivered")).toBe(true);
    const tests = await getJson<ControlTestResponse[]>(
      `/v1/integration-platform/control-tests?connectorId=${connector.id}`,
      "automated_control_test:read"
    );
    expect(tests.some((candidate) => candidate.id === controlTestBody.controlTest.id)).toBe(true);
    const alerts = await getJson<AlertResponse[]>(
      "/v1/integration-platform/assurance-alerts?status=triaged",
      "assurance_alert:read"
    );
    expect(alerts.some((candidate) => candidate.sourceId === controlTestBody.controlTest.id)).toBe(true);
  }, 120_000);
});

interface ConnectorResponse {
  id: string;
  key: string;
  syncCursor: string | null;
}

interface SyncRunResponse {
  id: string;
}

interface ConnectorObjectResponse {
  sourceHash: string;
  externalId: string;
}

interface WebhookResponse {
  id: string;
}

interface WebhookDeliveryResponse {
  payloadHash: string;
  deliveryStatus: string;
}

interface ControlTestResponse {
  id: string;
}

interface AlertResponse {
  sourceId: string;
}

function connectorBody(key = "a6-connector") {
  return {
    key,
    provider: "Okta",
    kind: "identity",
    secretRef: "secret://tenant/okta",
    scopes: [{ name: "users.read", access: "read", reason: "Collect users for access-review tests." }]
  };
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

class InMemoryIntegrationRepository implements IntegrationPlatformRepository {
  readonly connectors = new Map<string, ConnectorRecord>();
  readonly syncRuns = new Map<string, SyncRunRecord>();
  readonly objects = new Map<string, ConnectorObjectRecord>();
  readonly webhooks = new Map<string, WebhookContractRecord>();
  readonly deliveries = new Map<string, WebhookDeliveryRecord>();
  readonly controlTests = new Map<string, AutomatedControlTestRecord>();
  readonly alerts = new Map<string, AssuranceAlertRecord>();

  async createConnector(input: { connector: Connector; actorId: string }): Promise<ConnectorRecord> {
    const record: ConnectorRecord = {
      ...input.connector,
      version: 1,
      classification: "confidential",
      createdBy: input.actorId,
      updatedBy: input.actorId,
      updatedAt: input.connector.createdAt
    };
    this.connectors.set(record.id, record);
    return record;
  }

  async listConnectors(): Promise<ConnectorRecord[]> {
    return [...this.connectors.values()];
  }

  async findConnector(_tenantId: string, connectorId: string): Promise<ConnectorRecord | null> {
    return this.connectors.get(connectorId) ?? null;
  }

  async createSyncRun(input: {
    tenantId: string;
    connector: Connector;
    syncRun: SyncRun;
    actorId: string;
  }): Promise<{ connector: ConnectorRecord; syncRun: SyncRunRecord }> {
    const connector = this.connectors.get(input.connector.id);
    if (!connector) {
      throw new Error("missing connector");
    }
    const updatedConnector: ConnectorRecord = {
      ...connector,
      syncCursor: input.connector.syncCursor,
      health: input.connector.health,
      updatedBy: input.actorId,
      updatedAt: new Date()
    };
    const syncRun: SyncRunRecord = {
      ...input.syncRun,
      tenantId: input.tenantId,
      version: 1,
      classification: "confidential",
      createdBy: input.actorId,
      createdAt: new Date(),
      updatedBy: input.actorId,
      updatedAt: new Date()
    };
    this.connectors.set(updatedConnector.id, updatedConnector);
    this.syncRuns.set(syncRun.id, syncRun);
    return { connector: updatedConnector, syncRun };
  }

  async listSyncRuns(): Promise<SyncRunRecord[]> {
    return [...this.syncRuns.values()];
  }

  async findSyncRun(_tenantId: string, syncRunId: string): Promise<SyncRunRecord | null> {
    return this.syncRuns.get(syncRunId) ?? null;
  }

  async createConnectorObject(input: {
    tenantId: string;
    object: ConnectorObject;
    actorId: string;
  }): Promise<ConnectorObjectRecord> {
    const record: ConnectorObjectRecord = {
      ...input.object,
      tenantId: input.tenantId,
      version: 1,
      classification: "confidential",
      createdBy: input.actorId,
      createdAt: new Date(),
      updatedBy: input.actorId,
      updatedAt: new Date()
    };
    this.objects.set(record.id, record);
    return record;
  }

  async listConnectorObjects(): Promise<ConnectorObjectRecord[]> {
    return [...this.objects.values()];
  }

  async createWebhookContract(input: {
    webhook: WebhookContract;
    actorId: string;
  }): Promise<WebhookContractRecord> {
    const record: WebhookContractRecord = {
      ...input.webhook,
      versionNumber: 1,
      classification: "confidential",
      createdBy: input.actorId,
      createdAt: new Date(),
      updatedBy: input.actorId,
      updatedAt: new Date()
    };
    this.webhooks.set(record.id, record);
    return record;
  }

  async listWebhookContracts(): Promise<WebhookContractRecord[]> {
    return [...this.webhooks.values()];
  }

  async findWebhookContract(_tenantId: string, webhookId: string): Promise<WebhookContractRecord | null> {
    return this.webhooks.get(webhookId) ?? null;
  }

  async createWebhookDelivery(input: {
    tenantId: string;
    delivery: WebhookDelivery;
    actorId: string;
  }): Promise<WebhookDeliveryRecord> {
    const record: WebhookDeliveryRecord = {
      ...input.delivery,
      tenantId: input.tenantId,
      version: 1,
      classification: "confidential",
      createdBy: input.actorId,
      createdAt: new Date(),
      updatedBy: input.actorId,
      updatedAt: new Date()
    };
    this.deliveries.set(record.id, record);
    return record;
  }

  async listWebhookDeliveries(): Promise<WebhookDeliveryRecord[]> {
    return [...this.deliveries.values()];
  }

  async createAutomatedControlTest(input: {
    tenantId: string;
    test: AutomatedControlTest;
    actorId: string;
  }): Promise<AutomatedControlTestRecord> {
    const record: AutomatedControlTestRecord = {
      ...input.test,
      tenantId: input.tenantId,
      version: 1,
      classification: "confidential",
      createdBy: input.actorId,
      createdAt: new Date(),
      updatedBy: input.actorId,
      updatedAt: new Date()
    };
    this.controlTests.set(record.id, record);
    return record;
  }

  async listAutomatedControlTests(): Promise<AutomatedControlTestRecord[]> {
    return [...this.controlTests.values()];
  }

  async createAssuranceAlert(input: { alert: AssuranceAlert; actorId: string }): Promise<AssuranceAlertRecord> {
    const record: AssuranceAlertRecord = {
      ...input.alert,
      version: 1,
      classification: "confidential",
      createdBy: input.actorId,
      createdAt: new Date(),
      updatedBy: input.actorId,
      updatedAt: new Date()
    };
    this.alerts.set(record.id, record);
    return record;
  }

  async listAssuranceAlerts(): Promise<AssuranceAlertRecord[]> {
    return [...this.alerts.values()];
  }
}
