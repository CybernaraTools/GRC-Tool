import { z } from "zod";

// Structured, citation-tagged, claim-typed narrative output. Mirrors the
// platform's existing convention (risk-workflow's
// ProviderRecommendationSchema / ProviderRiskRecommendationSchema): a Zod
// schema server-side, matched by an equivalent JSON-Schema passed to the
// model via OpenAI's `text.format.type:"json_schema", strict:true`. Free-form
// prose is never accepted — every section is an array of individually
// checkable statements.

export const NARRATIVE_SECTION_KEYS = [
  "executiveSummary",
  "overallAssessmentAnalysis",
  "frameworkComplianceNarrative",
  "controlObservations",
  "evidenceAnalysis",
  "materialFindings",
  "riskAnalysis",
  "remediationAnalysis",
  "acceptedResidualRiskNarrative",
  "remainingGaps",
  "managementAttentionAreas",
  "auditorNotes",
  "limitations",
  "conclusion"
] as const;

export type NarrativeSectionKey = (typeof NARRATIVE_SECTION_KEYS)[number];

// Numeric claims must ride in explicit structured fields, never be parsed
// out of prose — this is what makes the validator's numeric cross-check
// (Rule #2 check 3) exact rather than a fragile regex match.
export const NumericClaimSchema = z.object({
  metric: z.enum(["framework_compliance_percentage", "finding_count", "risk_count", "control_count", "evidence_count"]),
  frameworkKey: z.string().nullable().optional(),
  statedValue: z.number()
});
export type NumericClaim = z.infer<typeof NumericClaimSchema>;

export const NarrativeStatementSchema = z.object({
  text: z.string().min(1),
  citations: z.array(z.string().min(1)),
  claimType: z.enum(["fact", "inference", "commentary"]),
  numericClaims: z.array(NumericClaimSchema).default([])
});
export type NarrativeStatement = z.infer<typeof NarrativeStatementSchema>;

export const NarrativeSectionSchema = z.array(NarrativeStatementSchema);

export const NarrativePayloadSchema = z.object({
  executiveSummary: NarrativeSectionSchema,
  overallAssessmentAnalysis: NarrativeSectionSchema,
  frameworkComplianceNarrative: NarrativeSectionSchema,
  controlObservations: NarrativeSectionSchema,
  evidenceAnalysis: NarrativeSectionSchema,
  materialFindings: NarrativeSectionSchema,
  riskAnalysis: NarrativeSectionSchema,
  remediationAnalysis: NarrativeSectionSchema,
  acceptedResidualRiskNarrative: NarrativeSectionSchema,
  remainingGaps: NarrativeSectionSchema,
  managementAttentionAreas: NarrativeSectionSchema,
  auditorNotes: NarrativeSectionSchema,
  limitations: NarrativeSectionSchema,
  conclusion: NarrativeSectionSchema
});
export type NarrativePayload = z.infer<typeof NarrativePayloadSchema>;

// A fact/inference statement with zero citations is a schema violation, not
// a stylistic issue (feature spec Rule #2 item 1) — Zod's object schema
// alone can't express "citations required unless claimType==='commentary'",
// so this second pass enforces it and returns the same shape errors would
// take from `.safeParse()`.
export function validateNarrativeSchema(payload: unknown):
  | { success: true; data: NarrativePayload }
  | { success: false; errors: string[] } {
  const parsed = NarrativePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) };
  }
  const errors: string[] = [];
  for (const [sectionKey, statements] of Object.entries(parsed.data)) {
    statements.forEach((statement, index) => {
      if (statement.claimType !== "commentary" && statement.citations.length === 0) {
        errors.push(`${sectionKey}[${index}]: '${statement.claimType}' statement requires at least one citation.`);
      }
    });
  }
  if (errors.length > 0) {
    return { success: false, errors };
  }
  return { success: true, data: parsed.data };
}

// Equivalent JSON-Schema for the OpenAI structured-output call
// (text.format.type:"json_schema", strict:true) — kept in sync with the Zod
// schema above by hand (same pattern the platform's existing
// recommendationResponseSchema()/riskProposalResponseSchema() already use).
export function narrativeJsonSchema(): Record<string, unknown> {
  const statementSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      text: { type: "string" },
      citations: { type: "array", items: { type: "string" } },
      claimType: { type: "string", enum: ["fact", "inference", "commentary"] },
      numericClaims: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            metric: {
              type: "string",
              enum: ["framework_compliance_percentage", "finding_count", "risk_count", "control_count", "evidence_count"]
            },
            // OpenAI strict structured-output mode requires every key in
            // `properties` to also appear in `required` — there is no true
            // "optional" property. frameworkKey is only meaningful for the
            // framework_compliance_percentage metric; for every other metric
            // the model must supply JSON null. (Discovered via a real
            // OpenAI call during live verification — mocked tests never
            // exercised OpenAI's actual strict-schema validation.)
            frameworkKey: { type: ["string", "null"] },
            statedValue: { type: "number" }
          },
          required: ["metric", "frameworkKey", "statedValue"]
        }
      }
    },
    required: ["text", "citations", "claimType", "numericClaims"]
  };
  const sectionSchema = { type: "array", items: statementSchema };

  return {
    type: "object",
    additionalProperties: false,
    properties: Object.fromEntries(NARRATIVE_SECTION_KEYS.map((key) => [key, sectionSchema])),
    required: [...NARRATIVE_SECTION_KEYS]
  };
}

export function emptyNarrativePayload(): NarrativePayload {
  const empty = {} as NarrativePayload;
  for (const key of NARRATIVE_SECTION_KEYS) {
    empty[key] = [];
  }
  return empty;
}
