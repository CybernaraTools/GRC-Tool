import "dotenv/config";
import { afterEach, describe, expect, it } from "vitest";
import { OpenAiQuestionGeneratorService } from "../../src/modules/ai-orchestration/application/openai-question-generator.service.js";
import type { ApprovedControlContext } from "../../src/modules/ai-orchestration/public.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("OpenAiQuestionGeneratorService", () => {
  it("calls the OpenAI Responses API and maps validated question candidates", async () => {
    const requests: unknown[] = [];
    globalThis.fetch = (async (_url, init) => {
      requests.push(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            questions: [
              {
                questionText: "Is multi-factor authentication required for privileged administrative access?",
                responseType: "boolean",
                evidenceExpectationIds: ["EV-MFA-POLICY"],
                citations: [{ sourceId: "SOC2:CC6.1", sourceType: "framework_requirement" }],
                confidence: 0.92
              },
              {
                questionText: "Describe how MFA enrollment and exception handling are monitored.",
                responseType: "text",
                evidenceExpectationIds: ["EV-MFA-ENROLLMENT"],
                citations: [{ sourceId: "HARM-00002", sourceType: "harmonized_control" }],
                confidence: 0.89
              }
            ]
          })
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }) as typeof fetch;

    const service = new OpenAiQuestionGeneratorService();
    const candidates = await service.generateQuestions({
      generationParameters: { temperature: 0.1, maxOutputTokens: 900, retrievalTopK: 6 },
      controls: [controlContext()],
      responseTypes: ["boolean", "text"],
      questionFocus: "MFA for privileged access"
    });

    expect(requests).toHaveLength(1);
    expect((requests[0] as { model: string }).model).toBe(process.env.OPENAI_MODEL ?? "gpt-4.1-mini");
    expect(candidates.map((candidate) => candidate.responseType)).toEqual(["boolean", "text"]);
    expect(candidates[0].citations[0].checksum).toBe("soc2-cc61");
    expect(candidates[1].evidenceExpectationIds).toEqual(["EV-MFA-ENROLLMENT"]);
  });

  it("retries and fills a missing response type from governed control context", async () => {
    const requests: Array<{ input: Array<{ content: string }> }> = [];
    globalThis.fetch = (async (_url, init) => {
      const request = JSON.parse(String(init?.body)) as { input: Array<{ content: string }> };
      requests.push(request);
      const requested = JSON.parse(request.input[1].content) as { requestedResponseTypes: string[] };
      const questions = requested.requestedResponseTypes.includes("text")
        ? [
            {
              questionText: "Describe how MFA is evidenced.",
              responseType: "text",
              evidenceExpectationIds: ["EV-MFA-POLICY"],
              citations: [{ sourceId: "SOC2:CC6.1", sourceType: "framework_requirement" }],
              confidence: 0.88
            }
          ]
        : [];
      return new Response(JSON.stringify({ output_text: JSON.stringify({ questions }) }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }) as typeof fetch;

    const service = new OpenAiQuestionGeneratorService();
    const candidates = await service.generateQuestions({
      generationParameters: { temperature: 0.1, maxOutputTokens: 900, retrievalTopK: 6 },
      controls: [controlContext()],
      responseTypes: ["text", "maturity"],
      questionFocus: "MFA for privileged access"
    });

    expect(requests).toHaveLength(2);
    expect(candidates.map((candidate) => candidate.responseType)).toEqual(["text", "maturity"]);
    expect(candidates[1].questionText).toContain("maturity level");
    expect(candidates[1].citations.map((citation) => citation.sourceId)).toEqual(["SOC2:CC6.1", "HARM-00002", "NIST_SP800:CP-10"]);
  });

  it("retries once when the provider returns malformed JSON", async () => {
    let callCount = 0;
    globalThis.fetch = (async () => {
      callCount += 1;
      const outputText = callCount === 1
        ? "{\"questions\":["
        : JSON.stringify({
            questions: [
              {
                questionText: "Which business continuity practices are implemented?",
                responseType: "multi_select",
                evidenceExpectationIds: ["EV-MFA-POLICY"],
                citations: [{ sourceId: "NIST_SP800:CP-10 Testing, Maintaining, and Revising Plans", sourceType: "framework_requirement" }],
                confidence: 0.9
              }
            ]
          });
      return new Response(JSON.stringify({ output_text: outputText }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }) as typeof fetch;

    const service = new OpenAiQuestionGeneratorService();
    const [candidate] = await service.generateQuestions({
      generationParameters: { temperature: 0.1, maxOutputTokens: 900, retrievalTopK: 6 },
      controls: [controlContext()],
      responseTypes: ["multi_select"],
      questionFocus: "Business continuity testing"
    });

    expect(callCount).toBe(2);
    expect(candidate.responseType).toBe("multi_select");
    expect(candidate.citations[0].sourceId).toBe("NIST_SP800:CP-10");
  });

  it("resolves provider citation IDs that include an allowed source title suffix", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            questions: [
              {
                questionText: "Which business continuity testing practices are currently operating?",
                responseType: "multi_select",
                evidenceExpectationIds: ["EV-MFA-POLICY"],
                citations: [
                  {
                    sourceId: "NIST_SP800:CP-10 Testing, Maintaining, and Revising Plans",
                    sourceType: "framework_requirement"
                  }
                ],
                confidence: 0.86
              }
            ]
          })
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )) as typeof fetch;

    const service = new OpenAiQuestionGeneratorService();
    const [candidate] = await service.generateQuestions({
      generationParameters: { temperature: 0.1, maxOutputTokens: 900, retrievalTopK: 6 },
      controls: [controlContext()],
      responseTypes: ["multi_select"],
      questionFocus: "Business continuity testing"
    });

    expect(candidate.responseType).toBe("multi_select");
    expect(candidate.citations[0].sourceId).toBe("NIST_SP800:CP-10");
  });

  it("still rejects citations that are not in the selected governed context", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            questions: [
              {
                questionText: "Which business continuity testing practices are currently operating?",
                responseType: "multi_select",
                evidenceExpectationIds: ["EV-MFA-POLICY"],
                citations: [{ sourceId: "NIST_SP800:CP-99 Unrelated Control", sourceType: "framework_requirement" }],
                confidence: 0.86
              }
            ]
          })
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )) as typeof fetch;

    const service = new OpenAiQuestionGeneratorService();
    await expect(
      service.generateQuestions({
        generationParameters: { temperature: 0.1, maxOutputTokens: 900, retrievalTopK: 6 },
        controls: [controlContext()],
        responseTypes: ["multi_select"],
        questionFocus: "Business continuity testing"
      })
    ).rejects.toThrow(/unauthorized source/);
  });
});

function controlContext(): ApprovedControlContext {
  return {
    harmonizedControlId: "HARM-00002",
    controlTitle: "Multi-factor authentication",
    controlDescription: "Require strong authentication for privileged, remote, and high-risk access.",
    mappedClauseIds: ["SOC2:CC6.1", "ISO_27001:A.5.17"],
    evidenceExpectationIds: ["EV-MFA-POLICY", "EV-MFA-ENROLLMENT"],
    tenantScopeTags: ["identity", "privileged-access"],
    citations: [
      {
        sourceId: "SOC2:CC6.1",
        sourceType: "framework_requirement",
        checksum: "soc2-cc61"
      },
      {
        sourceId: "HARM-00002",
        sourceType: "harmonized_control",
        checksum: "harm-00002"
      },
      {
        sourceId: "NIST_SP800:CP-10",
        sourceType: "framework_requirement",
        checksum: "nist-cp10"
      }
    ]
  };
}
