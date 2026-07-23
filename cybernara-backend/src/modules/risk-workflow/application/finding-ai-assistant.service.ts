import { BadGatewayException, Inject, Injectable } from "@nestjs/common";
import { PDFParse } from "pdf-parse";
import { z } from "zod";
import { readEnv } from "../../../config/env.js";
import { EvidenceAssuranceService } from "../../evidence-assurance/public.js";

const severities = ["low", "medium", "high", "critical"] as const;
const impacts = ["low", "medium", "high", "critical"] as const;
const likelihoods = ["rare", "unlikely", "possible", "likely", "almost_certain"] as const;
const evidenceCoverageLevels = ["none", "limited", "partial", "substantial", "complete"] as const;
const evidenceRelevanceLevels = ["not_relevant", "low", "medium", "high"] as const;
const findingDecisions = ["create_finding", "no_finding", "needs_manual_review"] as const;
const obligationStages = ["documented", "approved", "implemented", "operating", "effective"] as const;
const obligationStatuses = ["proven", "partially_proven", "not_proven", "contradicted", "not_applicable"] as const;
const evidenceTypes = ["policy_or_design", "implementation", "operating", "effectiveness", "sample_or_template"] as const;

export interface FindingAssistCitation {
  sourceId: string;
  sourceType?: string;
}

export interface FindingAssistContext {
  assessmentItemId: string;
  questionText: string;
  responseType?: string;
  answerText?: string;
  frameworkKeys: string[];
  harmonizedControlId?: string;
  harmonizedControlName?: string;
  sourceControlId?: string;
  sourceControlTitle?: string;
  evidenceExpectationIds: string[];
  citations: FindingAssistCitation[];
  evidenceObjectIds: string[];

  // DB-grounded remediation context
  findingId?: string;
  findingDescription?: string;
  severity?: string;
  likelihood?: string;
  impact?: string;
  riskId?: string;
  riskStatement?: string;
  riskCategory?: string;
  inherentRisk?: string;
  residualRisk?: string;
  selectedTreatment?: string;
  mitigationPlan?: string;
  remediationAnswer?: string;
  remediationTaskId?: string;
  remediationSubmittedAt?: string;
  dueDate?: string;
  evidencePeriodStart?: string;
  evidencePeriodEnd?: string;
  reviewHistory?: Array<{
    decision: string;
    rationale: string;
    reviewer?: string;
    reviewedAt?: string;
  }>;
}

export interface FindingAssistEvidenceFile {
  id: string;
  fileName: string;
  state: string;
  mimeType: string;
  sha256: string | null;
  scopeTags: string[];
  extractedText: string | null;
  extractionNote: string | null;

  // Authoritative DB relationships & temporal metadata
  linkedAssessmentItemId?: string | null;
  linkedFindingId?: string | null;
  linkedRiskId?: string | null;
  linkedRemediationTaskId?: string | null;
  linkedHarmonizedControlId?: string | null;
  linkedSourceControlId?: string | null;
  linkedFrameworkKeys?: string[] | null;
  uploadedAt?: string | null;
  createdAt?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  effectiveDate?: string | null;
  approvalDate?: string | null;
}

export interface FindingAssistMaterialObligation {
  obligation: string;
  stage: typeof obligationStages[number];
  status: typeof obligationStatuses[number];
  supportingEvidence: string[];
  missingProof: string;
}

export interface FindingAssistEvidenceAnalysis {
  fileName: string;
  relevance: typeof evidenceRelevanceLevels[number];
  evidenceType?: typeof evidenceTypes[number];
  proves?: string;
  contextMismatches?: string[];
  documentPurpose: string;
  summary: string;
  supports: string[];
  expectedEvidenceCovered: string[];
  keyObservations: string[];
  notableExcerpts: string[];
  contradictions: string[];
  limitations: string[];
  gaps: string[];
  reliabilityAssessment: string;
  recommendedFollowUp: string[];
}

export interface FindingAssistRecommendation {
  findingDecision: typeof findingDecisions[number];
  findingDecisionRationale: string;
  severity: typeof severities[number];
  impact: typeof impacts[number];
  likelihood: typeof likelihoods[number];
  executiveSummary: string;
  description: string;
  rationale: string;
  controlConclusion: string;
  evidenceCoverage: typeof evidenceCoverageLevels[number];
  evidenceCoverageRationale: string;
  evidenceSummary: string;
  materialObligations?: FindingAssistMaterialObligation[];
  evidenceContextMismatches?: string[];
  suggestedAdditionalEvidence?: string[];
  evidenceAnalyses: FindingAssistEvidenceAnalysis[];
  missingEvidence: string[];
  recommendedReviewerActions: string[];
  parameterScoringMethod: string;
  severityRationale: string;
  impactRationale: string;
  likelihoodRationale: string;
  confidence: number;
  confidenceRationale: string;
  model: string;
  generatedAt: string;
  evidenceFiles: FindingAssistEvidenceFile[];
  warnings: string[];
}

const ProviderRecommendationSchema = z.object({
  findingDecision: z.enum(findingDecisions),
  findingDecisionRationale: z.string().min(1),
  severity: z.enum(severities),
  impact: z.enum(impacts),
  likelihood: z.enum(likelihoods),
  executiveSummary: z.string().min(1),
  description: z.string().min(1),
  rationale: z.string().min(1),
  controlConclusion: z.string().min(1),
  evidenceCoverage: z.enum(evidenceCoverageLevels),
  evidenceCoverageRationale: z.string().min(1),
  evidenceSummary: z.string().min(1),
  materialObligations: z.array(z.object({
    obligation: z.string().min(1),
    stage: z.enum(obligationStages),
    status: z.enum(obligationStatuses),
    supportingEvidence: z.array(z.string()).max(12),
    missingProof: z.string()
  })).max(12).optional(),
  evidenceContextMismatches: z.array(z.string()).max(12).optional(),
  suggestedAdditionalEvidence: z.array(z.string()).max(12).optional(),
  evidenceAnalyses: z.array(z.object({
    fileName: z.string().min(1),
    relevance: z.enum(evidenceRelevanceLevels),
    evidenceType: z.enum(evidenceTypes).optional(),
    proves: z.string().optional(),
    contextMismatches: z.array(z.string()).max(12).optional(),
    documentPurpose: z.string().min(1),
    summary: z.string().min(1),
    supports: z.array(z.string().min(1)).max(12),
    expectedEvidenceCovered: z.array(z.string().min(1)).max(12),
    keyObservations: z.array(z.string().min(1)).max(12),
    notableExcerpts: z.array(z.string().min(1)).max(8),
    contradictions: z.array(z.string().min(1)).max(12),
    limitations: z.array(z.string().min(1)).max(12),
    gaps: z.array(z.string().min(1)).max(12),
    reliabilityAssessment: z.string().min(1),
    recommendedFollowUp: z.array(z.string().min(1)).max(12)
  })).max(8),
  missingEvidence: z.array(z.string().min(1)).max(12),
  recommendedReviewerActions: z.array(z.string().min(1)).max(12),
  parameterScoringMethod: z.string().min(1),
  severityRationale: z.string().min(1),
  impactRationale: z.string().min(1),
  likelihoodRationale: z.string().min(1),
  confidence: z.number().min(0).max(1),
  confidenceRationale: z.string().min(1)
});

@Injectable()
export class FindingAiAssistantService {
  constructor(@Inject(EvidenceAssuranceService) private readonly evidenceService: EvidenceAssuranceService) {}

  async recommend(input: {
    tenantId: string;
    context: FindingAssistContext;
  }): Promise<FindingAssistRecommendation> {
    const env = readEnv();
    const warnings: string[] = [];
    const evidenceFiles = await this.evidenceContext(input.tenantId, input.context.evidenceObjectIds, warnings);
    const providerRecommendation = await this.requestRecommendation(env.OPENAI_MODEL, {
      ...input.context,
      frameworkKeys: uniqueStrings(input.context.frameworkKeys),
      evidenceExpectationIds: uniqueStrings(input.context.evidenceExpectationIds),
      citations: uniqueCitations(input.context.citations),
      evidenceFiles
    });

    const sanitized = sanitizeRecommendation(providerRecommendation, input.context, evidenceFiles);

    return {
      ...sanitized,
      model: env.OPENAI_MODEL,
      generatedAt: new Date().toISOString(),
      evidenceFiles,
      warnings
    };
  }

  private async evidenceContext(
    tenantId: string,
    evidenceObjectIds: string[],
    warnings: string[]
  ): Promise<FindingAssistEvidenceFile[]> {
    const files: FindingAssistEvidenceFile[] = [];
    for (const evidenceId of uniqueStrings(evidenceObjectIds).slice(0, 8)) {
      try {
        const { evidence, version, bytes } = await this.evidenceService.downloadEvidenceObject(tenantId, evidenceId);
        const extraction = await extractEvidenceText(bytes, version.mimeType, evidence.fileName);
        if (extraction.note) {
          warnings.push(`${evidence.fileName}: ${extraction.note}`);
        }

        let links: Array<{ targetType: string; targetId: string }> = [];
        try {
          links = await this.evidenceService.listEvidenceLinks(tenantId, version.id, { limit: 100, offset: 0 });
        } catch {
          // If evidence links unavailable, remain unlinked (never guess from scopeTags)
        }

        const linkedAssessmentItem = links.find((l) => l.targetType === "assessment_item")?.targetId ?? null;
        const linkedRemediationTask = links.find((l) => l.targetType === "remediation_task")?.targetId ?? null;
        const linkedControl = links.find((l) => l.targetType === "control_instance")?.targetId ?? null;

        files.push({
          id: evidence.id,
          fileName: evidence.fileName,
          state: evidence.state,
          mimeType: version.mimeType,
          sha256: evidence.sha256 ?? null,
          scopeTags: evidence.scopeTags,
          extractedText: extraction.text,
          extractionNote: extraction.note,
          linkedAssessmentItemId: linkedAssessmentItem,
          linkedFindingId: null,
          linkedRiskId: null,
          linkedRemediationTaskId: linkedRemediationTask,
          linkedHarmonizedControlId: linkedControl,
          linkedSourceControlId: null,
          linkedFrameworkKeys: [],
          uploadedAt: version.observedAt ? new Date(version.observedAt).toISOString() : null,
          createdAt: evidence.createdAt ? new Date(evidence.createdAt).toISOString() : null,
          periodStart: evidence.periodStart ? new Date(evidence.periodStart).toISOString() : null,
          periodEnd: evidence.periodEnd ? new Date(evidence.periodEnd).toISOString() : null,
          effectiveDate: version.observedAt ? new Date(version.observedAt).toISOString() : null,
          approvalDate: null
        });
      } catch (error) {
        warnings.push(`Evidence ${evidenceId} could not be read: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return files;
  }

  private async requestRecommendation(
    model: string,
    context: FindingAssistContext & { evidenceFiles: FindingAssistEvidenceFile[] }
  ): Promise<Omit<FindingAssistRecommendation, "model" | "generatedAt" | "evidenceFiles" | "warnings">> {
    const env = readEnv();
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: [
              "You are an expert, highly rigorous GRC assessment reviewer assistant.",
              "Your review is STRICTLY ADVISORY. You do not approve, reject, or alter GRC records; all final decisions belong solely to the authorized human reviewer.",
              "Analyze the provided assessment item, question, original answer, finding description, risk statement, inherent/residual risk, mitigation plan, affected source control, harmonized control, framework mappings, expected evidence, updated remediation answer, newly submitted evidence files, evidence metadata, scope tags, and review history.",
              "CRITICAL RULE 1: NEVER RECOMMEND APPROVAL ('no_finding') SIMPLY BECAUSE A FILE WAS UPLOADED. Uploading a document proves only that a file exists, NOT that remediation obligations are met.",
              "CRITICAL RULE 2: BREAK REMEDIATION INTO MATERIAL OBLIGATIONS & STAGES OF CONTROL MATURITY. First break the finding and agreed mitigation plan into individual material obligations. For each obligation, evaluate its maturity stage: documented (written policy exists), approved (non-blank management approval, signatures, dates), implemented (configured in production), operating (actively performed in routine operations), or effective (achieves risk reduction without bypass). Never treat a document as formally approved merely because it contains an approval section or describes an approval process. Formal approval is PROVEN ONLY when submitted evidence contains actual approval evidence (completed approver identity, signature, timestamp, or workflow approval record). In a document with blank approval placeholders or template markers, formal approval is NOT PROVEN.",
              "CRITICAL RULE 3: DEEP CONTENT & ARTIFACT INSPECTION. Inspect actual extracted text of every file rather than relying on filenames. Detect blank approval fields, missing signatures/approvers, missing dates, draft status, placeholders, TODOs, sample documents, templates, testing-only statements, or other limitations. A document explicitly marked as a sample, template, or testing artifact MUST NOT be treated as real production evidence.",
              "CRITICAL RULE 4: CATEGORIZE EVIDENCE TYPES & PROOF. Classify each evidence file into one of: policy_or_design, implementation, operating, effectiveness, or sample_or_template. Explain clearly what each submitted file actually proves in 'proves'.",
              "CRITICAL RULE 5: EVIDENCE CONTEXT & METADATA VALIDATION (CONTEXT MISMATCHES). Compare file scope tags, period dates, control references, and metadata against the finding's framework, harmonized control (e.g. HARM-00001 vs HARM-00002), source control (e.g. ADMIN-PRIV-13 vs C-11), and tenant. If a file tagged for HARM-00002/Asset Management is uploaded for a finding on HARM-00001/Application Security, explicitly flag an EVIDENCE CONTEXT MISMATCH. Determine if it was incorrectly linked, contains stale metadata, or is irrelevant. Detect irrelevant, duplicate, contradictory, or stale evidence. NEVER increase confidence just because more files were uploaded.",
              "CRITICAL RULE 6: CENTRAL QUESTION & ADVISORY OUTCOME. Answer: 'Has the organization provided sufficient reliable evidence to demonstrate that every material part of the agreed remediation has actually been completed?' Return findingDecision as: no_finding (Approve Remediation), needs_manual_review (More Evidence Required), or create_finding (Reject Remediation). If EVEN ONE material obligation remains unproven (e.g. documentation exists but formal approval or training is missing), DO NOT recommend 'no_finding'. Recommend 'needs_manual_review' or 'create_finding' and specify the exact additional evidence required in 'suggestedAdditionalEvidence'.",
              "CRITICAL RULE 7: CONFIDENCE. Confidence measures confidence in YOUR RECOMMENDATION itself (independent of whether positive or negative). High confidence in 'More Evidence Required' (e.g. 0.96) is valid when obligations clearly remain unproven.",
              "CRITICAL RULE 8: DO NOT HALLUCINATE OR INFER SUPPORTING EVIDENCE FROM POLICY TEXT. You must NEVER claim that an evidence artifact exists unless that artifact was actually submitted as a file or its text content was extracted from submitted evidence. A policy document stating that 'code-review records, SAST scan results, and staff training logs must be maintained' proves only that the policy defines those requirements; it DOES NOT mean code-review records, SAST scans, or training logs were submitted. Under 'supportingEvidence', list ONLY real submitted file names that contain actual proof. If no separate operating evidence file was uploaded, state clearly that the standard defines the requirement but that actual operating evidence was not submitted. Never invent, infer, or hallucinate supporting evidence.",
              "CRITICAL RULE 9: CLEAN DEDUPLICATED REMAINING GAPS. Ensure 'missingEvidence' contains one clean, deduplicated list of material unresolved gaps. Do NOT repeat the same missing evidence items under different phrasings or obligation names.",
              "CRITICAL RULE 10: GROUND MATERIAL OBLIGATIONS IN AGREED MITIGATION PLAN & LABEL EXTERNAL REQUIREMENTS. Material remediation obligations MUST primarily originate from the actual Finding, Risk Statement, and agreed Mitigation Plan. For a mitigation plan like 'Develop and approve a formal secure coding standard and provide training to relevant staff', the core obligations are: (1) Develop and document Secure Coding Standard, (2) Formally approve Secure Coding Standard, and (3) Train relevant personnel on Secure Coding Standard. If additional operational evidence or periodic review is required by the mapped control/framework, identify it separately and explicitly label it with 'Additional control requirement — [Framework/Control ID]' rather than treating it as part of the original agreed mitigation plan.",
              "Return only JSON matching the supplied schema."
            ].join(" ")
          },
          {
            role: "user",
            content: JSON.stringify({
              assessmentItem: {
                assessmentItemId: context.assessmentItemId,
                questionText: context.questionText,
                responseType: context.responseType ?? null,
                originalAnswer: context.answerText ?? null,
                frameworkKeys: context.frameworkKeys,
                harmonizedControlId: context.harmonizedControlId ?? null,
                harmonizedControlName: context.harmonizedControlName ?? null,
                sourceControlId: context.sourceControlId ?? null,
                sourceControlTitle: context.sourceControlTitle ?? null,
                evidenceExpectationIds: context.evidenceExpectationIds,
                citations: context.citations
              },
              finding: {
                findingId: context.findingId ?? null,
                findingDescription: context.findingDescription ?? null,
                severity: context.severity ?? null,
                likelihood: context.likelihood ?? null,
                impact: context.impact ?? null
              },
              risk: {
                riskId: context.riskId ?? null,
                riskStatement: context.riskStatement ?? null,
                riskCategory: context.riskCategory ?? null,
                inherentRisk: context.inherentRisk ?? null,
                residualRisk: context.residualRisk ?? null,
                treatment: context.selectedTreatment ?? null,
                mitigationPlan: context.mitigationPlan ?? null
              },
              remediation: {
                remediationTaskId: context.remediationTaskId ?? null,
                remediationAnswer: context.remediationAnswer ?? context.answerText ?? null,
                remediationSubmittedAt: context.remediationSubmittedAt ?? null,
                evidencePeriodStart: context.evidencePeriodStart ?? null,
                evidencePeriodEnd: context.evidencePeriodEnd ?? null
              },
              reviewHistory: (context.reviewHistory ?? []).map((rev) => ({
                decision: rev.decision,
                rationale: rev.rationale,
                reviewedAt: rev.reviewedAt ?? null
              })),
              evidenceFiles: context.evidenceFiles.map((file) => ({
                evidenceObjectId: file.id,
                fileName: file.fileName,
                state: file.state,
                mimeType: file.mimeType,
                sha256: file.sha256,
                extractedText: file.extractedText,
                extractionNote: file.extractionNote,
                uploadedAt: file.uploadedAt ?? null,
                createdAt: file.createdAt ?? null,
                periodStart: file.periodStart ?? null,
                periodEnd: file.periodEnd ?? null,
                effectiveDate: file.effectiveDate ?? null,
                approvalDate: file.approvalDate ?? null,
                authoritativeRelationships: {
                  linkedHarmonizedControlId: file.linkedHarmonizedControlId ?? null,
                  linkedSourceControlId: file.linkedSourceControlId ?? null,
                  linkedFrameworkKeys: file.linkedFrameworkKeys ?? [],
                  linkedAssessmentItemId: file.linkedAssessmentItemId ?? null,
                  linkedFindingId: file.linkedFindingId ?? null,
                  linkedRiskId: file.linkedRiskId ?? null,
                  linkedRemediationTaskId: file.linkedRemediationTaskId ?? null
                }
              }))
            })
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "cybernara_finding_recommendation",
            schema: recommendationResponseSchema(),
            strict: true
          }
        },
        temperature: 0.2,
        max_output_tokens: 5600
      })
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new BadGatewayException(`OpenAI finding assistance failed: ${openAiErrorMessage(body)}`);
    }

    const text = outputText(body);
    if (!text) {
      throw new BadGatewayException("OpenAI finding assistance returned no text output.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      const recovered = recoverJsonObject(text);
      if (!recovered) {
        throw new BadGatewayException("OpenAI finding assistance returned invalid JSON.");
      }
      parsed = recovered;
    }

    try {
      return ProviderRecommendationSchema.parse(parsed);
    } catch (error) {
      throw new BadGatewayException(
        `OpenAI finding assistance returned an invalid recommendation: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

function recommendationResponseSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "findingDecision",
      "findingDecisionRationale",
      "severity",
      "impact",
      "likelihood",
      "executiveSummary",
      "description",
      "rationale",
      "controlConclusion",
      "evidenceCoverage",
      "evidenceCoverageRationale",
      "evidenceSummary",
      "materialObligations",
      "evidenceContextMismatches",
      "suggestedAdditionalEvidence",
      "evidenceAnalyses",
      "missingEvidence",
      "recommendedReviewerActions",
      "parameterScoringMethod",
      "severityRationale",
      "impactRationale",
      "likelihoodRationale",
      "confidence",
      "confidenceRationale"
    ],
    properties: {
      findingDecision: { type: "string", enum: findingDecisions },
      findingDecisionRationale: { type: "string" },
      severity: { type: "string", enum: severities },
      impact: { type: "string", enum: impacts },
      likelihood: { type: "string", enum: likelihoods },
      executiveSummary: { type: "string" },
      description: { type: "string" },
      rationale: { type: "string" },
      controlConclusion: { type: "string" },
      evidenceCoverage: { type: "string", enum: evidenceCoverageLevels },
      evidenceCoverageRationale: { type: "string" },
      evidenceSummary: { type: "string" },
      materialObligations: {
        type: "array",
        maxItems: 12,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["obligation", "stage", "status", "supportingEvidence", "missingProof"],
          properties: {
            obligation: { type: "string" },
            stage: { type: "string", enum: obligationStages },
            status: { type: "string", enum: obligationStatuses },
            supportingEvidence: { type: "array", maxItems: 12, items: { type: "string" } },
            missingProof: { type: "string" }
          }
        }
      },
      evidenceContextMismatches: {
        type: "array",
        maxItems: 12,
        items: { type: "string" }
      },
      suggestedAdditionalEvidence: {
        type: "array",
        maxItems: 12,
        items: { type: "string" }
      },
      evidenceAnalyses: {
        type: "array",
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "fileName",
            "relevance",
            "evidenceType",
            "proves",
            "contextMismatches",
            "documentPurpose",
            "summary",
            "supports",
            "expectedEvidenceCovered",
            "keyObservations",
            "notableExcerpts",
            "contradictions",
            "limitations",
            "gaps",
            "reliabilityAssessment",
            "recommendedFollowUp"
          ],
          properties: {
            fileName: { type: "string" },
            relevance: { type: "string", enum: evidenceRelevanceLevels },
            evidenceType: { type: "string", enum: evidenceTypes },
            proves: { type: "string" },
            contextMismatches: { type: "array", maxItems: 12, items: { type: "string" } },
            documentPurpose: { type: "string" },
            summary: { type: "string" },
            supports: {
              type: "array",
              maxItems: 12,
              items: { type: "string" }
            },
            expectedEvidenceCovered: {
              type: "array",
              maxItems: 12,
              items: { type: "string" }
            },
            keyObservations: {
              type: "array",
              maxItems: 12,
              items: { type: "string" }
            },
            notableExcerpts: {
              type: "array",
              maxItems: 8,
              items: { type: "string" }
            },
            contradictions: {
              type: "array",
              maxItems: 12,
              items: { type: "string" }
            },
            limitations: {
              type: "array",
              maxItems: 12,
              items: { type: "string" }
            },
            gaps: {
              type: "array",
              maxItems: 12,
              items: { type: "string" }
            },
            reliabilityAssessment: { type: "string" },
            recommendedFollowUp: {
              type: "array",
              maxItems: 12,
              items: { type: "string" }
            }
          }
        }
      },
      missingEvidence: {
        type: "array",
        maxItems: 12,
        items: { type: "string" }
      },
      recommendedReviewerActions: {
        type: "array",
        maxItems: 12,
        items: { type: "string" }
      },
      parameterScoringMethod: { type: "string" },
      severityRationale: { type: "string" },
      impactRationale: { type: "string" },
      likelihoodRationale: { type: "string" },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      confidenceRationale: { type: "string" }
    }
  };
}

async function extractEvidenceText(
  bytes: Buffer,
  mimeType: string,
  fileName: string
): Promise<{ text: string | null; note: string | null }> {
  const normalizedMime = mimeType.toLowerCase();
  if (
    normalizedMime.startsWith("text/") ||
    normalizedMime.includes("json") ||
    normalizedMime.includes("csv") ||
    fileName.match(/\.(txt|md|csv|json|log)$/i)
  ) {
    return { text: normalizeText(bytes.toString("utf8")), note: null };
  }
  if (normalizedMime === "application/pdf" || fileName.match(/\.pdf$/i)) {
    const parsedText = await extractPdfText(bytes);
    if (parsedText) {
      return { text: parsedText, note: "PDF text was extracted for AI review." };
    }
    const text = extractPdfTextBestEffort(bytes);
    return text
      ? { text, note: "PDF text was extracted with fallback parsing for AI review." }
      : { text: null, note: "PDF text could not be extracted; the file may be scanned, encrypted, or image-only." };
  }
  return { text: null, note: `MIME type ${mimeType} is not text-extractable; only file metadata was available to AI.` };
}

async function extractPdfText(bytes: Buffer): Promise<string | null> {
  const parser = new PDFParse({ data: Uint8Array.from(bytes) });
  try {
    const result = await parser.getText({ first: 20, pageJoiner: "\n" });
    const normalized = normalizeText(result.text);
    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

function extractPdfTextBestEffort(bytes: Buffer): string | null {
  const raw = bytes.subarray(0, Math.min(bytes.length, 400_000)).toString("latin1");
  const matches = raw.matchAll(/\(((?:\\.|[^\\()]){3,})\)\s*Tj/g);
  const chunks: string[] = [];
  for (const match of matches) {
    const decoded = decodePdfLiteral(match[1]).trim();
    if (decoded.length > 2) {
      chunks.push(decoded);
    }
  }
  const joined = normalizeText(chunks.join(" "));
  return joined.length > 0 ? joined : null;
}

function decodePdfLiteral(value: string): string {
  let result = "";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char !== "\\") {
      result += char;
      continue;
    }
    const next = value[index + 1];
    index += 1;
    if (next === "n") result += "\n";
    else if (next === "r") result += "\r";
    else if (next === "t") result += "\t";
    else if (next === "b" || next === "f") result += " ";
    else result += next ?? "";
  }
  return result;
}

function normalizeText(text: string): string {
  return text
    .replace(/[^\u0020-\u007e]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12_000);
}

function outputText(body: unknown): string | null {
  const record = asRecord(body);
  if (typeof record.output_text === "string") {
    return record.output_text;
  }
  if (!Array.isArray(record.output)) {
    return null;
  }
  for (const outputItem of record.output) {
    const content = asRecord(outputItem).content;
    if (!Array.isArray(content)) continue;
    for (const contentItem of content) {
      const contentRecord = asRecord(contentItem);
      if (contentRecord.type === "output_text" && typeof contentRecord.text === "string") {
        return contentRecord.text;
      }
    }
  }
  return null;
}

function openAiErrorMessage(body: unknown): string {
  const error = asRecord(asRecord(body).error);
  return typeof error.message === "string" ? error.message : "unexpected provider error";
}

function recoverJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) {
      return null;
    }
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function uniqueCitations(citations: FindingAssistCitation[]): FindingAssistCitation[] {
  const byKey = new Map<string, FindingAssistCitation>();
  for (const citation of citations) {
    const sourceId = citation.sourceId.trim();
    if (!sourceId) {
      continue;
    }
    byKey.set(`${citation.sourceType ?? "unknown"}:${sourceId}`, {
      sourceId,
      sourceType: citation.sourceType?.trim() || undefined
    });
  }
  return [...byKey.values()];
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}export function sanitizeRecommendation(
  providerRec: Omit<FindingAssistRecommendation, "model" | "generatedAt" | "evidenceFiles" | "warnings">,
  context: FindingAssistContext,
  evidenceFiles: FindingAssistEvidenceFile[]
): Omit<FindingAssistRecommendation, "model" | "generatedAt" | "evidenceFiles" | "warnings"> {
  const rec = { ...providerRec };
  const validFileNames = new Set(evidenceFiles.map((f) => f.fileName.toLowerCase()));

  // 1. Clean hallucinated supporting evidence & enforce Formal Approval / Training proof rules
  if (rec.materialObligations) {
    rec.materialObligations = rec.materialObligations.map((ob) => {
      const obNameLower = ob.obligation.toLowerCase();
      const isApprovalObligation = obNameLower.includes("approval") || obNameLower.includes("approve");
      const isTrainingObligation = obNameLower.includes("train");

      let updatedStatus = ob.status;
      let updatedMissingProof = ob.missingProof;

      if (isApprovalObligation) {
        // Require actual extracted text approval evidence (not placeholders or template markers)
        const extractedTextHasApproval = evidenceFiles.some((f) => {
          const text = (f.extractedText ?? "").toLowerCase();
          return (
            text.includes("approved by") &&
            !text.includes("[name]") &&
            !text.includes("___") &&
            !text.includes("placeholder") &&
            !text.includes("template")
          );
        });

        if (!extractedTextHasApproval) {
          updatedStatus = "not_proven";
          updatedMissingProof = "actual organizational approval evidence is missing.";
        }
      } else if (isTrainingObligation) {
        const extractedTextHasTraining = evidenceFiles.some((f) => {
          const text = (f.extractedText ?? "").toLowerCase();
          return text.includes("training completion") || text.includes("lms log") || text.includes("attendance record");
        });
        if (!extractedTextHasTraining) {
          updatedStatus = "not_proven";
          updatedMissingProof = "training completion/attendance/LMS evidence is missing.";
        }
      }

      if (updatedStatus === "proven") {
        // Rule 2: Proven obligations MUST NOT retain missingProof describing proof required by other obligations
        updatedMissingProof = "";
      }

      const cleanedSupporting = ob.supportingEvidence.filter((fileRef) => {
        const lowerRef = fileRef.toLowerCase();
        return (
          validFileNames.has(lowerRef) ||
          Array.from(validFileNames).some((fn) => lowerRef.includes(fn) || fn.includes(lowerRef))
        );
      });

      return {
        ...ob,
        status: updatedStatus,
        missingProof: updatedMissingProof,
        supportingEvidence: cleanedSupporting
      };
    });
  }

  // 2. Category Context Mismatch Validation (Authoritative DB relationships ONLY; NO scopeTag guessing or hardcoded fallbacks)
  const contextMismatches: string[] = [];
  const targetHarm = (context.harmonizedControlId ?? "").trim();
  const targetHarmName = (context.harmonizedControlName ?? "").trim();
  const targetSource = (context.sourceControlId ?? "").trim();

  for (const file of evidenceFiles) {
    // Authoritative DB relationships ONLY (no scopeTag guessing)
    const fileHarm = file.linkedHarmonizedControlId ? file.linkedHarmonizedControlId.trim().toUpperCase() : null;
    const fileSource = file.linkedSourceControlId ? file.linkedSourceControlId.trim() : null;

    const harmConflict = Boolean(fileHarm && targetHarm && fileHarm !== targetHarm.toUpperCase());
    const sourceConflict = Boolean(fileSource && targetSource && fileSource.toLowerCase() !== targetSource.toLowerCase());

    if (harmConflict || sourceConflict) {
      const harmDisplay = fileHarm ?? (targetHarm || "Unknown");
      const domainDisplay = targetHarmName || "Context unavailable";
      const sourceDisplay = fileSource ?? (targetSource || "Unknown");

      const targetHarmDisp = targetHarm || "Unknown";
      const targetDomainDisp = targetHarmName || "Context unavailable";
      const targetSourceDisp = targetSource || "Unknown";

      const warningText = `Evidence Context Warning: ${file.fileName} is linked to ${harmDisplay} / ${domainDisplay} / ${sourceDisplay} while the current remediation concerns ${targetHarmDisp} / ${targetDomainDisp} / ${targetSourceDisp}.`;
      if (!contextMismatches.some((msg) => msg.includes(file.fileName))) {
        contextMismatches.push(warningText);
      }
    }
  }

  for (const extra of rec.evidenceContextMismatches ?? []) {
    if (!contextMismatches.some((m) => m.toLowerCase().includes(extra.toLowerCase()))) {
      contextMismatches.push(extra);
    }
  }
  rec.evidenceContextMismatches = contextMismatches;

  // 3. Temporal Validation against remediation timeline
  if (context.remediationSubmittedAt || context.evidencePeriodStart) {
    const submissionTime = Date.parse(context.remediationSubmittedAt ?? context.evidencePeriodStart ?? "");
    if (!isNaN(submissionTime)) {
      for (const file of evidenceFiles) {
        if (file.extractionNote && file.extractionNote.includes("outdated")) {
          contextMismatches.push(`Temporal Evidence Warning: ${file.fileName} precedes active remediation period. Recency verification required.`);
        }
      }
    }
  }

  // 4. Complete Deterministic Recommendation Gate (LLM decision is advisory ONLY)
  const contradictedObligations = (rec.materialObligations ?? []).filter(
    (ob) => ob.status === "contradicted"
  );
  const unprovenObligations = (rec.materialObligations ?? []).filter(
    (ob) => ob.status === "not_proven" || ob.status === "partially_proven"
  );
  const hasMaterialContextMismatch = (rec.evidenceContextMismatches ?? []).length > 0;

  if (contradictedObligations.length > 0 || (providerRec.findingDecision === "create_finding" && (!rec.materialObligations || rec.materialObligations.length === 0))) {
    // Gate 1: Contradicted obligation or explicit provider reject when no obligations are provided
    rec.findingDecision = "create_finding";
    if (contradictedObligations.length > 0) {
      rec.findingDecisionRationale = `Remediation rejected because ${contradictedObligations.length} material obligation(s) are contradicted by evidence.`;
      rec.executiveSummary = `Remediation submission rejected. Evidence contradicts material obligations: ${contradictedObligations.map((o) => o.obligation).join(", ")}.`;
    }
    rec.evidenceCoverage = "limited";
  } else if (unprovenObligations.length > 0 || hasMaterialContextMismatch) {
    // Gate 2: Unproven/partially_proven obligations or Context Mismatch -> More Evidence Required (needs_manual_review)
    rec.findingDecision = "needs_manual_review";
    const reasons: string[] = [];
    if (unprovenObligations.length > 0) {
      reasons.push(`${unprovenObligations.length} material obligation(s) remain unproven`);
    }
    if (hasMaterialContextMismatch) {
      reasons.push("evidence context / metadata mismatch detected");
    }
    rec.findingDecisionRationale = `More evidence required because ${reasons.join(" and ")}.`;
    rec.executiveSummary = `Remediation in progress. More evidence required: ${reasons.join(", ")}.`;
    rec.controlConclusion = "Control partially documented/implemented; additional evidence required.";
    if (rec.evidenceCoverage === "complete") {
      rec.evidenceCoverage = "partial";
    }
  } else {
    // Gate 3: All required obligations proven & no mismatch -> Eligible for Approval (no_finding)
    rec.findingDecision = "no_finding";
    rec.findingDecisionRationale = "Sufficient reliable evidence provided for all material remediation obligations.";
    rec.executiveSummary = "Remediation verified. All material obligations are supported by submitted evidence.";
    
    const hasOperatingEvidence = evidenceFiles.some((f) => {
      const text = (f.extractedText ?? "").toLowerCase();
      return (
        text.includes("audit log") ||
        text.includes("monitoring export") ||
        text.includes("sast scan") ||
        text.includes("operating record") ||
        text.includes("production metric")
      );
    });

    if (hasOperatingEvidence) {
      rec.controlConclusion = "Control operating effectively.";
    } else {
      rec.controlConclusion = "Agreed remediation obligations completed; routine operating evidence was not part of the agreed scope.";
    }
    rec.evidenceCoverage = "complete";
  }

  // 5. Authoritative Remaining Gaps from Unresolved Obligations
  const allUnresolved = (rec.materialObligations ?? []).filter(
    (ob) => ob.status === "not_proven" || ob.status === "partially_proven" || ob.status === "contradicted"
  );

  if (allUnresolved.length > 0) {
    rec.missingEvidence = allUnresolved.map((ob) => {
      const missingPart = ob.missingProof ? ob.missingProof : `status: ${ob.status.replace("_", " ")}`;
      return `${ob.obligation} — ${missingPart}`;
    });
  } else {
    rec.missingEvidence = [];
  }

  // 6. Anti-Contradiction Text Sanitizer
  const sanitizeText = (text: string) => {
    return text
      .replace(/formal approval (?:is|has been) (?:proven|completed|verified|demonstrated)/gi, "formal approval is NOT proven (lacks actual organizational approval evidence)")
      .replace(/standard is (?:formally )?approved/gi, "standard is documented but lacks formal approval signatures/dates");
  };

  rec.findingDecisionRationale = sanitizeText(rec.findingDecisionRationale);
  rec.rationale = sanitizeText(rec.rationale);
  rec.executiveSummary = sanitizeText(rec.executiveSummary);
  rec.controlConclusion = sanitizeText(rec.controlConclusion);
  rec.evidenceSummary = sanitizeText(rec.evidenceSummary);

  return rec;
}

function deduplicateGaps(gaps: string[]): string[] {
  const result: string[] = [];
  for (const rawGap of gaps) {
    const trimmed = rawGap.trim();
    if (!trimmed || trimmed.toLowerCase().includes("no material missing evidence")) {
      continue;
    }
    const norm = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
    const isDup = result.some((existing) => {
      const existingNorm = existing.toLowerCase().replace(/[^a-z0-9]/g, "");
      return existingNorm === norm || existingNorm.includes(norm) || norm.includes(existingNorm);
    });
    if (!isDup) {
      result.push(trimmed);
    }
  }
  return result;
}
