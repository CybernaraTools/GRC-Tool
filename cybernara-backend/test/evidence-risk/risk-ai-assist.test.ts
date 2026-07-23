import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import type { AssessmentService, QuestionRepositoryService } from "../../src/modules/assessment/public.js";
import type { EvidenceAssuranceService } from "../../src/modules/evidence-assurance/public.js";
import { RiskAiAssistantService } from "../../src/modules/risk-workflow/application/risk-ai-assistant.service.js";
import type { RiskWorkflowService } from "../../src/modules/risk-workflow/public.js";

const originalFetch = globalThis.fetch;
const originalEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_DB_URL: process.env.SUPABASE_DB_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  restoreEnv();
});

describe("RiskAiAssistantService", () => {
  it("builds a governed risk context package and parses a structured OpenAI risk proposal", async () => {
    applyTestEnv();
    const tenantId = randomUUID();
    const assessmentId = randomUUID();
    const itemId = randomUUID();
    const findingId = randomUUID();
    const evidenceId = randomUUID();
    const questionVersionId = randomUUID();
    const providerRequests: unknown[] = [];

    globalThis.fetch = (async (_url, init) => {
      providerRequests.push(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            escalationDecision: "create_new_risk",
            escalationDecisionRationale: "The finding and extracted evidence both identify missing owner confirmation.",
            findingReassessmentRecommended: false,
            recommendedExistingRiskKey: null,
            recommendedExistingRiskTitle: null,
            recommendedExistingRiskReason: null,
            riskTitle: "Incomplete Asset Ownership and Lifecycle Governance",
            riskStatement: "Incomplete asset ownership validation may allow unmanaged assets to remain operational.",
            category: "technology",
            categoryRationale: "The deficiency is in asset lifecycle governance and technology inventory ownership.",
            source: `Finding ${findingId}`,
            suggestedLikelihood: "likely",
            suggestedImpact: "medium",
            suggestedInherentRisk: "high",
            inherentScore: 78,
            residualScore: 44,
            riskScoringMethod: "Scores use the standard v1 model on a 0-100 scale where higher values mean greater exposure.",
            inherentScoreRationale: "78 reflects likely occurrence and medium impact before treatment because evidence shows owner-confirmation gaps.",
            residualScoreRationale: "44 reflects reduced but still present exposure after quarterly certification and reconciliation are implemented.",
            confidence: 0.87,
            suggestedTreatment: "mitigate",
            treatmentRationale: "Mitigation is appropriate because reconciliation and owner certification can directly reduce the gap.",
            suggestedMitigation: "Perform asset reconciliation, assign missing owners, and run quarterly lifecycle certification.",
            suggestedEvidenceRequired: [
              "Reconciled asset inventory",
              "Asset ownership certification",
              "Lifecycle review report"
            ],
            potentialRelatedRisks: [
              {
                riskKey: "RISK-017",
                title: "Unmanaged Technology Assets",
                reason: "Existing risk title overlaps the asset inventory and lifecycle gap."
              }
            ],
            frameworkImpact: [
              {
                frameworkKey: "SOC2",
                requirementRefs: ["SOC2:CC6.1"],
                impact: "Asset ownership weakness may reduce confidence in logical access control scoping."
              }
            ],
            evidenceAnalysis: [
              {
                fileName: "asset-management-evidence.txt",
                relevance: "high",
                documentPurpose: "Asset inventory exception support.",
                summary: "The file includes asset inventory records but lists missing owner confirmations.",
                keyFacts: [
                  "The active inventory includes assets without owner confirmation.",
                  "The evidence covers the current quarterly review sample."
                ],
                controlCoverage: [
                  "Supports inventory existence.",
                  "Does not fully support owner certification."
                ],
                notableExcerpts: ["Missing owner confirmation for sampled assets."],
                supports: ["EV-ASSET-MANAGEMENT-ASSET-INVENTORY-EXPORT"],
                gaps: ["Quarterly owner certification is incomplete."],
                riskSignals: ["Unowned assets remain in the active inventory."],
                limitations: ["The evidence covers one quarter only."],
                reviewerConclusion: "Escalation is supportable because the file identifies an ownership deficiency."
              }
            ],
            aiRationale: "The answer describes the process, but evidence shows ownership exceptions.",
            sourcesUsed: ["Question", "Answer", "Finding", "Evidence #1", "HARM-00002", "SOC2:CC6.1"]
          })
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }) as typeof fetch;

    const service = new RiskAiAssistantService(
      mockEvidenceService(evidenceId),
      mockRiskWorkflowService({ tenantId, findingId, itemId }),
      mockAssessmentService({ tenantId, assessmentId, itemId, evidenceId, questionVersionId }),
      mockQuestionRepositoryService(questionVersionId)
    );

    const recommendation = await service.recommend({ tenantId, findingId, assessmentId });

    expect(recommendation.riskTitle).toBe("Incomplete Asset Ownership and Lifecycle Governance");
    expect(recommendation.escalationDecision).toBe("create_new_risk");
    expect(recommendation.findingReassessmentRecommended).toBe(false);
    expect(recommendation.suggestedTreatment).toBe("mitigate");
    expect(recommendation.categoryRationale).toContain("asset lifecycle");
    expect(recommendation.riskScoringMethod).toContain("0-100");
    expect(recommendation.inherentScoreRationale).toContain("78");
    expect(recommendation.residualScoreRationale).toContain("44");
    expect(recommendation.treatmentRationale).toContain("Mitigation");
    expect(recommendation.evidenceFiles[0].extractedText).toContain("missing owner confirmation");
    expect(recommendation.contextSummary.assessmentName).toBe("FY26 Asset Management Review");
    expect(recommendation.contextSummary.relatedRiskCount).toBe(1);
    expect(recommendation.model).toBe("gpt-4.1-mini");
    expect(providerRequests).toHaveLength(1);
    const request = providerRequests[0] as { input: Array<{ content: string }> };
    expect(request.input[0].content).toContain("You are not forced to create a risk for every finding.");
    expect(request.input[0].content).toContain("generic hypothetical statement");
    expect(request.input[0].content).toContain("riskCategorySignals.suggestedCategory");
    expect(request.input[0].content).toContain("inherentScoreRationale");
    expect(request.input[0].content).toContain("residualScoreRationale");
    expect(request.input[1].content).toContain("riskAnalysisContextPackage");
    expect(request.input[1].content).toContain("Asset inventory evidence includes one missing owner confirmation.");
    expect(request.input[1].content).toContain("RISK-017");
    expect(request.input[1].content).toContain("riskCategorySignals");
    expect(request.input[1].content).toContain("sum(impact,likelihood)");
    expect(request.input[1].content).toContain("SOC2:CC6.1");
  });

  it("allows the AI to recommend no escalation and finding reassessment when evidence contradicts the finding", async () => {
    applyTestEnv();
    const tenantId = randomUUID();
    const assessmentId = randomUUID();
    const itemId = randomUUID();
    const findingId = randomUUID();
    const evidenceId = randomUUID();
    const questionVersionId = randomUUID();

    globalThis.fetch = (async () => new Response(
      JSON.stringify({
        output_text: JSON.stringify({
          escalationDecision: "no_escalation",
          escalationDecisionRationale: "The submitted answer and extracted evidence support ownership review operation, so the finding should be reassessed instead of escalated into a risk.",
          findingReassessmentRecommended: true,
          recommendedExistingRiskKey: null,
          recommendedExistingRiskTitle: null,
          recommendedExistingRiskReason: null,
          riskTitle: null,
          riskStatement: null,
          category: null,
          source: null,
          suggestedLikelihood: null,
          suggestedImpact: null,
          suggestedInherentRisk: null,
          inherentScore: null,
          residualScore: null,
          confidence: 0.82,
          suggestedTreatment: null,
          suggestedMitigation: null,
          suggestedEvidenceRequired: [],
          potentialRelatedRisks: [],
          frameworkImpact: [
            {
              frameworkKey: "SOC2",
              requirementRefs: ["SOC2:CC6.1"],
              impact: "Evidence supports the mapped control requirement for this reviewed item."
            }
          ],
          evidenceAnalysis: [
            {
              fileName: "asset-management-evidence.txt",
              relevance: "high",
              documentPurpose: "Asset ownership and lifecycle review evidence.",
              summary: "The file shows all sampled assets had accountable owners and completed lifecycle review.",
              keyFacts: [
                "All sampled assets had accountable owners.",
                "Lifecycle review was completed for the sample."
              ],
              controlCoverage: [
                "Supports asset ownership review.",
                "Supports lifecycle review operation."
              ],
              notableExcerpts: ["All sampled assets had owner confirmation and lifecycle review."],
              supports: ["EV-ASSET-MANAGEMENT-ASSET-INVENTORY-EXPORT"],
              gaps: [],
              riskSignals: [],
              limitations: [],
              reviewerConclusion: "The finding should be reassessed because evidence supports the answer."
            }
          ],
          aiRationale: "No identifiable deficiency or exposure is supported by the supplied context.",
          sourcesUsed: ["Question", "Answer", "Finding", "Evidence #1", "SOC2:CC6.1"]
        })
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    )) as typeof fetch;

    const service = new RiskAiAssistantService(
      mockEvidenceService(evidenceId, "Asset inventory evidence shows all sampled assets had owner confirmation and lifecycle review."),
      mockRiskWorkflowService({ tenantId, findingId, itemId }),
      mockAssessmentService({ tenantId, assessmentId, itemId, evidenceId, questionVersionId }),
      mockQuestionRepositoryService(questionVersionId)
    );

    const recommendation = await service.recommend({ tenantId, findingId, assessmentId });

    expect(recommendation.escalationDecision).toBe("no_escalation");
    expect(recommendation.findingReassessmentRecommended).toBe(true);
    expect(recommendation.riskTitle).toBeNull();
    expect(recommendation.inherentScore).toBeNull();
    expect(recommendation.aiRationale).toContain("No identifiable deficiency");
  });

  it("estimates a reviewable residual score when OpenAI omits it for a new risk proposal", async () => {
    applyTestEnv();
    const tenantId = randomUUID();
    const assessmentId = randomUUID();
    const itemId = randomUUID();
    const findingId = randomUUID();
    const evidenceId = randomUUID();
    const questionVersionId = randomUUID();

    globalThis.fetch = (async () => new Response(
      JSON.stringify({
        output_text: JSON.stringify({
          escalationDecision: "create_new_risk",
          escalationDecisionRationale: "The finding shows no formal secure coding standard and no submitted evidence.",
          findingReassessmentRecommended: false,
          recommendedExistingRiskKey: null,
          recommendedExistingRiskTitle: null,
          recommendedExistingRiskReason: null,
          riskTitle: "Lack of Formal Secure Coding Standard",
          riskStatement: "Missing secure coding standards may lead to inconsistent application security practices.",
          category: "application_security",
          source: `Finding ${findingId}`,
          suggestedLikelihood: "likely",
          suggestedImpact: "high",
          suggestedInherentRisk: "high",
          inherentScore: 80,
          residualScore: null,
          confidence: 0.81,
          suggestedTreatment: "mitigate",
          suggestedMitigation: "Approve a secure coding standard and require SDLC security checks.",
          suggestedEvidenceRequired: ["Secure coding standard", "SAST results"],
          potentialRelatedRisks: [],
          frameworkImpact: [],
          evidenceAnalysis: [
            {
              fileName: "asset-management-evidence.txt",
              relevance: "low",
              documentPurpose: "Unrelated asset management evidence.",
              summary: "The file does not provide secure coding standard evidence.",
              keyFacts: ["No secure coding standard content is present."],
              controlCoverage: [],
              notableExcerpts: ["Asset inventory evidence includes one missing owner confirmation."],
              supports: [],
              gaps: ["Formal secure coding standard was not provided."],
              riskSignals: ["Control answer admits no approved standard."],
              limitations: ["Evidence is not from the application security domain."],
              reviewerConclusion: "A new risk proposal is appropriate for reviewer consideration."
            }
          ],
          aiRationale: "The answer and missing evidence support a real application security governance gap.",
          sourcesUsed: ["Question", "Answer", "Finding", "HARM-00001"]
        })
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    )) as typeof fetch;

    const service = new RiskAiAssistantService(
      mockEvidenceService(evidenceId),
      mockRiskWorkflowService({ tenantId, findingId, itemId }),
      mockAssessmentService({ tenantId, assessmentId, itemId, evidenceId, questionVersionId }),
      mockQuestionRepositoryService(questionVersionId)
    );

    const recommendation = await service.recommend({ tenantId, findingId, assessmentId });

    expect(recommendation.escalationDecision).toBe("create_new_risk");
    expect(recommendation.residualScore).toBe(48);
    expect(recommendation.riskScoringMethod).toContain("standard v1");
    expect(recommendation.categoryRationale).toContain("Asset Management");
    expect(recommendation.inherentScoreRationale).toContain("Inherent score 80");
    expect(recommendation.residualScoreRationale).toContain("Residual score 48");
  });

  it("does not allow a harmonized-control identifier to be treated as an existing enterprise risk", async () => {
    applyTestEnv();
    const tenantId = randomUUID();
    const assessmentId = randomUUID();
    const itemId = randomUUID();
    const findingId = randomUUID();
    const evidenceId = randomUUID();
    const questionVersionId = randomUUID();

    globalThis.fetch = (async () => new Response(
      JSON.stringify({
        output_text: JSON.stringify({
          escalationDecision: "link_existing_risk",
          escalationDecisionRationale: "The finding aligns to HARM-00002.",
          findingReassessmentRecommended: false,
          recommendedExistingRiskKey: "HARM-00002",
          recommendedExistingRiskTitle: "Asset Management",
          recommendedExistingRiskReason: "The finding maps to the asset management harmonized control.",
          riskTitle: null,
          riskStatement: null,
          category: null,
          source: null,
          suggestedLikelihood: "likely",
          suggestedImpact: "medium",
          suggestedInherentRisk: "medium",
          inherentScore: null,
          residualScore: null,
          confidence: 0.9,
          suggestedTreatment: "mitigate",
          suggestedMitigation: "Continue periodic asset inventory review.",
          suggestedEvidenceRequired: ["Updated asset inventory records"],
          potentialRelatedRisks: [],
          frameworkImpact: [],
          evidenceAnalysis: [
            {
              fileName: "asset-management-evidence.txt",
              relevance: "high",
              documentPurpose: "Asset management evidence.",
              summary: "The file supports asset management operation.",
              keyFacts: ["Owner review evidence is present."],
              controlCoverage: ["Supports HARM-00002 asset management."],
              notableExcerpts: ["All sampled assets had owner confirmation."],
              supports: ["EV-ASSET-MANAGEMENT-ASSET-INVENTORY-EXPORT"],
              gaps: [],
              riskSignals: [],
              limitations: [],
              reviewerConclusion: "No new enterprise risk is supported by this file."
            }
          ],
          aiRationale: "The control mapping is relevant, but no new exposure is identified.",
          sourcesUsed: ["Question", "Answer", "Finding", "Evidence #1", "HARM-00002"]
        })
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    )) as typeof fetch;

    const service = new RiskAiAssistantService(
      mockEvidenceService(evidenceId, "Asset inventory evidence shows all sampled assets had owner confirmation and lifecycle review."),
      mockRiskWorkflowService({ tenantId, findingId, itemId }),
      mockAssessmentService({ tenantId, assessmentId, itemId, evidenceId, questionVersionId }),
      mockQuestionRepositoryService(questionVersionId)
    );

    const recommendation = await service.recommend({ tenantId, findingId, assessmentId });

    expect(recommendation.escalationDecision).toBe("no_escalation");
    expect(recommendation.findingReassessmentRecommended).toBe(true);
    expect(recommendation.recommendedExistingRiskKey).toBeNull();
    expect(recommendation.escalationDecisionRationale).toContain("not an existing enterprise risk");
  });
});

function mockEvidenceService(
  evidenceId: string,
  text = "Asset inventory evidence includes one missing owner confirmation."
): EvidenceAssuranceService {
  return {
    downloadEvidenceObject: async () => ({
      evidence: {
        id: evidenceId,
        fileName: "asset-management-evidence.txt",
        state: "committed",
        sha256: "a".repeat(64),
        scopeTags: ["soc2", "asset-management", "harm-00002"]
      },
      version: {
        id: randomUUID(),
        evidenceId,
        mimeType: "text/plain",
        sha256: "a".repeat(64)
      },
      bytes: Buffer.from(text)
    })
  } as unknown as EvidenceAssuranceService;
}

function mockRiskWorkflowService(input: {
  tenantId: string;
  findingId: string;
  itemId: string;
}): RiskWorkflowService {
  return {
    getFinding: async () => ({
      id: input.findingId,
      tenantId: input.tenantId,
      assessmentItemId: input.itemId,
      testResultId: null,
      severity: "high",
      impact: "medium",
      likelihood: "likely",
      ownerId: randomUUID(),
      dueAt: new Date("2026-08-31T00:00:00.000Z"),
      description: "Asset ownership evidence is incomplete.",
      createdAt: new Date("2026-07-22T00:00:00.000Z"),
      version: 1,
      classification: "restricted",
      createdBy: randomUUID(),
      updatedBy: randomUUID(),
      updatedAt: new Date("2026-07-22T00:00:00.000Z")
    }),
    listRisks: async () => [
      {
        id: randomUUID(),
        tenantId: input.tenantId,
        version: 1,
        riskKey: "RISK-017",
        title: "Unmanaged Technology Assets",
        category: "technology",
        inherentScore: 80,
        residualScore: 50,
        ownerId: randomUUID(),
        status: "identified",
        classification: "confidential",
        createdBy: randomUUID(),
        createdAt: new Date(),
        updatedBy: randomUUID(),
        updatedAt: new Date()
      }
    ],
    listRiskLinks: async () => [],
    listRiskModels: async () => [
      {
        id: randomUUID(),
        tenantId: input.tenantId,
        version: 1,
        modelKey: "standard",
        modelVersion: "v1",
        scalesJson: { impact: ["low", "medium", "high", "critical"] },
        formula: "sum(impact,likelihood)",
        thresholds: { high: 70 },
        status: "active",
        classification: "confidential",
        createdBy: randomUUID(),
        createdAt: new Date(),
        updatedBy: randomUUID(),
        updatedAt: new Date()
      }
    ],
    listRemediationTasks: async () => [],
    getRiskAcceptanceForTask: async () => {
      throw new Error("No acceptance.");
    }
  } as unknown as RiskWorkflowService;
}

function mockAssessmentService(input: {
  tenantId: string;
  assessmentId: string;
  itemId: string;
  evidenceId: string;
  questionVersionId: string;
}): AssessmentService {
  return {
    get: async () => ({
      id: input.assessmentId,
      tenantId: input.tenantId,
      scopeName: "FY26 Asset Management Review",
      status: "approved",
      controlSnapshotVersion: "SOC2:v1:legacy:C-11:HARM-00002:1",
      createdBy: randomUUID(),
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      periodStart: new Date("2026-01-01T00:00:00.000Z"),
      periodEnd: new Date("2026-12-31T00:00:00.000Z"),
      version: 1,
      classification: "confidential",
      updatedBy: randomUUID(),
      updatedAt: new Date("2026-07-22T00:00:00.000Z"),
      items: [
        {
          id: input.itemId,
          controlRef: {
            frameworkKey: "SOC2",
            frameworkVersion: "v1",
            mappingVersion: "legacy",
            controlId: "C-11",
            harmonizedControlId: "HARM-00002",
            questionVersion: "1",
            questionVersionId: input.questionVersionId
          },
          status: "approved",
          ownerId: randomUUID(),
          answerText: "We maintain a central asset inventory and review ownership quarterly.",
          evidenceIds: [input.evidenceId],
          applicability: {
            applicable: true,
            rationale: "Asset management applies.",
            approvedBy: randomUUID(),
            approvedAt: new Date("2026-07-10T00:00:00.000Z")
          }
        }
      ]
    }),
    getReviewHistory: async () => [
      {
        id: randomUUID(),
        assessmentItemId: input.itemId,
        answerRevisionId: randomUUID(),
        reviewerId: randomUUID(),
        decision: "approved",
        rationale: "Finding remains open for ownership exceptions.",
        decidedAt: new Date("2026-07-22T00:00:00.000Z")
      }
    ]
  } as unknown as AssessmentService;
}

function mockQuestionRepositoryService(questionVersionId: string): QuestionRepositoryService {
  return {
    listAssessmentQuestionOptions: async () => [
      {
        frameworkId: randomUUID(),
        frameworkVersionId: randomUUID(),
        frameworkKey: "SOC2",
        frameworkName: "SOC 2",
        frameworkVersion: "v1",
        frameworkKeys: ["SOC2", "ISO_27001"],
        sourcePackageId: randomUUID(),
        controlId: "C-11",
        controlTitle: "Definitions - Key Defined Terms",
        harmonizedControlId: "HARM-00002",
        harmonizedControlName: "Asset Management",
        mappingVersion: "legacy",
        questionVersionId,
        questionSetId: randomUUID(),
        questionSetKey: "asset-management",
        questionVersion: 1,
        questionText: "Describe your asset inventory and ownership review process.",
        responseType: "text",
        evidenceExpectationIds: ["EV-ASSET-MANAGEMENT-ASSET-INVENTORY-EXPORT"],
        citations: [{ sourceId: "SOC2:CC6.1", sourceType: "framework_requirement" }],
        confidence: 0.9,
        sourceType: "curated",
        sourceAiQuestionVersionId: null,
        generationRunId: null,
        promptVersionId: null,
        modelDeploymentId: null,
        retrievalIndexId: null,
        status: "approved",
        approvedBy: randomUUID(),
        approvedAt: new Date("2026-07-01T00:00:00.000Z"),
        classification: "confidential",
        createdBy: randomUUID(),
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
        updatedBy: randomUUID(),
        updatedAt: new Date("2026-07-01T00:00:00.000Z"),
        previousVersionCount: 0,
        isCurrentVersion: true
      }
    ]
  } as unknown as QuestionRepositoryService;
}

function applyTestEnv() {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "test-anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "test-service";
  process.env.SUPABASE_DB_URL = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@example.invalid:5432/postgres";
  process.env.OPENAI_API_KEY = "test-openai-key";
  process.env.OPENAI_MODEL = "gpt-4.1-mini";
}

function restoreEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
