import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { loginPath } from "../../../src/lib/auth";
import { apiErrorMessage, createServerApiClient } from "../../../src/lib/api/server";
import { accessTokenCookieName, readSessionContextFromAccessToken } from "../../../src/lib/session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const session = await readSessionContextFromAccessToken(request.cookies.get(accessTokenCookieName)?.value);
  if (!session) {
    return redirectTo(request, loginPath("/ai"));
  }

  const api = createServerApiClient(session);
  const intent = text(formData, "intent");

  try {
    if (intent === "generate") {
      const frameworkKeys = await selectedEnabledFrameworkKeys(api, formData);
      if (frameworkKeys.length === 0) {
        return redirectTo(request, `/ai?error=${encodeURIComponent("Enable at least one framework before generating AI questions.")}`);
      }
      const run = await api.requestAiQuestionGeneration(generationBody(formData, frameworkKeys), {
        idempotencyKey: idempotencyKey(formData, "ai-generation")
      });
      return redirectTo(request, generationHref(run.id, run.questions[0]?.id ?? "", text(formData, "questionFocus")));
    }

    if (intent === "fallback") {
      const frameworkKeys = await selectedEnabledFrameworkKeys(api, formData);
      if (frameworkKeys.length === 0) {
        return redirectTo(request, `/ai?error=${encodeURIComponent("Enable at least one framework before triggering fallback generation.")}`);
      }
      const run = await api.triggerAiQuestionFallback(
        {
          generationParameters: generationParameters(),
          questionFocus: text(formData, "questionFocus") || undefined,
          frameworkKeys,
          failureReason: "model_unavailable"
        },
        { idempotencyKey: idempotencyKey(formData, "ai-fallback") }
      );
      return redirectTo(request, `${generationHref(run.id, run.questions[0]?.id ?? "", text(formData, "questionFocus"))}&fallback=1`);
    }

    if (intent === "review") {
      const generationRunId = text(formData, "generationRunId");
      await api.reviewAiGeneration(
        generationRunId,
        {
          decision: text(formData, "decision") === "rejected" ? "rejected" : "approved",
          rationale: text(formData, "rationale"),
          reviewerKind: "human"
        },
        { idempotencyKey: idempotencyKey(formData, "ai-review") }
      );
      return redirectTo(request, `${generationHref(generationRunId, text(formData, "questionId"), text(formData, "questionFocus"))}&reviewed=1`);
    }

    if (intent === "publish") {
      const questionId = text(formData, "questionId");
      const published = await api.publishAiQuestion(questionId, { idempotencyKey: idempotencyKey(formData, "ai-publish") });
      return redirectTo(request, `${generationHref(published.generationRunId ?? text(formData, "generationRunId"), questionId, text(formData, "questionFocus"))}&published=1`);
    }

    if (intent === "publishRun") {
      const generationRunId = text(formData, "generationRunId");
      const published = await api.publishAiGenerationQuestions(generationRunId, { idempotencyKey: idempotencyKey(formData, "ai-publish-run") });
      return redirectTo(request, `${generationHref(published.id, text(formData, "questionId"), text(formData, "questionFocus"))}&published=1`);
    }
  } catch (error) {
    return redirectTo(request, `/ai?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }

  return NextResponse.json({ error: "Unsupported AI action." }, { status: 400 });
}

function redirectTo(request: NextRequest, href: string) {
  return NextResponse.redirect(new URL(href, request.headers.get("origin") ?? request.url), 303);
}

function generationHref(generationRunId: string, questionId: string, questionFocus: string): string {
  const params = new URLSearchParams({ generationRunId, questionId });
  if (questionFocus) {
    params.set("focus", questionFocus);
  }
  return `/ai?${params.toString()}`;
}

function generationBody(formData: FormData, frameworkKeys: string[]) {
  return {
    generationParameters: generationParameters(),
    responseTypes: selectedResponseTypes(formData),
    frameworkKeys,
    questionFocus: text(formData, "questionFocus") || undefined
  };
}

function selectedResponseTypes(formData: FormData) {
  const allowed = ["boolean", "text", "maturity", "multi_select"] as const;
  const selected = allowed.filter((responseType) => text(formData, `responseType.${responseType}`) === "on");
  return selected.length > 0 ? selected : ["text" as const];
}

async function selectedEnabledFrameworkKeys(api: ReturnType<typeof createServerApiClient>, formData: FormData): Promise<string[]> {
  const enabled = await api.listEnabledFrameworks();
  const enabledKeys = enabled.map((framework) => framework.frameworkKey).sort();
  return enabledKeys.filter((frameworkKey) => text(formData, `framework.${frameworkKey}`) === "on");
}

function generationParameters() {
  return { temperature: 0.1, maxOutputTokens: 1200, retrievalTopK: 6 };
}

function idempotencyKey(formData: FormData, prefix: string): string {
  return text(formData, "idempotencyKey") || `${prefix}-${randomUUID()}`;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
