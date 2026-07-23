import { describe, expect, it } from "vitest";
import {
  addRightsSearchTask,
  completeRightsRequest,
  createDataInventoryRecord,
  createDpiaAssessment,
  createPrivacyIncident,
  createProcessingActivity,
  createRetentionSchedule,
  createRightsRequest,
  evaluateRetention,
  grantConsent,
  verifyRightsRequestIdentity,
  withdrawConsent
} from "../../src/modules/privacy-operations/domain/privacy.js";
import {
  addPolicyException,
  createAccessReview,
  createAuditEngagement,
  createCustomObjectDefinition,
  createVendorRecord,
  createWorkspace,
  draftPolicy,
  publishPolicy,
  publishTrustCenterArtifact,
  recordTrustCenterDownload
} from "../../src/modules/enterprise-grc/domain/grc.js";

const tenantId = "00000000-0000-4000-8000-000000000001";
const ownerId = "00000000-0000-4000-8000-000000000003";
const approverId = "00000000-0000-4000-8000-000000000004";

describe("PrivacyOperations foundation", () => {
  it("links inventory, RoPA, DPIA, rights, consent, incidents, transfers, retention, and evidence", () => {
    const processing = createProcessingActivity({
      tenantId,
      purpose: "Customer support case handling",
      lawfulBasis: "contract",
      dataSubjectCategories: ["customer"],
      recipients: ["support-processor"],
      transfers: ["SCC:US"],
      retentionMonths: 24,
      jurisdiction: "GDPR",
      inventoryRecordIds: ["inventory-placeholder"]
    });
    const inventory = createDataInventoryRecord({
      tenantId,
      systemName: "Support CRM",
      dataElements: ["name", "email", "support conversation"],
      ownerId,
      locations: ["eu-west-1", "us-east-1"],
      classification: "confidential",
      lineage: ["web-form", "support-crm", "data-warehouse"],
      processingActivityIds: [processing.id],
      controlIds: ["HARM-PRIV-001"],
      vendorIds: ["vendor-support"],
      evidenceIds: ["evidence-data-map"]
    });
    const dpia = createDpiaAssessment({
      tenantId,
      processingActivityId: processing.id,
      riskLevel: "high",
      residualRiskScore: 82,
      approvals: [{ actorId: approverId, role: "privacy_officer", approvedAt: new Date("2026-07-02T00:00:00.000Z") }],
      findings: ["finding-high-risk-transfer"]
    });
    const request = completeRightsRequest(
      addRightsSearchTask(
        verifyRightsRequestIdentity(
          createRightsRequest({
            tenantId,
            subjectId: "subject-123",
            requestType: "access",
            openedAt: new Date("2026-07-02T00:00:00.000Z"),
            slaDays: 30
          })
        ),
        { systemName: inventory.systemName, ownerId }
      ),
      {
        completionEvidenceIds: ["evidence-dsr-response"],
        communication: {
          channel: "email",
          message: "Access response completed.",
          sentAt: new Date("2026-07-10T00:00:00.000Z")
        }
      }
    );
    const withdrawn = withdrawConsent(
      grantConsent({
        tenantId,
        subjectId: "subject-123",
        purpose: "marketing",
        version: "notice-v3",
        region: "EU",
        actorId: "subject-123",
        at: new Date("2026-07-01T00:00:00.000Z")
      }),
      { actorId: "subject-123", reason: "User preference center withdrawal.", at: new Date("2026-07-03T00:00:00.000Z") }
    );
    const incident = createPrivacyIncident({
      tenantId,
      severity: "high",
      impactedProcessingActivityIds: [processing.id],
      evidenceIds: ["evidence-incident-log"],
      reportIds: ["report-breach-assessment"],
      discoveredAt: new Date("2026-07-02T00:00:00.000Z"),
      actorId: ownerId
    });
    const retention = createRetentionSchedule({
      tenantId,
      dataCategory: "support conversation",
      jurisdiction: "GDPR",
      residency: "EU",
      transferMechanism: "SCC",
      retentionMonths: 24,
      legalHold: true,
      disposalEvidenceIds: []
    });

    expect(processing.version).toMatch(/^[a-f0-9]{64}$/);
    expect(inventory.processingActivityIds).toContain(processing.id);
    expect(dpia.reviewObligationIds).toHaveLength(1);
    expect(request.status).toBe("completed");
    expect(request.completionEvidenceIds).toContain("evidence-dsr-response");
    expect(withdrawn.status).toBe("withdrawn");
    expect(incident.regulatorNotificationDueAt.toISOString()).toBe("2026-07-05T00:00:00.000Z");
    expect(evaluateRetention(retention, 36)).toBe("legal_hold_exception");
  });
});

describe("EnterpriseGRC foundation", () => {
  it("manages policies, access reviews, vendors, audits, trust artifacts, workspaces, and custom objects", () => {
    const policy = addPolicyException(
      publishPolicy(
        draftPolicy({
          tenantId,
          templateKey: "acceptable-use",
          title: "Acceptable Use Policy",
          version: "2026.07",
          content: "Employees must protect company systems and data."
        }),
        { approverId, attestationEvidenceIds: ["evidence-attestation"], publishedAt: new Date("2026-07-02T00:00:00.000Z") }
      ),
      { ownerId, reason: "Temporary legacy system exception.", expiresAt: new Date("2026-08-01T00:00:00.000Z") }
    );
    const accessReview = createAccessReview({
      tenantId,
      populationSource: "okta-prod",
      certifierId: approverId,
      decisions: [
        {
          subjectId: "alice",
          resourceId: "finance-app-admin",
          decision: "revoked",
          evidenceId: "evidence-revocation"
        }
      ]
    });
    const vendor = createVendorRecord({
      tenantId,
      name: "Support Processor",
      tier: "high",
      systems: ["Support CRM"],
      contractIds: ["dpa-2026"],
      controlIds: ["HARM-PRIV-001"],
      incidentIds: ["incident-privacy"],
      questionnaireIds: ["questionnaire-soc2"],
      monitoringFindings: ["finding-high-risk-transfer"],
      renewalAt: new Date("2027-07-02T00:00:00.000Z")
    });
    const audit = createAuditEngagement({
      tenantId,
      name: "FY26 SOC 2 Readiness",
      status: "fieldwork",
      requestListIds: ["request-list-1"],
      evidenceIds: ["evidence-attestation", "evidence-revocation"],
      findingIds: ["finding-high-risk-transfer"],
      managementResponses: [{ ownerId, response: "Remediation accepted.", dueAt: new Date("2026-08-01T00:00:00.000Z") }]
    });
    const trustArtifact = recordTrustCenterDownload(
      publishTrustCenterArtifact({
        tenantId,
        title: "SOC 2 Bridge Letter",
        version: "2026.07",
        approved: true,
        visibility: "private",
        artifactEvidenceId: "evidence-bridge-letter",
        ndaRequired: true,
        crmAccountId: "acct-123"
      }),
      { actorId: "customer-user", downloadedAt: new Date("2026-07-02T00:00:00.000Z") }
    );
    const workspace = createWorkspace({
      tenantId,
      businessUnit: "North America",
      inheritedControlIds: ["HARM-PRIV-001"],
      delegatedAdminIds: [ownerId]
    });
    const customObject = createCustomObjectDefinition({
      tenantId,
      objectKey: "local_regulator_action",
      fields: [{ key: "deadline", type: "date", required: true }],
      workflowStates: ["open", "submitted", "closed"],
      permissionRoleIds: ["privacy-admin"],
      upgradeSafe: true,
      connectorSdkEnabled: true
    });

    expect(policy.status).toBe("published");
    expect(policy.exceptions).toHaveLength(1);
    expect(accessReview.remediationTaskIds).toContain("remediate:alice:finance-app-admin");
    expect(vendor.controlIds).toContain("HARM-PRIV-001");
    expect(audit.evidenceIds).toContain("evidence-revocation");
    expect(trustArtifact.downloadEvents).toHaveLength(1);
    expect(workspace.delegatedAdminIds).toContain(ownerId);
    expect(customObject.connectorSdkEnabled).toBe(true);
  });
});
