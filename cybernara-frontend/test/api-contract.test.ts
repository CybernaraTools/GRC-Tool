import { describe, expect, it } from "vitest";
import { CONTRACT_SHA256, operations } from "../src/lib/api/generated";

describe("generated API client", () => {
  it("pins a backend contract hash", () => {
    expect(CONTRACT_SHA256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("contains the exposed backend operations used by the frontend", () => {
    const operationIds = operations.map((operation) => operation.operationId);
    expect(new Set(operationIds).size).toBe(operationIds.length);
    expect(operationIds).toEqual(
      expect.arrayContaining([
        "getRootStatus",
        "getHealth",
        "registerTenant",
        "getTenant",
        "listAdminRoles",
        "listAdminUsers",
        "inviteAdminUser",
        "updateAdminUser",
        "listPlatformTenants",
        "createPlatformTenant",
        "invitePlatformTenantAdmin",
        "listFrameworkContentPacks",
        "listFrameworkRequirements",
        "listHarmonizedControls",
        "listHarmonizationMappingsByFramework",
        "listAssessments",
        "createAssessment",
        "listAssessmentItems",
        "initiateEvidenceUpload",
        "getEvidenceUploadPolicy",
        "uploadEvidenceObject",
        "commitEvidenceObject",
        "listUniversalTasks",
        "calculateDiff",
        "listImpacts",
        "resolveImpact",
        "requestAiQuestionGeneration",
        "triggerAiQuestionFallback",
        "listPendingAiQuestions",
        "listApprovedAiQuestions",
        "getAiGenerationProvenance",
        "reviewAiGeneration",
        "publishAiQuestion",
        "listAiQuestionPublicationEvents",
        "listPrivacyRightsRequests",
        "listRetentionSchedules",
        "createRetentionSchedule",
        "listDeletionJobs",
        "createDeletionJob",
        "listEnterpriseCustomObjectDefinitions",
        "createEnterpriseCustomObjectDefinition",
        "listAuditCheckpoints",
        "verifyAuditCheckpoint"
      ])
    );
  });
});
