import { Inject, Injectable } from "@nestjs/common";
import { TenantScopedDb } from "../../../platform/database/tenant-scoped-db.js";
import type {
  ConsentEvent,
  ConsentPurposeVersion,
  ConsentRecord,
  DataCategory,
  DataDiscoveryFinding,
  DataDiscoveryScan,
  DataInventoryRecord,
  DataSubjectCategory,
  DeletionItem,
  DeletionJob,
  Dpia,
  DpiaAssessment,
  DpiaRisk,
  IncidentAssessment,
  IncidentNotification,
  LawfulBasis,
  LegalHold,
  LegalHoldItem,
  PrivacyIncident,
  PrivacyNotice,
  PrivacyNoticeVersion,
  ProcessingActivity,
  ProcessingInventoryLink,
  ProcessingPurposeAssignment,
  ProcessingRecipientLink,
  Purpose,
  Recipient,
  RetentionAssignment,
  RetentionRule,
  RetentionSchedule,
  RightsRequest,
  RightsRequestTask,
  SystemAsset,
  Transfer
} from "../domain/privacy.js";
import type {
  ConsentEventRow,
  ConsentPurposeVersionRow,
  ConsentRecordRow,
  DataCategoryRow,
  DataDiscoveryFindingRow,
  DataDiscoveryScanRow,
  DataInventoryRecordRow,
  DataSubjectCategoryRow,
  DeletionItemRow,
  DeletionJobRow,
  DpiaAssessmentRow,
  DpiaRiskRow,
  DpiaRow,
  IncidentAssessmentRow,
  IncidentNotificationRow,
  LawfulBasisRow,
  LegalHoldItemRow,
  LegalHoldRow,
  PrivacyIncidentRow,
  PrivacyNoticeRow,
  PrivacyNoticeVersionRow,
  PrivacyOperationsRepository,
  ProcessingActivityRow,
  ProcessingInventoryLinkRow,
  ProcessingPurposeAssignmentRow,
  ProcessingRecipientLinkRow,
  PurposeRow,
  RecipientRow,
  RetentionAssignmentRow,
  RetentionRuleRow,
  RetentionScheduleRow,
  RightsRequestRow,
  RightsRequestTaskRow,
  SystemAssetRow,
  TransferRow
} from "../application/privacy-operations.types.js";

@Injectable()
export class PostgresPrivacyOperationsRepository implements PrivacyOperationsRepository {
  constructor(@Inject(TenantScopedDb) private readonly db: TenantScopedDb) {}

  async createInventory(input: { record: DataInventoryRecord; actorId: string }): Promise<DataInventoryRecordRow> {
    return this.db.withTenant(input.record.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into data_inventory_records (
            id, tenant_id, system_name, data_elements, owner_id, locations, lineage,
            processing_activity_ids, control_ids, vendor_ids, evidence_ids, classification,
            created_by, updated_by
          )
          values ($1, $2, $3, $4::jsonb, $5, $6::text[], $7::jsonb, $8::uuid[], $9::text[],
                  $10::uuid[], $11::uuid[], $12, $13, $13)
          returning ${inventoryColumns()}
        `,
        [
          input.record.id,
          input.record.tenantId,
          input.record.systemName,
          JSON.stringify(input.record.dataElements),
          input.record.ownerId,
          input.record.locations,
          JSON.stringify(input.record.lineage),
          input.record.processingActivityIds,
          input.record.controlIds,
          input.record.vendorIds,
          input.record.evidenceIds,
          input.record.classification,
          input.actorId
        ]
      );
      return mapInventory(result.rows[0]);
    });
  }

  async listInventory(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<DataInventoryRecordRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${inventoryColumns()} from data_inventory_records where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapInventory);
    });
  }

  async findInventory(tenantId: string, recordId: string): Promise<DataInventoryRecordRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${inventoryColumns()} from data_inventory_records where tenant_id = $1 and id = $2`,
        [tenantId, recordId]
      );
      return result.rows[0] ? mapInventory(result.rows[0]) : null;
    });
  }

  async createProcessingActivity(input: {
    activity: ProcessingActivity;
    actorId: string;
  }): Promise<ProcessingActivityRow> {
    return this.db.withTenant(input.activity.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into processing_activities (
            id, tenant_id, purpose, lawful_basis, data_subject_categories, recipients,
            transfers, retention_months, jurisdiction, inventory_record_ids, report_version,
            classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5::text[], $6::text[], $7::text[], $8, $9, $10::uuid[],
                  $11, 'confidential', $12, $12)
          returning ${processingColumns()}
        `,
        [
          input.activity.id,
          input.activity.tenantId,
          input.activity.purpose,
          input.activity.lawfulBasis,
          input.activity.dataSubjectCategories,
          input.activity.recipients,
          input.activity.transfers,
          input.activity.retentionMonths,
          input.activity.jurisdiction,
          input.activity.inventoryRecordIds,
          input.activity.version,
          input.actorId
        ]
      );
      return mapProcessing(result.rows[0]);
    });
  }

  async listProcessingActivities(input: {
    tenantId: string;
    pagination: { limit: number; offset: number };
  }): Promise<ProcessingActivityRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${processingColumns()} from processing_activities where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapProcessing);
    });
  }

  async findProcessingActivity(tenantId: string, activityId: string): Promise<ProcessingActivityRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${processingColumns()} from processing_activities where tenant_id = $1 and id = $2`,
        [tenantId, activityId]
      );
      return result.rows[0] ? mapProcessing(result.rows[0]) : null;
    });
  }

  async createDpia(input: { dpia: DpiaAssessment; actorId: string }): Promise<DpiaAssessmentRow> {
    return this.db.withTenant(input.dpia.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into dpia_assessments (
            id, tenant_id, processing_activity_id, risk_level, residual_risk_score,
            approvals, findings, review_obligation_ids, classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6::jsonb, $7::text[], $8::text[], 'confidential', $9, $9)
          returning ${dpiaColumns()}
        `,
        [
          input.dpia.id,
          input.dpia.tenantId,
          input.dpia.processingActivityId,
          input.dpia.riskLevel,
          input.dpia.residualRiskScore,
          JSON.stringify(input.dpia.approvals),
          input.dpia.findings,
          input.dpia.reviewObligationIds,
          input.actorId
        ]
      );
      return mapDpia(result.rows[0]);
    });
  }

  async listDpias(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<DpiaAssessmentRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${dpiaColumns()} from dpia_assessments where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapDpia);
    });
  }

  async findDpia(tenantId: string, dpiaId: string): Promise<DpiaAssessmentRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${dpiaColumns()} from dpia_assessments where tenant_id = $1 and id = $2`,
        [tenantId, dpiaId]
      );
      return result.rows[0] ? mapDpia(result.rows[0]) : null;
    });
  }

  async createRightsRequest(input: { request: RightsRequest; actorId: string }): Promise<RightsRequestRow> {
    return this.db.withTenant(input.request.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into privacy_rights_requests (
            id, tenant_id, subject_id, request_type, status, identity_verified, opened_at,
            deadline_at, search_tasks, exceptions, communications, completion_evidence_ids,
            classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb,
                  $12::uuid[], 'confidential', $13, $13)
          returning ${rightsColumns()}
        `,
        rightsValues(input.request, input.actorId)
      );
      return mapRights(result.rows[0]);
    });
  }

  async updateRightsRequest(input: { request: RightsRequest; actorId: string }): Promise<RightsRequestRow> {
    return this.db.withTenant(input.request.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          update privacy_rights_requests
          set status = $3,
              identity_verified = $4,
              search_tasks = $5::jsonb,
              exceptions = $6::jsonb,
              communications = $7::jsonb,
              completion_evidence_ids = $8::uuid[],
              updated_by = $9,
              updated_at = now(),
              version = version + 1
          where tenant_id = $1 and id = $2
          returning ${rightsColumns()}
        `,
        [
          input.request.tenantId,
          input.request.id,
          input.request.status,
          input.request.identityVerified,
          JSON.stringify(input.request.searchTasks),
          JSON.stringify(input.request.exceptions),
          JSON.stringify(input.request.communications),
          input.request.completionEvidenceIds,
          input.actorId
        ]
      );
      return mapRights(result.rows[0]);
    });
  }

  async listRightsRequests(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<RightsRequestRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${rightsColumns()} from privacy_rights_requests where tenant_id = $1 order by opened_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapRights);
    });
  }

  async findRightsRequest(tenantId: string, requestId: string): Promise<RightsRequestRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${rightsColumns()} from privacy_rights_requests where tenant_id = $1 and id = $2`,
        [tenantId, requestId]
      );
      return result.rows[0] ? mapRights(result.rows[0]) : null;
    });
  }

  async createConsent(input: { consent: ConsentRecord; actorId: string }): Promise<ConsentRecordRow> {
    return this.db.withTenant(input.consent.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into consent_records (
            id, tenant_id, subject_id, purpose, notice_version, region, status,
            history, classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, 'confidential', $9, $9)
          returning ${consentColumns()}
        `,
        [
          input.consent.id,
          input.consent.tenantId,
          input.consent.subjectId,
          input.consent.purpose,
          input.consent.version,
          input.consent.region,
          input.consent.status,
          JSON.stringify(input.consent.history),
          input.actorId
        ]
      );
      return mapConsent(result.rows[0]);
    });
  }

  async updateConsent(input: { consent: ConsentRecord; actorId: string }): Promise<ConsentRecordRow> {
    return this.db.withTenant(input.consent.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          update consent_records
          set status = $3,
              history = $4::jsonb,
              updated_by = $5,
              updated_at = now(),
              version = version + 1
          where tenant_id = $1 and id = $2
          returning ${consentColumns()}
        `,
        [input.consent.tenantId, input.consent.id, input.consent.status, JSON.stringify(input.consent.history), input.actorId]
      );
      return mapConsent(result.rows[0]);
    });
  }

  async listConsents(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<ConsentRecordRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${consentColumns()} from consent_records where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapConsent);
    });
  }

  async findConsent(tenantId: string, consentId: string): Promise<ConsentRecordRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${consentColumns()} from consent_records where tenant_id = $1 and id = $2`,
        [tenantId, consentId]
      );
      return result.rows[0] ? mapConsent(result.rows[0]) : null;
    });
  }

  async createIncident(input: { incident: PrivacyIncident; actorId: string }): Promise<PrivacyIncidentRow> {
    return this.db.withTenant(input.incident.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into privacy_incidents (
            id, tenant_id, severity, impacted_processing_activity_ids, evidence_ids, report_ids,
            discovered_at, regulator_notification_due_at, data_subject_notification_due_at,
            timeline, actions, classification, created_by, updated_by
          )
          values ($1, $2, $3, $4::uuid[], $5::uuid[], $6::uuid[], $7, $8, $9,
                  $10::jsonb, $11::jsonb, 'confidential', $12, $12)
          returning ${incidentColumns()}
        `,
        [
          input.incident.id,
          input.incident.tenantId,
          input.incident.severity,
          input.incident.impactedProcessingActivityIds,
          input.incident.evidenceIds,
          input.incident.reportIds,
          input.incident.discoveredAt,
          input.incident.regulatorNotificationDueAt,
          input.incident.dataSubjectNotificationDueAt,
          JSON.stringify(input.incident.timeline),
          JSON.stringify(input.incident.actions),
          input.actorId
        ]
      );
      return mapIncident(result.rows[0]);
    });
  }

  async listIncidents(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<PrivacyIncidentRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${incidentColumns()} from privacy_incidents where tenant_id = $1 order by discovered_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapIncident);
    });
  }

  async findIncident(tenantId: string, incidentId: string): Promise<PrivacyIncidentRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${incidentColumns()} from privacy_incidents where tenant_id = $1 and id = $2`,
        [tenantId, incidentId]
      );
      return result.rows[0] ? mapIncident(result.rows[0]) : null;
    });
  }

  async createRetentionSchedule(input: {
    schedule: RetentionSchedule;
    actorId: string;
  }): Promise<RetentionScheduleRow> {
    return this.db.withTenant(input.schedule.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into retention_schedules (
            id, tenant_id, data_category, jurisdiction, residency, transfer_mechanism,
            retention_months, legal_hold, disposal_evidence_ids, classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9::uuid[], 'confidential', $10, $10)
          returning ${retentionColumns()}
        `,
        [
          input.schedule.id,
          input.schedule.tenantId,
          input.schedule.dataCategory,
          input.schedule.jurisdiction,
          input.schedule.residency,
          input.schedule.transferMechanism,
          input.schedule.retentionMonths,
          input.schedule.legalHold,
          input.schedule.disposalEvidenceIds,
          input.actorId
        ]
      );
      return mapRetention(result.rows[0]);
    });
  }

  async listRetentionSchedules(input: {
    tenantId: string;
    pagination: { limit: number; offset: number };
  }): Promise<RetentionScheduleRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${retentionColumns()} from retention_schedules where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapRetention);
    });
  }

  async findRetentionSchedule(tenantId: string, scheduleId: string): Promise<RetentionScheduleRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${retentionColumns()} from retention_schedules where tenant_id = $1 and id = $2`,
        [tenantId, scheduleId]
      );
      return result.rows[0] ? mapRetention(result.rows[0]) : null;
    });
  }

  async createSystemAsset(input: { asset: SystemAsset; actorId: string }): Promise<SystemAssetRow> {
    return this.db.withTenant(input.asset.tenantId, input.actorId, async (client) => {
      const a = input.asset;
      const result = await client.query(
        `
          insert into systems_assets (id, tenant_id, workspace_id, name, asset_type, owner_id, region, criticality, created_by, updated_by)
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
          returning ${systemAssetColumns()}
        `,
        [a.id, a.tenantId, a.workspaceId ?? null, a.name, a.assetType, a.ownerId, a.region ?? null, a.criticality ?? null, input.actorId]
      );
      return mapSystemAsset(result.rows[0]);
    });
  }

  async listSystemAssets(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<SystemAssetRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${systemAssetColumns()} from systems_assets where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapSystemAsset);
    });
  }

  async createDataCategory(input: { category: DataCategory; actorId: string }): Promise<DataCategoryRow> {
    return this.db.withTenant(input.category.tenantId, input.actorId, async (client) => {
      const c = input.category;
      const result = await client.query(
        `
          insert into data_categories (id, tenant_id, category_key, name, sensitivity, created_by, updated_by)
          values ($1, $2, $3, $4, $5, $6, $6)
          returning ${dataCategoryColumns()}
        `,
        [c.id, c.tenantId, c.categoryKey, c.name, c.sensitivity, input.actorId]
      );
      return mapDataCategory(result.rows[0]);
    });
  }

  async listDataCategories(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<DataCategoryRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${dataCategoryColumns()} from data_categories where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapDataCategory);
    });
  }

  async createDataSubjectCategory(input: {
    category: DataSubjectCategory;
    actorId: string;
  }): Promise<DataSubjectCategoryRow> {
    return this.db.withTenant(input.category.tenantId, input.actorId, async (client) => {
      const c = input.category;
      const result = await client.query(
        `
          insert into data_subject_categories (id, tenant_id, subject_key, name, created_by, updated_by)
          values ($1, $2, $3, $4, $5, $5)
          returning ${dataSubjectCategoryColumns()}
        `,
        [c.id, c.tenantId, c.subjectKey, c.name, input.actorId]
      );
      return mapDataSubjectCategory(result.rows[0]);
    });
  }

  async listDataSubjectCategories(input: {
    tenantId: string;
    pagination: { limit: number; offset: number };
  }): Promise<DataSubjectCategoryRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${dataSubjectCategoryColumns()} from data_subject_categories where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapDataSubjectCategory);
    });
  }

  async createDataDiscoveryScan(input: { scan: DataDiscoveryScan; actorId: string }): Promise<DataDiscoveryScanRow> {
    return this.db.withTenant(input.scan.tenantId, input.actorId, async (client) => {
      const s = input.scan;
      const result = await client.query(
        `
          insert into data_discovery_scans (
            id, tenant_id, system_id, connector_id, started_at, finished_at, status,
            classifier_version, idempotency_key, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
          returning ${dataDiscoveryScanColumns()}
        `,
        [s.id, s.tenantId, s.systemId, s.connectorId, s.startedAt, s.finishedAt ?? null, s.status, s.classifierVersion, s.idempotencyKey, input.actorId]
      );
      return mapDataDiscoveryScan(result.rows[0]);
    });
  }

  async listDataDiscoveryScans(input: {
    tenantId: string;
    systemId: string;
    pagination: { limit: number; offset: number };
  }): Promise<DataDiscoveryScanRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${dataDiscoveryScanColumns()} from data_discovery_scans where tenant_id = $1 and system_id = $2 order by started_at desc limit $3 offset $4`,
        [input.tenantId, input.systemId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapDataDiscoveryScan);
    });
  }

  async createDataDiscoveryFinding(input: {
    finding: DataDiscoveryFinding;
    actorId: string;
  }): Promise<DataDiscoveryFindingRow> {
    return this.db.withTenant(input.finding.tenantId, input.actorId, async (client) => {
      const f = input.finding;
      const result = await client.query(
        `
          insert into data_discovery_findings (
            id, tenant_id, scan_id, locator_hash, data_category_id, confidence, sample_prohibited,
            review_status, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
          returning ${dataDiscoveryFindingColumns()}
        `,
        [f.id, f.tenantId, f.scanId, f.locatorHash, f.dataCategoryId, f.confidence, f.samplesProhibited, f.reviewStatus, input.actorId]
      );
      return mapDataDiscoveryFinding(result.rows[0]);
    });
  }

  async listDataDiscoveryFindings(input: {
    tenantId: string;
    scanId: string;
    pagination: { limit: number; offset: number };
  }): Promise<DataDiscoveryFindingRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${dataDiscoveryFindingColumns()} from data_discovery_findings where tenant_id = $1 and scan_id = $2 order by created_at desc limit $3 offset $4`,
        [input.tenantId, input.scanId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapDataDiscoveryFinding);
    });
  }

  async createPrivacyNotice(input: { notice: PrivacyNotice; actorId: string }): Promise<PrivacyNoticeRow> {
    return this.db.withTenant(input.notice.tenantId, input.actorId, async (client) => {
      const n = input.notice;
      const result = await client.query(
        `
          insert into privacy_notices (id, tenant_id, notice_key, audience, owner_id, status, created_by, updated_by)
          values ($1, $2, $3, $4, $5, $6, $7, $7)
          returning ${privacyNoticeColumns()}
        `,
        [n.id, n.tenantId, n.noticeKey, n.audience, n.ownerId, n.status, input.actorId]
      );
      return mapPrivacyNotice(result.rows[0]);
    });
  }

  async listPrivacyNotices(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<PrivacyNoticeRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${privacyNoticeColumns()} from privacy_notices where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapPrivacyNotice);
    });
  }

  async findPrivacyNotice(tenantId: string, noticeId: string): Promise<PrivacyNoticeRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${privacyNoticeColumns()} from privacy_notices where tenant_id = $1 and id = $2`,
        [tenantId, noticeId]
      );
      return result.rows[0] ? mapPrivacyNotice(result.rows[0]) : null;
    });
  }

  async createPrivacyNoticeVersion(input: {
    version: PrivacyNoticeVersion;
    actorId: string;
  }): Promise<PrivacyNoticeVersionRow> {
    return this.db.withTenant(input.version.tenantId, input.actorId, async (client) => {
      const v = input.version;
      const result = await client.query(
        `
          insert into privacy_notice_versions (
            id, tenant_id, privacy_notice_id, notice_version_no, content_uri, sha256, jurisdictions,
            effective_from, effective_to, approved_by
          )
          values ($1, $2, $3, $4, $5, $6, $7::text[], $8, $9, $10)
          returning ${privacyNoticeVersionColumns()}
        `,
        [v.id, v.tenantId, v.privacyNoticeId, v.noticeVersionNo, v.contentUri, v.sha256, v.jurisdictions, v.effectiveFrom, v.effectiveTo ?? null, v.approvedBy]
      );
      return mapPrivacyNoticeVersion(result.rows[0]);
    });
  }

  async listPrivacyNoticeVersions(input: {
    tenantId: string;
    privacyNoticeId: string;
    pagination: { limit: number; offset: number };
  }): Promise<PrivacyNoticeVersionRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${privacyNoticeVersionColumns()} from privacy_notice_versions where tenant_id = $1 and privacy_notice_id = $2 order by notice_version_no desc limit $3 offset $4`,
        [input.tenantId, input.privacyNoticeId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapPrivacyNoticeVersion);
    });
  }

  async findPrivacyNoticeVersion(tenantId: string, versionId: string): Promise<PrivacyNoticeVersionRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${privacyNoticeVersionColumns()} from privacy_notice_versions where tenant_id = $1 and id = $2`,
        [tenantId, versionId]
      );
      return result.rows[0] ? mapPrivacyNoticeVersion(result.rows[0]) : null;
    });
  }

  async createProcessingInventoryLink(input: {
    link: ProcessingInventoryLink;
    actorId: string;
  }): Promise<ProcessingInventoryLinkRow> {
    return this.db.withTenant(input.link.tenantId, input.actorId, async (client) => {
      const l = input.link;
      const result = await client.query(
        `
          insert into processing_inventory_links (id, tenant_id, processing_activity_id, inventory_record_id, role, created_by, updated_by)
          values ($1, $2, $3, $4, $5, $6, $6)
          returning ${processingInventoryLinkColumns()}
        `,
        [l.id, l.tenantId, l.processingActivityId, l.inventoryRecordId, l.role, input.actorId]
      );
      return mapProcessingInventoryLink(result.rows[0]);
    });
  }

  async listProcessingInventoryLinks(input: {
    tenantId: string;
    processingActivityId: string;
    pagination: { limit: number; offset: number };
  }): Promise<ProcessingInventoryLinkRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${processingInventoryLinkColumns()} from processing_inventory_links where tenant_id = $1 and processing_activity_id = $2 order by created_at desc limit $3 offset $4`,
        [input.tenantId, input.processingActivityId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapProcessingInventoryLink);
    });
  }

  async createPurpose(input: { purpose: Purpose; actorId: string }): Promise<PurposeRow> {
    return this.db.withTenant(input.purpose.tenantId, input.actorId, async (client) => {
      const p = input.purpose;
      const result = await client.query(
        `
          insert into purposes (id, tenant_id, purpose_key, name, description, created_by, updated_by)
          values ($1, $2, $3, $4, $5, $6, $6)
          returning ${purposeColumns()}
        `,
        [p.id, p.tenantId, p.purposeKey, p.name, p.description ?? null, input.actorId]
      );
      return mapPurpose(result.rows[0]);
    });
  }

  async listPurposes(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<PurposeRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${purposeColumns()} from purposes where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapPurpose);
    });
  }

  async createLawfulBasis(input: { basis: LawfulBasis; actorId: string }): Promise<LawfulBasisRow> {
    return this.db.withTenant(input.basis.tenantId, input.actorId, async (client) => {
      const b = input.basis;
      const result = await client.query(
        `
          insert into lawful_bases (id, tenant_id, jurisdiction, basis_key, name, citation, created_by, updated_by)
          values ($1, $2, $3, $4, $5, $6, $7, $7)
          returning ${lawfulBasisColumns()}
        `,
        [b.id, b.tenantId, b.jurisdiction, b.basisKey, b.name, b.citation ?? null, input.actorId]
      );
      return mapLawfulBasis(result.rows[0]);
    });
  }

  async listLawfulBases(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<LawfulBasisRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${lawfulBasisColumns()} from lawful_bases where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapLawfulBasis);
    });
  }

  async createProcessingPurposeAssignment(input: {
    assignment: ProcessingPurposeAssignment;
    actorId: string;
  }): Promise<ProcessingPurposeAssignmentRow> {
    return this.db.withTenant(input.assignment.tenantId, input.actorId, async (client) => {
      const a = input.assignment;
      const result = await client.query(
        `
          insert into processing_purposes (
            id, tenant_id, processing_activity_id, purpose_id, lawful_basis_id, effective_from,
            effective_to, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $8)
          returning ${processingPurposeColumns()}
        `,
        [a.id, a.tenantId, a.processingActivityId, a.purposeId, a.lawfulBasisId, a.effectiveFrom, a.effectiveTo ?? null, input.actorId]
      );
      return mapProcessingPurposeAssignment(result.rows[0]);
    });
  }

  async listProcessingPurposeAssignments(input: {
    tenantId: string;
    processingActivityId: string;
    pagination: { limit: number; offset: number };
  }): Promise<ProcessingPurposeAssignmentRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${processingPurposeColumns()} from processing_purposes where tenant_id = $1 and processing_activity_id = $2 order by effective_from desc limit $3 offset $4`,
        [input.tenantId, input.processingActivityId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapProcessingPurposeAssignment);
    });
  }

  async createRecipient(input: { recipient: Recipient; actorId: string }): Promise<RecipientRow> {
    return this.db.withTenant(input.recipient.tenantId, input.actorId, async (client) => {
      const r = input.recipient;
      const result = await client.query(
        `
          insert into recipients (id, tenant_id, name, recipient_type, country, vendor_id, created_by, updated_by)
          values ($1, $2, $3, $4, $5, $6, $7, $7)
          returning ${recipientColumns()}
        `,
        [r.id, r.tenantId, r.name, r.recipientType, r.country, r.vendorId ?? null, input.actorId]
      );
      return mapRecipient(result.rows[0]);
    });
  }

  async listRecipients(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<RecipientRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${recipientColumns()} from recipients where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapRecipient);
    });
  }

  async createProcessingRecipientLink(input: {
    link: ProcessingRecipientLink;
    actorId: string;
  }): Promise<ProcessingRecipientLinkRow> {
    return this.db.withTenant(input.link.tenantId, input.actorId, async (client) => {
      const l = input.link;
      const result = await client.query(
        `
          insert into processing_recipients (
            id, tenant_id, processing_activity_id, recipient_id, purpose_id, data_categories, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6::uuid[], $7, $7)
          returning ${processingRecipientColumns()}
        `,
        [l.id, l.tenantId, l.processingActivityId, l.recipientId, l.purposeId, l.dataCategoryIds, input.actorId]
      );
      return mapProcessingRecipientLink(result.rows[0]);
    });
  }

  async listProcessingRecipientLinks(input: {
    tenantId: string;
    processingActivityId: string;
    pagination: { limit: number; offset: number };
  }): Promise<ProcessingRecipientLinkRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${processingRecipientColumns()} from processing_recipients where tenant_id = $1 and processing_activity_id = $2 order by created_at desc limit $3 offset $4`,
        [input.tenantId, input.processingActivityId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapProcessingRecipientLink);
    });
  }

  async createTransfer(input: { transfer: Transfer; actorId: string }): Promise<TransferRow> {
    return this.db.withTenant(input.transfer.tenantId, input.actorId, async (client) => {
      const t = input.transfer;
      const result = await client.query(
        `
          insert into transfers (
            id, tenant_id, processing_activity_id, from_country, to_country, mechanism, safeguards, status, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
          returning ${transferColumns()}
        `,
        [t.id, t.tenantId, t.processingActivityId, t.fromCountry, t.toCountry, t.mechanism, t.safeguards ?? null, t.status, input.actorId]
      );
      return mapTransfer(result.rows[0]);
    });
  }

  async listTransfers(input: {
    tenantId: string;
    processingActivityId: string;
    pagination: { limit: number; offset: number };
  }): Promise<TransferRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${transferColumns()} from transfers where tenant_id = $1 and processing_activity_id = $2 order by created_at desc limit $3 offset $4`,
        [input.tenantId, input.processingActivityId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapTransfer);
    });
  }

  async createDpiaV2(input: { dpia: Dpia; actorId: string }): Promise<DpiaRow> {
    return this.db.withTenant(input.dpia.tenantId, input.actorId, async (client) => {
      const d = input.dpia;
      const result = await client.query(
        `
          insert into dpias (
            id, tenant_id, processing_activity_id, trigger_reason, status, owner_id, approved_by, approved_at, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
          returning ${dpiaV2Columns()}
        `,
        [d.id, d.tenantId, d.processingActivityId, d.triggerReason, d.status, d.ownerId, d.approvedBy ?? null, d.approvedAt ?? null, input.actorId]
      );
      return mapDpiaV2(result.rows[0]);
    });
  }

  async listDpiasV2(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<DpiaRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${dpiaV2Columns()} from dpias where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapDpiaV2);
    });
  }

  async createDpiaRisk(input: { risk: DpiaRisk; actorId: string }): Promise<DpiaRiskRow> {
    return this.db.withTenant(input.risk.tenantId, input.actorId, async (client) => {
      const r = input.risk;
      const result = await client.query(
        `
          insert into dpia_risks (
            id, tenant_id, dpia_id, description, likelihood, impact, treatment, residual_score, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
          returning ${dpiaRiskColumns()}
        `,
        [r.id, r.tenantId, r.dpiaId, r.description, r.likelihood, r.impact, r.treatment ?? null, r.residualScore, input.actorId]
      );
      return mapDpiaRisk(result.rows[0]);
    });
  }

  async listDpiaRisks(input: { tenantId: string; dpiaId: string; pagination: { limit: number; offset: number } }): Promise<DpiaRiskRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${dpiaRiskColumns()} from dpia_risks where tenant_id = $1 and dpia_id = $2 order by created_at desc limit $3 offset $4`,
        [input.tenantId, input.dpiaId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapDpiaRisk);
    });
  }

  async createRightsRequestTask(input: {
    task: RightsRequestTask;
    actorId: string;
  }): Promise<RightsRequestTaskRow> {
    return this.db.withTenant(input.task.tenantId, input.actorId, async (client) => {
      const t = input.task;
      const result = await client.query(
        `
          insert into universal_tasks (
            id, tenant_id, target_type, target_id, title, description, priority, status, owner_id, created_by, updated_by
          )
          values ($1, $2, 'rights_request_task', $3, $4, $5, 'medium', $6, $7, $8, $8)
          returning id, tenant_id, target_type, target_id, title, description, priority, status, owner_id, created_by, created_at, updated_by, updated_at
        `,
        [t.id, t.tenantId, t.rightsRequestId, t.taskType, t.systemId, t.status, t.ownerId, input.actorId]
      );
      const row = result.rows[0];
      return {
        id: row.id as string,
        tenantId: row.tenant_id as string,
        versionNumber: 1,
        rightsRequestId: row.target_id as string,
        systemId: row.description as string,
        ownerId: row.owner_id as string,
        taskType: row.title as "search" | "decision" | "fulfillment",
        status: row.status as "pending" | "in_progress" | "completed" | "blocked",
        resultRef: undefined,
        classification: 'restricted',
        createdBy: row.created_by as string,
        createdAt: row.created_at as Date,
        updatedBy: row.updated_by as string,
        updatedAt: row.updated_at as Date
      };
    });
  }

  async listRightsRequestTasks(input: {
    tenantId: string;
    rightsRequestId: string;
    pagination: { limit: number; offset: number };
  }): Promise<RightsRequestTaskRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select * from universal_tasks where tenant_id = $1 and target_type = 'rights_request_task' and target_id = $2 order by created_at desc limit $3 offset $4`,
        [input.tenantId, input.rightsRequestId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(row => ({
        id: row.id as string,
        tenantId: row.tenant_id as string,
        versionNumber: 1,
        rightsRequestId: row.target_id as string,
        systemId: row.description as string,
        ownerId: row.owner_id as string,
        taskType: row.title as "search" | "decision" | "fulfillment",
        status: row.status as "pending" | "in_progress" | "completed" | "blocked",
        resultRef: undefined,
        classification: 'restricted',
        createdBy: row.created_by as string,
        createdAt: row.created_at as Date,
        updatedBy: row.updated_by as string,
        updatedAt: row.updated_at as Date
      }));
    });
  }

  async createConsentPurposeVersion(input: {
    version: ConsentPurposeVersion;
    actorId: string;
  }): Promise<ConsentPurposeVersionRow> {
    return this.db.withTenant(input.version.tenantId, input.actorId, async (client) => {
      const v = input.version;
      const result = await client.query(
        `
          insert into consent_purposes (
            id, tenant_id, purpose_id, notice_version_id, channel, region, active_from, active_to, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
          returning ${consentPurposeColumns()}
        `,
        [v.id, v.tenantId, v.purposeId, v.noticeVersionId, v.channel, v.region, v.activeFrom, v.activeTo ?? null, input.actorId]
      );
      return mapConsentPurposeVersion(result.rows[0]);
    });
  }

  async listConsentPurposeVersions(input: {
    tenantId: string;
    pagination: { limit: number; offset: number };
  }): Promise<ConsentPurposeVersionRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${consentPurposeColumns()} from consent_purposes where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapConsentPurposeVersion);
    });
  }

  async createConsentEvent(input: { event: ConsentEvent; actorId: string }): Promise<ConsentEventRow> {
    return this.db.withTenant(input.event.tenantId, input.actorId, async (client) => {
      const e = input.event;
      const result = await client.query(
        `
          insert into consent_events (
            id, tenant_id, subject_token, consent_purpose_id, event_type, occurred_at, source,
            proof_hash, idempotency_key, recorded_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          returning ${consentEventColumns()}
        `,
        [e.id, e.tenantId, e.subjectToken, e.consentPurposeId, e.eventType, e.occurredAt, e.source, e.proofHash, e.idempotencyKey, e.recordedBy]
      );
      return mapConsentEvent(result.rows[0]);
    });
  }

  async listConsentEvents(input: {
    tenantId: string;
    subjectToken: string;
    pagination: { limit: number; offset: number };
  }): Promise<ConsentEventRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${consentEventColumns()} from consent_events where tenant_id = $1 and subject_token = $2 order by occurred_at desc limit $3 offset $4`,
        [input.tenantId, input.subjectToken, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapConsentEvent);
    });
  }

  async createIncidentAssessment(input: {
    assessment: IncidentAssessment;
    actorId: string;
  }): Promise<IncidentAssessmentRow> {
    return this.db.withTenant(input.assessment.tenantId, input.actorId, async (client) => {
      const a = input.assessment;
      const result = await client.query(
        `
          insert into incident_assessments (
            id, tenant_id, incident_id, jurisdiction, reportable, rationale, assessor_id, decided_at,
            assessment_version_no, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
          returning ${incidentAssessmentColumns()}
        `,
        [a.id, a.tenantId, a.incidentId, a.jurisdiction, a.reportable, a.rationale, a.assessorId, a.decidedAt, a.assessmentVersionNo, input.actorId]
      );
      return mapIncidentAssessment(result.rows[0]);
    });
  }

  async listIncidentAssessments(input: {
    tenantId: string;
    incidentId: string;
    pagination: { limit: number; offset: number };
  }): Promise<IncidentAssessmentRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${incidentAssessmentColumns()} from incident_assessments where tenant_id = $1 and incident_id = $2 order by decided_at desc limit $3 offset $4`,
        [input.tenantId, input.incidentId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapIncidentAssessment);
    });
  }

  async createIncidentNotification(input: {
    notification: IncidentNotification;
    actorId: string;
  }): Promise<IncidentNotificationRow> {
    return this.db.withTenant(input.notification.tenantId, input.actorId, async (client) => {
      const n = input.notification;
      const result = await client.query(
        `
          insert into incident_notifications (
            id, tenant_id, incident_id, recipient_type, jurisdiction, due_at, sent_at, artifact_id, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
          returning ${incidentNotificationColumns()}
        `,
        [n.id, n.tenantId, n.incidentId, n.recipientType, n.jurisdiction, n.dueAt, n.sentAt ?? null, n.artifactId ?? null, input.actorId]
      );
      return mapIncidentNotification(result.rows[0]);
    });
  }

  async listIncidentNotifications(input: {
    tenantId: string;
    incidentId: string;
    pagination: { limit: number; offset: number };
  }): Promise<IncidentNotificationRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${incidentNotificationColumns()} from incident_notifications where tenant_id = $1 and incident_id = $2 order by due_at asc limit $3 offset $4`,
        [input.tenantId, input.incidentId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapIncidentNotification);
    });
  }

  async createRetentionRule(input: { rule: RetentionRule; actorId: string }): Promise<RetentionRuleRow> {
    return this.db.withTenant(input.rule.tenantId, input.actorId, async (client) => {
      const r = input.rule;
      const result = await client.query(
        `
          insert into retention_rules (
            id, tenant_id, data_category_id, jurisdiction, retention_trigger, duration_days, disposition, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $8)
          returning ${retentionRuleColumns()}
        `,
        [r.id, r.tenantId, r.dataCategoryId, r.jurisdiction, r.retentionTrigger, r.durationDays, r.disposition, input.actorId]
      );
      return mapRetentionRule(result.rows[0]);
    });
  }

  async listRetentionRules(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<RetentionRuleRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${retentionRuleColumns()} from retention_rules where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapRetentionRule);
    });
  }

  async createRetentionAssignment(input: {
    assignment: RetentionAssignment;
    actorId: string;
  }): Promise<RetentionAssignmentRow> {
    return this.db.withTenant(input.assignment.tenantId, input.actorId, async (client) => {
      const a = input.assignment;
      const result = await client.query(
        `
          insert into retention_assignments (
            id, tenant_id, retention_rule_id, target_type, target_id, effective_from, effective_to, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $8)
          returning ${retentionAssignmentColumns()}
        `,
        [a.id, a.tenantId, a.retentionRuleId, a.targetType, a.targetId, a.effectiveFrom, a.effectiveTo ?? null, input.actorId]
      );
      return mapRetentionAssignment(result.rows[0]);
    });
  }

  async listRetentionAssignments(input: {
    tenantId: string;
    targetType: string;
    targetId: string;
    pagination: { limit: number; offset: number };
  }): Promise<RetentionAssignmentRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${retentionAssignmentColumns()} from retention_assignments where tenant_id = $1 and target_type = $2 and target_id = $3 order by effective_from desc limit $4 offset $5`,
        [input.tenantId, input.targetType, input.targetId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapRetentionAssignment);
    });
  }

  async createLegalHold(input: { hold: LegalHold; actorId: string }): Promise<LegalHoldRow> {
    return this.db.withTenant(input.hold.tenantId, input.actorId, async (client) => {
      const h = input.hold;
      const result = await client.query(
        `
          insert into legal_holds (id, tenant_id, hold_key, reason, issued_by, issued_at, scope_json, created_by, updated_by)
          values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $8)
          returning ${legalHoldColumns()}
        `,
        [h.id, h.tenantId, h.holdKey, h.reason, h.issuedBy, h.issuedAt, JSON.stringify(h.scopeJson), input.actorId]
      );
      return mapLegalHold(result.rows[0]);
    });
  }

  async updateLegalHold(input: { hold: LegalHold; actorId: string }): Promise<LegalHoldRow> {
    return this.db.withTenant(input.hold.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          update legal_holds
          set released_at = $3, updated_by = $4, updated_at = now(), version = version + 1
          where tenant_id = $1 and id = $2
          returning ${legalHoldColumns()}
        `,
        [input.hold.tenantId, input.hold.id, input.hold.releasedAt ?? null, input.actorId]
      );
      if (!result.rows[0]) {
        throw new Error("Legal hold was not found.");
      }
      return mapLegalHold(result.rows[0]);
    });
  }

  async listLegalHolds(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<LegalHoldRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${legalHoldColumns()} from legal_holds where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapLegalHold);
    });
  }

  async findLegalHold(tenantId: string, legalHoldId: string): Promise<LegalHoldRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${legalHoldColumns()} from legal_holds where tenant_id = $1 and id = $2`,
        [tenantId, legalHoldId]
      );
      return result.rows[0] ? mapLegalHold(result.rows[0]) : null;
    });
  }

  async createLegalHoldItem(input: { item: LegalHoldItem; actorId: string }): Promise<LegalHoldItemRow> {
    return this.db.withTenant(input.item.tenantId, input.actorId, async (client) => {
      const i = input.item;
      const result = await client.query(
        `
          insert into legal_hold_items (id, tenant_id, legal_hold_id, target_type, target_id, created_by, updated_by)
          values ($1, $2, $3, $4, $5, $6, $6)
          returning ${legalHoldItemColumns()}
        `,
        [i.id, i.tenantId, i.legalHoldId, i.targetType, i.targetId, input.actorId]
      );
      return mapLegalHoldItem(result.rows[0]);
    });
  }

  async listLegalHoldItems(input: {
    tenantId: string;
    legalHoldId: string;
    pagination: { limit: number; offset: number };
  }): Promise<LegalHoldItemRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${legalHoldItemColumns()} from legal_hold_items where tenant_id = $1 and legal_hold_id = $2 order by created_at desc limit $3 offset $4`,
        [input.tenantId, input.legalHoldId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapLegalHoldItem);
    });
  }

  async findActiveLegalHoldForTarget(tenantId: string, targetType: string, targetId: string): Promise<LegalHoldItemRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${legalHoldItemColumns("i")}
          from legal_hold_items i
          join legal_holds h on h.id = i.legal_hold_id and h.tenant_id = i.tenant_id
          where i.tenant_id = $1 and i.target_type = $2 and i.target_id = $3 and h.released_at is null
          limit 1
        `,
        [tenantId, targetType, targetId]
      );
      return result.rows[0] ? mapLegalHoldItem(result.rows[0]) : null;
    });
  }

  async createDeletionJob(input: { job: DeletionJob; actorId: string }): Promise<DeletionJobRow> {
    return this.db.withTenant(input.job.tenantId, input.actorId, async (client) => {
      const j = input.job;
      const result = await client.query(
        `
          insert into deletion_jobs (id, tenant_id, deletion_trigger, requested_by, status, started_at, finished_at, created_by, updated_by)
          values ($1, $2, $3, $4, $5, $6, $7, $8, $8)
          returning ${deletionJobColumns()}
        `,
        [j.id, j.tenantId, j.deletionTrigger, j.requestedBy, j.status, j.startedAt ?? null, j.finishedAt ?? null, input.actorId]
      );
      return mapDeletionJob(result.rows[0]);
    });
  }

  async updateDeletionJob(input: { job: DeletionJob; actorId: string }): Promise<DeletionJobRow> {
    return this.db.withTenant(input.job.tenantId, input.actorId, async (client) => {
      const j = input.job;
      const result = await client.query(
        `
          update deletion_jobs
          set status = $3, started_at = $4, finished_at = $5, updated_by = $6, updated_at = now(), version = version + 1
          where tenant_id = $1 and id = $2
          returning ${deletionJobColumns()}
        `,
        [j.tenantId, j.id, j.status, j.startedAt ?? null, j.finishedAt ?? null, input.actorId]
      );
      if (!result.rows[0]) {
        throw new Error("Deletion job was not found.");
      }
      return mapDeletionJob(result.rows[0]);
    });
  }

  async listDeletionJobs(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<DeletionJobRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${deletionJobColumns()} from deletion_jobs where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapDeletionJob);
    });
  }

  async findDeletionJob(tenantId: string, deletionJobId: string): Promise<DeletionJobRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${deletionJobColumns()} from deletion_jobs where tenant_id = $1 and id = $2`,
        [tenantId, deletionJobId]
      );
      return result.rows[0] ? mapDeletionJob(result.rows[0]) : null;
    });
  }

  async createDeletionItem(input: { item: DeletionItem; actorId: string }): Promise<DeletionItemRow> {
    return this.db.withTenant(input.item.tenantId, input.actorId, async (client) => {
      const i = input.item;
      const result = await client.query(
        `
          insert into deletion_items (
            id, tenant_id, deletion_job_id, target_type, target_id, disposition, key_destroyed, proof_hash, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
          returning ${deletionItemColumns()}
        `,
        [i.id, i.tenantId, i.deletionJobId, i.targetType, i.targetId, i.disposition, i.keyDestroyed, i.proofHash ?? null, input.actorId]
      );
      return mapDeletionItem(result.rows[0]);
    });
  }

  async listDeletionItems(input: {
    tenantId: string;
    deletionJobId: string;
    pagination: { limit: number; offset: number };
  }): Promise<DeletionItemRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${deletionItemColumns()} from deletion_items where tenant_id = $1 and deletion_job_id = $2 order by created_at desc limit $3 offset $4`,
        [input.tenantId, input.deletionJobId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapDeletionItem);
    });
  }
}

function inventoryColumns(): string {
  return `id, tenant_id, version, system_name, data_elements, owner_id, locations, lineage,
    processing_activity_ids, control_ids, vendor_ids, evidence_ids, classification, created_by, created_at, updated_by, updated_at`;
}

function processingColumns(): string {
  return `id, tenant_id, version, purpose, lawful_basis, data_subject_categories, recipients, transfers,
    retention_months, jurisdiction, inventory_record_ids, report_version, classification, created_by, created_at, updated_by, updated_at`;
}

function dpiaColumns(): string {
  return `id, tenant_id, version, processing_activity_id, risk_level, residual_risk_score, approvals,
    findings, review_obligation_ids, classification, created_by, created_at, updated_by, updated_at`;
}

function rightsColumns(): string {
  return `id, tenant_id, version, subject_id, request_type, status, identity_verified, opened_at, deadline_at,
    search_tasks, exceptions, communications, completion_evidence_ids, classification, created_by, created_at, updated_by, updated_at`;
}

function consentColumns(): string {
  return `id, tenant_id, version, subject_id, purpose, notice_version, region, status, history,
    classification, created_by, created_at, updated_by, updated_at`;
}

function incidentColumns(): string {
  return `id, tenant_id, version, severity, impacted_processing_activity_ids, evidence_ids, report_ids,
    discovered_at, regulator_notification_due_at, data_subject_notification_due_at, timeline, actions,
    classification, created_by, created_at, updated_by, updated_at`;
}

function retentionColumns(): string {
  return `id, tenant_id, version, data_category, jurisdiction, residency, transfer_mechanism,
    retention_months, legal_hold, disposal_evidence_ids, classification, created_by, created_at, updated_by, updated_at`;
}

function rightsValues(request: RightsRequest, actorId: string): unknown[] {
  return [
    request.id,
    request.tenantId,
    request.subjectId,
    request.requestType,
    request.status,
    request.identityVerified,
    request.openedAt,
    request.deadlineAt,
    JSON.stringify(request.searchTasks),
    JSON.stringify(request.exceptions),
    JSON.stringify(request.communications),
    request.completionEvidenceIds,
    actorId
  ];
}

function mapInventory(row: Record<string, unknown>): DataInventoryRecordRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    systemName: String(row.system_name),
    dataElements: mapJsonArray<string>(row.data_elements),
    ownerId: String(row.owner_id),
    locations: (row.locations as string[] | null) ?? [],
    lineage: mapJsonArray<string>(row.lineage),
    processingActivityIds: (row.processing_activity_ids as string[] | null) ?? [],
    controlIds: (row.control_ids as string[] | null) ?? [],
    vendorIds: (row.vendor_ids as string[] | null) ?? [],
    evidenceIds: (row.evidence_ids as string[] | null) ?? [],
    ...metadata(row)
  };
}

function mapProcessing(row: Record<string, unknown>): ProcessingActivityRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    purpose: String(row.purpose),
    lawfulBasis: String(row.lawful_basis),
    dataSubjectCategories: (row.data_subject_categories as string[] | null) ?? [],
    recipients: (row.recipients as string[] | null) ?? [],
    transfers: (row.transfers as string[] | null) ?? [],
    retentionMonths: Number(row.retention_months),
    jurisdiction: String(row.jurisdiction),
    inventoryRecordIds: (row.inventory_record_ids as string[] | null) ?? [],
    version: String(row.report_version),
    ...metadata(row)
  };
}

function mapDpia(row: Record<string, unknown>): DpiaAssessmentRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    processingActivityId: String(row.processing_activity_id),
    riskLevel: row.risk_level as DpiaAssessmentRow["riskLevel"],
    residualRiskScore: Number(row.residual_risk_score),
    approvals: mapJsonArray<DpiaAssessment["approvals"][number]>(row.approvals),
    findings: (row.findings as string[] | null) ?? [],
    reviewObligationIds: (row.review_obligation_ids as string[] | null) ?? [],
    ...metadata(row)
  };
}

function mapRights(row: Record<string, unknown>): RightsRequestRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    subjectId: String(row.subject_id),
    requestType: row.request_type as RightsRequestRow["requestType"],
    status: row.status as RightsRequestRow["status"],
    identityVerified: Boolean(row.identity_verified),
    openedAt: row.opened_at as Date,
    deadlineAt: row.deadline_at as Date,
    searchTasks: mapJsonArray<RightsRequest["searchTasks"][number]>(row.search_tasks),
    exceptions: mapJsonArray<string>(row.exceptions),
    communications: mapJsonArray<RightsRequest["communications"][number]>(row.communications),
    completionEvidenceIds: (row.completion_evidence_ids as string[] | null) ?? [],
    ...metadata(row)
  };
}

function mapConsent(row: Record<string, unknown>): ConsentRecordRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    subjectId: String(row.subject_id),
    purpose: String(row.purpose),
    version: String(row.notice_version),
    region: String(row.region),
    status: row.status as ConsentRecordRow["status"],
    history: mapJsonArray<ConsentRecord["history"][number]>(row.history),
    ...metadata(row)
  };
}

function mapIncident(row: Record<string, unknown>): PrivacyIncidentRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    severity: row.severity as PrivacyIncidentRow["severity"],
    impactedProcessingActivityIds: (row.impacted_processing_activity_ids as string[] | null) ?? [],
    evidenceIds: (row.evidence_ids as string[] | null) ?? [],
    reportIds: (row.report_ids as string[] | null) ?? [],
    discoveredAt: row.discovered_at as Date,
    regulatorNotificationDueAt: row.regulator_notification_due_at as Date,
    dataSubjectNotificationDueAt: row.data_subject_notification_due_at as Date,
    timeline: mapJsonArray<PrivacyIncident["timeline"][number]>(row.timeline),
    actions: mapJsonArray<PrivacyIncident["actions"][number]>(row.actions),
    ...metadata(row)
  };
}

function mapRetention(row: Record<string, unknown>): RetentionScheduleRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    dataCategory: String(row.data_category),
    jurisdiction: String(row.jurisdiction),
    residency: String(row.residency),
    transferMechanism: String(row.transfer_mechanism),
    retentionMonths: Number(row.retention_months),
    legalHold: Boolean(row.legal_hold),
    disposalEvidenceIds: (row.disposal_evidence_ids as string[] | null) ?? [],
    ...metadata(row)
  };
}

function metadata(row: Record<string, unknown>) {
  return {
    classification: row.classification as DataInventoryRecord["classification"],
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

function appendOnlyMetadata(row: Record<string, unknown>) {
  return {
    classification: row.classification as string,
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date
  };
}

function systemAssetColumns(): string {
  return `id, tenant_id, version, workspace_id, name, asset_type, owner_id, region, criticality, classification, created_by, created_at, updated_by, updated_at`;
}

function mapSystemAsset(row: Record<string, unknown>): SystemAssetRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    workspaceId: (row.workspace_id as string | null) ?? undefined,
    name: String(row.name),
    assetType: String(row.asset_type),
    ownerId: String(row.owner_id),
    region: (row.region as string | null) ?? undefined,
    criticality: (row.criticality as SystemAssetRow["criticality"]) ?? undefined,
    ...metadata(row)
  };
}

function dataCategoryColumns(): string {
  return `id, tenant_id, version, category_key, name, sensitivity, classification, created_by, created_at, updated_by, updated_at`;
}

function mapDataCategory(row: Record<string, unknown>): DataCategoryRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    categoryKey: String(row.category_key),
    name: String(row.name),
    sensitivity: row.sensitivity as DataCategoryRow["sensitivity"],
    ...metadata(row)
  };
}

function dataSubjectCategoryColumns(): string {
  return `id, tenant_id, version, subject_key, name, classification, created_by, created_at, updated_by, updated_at`;
}

function mapDataSubjectCategory(row: Record<string, unknown>): DataSubjectCategoryRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    subjectKey: String(row.subject_key),
    name: String(row.name),
    ...metadata(row)
  };
}

function dataDiscoveryScanColumns(): string {
  return `id, tenant_id, version, system_id, connector_id, started_at, finished_at, status, classifier_version, idempotency_key, classification, created_by, created_at, updated_by, updated_at`;
}

function mapDataDiscoveryScan(row: Record<string, unknown>): DataDiscoveryScanRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    systemId: String(row.system_id),
    connectorId: String(row.connector_id),
    startedAt: row.started_at as Date,
    finishedAt: (row.finished_at as Date | null) ?? undefined,
    status: row.status as DataDiscoveryScanRow["status"],
    classifierVersion: String(row.classifier_version),
    idempotencyKey: String(row.idempotency_key),
    ...metadata(row)
  };
}

function dataDiscoveryFindingColumns(): string {
  return `id, tenant_id, version, scan_id, locator_hash, data_category_id, confidence, sample_prohibited, review_status, classification, created_by, created_at, updated_by, updated_at`;
}

function mapDataDiscoveryFinding(row: Record<string, unknown>): DataDiscoveryFindingRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    scanId: String(row.scan_id),
    locatorHash: String(row.locator_hash),
    dataCategoryId: String(row.data_category_id),
    confidence: Number(row.confidence),
    samplesProhibited: Boolean(row.sample_prohibited),
    reviewStatus: row.review_status as DataDiscoveryFindingRow["reviewStatus"],
    ...metadata(row)
  };
}

function privacyNoticeColumns(): string {
  return `id, tenant_id, version, notice_key, audience, owner_id, status, classification, created_by, created_at, updated_by, updated_at`;
}

function mapPrivacyNotice(row: Record<string, unknown>): PrivacyNoticeRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    noticeKey: String(row.notice_key),
    audience: String(row.audience),
    ownerId: String(row.owner_id),
    status: row.status as PrivacyNoticeRow["status"],
    ...metadata(row)
  };
}

function privacyNoticeVersionColumns(): string {
  return `id, tenant_id, privacy_notice_id, notice_version_no, content_uri, sha256, jurisdictions, effective_from, effective_to, approved_by, classification, created_by, created_at`;
}

function mapPrivacyNoticeVersion(row: Record<string, unknown>): PrivacyNoticeVersionRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    privacyNoticeId: String(row.privacy_notice_id),
    noticeVersionNo: Number(row.notice_version_no),
    contentUri: String(row.content_uri),
    sha256: String(row.sha256),
    jurisdictions: (row.jurisdictions as string[] | null) ?? [],
    effectiveFrom: row.effective_from as Date,
    effectiveTo: (row.effective_to as Date | null) ?? undefined,
    approvedBy: String(row.approved_by),
    ...appendOnlyMetadata(row)
  };
}

function processingInventoryLinkColumns(): string {
  return `id, tenant_id, version, processing_activity_id, inventory_record_id, role, classification, created_by, created_at, updated_by, updated_at`;
}

function mapProcessingInventoryLink(row: Record<string, unknown>): ProcessingInventoryLinkRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    processingActivityId: String(row.processing_activity_id),
    inventoryRecordId: String(row.inventory_record_id),
    role: row.role as ProcessingInventoryLinkRow["role"],
    ...metadata(row)
  };
}

function purposeColumns(): string {
  return `id, tenant_id, version, purpose_key, name, description, classification, created_by, created_at, updated_by, updated_at`;
}

function mapPurpose(row: Record<string, unknown>): PurposeRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    purposeKey: String(row.purpose_key),
    name: String(row.name),
    description: (row.description as string | null) ?? undefined,
    ...metadata(row)
  };
}

function lawfulBasisColumns(): string {
  return `id, tenant_id, version, jurisdiction, basis_key, name, citation, classification, created_by, created_at, updated_by, updated_at`;
}

function mapLawfulBasis(row: Record<string, unknown>): LawfulBasisRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    jurisdiction: String(row.jurisdiction),
    basisKey: String(row.basis_key),
    name: String(row.name),
    citation: (row.citation as string | null) ?? undefined,
    ...metadata(row)
  };
}

function processingPurposeColumns(): string {
  return `id, tenant_id, version, processing_activity_id, purpose_id, lawful_basis_id, effective_from, effective_to, classification, created_by, created_at, updated_by, updated_at`;
}

function mapProcessingPurposeAssignment(row: Record<string, unknown>): ProcessingPurposeAssignmentRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    processingActivityId: String(row.processing_activity_id),
    purposeId: String(row.purpose_id),
    lawfulBasisId: String(row.lawful_basis_id),
    effectiveFrom: row.effective_from as Date,
    effectiveTo: (row.effective_to as Date | null) ?? undefined,
    ...metadata(row)
  };
}

function recipientColumns(): string {
  return `id, tenant_id, version, name, recipient_type, country, vendor_id, classification, created_by, created_at, updated_by, updated_at`;
}

function mapRecipient(row: Record<string, unknown>): RecipientRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    name: String(row.name),
    recipientType: row.recipient_type as RecipientRow["recipientType"],
    country: String(row.country),
    vendorId: (row.vendor_id as string | null) ?? undefined,
    ...metadata(row)
  };
}

function processingRecipientColumns(): string {
  return `id, tenant_id, version, processing_activity_id, recipient_id, purpose_id, data_categories, classification, created_by, created_at, updated_by, updated_at`;
}

function mapProcessingRecipientLink(row: Record<string, unknown>): ProcessingRecipientLinkRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    processingActivityId: String(row.processing_activity_id),
    recipientId: String(row.recipient_id),
    purposeId: String(row.purpose_id),
    dataCategoryIds: (row.data_categories as string[] | null) ?? [],
    ...metadata(row)
  };
}

function transferColumns(): string {
  return `id, tenant_id, version, processing_activity_id, from_country, to_country, mechanism, safeguards, status, classification, created_by, created_at, updated_by, updated_at`;
}

function mapTransfer(row: Record<string, unknown>): TransferRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    processingActivityId: String(row.processing_activity_id),
    fromCountry: String(row.from_country),
    toCountry: String(row.to_country),
    mechanism: row.mechanism as TransferRow["mechanism"],
    safeguards: (row.safeguards as string | null) ?? undefined,
    status: row.status as TransferRow["status"],
    ...metadata(row)
  };
}

function dpiaV2Columns(): string {
  return `id, tenant_id, version, processing_activity_id, trigger_reason, status, owner_id, approved_by, approved_at, classification, created_by, created_at, updated_by, updated_at`;
}

function mapDpiaV2(row: Record<string, unknown>): DpiaRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    processingActivityId: String(row.processing_activity_id),
    triggerReason: String(row.trigger_reason),
    status: row.status as DpiaRow["status"],
    ownerId: String(row.owner_id),
    approvedBy: (row.approved_by as string | null) ?? undefined,
    approvedAt: (row.approved_at as Date | null) ?? undefined,
    ...metadata(row)
  };
}

function dpiaRiskColumns(): string {
  return `id, tenant_id, version, dpia_id, description, likelihood, impact, treatment, residual_score, classification, created_by, created_at, updated_by, updated_at`;
}

function mapDpiaRisk(row: Record<string, unknown>): DpiaRiskRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    dpiaId: String(row.dpia_id),
    description: String(row.description),
    likelihood: row.likelihood as DpiaRiskRow["likelihood"],
    impact: row.impact as DpiaRiskRow["impact"],
    treatment: (row.treatment as string | null) ?? undefined,
    residualScore: Number(row.residual_score),
    ...metadata(row)
  };
}


function consentPurposeColumns(): string {
  return `id, tenant_id, version, purpose_id, notice_version_id, channel, region, active_from, active_to, classification, created_by, created_at, updated_by, updated_at`;
}

function mapConsentPurposeVersion(row: Record<string, unknown>): ConsentPurposeVersionRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    purposeId: String(row.purpose_id),
    noticeVersionId: String(row.notice_version_id),
    channel: String(row.channel),
    region: String(row.region),
    activeFrom: row.active_from as Date,
    activeTo: (row.active_to as Date | null) ?? undefined,
    ...metadata(row)
  };
}

function consentEventColumns(): string {
  return `id, tenant_id, subject_token, consent_purpose_id, event_type, occurred_at, source, proof_hash, idempotency_key, recorded_by, classification, created_by, created_at`;
}

function mapConsentEvent(row: Record<string, unknown>): ConsentEventRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    subjectToken: String(row.subject_token),
    consentPurposeId: String(row.consent_purpose_id),
    eventType: row.event_type as ConsentEventRow["eventType"],
    occurredAt: row.occurred_at as Date,
    source: String(row.source),
    proofHash: String(row.proof_hash),
    idempotencyKey: String(row.idempotency_key),
    recordedBy: String(row.recorded_by),
    ...appendOnlyMetadata(row)
  };
}

function incidentAssessmentColumns(): string {
  return `id, tenant_id, version, incident_id, jurisdiction, reportable, rationale, assessor_id, decided_at, assessment_version_no, classification, created_by, created_at, updated_by, updated_at`;
}

function mapIncidentAssessment(row: Record<string, unknown>): IncidentAssessmentRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    incidentId: String(row.incident_id),
    jurisdiction: String(row.jurisdiction),
    reportable: Boolean(row.reportable),
    rationale: String(row.rationale),
    assessorId: String(row.assessor_id),
    decidedAt: row.decided_at as Date,
    assessmentVersionNo: Number(row.assessment_version_no),
    ...metadata(row)
  };
}

function incidentNotificationColumns(): string {
  return `id, tenant_id, version, incident_id, recipient_type, jurisdiction, due_at, sent_at, artifact_id, classification, created_by, created_at, updated_by, updated_at`;
}

function mapIncidentNotification(row: Record<string, unknown>): IncidentNotificationRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    incidentId: String(row.incident_id),
    recipientType: row.recipient_type as IncidentNotificationRow["recipientType"],
    jurisdiction: String(row.jurisdiction),
    dueAt: row.due_at as Date,
    sentAt: (row.sent_at as Date | null) ?? undefined,
    artifactId: (row.artifact_id as string | null) ?? undefined,
    ...metadata(row)
  };
}

function retentionRuleColumns(): string {
  return `id, tenant_id, version, data_category_id, jurisdiction, retention_trigger, duration_days, disposition, classification, created_by, created_at, updated_by, updated_at`;
}

function mapRetentionRule(row: Record<string, unknown>): RetentionRuleRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    dataCategoryId: String(row.data_category_id),
    jurisdiction: String(row.jurisdiction),
    retentionTrigger: String(row.retention_trigger),
    durationDays: Number(row.duration_days),
    disposition: row.disposition as RetentionRuleRow["disposition"],
    ...metadata(row)
  };
}

function retentionAssignmentColumns(): string {
  return `id, tenant_id, version, retention_rule_id, target_type, target_id, effective_from, effective_to, classification, created_by, created_at, updated_by, updated_at`;
}

function mapRetentionAssignment(row: Record<string, unknown>): RetentionAssignmentRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    retentionRuleId: String(row.retention_rule_id),
    targetType: row.target_type as RetentionAssignmentRow["targetType"],
    targetId: String(row.target_id),
    effectiveFrom: row.effective_from as Date,
    effectiveTo: (row.effective_to as Date | null) ?? undefined,
    ...metadata(row)
  };
}

function legalHoldColumns(): string {
  return `id, tenant_id, version, hold_key, reason, issued_by, issued_at, released_at, scope_json, classification, created_by, created_at, updated_by, updated_at`;
}

function mapLegalHold(row: Record<string, unknown>): LegalHoldRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    holdKey: String(row.hold_key),
    reason: String(row.reason),
    issuedBy: String(row.issued_by),
    issuedAt: row.issued_at as Date,
    releasedAt: (row.released_at as Date | null) ?? undefined,
    scopeJson: (row.scope_json as Record<string, unknown>) ?? {},
    ...metadata(row)
  };
}

function legalHoldItemColumns(alias?: string): string {
  const columns = ["id", "tenant_id", "version", "legal_hold_id", "target_type", "target_id", "classification", "created_by", "created_at", "updated_by", "updated_at"];
  return alias ? columns.map((column) => `${alias}.${column}`).join(", ") : columns.join(", ");
}

function mapLegalHoldItem(row: Record<string, unknown>): LegalHoldItemRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    legalHoldId: String(row.legal_hold_id),
    targetType: row.target_type as LegalHoldItemRow["targetType"],
    targetId: String(row.target_id),
    ...metadata(row)
  };
}

function deletionJobColumns(): string {
  return `id, tenant_id, version, deletion_trigger, requested_by, status, started_at, finished_at, classification, created_by, created_at, updated_by, updated_at`;
}

function mapDeletionJob(row: Record<string, unknown>): DeletionJobRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    deletionTrigger: String(row.deletion_trigger),
    requestedBy: String(row.requested_by),
    status: row.status as DeletionJobRow["status"],
    startedAt: (row.started_at as Date | null) ?? undefined,
    finishedAt: (row.finished_at as Date | null) ?? undefined,
    ...metadata(row)
  };
}

function deletionItemColumns(): string {
  return `id, tenant_id, version, deletion_job_id, target_type, target_id, disposition, key_destroyed, proof_hash, classification, created_by, created_at, updated_by, updated_at`;
}

function mapDeletionItem(row: Record<string, unknown>): DeletionItemRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    deletionJobId: String(row.deletion_job_id),
    targetType: row.target_type as DeletionItemRow["targetType"],
    targetId: String(row.target_id),
    disposition: row.disposition as DeletionItemRow["disposition"],
    keyDestroyed: Boolean(row.key_destroyed),
    proofHash: (row.proof_hash as string | null) ?? undefined,
    ...metadata(row)
  };
}
