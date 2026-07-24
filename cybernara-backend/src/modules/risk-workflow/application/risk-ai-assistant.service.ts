import { BadGatewayException, BadRequestException, Inject, Injectable } from "@nestjs/common";
import { PDFParse } from "pdf-parse";
import { z } from "zod";
import { readEnv } from "../../../config/env.js";
import { AssessmentService, QuestionRepositoryService, type AssessmentQuestionOption } from "../../assessment/public.js";
import { EvidenceAssuranceService } from "../../evidence-assurance/public.js";
import type { Finding, Risk, RiskModel, RiskTreatmentStrategy } from "../domain/risk.js";
import { RiskWorkflowService } from "./risk-workflow.service.js";

const impacts = ["low", "medium", "high", "critical"] as const;
const likelihoods = ["rare", "unlikely", "possible", "likely", "almost_certain"] as const;
const inherentRiskLevels = ["low", "medium", "high", "critical"] as const;
const treatments = ["accept", "mitigate", "transfer", "avoid"] as const;
const evidenceRelevanceLevels = ["not_relevant", "low", "medium", "high"] as const;
const escalationDecisions = ["create_new_risk", "link_existing_risk", "no_escalation"] as const;

export interface RiskAssistRequest {
  findingId: string;
  assessmentId: string;
}

export interface RiskAssistEvidenceFile {
  id: string;
  fileName: string;
  state: string;
  mimeType: string;
  sha256: string | null;
  scopeTags: string[];
  extractedText: string | null;
  extractionNote: string | null;
}

export interface RiskAssistEvidenceAnalysis {
  fileName: string;
  relevance: typeof evidenceRelevanceLevels[number];
  documentPurpose: string;
  summary: string;
  keyFacts: string[];
  controlCoverage: string[];
  notableExcerpts: string[];
  supports: string[];
  gaps: string[];
  riskSignals: string[];
  limitations: string[];
  reviewerConclusion: string;
}

export interface RiskAssistRelatedRisk {
  riskKey: string;
  title: string;
  reason: string;
}

export interface RiskAssistFrameworkImpact {
  frameworkKey: string;
  requirementRefs: string[];
  impact: string;
}

export interface RiskAssistRecommendation {
  escalationDecision: typeof escalationDecisions[number];
  escalationDecisionRationale: string;
  findingReassessmentRecommended: boolean;
  recommendedExistingRiskKey: string | null;
  recommendedExistingRiskTitle: string | null;
  recommendedExistingRiskReason: string | null;
  riskTitle: string | null;
  riskStatement: string | null;
  category: string | null;
  categoryRationale: string | null;
  source: string | null;
  suggestedLikelihood: typeof likelihoods[number] | null;
  suggestedImpact: typeof impacts[number] | null;
  suggestedInherentRisk: typeof inherentRiskLevels[number] | null;
  inherentScore: number | null;
  residualScore: number | null;
  riskScoringMethod: string | null;
  inherentScoreRationale: string | null;
  residualScoreRationale: string | null;
  confidence: number;
  suggestedTreatment: RiskTreatmentStrategy | null;
  treatmentRationale: string | null;
  suggestedMitigation: string | null;
  suggestedEvidenceRequired: string[];
  potentialRelatedRisks: RiskAssistRelatedRisk[];
  frameworkImpact: RiskAssistFrameworkImpact[];
  evidenceAnalysis: RiskAssistEvidenceAnalysis[];
  aiRationale: string;
  sourcesUsed: string[];
  model: string;
  generatedAt: string;
  evidenceFiles: RiskAssistEvidenceFile[];
  warnings: string[];
  contextSummary: {
    assessmentName: string;
    questionText: string | null;
    findingSeverity: Finding["severity"];
    findingImpact: Finding["impact"] | null;
    findingLikelihood: Finding["likelihood"] | null;
    harmonizedControlId: string | null;
    frameworks: string[];
    evidenceFileCount: number;
    relatedRiskCount: number;
  };
}

const ProviderRiskRecommendationSchema = z.object({
  escalationDecision: z.enum(escalationDecisions),
  escalationDecisionRationale: z.string().min(1),
  findingReassessmentRecommended: z.boolean(),
  recommendedExistingRiskKey: z.string().min(1).nullable(),
  recommendedExistingRiskTitle: z.string().min(1).nullable(),
  recommendedExistingRiskReason: z.string().min(1).nullable(),
  riskTitle: z.string().min(1).nullable(),
  riskStatement: z.string().min(1).nullable(),
  category: z.string().min(1).nullable(),
  categoryRationale: z.string().min(1).nullish().transform((value) => value ?? null),
  source: z.string().min(1).nullable(),
  suggestedLikelihood: z.enum(likelihoods).nullable(),
  suggestedImpact: z.enum(impacts).nullable(),
  suggestedInherentRisk: z.enum(inherentRiskLevels).nullable(),
  inherentScore: z.number().min(0).max(100).nullable(),
  residualScore: z.number().min(0).max(100).nullish().transform((value) => value ?? null),
  riskScoringMethod: z.string().min(1).nullish().transform((value) => value ?? null),
  inherentScoreRationale: z.string().min(1).nullish().transform((value) => value ?? null),
  residualScoreRationale: z.string().min(1).nullish().transform((value) => value ?? null),
  confidence: z.number().min(0).max(1),
  suggestedTreatment: z.enum(treatments).nullable(),
  treatmentRationale: z.string().min(1).nullish().transform((value) => value ?? null),
  suggestedMitigation: z.string().min(1).nullable(),
  suggestedEvidenceRequired: z.array(z.string().min(1)).max(12),
  potentialRelatedRisks: z.array(z.object({
    riskKey: z.string().min(1),
    title: z.string().min(1),
    reason: z.string().min(1)
  })).max(10),
  frameworkImpact: z.array(z.object({
    frameworkKey: z.string().min(1),
    requirementRefs: z.array(z.string().min(1)).max(20),
    impact: z.string().min(1)
  })).max(20),
  evidenceAnalysis: z.array(z.object({
    fileName: z.string().min(1),
    relevance: z.enum(evidenceRelevanceLevels),
    documentPurpose: z.string().min(1),
    summary: z.string().min(1),
    keyFacts: z.array(z.string().min(1)).max(12),
    controlCoverage: z.array(z.string().min(1)).max(12),
    notableExcerpts: z.array(z.string().min(1)).max(8),
    supports: z.array(z.string().min(1)).max(12),
    gaps: z.array(z.string().min(1)).max(12),
    riskSignals: z.array(z.string().min(1)).max(12),
    limitations: z.array(z.string().min(1)).max(12),
    reviewerConclusion: z.string().min(1)
  })).max(8),
  aiRationale: z.string().min(1),
  sourcesUsed: z.array(z.string().min(1)).max(40)
}).superRefine((value, context) => {
  if (value.escalationDecision === "create_new_risk") {
    for (const field of [
      "riskTitle",
      "riskStatement",
      "category",
      "source",
      "suggestedLikelihood",
      "suggestedImpact",
      "suggestedInherentRisk",
      "inherentScore",
      "suggestedTreatment",
      "suggestedMitigation"
    ] as const) {
      if (value[field] === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${field} is required when escalationDecision is create_new_risk.`
        });
      }
    }
  }

  if (value.escalationDecision === "link_existing_risk") {
    for (const field of ["recommendedExistingRiskKey", "recommendedExistingRiskTitle", "recommendedExistingRiskReason"] as const) {
      if (value[field] === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${field} is required when escalationDecision is link_existing_risk.`
        });
      }
    }
  }
});

type ProviderRiskRecommendation = Omit<
  RiskAssistRecommendation,
  "model" | "generatedAt" | "evidenceFiles" | "warnings" | "contextSummary"
>;

interface RiskAnalysisContextPackage {
  assessment: {
    id: string;
    name: string;
    status: string;
    periodStart: string;
    periodEnd: string;
    snapshotVersion: string;
  };
  assessmentItem: {
    id: string;
    status: string;
    answerText: string | null;
    evidenceObjectIds: string[];
  };
  question: {
    text: string | null;
    responseType: string | null;
    evidenceExpectationIds: string[];
    citations: Array<Record<string, unknown>>;
    confidence: number | null;
    sourceType: string | null;
  };
  finding: {
    id: string;
    description: string;
    severity: Finding["severity"];
    impact: Finding["impact"] | null;
    likelihood: Finding["likelihood"] | null;
    dueAt: string | null;
  };
  controls: {
    sourceControlId: string | null;
    sourceControlTitle: string | null;
    harmonizedControlId: string | null;
    harmonizedControlName: string | null;
    frameworkKeys: string[];
    frameworkRequirements: string[];
  };
  evidenceFiles: RiskAssistEvidenceFile[];
  reviewerDecisions: Array<Record<string, unknown>>;
  relatedRisks: Array<Pick<Risk, "riskKey" | "title" | "category" | "inherentScore" | "residualScore" | "status"> & { relationship?: string }>;
  existingCompensatingControls: string[];
  tenantRiskScoringMethodology: Array<Pick<RiskModel, "modelKey" | "modelVersion" | "formula" | "scalesJson" | "thresholds" | "status">>;
  riskCategories: string[];
  riskCategorySignals: {
    suggestedCategory: string;
    rationale: string;
  };
  riskAppetiteToleranceRules: Array<Record<string, unknown>>;
}

@Injectable()
export class RiskAiAssistantService {
  constructor(
    @Inject(EvidenceAssuranceService) private readonly evidenceService: EvidenceAssuranceService,
    @Inject(RiskWorkflowService) private readonly riskWorkflow: RiskWorkflowService,
    @Inject(AssessmentService) private readonly assessments: AssessmentService,
    @Inject(QuestionRepositoryService) private readonly questionRepository: QuestionRepositoryService
  ) {}

  async recommend(input: {
    tenantId: string;
    findingId: string;
    assessmentId: string;
  }): Promise<RiskAssistRecommendation> {
    const env = readEnv();
    const warnings: string[] = [];
    const context = await this.contextPackage(input.tenantId, input.findingId, input.assessmentId, warnings);
    const providerRecommendation = await this.requestRecommendation(env.OPENAI_MODEL, context);

    return {
      ...providerRecommendation,
      model: env.OPENAI_MODEL,
      generatedAt: new Date().toISOString(),
      evidenceFiles: context.evidenceFiles,
      warnings,
      contextSummary: {
        assessmentName: context.assessment.name,
        questionText: context.question.text,
        findingSeverity: context.finding.severity,
        findingImpact: context.finding.impact,
        findingLikelihood: context.finding.likelihood,
        harmonizedControlId: context.controls.harmonizedControlId,
        frameworks: context.controls.frameworkKeys,
        evidenceFileCount: context.evidenceFiles.length,
        relatedRiskCount: context.relatedRisks.length
      }
    };
  }

  private async contextPackage(
    tenantId: string,
    findingId: string,
    assessmentId: string,
    warnings: string[]
  ): Promise<RiskAnalysisContextPackage> {
    const finding = await this.riskWorkflow.getFinding(tenantId, findingId);
    if (!finding.assessmentItemId) {
      throw new BadRequestException("AI risk analysis requires a finding linked to an assessment item.");
    }

    const assessment = await this.assessments.get(tenantId, assessmentId);
    const item = assessment.items.find((candidate) => candidate.id === finding.assessmentItemId);
    if (!item) {
      throw new BadRequestException("The selected finding does not belong to the supplied assessment.");
    }

    const [questionOptions, reviewHistory, risks, riskModels, tasks] = await Promise.all([
      this.questionRepository.listAssessmentQuestionOptions(tenantId, { limit: 200, offset: 0 }).catch(() => []),
      this.assessments.getReviewHistory(tenantId, assessment.id, item.id).catch(() => []),
      this.riskWorkflow.listRisks(tenantId, { limit: 100, offset: 0 }).catch(() => []),
      this.riskWorkflow.listRiskModels(tenantId, { limit: 20, offset: 0 }).catch(() => []),
      this.riskWorkflow.listRemediationTasks({ tenantId, findingId: finding.id, pagination: { limit: 20, offset: 0 } }).catch(() => [])
    ]);

    const question = item.controlRef.questionVersionId
      ? questionOptions.find((option) => option.questionVersionId === item.controlRef.questionVersionId) ?? null
      : null;
    const relatedRisks = await this.relatedRisks(tenantId, risks, finding, question);
    const acceptances = await Promise.all(
      tasks.map((task) => this.riskWorkflow.getRiskAcceptanceForTask(tenantId, task.id).catch(() => null))
    );
    const evidenceFiles = await this.evidenceContext(tenantId, item.evidenceIds, warnings);
    const suggestedCategory = categoryFromText([
      question?.questionText ?? "",
      question?.responseType ?? "",
      question?.harmonizedControlName ?? "",
      question?.controlTitle ?? "",
      finding.description,
      item.answerText ?? "",
      frameworkKeys(question, item).join(" ")
    ].join(" "));

    return {
      assessment: {
        id: assessment.id,
        name: assessment.scopeName,
        status: assessment.status,
        periodStart: assessment.periodStart.toISOString(),
        periodEnd: assessment.periodEnd.toISOString(),
        snapshotVersion: assessment.controlSnapshotVersion
      },
      assessmentItem: {
        id: item.id,
        status: item.status,
        answerText: item.answerText ?? null,
        evidenceObjectIds: item.evidenceIds
      },
      question: {
        text: question?.questionText ?? null,
        responseType: question?.responseType ?? null,
        evidenceExpectationIds: question?.evidenceExpectationIds ?? [],
        citations: question?.citations ?? [],
        confidence: question?.confidence ?? null,
        sourceType: question?.sourceType ?? null
      },
      finding: {
        id: finding.id,
        description: finding.description,
        severity: finding.severity,
        impact: finding.impact ?? null,
        likelihood: finding.likelihood ?? null,
        dueAt: finding.dueAt?.toISOString() ?? null
      },
      controls: {
        sourceControlId: question?.controlId ?? item.controlRef.controlId ?? null,
        sourceControlTitle: question?.controlTitle ?? null,
        harmonizedControlId: question?.harmonizedControlId ?? item.controlRef.harmonizedControlId ?? null,
        harmonizedControlName: question?.harmonizedControlName ?? null,
        frameworkKeys: frameworkKeys(question, item),
        frameworkRequirements: frameworkRequirements(question)
      },
      evidenceFiles,
      reviewerDecisions: reviewHistory.map((decision) => ({
        decision: decision.decision,
        rationale: decision.rationale,
        reviewerId: decision.reviewerId,
        decidedAt: decision.decidedAt.toISOString()
      })),
      relatedRisks,
      existingCompensatingControls: acceptances
        .map((acceptance) => acceptance?.compensatingControls?.trim())
        .filter((value): value is string => Boolean(value)),
      tenantRiskScoringMethodology: riskModels.map((model) => ({
        modelKey: model.modelKey,
        modelVersion: model.modelVersion,
        formula: model.formula,
        scalesJson: model.scalesJson,
        thresholds: model.thresholds,
        status: model.status
      })),
      riskCategories: uniqueStrings([
        ...risks.map((risk) => risk.category),
        suggestedCategory
      ]),
      riskCategorySignals: {
        suggestedCategory,
        rationale: "Derived from the assessment question, harmonized control, source control, answer, finding text, and framework scope. Use this as a strong hint, but override it if the supplied evidence and finding clearly support a more specific category."
      },
      riskAppetiteToleranceRules: riskModels.map((model) => ({
        modelKey: model.modelKey,
        thresholds: model.thresholds
      }))
    };
  }

  private async relatedRisks(
    tenantId: string,
    risks: Risk[],
    finding: Finding,
    question: AssessmentQuestionOption | null
  ): Promise<RiskAnalysisContextPackage["relatedRisks"]> {
    const terms = normalizeSearchText([
      finding.description,
      question?.questionText ?? "",
      question?.harmonizedControlName ?? "",
      question?.controlTitle ?? ""
    ].join(" ")).split(" ").filter((term) => term.length > 4);
    const related: RiskAnalysisContextPackage["relatedRisks"] = [];
    for (const risk of risks) {
      const links = await this.riskWorkflow.listRiskLinks(tenantId, risk.id, { limit: 50, offset: 0 }).catch(() => []);
      const directLink = links.find((link) => link.targetType === "finding" && link.targetId === finding.id);
      const haystack = normalizeSearchText(`${risk.riskKey} ${risk.title} ${risk.category}`);
      if (directLink || terms.some((term) => haystack.includes(term))) {
        related.push({
          riskKey: risk.riskKey,
          title: risk.title,
          category: risk.category,
          inherentScore: risk.inherentScore,
          residualScore: risk.residualScore,
          status: risk.status,
          relationship: directLink?.relationship
        });
      }
    }
    return related.slice(0, 20);
  }

  private async evidenceContext(
    tenantId: string,
    evidenceObjectIds: string[],
    warnings: string[]
  ): Promise<RiskAssistEvidenceFile[]> {
    const files: RiskAssistEvidenceFile[] = [];
    for (const evidenceId of uniqueStrings(evidenceObjectIds).slice(0, 8)) {
      try {
        const { evidence, version, bytes } = await this.evidenceService.downloadEvidenceObject(tenantId, evidenceId);
        const extraction = await extractEvidenceText(bytes, version.mimeType, evidence.fileName);
        if (extraction.note) {
          warnings.push(`${evidence.fileName}: ${extraction.note}`);
        }
        files.push({
          id: evidence.id,
          fileName: evidence.fileName,
          state: evidence.state,
          mimeType: version.mimeType,
          sha256: evidence.sha256 ?? null,
          scopeTags: evidence.scopeTags,
          extractedText: extraction.text,
          extractionNote: extraction.note
        });
      } catch (error) {
        warnings.push(`Evidence ${evidenceId} could not be read: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return files;
  }

  private async requestRecommendation(
    model: string,
    context: RiskAnalysisContextPackage
  ): Promise<ProviderRiskRecommendation> {
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
              "You are a governed enterprise-risk analyst for a GRC platform.",
              "Use only the supplied Risk Analysis Context Package.",
              "First decide whether this finding should create a new risk, link to an existing risk, or not escalate.",
              "Return escalationDecision as exactly one of: create_new_risk, link_existing_risk, no_escalation.",
              "You are not forced to create a risk for every finding.",
              "Use create_new_risk only when the context shows an identifiable deficiency or exposure supported by the finding, answer, reviewer context, control requirements, and/or evidence analysis.",
              "A generic hypothetical statement such as inaccuracies could occur is not sufficient when the analyzed evidence supports the control and identifies no gaps.",
              "Use link_existing_risk when an existing enterprise risk substantially covers the same exposure; populate the recommended existing risk fields.",
              "Use no_escalation when evidence and reviewer context do not support a risk escalation.",
              "If the evidence materially contradicts the finding, use no_escalation and set findingReassessmentRecommended to true with a clear explanation.",
              "For no_escalation or link_existing_risk, risk proposal fields may be null unless they are needed for reviewer context.",
              "For create_new_risk, populate inherentScore and residualScore as 0-100 values; residualScore should reflect the expected score after the suggested treatment.",
              "Use riskCategorySignals.suggestedCategory as a strong category hint when it matches the control domain and finding.",
              "Explain why the category was selected in categoryRationale. Choose the most specific category supported by the control domain; use application_security for secure coding, SDLC, code review, SAST, DAST, dependency, CI/CD, or application-control findings. Use compliance only when no more specific operational or technology category fits.",
              "Explain the scoring method in riskScoringMethod, including what higher and lower values mean and any tenant risk model signals supplied in context.",
              "Explain the inherentScore in inherentScoreRationale as the pre-treatment risk from likelihood, impact, control gap, evidence, and framework context.",
              "Explain the residualScore in residualScoreRationale as the expected remaining risk after the proposed mitigation or compensating controls.",
              "Explain the treatment choice in treatmentRationale.",
              "Never automatically create, link, close, dismiss, or approve any finding or risk; only provide a recommendation for a human reviewer.",
              "Consider the assessment question, submitted answer, finding, evidence expectations, extracted evidence text, controls, framework citations, mappings, existing risks, compensating controls, and tenant risk model.",
              "Assess inherent risk before treatment and residual score after the suggested mitigation or compensating controls.",
              "If evidence supports the answer, do not overstate the risk; if evidence is missing or incomplete, name the exact missing artifacts.",
              "For each evidenceAnalysis entry, explain the document purpose, key facts found, control coverage, notable short excerpts or close paraphrases from extracted text, support, gaps, risk signals, limitations, and a reviewer-ready conclusion.",
              "If extractedText is unavailable for a file, state that explicitly and base the file analysis only on metadata; do not invent document content.",
              "Return only JSON matching the supplied schema."
            ].join(" ")
          },
          {
            role: "user",
            content: JSON.stringify({ riskAnalysisContextPackage: context })
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "cybernara_risk_proposal",
            schema: riskProposalResponseSchema(),
            strict: true
          }
        },
        temperature: 0.2,
        max_output_tokens: 6500
      })
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new BadGatewayException(`OpenAI risk analysis failed: ${openAiErrorMessage(body)}`);
    }

    const text = outputText(body);
    if (!text) {
      throw new BadGatewayException("OpenAI risk analysis returned no text output.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      const recovered = recoverJsonObject(text);
      if (!recovered) {
        throw new BadGatewayException("OpenAI risk analysis returned invalid JSON.");
      }
      parsed = recovered;
    }

    try {
      const parsedRecommendation: ProviderRiskRecommendation = ProviderRiskRecommendationSchema.parse(parsed);
      return normalizeRecommendationForContext(parsedRecommendation, context);
    } catch (error) {
      throw new BadGatewayException(
        `OpenAI risk analysis returned an invalid proposal: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

function normalizeRecommendationForContext(
  recommendation: ProviderRiskRecommendation,
  context: RiskAnalysisContextPackage
): ProviderRiskRecommendation {
  if (recommendation.escalationDecision !== "link_existing_risk") {
    return normalizeCreateRiskRecommendation(recommendation, context);
  }

  const recommendedKey = recommendation.recommendedExistingRiskKey;
  const existingRisk = recommendedKey
    ? context.relatedRisks.find((risk) => risk.riskKey.toLowerCase() === recommendedKey.toLowerCase())
    : null;

  const textToScan = [
    recommendation.escalationDecisionRationale,
    recommendation.recommendedExistingRiskReason ?? ""
  ].join(" ");
  const inherentMatch = textToScan.match(/inherent\s+(?:risk\s+)?(?:score\s+)?(?:of\s+)?(\d+)/i);
  const residualMatch = textToScan.match(/residual\s+(?:risk\s+)?(?:score\s+)?(?:of\s+)?(\d+)/i);

  const inherentScore = recommendation.inherentScore ?? existingRisk?.inherentScore ?? (inherentMatch ? parseInt(inherentMatch[1], 10) : 75);
  const residualScore = recommendation.residualScore ?? existingRisk?.residualScore ?? (residualMatch ? parseInt(residualMatch[1], 10) : 40);
  const category = recommendation.category ?? existingRisk?.category ?? context.riskCategorySignals.suggestedCategory;
  const suggestedTreatment = recommendation.suggestedTreatment ?? "mitigate";

  const updatedRecommendation: ProviderRiskRecommendation = {
    ...recommendation,
    recommendedExistingRiskKey: existingRisk?.riskKey ?? recommendedKey ?? "RISK-EXISTING",
    recommendedExistingRiskTitle: recommendation.recommendedExistingRiskTitle ?? existingRisk?.title ?? "Existing Risk",
    category,
    inherentScore,
    residualScore,
    suggestedTreatment,
    suggestedLikelihood: recommendation.suggestedLikelihood ?? "possible",
    suggestedImpact: recommendation.suggestedImpact ?? "high",
    suggestedInherentRisk: recommendation.suggestedInherentRisk ?? "high",
    riskScoringMethod: recommendation.riskScoringMethod ?? riskScoringMethodSummary(context),
    categoryRationale: recommendation.categoryRationale ?? `Categorized as ${category} based on linked risk domain and control context.`,
    inherentScoreRationale: recommendation.inherentScoreRationale ?? `Inherent score of ${inherentScore} reflects pre-mitigation exposure level for this risk.`,
    residualScoreRationale: recommendation.residualScoreRationale ?? `Residual score of ${residualScore} reflects expected risk post-mitigation.`,
    treatmentRationale: recommendation.treatmentRationale ?? `Suggested treatment strategy is ${suggestedTreatment}.`
  };

  return updatedRecommendation;
}

function normalizeCreateRiskRecommendation(
  recommendation: ProviderRiskRecommendation,
  context: RiskAnalysisContextPackage
): ProviderRiskRecommendation {
  if (recommendation.escalationDecision !== "create_new_risk") {
    return recommendation;
  }
  const residualScore = recommendation.residualScore ?? estimatedResidualScore(
    recommendation.inherentScore,
    recommendation.suggestedTreatment
  );
  return {
    ...recommendation,
    residualScore,
    riskScoringMethod: recommendation.riskScoringMethod ?? riskScoringMethodSummary(context),
    categoryRationale: recommendation.categoryRationale ?? categoryRationale(recommendation, context),
    inherentScoreRationale: recommendation.inherentScoreRationale ?? inherentScoreRationale(recommendation, context),
    residualScoreRationale: recommendation.residualScoreRationale ?? residualScoreRationale({
      ...recommendation,
      residualScore
    }, context),
    treatmentRationale: recommendation.treatmentRationale ?? treatmentRationale(recommendation)
  };
}

function estimatedResidualScore(
  inherentScore: number | null,
  treatment: RiskTreatmentStrategy | null
): number {
  const baseline = inherentScore ?? 75;
  const multiplier = treatment === "avoid"
    ? 0.25
    : treatment === "transfer"
      ? 0.5
      : treatment === "accept"
        ? 1
        : 0.6;
  return Math.max(0, Math.min(100, Math.round(baseline * multiplier)));
}

function riskScoringMethodSummary(context: RiskAnalysisContextPackage): string {
  const model = context.tenantRiskScoringMethodology[0];
  if (!model) {
    return "The risk register uses a 0-100 scoring scale where higher values mean greater exposure: 0-24 low, 25-49 moderate, 50-79 high, and 80-100 critical unless a tenant-specific model overrides those bands. Inherent score represents untreated risk; residual score represents expected remaining risk after treatment.";
  }
  return `The tenant risk model ${model.modelKey} ${model.modelVersion} uses formula ${model.formula}. Scores are interpreted on a 0-100 scale where higher values mean greater exposure; thresholds are ${JSON.stringify(model.thresholds)}. Inherent score is the untreated exposure, while residual score is the expected exposure left after treatment or compensating controls.`;
}

function categoryRationale(
  recommendation: ProviderRiskRecommendation,
  context: RiskAnalysisContextPackage
): string {
  const control = context.controls.harmonizedControlName ?? context.controls.harmonizedControlId ?? "the selected control";
  return `Category ${recommendation.category ?? "unspecified"} was selected from the ${control} control domain, the finding description, answer, evidence context, and selected frameworks. The context category signal was ${context.riskCategorySignals.suggestedCategory}.`;
}

function inherentScoreRationale(
  recommendation: ProviderRiskRecommendation,
  context: RiskAnalysisContextPackage
): string {
  const score = recommendation.inherentScore;
  return `Inherent score ${score ?? "not scored"}${typeof score === "number" ? ` (${riskScoreBand(score)})` : ""} reflects pre-treatment exposure from likelihood ${recommendation.suggestedLikelihood ?? context.finding.likelihood ?? "not set"}, impact ${recommendation.suggestedImpact ?? context.finding.impact ?? "not set"}, the control gap, missing or weak evidence, and mapped framework obligations before remediation.`;
}

function residualScoreRationale(
  recommendation: ProviderRiskRecommendation,
  context: RiskAnalysisContextPackage
): string {
  const score = recommendation.residualScore;
  return `Residual score ${score ?? "not scored"}${typeof score === "number" ? ` (${riskScoreBand(score)})` : ""} estimates the risk remaining after ${recommendation.suggestedTreatment ?? "the proposed treatment"} and assumes the suggested mitigation is implemented, verified, and evidenced. It should remain lower than inherent risk only when the mitigation materially reduces the exposure for ${context.controls.harmonizedControlName ?? context.controls.harmonizedControlId ?? "the selected control"}.`;
}

function treatmentRationale(recommendation: ProviderRiskRecommendation): string {
  return `Treatment ${recommendation.suggestedTreatment ?? "not selected"} was recommended because the finding appears actionable and can be reduced through the proposed mitigation rather than only accepted, transferred, or avoided.`;
}

function riskScoreBand(score: number): string {
  if (score >= 80) return "critical exposure";
  if (score >= 50) return "high exposure";
  if (score >= 25) return "moderate exposure";
  return "low exposure";
}

function riskProposalResponseSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "escalationDecision",
      "escalationDecisionRationale",
      "findingReassessmentRecommended",
      "recommendedExistingRiskKey",
      "recommendedExistingRiskTitle",
      "recommendedExistingRiskReason",
      "riskTitle",
      "riskStatement",
      "category",
      "categoryRationale",
      "source",
      "suggestedLikelihood",
      "suggestedImpact",
      "suggestedInherentRisk",
      "inherentScore",
      "residualScore",
      "riskScoringMethod",
      "inherentScoreRationale",
      "residualScoreRationale",
      "confidence",
      "suggestedTreatment",
      "treatmentRationale",
      "suggestedMitigation",
      "suggestedEvidenceRequired",
      "potentialRelatedRisks",
      "frameworkImpact",
      "evidenceAnalysis",
      "aiRationale",
      "sourcesUsed"
    ],
    properties: {
      escalationDecision: { type: "string", enum: escalationDecisions },
      escalationDecisionRationale: { type: "string" },
      findingReassessmentRecommended: { type: "boolean" },
      recommendedExistingRiskKey: nullableStringSchema(),
      recommendedExistingRiskTitle: nullableStringSchema(),
      recommendedExistingRiskReason: nullableStringSchema(),
      riskTitle: nullableStringSchema(),
      riskStatement: nullableStringSchema(),
      category: nullableStringSchema(),
      categoryRationale: nullableStringSchema(),
      source: nullableStringSchema(),
      suggestedLikelihood: nullableEnumSchema(likelihoods),
      suggestedImpact: nullableEnumSchema(impacts),
      suggestedInherentRisk: nullableEnumSchema(inherentRiskLevels),
      inherentScore: nullableNumberSchema(),
      residualScore: nullableNumberSchema(),
      riskScoringMethod: nullableStringSchema(),
      inherentScoreRationale: nullableStringSchema(),
      residualScoreRationale: nullableStringSchema(),
      confidence: { type: "number", minimum: 0, maximum: 1 },
      suggestedTreatment: nullableEnumSchema(treatments),
      treatmentRationale: nullableStringSchema(),
      suggestedMitigation: nullableStringSchema(),
      suggestedEvidenceRequired: { type: "array", maxItems: 12, items: { type: "string" } },
      potentialRelatedRisks: {
        type: "array",
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["riskKey", "title", "reason"],
          properties: {
            riskKey: { type: "string" },
            title: { type: "string" },
            reason: { type: "string" }
          }
        }
      },
      frameworkImpact: {
        type: "array",
        maxItems: 20,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["frameworkKey", "requirementRefs", "impact"],
          properties: {
            frameworkKey: { type: "string" },
            requirementRefs: { type: "array", maxItems: 20, items: { type: "string" } },
            impact: { type: "string" }
          }
        }
      },
      evidenceAnalysis: {
        type: "array",
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "fileName",
            "relevance",
            "documentPurpose",
            "summary",
            "keyFacts",
            "controlCoverage",
            "notableExcerpts",
            "supports",
            "gaps",
            "riskSignals",
            "limitations",
            "reviewerConclusion"
          ],
          properties: {
            fileName: { type: "string" },
            relevance: { type: "string", enum: evidenceRelevanceLevels },
            documentPurpose: { type: "string" },
            summary: { type: "string" },
            keyFacts: { type: "array", maxItems: 12, items: { type: "string" } },
            controlCoverage: { type: "array", maxItems: 12, items: { type: "string" } },
            notableExcerpts: { type: "array", maxItems: 8, items: { type: "string" } },
            supports: { type: "array", maxItems: 12, items: { type: "string" } },
            gaps: { type: "array", maxItems: 12, items: { type: "string" } },
            riskSignals: { type: "array", maxItems: 12, items: { type: "string" } },
            limitations: { type: "array", maxItems: 12, items: { type: "string" } },
            reviewerConclusion: { type: "string" }
          }
        }
      },
      aiRationale: { type: "string" },
      sourcesUsed: { type: "array", maxItems: 40, items: { type: "string" } }
    }
  };
}

function nullableStringSchema(): Record<string, unknown> {
  return { anyOf: [{ type: "string" }, { type: "null" }] };
}

function nullableNumberSchema(): Record<string, unknown> {
  return { anyOf: [{ type: "number", minimum: 0, maximum: 100 }, { type: "null" }] };
}

function nullableEnumSchema(values: readonly string[]): Record<string, unknown> {
  return { anyOf: [{ type: "string", enum: values }, { type: "null" }] };
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
      return { text: parsedText, note: "PDF text was extracted for AI risk analysis." };
    }
    const text = extractPdfTextBestEffort(bytes);
    return text
      ? { text, note: "PDF text was extracted with fallback parsing for AI risk analysis." }
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

function frameworkKeys(question: AssessmentQuestionOption | null, item: { controlRef: { frameworkKey?: string } }): string[] {
  const fromQuestion = question?.frameworkKeys ?? [];
  const fromCitations = (question?.citations ?? [])
    .map((citation) => {
      const sourceId = typeof citation.sourceId === "string" ? citation.sourceId : "";
      return sourceId.includes(":") ? sourceId.split(":")[0] : "";
    })
    .filter(Boolean);
  return uniqueStrings([...fromQuestion, ...fromCitations, item.controlRef.frameworkKey ?? ""]);
}

function frameworkRequirements(question: AssessmentQuestionOption | null): string[] {
  return uniqueStrings(
    (question?.citations ?? [])
      .map((citation) => typeof citation.sourceId === "string" ? citation.sourceId : "")
      .filter((sourceId) => sourceId.includes(":"))
  );
}

function categoryFromText(value: string): string {
  const normalized = normalizeSearchText(value);
  if (/application|secure coding|coding|sdlc|software development|developer|code review|sast|dast|dependency|ci cd|cicd|pipeline|owasp/.test(normalized)) return "application_security";
  if (/vendor|third|supplier|processor/.test(normalized)) return "vendor";
  if (/privacy|data|retention|consent|personal/.test(normalized)) return "privacy";
  if (/continuity|resilience|incident|recovery/.test(normalized)) return "operational";
  if (/access|identity|asset|software|vulnerability|configuration/.test(normalized)) return "technology";
  return "compliance";
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

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}
