import type { Pagination } from "../../../shared/pagination.js";
import type {
  AssuranceAlert,
  AutomatedControlTest,
  Connector,
  ConnectorObject,
  SyncRun,
  WebhookContract,
  WebhookDelivery
} from "../domain/integration.js";

export interface ConnectorRecord extends Connector {
  version: number;
  lastSeenAt?: Date;
  classification: string;
  createdBy: string;
  updatedBy: string;
  updatedAt: Date;
}

export interface SyncRunRecord extends SyncRun {
  tenantId: string;
  version: number;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface ConnectorObjectRecord extends ConnectorObject {
  tenantId: string;
  version: number;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface WebhookContractRecord extends WebhookContract {
  versionNumber: number;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface WebhookDeliveryRecord extends WebhookDelivery {
  tenantId: string;
  version: number;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface AutomatedControlTestRecord extends AutomatedControlTest {
  tenantId: string;
  version: number;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface AssuranceAlertRecord extends AssuranceAlert {
  version: number;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface IntegrationPlatformRepository {
  createConnector(input: { connector: Connector; actorId: string }): Promise<ConnectorRecord>;
  listConnectors(input: { tenantId: string; pagination: Pagination }): Promise<ConnectorRecord[]>;
  findConnector(tenantId: string, connectorId: string): Promise<ConnectorRecord | null>;
  createSyncRun(input: {
    tenantId: string;
    connector: Connector;
    syncRun: SyncRun;
    actorId: string;
  }): Promise<{ connector: ConnectorRecord; syncRun: SyncRunRecord }>;
  listSyncRuns(input: { tenantId: string; connectorId: string; pagination: Pagination }): Promise<SyncRunRecord[]>;
  findSyncRun(tenantId: string, syncRunId: string): Promise<SyncRunRecord | null>;
  createConnectorObject(input: {
    tenantId: string;
    object: ConnectorObject;
    actorId: string;
  }): Promise<ConnectorObjectRecord>;
  listConnectorObjects(input: {
    tenantId: string;
    connectorId: string;
    pagination: Pagination;
  }): Promise<ConnectorObjectRecord[]>;
  createWebhookContract(input: {
    webhook: WebhookContract;
    actorId: string;
  }): Promise<WebhookContractRecord>;
  listWebhookContracts(input: { tenantId: string; pagination: Pagination }): Promise<WebhookContractRecord[]>;
  findWebhookContract(tenantId: string, webhookId: string): Promise<WebhookContractRecord | null>;
  createWebhookDelivery(input: {
    tenantId: string;
    delivery: WebhookDelivery;
    actorId: string;
  }): Promise<WebhookDeliveryRecord>;
  listWebhookDeliveries(input: {
    tenantId: string;
    webhookId: string;
    pagination: Pagination;
  }): Promise<WebhookDeliveryRecord[]>;
  createAutomatedControlTest(input: {
    tenantId: string;
    test: AutomatedControlTest;
    actorId: string;
  }): Promise<AutomatedControlTestRecord>;
  listAutomatedControlTests(input: {
    tenantId: string;
    connectorId?: string;
    controlRef?: string;
    pagination: Pagination;
  }): Promise<AutomatedControlTestRecord[]>;
  createAssuranceAlert(input: {
    alert: AssuranceAlert;
    actorId: string;
  }): Promise<AssuranceAlertRecord>;
  listAssuranceAlerts(input: {
    tenantId: string;
    status?: AssuranceAlert["status"];
    pagination: Pagination;
  }): Promise<AssuranceAlertRecord[]>;
}
