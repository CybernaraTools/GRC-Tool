import { createHash, randomUUID } from "node:crypto";

export type PrivacyClassification = "internal" | "confidential" | "restricted";
export type DpiaRiskLevel = "low" | "medium" | "high";
export type RightsRequestStatus = "open" | "verified" | "searching" | "exception_applied" | "completed";
export type ConsentStatus = "active" | "withdrawn";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type RetentionDecision = "retain" | "dispose" | "legal_hold_exception";

export interface DataInventoryRecord {
  id: string;
  tenantId: string;
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
}

export interface ProcessingActivity {
  id: string;
  tenantId: string;
  purpose: string;
  lawfulBasis: string;
  dataSubjectCategories: string[];
  recipients: string[];
  transfers: string[];
  retentionMonths: number;
  jurisdiction: string;
  inventoryRecordIds: string[];
  version: string;
}

export interface DpiaAssessment {
  id: string;
  tenantId: string;
  processingActivityId: string;
  riskLevel: DpiaRiskLevel;
  residualRiskScore: number;
  approvals: Array<{ actorId: string; role: string; approvedAt: Date }>;
  findings: string[];
  reviewObligationIds: string[];
}

export interface RightsRequest {
  id: string;
  tenantId: string;
  subjectId: string;
  requestType: "access" | "delete" | "correct" | "export" | "restrict";
  status: RightsRequestStatus;
  identityVerified: boolean;
  openedAt: Date;
  deadlineAt: Date;
  searchTasks: Array<{ systemName: string; ownerId: string; completed: boolean }>;
  exceptions: string[];
  communications: Array<{ channel: string; message: string; sentAt: Date }>;
  completionEvidenceIds: string[];
}

export interface ConsentRecord {
  id: string;
  tenantId: string;
  subjectId: string;
  purpose: string;
  version: string;
  region: string;
  status: ConsentStatus;
  history: Array<{ action: "granted" | "withdrawn"; actorId: string; at: Date; reason?: string }>;
}

export interface PrivacyIncident {
  id: string;
  tenantId: string;
  severity: IncidentSeverity;
  impactedProcessingActivityIds: string[];
  evidenceIds: string[];
  reportIds: string[];
  discoveredAt: Date;
  regulatorNotificationDueAt: Date;
  dataSubjectNotificationDueAt: Date;
  timeline: Array<{ event: string; actorId: string; at: Date }>;
  actions: Array<{ action: string; ownerId: string; dueAt: Date; completed: boolean }>;
}

export interface RetentionSchedule {
  id: string;
  tenantId: string;
  dataCategory: string;
  jurisdiction: string;
  residency: string;
  transferMechanism: string;
  retentionMonths: number;
  legalHold: boolean;
  disposalEvidenceIds: string[];
}

export function createDataInventoryRecord(input: Omit<DataInventoryRecord, "id">): DataInventoryRecord {
  if (input.dataElements.length === 0 || input.locations.length === 0) {
    throw new Error("Data inventory records require data elements and locations.");
  }
  if (input.processingActivityIds.length === 0) {
    throw new Error("Data inventory records must connect to processing activities.");
  }

  return { ...input, id: randomUUID(), dataElements: [...input.dataElements], locations: [...input.locations] };
}

export function createProcessingActivity(input: Omit<ProcessingActivity, "id" | "version">): ProcessingActivity {
  if (!input.lawfulBasis.trim() || !input.purpose.trim()) {
    throw new Error("Processing activities require purpose and lawful basis.");
  }
  if (input.inventoryRecordIds.length === 0 || input.retentionMonths <= 0) {
    throw new Error("Processing activities require inventory records and retention.");
  }

  return {
    ...input,
    id: randomUUID(),
    version: hashObject({
      purpose: input.purpose,
      lawfulBasis: input.lawfulBasis,
      jurisdiction: input.jurisdiction,
      recipients: input.recipients,
      transfers: input.transfers,
      retentionMonths: input.retentionMonths
    })
  };
}

export function createDpiaAssessment(input: Omit<DpiaAssessment, "id" | "reviewObligationIds">): DpiaAssessment {
  if (input.residualRiskScore < 0 || input.residualRiskScore > 100) {
    throw new Error("DPIA residual risk score must be within [0, 100].");
  }
  if (input.approvals.length === 0) {
    throw new Error("DPIA assessments require approvals.");
  }

  return {
    ...input,
    id: randomUUID(),
    reviewObligationIds:
      input.riskLevel === "high" ? [`review:${input.processingActivityId}:${input.residualRiskScore}`] : []
  };
}

export function createRightsRequest(input: {
  tenantId: string;
  subjectId: string;
  requestType: RightsRequest["requestType"];
  openedAt: Date;
  slaDays: number;
}): RightsRequest {
  if (input.slaDays <= 0) {
    throw new Error("Rights request SLA must be positive.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    subjectId: input.subjectId,
    requestType: input.requestType,
    status: "open",
    identityVerified: false,
    openedAt: input.openedAt,
    deadlineAt: new Date(input.openedAt.getTime() + input.slaDays * 24 * 60 * 60 * 1000),
    searchTasks: [],
    exceptions: [],
    communications: [],
    completionEvidenceIds: []
  };
}

export function verifyRightsRequestIdentity(request: RightsRequest): RightsRequest {
  return { ...request, identityVerified: true, status: "verified" };
}

export function addRightsSearchTask(
  request: RightsRequest,
  task: { systemName: string; ownerId: string }
): RightsRequest {
  if (!request.identityVerified) {
    throw new Error("Rights request identity must be verified before search tasks.");
  }

  return {
    ...request,
    status: "searching",
    searchTasks: [...request.searchTasks, { ...task, completed: false }]
  };
}

export function completeRightsRequest(
  request: RightsRequest,
  input: { completionEvidenceIds: string[]; communication: RightsRequest["communications"][number] }
): RightsRequest {
  if (input.completionEvidenceIds.length === 0) {
    throw new Error("Rights request completion requires evidence.");
  }

  return {
    ...request,
    status: "completed",
    searchTasks: request.searchTasks.map((task) => ({ ...task, completed: true })),
    completionEvidenceIds: [...request.completionEvidenceIds, ...input.completionEvidenceIds],
    communications: [...request.communications, input.communication]
  };
}

export function grantConsent(input: {
  tenantId: string;
  subjectId: string;
  purpose: string;
  version: string;
  region: string;
  actorId: string;
  at?: Date;
}): ConsentRecord {
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    subjectId: input.subjectId,
    purpose: input.purpose,
    version: input.version,
    region: input.region,
    status: "active",
    history: [{ action: "granted", actorId: input.actorId, at: input.at ?? new Date() }]
  };
}

export function withdrawConsent(
  consent: ConsentRecord,
  input: { actorId: string; reason: string; at?: Date }
): ConsentRecord {
  if (!input.reason.trim()) {
    throw new Error("Consent withdrawal requires a reason.");
  }

  return {
    ...consent,
    status: "withdrawn",
    history: [
      ...consent.history,
      { action: "withdrawn", actorId: input.actorId, at: input.at ?? new Date(), reason: input.reason }
    ]
  };
}

export function createPrivacyIncident(input: {
  tenantId: string;
  severity: IncidentSeverity;
  impactedProcessingActivityIds: string[];
  evidenceIds: string[];
  reportIds: string[];
  discoveredAt: Date;
  actorId: string;
}): PrivacyIncident {
  if (input.impactedProcessingActivityIds.length === 0) {
    throw new Error("Privacy incidents must link impacted processing.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    severity: input.severity,
    impactedProcessingActivityIds: [...input.impactedProcessingActivityIds],
    evidenceIds: [...input.evidenceIds],
    reportIds: [...input.reportIds],
    discoveredAt: input.discoveredAt,
    regulatorNotificationDueAt: new Date(input.discoveredAt.getTime() + 72 * 60 * 60 * 1000),
    dataSubjectNotificationDueAt: new Date(input.discoveredAt.getTime() + 72 * 60 * 60 * 1000),
    timeline: [{ event: "discovered", actorId: input.actorId, at: input.discoveredAt }],
    actions: []
  };
}

export function createRetentionSchedule(input: Omit<RetentionSchedule, "id">): RetentionSchedule {
  if (input.retentionMonths <= 0) {
    throw new Error("Retention schedules require a positive duration.");
  }

  return { ...input, id: randomUUID(), disposalEvidenceIds: [...input.disposalEvidenceIds] };
}

export function evaluateRetention(schedule: RetentionSchedule, ageMonths: number): RetentionDecision {
  if (schedule.legalHold) {
    return "legal_hold_exception";
  }
  return ageMonths >= schedule.retentionMonths ? "dispose" : "retain";
}

// G-08 (0022_g08_privacy_normalization.sql) — typed processing-graph domain types. See the
// migration's own header comment for the full scoping/reconciliation record.

export interface SystemAsset {
  id: string;
  tenantId: string;
  workspaceId?: string;
  name: string;
  assetType: string;
  ownerId: string;
  region?: string;
  criticality?: "low" | "medium" | "high" | "critical";
}

export function createSystemAsset(input: {
  tenantId: string;
  workspaceId?: string;
  name: string;
  assetType: string;
  ownerId: string;
  region?: string;
  criticality?: SystemAsset["criticality"];
}): SystemAsset {
  if (input.name.trim().length === 0) {
    throw new Error("name must not be blank.");
  }
  if (input.assetType.trim().length === 0) {
    throw new Error("assetType must not be blank.");
  }

  return { id: randomUUID(), ...input };
}

export type DataSensitivity = "low" | "moderate" | "high" | "special_category";

export interface DataCategory {
  id: string;
  tenantId: string;
  categoryKey: string;
  name: string;
  sensitivity: DataSensitivity;
}

export function createDataCategory(input: {
  tenantId: string;
  categoryKey: string;
  name: string;
  sensitivity: DataSensitivity;
}): DataCategory {
  if (input.categoryKey.trim().length === 0) {
    throw new Error("categoryKey must not be blank.");
  }

  return { id: randomUUID(), ...input };
}

export interface DataSubjectCategory {
  id: string;
  tenantId: string;
  subjectKey: string;
  name: string;
}

export function createDataSubjectCategory(input: { tenantId: string; subjectKey: string; name: string }): DataSubjectCategory {
  if (input.subjectKey.trim().length === 0) {
    throw new Error("subjectKey must not be blank.");
  }

  return { id: randomUUID(), ...input };
}

export type DataDiscoveryScanStatus = "running" | "succeeded" | "failed";

export interface DataDiscoveryScan {
  id: string;
  tenantId: string;
  systemId: string;
  connectorId: string;
  startedAt: Date;
  finishedAt?: Date;
  status: DataDiscoveryScanStatus;
  classifierVersion: string;
  idempotencyKey: string;
}

export function createDataDiscoveryScan(input: {
  tenantId: string;
  systemId: string;
  connectorId: string;
  classifierVersion: string;
  idempotencyKey: string;
  startedAt?: Date;
  status?: DataDiscoveryScanStatus;
}): DataDiscoveryScan {
  if (input.classifierVersion.trim().length === 0) {
    throw new Error("classifierVersion must not be blank.");
  }
  if (input.idempotencyKey.trim().length === 0) {
    throw new Error("idempotencyKey must not be blank.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    systemId: input.systemId,
    connectorId: input.connectorId,
    startedAt: input.startedAt ?? new Date(),
    status: input.status ?? "running",
    classifierVersion: input.classifierVersion,
    idempotencyKey: input.idempotencyKey
  };
}

export type DataDiscoveryReviewStatus = "pending" | "confirmed" | "rejected";

export interface DataDiscoveryFinding {
  id: string;
  tenantId: string;
  scanId: string;
  locatorHash: string;
  dataCategoryId: string;
  confidence: number;
  samplesProhibited: boolean;
  reviewStatus: DataDiscoveryReviewStatus;
}

export function createDataDiscoveryFinding(input: {
  tenantId: string;
  scanId: string;
  locatorHash: string;
  dataCategoryId: string;
  confidence: number;
  samplesProhibited?: boolean;
}): DataDiscoveryFinding {
  if (input.locatorHash.trim().length === 0) {
    throw new Error("locatorHash must not be blank.");
  }
  if (input.confidence < 0 || input.confidence > 1) {
    throw new Error("confidence must be between 0 and 1.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    scanId: input.scanId,
    locatorHash: input.locatorHash,
    dataCategoryId: input.dataCategoryId,
    confidence: input.confidence,
    samplesProhibited: input.samplesProhibited ?? false,
    reviewStatus: "pending"
  };
}

export type PrivacyNoticeStatus = "draft" | "published" | "retired";

export interface PrivacyNotice {
  id: string;
  tenantId: string;
  noticeKey: string;
  audience: string;
  ownerId: string;
  status: PrivacyNoticeStatus;
}

export function createPrivacyNotice(input: {
  tenantId: string;
  noticeKey: string;
  audience: string;
  ownerId: string;
}): PrivacyNotice {
  if (input.noticeKey.trim().length === 0) {
    throw new Error("noticeKey must not be blank.");
  }

  return { id: randomUUID(), ...input, status: "draft" };
}

export interface PrivacyNoticeVersion {
  id: string;
  tenantId: string;
  privacyNoticeId: string;
  noticeVersionNo: number;
  contentUri: string;
  sha256: string;
  jurisdictions: string[];
  effectiveFrom: Date;
  effectiveTo?: Date;
  approvedBy: string;
}

export function createPrivacyNoticeVersion(input: {
  tenantId: string;
  privacyNoticeId: string;
  noticeVersionNo: number;
  contentUri: string;
  sha256: string;
  jurisdictions: string[];
  effectiveFrom: Date;
  effectiveTo?: Date;
  approvedBy: string;
}): PrivacyNoticeVersion {
  if (input.noticeVersionNo < 1) {
    throw new Error("noticeVersionNo must be at least 1.");
  }
  if (input.contentUri.trim().length === 0) {
    throw new Error("contentUri must not be blank.");
  }
  if (input.sha256.trim().length !== 64) {
    throw new Error("sha256 must be a 64-character hex digest.");
  }

  return { id: randomUUID(), ...input, jurisdictions: [...input.jurisdictions] };
}

export type InventoryLinkRole = "source" | "destination" | "processor";

export interface ProcessingInventoryLink {
  id: string;
  tenantId: string;
  processingActivityId: string;
  inventoryRecordId: string;
  role: InventoryLinkRole;
}

export function createProcessingInventoryLink(input: {
  tenantId: string;
  processingActivityId: string;
  inventoryRecordId: string;
  role: InventoryLinkRole;
}): ProcessingInventoryLink {
  return { id: randomUUID(), ...input };
}

export interface Purpose {
  id: string;
  tenantId: string;
  purposeKey: string;
  name: string;
  description?: string;
}

export function createPurpose(input: { tenantId: string; purposeKey: string; name: string; description?: string }): Purpose {
  if (input.purposeKey.trim().length === 0) {
    throw new Error("purposeKey must not be blank.");
  }

  return { id: randomUUID(), ...input };
}

export interface LawfulBasis {
  id: string;
  tenantId: string;
  jurisdiction: string;
  basisKey: string;
  name: string;
  citation?: string;
}

export function createLawfulBasis(input: {
  tenantId: string;
  jurisdiction: string;
  basisKey: string;
  name: string;
  citation?: string;
}): LawfulBasis {
  if (input.basisKey.trim().length === 0) {
    throw new Error("basisKey must not be blank.");
  }

  return { id: randomUUID(), ...input };
}

export interface ProcessingPurposeAssignment {
  id: string;
  tenantId: string;
  processingActivityId: string;
  purposeId: string;
  lawfulBasisId: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export function createProcessingPurposeAssignment(input: {
  tenantId: string;
  processingActivityId: string;
  purposeId: string;
  lawfulBasisId: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}): ProcessingPurposeAssignment {
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    processingActivityId: input.processingActivityId,
    purposeId: input.purposeId,
    lawfulBasisId: input.lawfulBasisId,
    effectiveFrom: input.effectiveFrom ?? new Date(),
    effectiveTo: input.effectiveTo
  };
}

export type RecipientType = "controller" | "processor" | "sub_processor";

export interface Recipient {
  id: string;
  tenantId: string;
  name: string;
  recipientType: RecipientType;
  country: string;
  vendorId?: string;
}

export function createRecipient(input: {
  tenantId: string;
  name: string;
  recipientType: RecipientType;
  country: string;
  vendorId?: string;
}): Recipient {
  if (input.name.trim().length === 0) {
    throw new Error("name must not be blank.");
  }

  return { id: randomUUID(), ...input };
}

export interface ProcessingRecipientLink {
  id: string;
  tenantId: string;
  processingActivityId: string;
  recipientId: string;
  purposeId: string;
  dataCategoryIds: string[];
}

export function createProcessingRecipientLink(input: {
  tenantId: string;
  processingActivityId: string;
  recipientId: string;
  purposeId: string;
  dataCategoryIds?: string[];
}): ProcessingRecipientLink {
  return { id: randomUUID(), ...input, dataCategoryIds: [...(input.dataCategoryIds ?? [])] };
}

export type TransferMechanism = "sccs" | "adequacy_decision" | "bcr" | "derogation";
export type TransferStatus = "active" | "suspended" | "terminated";

export interface Transfer {
  id: string;
  tenantId: string;
  processingActivityId: string;
  fromCountry: string;
  toCountry: string;
  mechanism: TransferMechanism;
  safeguards?: string;
  status: TransferStatus;
}

export function createTransfer(input: {
  tenantId: string;
  processingActivityId: string;
  fromCountry: string;
  toCountry: string;
  mechanism: TransferMechanism;
  safeguards?: string;
}): Transfer {
  if (input.fromCountry.trim().length === 0 || input.toCountry.trim().length === 0) {
    throw new Error("fromCountry and toCountry must not be blank.");
  }

  return { id: randomUUID(), ...input, status: "active" };
}

export type DpiaStatus = "draft" | "in_review" | "approved" | "rejected";

export interface Dpia {
  id: string;
  tenantId: string;
  processingActivityId: string;
  triggerReason: string;
  status: DpiaStatus;
  ownerId: string;
  approvedBy?: string;
  approvedAt?: Date;
}

export function createDpia(input: {
  tenantId: string;
  processingActivityId: string;
  triggerReason: string;
  ownerId: string;
}): Dpia {
  if (input.triggerReason.trim().length === 0) {
    throw new Error("triggerReason must not be blank.");
  }

  return { id: randomUUID(), ...input, status: "draft" };
}

export type DpiaRiskLikelihoodImpact = "low" | "medium" | "high";

export interface DpiaRisk {
  id: string;
  tenantId: string;
  dpiaId: string;
  description: string;
  likelihood: DpiaRiskLikelihoodImpact;
  impact: DpiaRiskLikelihoodImpact;
  treatment?: string;
  residualScore: number;
}

export function createDpiaRisk(input: {
  tenantId: string;
  dpiaId: string;
  description: string;
  likelihood: DpiaRiskLikelihoodImpact;
  impact: DpiaRiskLikelihoodImpact;
  treatment?: string;
  residualScore: number;
}): DpiaRisk {
  if (input.description.trim().length === 0) {
    throw new Error("description must not be blank.");
  }
  if (input.residualScore < 0 || input.residualScore > 100) {
    throw new Error("residualScore must be between 0 and 100.");
  }

  return { id: randomUUID(), ...input };
}

export type RightsRequestTaskType = "search" | "decision" | "fulfillment";
export type RightsRequestTaskStatus = "pending" | "in_progress" | "completed" | "blocked";

export interface RightsRequestTask {
  id: string;
  tenantId: string;
  rightsRequestId: string;
  systemId: string;
  ownerId: string;
  taskType: RightsRequestTaskType;
  status: RightsRequestTaskStatus;
  resultRef?: string;
}

export function createRightsRequestTask(input: {
  tenantId: string;
  rightsRequestId: string;
  systemId: string;
  ownerId: string;
  taskType: RightsRequestTaskType;
}): RightsRequestTask {
  return { id: randomUUID(), ...input, status: "pending" };
}

export interface ConsentPurposeVersion {
  id: string;
  tenantId: string;
  purposeId: string;
  noticeVersionId: string;
  channel: string;
  region: string;
  activeFrom: Date;
  activeTo?: Date;
}

export function createConsentPurposeVersion(input: {
  tenantId: string;
  purposeId: string;
  noticeVersionId: string;
  channel: string;
  region: string;
  activeFrom?: Date;
  activeTo?: Date;
}): ConsentPurposeVersion {
  if (input.channel.trim().length === 0 || input.region.trim().length === 0) {
    throw new Error("channel and region must not be blank.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    purposeId: input.purposeId,
    noticeVersionId: input.noticeVersionId,
    channel: input.channel,
    region: input.region,
    activeFrom: input.activeFrom ?? new Date(),
    activeTo: input.activeTo
  };
}

export type ConsentEventType = "granted" | "withdrawn" | "updated";

export interface ConsentEvent {
  id: string;
  tenantId: string;
  subjectToken: string;
  consentPurposeId: string;
  eventType: ConsentEventType;
  occurredAt: Date;
  source: string;
  proofHash: string;
  idempotencyKey: string;
  recordedBy: string;
}

export function createConsentEvent(input: {
  tenantId: string;
  subjectToken: string;
  consentPurposeId: string;
  eventType: ConsentEventType;
  source: string;
  proofHash: string;
  idempotencyKey: string;
  recordedBy: string;
  occurredAt?: Date;
}): ConsentEvent {
  if (input.subjectToken.trim().length === 0) {
    throw new Error("subjectToken must not be blank.");
  }
  if (input.proofHash.trim().length === 0) {
    throw new Error("proofHash must not be blank.");
  }
  if (input.idempotencyKey.trim().length === 0) {
    throw new Error("idempotencyKey must not be blank.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    subjectToken: input.subjectToken,
    consentPurposeId: input.consentPurposeId,
    eventType: input.eventType,
    occurredAt: input.occurredAt ?? new Date(),
    source: input.source,
    proofHash: input.proofHash,
    idempotencyKey: input.idempotencyKey,
    recordedBy: input.recordedBy
  };
}

export interface IncidentAssessment {
  id: string;
  tenantId: string;
  incidentId: string;
  jurisdiction: string;
  reportable: boolean;
  rationale: string;
  assessorId: string;
  decidedAt: Date;
  assessmentVersionNo: number;
}

export function createIncidentAssessment(input: {
  tenantId: string;
  incidentId: string;
  jurisdiction: string;
  reportable: boolean;
  rationale: string;
  assessorId: string;
  assessmentVersionNo?: number;
  decidedAt?: Date;
}): IncidentAssessment {
  if (input.rationale.trim().length === 0) {
    throw new Error("rationale must not be blank.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    incidentId: input.incidentId,
    jurisdiction: input.jurisdiction,
    reportable: input.reportable,
    rationale: input.rationale,
    assessorId: input.assessorId,
    decidedAt: input.decidedAt ?? new Date(),
    assessmentVersionNo: input.assessmentVersionNo ?? 1
  };
}

export type IncidentNotificationRecipientType = "regulator" | "data_subject" | "partner";

export interface IncidentNotification {
  id: string;
  tenantId: string;
  incidentId: string;
  recipientType: IncidentNotificationRecipientType;
  jurisdiction: string;
  dueAt: Date;
  sentAt?: Date;
  artifactId?: string;
}

export function createIncidentNotification(input: {
  tenantId: string;
  incidentId: string;
  recipientType: IncidentNotificationRecipientType;
  jurisdiction: string;
  dueAt: Date;
}): IncidentNotification {
  return { id: randomUUID(), ...input };
}

export type RetentionDisposition = "delete" | "anonymize" | "archive";

export interface RetentionRule {
  id: string;
  tenantId: string;
  dataCategoryId: string;
  jurisdiction: string;
  retentionTrigger: string;
  durationDays: number;
  disposition: RetentionDisposition;
}

export function createRetentionRule(input: {
  tenantId: string;
  dataCategoryId: string;
  jurisdiction: string;
  retentionTrigger: string;
  durationDays: number;
  disposition: RetentionDisposition;
}): RetentionRule {
  if (input.retentionTrigger.trim().length === 0) {
    throw new Error("retentionTrigger must not be blank.");
  }
  if (input.durationDays <= 0) {
    throw new Error("durationDays must be positive.");
  }

  return { id: randomUUID(), ...input };
}

// G-12 (0023_g12_retention_deletion.sql) — retention assignment, legal hold, and deletion
// workflow domain types. See the migration's own header comment for the full
// scoping/reconciliation record.

export type RetentionTargetType = "data_inventory_record" | "evidence_object" | "evidence_version" | "rights_request" | "consent_event";

export interface RetentionAssignment {
  id: string;
  tenantId: string;
  retentionRuleId: string;
  targetType: RetentionTargetType;
  targetId: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export function createRetentionAssignment(input: {
  tenantId: string;
  retentionRuleId: string;
  targetType: RetentionTargetType;
  targetId: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}): RetentionAssignment {
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    retentionRuleId: input.retentionRuleId,
    targetType: input.targetType,
    targetId: input.targetId,
    effectiveFrom: input.effectiveFrom ?? new Date(),
    effectiveTo: input.effectiveTo
  };
}

export interface LegalHold {
  id: string;
  tenantId: string;
  holdKey: string;
  reason: string;
  issuedBy: string;
  issuedAt: Date;
  releasedAt?: Date;
  scopeJson: Record<string, unknown>;
}

export function createLegalHold(input: {
  tenantId: string;
  holdKey: string;
  reason: string;
  issuedBy: string;
  issuedAt?: Date;
  scopeJson?: Record<string, unknown>;
}): LegalHold {
  if (input.holdKey.trim().length === 0) {
    throw new Error("holdKey must not be blank.");
  }
  if (input.reason.trim().length === 0) {
    throw new Error("reason must not be blank.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    holdKey: input.holdKey,
    reason: input.reason,
    issuedBy: input.issuedBy,
    issuedAt: input.issuedAt ?? new Date(),
    scopeJson: input.scopeJson ?? {}
  };
}

export function releaseLegalHold(hold: LegalHold, releasedAt?: Date): LegalHold {
  if (hold.releasedAt) {
    throw new Error("Legal hold has already been released.");
  }
  return { ...hold, releasedAt: releasedAt ?? new Date() };
}

export interface LegalHoldItem {
  id: string;
  tenantId: string;
  legalHoldId: string;
  targetType: RetentionTargetType;
  targetId: string;
}

export function createLegalHoldItem(input: {
  tenantId: string;
  legalHoldId: string;
  targetType: RetentionTargetType;
  targetId: string;
}): LegalHoldItem {
  return { id: randomUUID(), ...input };
}

export type DeletionJobStatus = "requested" | "running" | "completed" | "failed";

export interface DeletionJob {
  id: string;
  tenantId: string;
  deletionTrigger: string;
  requestedBy: string;
  status: DeletionJobStatus;
  startedAt?: Date;
  finishedAt?: Date;
}

export function createDeletionJob(input: {
  tenantId: string;
  deletionTrigger: string;
  requestedBy: string;
}): DeletionJob {
  if (input.deletionTrigger.trim().length === 0) {
    throw new Error("deletionTrigger must not be blank.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    deletionTrigger: input.deletionTrigger,
    requestedBy: input.requestedBy,
    status: "requested"
  };
}

export type DeletionItemDisposition = "deleted" | "anonymized" | "blocked_by_hold" | "not_found";

export interface DeletionItem {
  id: string;
  tenantId: string;
  deletionJobId: string;
  targetType: RetentionTargetType;
  targetId: string;
  disposition: DeletionItemDisposition;
  keyDestroyed: boolean;
  proofHash?: string;
}

export function createDeletionItem(input: {
  tenantId: string;
  deletionJobId: string;
  targetType: RetentionTargetType;
  targetId: string;
  disposition: DeletionItemDisposition;
  keyDestroyed?: boolean;
  proofHash?: string;
}): DeletionItem {
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    deletionJobId: input.deletionJobId,
    targetType: input.targetType,
    targetId: input.targetId,
    disposition: input.disposition,
    keyDestroyed: input.keyDestroyed ?? false,
    proofHash: input.proofHash
  };
}

function hashObject(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
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
