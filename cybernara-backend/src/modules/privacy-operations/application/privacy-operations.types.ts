import type { Pagination } from "../../../shared/pagination.js";
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

export interface PrivacyRecordMetadata {
  versionNumber: number;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

// privacy_notice_versions/consent_events are append-only (0022) — no updated_by/updated_at column exists.
export interface PrivacyAppendOnlyMetadata {
  classification: string;
  createdBy: string;
  createdAt: Date;
}

export type DataInventoryRecordRow = DataInventoryRecord & PrivacyRecordMetadata;
export type ProcessingActivityRow = ProcessingActivity & PrivacyRecordMetadata;
export type DpiaAssessmentRow = DpiaAssessment & PrivacyRecordMetadata;
export type RightsRequestRow = RightsRequest & PrivacyRecordMetadata;
export type ConsentRecordRow = ConsentRecord & PrivacyRecordMetadata;
export type PrivacyIncidentRow = PrivacyIncident & PrivacyRecordMetadata;
export type RetentionScheduleRow = RetentionSchedule & PrivacyRecordMetadata;

export type SystemAssetRow = SystemAsset & PrivacyRecordMetadata;
export type DataCategoryRow = DataCategory & PrivacyRecordMetadata;
export type DataSubjectCategoryRow = DataSubjectCategory & PrivacyRecordMetadata;
export type DataDiscoveryScanRow = DataDiscoveryScan & PrivacyRecordMetadata;
export type DataDiscoveryFindingRow = DataDiscoveryFinding & PrivacyRecordMetadata;
export type PrivacyNoticeRow = PrivacyNotice & PrivacyRecordMetadata;
export type PrivacyNoticeVersionRow = PrivacyNoticeVersion & PrivacyAppendOnlyMetadata;
export type ProcessingInventoryLinkRow = ProcessingInventoryLink & PrivacyRecordMetadata;
export type PurposeRow = Purpose & PrivacyRecordMetadata;
export type LawfulBasisRow = LawfulBasis & PrivacyRecordMetadata;
export type ProcessingPurposeAssignmentRow = ProcessingPurposeAssignment & PrivacyRecordMetadata;
export type RecipientRow = Recipient & PrivacyRecordMetadata;
export type ProcessingRecipientLinkRow = ProcessingRecipientLink & PrivacyRecordMetadata;
export type TransferRow = Transfer & PrivacyRecordMetadata;
export type DpiaRow = Dpia & PrivacyRecordMetadata;
export type DpiaRiskRow = DpiaRisk & PrivacyRecordMetadata;
export type RightsRequestTaskRow = RightsRequestTask & PrivacyRecordMetadata;
export type ConsentPurposeVersionRow = ConsentPurposeVersion & PrivacyRecordMetadata;
export type ConsentEventRow = ConsentEvent & PrivacyAppendOnlyMetadata;
export type IncidentAssessmentRow = IncidentAssessment & PrivacyRecordMetadata;
export type IncidentNotificationRow = IncidentNotification & PrivacyRecordMetadata;
export type RetentionRuleRow = RetentionRule & PrivacyRecordMetadata;
export type RetentionAssignmentRow = RetentionAssignment & PrivacyRecordMetadata;
export type LegalHoldRow = LegalHold & PrivacyRecordMetadata;
export type LegalHoldItemRow = LegalHoldItem & PrivacyRecordMetadata;
export type DeletionJobRow = DeletionJob & PrivacyRecordMetadata;
export type DeletionItemRow = DeletionItem & PrivacyRecordMetadata;

export interface PrivacyOperationsRepository {
  createInventory(input: { record: DataInventoryRecord; actorId: string }): Promise<DataInventoryRecordRow>;
  listInventory(input: { tenantId: string; pagination: Pagination }): Promise<DataInventoryRecordRow[]>;
  findInventory(tenantId: string, recordId: string): Promise<DataInventoryRecordRow | null>;
  createProcessingActivity(input: {
    activity: ProcessingActivity;
    actorId: string;
  }): Promise<ProcessingActivityRow>;
  listProcessingActivities(input: { tenantId: string; pagination: Pagination }): Promise<ProcessingActivityRow[]>;
  findProcessingActivity(tenantId: string, activityId: string): Promise<ProcessingActivityRow | null>;
  createDpia(input: { dpia: DpiaAssessment; actorId: string }): Promise<DpiaAssessmentRow>;
  listDpias(input: { tenantId: string; pagination: Pagination }): Promise<DpiaAssessmentRow[]>;
  findDpia(tenantId: string, dpiaId: string): Promise<DpiaAssessmentRow | null>;
  createRightsRequest(input: { request: RightsRequest; actorId: string }): Promise<RightsRequestRow>;
  updateRightsRequest(input: { request: RightsRequest; actorId: string }): Promise<RightsRequestRow>;
  listRightsRequests(input: { tenantId: string; pagination: Pagination }): Promise<RightsRequestRow[]>;
  findRightsRequest(tenantId: string, requestId: string): Promise<RightsRequestRow | null>;
  createConsent(input: { consent: ConsentRecord; actorId: string }): Promise<ConsentRecordRow>;
  updateConsent(input: { consent: ConsentRecord; actorId: string }): Promise<ConsentRecordRow>;
  listConsents(input: { tenantId: string; pagination: Pagination }): Promise<ConsentRecordRow[]>;
  findConsent(tenantId: string, consentId: string): Promise<ConsentRecordRow | null>;
  createIncident(input: { incident: PrivacyIncident; actorId: string }): Promise<PrivacyIncidentRow>;
  listIncidents(input: { tenantId: string; pagination: Pagination }): Promise<PrivacyIncidentRow[]>;
  findIncident(tenantId: string, incidentId: string): Promise<PrivacyIncidentRow | null>;
  createRetentionSchedule(input: {
    schedule: RetentionSchedule;
    actorId: string;
  }): Promise<RetentionScheduleRow>;
  listRetentionSchedules(input: { tenantId: string; pagination: Pagination }): Promise<RetentionScheduleRow[]>;
  findRetentionSchedule(tenantId: string, scheduleId: string): Promise<RetentionScheduleRow | null>;

  createSystemAsset(input: { asset: SystemAsset; actorId: string }): Promise<SystemAssetRow>;
  listSystemAssets(input: { tenantId: string; pagination: Pagination }): Promise<SystemAssetRow[]>;

  createDataCategory(input: { category: DataCategory; actorId: string }): Promise<DataCategoryRow>;
  listDataCategories(input: { tenantId: string; pagination: Pagination }): Promise<DataCategoryRow[]>;

  createDataSubjectCategory(input: {
    category: DataSubjectCategory;
    actorId: string;
  }): Promise<DataSubjectCategoryRow>;
  listDataSubjectCategories(input: { tenantId: string; pagination: Pagination }): Promise<DataSubjectCategoryRow[]>;

  createDataDiscoveryScan(input: { scan: DataDiscoveryScan; actorId: string }): Promise<DataDiscoveryScanRow>;
  listDataDiscoveryScans(input: { tenantId: string; systemId: string; pagination: Pagination }): Promise<DataDiscoveryScanRow[]>;

  createDataDiscoveryFinding(input: {
    finding: DataDiscoveryFinding;
    actorId: string;
  }): Promise<DataDiscoveryFindingRow>;
  listDataDiscoveryFindings(input: { tenantId: string; scanId: string; pagination: Pagination }): Promise<DataDiscoveryFindingRow[]>;

  createPrivacyNotice(input: { notice: PrivacyNotice; actorId: string }): Promise<PrivacyNoticeRow>;
  listPrivacyNotices(input: { tenantId: string; pagination: Pagination }): Promise<PrivacyNoticeRow[]>;
  findPrivacyNotice(tenantId: string, noticeId: string): Promise<PrivacyNoticeRow | null>;

  createPrivacyNoticeVersion(input: {
    version: PrivacyNoticeVersion;
    actorId: string;
  }): Promise<PrivacyNoticeVersionRow>;
  listPrivacyNoticeVersions(input: {
    tenantId: string;
    privacyNoticeId: string;
    pagination: Pagination;
  }): Promise<PrivacyNoticeVersionRow[]>;
  findPrivacyNoticeVersion(tenantId: string, versionId: string): Promise<PrivacyNoticeVersionRow | null>;

  createProcessingInventoryLink(input: {
    link: ProcessingInventoryLink;
    actorId: string;
  }): Promise<ProcessingInventoryLinkRow>;
  listProcessingInventoryLinks(input: {
    tenantId: string;
    processingActivityId: string;
    pagination: Pagination;
  }): Promise<ProcessingInventoryLinkRow[]>;

  createPurpose(input: { purpose: Purpose; actorId: string }): Promise<PurposeRow>;
  listPurposes(input: { tenantId: string; pagination: Pagination }): Promise<PurposeRow[]>;

  createLawfulBasis(input: { basis: LawfulBasis; actorId: string }): Promise<LawfulBasisRow>;
  listLawfulBases(input: { tenantId: string; pagination: Pagination }): Promise<LawfulBasisRow[]>;

  createProcessingPurposeAssignment(input: {
    assignment: ProcessingPurposeAssignment;
    actorId: string;
  }): Promise<ProcessingPurposeAssignmentRow>;
  listProcessingPurposeAssignments(input: {
    tenantId: string;
    processingActivityId: string;
    pagination: Pagination;
  }): Promise<ProcessingPurposeAssignmentRow[]>;

  createRecipient(input: { recipient: Recipient; actorId: string }): Promise<RecipientRow>;
  listRecipients(input: { tenantId: string; pagination: Pagination }): Promise<RecipientRow[]>;

  createProcessingRecipientLink(input: {
    link: ProcessingRecipientLink;
    actorId: string;
  }): Promise<ProcessingRecipientLinkRow>;
  listProcessingRecipientLinks(input: {
    tenantId: string;
    processingActivityId: string;
    pagination: Pagination;
  }): Promise<ProcessingRecipientLinkRow[]>;

  createTransfer(input: { transfer: Transfer; actorId: string }): Promise<TransferRow>;
  listTransfers(input: { tenantId: string; processingActivityId: string; pagination: Pagination }): Promise<TransferRow[]>;

  createDpiaV2(input: { dpia: Dpia; actorId: string }): Promise<DpiaRow>;
  listDpiasV2(input: { tenantId: string; pagination: Pagination }): Promise<DpiaRow[]>;

  createDpiaRisk(input: { risk: DpiaRisk; actorId: string }): Promise<DpiaRiskRow>;
  listDpiaRisks(input: { tenantId: string; dpiaId: string; pagination: Pagination }): Promise<DpiaRiskRow[]>;

  createRightsRequestTask(input: {
    task: RightsRequestTask;
    actorId: string;
  }): Promise<RightsRequestTaskRow>;
  listRightsRequestTasks(input: {
    tenantId: string;
    rightsRequestId: string;
    pagination: Pagination;
  }): Promise<RightsRequestTaskRow[]>;

  createConsentPurposeVersion(input: {
    version: ConsentPurposeVersion;
    actorId: string;
  }): Promise<ConsentPurposeVersionRow>;
  listConsentPurposeVersions(input: { tenantId: string; pagination: Pagination }): Promise<ConsentPurposeVersionRow[]>;

  createConsentEvent(input: { event: ConsentEvent; actorId: string }): Promise<ConsentEventRow>;
  listConsentEvents(input: { tenantId: string; subjectToken: string; pagination: Pagination }): Promise<ConsentEventRow[]>;

  createIncidentAssessment(input: {
    assessment: IncidentAssessment;
    actorId: string;
  }): Promise<IncidentAssessmentRow>;
  listIncidentAssessments(input: { tenantId: string; incidentId: string; pagination: Pagination }): Promise<IncidentAssessmentRow[]>;

  createIncidentNotification(input: {
    notification: IncidentNotification;
    actorId: string;
  }): Promise<IncidentNotificationRow>;
  listIncidentNotifications(input: {
    tenantId: string;
    incidentId: string;
    pagination: Pagination;
  }): Promise<IncidentNotificationRow[]>;

  createRetentionRule(input: { rule: RetentionRule; actorId: string }): Promise<RetentionRuleRow>;
  listRetentionRules(input: { tenantId: string; pagination: Pagination }): Promise<RetentionRuleRow[]>;

  createRetentionAssignment(input: {
    assignment: RetentionAssignment;
    actorId: string;
  }): Promise<RetentionAssignmentRow>;
  listRetentionAssignments(input: {
    tenantId: string;
    targetType: string;
    targetId: string;
    pagination: Pagination;
  }): Promise<RetentionAssignmentRow[]>;

  createLegalHold(input: { hold: LegalHold; actorId: string }): Promise<LegalHoldRow>;
  updateLegalHold(input: { hold: LegalHold; actorId: string }): Promise<LegalHoldRow>;
  listLegalHolds(input: { tenantId: string; pagination: Pagination }): Promise<LegalHoldRow[]>;
  findLegalHold(tenantId: string, legalHoldId: string): Promise<LegalHoldRow | null>;

  createLegalHoldItem(input: { item: LegalHoldItem; actorId: string }): Promise<LegalHoldItemRow>;
  listLegalHoldItems(input: {
    tenantId: string;
    legalHoldId: string;
    pagination: Pagination;
  }): Promise<LegalHoldItemRow[]>;
  findActiveLegalHoldForTarget(tenantId: string, targetType: string, targetId: string): Promise<LegalHoldItemRow | null>;

  createDeletionJob(input: { job: DeletionJob; actorId: string }): Promise<DeletionJobRow>;
  updateDeletionJob(input: { job: DeletionJob; actorId: string }): Promise<DeletionJobRow>;
  listDeletionJobs(input: { tenantId: string; pagination: Pagination }): Promise<DeletionJobRow[]>;
  findDeletionJob(tenantId: string, deletionJobId: string): Promise<DeletionJobRow | null>;

  createDeletionItem(input: { item: DeletionItem; actorId: string }): Promise<DeletionItemRow>;
  listDeletionItems(input: {
    tenantId: string;
    deletionJobId: string;
    pagination: Pagination;
  }): Promise<DeletionItemRow[]>;
}
