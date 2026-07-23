import { createHash, randomUUID } from "node:crypto";

export type ConnectorKind =
  | "cloud"
  | "identity"
  | "endpoint"
  | "code"
  | "ticketing"
  | "document"
  | "siem"
  | "vulnerability"
  | "data"
  | "crm"
  | "clm"
  | "notification"
  | "vendor_intelligence"
  | "trust_portal";

export type ConnectorStatus = "draft" | "active" | "disabled";
export type ConnectorHealth = "healthy" | "degraded" | "failing";
export type SyncStatus = "started" | "succeeded" | "failed";
export type DeliveryStatus = "pending" | "delivered" | "failed" | "dead_lettered";
export type TestResultStatus = "pass" | "fail" | "inconclusive";
export type AlertSeverity = "low" | "medium" | "high" | "critical";
export type AlertStatus = "open" | "triaged" | "resolved";

export interface ConnectorScope {
  name: string;
  access: "read" | "write";
  reason: string;
}

export interface Connector {
  id: string;
  tenantId: string;
  key: string;
  provider: string;
  kind: ConnectorKind;
  scopes: ConnectorScope[];
  secretRef: string;
  status: ConnectorStatus;
  health: ConnectorHealth;
  syncCursor: string | null;
  createdAt: Date;
}

export interface SyncRun {
  id: string;
  connectorId: string;
  status: SyncStatus;
  cursorBefore: string | null;
  cursorAfter: string | null;
  startedAt: Date;
  finishedAt?: Date;
  objectCounts: {
    read: number;
    created: number;
    updated: number;
    deleted: number;
  };
  error?: string;
}

export interface ConnectorObject {
  id: string;
  connectorId: string;
  objectType: string;
  externalId: string;
  sourceHash: string;
  deliveryStatus: DeliveryStatus;
  provenance: {
    provider: string;
    syncRunId: string;
    sourceTimestamp: Date;
    cursor: string;
  };
}

export interface WebhookContract {
  id: string;
  tenantId: string;
  key: string;
  version: string;
  direction: "inbound" | "outbound";
  signingSecretRef: string;
  rateLimitPerMinute: number;
  status: "active" | "disabled";
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  idempotencyKey: string;
  payloadHash: string;
  deliveryStatus: DeliveryStatus;
  attempts: number;
  observedAt: Date;
  lastError?: string;
}

export interface AutomatedControlTest {
  id: string;
  connectorId: string;
  controlRef: string;
  query: string;
  population: Record<string, unknown>;
  sample: Record<string, unknown>;
  result: {
    status: TestResultStatus;
    summary: string;
    evidenceObjectIds: string[];
  };
  sourceTimestamp: Date;
}

export interface AssuranceAlert {
  id: string;
  tenantId: string;
  sourceType: "control_test" | "connector_health" | "evidence_freshness";
  sourceId: string;
  severity: AlertSeverity;
  ownerId: string;
  slaDueAt: Date;
  status: AlertStatus;
  reason: string;
}

export function registerConnector(input: {
  tenantId: string;
  key: string;
  provider: string;
  kind: ConnectorKind;
  scopes: ConnectorScope[];
  secretRef: string;
  createdAt?: Date;
}): Connector {
  assertLeastPrivilegeScopes(input.scopes);
  assertSecretRef(input.secretRef);
  if (!input.key.trim() || !input.provider.trim()) {
    throw new Error("Connector registration requires key and provider.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    key: input.key,
    provider: input.provider,
    kind: input.kind,
    scopes: input.scopes.map((scope) => ({ ...scope })),
    secretRef: input.secretRef,
    status: "active",
    health: "healthy",
    syncCursor: null,
    createdAt: input.createdAt ?? new Date()
  };
}

export function recordSyncRun(
  connector: Connector,
  input: {
    cursorAfter: string | null;
    status: SyncStatus;
    objectCounts: SyncRun["objectCounts"];
    startedAt?: Date;
    finishedAt?: Date;
    error?: string;
  }
): { connector: Connector; syncRun: SyncRun } {
  if (connector.status !== "active") {
    throw new Error("Only active connectors can run sync.");
  }
  if (input.status === "failed" && !input.error?.trim()) {
    throw new Error("Failed sync runs require an error.");
  }

  const syncRun: SyncRun = {
    id: randomUUID(),
    connectorId: connector.id,
    status: input.status,
    cursorBefore: connector.syncCursor,
    cursorAfter: input.cursorAfter,
    startedAt: input.startedAt ?? new Date(),
    finishedAt: input.finishedAt,
    objectCounts: { ...input.objectCounts },
    error: input.error
  };

  return {
    connector: {
      ...connector,
      syncCursor: input.status === "succeeded" ? input.cursorAfter : connector.syncCursor,
      health: input.status === "failed" ? "degraded" : connector.health
    },
    syncRun
  };
}

export function reconcileConnectorObject(input: {
  connector: Connector;
  syncRun: SyncRun;
  objectType: string;
  externalId: string;
  sourcePayload: Record<string, unknown>;
  deliveryStatus: DeliveryStatus;
  sourceTimestamp: Date;
}): ConnectorObject {
  if (input.syncRun.connectorId !== input.connector.id) {
    throw new Error("Sync run does not belong to connector.");
  }
  if (!input.syncRun.cursorAfter) {
    throw new Error("Connector object provenance requires a sync cursor.");
  }

  return {
    id: randomUUID(),
    connectorId: input.connector.id,
    objectType: input.objectType,
    externalId: input.externalId,
    sourceHash: hashObject(input.sourcePayload),
    deliveryStatus: input.deliveryStatus,
    provenance: {
      provider: input.connector.provider,
      syncRunId: input.syncRun.id,
      sourceTimestamp: input.sourceTimestamp,
      cursor: input.syncRun.cursorAfter
    }
  };
}

export function createWebhookContract(input: {
  tenantId: string;
  key: string;
  version: string;
  direction: WebhookContract["direction"];
  signingSecretRef: string;
  rateLimitPerMinute: number;
}): WebhookContract {
  assertSecretRef(input.signingSecretRef);
  if (!/^v\d+\.\d+\.\d+$/.test(input.version)) {
    throw new Error("Webhook contracts must use a versioned contract identifier such as v1.0.0.");
  }
  if (input.rateLimitPerMinute <= 0) {
    throw new Error("Webhook contracts must be rate-limited.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    key: input.key,
    version: input.version,
    direction: input.direction,
    signingSecretRef: input.signingSecretRef,
    rateLimitPerMinute: input.rateLimitPerMinute,
    status: "active"
  };
}

export function recordWebhookDelivery(
  webhook: WebhookContract,
  input: {
    idempotencyKey: string;
    payload: Record<string, unknown>;
    deliveryStatus: DeliveryStatus;
    attempts: number;
    observedAt?: Date;
    lastError?: string;
  }
): WebhookDelivery {
  if (webhook.status !== "active") {
    throw new Error("Webhook delivery requires an active contract.");
  }
  if (!input.idempotencyKey.trim()) {
    throw new Error("Webhook delivery requires an idempotency key.");
  }
  if (input.attempts <= 0) {
    throw new Error("Webhook delivery attempts must be positive.");
  }
  if ((input.deliveryStatus === "failed" || input.deliveryStatus === "dead_lettered") && !input.lastError?.trim()) {
    throw new Error("Failed webhook deliveries require an error.");
  }

  return {
    id: randomUUID(),
    webhookId: webhook.id,
    idempotencyKey: input.idempotencyKey,
    payloadHash: hashObject(input.payload),
    deliveryStatus: input.deliveryStatus,
    attempts: input.attempts,
    observedAt: input.observedAt ?? new Date(),
    lastError: input.lastError
  };
}

export function recordAutomatedControlTest(input: {
  connector: Connector;
  controlRef: string;
  query: string;
  population: Record<string, unknown>;
  sample: Record<string, unknown>;
  result: AutomatedControlTest["result"];
  sourceTimestamp: Date;
}): AutomatedControlTest {
  if (!input.query.trim()) {
    throw new Error("Automated control tests must preserve the source query.");
  }
  if (!input.result.summary.trim()) {
    throw new Error("Automated control tests require a result summary.");
  }

  return {
    id: randomUUID(),
    connectorId: input.connector.id,
    controlRef: input.controlRef,
    query: input.query,
    population: input.population,
    sample: input.sample,
    result: {
      status: input.result.status,
      summary: input.result.summary,
      evidenceObjectIds: [...input.result.evidenceObjectIds]
    },
    sourceTimestamp: input.sourceTimestamp
  };
}

export function createAssuranceAlert(input: {
  tenantId: string;
  sourceType: AssuranceAlert["sourceType"];
  sourceId: string;
  severity: AlertSeverity;
  ownerId: string;
  slaHours: number;
  reason: string;
  now?: Date;
}): AssuranceAlert {
  if (input.slaHours <= 0) {
    throw new Error("Assurance alerts require a positive SLA.");
  }
  if (!input.ownerId || !input.reason.trim()) {
    throw new Error("Assurance alerts require owner and reason.");
  }

  const now = input.now ?? new Date();
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    severity: input.severity,
    ownerId: input.ownerId,
    slaDueAt: new Date(now.getTime() + input.slaHours * 60 * 60 * 1000),
    status: "triaged",
    reason: input.reason
  };
}

export function detectConnectorDegradation(input: {
  tenantId: string;
  connector: Connector;
  ownerId: string;
  now?: Date;
}): AssuranceAlert | null {
  if (input.connector.health === "healthy") {
    return null;
  }

  return createAssuranceAlert({
    tenantId: input.tenantId,
    sourceType: "connector_health",
    sourceId: input.connector.id,
    severity: input.connector.health === "failing" ? "critical" : "high",
    ownerId: input.ownerId,
    slaHours: input.connector.health === "failing" ? 4 : 24,
    reason: `${input.connector.provider} connector health is ${input.connector.health}.`,
    now: input.now
  });
}

export function detectControlTestFailure(input: {
  tenantId: string;
  test: AutomatedControlTest;
  ownerId: string;
  now?: Date;
}): AssuranceAlert | null {
  if (input.test.result.status !== "fail") {
    return null;
  }

  return createAssuranceAlert({
    tenantId: input.tenantId,
    sourceType: "control_test",
    sourceId: input.test.id,
    severity: "high",
    ownerId: input.ownerId,
    slaHours: 48,
    reason: input.test.result.summary,
    now: input.now
  });
}

function assertLeastPrivilegeScopes(scopes: ConnectorScope[]): void {
  if (scopes.length === 0) {
    throw new Error("Connectors require explicit least-privilege scopes.");
  }

  for (const scope of scopes) {
    if (!scope.name.trim() || !scope.reason.trim()) {
      throw new Error("Connector scopes require name and reason.");
    }
    if (scope.name.includes("*") || scope.name.toLowerCase() === "admin") {
      throw new Error("Connector scopes must not include wildcard or admin access.");
    }
    if (scope.access === "write" && !/ticket|webhook|remediation|notification/i.test(scope.reason)) {
      throw new Error("Write connector scopes require a narrow operational justification.");
    }
  }
}

function assertSecretRef(secretRef: string): void {
  if (!secretRef.startsWith("secret://")) {
    throw new Error("Connector and webhook secrets must be stored by reference.");
  }
}

function hashObject(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right)
    );
    return `{${entries
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
