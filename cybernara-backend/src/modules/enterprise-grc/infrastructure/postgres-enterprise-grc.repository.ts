import { Inject, Injectable } from "@nestjs/common";
import { TenantScopedDb } from "../../../platform/database/tenant-scoped-db.js";
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
} from "../application/enterprise-grc.types.js";

@Injectable()
export class PostgresEnterpriseGrcRepository implements EnterpriseGrcRepository {
  constructor(@Inject(TenantScopedDb) private readonly db: TenantScopedDb) {}

  async createPolicy(input: { policy: PolicyVersion; actorId: string }): Promise<PolicyVersionRow> {
    return this.db.withTenant(input.policy.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into policy_versions (
            id, tenant_id, template_key, title, policy_version, status, approver_id,
            published_at, attestation_evidence_ids, exceptions, content_hash,
            classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9::uuid[], $10::jsonb, $11,
                  'confidential', $12, $12)
          returning ${policyColumns()}
        `,
        [
          input.policy.id,
          input.policy.tenantId,
          input.policy.templateKey,
          input.policy.title,
          input.policy.version,
          input.policy.status,
          input.policy.approverId ?? null,
          input.policy.publishedAt ?? null,
          input.policy.attestationEvidenceIds,
          JSON.stringify(input.policy.exceptions),
          input.policy.contentHash,
          input.actorId
        ]
      );
      return mapPolicy(result.rows[0]);
    });
  }

  async updatePolicy(input: { policy: PolicyVersion; actorId: string }): Promise<PolicyVersionRow> {
    return this.db.withTenant(input.policy.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          update policy_versions
          set status = $3,
              approver_id = $4,
              published_at = $5,
              attestation_evidence_ids = $6::uuid[],
              exceptions = $7::jsonb,
              updated_by = $8,
              updated_at = now(),
              version = version + 1
          where tenant_id = $1 and id = $2
          returning ${policyColumns()}
        `,
        [
          input.policy.tenantId,
          input.policy.id,
          input.policy.status,
          input.policy.approverId ?? null,
          input.policy.publishedAt ?? null,
          input.policy.attestationEvidenceIds,
          JSON.stringify(input.policy.exceptions),
          input.actorId
        ]
      );
      return mapPolicy(result.rows[0]);
    });
  }

  async listPolicies(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<PolicyVersionRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${policyColumns()} from policy_versions where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapPolicy);
    });
  }

  async findPolicy(tenantId: string, policyId: string): Promise<PolicyVersionRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(`select ${policyColumns()} from policy_versions where tenant_id = $1 and id = $2`, [
        tenantId,
        policyId
      ]);
      return result.rows[0] ? mapPolicy(result.rows[0]) : null;
    });
  }

  async createAccessReview(input: { review: AccessReview; actorId: string }): Promise<AccessReviewRow> {
    return this.db.withTenant(input.review.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into access_reviews (
            id, tenant_id, population_source, certifier_id, decisions, remediation_task_ids,
            classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5::jsonb, $6::text[], 'confidential', $7, $7)
          returning ${accessReviewColumns()}
        `,
        [
          input.review.id,
          input.review.tenantId,
          input.review.populationSource,
          input.review.certifierId,
          JSON.stringify(input.review.decisions),
          input.review.remediationTaskIds,
          input.actorId
        ]
      );
      return mapAccessReview(result.rows[0]);
    });
  }

  async listAccessReviews(input: {
    tenantId: string;
    pagination: { limit: number; offset: number };
  }): Promise<AccessReviewRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${accessReviewColumns()} from access_reviews where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapAccessReview);
    });
  }

  async findAccessReview(tenantId: string, reviewId: string): Promise<AccessReviewRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${accessReviewColumns()} from access_reviews where tenant_id = $1 and id = $2`,
        [tenantId, reviewId]
      );
      return result.rows[0] ? mapAccessReview(result.rows[0]) : null;
    });
  }

  async createVendor(input: { vendor: VendorRecord; actorId: string }): Promise<VendorRecordRow> {
    return this.db.withTenant(input.vendor.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into vendors (
            id, tenant_id, name, tier, systems, contract_ids, control_ids, incident_ids,
            questionnaire_ids, monitoring_findings, renewal_at, classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5::text[], $6::text[], $7::text[], $8::text[],
                  $9::text[], $10::text[], $11, 'confidential', $12, $12)
          returning ${vendorColumns()}
        `,
        [
          input.vendor.id,
          input.vendor.tenantId,
          input.vendor.name,
          input.vendor.tier,
          input.vendor.systems,
          input.vendor.contractIds,
          input.vendor.controlIds,
          input.vendor.incidentIds,
          input.vendor.questionnaireIds,
          input.vendor.monitoringFindings,
          input.vendor.renewalAt,
          input.actorId
        ]
      );
      return mapVendor(result.rows[0]);
    });
  }

  async listVendors(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<VendorRecordRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${vendorColumns()} from vendors where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapVendor);
    });
  }

  async findVendor(tenantId: string, vendorId: string): Promise<VendorRecordRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(`select ${vendorColumns()} from vendors where tenant_id = $1 and id = $2`, [
        tenantId,
        vendorId
      ]);
      return result.rows[0] ? mapVendor(result.rows[0]) : null;
    });
  }

  async createAuditEngagement(input: {
    engagement: AuditEngagement;
    actorId: string;
  }): Promise<AuditEngagementRow> {
    return this.db.withTenant(input.engagement.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into audit_engagements (
            id, tenant_id, name, status, request_list_ids, evidence_ids, finding_ids,
            management_responses, classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5::text[], $6::uuid[], $7::text[],
                  $8::jsonb, 'confidential', $9, $9)
          returning ${auditColumns()}
        `,
        [
          input.engagement.id,
          input.engagement.tenantId,
          input.engagement.name,
          input.engagement.status,
          input.engagement.requestListIds,
          input.engagement.evidenceIds,
          input.engagement.findingIds,
          JSON.stringify(input.engagement.managementResponses),
          input.actorId
        ]
      );
      return mapAuditEngagement(result.rows[0]);
    });
  }

  async listAuditEngagements(input: {
    tenantId: string;
    pagination: { limit: number; offset: number };
  }): Promise<AuditEngagementRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${auditColumns()} from audit_engagements where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapAuditEngagement);
    });
  }

  async findAuditEngagement(tenantId: string, engagementId: string): Promise<AuditEngagementRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${auditColumns()} from audit_engagements where tenant_id = $1 and id = $2`,
        [tenantId, engagementId]
      );
      return result.rows[0] ? mapAuditEngagement(result.rows[0]) : null;
    });
  }

  async createTrustArtifact(input: {
    artifact: TrustCenterArtifact;
    actorId: string;
  }): Promise<TrustCenterArtifactRow> {
    return this.db.withTenant(input.artifact.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into trust_center_artifacts (
            id, tenant_id, title, artifact_version, approved, visibility, artifact_evidence_id,
            nda_required, crm_account_id, download_events, classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, 'confidential', $11, $11)
          returning ${trustArtifactColumns()}
        `,
        [
          input.artifact.id,
          input.artifact.tenantId,
          input.artifact.title,
          input.artifact.version,
          input.artifact.approved,
          input.artifact.visibility,
          input.artifact.artifactEvidenceId,
          input.artifact.ndaRequired,
          input.artifact.crmAccountId ?? null,
          JSON.stringify(input.artifact.downloadEvents),
          input.actorId
        ]
      );
      return mapTrustArtifact(result.rows[0]);
    });
  }

  async updateTrustArtifact(input: {
    artifact: TrustCenterArtifact;
    actorId: string;
  }): Promise<TrustCenterArtifactRow> {
    return this.db.withTenant(input.artifact.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          update trust_center_artifacts
          set download_events = $3::jsonb,
              updated_by = $4,
              updated_at = now(),
              version = version + 1
          where tenant_id = $1 and id = $2
          returning ${trustArtifactColumns()}
        `,
        [input.artifact.tenantId, input.artifact.id, JSON.stringify(input.artifact.downloadEvents), input.actorId]
      );
      return mapTrustArtifact(result.rows[0]);
    });
  }

  async listTrustArtifacts(input: {
    tenantId: string;
    pagination: { limit: number; offset: number };
  }): Promise<TrustCenterArtifactRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${trustArtifactColumns()} from trust_center_artifacts where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapTrustArtifact);
    });
  }

  async findTrustArtifact(tenantId: string, artifactId: string): Promise<TrustCenterArtifactRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${trustArtifactColumns()} from trust_center_artifacts where tenant_id = $1 and id = $2`,
        [tenantId, artifactId]
      );
      return result.rows[0] ? mapTrustArtifact(result.rows[0]) : null;
    });
  }

  async createWorkspace(input: { workspace: GrcWorkspace; actorId: string }): Promise<GrcWorkspaceRow> {
    return this.db.withTenant(input.workspace.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into grc_workspaces (
            id, tenant_id, business_unit, parent_workspace_id, inherited_control_ids,
            delegated_admin_ids, classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5::text[], $6::uuid[], 'confidential', $7, $7)
          returning ${workspaceColumns()}
        `,
        [
          input.workspace.id,
          input.workspace.tenantId,
          input.workspace.businessUnit,
          input.workspace.parentWorkspaceId ?? null,
          input.workspace.inheritedControlIds,
          input.workspace.delegatedAdminIds,
          input.actorId
        ]
      );
      return mapWorkspace(result.rows[0]);
    });
  }

  async listWorkspaces(input: {
    tenantId: string;
    pagination: { limit: number; offset: number };
  }): Promise<GrcWorkspaceRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${workspaceColumns()} from grc_workspaces where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapWorkspace);
    });
  }

  async findWorkspace(tenantId: string, workspaceId: string): Promise<GrcWorkspaceRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${workspaceColumns()} from grc_workspaces where tenant_id = $1 and id = $2`,
        [tenantId, workspaceId]
      );
      return result.rows[0] ? mapWorkspace(result.rows[0]) : null;
    });
  }

  async createCustomObject(input: {
    definition: CustomObjectDefinition;
    actorId: string;
  }): Promise<CustomObjectDefinitionRow> {
    return this.db.withTenant(input.definition.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into custom_object_definitions (
            id, tenant_id, object_key, fields, workflow_states, permission_role_ids,
            upgrade_safe, connector_sdk_enabled, classification, created_by, updated_by
          )
          values ($1, $2, $3, $4::jsonb, $5::text[], $6::uuid[], $7, $8,
                  'confidential', $9, $9)
          returning ${customObjectColumns()}
        `,
        [
          input.definition.id,
          input.definition.tenantId,
          input.definition.objectKey,
          JSON.stringify(input.definition.fields),
          input.definition.workflowStates,
          input.definition.permissionRoleIds,
          input.definition.upgradeSafe,
          input.definition.connectorSdkEnabled,
          input.actorId
        ]
      );
      return mapCustomObject(result.rows[0]);
    });
  }

  async listCustomObjects(input: {
    tenantId: string;
    pagination: { limit: number; offset: number };
  }): Promise<CustomObjectDefinitionRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${customObjectColumns()} from custom_object_definitions where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapCustomObject);
    });
  }

  async findCustomObject(tenantId: string, definitionId: string): Promise<CustomObjectDefinitionRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${customObjectColumns()} from custom_object_definitions where tenant_id = $1 and id = $2`,
        [tenantId, definitionId]
      );
      return result.rows[0] ? mapCustomObject(result.rows[0]) : null;
    });
  }

  async updateCustomObjectStatus(
    input: Parameters<EnterpriseGrcRepository["updateCustomObjectStatus"]>[0]
  ): Promise<CustomObjectDefinitionRow> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          update custom_object_definitions
          set status = $3, validation_schema = coalesce($4::jsonb, validation_schema), updated_by = $5, updated_at = now(), version = version + 1
          where tenant_id = $1 and id = $2
          returning ${customObjectColumns()}
        `,
        [
          input.tenantId,
          input.definitionId,
          input.status,
          input.validationSchema ? JSON.stringify(input.validationSchema) : null,
          input.actorId
        ]
      );
      return mapCustomObject(result.rows[0]);
    });
  }

  async createCustomFieldDefinition(input: {
    field: CustomFieldDefinition;
    actorId: string;
  }): Promise<CustomFieldDefinitionRow> {
    return this.db.withTenant(input.field.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into custom_field_definitions (
            id, tenant_id, object_definition_id, field_key, data_type, required, validation_json,
            classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7::jsonb, 'confidential', $8, $8)
          returning ${customFieldDefinitionColumns()}
        `,
        [
          input.field.id,
          input.field.tenantId,
          input.field.objectDefinitionId,
          input.field.fieldKey,
          input.field.dataType,
          input.field.required,
          JSON.stringify(input.field.validationJson),
          input.actorId
        ]
      );
      return mapCustomFieldDefinition(result.rows[0]);
    });
  }

  async listCustomFieldDefinitions(input: {
    tenantId: string;
    objectDefinitionId: string;
    pagination: { limit: number; offset: number };
  }): Promise<CustomFieldDefinitionRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${customFieldDefinitionColumns()} from custom_field_definitions
          where tenant_id = $1 and object_definition_id = $2
          order by created_at asc limit $3 offset $4
        `,
        [input.tenantId, input.objectDefinitionId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapCustomFieldDefinition);
    });
  }

  async findCustomFieldDefinition(tenantId: string, fieldDefinitionId: string): Promise<CustomFieldDefinitionRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${customFieldDefinitionColumns()} from custom_field_definitions where tenant_id = $1 and id = $2`,
        [tenantId, fieldDefinitionId]
      );
      return result.rows[0] ? mapCustomFieldDefinition(result.rows[0]) : null;
    });
  }

  async createCustomRecord(input: { record: CustomRecord; actorId: string }): Promise<CustomRecordRow> {
    return this.db.withTenant(input.record.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into custom_records (id, tenant_id, object_definition_id, record_key, status, classification, created_by, updated_by)
          values ($1, $2, $3, $4, $5, 'confidential', $6, $6)
          returning ${customRecordColumns()}
        `,
        [input.record.id, input.record.tenantId, input.record.objectDefinitionId, input.record.recordKey, input.record.status, input.actorId]
      );
      return mapCustomRecord(result.rows[0]);
    });
  }

  async listCustomRecords(input: {
    tenantId: string;
    objectDefinitionId: string;
    pagination: { limit: number; offset: number };
  }): Promise<CustomRecordRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${customRecordColumns()} from custom_records
          where tenant_id = $1 and object_definition_id = $2
          order by created_at desc limit $3 offset $4
        `,
        [input.tenantId, input.objectDefinitionId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapCustomRecord);
    });
  }

  async findCustomRecord(tenantId: string, recordId: string): Promise<CustomRecordRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${customRecordColumns()} from custom_records where tenant_id = $1 and id = $2`,
        [tenantId, recordId]
      );
      return result.rows[0] ? mapCustomRecord(result.rows[0]) : null;
    });
  }

  async createCustomValue(input: { value: CustomValue; actorId: string }): Promise<CustomValueRow> {
    return this.db.withTenant(input.value.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into custom_values (id, tenant_id, record_id, field_definition_id, value_json, search_text, classification, created_by, updated_by)
          values ($1, $2, $3, $4, $5::jsonb, $6, 'confidential', $7, $7)
          returning ${customValueColumns()}
        `,
        [
          input.value.id,
          input.value.tenantId,
          input.value.recordId,
          input.value.fieldDefinitionId,
          input.value.valueJson === undefined ? null : JSON.stringify(input.value.valueJson),
          input.value.searchText ?? null,
          input.actorId
        ]
      );
      return mapCustomValue(result.rows[0]);
    });
  }

  async listCustomValues(input: {
    tenantId: string;
    recordId: string;
    pagination: { limit: number; offset: number };
  }): Promise<CustomValueRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${customValueColumns()} from custom_values
          where tenant_id = $1 and record_id = $2
          order by created_at asc limit $3 offset $4
        `,
        [input.tenantId, input.recordId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapCustomValue);
    });
  }

  async findCustomValue(tenantId: string, valueId: string): Promise<CustomValueRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${customValueColumns()} from custom_values where tenant_id = $1 and id = $2`,
        [tenantId, valueId]
      );
      return result.rows[0] ? mapCustomValue(result.rows[0]) : null;
    });
  }

  async createPolicyRecord(input: { policy: PolicyRecord; actorId: string }): Promise<PolicyRecordRow> {
    return this.db.withTenant(input.policy.tenantId, input.actorId, async (client) => {
      const policy = input.policy;
      const result = await client.query(
        `
          insert into policies (id, tenant_id, policy_key, title, owner_id, category, status, classification, created_by, updated_by)
          values ($1, $2, $3, $4, $5, $6, $7, 'confidential', $8, $8)
          returning ${policyRecordColumns()}
        `,
        [policy.id, policy.tenantId, policy.policyKey, policy.title, policy.ownerId, policy.category, policy.status, input.actorId]
      );
      return mapPolicyRecord(result.rows[0]);
    });
  }

  async listPolicyRecords(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<PolicyRecordRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${policyRecordColumns()} from policies where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapPolicyRecord);
    });
  }

  async findPolicyRecord(tenantId: string, policyRecordId: string): Promise<PolicyRecordRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(`select ${policyRecordColumns()} from policies where tenant_id = $1 and id = $2`, [
        tenantId,
        policyRecordId
      ]);
      return result.rows[0] ? mapPolicyRecord(result.rows[0]) : null;
    });
  }

  async createPolicyControlLink(input: { link: PolicyControlLink; actorId: string }): Promise<PolicyControlLinkRow> {
    return this.db.withTenant(input.link.tenantId, input.actorId, async (client) => {
      const link = input.link;
      const result = await client.query(
        `
          insert into policy_control_links (id, tenant_id, policy_version_id, control_id, coverage, classification, created_by, updated_by)
          values ($1, $2, $3, $4, $5, 'confidential', $6, $6)
          returning ${policyControlLinkColumns()}
        `,
        [link.id, link.tenantId, link.policyVersionId, link.controlId, link.coverage, input.actorId]
      );
      return mapPolicyControlLink(result.rows[0]);
    });
  }

  async listPolicyControlLinks(input: {
    tenantId: string;
    policyVersionId: string;
    pagination: { limit: number; offset: number };
  }): Promise<PolicyControlLinkRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${policyControlLinkColumns()} from policy_control_links where tenant_id = $1 and policy_version_id = $2 order by created_at desc limit $3 offset $4`,
        [input.tenantId, input.policyVersionId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapPolicyControlLink);
    });
  }

  async createPolicyAttestation(input: { attestation: PolicyAttestation; actorId: string }): Promise<PolicyAttestationRow> {
    return this.db.withTenant(input.attestation.tenantId, input.actorId, async (client) => {
      const attestation = input.attestation;
      const result = await client.query(
        `
          insert into policy_attestations (id, tenant_id, policy_version_id, user_id, decision, attested_at, evidence_hash, classification)
          values ($1, $2, $3, $4, $5, $6, $7, 'confidential')
          returning ${policyAttestationColumns()}
        `,
        [
          attestation.id,
          attestation.tenantId,
          attestation.policyVersionId,
          attestation.userId,
          attestation.decision,
          attestation.attestedAt,
          attestation.evidenceHash
        ]
      );
      return mapPolicyAttestation(result.rows[0]);
    });
  }

  async listPolicyAttestations(input: {
    tenantId: string;
    policyVersionId: string;
    pagination: { limit: number; offset: number };
  }): Promise<PolicyAttestationRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${policyAttestationColumns()} from policy_attestations where tenant_id = $1 and policy_version_id = $2 order by created_at desc limit $3 offset $4`,
        [input.tenantId, input.policyVersionId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapPolicyAttestation);
    });
  }

  async createAccessReviewItem(input: { item: AccessReviewItem; actorId: string }): Promise<AccessReviewItemRow> {
    return this.db.withTenant(input.item.tenantId, input.actorId, async (client) => {
      const item = input.item;
      const result = await client.query(
        `
          insert into access_review_items (
            id, tenant_id, access_review_id, principal_ref, resource_ref, entitlement_ref, risk_level,
            classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, 'confidential', $8, $8)
          returning ${accessReviewItemColumns()}
        `,
        [item.id, item.tenantId, item.accessReviewId, item.principalRef, item.resourceRef, item.entitlementRef, item.riskLevel, input.actorId]
      );
      return mapAccessReviewItem(result.rows[0]);
    });
  }

  async listAccessReviewItems(input: {
    tenantId: string;
    accessReviewId: string;
    pagination: { limit: number; offset: number };
  }): Promise<AccessReviewItemRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${accessReviewItemColumns()} from access_review_items where tenant_id = $1 and access_review_id = $2 order by created_at desc limit $3 offset $4`,
        [input.tenantId, input.accessReviewId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapAccessReviewItem);
    });
  }

  async findAccessReviewItem(tenantId: string, itemId: string): Promise<AccessReviewItemRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${accessReviewItemColumns()} from access_review_items where tenant_id = $1 and id = $2`,
        [tenantId, itemId]
      );
      return result.rows[0] ? mapAccessReviewItem(result.rows[0]) : null;
    });
  }

  async createAccessReviewDecision(input: {
    decision: AccessReviewDecisionRecord;
    actorId: string;
  }): Promise<AccessReviewDecisionRow> {
    return this.db.withTenant(input.decision.tenantId, input.actorId, async (client) => {
      const decision = input.decision;
      const result = await client.query(
        `
          insert into access_review_decisions (id, tenant_id, review_item_id, reviewer_id, decision, rationale, decided_at, classification)
          values ($1, $2, $3, $4, $5, $6, $7, 'confidential')
          returning ${accessReviewDecisionColumns()}
        `,
        [decision.id, decision.tenantId, decision.reviewItemId, decision.reviewerId, decision.decision, decision.rationale ?? null, decision.decidedAt]
      );
      return mapAccessReviewDecision(result.rows[0]);
    });
  }

  async listAccessReviewDecisions(input: {
    tenantId: string;
    reviewItemId: string;
    pagination: { limit: number; offset: number };
  }): Promise<AccessReviewDecisionRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${accessReviewDecisionColumns()} from access_review_decisions where tenant_id = $1 and review_item_id = $2 order by decided_at desc limit $3 offset $4`,
        [input.tenantId, input.reviewItemId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapAccessReviewDecision);
    });
  }

  async createVendorAssessment(input: { assessment: VendorAssessmentRecord; actorId: string }): Promise<VendorAssessmentRow> {
    return this.db.withTenant(input.assessment.tenantId, input.actorId, async (client) => {
      const assessment = input.assessment;
      const result = await client.query(
        `
          insert into vendor_assessments (
            id, tenant_id, vendor_id, assessment_type, period, status, reviewer_id, score,
            classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, 'confidential', $9, $9)
          returning ${vendorAssessmentColumns()}
        `,
        [
          assessment.id,
          assessment.tenantId,
          assessment.vendorId,
          assessment.assessmentType,
          assessment.period,
          assessment.status,
          assessment.reviewerId,
          assessment.score ?? null,
          input.actorId
        ]
      );
      return mapVendorAssessment(result.rows[0]);
    });
  }

  async listVendorAssessments(input: {
    tenantId: string;
    vendorId: string;
    pagination: { limit: number; offset: number };
  }): Promise<VendorAssessmentRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${vendorAssessmentColumns()} from vendor_assessments where tenant_id = $1 and vendor_id = $2 order by created_at desc limit $3 offset $4`,
        [input.tenantId, input.vendorId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapVendorAssessment);
    });
  }

  async findVendorAssessment(tenantId: string, assessmentId: string): Promise<VendorAssessmentRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${vendorAssessmentColumns()} from vendor_assessments where tenant_id = $1 and id = $2`,
        [tenantId, assessmentId]
      );
      return result.rows[0] ? mapVendorAssessment(result.rows[0]) : null;
    });
  }

  async createVendorFinding(input: { finding: VendorFindingRecord; actorId: string }): Promise<VendorFindingRow> {
    return this.db.withTenant(input.finding.tenantId, input.actorId, async (client) => {
      const finding = input.finding;
      const result = await client.query(
        `
          insert into vendor_findings (
            id, tenant_id, vendor_assessment_id, severity, title, status, due_at,
            classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, 'confidential', $8, $8)
          returning ${vendorFindingColumns()}
        `,
        [finding.id, finding.tenantId, finding.vendorAssessmentId, finding.severity, finding.title, finding.status, finding.dueAt ?? null, input.actorId]
      );
      return mapVendorFinding(result.rows[0]);
    });
  }

  async listVendorFindings(input: {
    tenantId: string;
    vendorAssessmentId: string;
    pagination: { limit: number; offset: number };
  }): Promise<VendorFindingRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${vendorFindingColumns()} from vendor_findings where tenant_id = $1 and vendor_assessment_id = $2 order by created_at desc limit $3 offset $4`,
        [input.tenantId, input.vendorAssessmentId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapVendorFinding);
    });
  }

  async createAuditRequest(input: { request: AuditRequestRecord; actorId: string }): Promise<AuditRequestRow> {
    return this.db.withTenant(input.request.tenantId, input.actorId, async (client) => {
      const request = input.request;
      const result = await client.query(
        `
          insert into audit_requests (
            id, tenant_id, audit_engagement_id, control_id, requested_from, due_at, status,
            classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, 'confidential', $8, $8)
          returning ${auditRequestColumns()}
        `,
        [request.id, request.tenantId, request.auditEngagementId, request.controlId ?? null, request.requestedFrom, request.dueAt, request.status, input.actorId]
      );
      return mapAuditRequest(result.rows[0]);
    });
  }

  async listAuditRequests(input: {
    tenantId: string;
    auditEngagementId: string;
    pagination: { limit: number; offset: number };
  }): Promise<AuditRequestRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${auditRequestColumns()} from audit_requests where tenant_id = $1 and audit_engagement_id = $2 order by created_at desc limit $3 offset $4`,
        [input.tenantId, input.auditEngagementId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapAuditRequest);
    });
  }

  async createAuditTest(input: { test: AuditTestRecord; actorId: string }): Promise<AuditTestRow> {
    return this.db.withTenant(input.test.tenantId, input.actorId, async (client) => {
      const test = input.test;
      const result = await client.query(
        `
          insert into audit_tests (
            id, tenant_id, audit_engagement_id, control_instance_id, procedure, sample_ref, conclusion, reviewer_id,
            classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, 'confidential', $9, $9)
          returning ${auditTestColumns()}
        `,
        [
          test.id,
          test.tenantId,
          test.auditEngagementId,
          test.controlInstanceId ?? null,
          test.procedure,
          test.sampleRef ?? null,
          test.conclusion,
          test.reviewerId ?? null,
          input.actorId
        ]
      );
      return mapAuditTest(result.rows[0]);
    });
  }

  async listAuditTests(input: {
    tenantId: string;
    auditEngagementId: string;
    pagination: { limit: number; offset: number };
  }): Promise<AuditTestRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${auditTestColumns()} from audit_tests where tenant_id = $1 and audit_engagement_id = $2 order by created_at desc limit $3 offset $4`,
        [input.tenantId, input.auditEngagementId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapAuditTest);
    });
  }
}

function policyColumns(): string {
  return `id, tenant_id, version, template_key, title, policy_version, status, approver_id, published_at,
    attestation_evidence_ids, exceptions, content_hash, classification, created_by, created_at, updated_by, updated_at`;
}

function accessReviewColumns(): string {
  return `id, tenant_id, version, population_source, certifier_id, decisions, remediation_task_ids,
    classification, created_by, created_at, updated_by, updated_at`;
}

function vendorColumns(): string {
  return `id, tenant_id, version, name, tier, systems, contract_ids, control_ids, incident_ids,
    questionnaire_ids, monitoring_findings, renewal_at, classification, created_by, created_at, updated_by, updated_at`;
}

function auditColumns(): string {
  return `id, tenant_id, version, name, status, request_list_ids, evidence_ids, finding_ids,
    management_responses, classification, created_by, created_at, updated_by, updated_at`;
}

function trustArtifactColumns(): string {
  return `id, tenant_id, version, title, artifact_version, approved, visibility, artifact_evidence_id,
    nda_required, crm_account_id, download_events, classification, created_by, created_at, updated_by, updated_at`;
}

function workspaceColumns(): string {
  return `id, tenant_id, version, business_unit, parent_workspace_id, inherited_control_ids,
    delegated_admin_ids, classification, created_by, created_at, updated_by, updated_at`;
}

function customObjectColumns(): string {
  return `id, tenant_id, version, object_key, fields, workflow_states, permission_role_ids,
    upgrade_safe, connector_sdk_enabled, status, validation_schema,
    classification, created_by, created_at, updated_by, updated_at`;
}

function customFieldDefinitionColumns(): string {
  return `id, tenant_id, version, object_definition_id, field_key, data_type, required, validation_json,
    classification, created_by, created_at, updated_by, updated_at`;
}

function customRecordColumns(): string {
  return `id, tenant_id, version, object_definition_id, record_key, status,
    classification, created_by, created_at, updated_by, updated_at`;
}

function customValueColumns(): string {
  return `id, tenant_id, version, record_id, field_definition_id, value_json, search_text,
    classification, created_by, created_at, updated_by, updated_at`;
}

function mapPolicy(row: Record<string, unknown>): PolicyVersionRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    templateKey: String(row.template_key),
    title: String(row.title),
    version: String(row.policy_version),
    status: row.status as PolicyVersionRow["status"],
    approverId: row.approver_id ? String(row.approver_id) : undefined,
    publishedAt: row.published_at ? (row.published_at as Date) : undefined,
    attestationEvidenceIds: (row.attestation_evidence_ids as string[] | null) ?? [],
    exceptions: mapJsonArray<PolicyVersion["exceptions"][number]>(row.exceptions),
    contentHash: String(row.content_hash),
    ...metadata(row)
  };
}

function mapAccessReview(row: Record<string, unknown>): AccessReviewRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    populationSource: String(row.population_source),
    certifierId: String(row.certifier_id),
    decisions: mapJsonArray<AccessReview["decisions"][number]>(row.decisions),
    remediationTaskIds: (row.remediation_task_ids as string[] | null) ?? [],
    ...metadata(row)
  };
}

function mapVendor(row: Record<string, unknown>): VendorRecordRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    name: String(row.name),
    tier: row.tier as VendorRecordRow["tier"],
    systems: (row.systems as string[] | null) ?? [],
    contractIds: (row.contract_ids as string[] | null) ?? [],
    controlIds: (row.control_ids as string[] | null) ?? [],
    incidentIds: (row.incident_ids as string[] | null) ?? [],
    questionnaireIds: (row.questionnaire_ids as string[] | null) ?? [],
    monitoringFindings: (row.monitoring_findings as string[] | null) ?? [],
    renewalAt: row.renewal_at as Date,
    ...metadata(row)
  };
}

function mapAuditEngagement(row: Record<string, unknown>): AuditEngagementRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    name: String(row.name),
    status: row.status as AuditEngagementRow["status"],
    requestListIds: (row.request_list_ids as string[] | null) ?? [],
    evidenceIds: (row.evidence_ids as string[] | null) ?? [],
    findingIds: (row.finding_ids as string[] | null) ?? [],
    managementResponses: mapJsonArray<AuditEngagement["managementResponses"][number]>(row.management_responses),
    ...metadata(row)
  };
}

function mapTrustArtifact(row: Record<string, unknown>): TrustCenterArtifactRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    title: String(row.title),
    version: String(row.artifact_version),
    approved: Boolean(row.approved),
    visibility: row.visibility as TrustCenterArtifactRow["visibility"],
    artifactEvidenceId: String(row.artifact_evidence_id),
    ndaRequired: Boolean(row.nda_required),
    crmAccountId: row.crm_account_id ? String(row.crm_account_id) : undefined,
    downloadEvents: mapJsonArray<TrustCenterArtifact["downloadEvents"][number]>(row.download_events),
    ...metadata(row)
  };
}

function mapWorkspace(row: Record<string, unknown>): GrcWorkspaceRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    businessUnit: String(row.business_unit),
    parentWorkspaceId: row.parent_workspace_id ? String(row.parent_workspace_id) : undefined,
    inheritedControlIds: (row.inherited_control_ids as string[] | null) ?? [],
    delegatedAdminIds: (row.delegated_admin_ids as string[] | null) ?? [],
    ...metadata(row)
  };
}

function mapCustomObject(row: Record<string, unknown>): CustomObjectDefinitionRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    objectKey: String(row.object_key),
    fields: mapJsonArray<CustomObjectDefinition["fields"][number]>(row.fields),
    workflowStates: (row.workflow_states as string[] | null) ?? [],
    permissionRoleIds: (row.permission_role_ids as string[] | null) ?? [],
    upgradeSafe: Boolean(row.upgrade_safe),
    connectorSdkEnabled: Boolean(row.connector_sdk_enabled),
    status: row.status as CustomObjectDefinitionRow["status"],
    validationSchema: (row.validation_schema as Record<string, unknown> | null) ?? undefined,
    ...metadata(row)
  };
}

function mapCustomFieldDefinition(row: Record<string, unknown>): CustomFieldDefinitionRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    objectDefinitionId: String(row.object_definition_id),
    fieldKey: String(row.field_key),
    dataType: row.data_type as CustomFieldDefinitionRow["dataType"],
    required: Boolean(row.required),
    validationJson: (row.validation_json as Record<string, unknown> | null) ?? {},
    ...metadata(row)
  };
}

function mapCustomRecord(row: Record<string, unknown>): CustomRecordRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    objectDefinitionId: String(row.object_definition_id),
    recordKey: String(row.record_key),
    status: row.status as CustomRecordRow["status"],
    ...metadata(row)
  };
}

function mapCustomValue(row: Record<string, unknown>): CustomValueRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    recordId: String(row.record_id),
    fieldDefinitionId: String(row.field_definition_id),
    valueJson: row.value_json ?? undefined,
    searchText: row.search_text ? String(row.search_text) : undefined,
    ...metadata(row)
  };
}

function metadata(row: Record<string, unknown>) {
  return {
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

// For append-only rows with no updated_by/updated_at column at all
// (policy_attestations, access_review_decisions) — see the column-list
// comments above for why these two tables have no mutable-row columns.
function appendOnlyMetadata(row: Record<string, unknown>) {
  return {
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date
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

function policyRecordColumns(): string {
  return `id, tenant_id, version, policy_key, title, owner_id, category, status, classification, created_by, created_at, updated_by, updated_at`;
}

function policyControlLinkColumns(): string {
  return `id, tenant_id, version, policy_version_id, control_id, coverage, classification, created_by, created_at, updated_by, updated_at`;
}

// policy_attestations is append-only (created_by/created_at are generated
// columns from user_id/attested_at) — no updated_by/updated_at exist.
function policyAttestationColumns(): string {
  return `id, tenant_id, version, policy_version_id, user_id, decision, attested_at, evidence_hash, classification, created_by, created_at`;
}

function accessReviewItemColumns(): string {
  return `id, tenant_id, version, access_review_id, principal_ref, resource_ref, entitlement_ref, risk_level, classification, created_by, created_at, updated_by, updated_at`;
}

// access_review_decisions is append-only (created_by/created_at are
// generated columns from reviewer_id/decided_at) — no updated_by/updated_at
// exist, matching policy_attestations and the pre-existing
// risk_acceptance_reviews precedent.
function accessReviewDecisionColumns(): string {
  return `id, tenant_id, version, review_item_id, reviewer_id, decision, rationale, decided_at, classification, created_by, created_at`;
}

function vendorAssessmentColumns(): string {
  return `id, tenant_id, version, vendor_id, assessment_type, period, status, reviewer_id, score, classification, created_by, created_at, updated_by, updated_at`;
}

function vendorFindingColumns(): string {
  return `id, tenant_id, version, vendor_assessment_id, severity, title, status, due_at, classification, created_by, created_at, updated_by, updated_at`;
}

function auditRequestColumns(): string {
  return `id, tenant_id, version, audit_engagement_id, control_id, requested_from, due_at, status, classification, created_by, created_at, updated_by, updated_at`;
}

function auditTestColumns(): string {
  return `id, tenant_id, version, audit_engagement_id, control_instance_id, procedure, sample_ref, conclusion, reviewer_id, classification, created_by, created_at, updated_by, updated_at`;
}

function mapPolicyRecord(row: Record<string, unknown>): PolicyRecordRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    policyKey: String(row.policy_key),
    title: String(row.title),
    ownerId: String(row.owner_id),
    category: String(row.category),
    status: row.status as PolicyRecord["status"],
    ...metadata(row)
  };
}

function mapPolicyControlLink(row: Record<string, unknown>): PolicyControlLinkRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    policyVersionId: String(row.policy_version_id),
    controlId: String(row.control_id),
    coverage: row.coverage as PolicyControlLink["coverage"],
    ...metadata(row)
  };
}

function mapPolicyAttestation(row: Record<string, unknown>): PolicyAttestationRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    policyVersionId: String(row.policy_version_id),
    userId: String(row.user_id),
    decision: row.decision as PolicyAttestation["decision"],
    evidenceHash: String(row.evidence_hash),
    attestedAt: row.attested_at as Date,
    ...appendOnlyMetadata(row)
  };
}

function mapAccessReviewItem(row: Record<string, unknown>): AccessReviewItemRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    accessReviewId: String(row.access_review_id),
    principalRef: String(row.principal_ref),
    resourceRef: String(row.resource_ref),
    entitlementRef: String(row.entitlement_ref),
    riskLevel: row.risk_level as AccessReviewItem["riskLevel"],
    ...metadata(row)
  };
}

function mapAccessReviewDecision(row: Record<string, unknown>): AccessReviewDecisionRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    reviewItemId: String(row.review_item_id),
    reviewerId: String(row.reviewer_id),
    decision: row.decision as AccessReviewDecisionRecord["decision"],
    rationale: row.rationale ? String(row.rationale) : undefined,
    decidedAt: row.decided_at as Date,
    ...appendOnlyMetadata(row)
  };
}

function mapVendorAssessment(row: Record<string, unknown>): VendorAssessmentRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    vendorId: String(row.vendor_id),
    assessmentType: row.assessment_type as VendorAssessmentRecord["assessmentType"],
    period: String(row.period),
    status: row.status as VendorAssessmentRecord["status"],
    reviewerId: String(row.reviewer_id),
    score: row.score !== null && row.score !== undefined ? Number(row.score) : undefined,
    ...metadata(row)
  };
}

function mapVendorFinding(row: Record<string, unknown>): VendorFindingRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    vendorAssessmentId: String(row.vendor_assessment_id),
    severity: row.severity as VendorFindingRecord["severity"],
    title: String(row.title),
    status: row.status as VendorFindingRecord["status"],
    dueAt: row.due_at ? (row.due_at as Date) : undefined,
    ...metadata(row)
  };
}

function mapAuditRequest(row: Record<string, unknown>): AuditRequestRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    auditEngagementId: String(row.audit_engagement_id),
    controlId: row.control_id ? String(row.control_id) : undefined,
    requestedFrom: String(row.requested_from),
    dueAt: row.due_at as Date,
    status: row.status as AuditRequestRecord["status"],
    ...metadata(row)
  };
}

function mapAuditTest(row: Record<string, unknown>): AuditTestRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    auditEngagementId: String(row.audit_engagement_id),
    controlInstanceId: row.control_instance_id ? String(row.control_instance_id) : undefined,
    procedure: String(row.procedure),
    sampleRef: row.sample_ref ? String(row.sample_ref) : undefined,
    conclusion: row.conclusion as AuditTestRecord["conclusion"],
    reviewerId: row.reviewer_id ? String(row.reviewer_id) : undefined,
    ...metadata(row)
  };
}
