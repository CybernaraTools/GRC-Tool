import { Inject, Injectable } from "@nestjs/common";
import { TenantScopedDb } from "../../../platform/database/tenant-scoped-db.js";
import type {
  AssuranceAlert,
  AutomatedControlTest,
  Connector,
  ConnectorObject,
  ConnectorScope,
  SyncRun,
  WebhookContract,
  WebhookDelivery
} from "../domain/integration.js";
import type {
  AssuranceAlertRecord,
  AutomatedControlTestRecord,
  ConnectorObjectRecord,
  ConnectorRecord,
  IntegrationPlatformRepository,
  SyncRunRecord,
  WebhookContractRecord,
  WebhookDeliveryRecord
} from "../application/integration-platform.types.js";

@Injectable()
export class PostgresIntegrationPlatformRepository implements IntegrationPlatformRepository {
  constructor(@Inject(TenantScopedDb) private readonly db: TenantScopedDb) {}

  async createConnector(input: { connector: Connector; actorId: string }): Promise<ConnectorRecord> {
    return this.db.withTenant(input.connector.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into connectors (
            id, tenant_id, connector_key, provider, kind, scopes, secret_ref,
            status, health, sync_cursor, last_seen_at, classification,
            created_by, created_at, updated_by, updated_at
          )
          values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, null,
                  'confidential', $11, $12, $11, $12)
          on conflict (tenant_id, connector_key) do update
            set updated_at = connectors.updated_at
          returning ${connectorColumns()}
        `,
        [
          input.connector.id,
          input.connector.tenantId,
          input.connector.key,
          input.connector.provider,
          input.connector.kind,
          JSON.stringify(input.connector.scopes),
          input.connector.secretRef,
          input.connector.status,
          input.connector.health,
          input.connector.syncCursor,
          input.actorId,
          input.connector.createdAt
        ]
      );
      return mapConnector(result.rows[0]);
    });
  }

  async listConnectors(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<ConnectorRecord[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${connectorColumns()}
          from connectors
          where tenant_id = $1
          order by created_at desc
          limit $2 offset $3
        `,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapConnector);
    });
  }

  async findConnector(tenantId: string, connectorId: string): Promise<ConnectorRecord | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${connectorColumns()}
          from connectors
          where tenant_id = $1 and id = $2
        `,
        [tenantId, connectorId]
      );
      return result.rows[0] ? mapConnector(result.rows[0]) : null;
    });
  }

  async createSyncRun(input: {
    tenantId: string;
    connector: Connector;
    syncRun: SyncRun;
    actorId: string;
  }): Promise<{ connector: ConnectorRecord; syncRun: SyncRunRecord }> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const sync = await client.query(
        `
          insert into connector_sync_runs (
            id, tenant_id, connector_id, status, cursor_before, cursor_after,
            started_at, finished_at, object_counts, error, classification,
            created_by, created_at, updated_by, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10,
                  'confidential', $11, now(), $11, now())
          returning ${syncRunColumns()}
        `,
        [
          input.syncRun.id,
          input.tenantId,
          input.syncRun.connectorId,
          input.syncRun.status,
          input.syncRun.cursorBefore,
          input.syncRun.cursorAfter,
          input.syncRun.startedAt,
          input.syncRun.finishedAt ?? null,
          JSON.stringify(input.syncRun.objectCounts),
          input.syncRun.error ?? null,
          input.actorId
        ]
      );
      const connector = await client.query(
        `
          update connectors
          set sync_cursor = $3,
              health = $4,
              last_seen_at = now(),
              updated_by = $5,
              updated_at = now(),
              version = version + 1
          where tenant_id = $1 and id = $2
          returning ${connectorColumns()}
        `,
        [input.tenantId, input.connector.id, input.connector.syncCursor, input.connector.health, input.actorId]
      );
      return { connector: mapConnector(connector.rows[0]), syncRun: mapSyncRun(sync.rows[0]) };
    });
  }

  async listSyncRuns(input: {
    tenantId: string;
    connectorId: string;
    pagination: { limit: number; offset: number };
  }): Promise<SyncRunRecord[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${syncRunColumns()}
          from connector_sync_runs
          where tenant_id = $1 and connector_id = $2
          order by started_at desc
          limit $3 offset $4
        `,
        [input.tenantId, input.connectorId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapSyncRun);
    });
  }

  async findSyncRun(tenantId: string, syncRunId: string): Promise<SyncRunRecord | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${syncRunColumns()}
          from connector_sync_runs
          where tenant_id = $1 and id = $2
        `,
        [tenantId, syncRunId]
      );
      return result.rows[0] ? mapSyncRun(result.rows[0]) : null;
    });
  }

  async createConnectorObject(input: {
    tenantId: string;
    object: ConnectorObject;
    actorId: string;
  }): Promise<ConnectorObjectRecord> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into connector_objects (
            id, tenant_id, connector_id, object_type, external_id, source_hash,
            provenance, delivery_status, classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, 'confidential', $9, $9)
          on conflict (tenant_id, connector_id, object_type, external_id) do update
            set source_hash = excluded.source_hash,
                provenance = excluded.provenance,
                delivery_status = excluded.delivery_status,
                updated_by = excluded.updated_by,
                updated_at = now(),
                version = connector_objects.version + 1
          returning ${connectorObjectColumns()}
        `,
        [
          input.object.id,
          input.tenantId,
          input.object.connectorId,
          input.object.objectType,
          input.object.externalId,
          input.object.sourceHash,
          JSON.stringify(input.object.provenance),
          input.object.deliveryStatus,
          input.actorId
        ]
      );
      return mapConnectorObject(result.rows[0]);
    });
  }

  async listConnectorObjects(input: {
    tenantId: string;
    connectorId: string;
    pagination: { limit: number; offset: number };
  }): Promise<ConnectorObjectRecord[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${connectorObjectColumns()}
          from connector_objects
          where tenant_id = $1 and connector_id = $2
          order by created_at desc
          limit $3 offset $4
        `,
        [input.tenantId, input.connectorId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapConnectorObject);
    });
  }

  async createWebhookContract(input: {
    webhook: WebhookContract;
    actorId: string;
  }): Promise<WebhookContractRecord> {
    return this.db.withTenant(input.webhook.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into webhook_contracts (
            id, tenant_id, webhook_key, contract_version, direction, signing_secret_ref,
            rate_limit_per_minute, status, classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, 'confidential', $9, $9)
          on conflict (tenant_id, webhook_key, contract_version) do update
            set updated_at = webhook_contracts.updated_at
          returning ${webhookColumns()}
        `,
        [
          input.webhook.id,
          input.webhook.tenantId,
          input.webhook.key,
          input.webhook.version,
          input.webhook.direction,
          input.webhook.signingSecretRef,
          input.webhook.rateLimitPerMinute,
          input.webhook.status,
          input.actorId
        ]
      );
      return mapWebhook(result.rows[0]);
    });
  }

  async listWebhookContracts(input: {
    tenantId: string;
    pagination: { limit: number; offset: number };
  }): Promise<WebhookContractRecord[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${webhookColumns()}
          from webhook_contracts
          where tenant_id = $1
          order by created_at desc
          limit $2 offset $3
        `,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapWebhook);
    });
  }

  async findWebhookContract(tenantId: string, webhookId: string): Promise<WebhookContractRecord | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${webhookColumns()}
          from webhook_contracts
          where tenant_id = $1 and id = $2
        `,
        [tenantId, webhookId]
      );
      return result.rows[0] ? mapWebhook(result.rows[0]) : null;
    });
  }

  async createWebhookDelivery(input: {
    tenantId: string;
    delivery: WebhookDelivery;
    actorId: string;
  }): Promise<WebhookDeliveryRecord> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into webhook_deliveries (
            id, tenant_id, webhook_id, idempotency_key, payload_hash, delivery_status,
            attempts, last_error, observed_at, classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'confidential', $10, $10)
          on conflict (tenant_id, webhook_id, idempotency_key) do update
            set updated_at = webhook_deliveries.updated_at
          returning ${webhookDeliveryColumns()}
        `,
        [
          input.delivery.id,
          input.tenantId,
          input.delivery.webhookId,
          input.delivery.idempotencyKey,
          input.delivery.payloadHash,
          input.delivery.deliveryStatus,
          input.delivery.attempts,
          input.delivery.lastError ?? null,
          input.delivery.observedAt,
          input.actorId
        ]
      );
      return mapWebhookDelivery(result.rows[0]);
    });
  }

  async listWebhookDeliveries(input: {
    tenantId: string;
    webhookId: string;
    pagination: { limit: number; offset: number };
  }): Promise<WebhookDeliveryRecord[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${webhookDeliveryColumns()}
          from webhook_deliveries
          where tenant_id = $1 and webhook_id = $2
          order by observed_at desc
          limit $3 offset $4
        `,
        [input.tenantId, input.webhookId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapWebhookDelivery);
    });
  }

  async createAutomatedControlTest(input: {
    tenantId: string;
    test: AutomatedControlTest;
    actorId: string;
  }): Promise<AutomatedControlTestRecord> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into automated_control_tests (
            id, tenant_id, connector_id, control_ref, query, population, sample,
            result, source_timestamp, classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9,
                  'confidential', $10, $10)
          returning ${controlTestColumns()}
        `,
        [
          input.test.id,
          input.tenantId,
          input.test.connectorId,
          input.test.controlRef,
          input.test.query,
          JSON.stringify(input.test.population),
          JSON.stringify(input.test.sample),
          JSON.stringify(input.test.result),
          input.test.sourceTimestamp,
          input.actorId
        ]
      );
      return mapControlTest(result.rows[0]);
    });
  }

  async listAutomatedControlTests(input: {
    tenantId: string;
    connectorId?: string;
    controlRef?: string;
    pagination: { limit: number; offset: number };
  }): Promise<AutomatedControlTestRecord[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const values: unknown[] = [input.tenantId, input.pagination.limit, input.pagination.offset];
      let predicate = "";
      if (input.connectorId) {
        values.push(input.connectorId);
        predicate += ` and connector_id = $${values.length}`;
      }
      if (input.controlRef) {
        values.push(input.controlRef);
        predicate += ` and control_ref = $${values.length}`;
      }
      const result = await client.query(
        `
          select ${controlTestColumns()}
          from automated_control_tests
          where tenant_id = $1
          ${predicate}
          order by source_timestamp desc
          limit $2 offset $3
        `,
        values
      );
      return result.rows.map(mapControlTest);
    });
  }

  async createAssuranceAlert(input: { alert: AssuranceAlert; actorId: string }): Promise<AssuranceAlertRecord> {
    return this.db.withTenant(input.alert.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into assurance_alerts (
            id, tenant_id, source_type, source_id, severity, owner_id, sla_due_at,
            status, reason, classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'confidential', $10, $10)
          returning ${alertColumns()}
        `,
        [
          input.alert.id,
          input.alert.tenantId,
          input.alert.sourceType,
          input.alert.sourceId,
          input.alert.severity,
          input.alert.ownerId,
          input.alert.slaDueAt,
          input.alert.status,
          input.alert.reason,
          input.actorId
        ]
      );
      return mapAlert(result.rows[0]);
    });
  }

  async listAssuranceAlerts(input: {
    tenantId: string;
    status?: AssuranceAlert["status"];
    pagination: { limit: number; offset: number };
  }): Promise<AssuranceAlertRecord[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const values: unknown[] = [input.tenantId, input.pagination.limit, input.pagination.offset];
      const predicate = input.status ? "and status = $4" : "";
      if (input.status) {
        values.push(input.status);
      }
      const result = await client.query(
        `
          select ${alertColumns()}
          from assurance_alerts
          where tenant_id = $1
          ${predicate}
          order by sla_due_at asc, severity desc
          limit $2 offset $3
        `,
        values
      );
      return result.rows.map(mapAlert);
    });
  }
}

function connectorColumns(): string {
  return `
    id, tenant_id, version, connector_key, provider, kind, scopes, secret_ref, status,
    health, sync_cursor, last_seen_at, classification, created_by, created_at, updated_by, updated_at
  `;
}

function syncRunColumns(): string {
  return `
    id, tenant_id, version, connector_id, status, cursor_before, cursor_after, started_at,
    finished_at, object_counts, error, classification, created_by, created_at, updated_by, updated_at
  `;
}

function connectorObjectColumns(): string {
  return `
    id, tenant_id, version, connector_id, object_type, external_id, source_hash, provenance,
    delivery_status, classification, created_by, created_at, updated_by, updated_at
  `;
}

function webhookColumns(): string {
  return `
    id, tenant_id, version, webhook_key, contract_version, direction, signing_secret_ref,
    rate_limit_per_minute, status, classification, created_by, created_at, updated_by, updated_at
  `;
}

function webhookDeliveryColumns(): string {
  return `
    id, tenant_id, version, webhook_id, idempotency_key, payload_hash, delivery_status,
    attempts, last_error, observed_at, classification, created_by, created_at, updated_by, updated_at
  `;
}

function controlTestColumns(): string {
  return `
    id, tenant_id, version, connector_id, control_ref, query, population, sample, result,
    source_timestamp, classification, created_by, created_at, updated_by, updated_at
  `;
}

function alertColumns(): string {
  return `
    id, tenant_id, version, source_type, source_id, severity, owner_id, sla_due_at, status,
    reason, classification, created_by, created_at, updated_by, updated_at
  `;
}

function mapConnector(row: Record<string, unknown>): ConnectorRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    key: String(row.connector_key),
    provider: String(row.provider),
    kind: row.kind as ConnectorRecord["kind"],
    scopes: mapJsonArray<ConnectorScope>(row.scopes),
    secretRef: String(row.secret_ref),
    status: row.status as ConnectorRecord["status"],
    health: row.health as ConnectorRecord["health"],
    syncCursor: (row.sync_cursor as string | null) ?? null,
    lastSeenAt: row.last_seen_at as Date | undefined,
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

function mapSyncRun(row: Record<string, unknown>): SyncRunRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    connectorId: String(row.connector_id),
    status: row.status as SyncRunRecord["status"],
    cursorBefore: (row.cursor_before as string | null) ?? null,
    cursorAfter: (row.cursor_after as string | null) ?? null,
    startedAt: row.started_at as Date,
    finishedAt: row.finished_at as Date | undefined,
    objectCounts: mapJsonRecord(row.object_counts) as SyncRunRecord["objectCounts"],
    error: row.error ? String(row.error) : undefined,
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

function mapConnectorObject(row: Record<string, unknown>): ConnectorObjectRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    connectorId: String(row.connector_id),
    objectType: String(row.object_type),
    externalId: String(row.external_id),
    sourceHash: String(row.source_hash),
    provenance: mapJsonRecord(row.provenance) as ConnectorObjectRecord["provenance"],
    deliveryStatus: row.delivery_status as ConnectorObjectRecord["deliveryStatus"],
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

function mapWebhook(row: Record<string, unknown>): WebhookContractRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    key: String(row.webhook_key),
    version: String(row.contract_version),
    direction: row.direction as WebhookContractRecord["direction"],
    signingSecretRef: String(row.signing_secret_ref),
    rateLimitPerMinute: Number(row.rate_limit_per_minute),
    status: row.status as WebhookContractRecord["status"],
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

function mapWebhookDelivery(row: Record<string, unknown>): WebhookDeliveryRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    webhookId: String(row.webhook_id),
    idempotencyKey: String(row.idempotency_key),
    payloadHash: String(row.payload_hash),
    deliveryStatus: row.delivery_status as WebhookDeliveryRecord["deliveryStatus"],
    attempts: Number(row.attempts),
    observedAt: row.observed_at as Date,
    lastError: row.last_error ? String(row.last_error) : undefined,
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

function mapControlTest(row: Record<string, unknown>): AutomatedControlTestRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    connectorId: String(row.connector_id),
    controlRef: String(row.control_ref),
    query: String(row.query),
    population: mapJsonRecord(row.population),
    sample: mapJsonRecord(row.sample),
    result: mapJsonRecord(row.result) as AutomatedControlTestRecord["result"],
    sourceTimestamp: row.source_timestamp as Date,
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

function mapAlert(row: Record<string, unknown>): AssuranceAlertRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    sourceType: row.source_type as AssuranceAlertRecord["sourceType"],
    sourceId: String(row.source_id),
    severity: row.severity as AssuranceAlertRecord["severity"],
    ownerId: String(row.owner_id),
    slaDueAt: row.sla_due_at as Date,
    status: row.status as AssuranceAlertRecord["status"],
    reason: String(row.reason),
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

function mapJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (typeof value === "string") {
    return JSON.parse(value) as T[];
  }
  return [];
}

function mapJsonRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    return JSON.parse(value) as Record<string, unknown>;
  }
  return {};
}
