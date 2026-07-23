import type { Pagination } from "../../../shared/pagination.js";
import type {
  AccessReview,
  AccessReviewDecisionRecord,
  AccessReviewItem,
  AuditEngagement,
  AuditRequestRecord,
  AuditTestRecord,
  CustomFieldDefinition,
  CustomObjectDefinition,
  CustomRecord,
  CustomValue,
  GrcWorkspace,
  PolicyAttestation,
  PolicyControlLink,
  PolicyRecord,
  PolicyVersion,
  TrustCenterArtifact,
  VendorAssessmentRecord,
  VendorFindingRecord,
  VendorRecord
} from "../domain/grc.js";

export interface EnterpriseGrcRecordMetadata {
  versionNumber: number;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

// policy_attestations and access_review_decisions (0019) are append-only
// child tables with `created_by`/`created_at` generated columns and no
// updated_by/updated_at at all — matching the pre-existing
// risk_acceptance_reviews precedent (migration 0010), not the standard
// mutable-row column set every other table in this schema uses.
export interface EnterpriseGrcAppendOnlyMetadata {
  versionNumber: number;
  classification: string;
  createdBy: string;
  createdAt: Date;
}

export type PolicyVersionRow = PolicyVersion & EnterpriseGrcRecordMetadata;
export type AccessReviewRow = AccessReview & EnterpriseGrcRecordMetadata;
export type VendorRecordRow = VendorRecord & EnterpriseGrcRecordMetadata;
export type AuditEngagementRow = AuditEngagement & EnterpriseGrcRecordMetadata;
export type TrustCenterArtifactRow = TrustCenterArtifact & EnterpriseGrcRecordMetadata;
export type GrcWorkspaceRow = GrcWorkspace & EnterpriseGrcRecordMetadata;
export type CustomObjectDefinitionRow = CustomObjectDefinition & EnterpriseGrcRecordMetadata;

// G-09 Phase 1 rows.
export type PolicyRecordRow = PolicyRecord & EnterpriseGrcRecordMetadata;
export type PolicyControlLinkRow = PolicyControlLink & EnterpriseGrcRecordMetadata;
export type PolicyAttestationRow = PolicyAttestation & EnterpriseGrcAppendOnlyMetadata;
export type AccessReviewItemRow = AccessReviewItem & EnterpriseGrcRecordMetadata;
export type AccessReviewDecisionRow = AccessReviewDecisionRecord & EnterpriseGrcAppendOnlyMetadata;
export type VendorAssessmentRow = VendorAssessmentRecord & EnterpriseGrcRecordMetadata;
export type VendorFindingRow = VendorFindingRecord & EnterpriseGrcRecordMetadata;
export type AuditRequestRow = AuditRequestRecord & EnterpriseGrcRecordMetadata;
export type AuditTestRow = AuditTestRecord & EnterpriseGrcRecordMetadata;

// G-13 (0025_g13_custom_platform.sql).
export type CustomFieldDefinitionRow = CustomFieldDefinition & EnterpriseGrcRecordMetadata;
export type CustomRecordRow = CustomRecord & EnterpriseGrcRecordMetadata;
export type CustomValueRow = CustomValue & EnterpriseGrcRecordMetadata;

export interface EnterpriseGrcRepository {
  createPolicy(input: { policy: PolicyVersion; actorId: string }): Promise<PolicyVersionRow>;
  updatePolicy(input: { policy: PolicyVersion; actorId: string }): Promise<PolicyVersionRow>;
  listPolicies(input: { tenantId: string; pagination: Pagination }): Promise<PolicyVersionRow[]>;
  findPolicy(tenantId: string, policyId: string): Promise<PolicyVersionRow | null>;
  createAccessReview(input: { review: AccessReview; actorId: string }): Promise<AccessReviewRow>;
  listAccessReviews(input: { tenantId: string; pagination: Pagination }): Promise<AccessReviewRow[]>;
  findAccessReview(tenantId: string, reviewId: string): Promise<AccessReviewRow | null>;
  createVendor(input: { vendor: VendorRecord; actorId: string }): Promise<VendorRecordRow>;
  listVendors(input: { tenantId: string; pagination: Pagination }): Promise<VendorRecordRow[]>;
  findVendor(tenantId: string, vendorId: string): Promise<VendorRecordRow | null>;
  createAuditEngagement(input: { engagement: AuditEngagement; actorId: string }): Promise<AuditEngagementRow>;
  listAuditEngagements(input: { tenantId: string; pagination: Pagination }): Promise<AuditEngagementRow[]>;
  findAuditEngagement(tenantId: string, engagementId: string): Promise<AuditEngagementRow | null>;
  createTrustArtifact(input: {
    artifact: TrustCenterArtifact;
    actorId: string;
  }): Promise<TrustCenterArtifactRow>;
  updateTrustArtifact(input: {
    artifact: TrustCenterArtifact;
    actorId: string;
  }): Promise<TrustCenterArtifactRow>;
  listTrustArtifacts(input: { tenantId: string; pagination: Pagination }): Promise<TrustCenterArtifactRow[]>;
  findTrustArtifact(tenantId: string, artifactId: string): Promise<TrustCenterArtifactRow | null>;
  createWorkspace(input: { workspace: GrcWorkspace; actorId: string }): Promise<GrcWorkspaceRow>;
  listWorkspaces(input: { tenantId: string; pagination: Pagination }): Promise<GrcWorkspaceRow[]>;
  findWorkspace(tenantId: string, workspaceId: string): Promise<GrcWorkspaceRow | null>;
  createCustomObject(input: {
    definition: CustomObjectDefinition;
    actorId: string;
  }): Promise<CustomObjectDefinitionRow>;
  listCustomObjects(input: { tenantId: string; pagination: Pagination }): Promise<CustomObjectDefinitionRow[]>;
  findCustomObject(tenantId: string, definitionId: string): Promise<CustomObjectDefinitionRow | null>;

  // G-09 Phase 1 (0019_g09_enterprise_grc_risk_register.sql).
  createPolicyRecord(input: { policy: PolicyRecord; actorId: string }): Promise<PolicyRecordRow>;
  listPolicyRecords(input: { tenantId: string; pagination: Pagination }): Promise<PolicyRecordRow[]>;
  findPolicyRecord(tenantId: string, policyRecordId: string): Promise<PolicyRecordRow | null>;
  createPolicyControlLink(input: { link: PolicyControlLink; actorId: string }): Promise<PolicyControlLinkRow>;
  listPolicyControlLinks(input: {
    tenantId: string;
    policyVersionId: string;
    pagination: Pagination;
  }): Promise<PolicyControlLinkRow[]>;
  createPolicyAttestation(input: { attestation: PolicyAttestation; actorId: string }): Promise<PolicyAttestationRow>;
  listPolicyAttestations(input: {
    tenantId: string;
    policyVersionId: string;
    pagination: Pagination;
  }): Promise<PolicyAttestationRow[]>;
  createAccessReviewItem(input: { item: AccessReviewItem; actorId: string }): Promise<AccessReviewItemRow>;
  listAccessReviewItems(input: {
    tenantId: string;
    accessReviewId: string;
    pagination: Pagination;
  }): Promise<AccessReviewItemRow[]>;
  findAccessReviewItem(tenantId: string, itemId: string): Promise<AccessReviewItemRow | null>;
  createAccessReviewDecision(input: {
    decision: AccessReviewDecisionRecord;
    actorId: string;
  }): Promise<AccessReviewDecisionRow>;
  listAccessReviewDecisions(input: {
    tenantId: string;
    reviewItemId: string;
    pagination: Pagination;
  }): Promise<AccessReviewDecisionRow[]>;
  createVendorAssessment(input: { assessment: VendorAssessmentRecord; actorId: string }): Promise<VendorAssessmentRow>;
  listVendorAssessments(input: { tenantId: string; vendorId: string; pagination: Pagination }): Promise<VendorAssessmentRow[]>;
  findVendorAssessment(tenantId: string, assessmentId: string): Promise<VendorAssessmentRow | null>;
  createVendorFinding(input: { finding: VendorFindingRecord; actorId: string }): Promise<VendorFindingRow>;
  listVendorFindings(input: {
    tenantId: string;
    vendorAssessmentId: string;
    pagination: Pagination;
  }): Promise<VendorFindingRow[]>;
  createAuditRequest(input: { request: AuditRequestRecord; actorId: string }): Promise<AuditRequestRow>;
  listAuditRequests(input: {
    tenantId: string;
    auditEngagementId: string;
    pagination: Pagination;
  }): Promise<AuditRequestRow[]>;
  createAuditTest(input: { test: AuditTestRecord; actorId: string }): Promise<AuditTestRow>;
  listAuditTests(input: { tenantId: string; auditEngagementId: string; pagination: Pagination }): Promise<AuditTestRow[]>;

  // G-13 (0025_g13_custom_platform.sql).
  updateCustomObjectStatus(input: {
    tenantId: string;
    definitionId: string;
    status: string;
    validationSchema?: Record<string, unknown>;
    actorId: string;
  }): Promise<CustomObjectDefinitionRow>;
  createCustomFieldDefinition(input: { field: CustomFieldDefinition; actorId: string }): Promise<CustomFieldDefinitionRow>;
  listCustomFieldDefinitions(input: {
    tenantId: string;
    objectDefinitionId: string;
    pagination: Pagination;
  }): Promise<CustomFieldDefinitionRow[]>;
  findCustomFieldDefinition(tenantId: string, fieldDefinitionId: string): Promise<CustomFieldDefinitionRow | null>;
  createCustomRecord(input: { record: CustomRecord; actorId: string }): Promise<CustomRecordRow>;
  listCustomRecords(input: {
    tenantId: string;
    objectDefinitionId: string;
    pagination: Pagination;
  }): Promise<CustomRecordRow[]>;
  findCustomRecord(tenantId: string, recordId: string): Promise<CustomRecordRow | null>;
  createCustomValue(input: { value: CustomValue; actorId: string }): Promise<CustomValueRow>;
  listCustomValues(input: { tenantId: string; recordId: string; pagination: Pagination }): Promise<CustomValueRow[]>;
  findCustomValue(tenantId: string, valueId: string): Promise<CustomValueRow | null>;
}
