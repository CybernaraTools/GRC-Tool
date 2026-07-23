import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../../audit-security/public.js";
import { OutboxService } from "../../outbox/public.js";
import type { Pagination } from "../../../shared/pagination.js";
import {
  addPolicyException,
  createAccessReview,
  createAccessReviewDecision,
  createAccessReviewItem,
  createAuditEngagement,
  createAuditRequest,
  createAuditTest,
  createCustomFieldDefinition,
  createCustomObjectDefinition,
  createCustomRecord,
  createCustomValue,
  createPolicyAttestation,
  createPolicyControlLink,
  createPolicyRecord,
  createVendorAssessment,
  createVendorFinding,
  createVendorRecord,
  createWorkspace,
  draftPolicy,
  publishPolicy,
  publishTrustCenterArtifact,
  recordTrustCenterDownload,
  type AccessReview,
  type AccessReviewDecisionOutcome,
  type AuditEngagement,
  type AuditStatus,
  type CustomFieldDataType,
  type CustomObjectDefinition,
  type CustomObjectDefinitionStatus,
  type FindingSeverityLevel,
  type PolicyAttestationDecision,
  type PolicyControlCoverage,
  type TrustCenterArtifact,
  type VendorAssessmentType,
  type VendorTier
} from "../domain/grc.js";
import { ENTERPRISE_GRC_REPOSITORY } from "./tokens.js";
import type {
  AccessReviewDecisionRow,
  AccessReviewItemRow,
  AccessReviewRow,
  AuditEngagementRow,
  AuditRequestRow,
  AuditTestRow,
  CustomFieldDefinitionRow,
  CustomObjectDefinitionRow,
  CustomRecordRow,
  CustomValueRow,
  EnterpriseGrcRepository,
  GrcWorkspaceRow,
  PolicyAttestationRow,
  PolicyControlLinkRow,
  PolicyRecordRow,
  PolicyVersionRow,
  TrustCenterArtifactRow,
  VendorAssessmentRow,
  VendorFindingRow,
  VendorRecordRow
} from "./enterprise-grc.types.js";

interface EnterprisePayload extends Record<string, unknown> {
  policyId?: string;
  accessReviewId?: string;
  vendorId?: string;
  auditEngagementId?: string;
  trustArtifactId?: string;
  workspaceId?: string;
  customObjectDefinitionId?: string;
  policyRecordId?: string;
  policyControlLinkId?: string;
  accessReviewItemId?: string;
  vendorAssessmentId?: string;
  auditRequestId?: string;
  customFieldDefinitionId?: string;
  customRecordId?: string;
  customValueId?: string;
}

@Injectable()
export class EnterpriseGrcService {
  constructor(
    @Inject(ENTERPRISE_GRC_REPOSITORY) private readonly repository: EnterpriseGrcRepository,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(AuditLogService) private readonly auditLog: AuditLogService
  ) {}

  async draftPolicy(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    templateKey: string;
    title: string;
    version: string;
    content: string;
  }): Promise<PolicyVersionRow> {
    const replay = await this.replayedPolicy(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const policy = this.fromDomain(() => draftPolicy(input));
    const persisted = await this.repository.createPolicy({ policy, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "enterprise.policy_drafted",
      aggregateType: "policy_version",
      aggregateId: persisted.id,
      payload: { policyId: persisted.id },
      body: { policyId: persisted.id, templateKey: persisted.templateKey, version: persisted.version }
    });
    return persisted;
  }

  listPolicies(tenantId: string, pagination: Pagination): Promise<PolicyVersionRow[]> {
    return this.repository.listPolicies({ tenantId, pagination });
  }

  async getPolicy(tenantId: string, policyId: string): Promise<PolicyVersionRow> {
    const policy = await this.repository.findPolicy(tenantId, policyId);
    if (!policy) {
      throw new NotFoundException("Policy version not found.");
    }
    return policy;
  }

  async publishPolicy(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    policyId: string;
    approverId: string;
    attestationEvidenceIds: string[];
    publishedAt?: Date;
  }): Promise<PolicyVersionRow> {
    const replay = await this.replayedPolicy(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const current = await this.getPolicy(input.tenantId, input.policyId);
    const published = this.fromDomain(() =>
      publishPolicy(current, {
        approverId: input.approverId,
        attestationEvidenceIds: input.attestationEvidenceIds,
        publishedAt: input.publishedAt
      })
    );
    const persisted = await this.repository.updatePolicy({ policy: published, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "enterprise.policy_published",
      aggregateType: "policy_version",
      aggregateId: persisted.id,
      payload: { policyId: persisted.id },
      body: { policyId: persisted.id, status: persisted.status, publishedAt: persisted.publishedAt }
    });
    return persisted;
  }

  async addPolicyException(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    policyId: string;
    ownerId: string;
    reason: string;
    expiresAt: Date;
  }): Promise<PolicyVersionRow> {
    const replay = await this.replayedPolicy(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const current = await this.getPolicy(input.tenantId, input.policyId);
    const withException = this.fromDomain(() =>
      addPolicyException(current, { ownerId: input.ownerId, reason: input.reason, expiresAt: input.expiresAt })
    );
    const persisted = await this.repository.updatePolicy({ policy: withException, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "enterprise.policy_exception_added",
      aggregateType: "policy_version",
      aggregateId: persisted.id,
      payload: { policyId: persisted.id },
      body: { policyId: persisted.id, exceptionCount: persisted.exceptions.length }
    });
    return persisted;
  }

  async createAccessReview(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    populationSource: string;
    certifierId: string;
    decisions: AccessReview["decisions"];
  }): Promise<AccessReviewRow> {
    const replay = await this.replayedAccessReview(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const review = this.fromDomain(() => createAccessReview(input));
    const persisted = await this.repository.createAccessReview({ review, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "enterprise.access_review_created",
      aggregateType: "access_review",
      aggregateId: persisted.id,
      payload: { accessReviewId: persisted.id },
      body: { accessReviewId: persisted.id, populationSource: persisted.populationSource }
    });
    return persisted;
  }

  listAccessReviews(tenantId: string, pagination: Pagination): Promise<AccessReviewRow[]> {
    return this.repository.listAccessReviews({ tenantId, pagination });
  }

  async getAccessReview(tenantId: string, reviewId: string): Promise<AccessReviewRow> {
    const review = await this.repository.findAccessReview(tenantId, reviewId);
    if (!review) {
      throw new NotFoundException("Access review not found.");
    }
    return review;
  }

  async createVendor(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    name: string;
    tier: VendorTier;
    systems: string[];
    contractIds: string[];
    controlIds: string[];
    incidentIds: string[];
    questionnaireIds: string[];
    monitoringFindings: string[];
    renewalAt: Date;
  }): Promise<VendorRecordRow> {
    const replay = await this.replayedVendor(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const vendor = this.fromDomain(() => createVendorRecord(input));
    const persisted = await this.repository.createVendor({ vendor, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "enterprise.vendor_created",
      aggregateType: "vendor",
      aggregateId: persisted.id,
      payload: { vendorId: persisted.id },
      body: { vendorId: persisted.id, name: persisted.name, tier: persisted.tier }
    });
    return persisted;
  }

  listVendors(tenantId: string, pagination: Pagination): Promise<VendorRecordRow[]> {
    return this.repository.listVendors({ tenantId, pagination });
  }

  async getVendor(tenantId: string, vendorId: string): Promise<VendorRecordRow> {
    const vendor = await this.repository.findVendor(tenantId, vendorId);
    if (!vendor) {
      throw new NotFoundException("Vendor record not found.");
    }
    return vendor;
  }

  async createAuditEngagement(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    name: string;
    status: AuditStatus;
    requestListIds: string[];
    evidenceIds: string[];
    findingIds: string[];
    managementResponses: AuditEngagement["managementResponses"];
  }): Promise<AuditEngagementRow> {
    const replay = await this.replayedAuditEngagement(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const engagement = this.fromDomain(() => createAuditEngagement(input));
    const persisted = await this.repository.createAuditEngagement({ engagement, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "enterprise.audit_engagement_created",
      aggregateType: "audit_engagement",
      aggregateId: persisted.id,
      payload: { auditEngagementId: persisted.id },
      body: { auditEngagementId: persisted.id, name: persisted.name, status: persisted.status }
    });
    return persisted;
  }

  listAuditEngagements(tenantId: string, pagination: Pagination): Promise<AuditEngagementRow[]> {
    return this.repository.listAuditEngagements({ tenantId, pagination });
  }

  async getAuditEngagement(tenantId: string, engagementId: string): Promise<AuditEngagementRow> {
    const engagement = await this.repository.findAuditEngagement(tenantId, engagementId);
    if (!engagement) {
      throw new NotFoundException("Audit engagement not found.");
    }
    return engagement;
  }

  async publishTrustArtifact(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    title: string;
    version: string;
    approved: boolean;
    visibility: TrustCenterArtifact["visibility"];
    artifactEvidenceId: string;
    ndaRequired: boolean;
    crmAccountId?: string;
  }): Promise<TrustCenterArtifactRow> {
    const replay = await this.replayedTrustArtifact(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const artifact = this.fromDomain(() => publishTrustCenterArtifact(input));
    const persisted = await this.repository.createTrustArtifact({ artifact, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "enterprise.trust_artifact_published",
      aggregateType: "trust_center_artifact",
      aggregateId: persisted.id,
      payload: { trustArtifactId: persisted.id },
      body: { trustArtifactId: persisted.id, visibility: persisted.visibility, ndaRequired: persisted.ndaRequired }
    });
    return persisted;
  }

  listTrustArtifacts(tenantId: string, pagination: Pagination): Promise<TrustCenterArtifactRow[]> {
    return this.repository.listTrustArtifacts({ tenantId, pagination });
  }

  async getTrustArtifact(tenantId: string, artifactId: string): Promise<TrustCenterArtifactRow> {
    const artifact = await this.repository.findTrustArtifact(tenantId, artifactId);
    if (!artifact) {
      throw new NotFoundException("Trust center artifact not found.");
    }
    return artifact;
  }

  async recordTrustArtifactDownload(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    artifactId: string;
    downloadedAt?: Date;
  }): Promise<TrustCenterArtifactRow> {
    const replay = await this.replayedTrustArtifact(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const current = await this.getTrustArtifact(input.tenantId, input.artifactId);
    const withDownload = this.fromDomain(() =>
      recordTrustCenterDownload(current, { actorId: input.actorId, downloadedAt: input.downloadedAt })
    );
    const persisted = await this.repository.updateTrustArtifact({ artifact: withDownload, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "enterprise.trust_artifact_download_recorded",
      aggregateType: "trust_center_artifact",
      aggregateId: persisted.id,
      payload: { trustArtifactId: persisted.id },
      body: { trustArtifactId: persisted.id, downloadCount: persisted.downloadEvents.length }
    });
    return persisted;
  }

  async createWorkspace(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    businessUnit: string;
    parentWorkspaceId?: string;
    inheritedControlIds: string[];
    delegatedAdminIds: string[];
  }): Promise<GrcWorkspaceRow> {
    const replay = await this.replayedWorkspace(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const workspace = this.fromDomain(() => createWorkspace(input));
    const persisted = await this.repository.createWorkspace({ workspace, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "enterprise.workspace_created",
      aggregateType: "grc_workspace",
      aggregateId: persisted.id,
      payload: { workspaceId: persisted.id },
      body: { workspaceId: persisted.id, businessUnit: persisted.businessUnit }
    });
    return persisted;
  }

  listWorkspaces(tenantId: string, pagination: Pagination): Promise<GrcWorkspaceRow[]> {
    return this.repository.listWorkspaces({ tenantId, pagination });
  }

  async getWorkspace(tenantId: string, workspaceId: string): Promise<GrcWorkspaceRow> {
    const workspace = await this.repository.findWorkspace(tenantId, workspaceId);
    if (!workspace) {
      throw new NotFoundException("GRC workspace not found.");
    }
    return workspace;
  }

  async createCustomObject(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    objectKey: string;
    fields: CustomObjectDefinition["fields"];
    workflowStates: string[];
    permissionRoleIds: string[];
    upgradeSafe: boolean;
    connectorSdkEnabled: boolean;
  }): Promise<CustomObjectDefinitionRow> {
    const replay = await this.replayedCustomObject(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const definition = this.fromDomain(() => createCustomObjectDefinition(input));
    const persisted = await this.repository.createCustomObject({ definition, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "enterprise.custom_object_created",
      aggregateType: "custom_object_definition",
      aggregateId: persisted.id,
      payload: { customObjectDefinitionId: persisted.id },
      body: { customObjectDefinitionId: persisted.id, objectKey: persisted.objectKey }
    });
    return persisted;
  }

  listCustomObjects(tenantId: string, pagination: Pagination): Promise<CustomObjectDefinitionRow[]> {
    return this.repository.listCustomObjects({ tenantId, pagination });
  }

  async getCustomObject(tenantId: string, definitionId: string): Promise<CustomObjectDefinitionRow> {
    const definition = await this.repository.findCustomObject(tenantId, definitionId);
    if (!definition) {
      throw new NotFoundException("Custom object definition not found.");
    }
    return definition;
  }

  // G-13 (0025_g13_custom_platform.sql).
  async updateCustomObjectStatus(input: {
    tenantId: string;
    actorId: string;
    definitionId: string;
    status: CustomObjectDefinitionStatus;
    validationSchema?: Record<string, unknown>;
  }): Promise<CustomObjectDefinitionRow> {
    await this.getCustomObject(input.tenantId, input.definitionId);
    return this.repository.updateCustomObjectStatus(input);
  }

  async createCustomFieldDefinition(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    objectDefinitionId: string;
    fieldKey: string;
    dataType: CustomFieldDataType;
    required: boolean;
    validationJson?: Record<string, unknown>;
  }): Promise<CustomFieldDefinitionRow> {
    const replay = await this.replayedCustomFieldDefinition(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    await this.getCustomObject(input.tenantId, input.objectDefinitionId);
    const field = this.fromDomain(() =>
      createCustomFieldDefinition({
        tenantId: input.tenantId,
        objectDefinitionId: input.objectDefinitionId,
        fieldKey: input.fieldKey,
        dataType: input.dataType,
        required: input.required,
        validationJson: input.validationJson ?? {}
      })
    );
    const persisted = await this.repository.createCustomFieldDefinition({ field, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "enterprise.custom_field_definition_created",
      aggregateType: "custom_field_definition",
      aggregateId: persisted.id,
      payload: { customFieldDefinitionId: persisted.id },
      body: { customFieldDefinitionId: persisted.id, objectDefinitionId: persisted.objectDefinitionId }
    });
    return persisted;
  }

  listCustomFieldDefinitions(
    tenantId: string,
    objectDefinitionId: string,
    pagination: Pagination
  ): Promise<CustomFieldDefinitionRow[]> {
    return this.repository.listCustomFieldDefinitions({ tenantId, objectDefinitionId, pagination });
  }

  async createCustomRecord(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    objectDefinitionId: string;
    recordKey: string;
  }): Promise<CustomRecordRow> {
    const replay = await this.replayedCustomRecord(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    await this.getCustomObject(input.tenantId, input.objectDefinitionId);
    const record = this.fromDomain(() =>
      createCustomRecord({
        tenantId: input.tenantId,
        objectDefinitionId: input.objectDefinitionId,
        recordKey: input.recordKey
      })
    );
    const persisted = await this.repository.createCustomRecord({ record, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "enterprise.custom_record_created",
      aggregateType: "custom_record",
      aggregateId: persisted.id,
      payload: { customRecordId: persisted.id },
      body: { customRecordId: persisted.id, objectDefinitionId: persisted.objectDefinitionId }
    });
    return persisted;
  }

  listCustomRecords(tenantId: string, objectDefinitionId: string, pagination: Pagination): Promise<CustomRecordRow[]> {
    return this.repository.listCustomRecords({ tenantId, objectDefinitionId, pagination });
  }

  async getCustomRecord(tenantId: string, recordId: string): Promise<CustomRecordRow> {
    const record = await this.repository.findCustomRecord(tenantId, recordId);
    if (!record) {
      throw new NotFoundException("Custom record not found.");
    }
    return record;
  }

  // G-13's own word "validation": a value can only be created against a real field definition, and
  // must satisfy that field's `required`/`dataType` — real business-logic validation, not just a
  // schema column, matching the "real business-logic implementation, not just schema" precedent
  // already established for G-12's legal-hold-blocks-deletion.
  async createCustomValue(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    recordId: string;
    fieldDefinitionId: string;
    valueJson?: unknown;
    searchText?: string;
  }): Promise<CustomValueRow> {
    const replay = await this.replayedCustomValue(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    await this.getCustomRecord(input.tenantId, input.recordId);
    const fieldDefinition = await this.repository.findCustomFieldDefinition(input.tenantId, input.fieldDefinitionId);
    if (!fieldDefinition) {
      throw new NotFoundException("Custom field definition not found.");
    }
    const value = this.fromDomain(() =>
      createCustomValue(
        {
          tenantId: input.tenantId,
          recordId: input.recordId,
          fieldDefinitionId: input.fieldDefinitionId,
          valueJson: input.valueJson,
          searchText: input.searchText
        },
        fieldDefinition
      )
    );
    const persisted = await this.repository.createCustomValue({ value, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "enterprise.custom_value_created",
      aggregateType: "custom_value",
      aggregateId: persisted.id,
      payload: { customValueId: persisted.id },
      body: { customValueId: persisted.id, recordId: persisted.recordId }
    });
    return persisted;
  }

  listCustomValues(tenantId: string, recordId: string, pagination: Pagination): Promise<CustomValueRow[]> {
    return this.repository.listCustomValues({ tenantId, recordId, pagination });
  }

  async getCustomValue(tenantId: string, valueId: string): Promise<CustomValueRow> {
    const value = await this.repository.findCustomValue(tenantId, valueId);
    if (!value) {
      throw new NotFoundException("Custom value not found.");
    }
    return value;
  }

  // G-09 Phase 1 (enterprise GRC depth, migration
  // 0019_g09_enterprise_grc_risk_register.sql). `policies` is the new stable
  // identity spec's ERD wants; the pre-existing `draftPolicy`/`publishPolicy`
  // flow above (backed by policy_versions) is untouched.
  async createPolicyRecord(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    policyKey: string;
    title: string;
    ownerId: string;
    category: string;
  }): Promise<PolicyRecordRow> {
    const replay = await this.replayedPolicyRecord(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const policy = this.fromDomain(() => createPolicyRecord(input));
    const persisted = await this.repository.createPolicyRecord({ policy, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "enterprise.policy_record_created",
      aggregateType: "policy",
      aggregateId: persisted.id,
      payload: { policyRecordId: persisted.id },
      body: { policyRecordId: persisted.id, policyKey: persisted.policyKey }
    });
    return persisted;
  }

  listPolicyRecords(tenantId: string, pagination: Pagination): Promise<PolicyRecordRow[]> {
    return this.repository.listPolicyRecords({ tenantId, pagination });
  }

  async getPolicyRecord(tenantId: string, policyRecordId: string): Promise<PolicyRecordRow> {
    const record = await this.repository.findPolicyRecord(tenantId, policyRecordId);
    if (!record) {
      throw new NotFoundException("Policy record not found.");
    }
    return record;
  }

  async createPolicyControlLink(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    policyVersionId: string;
    controlId: string;
    coverage?: PolicyControlCoverage;
  }): Promise<PolicyControlLinkRow> {
    const replay = await this.replayedPolicyControlLink(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    await this.getPolicy(input.tenantId, input.policyVersionId);
    const link = this.fromDomain(() => createPolicyControlLink(input));
    const persisted = await this.repository.createPolicyControlLink({ link, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "enterprise.policy_control_link_created",
      aggregateType: "policy_control_link",
      aggregateId: persisted.id,
      payload: { policyControlLinkId: persisted.id, policyId: persisted.policyVersionId },
      body: { policyControlLinkId: persisted.id, controlId: persisted.controlId, coverage: persisted.coverage }
    });
    return persisted;
  }

  async listPolicyControlLinks(tenantId: string, policyVersionId: string, pagination: Pagination): Promise<PolicyControlLinkRow[]> {
    await this.getPolicy(tenantId, policyVersionId);
    return this.repository.listPolicyControlLinks({ tenantId, policyVersionId, pagination });
  }

  async createPolicyAttestation(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    policyVersionId: string;
    decision: PolicyAttestationDecision;
    evidenceHash: string;
  }): Promise<PolicyAttestationRow> {
    const replayed = await this.outbox.findByIdempotencyKey(input.tenantId, input.idempotencyKey);
    if (replayed) {
      const payload = replayed.payload as Partial<EnterprisePayload>;
      const attestations = await this.repository.listPolicyAttestations({
        tenantId: input.tenantId,
        policyVersionId: input.policyVersionId,
        pagination: { limit: 200, offset: 0 }
      });
      const match = attestations.find((attestation) => attestation.id === payload.policyControlLinkId);
      if (match) {
        return match;
      }
    }
    await this.getPolicy(input.tenantId, input.policyVersionId);
    const attestation = this.fromDomain(() =>
      createPolicyAttestation({ ...input, userId: input.actorId })
    );
    const persisted = await this.repository.createPolicyAttestation({ attestation, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "enterprise.policy_attestation_recorded",
      aggregateType: "policy_attestation",
      aggregateId: persisted.id,
      // Reuses `policyControlLinkId` as the generic "created id" replay slot for this
      // append-only child resource, rather than adding a payload field per new child
      // table — matches this service's existing single-purpose-payload convention.
      payload: { policyControlLinkId: persisted.id },
      body: { policyAttestationId: persisted.id, decision: persisted.decision }
    });
    return persisted;
  }

  async listPolicyAttestations(tenantId: string, policyVersionId: string, pagination: Pagination): Promise<PolicyAttestationRow[]> {
    await this.getPolicy(tenantId, policyVersionId);
    return this.repository.listPolicyAttestations({ tenantId, policyVersionId, pagination });
  }

  async createAccessReviewItem(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    accessReviewId: string;
    principalRef: string;
    resourceRef: string;
    entitlementRef: string;
  }): Promise<AccessReviewItemRow> {
    const replay = await this.replayedAccessReviewItem(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    await this.getAccessReview(input.tenantId, input.accessReviewId);
    const item = this.fromDomain(() => createAccessReviewItem(input));
    const persisted = await this.repository.createAccessReviewItem({ item, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "enterprise.access_review_item_created",
      aggregateType: "access_review_item",
      aggregateId: persisted.id,
      payload: { accessReviewItemId: persisted.id, accessReviewId: persisted.accessReviewId },
      body: { accessReviewItemId: persisted.id, riskLevel: persisted.riskLevel }
    });
    return persisted;
  }

  async listAccessReviewItems(tenantId: string, accessReviewId: string, pagination: Pagination): Promise<AccessReviewItemRow[]> {
    await this.getAccessReview(tenantId, accessReviewId);
    return this.repository.listAccessReviewItems({ tenantId, accessReviewId, pagination });
  }

  async getAccessReviewItem(tenantId: string, itemId: string): Promise<AccessReviewItemRow> {
    const item = await this.repository.findAccessReviewItem(tenantId, itemId);
    if (!item) {
      throw new NotFoundException("Access review item not found.");
    }
    return item;
  }

  async createAccessReviewDecision(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    reviewItemId: string;
    decision: AccessReviewDecisionOutcome;
    rationale?: string;
  }): Promise<AccessReviewDecisionRow> {
    const replayed = await this.outbox.findByIdempotencyKey(input.tenantId, input.idempotencyKey);
    if (replayed) {
      const decisions = await this.repository.listAccessReviewDecisions({
        tenantId: input.tenantId,
        reviewItemId: input.reviewItemId,
        pagination: { limit: 200, offset: 0 }
      });
      const payload = replayed.payload as Partial<EnterprisePayload>;
      const match = decisions.find((decision) => decision.id === payload.accessReviewItemId);
      if (match) {
        return match;
      }
    }
    await this.getAccessReviewItem(input.tenantId, input.reviewItemId);
    const decision = this.fromDomain(() =>
      createAccessReviewDecision({ ...input, reviewerId: input.actorId })
    );
    const persisted = await this.repository.createAccessReviewDecision({ decision, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "enterprise.access_review_decision_recorded",
      aggregateType: "access_review_decision",
      aggregateId: persisted.id,
      payload: { accessReviewItemId: persisted.id },
      body: { accessReviewDecisionId: persisted.id, decision: persisted.decision }
    });
    return persisted;
  }

  listAccessReviewDecisions(tenantId: string, reviewItemId: string, pagination: Pagination): Promise<AccessReviewDecisionRow[]> {
    return this.repository.listAccessReviewDecisions({ tenantId, reviewItemId, pagination });
  }

  async createVendorAssessment(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    vendorId: string;
    assessmentType: VendorAssessmentType;
    period: string;
    score?: number;
  }): Promise<VendorAssessmentRow> {
    const replay = await this.replayedVendorAssessment(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    await this.getVendor(input.tenantId, input.vendorId);
    const assessment = this.fromDomain(() => createVendorAssessment({ ...input, reviewerId: input.actorId }));
    const persisted = await this.repository.createVendorAssessment({ assessment, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "enterprise.vendor_assessment_created",
      aggregateType: "vendor_assessment",
      aggregateId: persisted.id,
      payload: { vendorAssessmentId: persisted.id, vendorId: persisted.vendorId },
      body: { vendorAssessmentId: persisted.id, assessmentType: persisted.assessmentType }
    });
    return persisted;
  }

  async listVendorAssessments(tenantId: string, vendorId: string, pagination: Pagination): Promise<VendorAssessmentRow[]> {
    await this.getVendor(tenantId, vendorId);
    return this.repository.listVendorAssessments({ tenantId, vendorId, pagination });
  }

  async getVendorAssessment(tenantId: string, assessmentId: string): Promise<VendorAssessmentRow> {
    const assessment = await this.repository.findVendorAssessment(tenantId, assessmentId);
    if (!assessment) {
      throw new NotFoundException("Vendor assessment not found.");
    }
    return assessment;
  }

  async createVendorFinding(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    vendorAssessmentId: string;
    severity: FindingSeverityLevel;
    title: string;
    dueAt?: Date;
  }): Promise<VendorFindingRow> {
    const replayed = await this.outbox.findByIdempotencyKey(input.tenantId, input.idempotencyKey);
    if (replayed) {
      const findings = await this.repository.listVendorFindings({
        tenantId: input.tenantId,
        vendorAssessmentId: input.vendorAssessmentId,
        pagination: { limit: 200, offset: 0 }
      });
      const payload = replayed.payload as Partial<EnterprisePayload>;
      const match = findings.find((finding) => finding.id === payload.vendorAssessmentId);
      if (match) {
        return match;
      }
    }
    await this.getVendorAssessment(input.tenantId, input.vendorAssessmentId);
    const finding = this.fromDomain(() => createVendorFinding(input));
    const persisted = await this.repository.createVendorFinding({ finding, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "enterprise.vendor_finding_created",
      aggregateType: "vendor_finding",
      aggregateId: persisted.id,
      payload: { vendorAssessmentId: persisted.id },
      body: { vendorFindingId: persisted.id, severity: persisted.severity }
    });
    return persisted;
  }

  listVendorFindings(tenantId: string, vendorAssessmentId: string, pagination: Pagination): Promise<VendorFindingRow[]> {
    return this.repository.listVendorFindings({ tenantId, vendorAssessmentId, pagination });
  }

  async createAuditRequest(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    auditEngagementId: string;
    controlId?: string;
    requestedFrom: string;
    dueAt: Date;
  }): Promise<AuditRequestRow> {
    const replay = await this.replayedAuditRequest(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    await this.getAuditEngagement(input.tenantId, input.auditEngagementId);
    const request = this.fromDomain(() => createAuditRequest(input));
    const persisted = await this.repository.createAuditRequest({ request, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "enterprise.audit_request_created",
      aggregateType: "audit_request",
      aggregateId: persisted.id,
      payload: { auditRequestId: persisted.id, auditEngagementId: persisted.auditEngagementId },
      body: { auditRequestId: persisted.id, status: persisted.status }
    });
    return persisted;
  }

  async listAuditRequests(tenantId: string, auditEngagementId: string, pagination: Pagination): Promise<AuditRequestRow[]> {
    await this.getAuditEngagement(tenantId, auditEngagementId);
    return this.repository.listAuditRequests({ tenantId, auditEngagementId, pagination });
  }

  async createAuditTest(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    auditEngagementId: string;
    controlInstanceId?: string;
    procedure: string;
    sampleRef?: string;
  }): Promise<AuditTestRow> {
    const replayed = await this.outbox.findByIdempotencyKey(input.tenantId, input.idempotencyKey);
    if (replayed) {
      const tests = await this.repository.listAuditTests({
        tenantId: input.tenantId,
        auditEngagementId: input.auditEngagementId,
        pagination: { limit: 200, offset: 0 }
      });
      const payload = replayed.payload as Partial<EnterprisePayload>;
      const match = tests.find((test) => test.id === payload.auditRequestId);
      if (match) {
        return match;
      }
    }
    await this.getAuditEngagement(input.tenantId, input.auditEngagementId);
    const test = this.fromDomain(() => createAuditTest({ ...input, reviewerId: input.actorId }));
    const persisted = await this.repository.createAuditTest({ test, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "enterprise.audit_test_created",
      aggregateType: "audit_test",
      aggregateId: persisted.id,
      payload: { auditRequestId: persisted.id },
      body: { auditTestId: persisted.id, conclusion: persisted.conclusion }
    });
    return persisted;
  }

  listAuditTests(tenantId: string, auditEngagementId: string, pagination: Pagination): Promise<AuditTestRow[]> {
    return this.repository.listAuditTests({ tenantId, auditEngagementId, pagination });
  }

  private async replayedPolicyRecord(tenantId: string, idempotencyKey: string) {
    const payload = await this.replayedPayload(tenantId, idempotencyKey, "policyRecordId");
    return payload ? this.getPolicyRecord(tenantId, String(payload.policyRecordId)) : null;
  }

  private async replayedPolicyControlLink(tenantId: string, idempotencyKey: string) {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as Partial<EnterprisePayload>;
    if (!payload.policyControlLinkId || !payload.policyId) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    const links = await this.repository.listPolicyControlLinks({
      tenantId,
      policyVersionId: payload.policyId,
      pagination: { limit: 200, offset: 0 }
    });
    const match = links.find((link) => link.id === payload.policyControlLinkId);
    if (!match) {
      throw new NotFoundException("Policy control link not found.");
    }
    return match;
  }

  private async replayedAccessReviewItem(tenantId: string, idempotencyKey: string) {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as Partial<EnterprisePayload>;
    if (!payload.accessReviewItemId) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    return this.getAccessReviewItem(tenantId, payload.accessReviewItemId);
  }

  private async replayedVendorAssessment(tenantId: string, idempotencyKey: string) {
    const payload = await this.replayedPayload(tenantId, idempotencyKey, "vendorAssessmentId");
    return payload ? this.getVendorAssessment(tenantId, String(payload.vendorAssessmentId)) : null;
  }

  private async replayedAuditRequest(tenantId: string, idempotencyKey: string) {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as Partial<EnterprisePayload>;
    if (!payload.auditRequestId) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    const requests = await this.repository.listAuditRequests({
      tenantId,
      auditEngagementId: payload.auditEngagementId ?? "",
      pagination: { limit: 200, offset: 0 }
    });
    const match = requests.find((request) => request.id === payload.auditRequestId);
    if (!match) {
      throw new NotFoundException("Audit request not found.");
    }
    return match;
  }

  private async replayedPolicy(tenantId: string, idempotencyKey: string) {
    const payload = await this.replayedPayload(tenantId, idempotencyKey, "policyId");
    return payload ? this.getPolicy(tenantId, String(payload.policyId)) : null;
  }

  private async replayedAccessReview(tenantId: string, idempotencyKey: string) {
    const payload = await this.replayedPayload(tenantId, idempotencyKey, "accessReviewId");
    return payload ? this.getAccessReview(tenantId, String(payload.accessReviewId)) : null;
  }

  private async replayedVendor(tenantId: string, idempotencyKey: string) {
    const payload = await this.replayedPayload(tenantId, idempotencyKey, "vendorId");
    return payload ? this.getVendor(tenantId, String(payload.vendorId)) : null;
  }

  private async replayedAuditEngagement(tenantId: string, idempotencyKey: string) {
    const payload = await this.replayedPayload(tenantId, idempotencyKey, "auditEngagementId");
    return payload ? this.getAuditEngagement(tenantId, String(payload.auditEngagementId)) : null;
  }

  private async replayedTrustArtifact(tenantId: string, idempotencyKey: string) {
    const payload = await this.replayedPayload(tenantId, idempotencyKey, "trustArtifactId");
    return payload ? this.getTrustArtifact(tenantId, String(payload.trustArtifactId)) : null;
  }

  private async replayedWorkspace(tenantId: string, idempotencyKey: string) {
    const payload = await this.replayedPayload(tenantId, idempotencyKey, "workspaceId");
    return payload ? this.getWorkspace(tenantId, String(payload.workspaceId)) : null;
  }

  private async replayedCustomObject(tenantId: string, idempotencyKey: string) {
    const payload = await this.replayedPayload(tenantId, idempotencyKey, "customObjectDefinitionId");
    return payload ? this.getCustomObject(tenantId, String(payload.customObjectDefinitionId)) : null;
  }

  private async replayedCustomFieldDefinition(tenantId: string, idempotencyKey: string) {
    const payload = await this.replayedPayload(tenantId, idempotencyKey, "customFieldDefinitionId");
    if (!payload) {
      return null;
    }
    const found = await this.repository.findCustomFieldDefinition(tenantId, String(payload.customFieldDefinitionId));
    if (!found) {
      throw new NotFoundException("Custom field definition not found.");
    }
    return found;
  }

  private async replayedCustomRecord(tenantId: string, idempotencyKey: string) {
    const payload = await this.replayedPayload(tenantId, idempotencyKey, "customRecordId");
    return payload ? this.getCustomRecord(tenantId, String(payload.customRecordId)) : null;
  }

  private async replayedCustomValue(tenantId: string, idempotencyKey: string) {
    const payload = await this.replayedPayload(tenantId, idempotencyKey, "customValueId");
    return payload ? this.getCustomValue(tenantId, String(payload.customValueId)) : null;
  }

  private async replayedPayload(
    tenantId: string,
    idempotencyKey: string,
    expectedKey: keyof EnterprisePayload
  ): Promise<EnterprisePayload | null> {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as Partial<EnterprisePayload>;
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
    payload: EnterprisePayload;
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
