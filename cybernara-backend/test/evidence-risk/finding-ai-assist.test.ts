import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import PDFDocument from "pdfkit";
import type { EvidenceAssuranceService } from "../../src/modules/evidence-assurance/public.js";
import { FindingAiAssistantService, sanitizeRecommendation } from "../../src/modules/risk-workflow/application/finding-ai-assistant.service.js";

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

describe("FindingAiAssistantService", () => {
  it("uses submitted evidence content and parses governed OpenAI finding recommendations", async () => {
    applyTestEnv();
    const evidenceId = randomUUID();
    const providerRequests: unknown[] = [];
    globalThis.fetch = (async (_url, init) => {
      providerRequests.push(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            findingDecision: "create_finding",
            findingDecisionRationale: "The answer claims quarterly review completion, but the submitted evidence names unresolved privileged-account approval exceptions.",
            severity: "high",
            impact: "high",
            likelihood: "likely",
            executiveSummary: "Privileged access review evidence has owner-approval exceptions requiring remediation.",
            description: "Access review evidence is incomplete because two privileged accounts have no dated owner approval.",
            rationale: "The question asks whether privileged access reviews are complete, but the evidence text shows missing owners.",
            controlConclusion: "The control is partially operating but exceptions remain open for privileged accounts.",
            evidenceCoverage: "partial",
            evidenceCoverageRationale: "The evidence proves that a review occurred, but it does not prove complete owner approval for all privileged accounts.",
            evidenceSummary: "One committed text evidence file was reviewed and it lists missing owner approvals.",
            evidenceAnalyses: [
              {
                fileName: "privileged-access-review.txt",
                relevance: "high",
                documentPurpose: "Privileged access review exception evidence.",
                summary: "The file directly addresses the privileged access review.",
                supports: ["EV-ACCESS-REVIEW"],
                expectedEvidenceCovered: ["EV-ACCESS-REVIEW"],
                keyObservations: ["svc-prod and db-admin lack dated owner approvals."],
                notableExcerpts: ["svc-prod and db-admin do not have dated owner approvals"],
                contradictions: ["The answer says reviews are complete, while evidence names unresolved exceptions."],
                limitations: ["The file does not include remediation closure evidence."],
                gaps: ["Dated owner approvals are missing."],
                reliabilityAssessment: "High reliability for exception identification because the evidence is committed text and directly names affected accounts.",
                recommendedFollowUp: ["Request completed owner approval records."]
              }
            ],
            missingEvidence: ["Dated approval for privileged accounts svc-prod and db-admin"],
            recommendedReviewerActions: ["Request updated owner approval evidence from the control owner."],
            parameterScoringMethod: "Severity, impact, and likelihood are based on residual control weakness after considering submitted evidence.",
            severityRationale: "High severity because privileged accounts are affected.",
            impactRationale: "High impact because unauthorized privileged access could affect critical systems.",
            likelihoodRationale: "Likely because the evidence names unresolved exceptions.",
            confidence: 0.86,
            confidenceRationale: "Confidence is high because the evidence is readable and directly contradicts the complete-review answer."
          })
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }) as typeof fetch;

    const service = new FindingAiAssistantService(mockEvidenceService(evidenceId));
    const recommendation = await service.recommend({
      tenantId: randomUUID(),
      context: {
        assessmentItemId: randomUUID(),
        questionText: "Are privileged access reviews completed and approved?",
        responseType: "boolean",
        answerText: "Yes, reviews are completed quarterly.",
        frameworkKeys: ["SOC2", "ISO_27001"],
        harmonizedControlId: "HARM-00002",
        harmonizedControlName: "Asset Management",
        sourceControlId: "CC6.1",
        sourceControlTitle: "Logical access controls",
        evidenceExpectationIds: ["EV-ACCESS-REVIEW"],
        citations: [{ sourceId: "SOC2:CC6.1", sourceType: "framework_requirement" }],
        evidenceObjectIds: [evidenceId]
      }
    });

    expect(recommendation.severity).toBe("high");
    expect(recommendation.findingDecision).toBe("create_finding");
    expect(recommendation.findingDecisionRationale).toContain("unresolved");
    expect(recommendation.impact).toBe("high");
    expect(recommendation.likelihood).toBe("likely");
    expect(recommendation.evidenceCoverageRationale).toContain("review occurred");
    expect(recommendation.evidenceAnalyses[0].documentPurpose).toContain("Privileged access");
    expect(recommendation.evidenceAnalyses[0].notableExcerpts[0]).toContain("svc-prod");
    expect(recommendation.parameterScoringMethod).toContain("residual");
    expect(recommendation.confidenceRationale).toContain("readable");
    expect(recommendation.evidenceFiles[0].extractedText).toContain("svc-prod");
    expect(recommendation.model).toBe("gpt-4.1-mini");
    expect(providerRequests).toHaveLength(1);
    const request = providerRequests[0] as { input: Array<{ content: string }> };
    expect(request.input[0].content).toContain("Return findingDecision as:");
    expect(request.input[0].content).toContain("STRICTLY ADVISORY");
    expect(request.input[1].content).toContain("Privileged access review evidence");
    expect(request.input[1].content).toContain("SOC2:CC6.1");
  });

  it("extracts PDF evidence text before asking OpenAI for a finding recommendation", async () => {
    applyTestEnv();
    const evidenceId = randomUUID();
    const providerRequests: unknown[] = [];
    globalThis.fetch = (async (_url, init) => {
      providerRequests.push(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            findingDecision: "no_finding",
            findingDecisionRationale: "The answer and extracted PDF evidence substantially support the expected asset inventory evidence.",
            severity: "low",
            impact: "low",
            likelihood: "unlikely",
            executiveSummary: "The PDF evidence supports the asset management control response.",
            description: "The submitted asset inventory PDF supports the control response.",
            rationale: "The PDF contains asset inventory and owner review text relevant to the expected evidence.",
            controlConclusion: "The control appears to be operating with evidence for inventory and owner review.",
            evidenceCoverage: "substantial",
            evidenceCoverageRationale: "The PDF covers inventory, owner assignment, lifecycle state, and review dates, but the fixture does not prove every production artifact.",
            evidenceSummary: "One committed PDF evidence file was parsed and reviewed.",
            evidenceAnalyses: [
              {
                fileName: "asset-management-evidence.pdf",
                relevance: "high",
                documentPurpose: "Asset inventory and owner-review evidence.",
                summary: "The PDF describes asset inventory and owner review practices.",
                supports: ["EV-ASSET-MANAGEMENT-ASSET-INVENTORY-EXPORT"],
                expectedEvidenceCovered: ["EV-ASSET-MANAGEMENT-ASSET-INVENTORY-EXPORT"],
                keyObservations: ["The PDF includes owner assignments and lifecycle state."],
                notableExcerpts: ["Asset inventory export includes server inventory, owner assignments, lifecycle state"],
                contradictions: [],
                limitations: ["The test fixture does not include every production artifact."],
                gaps: [],
                reliabilityAssessment: "Readable PDF text supports the answer, though assessment-period completeness should still be confirmed.",
                recommendedFollowUp: ["Confirm the PDF covers the full assessment period."]
              }
            ],
            missingEvidence: [],
            recommendedReviewerActions: ["Confirm the PDF covers the full assessment period."],
            parameterScoringMethod: "The low parameters reflect substantial evidence coverage and no material contradiction.",
            severityRationale: "Low severity because the evidence generally supports the answer.",
            impactRationale: "Low impact because no material control gap is shown.",
            likelihoodRationale: "Unlikely because the provided evidence supports ongoing operation.",
            confidence: 0.9,
            confidenceRationale: "Confidence is high because PDF text extraction succeeded and aligns with the expected evidence."
          })
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }) as typeof fetch;

    const pdfBytes = await makePdf(
      "Asset inventory export includes server inventory, owner assignments, lifecycle state, and quarterly owner review dates."
    );
    const service = new FindingAiAssistantService(
      mockEvidenceServiceRecord({
        evidenceId,
        fileName: "asset-management-evidence.pdf",
        mimeType: "application/pdf",
        bytes: pdfBytes
      })
    );

    const recommendation = await service.recommend({
      tenantId: randomUUID(),
      context: {
        assessmentItemId: randomUUID(),
        questionText: "Describe the asset management lifecycle.",
        responseType: "text",
        answerText: "Assets are inventoried, assigned owners, reviewed, and retired through a managed lifecycle.",
        frameworkKeys: ["CCPA", "SOC2"],
        harmonizedControlId: "HARM-00002",
        harmonizedControlName: "Asset Management",
        sourceControlId: "C-11",
        sourceControlTitle: "Definitions - Key Defined Terms",
        evidenceExpectationIds: ["EV-ASSET-MANAGEMENT-ASSET-INVENTORY-EXPORT"],
        citations: [{ sourceId: "CCPA:C-11", sourceType: "framework_requirement" }],
        evidenceObjectIds: [evidenceId]
      }
    });

    expect(recommendation.evidenceFiles[0].fileName).toBe("asset-management-evidence.pdf");
    expect(recommendation.findingDecision).toBe("no_finding");
    expect(recommendation.evidenceAnalyses[0].reliabilityAssessment).toContain("Readable PDF");
    expect(recommendation.evidenceFiles[0].extractedText).toContain("Asset inventory export");
    expect(recommendation.evidenceFiles[0].extractionNote).toBe("PDF text was extracted for AI review.");
    expect(recommendation.evidenceFiles[0].extractedText).toContain("Asset inventory export");
    expect(recommendation.evidenceFiles[0].extractionNote).toBe("PDF text was extracted for AI review.");
    const request = providerRequests[0] as { input: Array<{ content: string }> };
    const userPayload = JSON.parse(request.input[1].content);
    expect(userPayload).toHaveProperty("assessmentItem");
    expect(userPayload).toHaveProperty("finding");
    expect(userPayload).toHaveProperty("risk");
    expect(userPayload).toHaveProperty("remediation");
    expect(userPayload).toHaveProperty("reviewHistory");
    expect(userPayload).toHaveProperty("evidenceFiles");
    expect(userPayload.assessmentItem.harmonizedControlId).toBe("HARM-00002");
  });

  describe("sanitizeRecommendation deterministic rules", () => {
    it("enforces independent category context warnings, clears proven obligation missingProof, and derives authoritative remaining gaps", () => {
      const sanitized = sanitizeRecommendation(
        {
          findingDecision: "no_finding",
          findingDecisionRationale: "The standard is documented and formal approval is proven.",
          severity: "low",
          impact: "low",
          likelihood: "rare",
          executiveSummary: "Remediation complete.",
          description: "All requirements met.",
          rationale: "All requirements met.",
          controlConclusion: "Control operating.",
          evidenceCoverage: "complete",
          evidenceCoverageRationale: "Sufficient evidence.",
          evidenceSummary: "One file submitted.",
          materialObligations: [
            {
              obligation: "Develop and document Secure Coding Standard",
              stage: "documented",
              status: "proven",
              supportingEvidence: ["secure_coding_standard_remediation_evidence.pdf"],
              missingProof: "approval signatures missing" // Leakage to be cleared by Rule 2
            },
            {
              obligation: "Formally approve Secure Coding Standard",
              stage: "approved",
              status: "not_proven",
              supportingEvidence: [],
              missingProof: "actual organizational approval evidence is missing."
            },
            {
              obligation: "Train relevant personnel on Secure Coding Standard",
              stage: "operating",
              status: "not_proven",
              supportingEvidence: [],
              missingProof: "training completion/attendance/LMS evidence is missing."
            }
          ],
          evidenceAnalyses: [],
          missingEvidence: ["Duplicate generic gap item 1", "Duplicate generic gap item 2"],
          recommendedReviewerActions: ["Request formal approval", "Request training logs"],
          parameterScoringMethod: "Standard scoring",
          severityRationale: "Low",
          impactRationale: "Low",
          likelihoodRationale: "Rare",
          confidence: 0.95,
          confidenceRationale: "High confidence"
        },
        {
          assessmentItemId: "item-123",
          questionText: "Does the organization maintain a secure coding standard?",
          frameworkKeys: ["ISO_27001", "HITRUST"],
          harmonizedControlId: "HARM-00001",
          harmonizedControlName: "Application Security",
          sourceControlId: "ADMIN-PRIV-13",
          evidenceExpectationIds: ["EV-01"],
          citations: [],
          evidenceObjectIds: ["obj-1"]
        },
        [
          {
            id: "obj-1",
            fileName: "secure_coding_standard_remediation_evidence.pdf",
            state: "committed",
            mimeType: "application/pdf",
            sha256: "b".repeat(64),
            scopeTags: ["HARM-00002", "Asset Management", "C-11"],
            linkedHarmonizedControlId: "HARM-00002",
            linkedSourceControlId: "C-11",
            extractedText: "Secure Coding Standard Draft",
            extractionNote: null
          }
        ]
      );

      // Rule 1: Independent Category Context Mismatch Warning
      expect(sanitized.evidenceContextMismatches).toHaveLength(1);
      expect(sanitized.evidenceContextMismatches![0]).toContain(
        "Evidence Context Warning: secure_coding_standard_remediation_evidence.pdf is linked to HARM-00002"
      );

      // Rule 2: Proven obligation missingProof cleared
      expect(sanitized.materialObligations![0].missingProof).toBe("");
      expect(sanitized.materialObligations![1].missingProof).toContain("actual organizational approval evidence is missing");

      // Rule 3: Authoritative Remaining Gaps derived strictly from unresolved material obligations
      expect(sanitized.missingEvidence).toEqual([
        "Formally approve Secure Coding Standard — actual organizational approval evidence is missing.",
        "Train relevant personnel on Secure Coding Standard — training completion/attendance/LMS evidence is missing."
      ]);

      // Overall recommendation downgraded from no_finding to needs_manual_review
      expect(sanitized.findingDecision).toBe("needs_manual_review");
      expect(sanitized.evidenceCoverage).toBe("partial");
    });

    it("forces create_finding (Reject Remediation) when any material obligation is contradicted", () => {
      const sanitized = sanitizeRecommendation(
        {
          findingDecision: "no_finding",
          findingDecisionRationale: "Remediation submitted.",
          severity: "high",
          impact: "high",
          likelihood: "possible",
          executiveSummary: "Summary",
          description: "Desc",
          rationale: "Rationale",
          controlConclusion: "Control failed",
          evidenceCoverage: "complete",
          evidenceCoverageRationale: "Coverage",
          evidenceSummary: "Evidence",
          materialObligations: [
            {
              obligation: "Implement Multi-Factor Authentication",
              stage: "operating",
              status: "contradicted",
              supportingEvidence: ["mfa_audit_log.txt"],
              missingProof: "Logs prove MFA is disabled for administrators."
            }
          ],
          missingEvidence: [],
          recommendedReviewerActions: ["Reject remediation"],
          parameterScoringMethod: "Standard",
          severityRationale: "High",
          impactRationale: "High",
          likelihoodRationale: "Possible",
          confidence: 0.98,
          confidenceRationale: "High"
        },
        {
          assessmentItemId: "item-456",
          questionText: "Is MFA enforced for all administrative access?",
          frameworkKeys: ["SOC2"],
          harmonizedControlId: "HARM-00003",
          harmonizedControlName: "Access Control",
          sourceControlId: "CC6.1",
          evidenceExpectationIds: [],
          citations: [],
          evidenceObjectIds: ["obj-2"]
        },
        [
          {
            id: "obj-2",
            fileName: "mfa_audit_log.txt",
            state: "committed",
            mimeType: "text/plain",
            sha256: "c".repeat(64),
            scopeTags: ["HARM-00003", "Access Control", "CC6.1"],
            extractedText: "Admin login without MFA recorded at 2026-07-22.",
            extractionNote: null
          }
        ]
      );

      expect(sanitized.findingDecision).toBe("create_finding");
      expect(sanitized.findingDecisionRationale).toContain("Remediation rejected because 1 material obligation(s) are contradicted by evidence.");
      expect(sanitized.evidenceCoverage).toBe("limited");
    });

    it("allows no_finding (Approve Remediation) when all material obligations are proven and no context mismatch exists", () => {
      const sanitized = sanitizeRecommendation(
        {
          findingDecision: "no_finding",
          findingDecisionRationale: "Remediation verified.",
          severity: "low",
          impact: "low",
          likelihood: "rare",
          executiveSummary: "All obligations met.",
          description: "Desc",
          rationale: "Rationale",
          controlConclusion: "Control operating",
          evidenceCoverage: "complete",
          evidenceCoverageRationale: "Coverage",
          evidenceSummary: "Evidence",
          materialObligations: [
            {
              obligation: "Develop and document Secure Coding Standard",
              stage: "documented",
              status: "proven",
              supportingEvidence: ["policy.pdf"],
              missingProof: ""
            },
            {
              obligation: "Formally approve Secure Coding Standard",
              stage: "approved",
              status: "proven",
              supportingEvidence: ["approval.pdf"],
              missingProof: ""
            }
          ],
          missingEvidence: [],
          recommendedReviewerActions: ["Approve remediation"],
          parameterScoringMethod: "Standard",
          severityRationale: "Low",
          impactRationale: "Low",
          likelihoodRationale: "Rare",
          confidence: 0.99,
          confidenceRationale: "High"
        },
        {
          assessmentItemId: "item-789",
          questionText: "Is secure coding policy documented and approved?",
          frameworkKeys: ["ISO_27001"],
          harmonizedControlId: "HARM-00001",
          harmonizedControlName: "Application Security",
          sourceControlId: "ADMIN-PRIV-13",
          evidenceExpectationIds: [],
          citations: [],
          evidenceObjectIds: ["obj-3", "obj-4"]
        },
        [
          {
            id: "obj-3",
            fileName: "policy.pdf",
            state: "committed",
            mimeType: "application/pdf",
            sha256: "d".repeat(64),
            scopeTags: ["HARM-00001", "Application Security", "ADMIN-PRIV-13"],
            extractedText: "Secure Coding Policy v1.0",
            extractionNote: null
          },
          {
            id: "obj-4",
            fileName: "approval.pdf",
            state: "committed",
            mimeType: "application/pdf",
            sha256: "e".repeat(64),
            scopeTags: ["HARM-00001", "Application Security", "ADMIN-PRIV-13"],
            extractedText: "Approved by CISO Jane Doe on 2026-07-20",
            extractionNote: null
          }
        ]
      );

      expect(sanitized.findingDecision).toBe("no_finding");
      expect(sanitized.findingDecisionRationale).toBe("Sufficient reliable evidence provided for all material remediation obligations.");
      expect(sanitized.missingEvidence).toHaveLength(0);
      expect(sanitized.evidenceCoverage).toBe("complete");
    });

    it("Case 2: Policy exists but approval fields are blank -> More Evidence Required", () => {
      const sanitized = sanitizeRecommendation(
        {
          findingDecision: "no_finding",
          findingDecisionRationale: "Policy document uploaded.",
          severity: "medium",
          impact: "medium",
          likelihood: "possible",
          executiveSummary: "Summary",
          description: "Desc",
          rationale: "Rationale",
          controlConclusion: "Control draft",
          evidenceCoverage: "complete",
          evidenceCoverageRationale: "Coverage",
          evidenceSummary: "Evidence",
          materialObligations: [
            {
              obligation: "Formally approve Secure Coding Standard",
              stage: "approved",
              status: "proven",
              supportingEvidence: ["policy_template.pdf"],
              missingProof: ""
            }
          ],
          missingEvidence: [],
          recommendedReviewerActions: ["Request formal approval signature"],
          parameterScoringMethod: "Standard",
          severityRationale: "Med",
          impactRationale: "Med",
          likelihoodRationale: "Possible",
          confidence: 0.9,
          confidenceRationale: "High"
        },
        {
          assessmentItemId: "item-c2",
          questionText: "Is secure coding policy approved?",
          frameworkKeys: ["ISO_27001"],
          harmonizedControlId: "HARM-00001",
          harmonizedControlName: "Application Security",
          sourceControlId: "ADMIN-PRIV-13",
          evidenceExpectationIds: [],
          citations: [],
          evidenceObjectIds: ["obj-c2"]
        },
        [
          {
            id: "obj-c2",
            fileName: "policy_template.pdf",
            state: "committed",
            mimeType: "application/pdf",
            sha256: "f".repeat(64),
            scopeTags: ["HARM-00001", "Application Security", "ADMIN-PRIV-13"],
            extractedText: "Approved By: [Name] Date: ___ Placeholder template for remediation testing.",
            extractionNote: null
          }
        ]
      );

      expect(sanitized.findingDecision).toBe("needs_manual_review");
      expect(sanitized.materialObligations![0].status).toBe("not_proven");
      expect(sanitized.materialObligations![0].missingProof).toContain("actual organizational approval evidence is missing");
    });

    it("Case 5 & Case 16: DB relationship metadata conflicts with scopeTags -> Authoritative DB relationship wins", () => {
      const sanitized = sanitizeRecommendation(
        {
          findingDecision: "no_finding",
          findingDecisionRationale: "Policy uploaded.",
          severity: "low",
          impact: "low",
          likelihood: "rare",
          executiveSummary: "Summary",
          description: "Desc",
          rationale: "Rationale",
          controlConclusion: "Control operating",
          evidenceCoverage: "complete",
          evidenceCoverageRationale: "Coverage",
          evidenceSummary: "Evidence",
          materialObligations: [
            {
              obligation: "Document Application Security Policy",
              stage: "documented",
              status: "proven",
              supportingEvidence: ["evidence_doc.pdf"],
              missingProof: ""
            }
          ],
          missingEvidence: [],
          recommendedReviewerActions: ["Review link"],
          parameterScoringMethod: "Standard",
          severityRationale: "Low",
          impactRationale: "Low",
          likelihoodRationale: "Rare",
          confidence: 0.95,
          confidenceRationale: "High"
        },
        {
          assessmentItemId: "item-c5",
          questionText: "Is AppSec policy maintained?",
          frameworkKeys: ["ISO_27001"],
          harmonizedControlId: "HARM-00001",
          harmonizedControlName: "Application Security",
          sourceControlId: "ADMIN-PRIV-13",
          evidenceExpectationIds: [],
          citations: [],
          evidenceObjectIds: ["obj-c5"]
        },
        [
          {
            id: "obj-c5",
            fileName: "evidence_doc.pdf",
            state: "committed",
            mimeType: "application/pdf",
            sha256: "1".repeat(64),
            scopeTags: ["HARM-00001", "Application Security", "ADMIN-PRIV-13"], // Scope tag misleadingly matches context
            linkedHarmonizedControlId: "HARM-00002", // Authoritative DB link points to Asset Management!
            linkedSourceControlId: "C-11",
            extractedText: "Asset Management Export",
            extractionNote: null
          }
        ]
      );

      expect(sanitized.findingDecision).toBe("needs_manual_review");
      expect(sanitized.evidenceContextMismatches).toHaveLength(1);
      expect(sanitized.evidenceContextMismatches![0]).toContain("Evidence Context Warning");
      expect(sanitized.evidenceContextMismatches![0]).toContain("HARM-00002");
    });

    it("Case 12: AI hallucinates a filename in supportingEvidence -> Sanitizer removes hallucinated filename", () => {
      const sanitized = sanitizeRecommendation(
        {
          findingDecision: "needs_manual_review",
          findingDecisionRationale: "Review required.",
          severity: "medium",
          impact: "medium",
          likelihood: "possible",
          executiveSummary: "Summary",
          description: "Desc",
          rationale: "Rationale",
          controlConclusion: "Control partial",
          evidenceCoverage: "partial",
          evidenceCoverageRationale: "Coverage",
          evidenceSummary: "Evidence",
          materialObligations: [
            {
              obligation: "Perform annual risk assessment",
              stage: "operating",
              status: "not_proven",
              supportingEvidence: ["real_doc.pdf", "hallucinated_sast_scan_2026.pdf"],
              missingProof: "Logs missing."
            }
          ],
          missingEvidence: [],
          recommendedReviewerActions: ["Request SAST scan"],
          parameterScoringMethod: "Standard",
          severityRationale: "Med",
          impactRationale: "Med",
          likelihoodRationale: "Possible",
          confidence: 0.9,
          confidenceRationale: "Med"
        },
        {
          assessmentItemId: "item-c12",
          questionText: "Is annual assessment performed?",
          frameworkKeys: ["SOC2"],
          harmonizedControlId: "HARM-00001",
          harmonizedControlName: "Application Security",
          sourceControlId: "ADMIN-PRIV-13",
          evidenceExpectationIds: [],
          citations: [],
          evidenceObjectIds: ["obj-c12"]
        },
        [
          {
            id: "obj-c12",
            fileName: "real_doc.pdf",
            state: "committed",
            mimeType: "application/pdf",
            sha256: "2".repeat(64),
            scopeTags: ["HARM-00001", "Application Security", "ADMIN-PRIV-13"],
            extractedText: "Real document content",
            extractionNote: null
          }
        ]
      );

      expect(sanitized.materialObligations![0].supportingEvidence).toEqual(["real_doc.pdf"]);
      expect(sanitized.materialObligations![0].supportingEvidence).not.toContain("hallucinated_sast_scan_2026.pdf");
    });

    it("Case 15: Missing harmonized/source control context -> Displays Unknown/Context unavailable without hardcoded fallbacks", () => {
      const sanitized = sanitizeRecommendation(
        {
          findingDecision: "no_finding",
          findingDecisionRationale: "Verified.",
          severity: "low",
          impact: "low",
          likelihood: "rare",
          executiveSummary: "Summary",
          description: "Desc",
          rationale: "Rationale",
          controlConclusion: "Control operating",
          evidenceCoverage: "complete",
          evidenceCoverageRationale: "Coverage",
          evidenceSummary: "Evidence",
          materialObligations: [
            {
              obligation: "Document security control",
              stage: "documented",
              status: "proven",
              supportingEvidence: ["doc.pdf"],
              missingProof: ""
            }
          ],
          missingEvidence: [],
          recommendedReviewerActions: ["Approve"],
          parameterScoringMethod: "Standard",
          severityRationale: "Low",
          impactRationale: "Low",
          likelihoodRationale: "Rare",
          confidence: 0.95,
          confidenceRationale: "High"
        },
        {
          assessmentItemId: "item-c15",
          questionText: "Is security control documented?",
          frameworkKeys: ["ISO_27001"],
          harmonizedControlId: undefined, // Missing context!
          harmonizedControlName: undefined,
          sourceControlId: undefined,
          evidenceExpectationIds: [],
          citations: [],
          evidenceObjectIds: ["obj-c15"]
        },
        [
          {
            id: "obj-c15",
            fileName: "doc.pdf",
            state: "committed",
            mimeType: "application/pdf",
            sha256: "3".repeat(64),
            scopeTags: ["ISO_27001"],
            extractedText: "Security control documentation",
            extractionNote: null
          }
        ]
      );

      // Verify no hardcoded fallbacks were manufactured
      expect(sanitized.evidenceContextMismatches).toHaveLength(0);
      expect(sanitized.findingDecisionRationale).not.toContain("ADMIN-PRIV-13");
      expect(sanitized.findingDecisionRationale).not.toContain("HARM-00001");
    });

    it("LLM returns create_finding but no deterministic contradiction exists -> do NOT automatically reject", () => {
      const sanitized = sanitizeRecommendation(
        {
          findingDecision: "create_finding", // LLM recommended reject
          findingDecisionRationale: "Needs check.",
          severity: "low",
          impact: "low",
          likelihood: "rare",
          executiveSummary: "Summary",
          description: "Desc",
          rationale: "Rationale",
          controlConclusion: "Control operating",
          evidenceCoverage: "complete",
          evidenceCoverageRationale: "Coverage",
          evidenceSummary: "Evidence",
          materialObligations: [
            {
              obligation: "Document Policy",
              stage: "documented",
              status: "proven", // All obligations proven! No contradiction!
              supportingEvidence: ["policy.pdf"],
              missingProof: ""
            }
          ],
          missingEvidence: [],
          recommendedReviewerActions: ["Approve"],
          parameterScoringMethod: "Standard",
          severityRationale: "Low",
          impactRationale: "Low",
          likelihoodRationale: "Rare",
          confidence: 0.95,
          confidenceRationale: "High"
        },
        {
          assessmentItemId: "item-c18",
          questionText: "Is policy documented?",
          frameworkKeys: ["SOC2"],
          harmonizedControlId: "HARM-00001",
          harmonizedControlName: "Application Security",
          sourceControlId: "ADMIN-PRIV-13",
          evidenceExpectationIds: [],
          citations: [],
          evidenceObjectIds: ["obj-c18"]
        },
        [
          {
            id: "obj-c18",
            fileName: "policy.pdf",
            state: "committed",
            mimeType: "application/pdf",
            sha256: "4".repeat(64),
            scopeTags: [],
            extractedText: "Policy documentation",
            extractionNote: null
          }
        ]
      );

      // Verify LLM's raw create_finding was NOT allowed to force rejection without an actual contradiction!
      expect(sanitized.findingDecision).toBe("no_finding");
      expect(sanitized.findingDecisionRationale).toBe("Sufficient reliable evidence provided for all material remediation obligations.");
    });
  });
});

function mockEvidenceService(evidenceId: string): EvidenceAssuranceService {
  return mockEvidenceServiceRecord({
    evidenceId,
    fileName: "privileged-access-review.txt",
    mimeType: "text/plain",
    bytes: Buffer.from("Privileged access review evidence: svc-prod and db-admin do not have dated owner approvals.")
  });
}

function mockEvidenceServiceRecord(input: {
  evidenceId: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}): EvidenceAssuranceService {
  return {
    downloadEvidenceObject: async () => ({
      evidence: {
        id: input.evidenceId,
        fileName: input.fileName,
        state: "committed",
        sha256: "a".repeat(64),
        scopeTags: ["soc2", "access", "harm-00002"]
      },
      version: {
        id: randomUUID(),
        evidenceId: input.evidenceId,
        mimeType: input.mimeType,
        sha256: "a".repeat(64)
      },
      bytes: input.bytes
    })
  } as unknown as EvidenceAssuranceService;
}

async function makePdf(text: string): Promise<Buffer> {
  const pdf = new PDFDocument({ margin: 36 });
  const chunks: Buffer[] = [];
  pdf.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const done = new Promise<void>((resolve, reject) => {
    pdf.on("end", resolve);
    pdf.on("error", reject);
  });
  pdf.fontSize(12).text(text);
  pdf.end();
  await done;
  return Buffer.concat(chunks);
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
