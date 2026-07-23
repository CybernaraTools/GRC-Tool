import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../../audit-security/public.js";
import { OutboxService } from "../../outbox/public.js";
import type { Pagination } from "../../../shared/pagination.js";
import {
  addRightsSearchTask,
  completeRightsRequest,
  createConsentEvent,
  createConsentPurposeVersion,
  createDataCategory,
  createDataDiscoveryFinding,
  createDataDiscoveryScan,
  createDataInventoryRecord,
  createDataSubjectCategory,
  createDeletionItem,
  createDeletionJob,
  createDpia,
  createDpiaAssessment,
  createDpiaRisk,
  createIncidentAssessment,
  createIncidentNotification,
  createLawfulBasis,
  createLegalHold,
  createLegalHoldItem,
  createPrivacyIncident,
  createPrivacyNotice,
  createPrivacyNoticeVersion,
  createProcessingActivity,
  createProcessingInventoryLink,
  createProcessingPurposeAssignment,
  createProcessingRecipientLink,
  createPurpose,
  createRecipient,
  createRetentionAssignment,
  createRetentionRule,
  createRetentionSchedule,
  createRightsRequest,
  createRightsRequestTask,
  createSystemAsset,
  createTransfer,
  evaluateRetention,
  grantConsent,
  releaseLegalHold,
  verifyRightsRequestIdentity,
  withdrawConsent,
  type ConsentEventType,
  type DataDiscoveryScanStatus,
  type DataSensitivity,
  type DeletionItemDisposition,
  type DpiaAssessment,
  type DpiaRiskLikelihoodImpact,
  type IncidentNotificationRecipientType,
  type IncidentSeverity,
  type InventoryLinkRole,
  type PrivacyClassification,
  type RecipientType,
  type RetentionDecision,
  type RetentionDisposition,
  type RetentionTargetType,
  type RightsRequest,
  type RightsRequestTaskType,
  type TransferMechanism
} from "../domain/privacy.js";
import { PRIVACY_OPERATIONS_REPOSITORY } from "./tokens.js";
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
} from "./privacy-operations.types.js";

interface PrivacyPayload extends Record<string, unknown> {
  inventoryId?: string;
  processingActivityId?: string;
  dpiaId?: string;
  rightsRequestId?: string;
  consentId?: string;
  incidentId?: string;
  retentionScheduleId?: string;
}

interface PrivacyGraphPayload extends Record<string, unknown> {
  recordId: string;
}

@Injectable()
export class PrivacyOperationsService {
  constructor(
    @Inject(PRIVACY_OPERATIONS_REPOSITORY) private readonly repository: PrivacyOperationsRepository,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(AuditLogService) private readonly auditLog: AuditLogService
  ) {}

  async createInventory(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    systemName: string;
    dataElements: string[];
    ownerId: string;
    locations: string[];
    classification: PrivacyClassification;
    lineage: string[];
    processingActivityIds: string[];
    controlIds: string[];
    vendorIds: string[];
    evidenceIds: string[];
  }): Promise<DataInventoryRecordRow> {
    const replay = await this.replayedInventory(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const record = this.fromDomain(() => createDataInventoryRecord(input));
    const persisted = await this.repository.createInventory({ record, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "privacy.inventory_created",
      aggregateType: "data_inventory_record",
      aggregateId: persisted.id,
      payload: { inventoryId: persisted.id },
      body: { inventoryId: persisted.id, systemName: persisted.systemName }
    });
    return persisted;
  }

  listInventory(tenantId: string, pagination: Pagination): Promise<DataInventoryRecordRow[]> {
    return this.repository.listInventory({ tenantId, pagination });
  }

  async getInventory(tenantId: string, recordId: string): Promise<DataInventoryRecordRow> {
    const record = await this.repository.findInventory(tenantId, recordId);
    if (!record) {
      throw new NotFoundException("Data inventory record not found.");
    }
    return record;
  }

  async createProcessingActivity(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    purpose: string;
    lawfulBasis: string;
    dataSubjectCategories: string[];
    recipients: string[];
    transfers: string[];
    retentionMonths: number;
    jurisdiction: string;
    inventoryRecordIds: string[];
  }): Promise<ProcessingActivityRow> {
    const replay = await this.replayedProcessing(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const activity = this.fromDomain(() => createProcessingActivity(input));
    const persisted = await this.repository.createProcessingActivity({ activity, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "privacy.processing_activity_created",
      aggregateType: "processing_activity",
      aggregateId: persisted.id,
      payload: { processingActivityId: persisted.id },
      body: { processingActivityId: persisted.id, purpose: persisted.purpose }
    });
    return persisted;
  }

  listProcessingActivities(tenantId: string, pagination: Pagination): Promise<ProcessingActivityRow[]> {
    return this.repository.listProcessingActivities({ tenantId, pagination });
  }

  async getProcessingActivity(tenantId: string, activityId: string): Promise<ProcessingActivityRow> {
    const activity = await this.repository.findProcessingActivity(tenantId, activityId);
    if (!activity) {
      throw new NotFoundException("Processing activity not found.");
    }
    return activity;
  }

  async createDpia(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    processingActivityId: string;
    riskLevel: DpiaAssessment["riskLevel"];
    residualRiskScore: number;
    approvals: DpiaAssessment["approvals"];
    findings: string[];
  }): Promise<DpiaAssessmentRow> {
    const replay = await this.replayedDpia(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const dpia = this.fromDomain(() => createDpiaAssessment(input));
    const persisted = await this.repository.createDpia({ dpia, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "privacy.dpia_created",
      aggregateType: "dpia_assessment",
      aggregateId: persisted.id,
      payload: { dpiaId: persisted.id },
      body: { dpiaId: persisted.id, processingActivityId: persisted.processingActivityId, riskLevel: persisted.riskLevel }
    });
    return persisted;
  }

  listDpias(tenantId: string, pagination: Pagination): Promise<DpiaAssessmentRow[]> {
    return this.repository.listDpias({ tenantId, pagination });
  }

  async getDpia(tenantId: string, dpiaId: string): Promise<DpiaAssessmentRow> {
    const dpia = await this.repository.findDpia(tenantId, dpiaId);
    if (!dpia) {
      throw new NotFoundException("DPIA assessment not found.");
    }
    return dpia;
  }

  async createRightsRequest(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    subjectId: string;
    requestType: RightsRequest["requestType"];
    openedAt: Date;
    slaDays: number;
  }): Promise<RightsRequestRow> {
    const replay = await this.replayedRights(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const request = this.fromDomain(() => createRightsRequest(input));
    const persisted = await this.repository.createRightsRequest({ request, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "privacy.rights_request_created",
      aggregateType: "privacy_rights_request",
      aggregateId: persisted.id,
      payload: { rightsRequestId: persisted.id },
      body: { rightsRequestId: persisted.id, requestType: persisted.requestType, deadlineAt: persisted.deadlineAt }
    });
    return persisted;
  }

  listRightsRequests(tenantId: string, pagination: Pagination): Promise<RightsRequestRow[]> {
    return this.repository.listRightsRequests({ tenantId, pagination });
  }

  async getRightsRequest(tenantId: string, requestId: string): Promise<RightsRequestRow> {
    const request = await this.repository.findRightsRequest(tenantId, requestId);
    if (!request) {
      throw new NotFoundException("Privacy rights request not found.");
    }
    return request;
  }

  async verifyRightsRequest(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    requestId: string;
  }): Promise<RightsRequestRow> {
    return this.updateRights(input, "privacy.rights_request_verified", (request) => verifyRightsRequestIdentity(request));
  }

  async addRightsSearchTask(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    requestId: string;
    systemName: string;
    ownerId: string;
  }): Promise<RightsRequestRow> {
    return this.updateRights(input, "privacy.rights_search_task_added", (request) =>
      this.fromDomain(() => addRightsSearchTask(request, { systemName: input.systemName, ownerId: input.ownerId }))
    );
  }

  async completeRightsRequest(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    requestId: string;
    completionEvidenceIds: string[];
    communication: RightsRequest["communications"][number];
  }): Promise<RightsRequestRow> {
    return this.updateRights(input, "privacy.rights_request_completed", (request) =>
      this.fromDomain(() =>
        completeRightsRequest(request, {
          completionEvidenceIds: input.completionEvidenceIds,
          communication: input.communication
        })
      )
    );
  }

  async grantConsent(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    subjectId: string;
    purpose: string;
    version: string;
    region: string;
  }): Promise<ConsentRecordRow> {
    const replay = await this.replayedConsent(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const consent = this.fromDomain(() => grantConsent(input));
    const persisted = await this.repository.createConsent({ consent, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "privacy.consent_granted",
      aggregateType: "consent_record",
      aggregateId: persisted.id,
      payload: { consentId: persisted.id },
      body: { consentId: persisted.id, subjectId: persisted.subjectId, purpose: persisted.purpose }
    });
    return persisted;
  }

  listConsents(tenantId: string, pagination: Pagination): Promise<ConsentRecordRow[]> {
    return this.repository.listConsents({ tenantId, pagination });
  }

  async getConsent(tenantId: string, consentId: string): Promise<ConsentRecordRow> {
    const consent = await this.repository.findConsent(tenantId, consentId);
    if (!consent) {
      throw new NotFoundException("Consent record not found.");
    }
    return consent;
  }

  async withdrawConsent(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    consentId: string;
    reason: string;
  }): Promise<ConsentRecordRow> {
    const replay = await this.replayedConsent(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const consent = await this.getConsent(input.tenantId, input.consentId);
    const withdrawn = this.fromDomain(() => withdrawConsent(consent, { actorId: input.actorId, reason: input.reason }));
    const persisted = await this.repository.updateConsent({ consent: withdrawn, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "privacy.consent_withdrawn",
      aggregateType: "consent_record",
      aggregateId: persisted.id,
      payload: { consentId: persisted.id },
      body: { consentId: persisted.id, reason: input.reason }
    });
    return persisted;
  }

  async createIncident(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    severity: IncidentSeverity;
    impactedProcessingActivityIds: string[];
    evidenceIds: string[];
    reportIds: string[];
    discoveredAt: Date;
  }): Promise<PrivacyIncidentRow> {
    const replay = await this.replayedIncident(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const incident = this.fromDomain(() => createPrivacyIncident(input));
    const persisted = await this.repository.createIncident({ incident, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "privacy.incident_created",
      aggregateType: "privacy_incident",
      aggregateId: persisted.id,
      payload: { incidentId: persisted.id },
      body: { incidentId: persisted.id, severity: persisted.severity }
    });
    return persisted;
  }

  listIncidents(tenantId: string, pagination: Pagination): Promise<PrivacyIncidentRow[]> {
    return this.repository.listIncidents({ tenantId, pagination });
  }

  async getIncident(tenantId: string, incidentId: string): Promise<PrivacyIncidentRow> {
    const incident = await this.repository.findIncident(tenantId, incidentId);
    if (!incident) {
      throw new NotFoundException("Privacy incident not found.");
    }
    return incident;
  }

  async createRetentionSchedule(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    dataCategory: string;
    jurisdiction: string;
    residency: string;
    transferMechanism: string;
    retentionMonths: number;
    legalHold: boolean;
    disposalEvidenceIds: string[];
  }): Promise<RetentionScheduleRow> {
    const replay = await this.replayedRetention(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const schedule = this.fromDomain(() => createRetentionSchedule(input));
    const persisted = await this.repository.createRetentionSchedule({ schedule, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "privacy.retention_schedule_created",
      aggregateType: "retention_schedule",
      aggregateId: persisted.id,
      payload: { retentionScheduleId: persisted.id },
      body: { retentionScheduleId: persisted.id, dataCategory: persisted.dataCategory }
    });
    return persisted;
  }

  listRetentionSchedules(tenantId: string, pagination: Pagination): Promise<RetentionScheduleRow[]> {
    return this.repository.listRetentionSchedules({ tenantId, pagination });
  }

  async getRetentionSchedule(tenantId: string, scheduleId: string): Promise<RetentionScheduleRow> {
    const schedule = await this.repository.findRetentionSchedule(tenantId, scheduleId);
    if (!schedule) {
      throw new NotFoundException("Retention schedule not found.");
    }
    return schedule;
  }

  async evaluateRetention(input: {
    tenantId: string;
    scheduleId: string;
    ageMonths: number;
  }): Promise<{ scheduleId: string; decision: RetentionDecision }> {
    const schedule = await this.getRetentionSchedule(input.tenantId, input.scheduleId);
    return { scheduleId: schedule.id, decision: evaluateRetention(schedule, input.ageMonths) };
  }

  async createSystemAsset(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    workspaceId?: string;
    name: string;
    assetType: string;
    ownerId: string;
    region?: string;
    criticality?: "low" | "medium" | "high" | "critical";
  }): Promise<SystemAssetRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository.listSystemAssets({ tenantId: input.tenantId, pagination: { limit: 200, offset: 0 } }).then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const asset = this.fromDomain(() => createSystemAsset(input));
    const persisted = await this.repository.createSystemAsset({ asset, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.system_asset_created", "systems_asset", persisted.id);
    return persisted;
  }

  listSystemAssets(tenantId: string, pagination: Pagination): Promise<SystemAssetRow[]> {
    return this.repository.listSystemAssets({ tenantId, pagination });
  }

  async createDataCategory(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    categoryKey: string;
    name: string;
    sensitivity: DataSensitivity;
  }): Promise<DataCategoryRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository.listDataCategories({ tenantId: input.tenantId, pagination: { limit: 200, offset: 0 } }).then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const category = this.fromDomain(() => createDataCategory(input));
    const persisted = await this.repository.createDataCategory({ category, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.data_category_created", "data_category", persisted.id);
    return persisted;
  }

  listDataCategories(tenantId: string, pagination: Pagination): Promise<DataCategoryRow[]> {
    return this.repository.listDataCategories({ tenantId, pagination });
  }

  async createDataSubjectCategory(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    subjectKey: string;
    name: string;
  }): Promise<DataSubjectCategoryRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository.listDataSubjectCategories({ tenantId: input.tenantId, pagination: { limit: 200, offset: 0 } }).then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const category = this.fromDomain(() => createDataSubjectCategory(input));
    const persisted = await this.repository.createDataSubjectCategory({ category, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.data_subject_category_created", "data_subject_category", persisted.id);
    return persisted;
  }

  listDataSubjectCategories(tenantId: string, pagination: Pagination): Promise<DataSubjectCategoryRow[]> {
    return this.repository.listDataSubjectCategories({ tenantId, pagination });
  }

  async createDataDiscoveryScan(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    systemId: string;
    connectorId: string;
    classifierVersion: string;
    status?: DataDiscoveryScanStatus;
  }): Promise<DataDiscoveryScanRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository.listDataDiscoveryScans({ tenantId: input.tenantId, systemId: input.systemId, pagination: { limit: 200, offset: 0 } }).then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const scan = this.fromDomain(() => createDataDiscoveryScan({ ...input, idempotencyKey: input.idempotencyKey }));
    const persisted = await this.repository.createDataDiscoveryScan({ scan, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.data_discovery_scan_created", "data_discovery_scan", persisted.id);
    return persisted;
  }

  listDataDiscoveryScans(tenantId: string, systemId: string, pagination: Pagination): Promise<DataDiscoveryScanRow[]> {
    return this.repository.listDataDiscoveryScans({ tenantId, systemId, pagination });
  }

  async createDataDiscoveryFinding(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    scanId: string;
    locatorHash: string;
    dataCategoryId: string;
    confidence: number;
  }): Promise<DataDiscoveryFindingRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository.listDataDiscoveryFindings({ tenantId: input.tenantId, scanId: input.scanId, pagination: { limit: 200, offset: 0 } }).then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const finding = this.fromDomain(() => createDataDiscoveryFinding(input));
    const persisted = await this.repository.createDataDiscoveryFinding({ finding, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.data_discovery_finding_created", "data_discovery_finding", persisted.id);
    return persisted;
  }

  listDataDiscoveryFindings(tenantId: string, scanId: string, pagination: Pagination): Promise<DataDiscoveryFindingRow[]> {
    return this.repository.listDataDiscoveryFindings({ tenantId, scanId, pagination });
  }

  async createPrivacyNotice(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    noticeKey: string;
    audience: string;
    ownerId: string;
  }): Promise<PrivacyNoticeRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) => this.repository.findPrivacyNotice(input.tenantId, id));
    if (replay) {
      return replay;
    }
    const notice = this.fromDomain(() => createPrivacyNotice(input));
    const persisted = await this.repository.createPrivacyNotice({ notice, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.notice_created", "privacy_notice", persisted.id);
    return persisted;
  }

  listPrivacyNotices(tenantId: string, pagination: Pagination): Promise<PrivacyNoticeRow[]> {
    return this.repository.listPrivacyNotices({ tenantId, pagination });
  }

  async getPrivacyNotice(tenantId: string, noticeId: string): Promise<PrivacyNoticeRow> {
    const notice = await this.repository.findPrivacyNotice(tenantId, noticeId);
    if (!notice) {
      throw new NotFoundException("Privacy notice not found.");
    }
    return notice;
  }

  async createPrivacyNoticeVersion(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    privacyNoticeId: string;
    contentUri: string;
    sha256: string;
    jurisdictions: string[];
    effectiveFrom: Date;
    effectiveTo?: Date;
  }): Promise<PrivacyNoticeVersionRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) => this.repository.findPrivacyNoticeVersion(input.tenantId, id));
    if (replay) {
      return replay;
    }
    const existingVersions = await this.repository.listPrivacyNoticeVersions({
      tenantId: input.tenantId,
      privacyNoticeId: input.privacyNoticeId,
      pagination: { limit: 1, offset: 0 }
    });
    const nextVersionNo = (existingVersions[0]?.noticeVersionNo ?? 0) + 1;
    const version = this.fromDomain(() =>
      createPrivacyNoticeVersion({ ...input, noticeVersionNo: nextVersionNo, approvedBy: input.actorId })
    );
    const persisted = await this.repository.createPrivacyNoticeVersion({ version, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.notice_version_created", "privacy_notice_version", persisted.id);
    return persisted;
  }

  listPrivacyNoticeVersions(tenantId: string, privacyNoticeId: string, pagination: Pagination): Promise<PrivacyNoticeVersionRow[]> {
    return this.repository.listPrivacyNoticeVersions({ tenantId, privacyNoticeId, pagination });
  }

  async createProcessingInventoryLink(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    processingActivityId: string;
    inventoryRecordId: string;
    role: InventoryLinkRole;
  }): Promise<ProcessingInventoryLinkRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository.listProcessingInventoryLinks({ tenantId: input.tenantId, processingActivityId: input.processingActivityId, pagination: { limit: 200, offset: 0 } }).then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const link = this.fromDomain(() => createProcessingInventoryLink(input));
    const persisted = await this.repository.createProcessingInventoryLink({ link, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.processing_inventory_link_created", "processing_inventory_link", persisted.id);
    return persisted;
  }

  listProcessingInventoryLinks(tenantId: string, processingActivityId: string, pagination: Pagination): Promise<ProcessingInventoryLinkRow[]> {
    return this.repository.listProcessingInventoryLinks({ tenantId, processingActivityId, pagination });
  }

  async createPurpose(input: { tenantId: string; actorId: string; idempotencyKey: string; purposeKey: string; name: string; description?: string }): Promise<PurposeRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository.listPurposes({ tenantId: input.tenantId, pagination: { limit: 200, offset: 0 } }).then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const purpose = this.fromDomain(() => createPurpose(input));
    const persisted = await this.repository.createPurpose({ purpose, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.purpose_created", "purpose", persisted.id);
    return persisted;
  }

  listPurposes(tenantId: string, pagination: Pagination): Promise<PurposeRow[]> {
    return this.repository.listPurposes({ tenantId, pagination });
  }

  async createLawfulBasis(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    jurisdiction: string;
    basisKey: string;
    name: string;
    citation?: string;
  }): Promise<LawfulBasisRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository.listLawfulBases({ tenantId: input.tenantId, pagination: { limit: 200, offset: 0 } }).then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const basis = this.fromDomain(() => createLawfulBasis(input));
    const persisted = await this.repository.createLawfulBasis({ basis, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.lawful_basis_created", "lawful_basis", persisted.id);
    return persisted;
  }

  listLawfulBases(tenantId: string, pagination: Pagination): Promise<LawfulBasisRow[]> {
    return this.repository.listLawfulBases({ tenantId, pagination });
  }

  async createProcessingPurposeAssignment(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    processingActivityId: string;
    purposeId: string;
    lawfulBasisId: string;
  }): Promise<ProcessingPurposeAssignmentRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository.listProcessingPurposeAssignments({ tenantId: input.tenantId, processingActivityId: input.processingActivityId, pagination: { limit: 200, offset: 0 } }).then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const assignment = this.fromDomain(() => createProcessingPurposeAssignment(input));
    const persisted = await this.repository.createProcessingPurposeAssignment({ assignment, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.processing_purpose_assignment_created", "processing_purpose_assignment", persisted.id);
    return persisted;
  }

  listProcessingPurposeAssignments(tenantId: string, processingActivityId: string, pagination: Pagination): Promise<ProcessingPurposeAssignmentRow[]> {
    return this.repository.listProcessingPurposeAssignments({ tenantId, processingActivityId, pagination });
  }

  async createRecipient(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    name: string;
    recipientType: RecipientType;
    country: string;
    vendorId?: string;
  }): Promise<RecipientRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository.listRecipients({ tenantId: input.tenantId, pagination: { limit: 200, offset: 0 } }).then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const recipient = this.fromDomain(() => createRecipient(input));
    const persisted = await this.repository.createRecipient({ recipient, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.recipient_created", "recipient", persisted.id);
    return persisted;
  }

  listRecipients(tenantId: string, pagination: Pagination): Promise<RecipientRow[]> {
    return this.repository.listRecipients({ tenantId, pagination });
  }

  async createProcessingRecipientLink(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    processingActivityId: string;
    recipientId: string;
    purposeId: string;
    dataCategoryIds?: string[];
  }): Promise<ProcessingRecipientLinkRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository.listProcessingRecipientLinks({ tenantId: input.tenantId, processingActivityId: input.processingActivityId, pagination: { limit: 200, offset: 0 } }).then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const link = this.fromDomain(() => createProcessingRecipientLink(input));
    const persisted = await this.repository.createProcessingRecipientLink({ link, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.processing_recipient_link_created", "processing_recipient_link", persisted.id);
    return persisted;
  }

  listProcessingRecipientLinks(tenantId: string, processingActivityId: string, pagination: Pagination): Promise<ProcessingRecipientLinkRow[]> {
    return this.repository.listProcessingRecipientLinks({ tenantId, processingActivityId, pagination });
  }

  async createTransfer(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    processingActivityId: string;
    fromCountry: string;
    toCountry: string;
    mechanism: TransferMechanism;
    safeguards?: string;
  }): Promise<TransferRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository.listTransfers({ tenantId: input.tenantId, processingActivityId: input.processingActivityId, pagination: { limit: 200, offset: 0 } }).then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const transfer = this.fromDomain(() => createTransfer(input));
    const persisted = await this.repository.createTransfer({ transfer, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.transfer_created", "transfer", persisted.id);
    return persisted;
  }

  listTransfers(tenantId: string, processingActivityId: string, pagination: Pagination): Promise<TransferRow[]> {
    return this.repository.listTransfers({ tenantId, processingActivityId, pagination });
  }

  async createDpiaV2(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    processingActivityId: string;
    triggerReason: string;
    ownerId: string;
  }): Promise<DpiaRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository.listDpiasV2({ tenantId: input.tenantId, pagination: { limit: 200, offset: 0 } }).then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const dpia = this.fromDomain(() => createDpia(input));
    const persisted = await this.repository.createDpiaV2({ dpia, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.dpia_v2_created", "dpia", persisted.id);
    return persisted;
  }

  listDpiasV2(tenantId: string, pagination: Pagination): Promise<DpiaRow[]> {
    return this.repository.listDpiasV2({ tenantId, pagination });
  }

  async createDpiaRisk(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    dpiaId: string;
    description: string;
    likelihood: DpiaRiskLikelihoodImpact;
    impact: DpiaRiskLikelihoodImpact;
    treatment?: string;
    residualScore: number;
  }): Promise<DpiaRiskRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository.listDpiaRisks({ tenantId: input.tenantId, dpiaId: input.dpiaId, pagination: { limit: 200, offset: 0 } }).then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const risk = this.fromDomain(() => createDpiaRisk(input));
    const persisted = await this.repository.createDpiaRisk({ risk, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.dpia_risk_created", "dpia_risk", persisted.id);
    return persisted;
  }

  listDpiaRisks(tenantId: string, dpiaId: string, pagination: Pagination): Promise<DpiaRiskRow[]> {
    return this.repository.listDpiaRisks({ tenantId, dpiaId, pagination });
  }

  async createRightsRequestTask(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    rightsRequestId: string;
    systemId: string;
    ownerId: string;
    taskType: RightsRequestTaskType;
  }): Promise<RightsRequestTaskRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository.listRightsRequestTasks({ tenantId: input.tenantId, rightsRequestId: input.rightsRequestId, pagination: { limit: 200, offset: 0 } }).then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const task = this.fromDomain(() => createRightsRequestTask(input));
    const persisted = await this.repository.createRightsRequestTask({ task, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.rights_request_task_created", "rights_request_task", persisted.id);
    return persisted;
  }

  listRightsRequestTasks(tenantId: string, rightsRequestId: string, pagination: Pagination): Promise<RightsRequestTaskRow[]> {
    return this.repository.listRightsRequestTasks({ tenantId, rightsRequestId, pagination });
  }

  async createConsentPurposeVersion(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    purposeId: string;
    noticeVersionId: string;
    channel: string;
    region: string;
  }): Promise<ConsentPurposeVersionRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository.listConsentPurposeVersions({ tenantId: input.tenantId, pagination: { limit: 200, offset: 0 } }).then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const version = this.fromDomain(() => createConsentPurposeVersion(input));
    const persisted = await this.repository.createConsentPurposeVersion({ version, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.consent_purpose_version_created", "consent_purpose_version", persisted.id);
    return persisted;
  }

  listConsentPurposeVersions(tenantId: string, pagination: Pagination): Promise<ConsentPurposeVersionRow[]> {
    return this.repository.listConsentPurposeVersions({ tenantId, pagination });
  }

  async createConsentEvent(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    subjectToken: string;
    consentPurposeId: string;
    eventType: ConsentEventType;
    source: string;
    proofHash: string;
  }): Promise<ConsentEventRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository.listConsentEvents({ tenantId: input.tenantId, subjectToken: input.subjectToken, pagination: { limit: 200, offset: 0 } }).then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const event = this.fromDomain(() => createConsentEvent({ ...input, recordedBy: input.actorId, idempotencyKey: input.idempotencyKey }));
    const persisted = await this.repository.createConsentEvent({ event, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.consent_event_recorded", "consent_event", persisted.id);
    return persisted;
  }

  listConsentEvents(tenantId: string, subjectToken: string, pagination: Pagination): Promise<ConsentEventRow[]> {
    return this.repository.listConsentEvents({ tenantId, subjectToken, pagination });
  }

  async createIncidentAssessment(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    incidentId: string;
    jurisdiction: string;
    reportable: boolean;
    rationale: string;
  }): Promise<IncidentAssessmentRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository.listIncidentAssessments({ tenantId: input.tenantId, incidentId: input.incidentId, pagination: { limit: 200, offset: 0 } }).then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const assessment = this.fromDomain(() => createIncidentAssessment({ ...input, assessorId: input.actorId }));
    const persisted = await this.repository.createIncidentAssessment({ assessment, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.incident_assessment_created", "incident_assessment", persisted.id);
    return persisted;
  }

  listIncidentAssessments(tenantId: string, incidentId: string, pagination: Pagination): Promise<IncidentAssessmentRow[]> {
    return this.repository.listIncidentAssessments({ tenantId, incidentId, pagination });
  }

  async createIncidentNotification(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    incidentId: string;
    recipientType: IncidentNotificationRecipientType;
    jurisdiction: string;
    dueAt: Date;
  }): Promise<IncidentNotificationRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository.listIncidentNotifications({ tenantId: input.tenantId, incidentId: input.incidentId, pagination: { limit: 200, offset: 0 } }).then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const notification = this.fromDomain(() => createIncidentNotification(input));
    const persisted = await this.repository.createIncidentNotification({ notification, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.incident_notification_created", "incident_notification", persisted.id);
    return persisted;
  }

  listIncidentNotifications(tenantId: string, incidentId: string, pagination: Pagination): Promise<IncidentNotificationRow[]> {
    return this.repository.listIncidentNotifications({ tenantId, incidentId, pagination });
  }

  async createRetentionRule(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    dataCategoryId: string;
    jurisdiction: string;
    retentionTrigger: string;
    durationDays: number;
    disposition: RetentionDisposition;
  }): Promise<RetentionRuleRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository.listRetentionRules({ tenantId: input.tenantId, pagination: { limit: 200, offset: 0 } }).then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const rule = this.fromDomain(() => createRetentionRule(input));
    const persisted = await this.repository.createRetentionRule({ rule, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.retention_rule_created", "retention_rule", persisted.id);
    return persisted;
  }

  listRetentionRules(tenantId: string, pagination: Pagination): Promise<RetentionRuleRow[]> {
    return this.repository.listRetentionRules({ tenantId, pagination });
  }

  async createRetentionAssignment(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    retentionRuleId: string;
    targetType: RetentionTargetType;
    targetId: string;
  }): Promise<RetentionAssignmentRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository
        .listRetentionAssignments({ tenantId: input.tenantId, targetType: input.targetType, targetId: input.targetId, pagination: { limit: 200, offset: 0 } })
        .then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const assignment = this.fromDomain(() => createRetentionAssignment(input));
    const persisted = await this.repository.createRetentionAssignment({ assignment, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.retention_assignment_created", "retention_assignment", persisted.id);
    return persisted;
  }

  listRetentionAssignments(tenantId: string, targetType: string, targetId: string, pagination: Pagination): Promise<RetentionAssignmentRow[]> {
    return this.repository.listRetentionAssignments({ tenantId, targetType, targetId, pagination });
  }

  async createLegalHold(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    holdKey: string;
    reason: string;
  }): Promise<LegalHoldRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) => this.repository.findLegalHold(input.tenantId, id));
    if (replay) {
      return replay;
    }
    const hold = this.fromDomain(() => createLegalHold({ ...input, issuedBy: input.actorId }));
    const persisted = await this.repository.createLegalHold({ hold, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.legal_hold_created", "legal_hold", persisted.id);
    return persisted;
  }

  listLegalHolds(tenantId: string, pagination: Pagination): Promise<LegalHoldRow[]> {
    return this.repository.listLegalHolds({ tenantId, pagination });
  }

  async getLegalHold(tenantId: string, legalHoldId: string): Promise<LegalHoldRow> {
    const hold = await this.repository.findLegalHold(tenantId, legalHoldId);
    if (!hold) {
      throw new NotFoundException("Legal hold not found.");
    }
    return hold;
  }

  async releaseLegalHold(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    legalHoldId: string;
  }): Promise<LegalHoldRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) => this.repository.findLegalHold(input.tenantId, id));
    if (replay) {
      return replay;
    }
    const current = await this.getLegalHold(input.tenantId, input.legalHoldId);
    const released = this.fromDomain(() => releaseLegalHold(current));
    const persisted = await this.repository.updateLegalHold({ hold: released, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.legal_hold_released", "legal_hold", persisted.id);
    return persisted;
  }

  async createLegalHoldItem(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    legalHoldId: string;
    targetType: RetentionTargetType;
    targetId: string;
  }): Promise<LegalHoldItemRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository
        .listLegalHoldItems({ tenantId: input.tenantId, legalHoldId: input.legalHoldId, pagination: { limit: 200, offset: 0 } })
        .then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const item = this.fromDomain(() => createLegalHoldItem(input));
    const persisted = await this.repository.createLegalHoldItem({ item, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.legal_hold_item_created", "legal_hold_item", persisted.id);
    return persisted;
  }

  listLegalHoldItems(tenantId: string, legalHoldId: string, pagination: Pagination): Promise<LegalHoldItemRow[]> {
    return this.repository.listLegalHoldItems({ tenantId, legalHoldId, pagination });
  }

  async createDeletionJob(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    deletionTrigger: string;
  }): Promise<DeletionJobRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) => this.repository.findDeletionJob(input.tenantId, id));
    if (replay) {
      return replay;
    }
    const job = this.fromDomain(() => createDeletionJob({ ...input, requestedBy: input.actorId }));
    const persisted = await this.repository.createDeletionJob({ job, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.deletion_job_created", "deletion_job", persisted.id);
    return persisted;
  }

  listDeletionJobs(tenantId: string, pagination: Pagination): Promise<DeletionJobRow[]> {
    return this.repository.listDeletionJobs({ tenantId, pagination });
  }

  async getDeletionJob(tenantId: string, deletionJobId: string): Promise<DeletionJobRow> {
    const job = await this.repository.findDeletionJob(tenantId, deletionJobId);
    if (!job) {
      throw new NotFoundException("Deletion job not found.");
    }
    return job;
  }

  /**
   * Spec §22's own workflow: "Legal holds resolve to explicit protected objects before deletion."
   * The disposition is not taken as-is from the caller — if an active (unreleased) legal hold
   * covers this exact target, the deletion is forced to `blocked_by_hold` and no key destruction is
   * recorded, regardless of what the caller requested. This is the real behavior the gap sentence's
   * "destruction attestations" language depends on, not just another CRUD table.
   */
  async createDeletionItem(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    deletionJobId: string;
    targetType: RetentionTargetType;
    targetId: string;
    requestedDisposition?: DeletionItemDisposition;
    keyDestroyed?: boolean;
    proofHash?: string;
  }): Promise<DeletionItemRow> {
    const replay = await this.replayedRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository
        .listDeletionItems({ tenantId: input.tenantId, deletionJobId: input.deletionJobId, pagination: { limit: 200, offset: 0 } })
        .then((rows) => rows.find((r) => r.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const activeHold = await this.repository.findActiveLegalHoldForTarget(input.tenantId, input.targetType, input.targetId);
    const disposition: DeletionItemDisposition = activeHold ? "blocked_by_hold" : input.requestedDisposition ?? "deleted";
    const keyDestroyed = activeHold ? false : input.keyDestroyed ?? false;
    const proofHash = activeHold ? undefined : input.proofHash;
    const item = this.fromDomain(() =>
      createDeletionItem({
        tenantId: input.tenantId,
        deletionJobId: input.deletionJobId,
        targetType: input.targetType,
        targetId: input.targetId,
        disposition,
        keyDestroyed,
        proofHash
      })
    );
    const persisted = await this.repository.createDeletionItem({ item, actorId: input.actorId });
    await this.publishRecordMutation(input.tenantId, input.actorId, input.idempotencyKey, "privacy.deletion_item_created", "deletion_item", persisted.id);
    return persisted;
  }

  listDeletionItems(tenantId: string, deletionJobId: string, pagination: Pagination): Promise<DeletionItemRow[]> {
    return this.repository.listDeletionItems({ tenantId, deletionJobId, pagination });
  }

  private async updateRights(
    input: { tenantId: string; actorId: string; idempotencyKey: string; requestId: string },
    eventType: string,
    update: (request: RightsRequest) => RightsRequest
  ): Promise<RightsRequestRow> {
    const replay = await this.replayedRights(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const current = await this.getRightsRequest(input.tenantId, input.requestId);
    const updated = update(current);
    const persisted = await this.repository.updateRightsRequest({ request: updated, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType,
      aggregateType: "privacy_rights_request",
      aggregateId: persisted.id,
      payload: { rightsRequestId: persisted.id },
      body: { rightsRequestId: persisted.id, status: persisted.status }
    });
    return persisted;
  }

  private async replayedInventory(tenantId: string, idempotencyKey: string) {
    const payload = await this.replayedPayload(tenantId, idempotencyKey, "inventoryId");
    return payload ? this.getInventory(tenantId, String(payload.inventoryId)) : null;
  }

  private async replayedProcessing(tenantId: string, idempotencyKey: string) {
    const payload = await this.replayedPayload(tenantId, idempotencyKey, "processingActivityId");
    return payload ? this.getProcessingActivity(tenantId, String(payload.processingActivityId)) : null;
  }

  private async replayedDpia(tenantId: string, idempotencyKey: string) {
    const payload = await this.replayedPayload(tenantId, idempotencyKey, "dpiaId");
    return payload ? this.getDpia(tenantId, String(payload.dpiaId)) : null;
  }

  private async replayedRights(tenantId: string, idempotencyKey: string) {
    const payload = await this.replayedPayload(tenantId, idempotencyKey, "rightsRequestId");
    return payload ? this.getRightsRequest(tenantId, String(payload.rightsRequestId)) : null;
  }

  private async replayedConsent(tenantId: string, idempotencyKey: string) {
    const payload = await this.replayedPayload(tenantId, idempotencyKey, "consentId");
    return payload ? this.getConsent(tenantId, String(payload.consentId)) : null;
  }

  private async replayedIncident(tenantId: string, idempotencyKey: string) {
    const payload = await this.replayedPayload(tenantId, idempotencyKey, "incidentId");
    return payload ? this.getIncident(tenantId, String(payload.incidentId)) : null;
  }

  private async replayedRetention(tenantId: string, idempotencyKey: string) {
    const payload = await this.replayedPayload(tenantId, idempotencyKey, "retentionScheduleId");
    return payload ? this.getRetentionSchedule(tenantId, String(payload.retentionScheduleId)) : null;
  }

  private async replayedPayload(
    tenantId: string,
    idempotencyKey: string,
    expectedKey: keyof PrivacyPayload
  ): Promise<PrivacyPayload | null> {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as Partial<PrivacyPayload>;
    if (!payload[expectedKey]) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    return payload;
  }

  private async publishMutation(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    payload: PrivacyPayload;
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

  private async replayedRecord<T>(
    tenantId: string,
    idempotencyKey: string,
    fetchReplay: (recordId: string) => Promise<T | null>
  ): Promise<T | null> {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as Partial<PrivacyGraphPayload>;
    if (!payload.recordId) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    const replay = await fetchReplay(payload.recordId);
    if (!replay) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    return replay;
  }

  private async publishRecordMutation(
    tenantId: string,
    actorId: string,
    idempotencyKey: string,
    eventType: string,
    aggregateType: string,
    recordId: string
  ): Promise<void> {
    const now = new Date();
    const payload: PrivacyGraphPayload = { recordId };
    const outboxEvent = await this.outbox.publish({
      tenantId,
      eventType,
      aggregateType,
      aggregateId: recordId,
      payload,
      idempotencyKey,
      createdBy: actorId,
      now
    });
    if (outboxEvent.createdAt.getTime() !== now.getTime()) {
      return;
    }
    await this.auditLog.append({
      tenantId,
      eventType,
      actorId,
      targetType: aggregateType,
      targetId: recordId,
      traceId: idempotencyKey,
      classification: "confidential",
      body: { recordId }
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
