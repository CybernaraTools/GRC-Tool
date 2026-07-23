import { BadGatewayException, Injectable } from "@nestjs/common";
import { readEnv } from "../../../config/env.js";
import type {
  AiResponseType,
  ApprovedControlContext,
  CitationSource,
  GeneratedQuestionCandidate,
  GenerationParameters
} from "../domain/governance.js";

export interface OpenAiQuestionGenerationInput {
  generationParameters: GenerationParameters;
  controls: ApprovedControlContext[];
  responseTypes: AiResponseType[];
  questionFocus?: string;
}

@Injectable()
export class OpenAiQuestionGeneratorService {
  async generateQuestions(input: OpenAiQuestionGenerationInput): Promise<GeneratedQuestionCandidate[]> {
    const responseTypes = uniqueResponseTypes(input.responseTypes);
    const initialCandidates = await requestCandidates(input, responseTypes);
    const missingTypes = missingResponseTypes(initialCandidates, responseTypes);
    const retryCandidates = missingTypes.length > 0 ? await requestCandidates(input, missingTypes) : [];
    return completeRequestedTypes([...initialCandidates, ...retryCandidates], responseTypes, input.controls);
  }
}

async function requestCandidates(
  input: OpenAiQuestionGenerationInput,
  responseTypes: AiResponseType[]
): Promise<GeneratedQuestionCandidate[]> {
  const env = readEnv();
  let lastFormatError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        input: [
          {
            role: "system",
            content: [
              "You generate concise GRC assessment questions.",
              "Return only JSON matching the supplied schema.",
              "Use only the provided control context, evidence expectation ids, and citation source ids.",
              "Citation sourceId values must be copied from the provided context exactly; do not append titles or explanatory text.",
              "Select evidenceExpectationIds and citations from the same control context that best matches the requested question focus.",
              "The question wording must match the requested response type: boolean asks a yes/no question, text asks for a narrative answer, maturity asks for a 1-to-5 rating, and multi_select asks which options/practices apply.",
              "Do not reuse evidence or citations from an unrelated control domain.",
              "Do not make compliance decisions or approve content."
            ].join(" ")
          },
          {
            role: "user",
            content: JSON.stringify({
              requestedResponseTypes: responseTypes,
              questionFocus: input.questionFocus?.trim() || null,
              controls: input.controls
            })
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "cybernara_assessment_question_candidates",
            schema: responseSchema(responseTypes),
            strict: true
          }
        },
        temperature: input.generationParameters.temperature,
        max_output_tokens: input.generationParameters.maxOutputTokens
      })
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new BadGatewayException(`OpenAI question generation failed: ${openAiErrorMessage(body)}`);
    }

    try {
      return parseCandidates(body, input.controls);
    } catch (error) {
      if (!isProviderFormatError(error) || attempt === 2) {
        throw error;
      }
      lastFormatError = error;
    }
  }

  throw lastFormatError instanceof Error ? lastFormatError : new BadGatewayException("OpenAI question generation returned invalid JSON.");
}

function responseSchema(responseTypes: AiResponseType[]): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["questions"],
    properties: {
      questions: {
        type: "array",
        minItems: responseTypes.length,
        maxItems: responseTypes.length,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["questionText", "responseType", "evidenceExpectationIds", "citations", "confidence"],
          properties: {
            questionText: { type: "string" },
            responseType: { type: "string", enum: responseTypes },
            evidenceExpectationIds: {
              type: "array",
              minItems: 1,
              items: { type: "string" }
            },
            citations: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["sourceId", "sourceType"],
                properties: {
                  sourceId: { type: "string" },
                  sourceType: {
                    type: "string",
                    enum: ["framework_requirement", "harmonized_control", "evidence_expectation", "tenant_scope", "knowledge_base"]
                  }
                }
              }
            },
            confidence: { type: "number", minimum: 0, maximum: 1 }
          }
        }
      }
    }
  };
}

function parseCandidates(body: unknown, controls: ApprovedControlContext[]): GeneratedQuestionCandidate[] {
  const text = outputText(body);
  if (!text) {
    throw new BadGatewayException("OpenAI question generation returned no text output.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const recovered = recoverJsonObject(text);
    if (!recovered) {
      throw new BadGatewayException("OpenAI question generation returned invalid JSON.");
    }
    parsed = recovered;
  }

  const questions = asRecord(parsed).questions;
  if (!Array.isArray(questions)) {
    throw new BadGatewayException("OpenAI question generation returned no questions array.");
  }

  const allowedCitations = new Map<string, CitationSource>();
  const allowedEvidenceIds = new Set<string>();
  for (const control of controls) {
    for (const citation of control.citations) {
      allowedCitations.set(citation.sourceId, citation);
    }
    for (const evidenceExpectationId of control.evidenceExpectationIds) {
      allowedEvidenceIds.add(evidenceExpectationId);
    }
  }

  const resolvedContextCitations = uniqueSources(controls.flatMap((control) => control.citations));

  return questions.map((question) => normalizeCandidate(question, allowedCitations, allowedEvidenceIds, resolvedContextCitations));
}

function normalizeCandidate(
  question: unknown,
  allowedCitations: Map<string, CitationSource>,
  allowedEvidenceIds: Set<string>,
  resolvedContextCitations: CitationSource[]
): GeneratedQuestionCandidate {
  const record = asRecord(question);
  const questionText = stringField(record, "questionText");
  const responseType = responseTypeField(record, "responseType");
  const evidenceExpectationIds = stringArrayField(record, "evidenceExpectationIds");
  const citationIds = citationsField(record.citations);
  const confidence = numberField(record, "confidence");

  const citations = citationIds.map((sourceId) => {
    const citation = resolveAllowedCitation(sourceId, allowedCitations);
    if (!citation) {
      throw new BadGatewayException(`OpenAI question generation cited an unauthorized source: ${sourceId}`);
    }
    return citation;
  });

  for (const evidenceExpectationId of evidenceExpectationIds) {
    if (!allowedEvidenceIds.has(evidenceExpectationId)) {
      throw new BadGatewayException(`OpenAI question generation referenced an unknown evidence expectation: ${evidenceExpectationId}`);
    }
  }

  return {
    questionText,
    responseType,
    evidenceExpectationIds,
    citations: uniqueSources([...citations, ...resolvedContextCitations]),
    confidence
  };
}

function resolveAllowedCitation(sourceId: string, allowedCitations: Map<string, CitationSource>): CitationSource | null {
  const trimmed = sourceId.trim();
  const exact = allowedCitations.get(trimmed);
  if (exact) {
    return exact;
  }

  const lower = trimmed.toLowerCase();
  for (const [allowedSourceId, citation] of allowedCitations) {
    if (allowedSourceId.toLowerCase() === lower) {
      return citation;
    }
  }

  const prefixMatches = [...allowedCitations.entries()]
    .filter(([allowedSourceId]) => {
      const allowedLower = allowedSourceId.toLowerCase();
      if (!lower.startsWith(allowedLower) || lower.length === allowedLower.length) {
        return false;
      }
      const nextCharacter = lower.charAt(allowedLower.length);
      return Boolean(nextCharacter.match(/[\s\-–—(/]/));
    })
    .sort(([left], [right]) => right.length - left.length);
  return prefixMatches[0]?.[1] ?? null;
}

function completeRequestedTypes(
  candidates: GeneratedQuestionCandidate[],
  responseTypes: AiResponseType[],
  controls: ApprovedControlContext[]
): GeneratedQuestionCandidate[] {
  return responseTypes.map((responseType) => {
    const candidate = candidates.find((item) => item.responseType === responseType);
    return candidate ?? fallbackCandidateFor(responseType, controls);
  });
}

function missingResponseTypes(candidates: GeneratedQuestionCandidate[], responseTypes: AiResponseType[]): AiResponseType[] {
  const returned = new Set(candidates.map((candidate) => candidate.responseType));
  return responseTypes.filter((responseType) => !returned.has(responseType));
}

function fallbackCandidateFor(responseType: AiResponseType, controls: ApprovedControlContext[]): GeneratedQuestionCandidate {
  const control = controls[0];
  if (!control) {
    throw new BadGatewayException("OpenAI question generation did not return a requested response type and no control context was available.");
  }
  return {
    questionText: fallbackQuestionText(responseType, control),
    responseType,
    evidenceExpectationIds: [...control.evidenceExpectationIds],
    citations: uniqueSources(control.citations),
    confidence: 0.72
  };
}

function fallbackQuestionText(responseType: AiResponseType, control: ApprovedControlContext): string {
  const scope = control.tenantScopeTags.length > 0 ? ` for ${control.tenantScopeTags.join(", ")}` : "";
  if (responseType === "boolean") {
    return `Is ${control.controlTitle} implemented and supported by current evidence${scope}?`;
  }
  if (responseType === "maturity") {
    return `What maturity level best describes ${control.controlTitle}${scope}, and what evidence supports that rating?`;
  }
  if (responseType === "multi_select") {
    return `Which ${control.controlTitle} practices are implemented${scope}? Select all that are supported by evidence.`;
  }
  return `Describe how ${control.controlTitle} is implemented${scope}, including owners, frequency, exceptions, and evidence.`;
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

function isProviderFormatError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return /returned (invalid JSON|no text output|no questions array)/i.test(error.message);
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

function uniqueResponseTypes(values: AiResponseType[]): AiResponseType[] {
  return Array.from(new Set(values.length > 0 ? values : ["text"]));
}

function uniqueSources(sources: CitationSource[]): CitationSource[] {
  const byKey = new Map<string, CitationSource>();
  for (const source of sources) {
    byKey.set(`${source.sourceType}:${source.sourceId}`, source);
  }
  return [...byKey.values()];
}

function citationsField(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new BadGatewayException("OpenAI question generation returned invalid citations.");
  }
  const citations = value.map((candidate) => stringField(asRecord(candidate), "sourceId"));
  if (citations.length === 0) {
    throw new BadGatewayException("OpenAI question generation returned no citations.");
  }
  return citations;
}

function responseTypeField(record: Record<string, unknown>, key: string): AiResponseType {
  const value = stringField(record, key);
  if (value === "boolean" || value === "text" || value === "maturity" || value === "multi_select") {
    return value;
  }
  throw new BadGatewayException(`OpenAI question generation returned invalid response type: ${value}`);
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new BadGatewayException(`OpenAI question generation returned invalid ${key}.`);
  }
  return value.trim();
}

function stringArrayField(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    throw new BadGatewayException(`OpenAI question generation returned invalid ${key}.`);
  }
  const strings = value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
  if (strings.length === 0) {
    throw new BadGatewayException(`OpenAI question generation returned empty ${key}.`);
  }
  return strings.map((item) => item.trim());
}

function numberField(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || value < 0 || value > 1) {
    throw new BadGatewayException(`OpenAI question generation returned invalid ${key}.`);
  }
  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}
