import { BadGatewayException, Injectable } from "@nestjs/common";
import { readEnv } from "../../../config/env.js";
import type { CitationManifest } from "../domain/citation-manifest.js";
import { citationManifestToPromptList } from "../domain/citation-manifest.js";
import type { ComplianceEngineResult } from "../domain/compliance-engine.js";
import { narrativeJsonSchema } from "../domain/narrative-schema.js";
import type { ClosureSnapshotPayload } from "../../closure-snapshot/public.js";

// Governed AI narrative synthesis, following this platform's existing
// structured-output convention (risk-workflow's finding/risk AI-assist
// services): direct call to OpenAI's Responses API with
// text.format.type:"json_schema", strict:true — the same discipline this
// platform already applies to every other AI-generated artifact — rather
// than free-form prose. Unlike those two services, this one has NO authority
// of its own: it produces a candidate narrative that MUST pass the Rule #2
// Groundedness Validator (see application/audit-report.service.ts) before
// any part of it can reach a stored, user-visible report.
//
// Generation parameters: temperature 0 (lower than the existing platform
// convention of 0.2 used for single-recommendation advisory calls) —
// chosen specifically for this feature because a multi-section report
// narrative has far more surface area for unsupported elaboration than one
// finding recommendation, and minimizing sampling randomness is a cheap
// first line of defense before the mechanical Rule #2 gate (which is the
// actual enforcement mechanism, not this parameter).
export const NARRATIVE_GENERATION_TEMPERATURE = 0;
export const NARRATIVE_GENERATION_MAX_OUTPUT_TOKENS = 12_000;
export const NARRATIVE_PROMPT_VERSION = "audit-report-narrative-v1";

@Injectable()
export class NarrativeGeneratorService {
  async generate(input: {
    snapshot: ClosureSnapshotPayload;
    engineResult: ComplianceEngineResult;
    citationManifest: CitationManifest;
    correctiveFeedback?: string;
  }): Promise<{ rawPayload: unknown; model: string }> {
    const env = readEnv();
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        temperature: NARRATIVE_GENERATION_TEMPERATURE,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: systemPrompt() }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: buildUserPrompt(input) }]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "audit_report_narrative",
            strict: true,
            schema: narrativeJsonSchema()
          }
        },
        max_output_tokens: NARRATIVE_GENERATION_MAX_OUTPUT_TOKENS
      })
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new BadGatewayException(`OpenAI audit report narrative generation failed: ${openAiErrorMessage(body)}`);
    }
    const text = outputText(body);
    if (!text) {
      throw new BadGatewayException("OpenAI audit report narrative generation returned no text output.");
    }
    const parsed = recoverJsonObject(text);
    if (!parsed) {
      throw new BadGatewayException("OpenAI audit report narrative generation returned unparseable JSON.");
    }
    return { rawPayload: parsed, model: env.OPENAI_MODEL };
  }
}

function systemPrompt(): string {
  return [
    "You are a compliance audit report narrative writer for the Cybernara GRC platform.",
    "You produce ONLY narrative synthesis. You never calculate compliance percentages, change control dispositions, approve remediation, accept risk, close findings, or invent evidence, controls, citations, framework mappings, or reviewer decisions.",
    "Every 'fact' or 'inference' statement you write MUST cite at least one citation ID from the exact closed set of citation IDs supplied to you. You may NEVER invent a citation ID, and you may NEVER reuse a citation ID from any other context, tenant, or assessment.",
    "Use claimType='commentary' ONLY for forward-looking management advisory recommendations (e.g. 'Management should review access policies'). Never classify statements asserting past organizational actions, decisions, implementation states, or findings as 'commentary'.",
    "Any numeric value you state (a count of findings, controls, risks, or evidence items) MUST be provided via the statement's structured numericClaims field, using the exact values already computed by the deterministic compliance engine supplied to you.",
    "CRITICAL AUDIT TONE & SEMANTIC BOUNDARIES:",
    "1. Use conservative, objective audit facts. Never use subjective or speculative language such as 'proactive approach', 'managed effectively', 'strategic decision', 'opted to accept instead of remediating', 'remediation was abandoned', 'status is concerning', 'did not contribute to compliance', or 'need for immediate attention'. An active risk acceptance proves only that an approved risk acceptance record exists with its recorded rationale, dates, and approver.",
    "2. An accepted residual risk item MUST NOT be described as an 'unresolved issue' or 'unresolved finding'. Accepted residual risk is distinct from unresolved findings.",
    "3. Distinguish evidence linkage from evidence-content conclusions. Metadata/linkage citations only support factual existence of linked artifacts (e.g. 'Two evidence artifacts are linked to control C-11'). Do NOT assert evidence-content conclusions (e.g. 'The evidence did not demonstrate compliance' or 'did not contribute to compliance') unless integrity-verified extracted evidence text explicitly supports that statement.",
    "4. For framework_compliance_percentage, state a percentage ONLY for frameworks with a numeric rawPercentage. For frameworks with displayPercentage 'N/A (no applicable controls)' (rawPercentage: null), DO NOT emit a framework_compliance_percentage numericClaim in any section; state in prose that the framework has no applicable controls.",
    "5. The conclusion section may summarize validated facts already established in the report, but must not introduce new factual claims or unsupported recommendations.",
    "6. If sufficient information does not exist to support a claim with valid citations, OMIT the statement rather than inventing claims or bad citations."
  ].join(" ");
}

function buildUserPrompt(input: {
  snapshot: ClosureSnapshotPayload;
  engineResult: ComplianceEngineResult;
  citationManifest: CitationManifest;
  correctiveFeedback?: string;
}): string {
  const sections = [
    `ASSESSMENT: ${JSON.stringify(input.snapshot.assessment)}`,
    `HISTORICAL ASSURANCE LEVEL: ${input.snapshot.historicalAssuranceLevel}${input.snapshot.reconstructed ? ` (reconstructed: ${input.snapshot.reconstructionNote ?? ""})` : ""}`,
    `DETERMINISTIC FRAMEWORK COMPLIANCE (source of truth for every number you may state): ${JSON.stringify(input.engineResult.frameworks)}`,
    `DETERMINISTIC CONTROL DISPOSITIONS: ${JSON.stringify(input.engineResult.dispositions)}`,
    `VALID CITATION IDS (the closed set — you may cite ONLY these, nothing else): ${JSON.stringify(citationManifestToPromptList(input.citationManifest))}`
  ];
  if (input.correctiveFeedback) {
    sections.push(
      `PRIOR ATTEMPT FAILED VALIDATION. The following statements were rejected — do not repeat these errors:\n${input.correctiveFeedback}`
    );
  }
  sections.push(
    "Write the full narrative now, populating every required section. Use only the citation IDs listed above. Every fact/inference statement needs at least one valid citation. Every number must come from the deterministic data above, expressed via numericClaims."
  );
  return sections.join("\n\n");
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

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}
