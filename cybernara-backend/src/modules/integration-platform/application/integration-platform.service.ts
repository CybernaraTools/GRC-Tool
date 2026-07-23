import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../../audit-security/public.js";
import { OutboxService } from "../../outbox/public.js";
import type { Pagination } from "../../../shared/pagination.js";
import {
  createWebhookContract,
  detectConnectorDegradation,
  detectControlTestFailure,
  reconcileConnectorObject,
  recordAutomatedControlTest,
  recordSyncRun,
  recordWebhookDelivery,
  registerConnector,
  type AlertStatus,
  type AutomatedControlTest,
  type ConnectorKind,
  type ConnectorScope,
  type DeliveryStatus,
  type SyncRun,
  type SyncStatus,
  type WebhookContract
} from "../domain/integration.js";
import { INTEGRATION_PLATFORM_REPOSITORY } from "./tokens.js";
import type {
  AssuranceAlertRecord,
  AutomatedControlTestRecord,
  ConnectorObjectRecord,
  ConnectorRecord,
  IntegrationPlatformRepository,
  SyncRunRecord,
  WebhookContractRecord,
  WebhookDeliveryRecord
} from "./integration-platform.types.js";

interface IntegrationOperationPayload extends Record<string, unknown> {
  connectorId?: string;
  syncRunId?: string;
  objectId?: string;
  webhookId?: string;
  deliveryId?: string;
  controlTestId?: string;
}

@Injectable()
export class IntegrationPlatformService {
  constructor(
    @Inject(INTEGRATION_PLATFORM_REPOSITORY) private readonly repository: IntegrationPlatformRepository,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(AuditLogService) private readonly auditLog: AuditLogService
  ) {}

  async registerConnector(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    key: string;
    provider: string;
    kind: ConnectorKind;
    scopes: ConnectorScope[];
    secretRef: string;
  }): Promise<ConnectorRecord> {
    const replay = await this.replayedConnector(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const connector = this.fromDomain(() => registerConnector(input));
    const persisted = await this.repository.createConnector({ connector, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "integration.connector_registered",
      aggregateType: "connector",
      aggregateId: persisted.id,
      payload: { connectorId: persisted.id },
      body: { connectorId: persisted.id, key: persisted.key, provider: persisted.provider, kind: persisted.kind }
    });
    return persisted;
  }

  async listConnectors(tenantId: string, pagination: Pagination): Promise<ConnectorRecord[]> {
    return this.repository.listConnectors({ tenantId, pagination });
  }

  async getConnector(tenantId: string, connectorId: string): Promise<ConnectorRecord> {
    const connector = await this.repository.findConnector(tenantId, connectorId);
    if (!connector) {
      throw new NotFoundException("Connector not found.");
    }
    return connector;
  }

  async recordSyncRun(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    connectorId: string;
    status: SyncStatus;
    cursorAfter: string | null;
    objectCounts: SyncRun["objectCounts"];
    finishedAt?: Date;
    error?: string;
    alertOwnerId?: string;
  }): Promise<{ connector: ConnectorRecord; syncRun: SyncRunRecord; alert?: AssuranceAlertRecord }> {
    const replay = await this.replayedSyncRun(input.tenantId, input.idempotencyKey);
    if (replay) {
      return { connector: await this.getConnector(input.tenantId, replay.connectorId), syncRun: replay };
    }
    const connector = await this.getConnector(input.tenantId, input.connectorId);
    const recorded = this.fromDomain(() =>
      recordSyncRun(connector, {
      status: input.status,
      cursorAfter: input.cursorAfter,
      objectCounts: input.objectCounts,
      finishedAt: input.finishedAt,
      error: input.error
      })
    );
    const persisted = await this.repository.createSyncRun({
      tenantId: input.tenantId,
      connector: recorded.connector,
      syncRun: recorded.syncRun,
      actorId: input.actorId
    });
    const alert =
      input.alertOwnerId && persisted.connector.health !== "healthy"
        ? await this.repository.createAssuranceAlert({
            alert: detectConnectorDegradation({
              tenantId: input.tenantId,
              connector: persisted.connector,
              ownerId: input.alertOwnerId
            })!,
            actorId: input.actorId
          })
        : undefined;
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "integration.sync_run_recorded",
      aggregateType: "connector_sync_run",
      aggregateId: persisted.syncRun.id,
      payload: { syncRunId: persisted.syncRun.id, connectorId: persisted.connector.id },
      body: { syncRunId: persisted.syncRun.id, connectorId: persisted.connector.id, status: persisted.syncRun.status }
    });
    return { ...persisted, alert };
  }

  async listSyncRuns(tenantId: string, connectorId: string, pagination: Pagination): Promise<SyncRunRecord[]> {
    await this.getConnector(tenantId, connectorId);
    return this.repository.listSyncRuns({ tenantId, connectorId, pagination });
  }

  async recordConnectorObject(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    connectorId: string;
    syncRunId: string;
    objectType: string;
    externalId: string;
    sourcePayload: Record<string, unknown>;
    deliveryStatus: DeliveryStatus;
    sourceTimestamp: Date;
  }): Promise<ConnectorObjectRecord> {
    const replay = await this.replayedObject(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const connector = await this.getConnector(input.tenantId, input.connectorId);
    const syncRun = await this.repository.findSyncRun(input.tenantId, input.syncRunId);
    if (!syncRun || syncRun.connectorId !== connector.id) {
      throw new NotFoundException("Connector sync run not found.");
    }
    const object = this.fromDomain(() =>
      reconcileConnectorObject({
      connector,
      syncRun,
      objectType: input.objectType,
      externalId: input.externalId,
      sourcePayload: input.sourcePayload,
      deliveryStatus: input.deliveryStatus,
      sourceTimestamp: input.sourceTimestamp
      })
    );
    const persisted = await this.repository.createConnectorObject({
      tenantId: input.tenantId,
      object,
      actorId: input.actorId
    });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "integration.connector_object_recorded",
      aggregateType: "connector_object",
      aggregateId: persisted.id,
      payload: { objectId: persisted.id, connectorId: persisted.connectorId },
      body: { objectId: persisted.id, connectorId: persisted.connectorId, externalId: persisted.externalId }
    });
    return persisted;
  }

  async listConnectorObjects(
    tenantId: string,
    connectorId: string,
    pagination: Pagination
  ): Promise<ConnectorObjectRecord[]> {
    await this.getConnector(tenantId, connectorId);
    return this.repository.listConnectorObjects({ tenantId, connectorId, pagination });
  }

  async registerWebhookContract(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    key: string;
    version: string;
    direction: WebhookContract["direction"];
    signingSecretRef: string;
    rateLimitPerMinute: number;
  }): Promise<WebhookContractRecord> {
    const replay = await this.replayedWebhook(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const webhook = this.fromDomain(() => createWebhookContract(input));
    const persisted = await this.repository.createWebhookContract({ webhook, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "integration.webhook_contract_registered",
      aggregateType: "webhook_contract",
      aggregateId: persisted.id,
      payload: { webhookId: persisted.id },
      body: { webhookId: persisted.id, key: persisted.key, version: persisted.version }
    });
    return persisted;
  }

  async listWebhookContracts(tenantId: string, pagination: Pagination): Promise<WebhookContractRecord[]> {
    return this.repository.listWebhookContracts({ tenantId, pagination });
  }

  async recordWebhookDelivery(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    webhookId: string;
    deliveryIdempotencyKey: string;
    payload: Record<string, unknown>;
    deliveryStatus: DeliveryStatus;
    attempts: number;
    observedAt?: Date;
    lastError?: string;
  }): Promise<WebhookDeliveryRecord> {
    const replay = await this.replayedDelivery(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const webhook = await this.getWebhook(input.tenantId, input.webhookId);
    const delivery = this.fromDomain(() =>
      recordWebhookDelivery(webhook, {
      idempotencyKey: input.deliveryIdempotencyKey,
      payload: input.payload,
      deliveryStatus: input.deliveryStatus,
      attempts: input.attempts,
      observedAt: input.observedAt,
      lastError: input.lastError
      })
    );
    const persisted = await this.repository.createWebhookDelivery({
      tenantId: input.tenantId,
      delivery,
      actorId: input.actorId
    });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "integration.webhook_delivery_recorded",
      aggregateType: "webhook_delivery",
      aggregateId: persisted.id,
      payload: { deliveryId: persisted.id, webhookId: persisted.webhookId },
      body: { deliveryId: persisted.id, webhookId: persisted.webhookId, status: persisted.deliveryStatus }
    });
    return persisted;
  }

  async listWebhookDeliveries(
    tenantId: string,
    webhookId: string,
    pagination: Pagination
  ): Promise<WebhookDeliveryRecord[]> {
    await this.getWebhook(tenantId, webhookId);
    return this.repository.listWebhookDeliveries({ tenantId, webhookId, pagination });
  }

  async recordAutomatedControlTest(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    connectorId: string;
    controlRef: string;
    query: string;
    population: Record<string, unknown>;
    sample: Record<string, unknown>;
    result: AutomatedControlTest["result"];
    sourceTimestamp: Date;
    ownerId: string;
  }): Promise<{ controlTest: AutomatedControlTestRecord; alert?: AssuranceAlertRecord }> {
    const replay = await this.replayedControlTest(input.tenantId, input.idempotencyKey);
    if (replay) {
      return { controlTest: replay };
    }
    const connector = await this.getConnector(input.tenantId, input.connectorId);
    const test = this.fromDomain(() =>
      recordAutomatedControlTest({
      connector,
      controlRef: input.controlRef,
      query: input.query,
      population: input.population,
      sample: input.sample,
      result: input.result,
      sourceTimestamp: input.sourceTimestamp
      })
    );
    const controlTest = await this.repository.createAutomatedControlTest({
      tenantId: input.tenantId,
      test,
      actorId: input.actorId
    });
    const candidateAlert = detectControlTestFailure({
      tenantId: input.tenantId,
      test: controlTest,
      ownerId: input.ownerId
    });
    const alert = candidateAlert
      ? await this.repository.createAssuranceAlert({ alert: candidateAlert, actorId: input.actorId })
      : undefined;
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "integration.control_test_recorded",
      aggregateType: "automated_control_test",
      aggregateId: controlTest.id,
      payload: { controlTestId: controlTest.id },
      body: { controlTestId: controlTest.id, connectorId: controlTest.connectorId, status: controlTest.result.status }
    });
    return { controlTest, alert };
  }

  async listAutomatedControlTests(input: {
    tenantId: string;
    connectorId?: string;
    controlRef?: string;
    pagination: Pagination;
  }): Promise<AutomatedControlTestRecord[]> {
    return this.repository.listAutomatedControlTests(input);
  }

  async listAssuranceAlerts(input: {
    tenantId: string;
    status?: AlertStatus;
    pagination: Pagination;
  }): Promise<AssuranceAlertRecord[]> {
    return this.repository.listAssuranceAlerts(input);
  }

  private async getWebhook(tenantId: string, webhookId: string): Promise<WebhookContractRecord> {
    const webhook = await this.repository.findWebhookContract(tenantId, webhookId);
    if (!webhook) {
      throw new NotFoundException("Webhook contract not found.");
    }
    return webhook;
  }

  private async replayedConnector(tenantId: string, idempotencyKey: string): Promise<ConnectorRecord | null> {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as Partial<IntegrationOperationPayload>;
    if (!payload.connectorId) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    return this.getConnector(tenantId, payload.connectorId);
  }

  private async replayedSyncRun(tenantId: string, idempotencyKey: string): Promise<SyncRunRecord | null> {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as Partial<IntegrationOperationPayload>;
    if (!payload.syncRunId) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    const syncRun = await this.repository.findSyncRun(tenantId, payload.syncRunId);
    if (!syncRun) {
      throw new NotFoundException("Connector sync run not found.");
    }
    return syncRun;
  }

  private async replayedObject(tenantId: string, idempotencyKey: string): Promise<ConnectorObjectRecord | null> {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as Partial<IntegrationOperationPayload>;
    if (!payload.objectId || !payload.connectorId) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    const objects = await this.repository.listConnectorObjects({
      tenantId,
      connectorId: payload.connectorId,
      pagination: { limit: 500, offset: 0 }
    });
    const object = objects.find((candidate) => candidate.id === payload.objectId);
    if (!object) {
      throw new NotFoundException("Connector object not found.");
    }
    return object;
  }

  private async replayedWebhook(tenantId: string, idempotencyKey: string): Promise<WebhookContractRecord | null> {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as Partial<IntegrationOperationPayload>;
    if (!payload.webhookId) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    return this.getWebhook(tenantId, payload.webhookId);
  }

  private async replayedDelivery(tenantId: string, idempotencyKey: string): Promise<WebhookDeliveryRecord | null> {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as Partial<IntegrationOperationPayload>;
    if (!payload.deliveryId || !payload.webhookId) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    const deliveries = await this.repository.listWebhookDeliveries({
      tenantId,
      webhookId: payload.webhookId,
      pagination: { limit: 500, offset: 0 }
    });
    const delivery = deliveries.find((candidate) => candidate.id === payload.deliveryId);
    if (!delivery) {
      throw new NotFoundException("Webhook delivery not found.");
    }
    return delivery;
  }

  private async replayedControlTest(
    tenantId: string,
    idempotencyKey: string
  ): Promise<AutomatedControlTestRecord | null> {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as Partial<IntegrationOperationPayload>;
    if (!payload.controlTestId) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    const tests = await this.repository.listAutomatedControlTests({
      tenantId,
      pagination: { limit: 500, offset: 0 }
    });
    const test = tests.find((candidate) => candidate.id === payload.controlTestId);
    if (!test) {
      throw new NotFoundException("Automated control test not found.");
    }
    return test;
  }

  private async publishMutation(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    payload: IntegrationOperationPayload;
    body: Record<string, unknown>;
  }): Promise<void> {
    const now = new Date();
    const outboxEvent = await this.outbox.publish({
      tenantId: input.tenantId,
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload,
      idempotencyKey: input.idempotencyKey,
      createdBy: input.actorId,
      now
    });
    if (outboxEvent.createdAt.getTime() !== now.getTime()) {
      return;
    }
    await this.auditLog.append({
      tenantId: input.tenantId,
      eventType: input.eventType,
      actorId: input.actorId,
      targetType: input.aggregateType,
      targetId: input.aggregateId,
      traceId: input.idempotencyKey,
      classification: "confidential",
      body: input.body
    });
  }

  private fromDomain<T>(operation: () => T): T {
    try {
      return operation();
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }
}
