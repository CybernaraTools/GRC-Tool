import { createHash, randomUUID } from "node:crypto";

export type PolicyStatus = "draft" | "in_review" | "approved" | "published" | "retired";
export type VendorTier = "low" | "medium" | "high" | "critical";
export type AuditStatus = "planned" | "fieldwork" | "management_response" | "closed";

export interface PolicyVersion {
  id: string;
  tenantId: string;
  templateKey: string;
  title: string;
  version: string;
  status: PolicyStatus;
  approverId?: string;
  publishedAt?: Date;
  attestationEvidenceIds: string[];
  exceptions: Array<{ ownerId: string; reason: string; expiresAt: Date }>;
  contentHash: string;
}

export interface AccessReview {
  id: string;
  tenantId: string;
  populationSource: string;
  certifierId: string;
  decisions: Array<{ subjectId: string; resourceId: string; decision: "approved" | "revoked"; evidenceId: string }>;
  remediationTaskIds: string[];
}

export interface VendorRecord {
  id: string;
  tenantId: string;
  name: string;
  tier: VendorTier;
  systems: string[];
  contractIds: string[];
  controlIds: string[];
  incidentIds: string[];
  questionnaireIds: string[];
  monitoringFindings: string[];
  renewalAt: Date;
}

export interface AuditEngagement {
  id: string;
  tenantId: string;
  name: string;
  status: AuditStatus;
  requestListIds: string[];
  evidenceIds: string[];
  findingIds: string[];
  managementResponses: Array<{ ownerId: string; response: string; dueAt: Date }>;
}

export interface TrustCenterArtifact {
  id: string;
  tenantId: string;
  title: string;
  version: string;
  approved: boolean;
  visibility: "public" | "private";
  artifactEvidenceId: string;
  ndaRequired: boolean;
  crmAccountId?: string;
  downloadEvents: Array<{ actorId: string; downloadedAt: Date }>;
}

export interface GrcWorkspace {
  id: string;
  tenantId: string;
  businessUnit: string;
  parentWorkspaceId?: string;
  inheritedControlIds: string[];
  delegatedAdminIds: string[];
}

export type CustomObjectDefinitionStatus = "draft" | "active" | "deprecated";
export type CustomRecordStatus = "active" | "archived";
export type CustomFieldDataType = "text" | "number" | "boolean" | "date" | "datetime" | "uuid" | "json" | "enum";

export interface CustomObjectDefinition {
  id: string;
  tenantId: string;
  objectKey: string;
  fields: Array<{ key: string; type: "text" | "number" | "date" | "boolean"; required: boolean }>;
  workflowStates: string[];
  permissionRoleIds: string[];
  upgradeSafe: boolean;
  connectorSdkEnabled: boolean;
  // G-13 (0025): additive columns reconciling this pre-existing table with spec's own literal
  // column list for it. `status` defaults to "active" (matching the migration's own column
  // default) so every pre-G-13 call site building this object without the field keeps working.
  status?: CustomObjectDefinitionStatus;
  validationSchema?: Record<string, unknown>;
}

// G-13 (0025): normalized field/record/value tables underneath `custom_object_definitions`,
// closing the "definitions exist without fields[as rows], records, values, validation" half of the
// gap sentence. `custom_records.objectDefinitionId` is a plain FK (not a polymorphic target_type
// pair) — a custom record only ever belongs to exactly one kind of parent, unlike this campaign's
// genuinely multi-target polymorphic tables (risk_links, evidence_links, retention_assignments).
export interface CustomFieldDefinition {
  id: string;
  tenantId: string;
  objectDefinitionId: string;
  fieldKey: string;
  dataType: CustomFieldDataType;
  required: boolean;
  validationJson: Record<string, unknown>;
}

export interface CustomRecord {
  id: string;
  tenantId: string;
  objectDefinitionId: string;
  recordKey: string;
  status: CustomRecordStatus;
}

export interface CustomValue {
  id: string;
  tenantId: string;
  recordId: string;
  fieldDefinitionId: string;
  valueJson?: unknown;
  searchText?: string;
}

export function draftPolicy(input: {
  tenantId: string;
  templateKey: string;
  title: string;
  version: string;
  content: string;
}): PolicyVersion {
  if (!input.templateKey.trim() || !input.content.trim()) {
    throw new Error("Policies require template and content.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    templateKey: input.templateKey,
    title: input.title,
    version: input.version,
    status: "draft",
    attestationEvidenceIds: [],
    exceptions: [],
    contentHash: sha256(input.content)
  };
}

export function publishPolicy(
  policy: PolicyVersion,
  input: { approverId: string; attestationEvidenceIds: string[]; publishedAt?: Date }
): PolicyVersion {
  if (!input.approverId || input.attestationEvidenceIds.length === 0) {
    throw new Error("Policy publication requires approval and attestation evidence.");
  }

  return {
    ...policy,
    status: "published",
    approverId: input.approverId,
    publishedAt: input.publishedAt ?? new Date(),
    attestationEvidenceIds: [...input.attestationEvidenceIds]
  };
}

export function addPolicyException(
  policy: PolicyVersion,
  exception: { ownerId: string; reason: string; expiresAt: Date }
): PolicyVersion {
  if (!exception.reason.trim()) {
    throw new Error("Policy exceptions require rationale.");
  }

  return { ...policy, exceptions: [...policy.exceptions, exception] };
}

export function createAccessReview(input: Omit<AccessReview, "id" | "remediationTaskIds">): AccessReview {
  if (input.decisions.length === 0) {
    throw new Error("Access reviews require certification decisions.");
  }
  for (const decision of input.decisions) {
    if (!decision.evidenceId) {
      throw new Error("Access review decisions must retain evidence.");
    }
  }

  return {
    ...input,
    id: randomUUID(),
    remediationTaskIds: input.decisions
      .filter((decision) => decision.decision === "revoked")
      .map((decision) => `remediate:${decision.subjectId}:${decision.resourceId}`)
  };
}

export function createVendorRecord(input: Omit<VendorRecord, "id">): VendorRecord {
  if (input.systems.length === 0 || input.contractIds.length === 0) {
    throw new Error("Vendors require systems and contracts.");
  }

  return { ...input, id: randomUUID() };
}

export function createAuditEngagement(input: Omit<AuditEngagement, "id">): AuditEngagement {
  if (input.requestListIds.length === 0 || input.evidenceIds.length === 0) {
    throw new Error("Audits require request lists and shared evidence lineage.");
  }

  return { ...input, id: randomUUID() };
}

export function publishTrustCenterArtifact(input: Omit<TrustCenterArtifact, "id" | "downloadEvents">): TrustCenterArtifact {
  if (!input.approved) {
    throw new Error("Only approved trust center artifacts can be published.");
  }
  if (input.visibility === "private" && !input.ndaRequired) {
    throw new Error("Private trust center artifacts require gated access controls.");
  }

  return { ...input, id: randomUUID(), downloadEvents: [] };
}

export function recordTrustCenterDownload(
  artifact: TrustCenterArtifact,
  input: { actorId: string; downloadedAt?: Date }
): TrustCenterArtifact {
  return {
    ...artifact,
    downloadEvents: [...artifact.downloadEvents, { actorId: input.actorId, downloadedAt: input.downloadedAt ?? new Date() }]
  };
}

export function createWorkspace(input: Omit<GrcWorkspace, "id">): GrcWorkspace {
  if (input.inheritedControlIds.length === 0 || input.delegatedAdminIds.length === 0) {
    throw new Error("Workspaces require inherited controls and delegated administrators.");
  }

  return { ...input, id: randomUUID() };
}

export function createCustomObjectDefinition(input: Omit<CustomObjectDefinition, "id">): CustomObjectDefinition {
  if (!input.upgradeSafe || input.permissionRoleIds.length === 0) {
    throw new Error("Custom objects must be upgrade-safe and permission-controlled.");
  }
  if (input.fields.length === 0 || input.workflowStates.length === 0) {
    throw new Error("Custom objects require fields and workflow states.");
  }

  return { ...input, id: randomUUID(), status: input.status ?? "active" };
}

export function createCustomFieldDefinition(input: Omit<CustomFieldDefinition, "id">): CustomFieldDefinition {
  if (!input.fieldKey.trim()) {
    throw new Error("fieldKey is required.");
  }
  return { ...input, id: randomUUID() };
}

export function createCustomRecord(input: Omit<CustomRecord, "id" | "status"> & { status?: CustomRecordStatus }): CustomRecord {
  if (!input.recordKey.trim()) {
    throw new Error("recordKey is required.");
  }
  return { ...input, id: randomUUID(), status: input.status ?? "active" };
}

// G-13's own word "validation": a value can only be created against a real field definition, must
// satisfy that field's `required` flag, and must match the field's declared `dataType` shape — real
// business-logic validation, not just a schema column, matching the "real business-logic
// implementation, not just schema" precedent already established for G-12's
// legal-hold-blocks-deletion.
export function createCustomValue(
  input: Omit<CustomValue, "id">,
  fieldDefinition: Pick<CustomFieldDefinition, "required" | "dataType">
): CustomValue {
  if (fieldDefinition.required && (input.valueJson === undefined || input.valueJson === null)) {
    throw new Error("A value is required for this field definition.");
  }
  if (input.valueJson !== undefined && input.valueJson !== null && !matchesDataType(input.valueJson, fieldDefinition.dataType)) {
    throw new Error(`valueJson does not match the field definition's declared dataType (${fieldDefinition.dataType}).`);
  }
  return { ...input, id: randomUUID() };
}

function matchesDataType(value: unknown, dataType: CustomFieldDataType): boolean {
  switch (dataType) {
    case "text":
    case "uuid":
    case "enum":
    case "date":
    case "datetime":
      return typeof value === "string";
    case "number":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "json":
      return true;
    default:
      return true;
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// G-09 Phase 1 (enterprise GRC depth, migration
// 0019_g09_enterprise_grc_risk_register.sql): the policy attestation model,
// access-review item, vendor assessment, and audit request/test entities the
// gap report names directly, built alongside — not replacing — the existing
// PolicyVersion/AccessReview/VendorRecord/AuditEngagement domain above. Those
// existing types stay exactly as-is; see the migration's header comment for
// why `policy_versions` gets an additive `policy_id` link to the new
// `policies` parent rather than being restructured.

export type PolicyRecordStatus = "draft" | "active" | "retired";
export type PolicyControlCoverage = "full" | "partial" | "not_covered";
export type PolicyAttestationDecision = "attested" | "declined";
export type AccessReviewRiskLevel = "low" | "medium" | "high" | "critical";
export type AccessReviewDecisionOutcome = "approved" | "revoked" | "flagged";
export type VendorAssessmentType = "onboarding" | "renewal" | "ad_hoc";
export type VendorAssessmentStatus = "planned" | "in_progress" | "completed";
export type VendorFindingStatus = "open" | "remediated" | "accepted";
export type AuditRequestStatus = "requested" | "submitted" | "accepted" | "rejected";
export type AuditTestConclusion = "effective" | "ineffective" | "not_tested";

export interface PolicyRecord {
  id: string;
  tenantId: string;
  policyKey: string;
  title: string;
  ownerId: string;
  category: string;
  status: PolicyRecordStatus;
}

export function createPolicyRecord(input: {
  tenantId: string;
  policyKey: string;
  title: string;
  ownerId: string;
  category: string;
}): PolicyRecord {
  if (!input.policyKey.trim()) {
    throw new Error("Policies require a non-blank policy key.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    policyKey: input.policyKey,
    title: input.title,
    ownerId: input.ownerId,
    category: input.category,
    status: "draft"
  };
}

export interface PolicyControlLink {
  id: string;
  tenantId: string;
  policyVersionId: string;
  controlId: string;
  coverage: PolicyControlCoverage;
}

export function createPolicyControlLink(input: {
  tenantId: string;
  policyVersionId: string;
  controlId: string;
  coverage?: PolicyControlCoverage;
}): PolicyControlLink {
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    policyVersionId: input.policyVersionId,
    controlId: input.controlId,
    coverage: input.coverage ?? "full"
  };
}

export interface PolicyAttestation {
  id: string;
  tenantId: string;
  policyVersionId: string;
  userId: string;
  decision: PolicyAttestationDecision;
  evidenceHash: string;
  attestedAt: Date;
}

export function createPolicyAttestation(input: {
  tenantId: string;
  policyVersionId: string;
  userId: string;
  decision: PolicyAttestationDecision;
  evidenceHash: string;
  now?: Date;
}): PolicyAttestation {
  if (!input.userId) {
    throw new Error("Policy attestations require a user.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    policyVersionId: input.policyVersionId,
    userId: input.userId,
    decision: input.decision,
    evidenceHash: input.evidenceHash,
    attestedAt: input.now ?? new Date()
  };
}

export interface AccessReviewItem {
  id: string;
  tenantId: string;
  accessReviewId: string;
  principalRef: string;
  resourceRef: string;
  entitlementRef: string;
  riskLevel: AccessReviewRiskLevel;
}

export function createAccessReviewItem(input: {
  tenantId: string;
  accessReviewId: string;
  principalRef: string;
  resourceRef: string;
  entitlementRef: string;
  riskLevel?: AccessReviewRiskLevel;
}): AccessReviewItem {
  if (!input.principalRef.trim() || !input.resourceRef.trim() || !input.entitlementRef.trim()) {
    throw new Error("Access review items require principal, resource, and entitlement references.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    accessReviewId: input.accessReviewId,
    principalRef: input.principalRef,
    resourceRef: input.resourceRef,
    entitlementRef: input.entitlementRef,
    riskLevel: input.riskLevel ?? "low"
  };
}

export interface AccessReviewDecisionRecord {
  id: string;
  tenantId: string;
  reviewItemId: string;
  reviewerId: string;
  decision: AccessReviewDecisionOutcome;
  rationale?: string;
  decidedAt: Date;
}

export function createAccessReviewDecision(input: {
  tenantId: string;
  reviewItemId: string;
  reviewerId: string;
  decision: AccessReviewDecisionOutcome;
  rationale?: string;
  now?: Date;
}): AccessReviewDecisionRecord {
  if (!input.reviewerId) {
    throw new Error("Access review decisions require a reviewer.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    reviewItemId: input.reviewItemId,
    reviewerId: input.reviewerId,
    decision: input.decision,
    rationale: input.rationale,
    decidedAt: input.now ?? new Date()
  };
}

export interface VendorAssessmentRecord {
  id: string;
  tenantId: string;
  vendorId: string;
  assessmentType: VendorAssessmentType;
  period: string;
  status: VendorAssessmentStatus;
  reviewerId: string;
  score?: number;
}

export function createVendorAssessment(input: {
  tenantId: string;
  vendorId: string;
  assessmentType: VendorAssessmentType;
  period: string;
  reviewerId: string;
  score?: number;
}): VendorAssessmentRecord {
  if (!input.period.trim()) {
    throw new Error("Vendor assessments require a period label.");
  }
  if (input.score !== undefined && (input.score < 0 || input.score > 100)) {
    throw new Error("Vendor assessment score must be between 0 and 100.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    vendorId: input.vendorId,
    assessmentType: input.assessmentType,
    period: input.period,
    status: "planned",
    reviewerId: input.reviewerId,
    score: input.score
  };
}

export interface VendorFindingRecord {
  id: string;
  tenantId: string;
  vendorAssessmentId: string;
  severity: FindingSeverityLevel;
  title: string;
  status: VendorFindingStatus;
  dueAt?: Date;
}

export type FindingSeverityLevel = "low" | "medium" | "high" | "critical";

export function createVendorFinding(input: {
  tenantId: string;
  vendorAssessmentId: string;
  severity: FindingSeverityLevel;
  title: string;
  dueAt?: Date;
}): VendorFindingRecord {
  if (!input.title.trim()) {
    throw new Error("Vendor findings require a title.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    vendorAssessmentId: input.vendorAssessmentId,
    severity: input.severity,
    title: input.title,
    status: "open",
    dueAt: input.dueAt
  };
}

export interface AuditRequestRecord {
  id: string;
  tenantId: string;
  auditEngagementId: string;
  controlId?: string;
  requestedFrom: string;
  dueAt: Date;
  status: AuditRequestStatus;
}

export function createAuditRequest(input: {
  tenantId: string;
  auditEngagementId: string;
  controlId?: string;
  requestedFrom: string;
  dueAt: Date;
}): AuditRequestRecord {
  if (!input.requestedFrom.trim()) {
    throw new Error("Audit requests require who they were requested from.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    auditEngagementId: input.auditEngagementId,
    controlId: input.controlId,
    requestedFrom: input.requestedFrom,
    dueAt: input.dueAt,
    status: "requested"
  };
}

export interface AuditTestRecord {
  id: string;
  tenantId: string;
  auditEngagementId: string;
  controlInstanceId?: string;
  procedure: string;
  sampleRef?: string;
  conclusion: AuditTestConclusion;
  reviewerId?: string;
}

export function createAuditTest(input: {
  tenantId: string;
  auditEngagementId: string;
  controlInstanceId?: string;
  procedure: string;
  sampleRef?: string;
  reviewerId?: string;
}): AuditTestRecord {
  if (!input.procedure.trim()) {
    throw new Error("Audit tests require a procedure.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    auditEngagementId: input.auditEngagementId,
    controlInstanceId: input.controlInstanceId,
    procedure: input.procedure,
    sampleRef: input.sampleRef,
    conclusion: "not_tested",
    reviewerId: input.reviewerId
  };
}
