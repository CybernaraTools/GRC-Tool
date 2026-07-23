import "dotenv/config";
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { AiOrchestrationService } from "../../src/modules/ai-orchestration/application/ai-orchestration.service.js";
import type { OpenAiQuestionGeneratorService } from "../../src/modules/ai-orchestration/application/openai-question-generator.service.js";
import { PostgresAiOrchestrationRepository } from "../../src/modules/ai-orchestration/infrastructure/postgres-ai-orchestration.repository.js";
import {
  approveModelDeployment,
  approvePromptVersion,
  approveRetrievalIndex,
  createModelDeployment,
  createPromptVersion,
  createQuestionGenerationRun,
  type AiGenerationRunRecord,
  type AiOrchestrationRepository,
  type AiPublicationEventRow,
  type AiQuestionVersionRecord,
  type EvaluationCaseRow,
  type EvaluationResultRow,
  type EvaluationSuiteRow,
  type GenerationCitationRow,
  type KnowledgeChunkRow,
  type RetrievalRunRow,
  type RetrievedChunkRow,
  type SafetyCheckRow
} from "../../src/modules/ai-orchestration/public.js";
import type {
  AiGenerationRun,
  AiPublicationEvent,
  ApprovedControlContext,
  EvaluationCase,
  EvaluationResult,
  EvaluationSuite,
  GeneratedQuestionCandidate,
  GenerationCitation,
  KnowledgeChunk,
  QuestionVersion,
  RetrievalRun,
  RetrievedChunk,
  SafetyCheck
} from "../../src/modules/ai-orchestration/public.js";
import type { AuditEventInput, AuditLogService } from "../../src/modules/audit-security/public.js";
import type { QuestionRepositoryService } from "../../src/modules/assessment/public.js";
import { createOutboxEvent } from "../../src/modules/outbox/domain/outbox-event.js";
import type { OutboxEvent, OutboxService } from "../../src/modules/outbox/public.js";
import { TenantScopedDb } from "../../src/platform/database/tenant-scoped-db.js";
import { DATABASE_POOL } from "../../src/platform/database/tokens.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";

const actorId = randomUUID();
const tenantId = randomUUID();
const frameworkKeys = [
  "CCPA",
  "CMMI",
  "DPDP",
  "E8",
  "GDPR",
  "HIPAA",
  "HITRUST",
  "ISO_27001",
  "ISO_9001",
  "NIST_SP800",
  "PCI_DSS",
  "PDPL",
  "SOC2"
];

let app: INestApplication;
let baseUrl: string;
let appPool: pg.Pool;
const repositoryPool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
const repositoryDb = new TenantScopedDb(repositoryPool);

beforeAll(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidUnknownValues: true,
      transform: true
    })
  );
  await app.listen(0);
  appPool = app.get<pg.Pool>(DATABASE_POOL);
  const address = app.getHttpServer().address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
}, 120_000);

afterAll(async () => {
  await app.close();
  await appPool.end();
  await repositoryPool.end();
});

describe("A5 AIOrchestration repository", () => {
  it("resolves prompt-specific control contexts from the live catalog", async () => {
    const repository = new PostgresAiOrchestrationRepository(repositoryDb);
    const prompts = [
      { prompt: "How is multi-factor authentication enforced for privileged, remote, and high-risk access?", expected: /Authentication|Privileged Access|Access Control/i },
      { prompt: "How are secure coding practices integrated into the software development lifecycle?", expected: /Application Security/i },
      { prompt: "How is vulnerability management performed and evidenced?", expected: /Vulnerability Management/i },
      { prompt: "How is vendor risk management performed for third-party suppliers?", expected: /Vendor Risk|Third Party/i },
      { prompt: "How does incident response handle reporting, escalation, and post-incident review?", expected: /Incident Response/i },
      { prompt: "How is data retention controlled across records and deletion schedules?", expected: /Data Retention/i },
      { prompt: "How is business continuity planning tested and maintained?", expected: /Business Continuity/i },
      { prompt: "How is asset inventory ownership and lifecycle maintained?", expected: /Asset Management/i }
    ];
    const resolved = await Promise.all(
      prompts.map(async (item) => {
        const contexts = await repository.resolveControlContexts({
          tenantId,
          actorId,
          query: item.prompt,
          limit: 1,
          frameworkKeys
        });
        expect(contexts).toHaveLength(1);
        const context = contexts[0];
        expect(`${context.controlTitle} ${context.controlDescription}`).toMatch(item.expected);
        expect(context.evidenceExpectationIds).not.toEqual(["EV-MFA-POLICY", "EV-MFA-ENROLLMENT"]);
        return context;
      })
    );

    expect(new Set(resolved.map((context) => context.harmonizedControlId)).size).toBeGreaterThan(5);
    expect(new Set(resolved.map((context) => context.evidenceExpectationIds.join("|"))).size).toBe(prompts.length);
    const secureCoding = resolved.find((context) => context.controlTitle === "Application Security");
    expect(secureCoding).toBeDefined();
    const secureCodingFrameworks = new Set(
      secureCoding?.citations
        .filter((citation) => citation.sourceType === "framework_requirement")
        .map((citation) => citation.sourceId.split(":")[0])
    );
    expect([...secureCodingFrameworks]).toEqual(expect.arrayContaining(["DPDP", "E8", "GDPR", "HITRUST", "ISO_27001", "PCI_DSS", "SOC2"]));
  }, 30_000);

  it("persists generation runs, question versions, pending review, and human review against real Supabase", async () => {
    const repository = new PostgresAiOrchestrationRepository(repositoryDb);
    const repoTenant = randomUUID();
    const governance = await repository.ensureGovernance({
      tenantId: repoTenant,
      actorId,
      controls: [controlContext()]
    });
    const run = createQuestionGenerationRun({
      tenantId: repoTenant,
      actorId,
      ...governance,
      generationParameters: generationParameters(),
      controls: [controlContext()],
      providerQuestions: [providerQuestion()]
    });
    const persisted = await repository.createGenerationRun(run);
    expect(persisted.status).toBe("awaiting_review");

    const pending = await repository.listPendingQuestions(repoTenant, { limit: 50, offset: 0 });
    expect(pending.some((question) => question.generationRunId === persisted.id)).toBe(true);

    const reviewed = await repository.recordReview({
      tenantId: repoTenant,
      generationRunId: persisted.id,
      reviewerId: actorId,
      decision: "approved",
      rationale: "Human reviewer approved the cited output.",
      questions: persisted.questions.map((question) => ({ ...question, state: "approved", approvedBy: actorId }))
    });
    expect(reviewed.status).toBe("approved");
    expect(reviewed.questions[0].state).toBe("approved");

    const approved = await repository.listApprovedQuestions(repoTenant, { limit: 50, offset: 0 });
    expect(approved.some((question) => question.generationRunId === persisted.id)).toBe(true);
  }, 30_000);
});

describe("A5 AIOrchestration service orchestration", () => {
  it("deduplicates generation requests and emits one outbox/audit side effect", async () => {
    const repository = new InMemoryAiRepository();
    const outbox = new InMemoryOutbox();
    const audit = new InMemoryAuditLog();
    const service = new AiOrchestrationService(
      repository,
      outbox as unknown as OutboxService,
      audit as unknown as AuditLogService
    );
    const input = {
      tenantId: randomUUID(),
      actorId,
      idempotencyKey: "a5-unit-generation",
      generationParameters: generationParameters(),
      controls: [controlContext()],
      providerQuestions: [providerQuestion()]
    };
    const first = await service.requestGeneration(input);
    const second = await service.requestGeneration(input);

    expect(second.id).toBe(first.id);
    expect(repository.runs.size).toBe(1);
    expect(outbox.events).toHaveLength(1);
    expect(audit.events).toHaveLength(1);
  });

  it("generates requested response types through the configured OpenAI provider once per idempotency key", async () => {
    const repository = new InMemoryAiRepository();
    const outbox = new InMemoryOutbox();
    const audit = new InMemoryAuditLog();
    const calls: Array<{ responseTypes: string[]; questionFocus?: string }> = [];
    const questionGenerator = {
      async generateQuestions(input: { responseTypes: string[]; questionFocus?: string }): Promise<GeneratedQuestionCandidate[]> {
        calls.push(input);
        return input.responseTypes.map((responseType) =>
          providerQuestion({
            questionText: `How should assessors evaluate ${responseType} MFA controls for privileged access?`,
            responseType: responseType as GeneratedQuestionCandidate["responseType"]
          })
        );
      }
    };
    const service = new AiOrchestrationService(
      repository,
      outbox as unknown as OutboxService,
      audit as unknown as AuditLogService,
      questionGenerator as unknown as OpenAiQuestionGeneratorService
    );
    const input = {
      tenantId: randomUUID(),
      actorId,
      idempotencyKey: "a5-openai-provider-generation",
      generationParameters: generationParameters(),
      controls: [controlContext()],
      responseTypes: ["boolean", "multi_select"] as GeneratedQuestionCandidate["responseType"][],
      questionFocus: "privileged-access MFA"
    };

    const first = await service.requestGeneration(input);
    const second = await service.requestGeneration(input);

    expect(second.id).toBe(first.id);
    expect(calls).toHaveLength(1);
    expect(calls[0].responseTypes).toEqual(["boolean", "multi_select"]);
    expect(calls[0].questionFocus).toBe("privileged-access MFA");
    expect(first.questions.map((question) => question.responseType)).toEqual(["boolean", "multi_select"]);
  });

  it("promotes approved published questions into the governed repository without changing the approval gate", async () => {
    const repository = new InMemoryAiRepository();
    const outbox = new InMemoryOutbox();
    const audit = new InMemoryAuditLog();
    const promoted: AiQuestionVersionRecord[] = [];
    const questionRepository = {
      async publishAiQuestion(input: { question: AiQuestionVersionRecord }) {
        promoted.push(input.question);
        return {} as Awaited<ReturnType<QuestionRepositoryService["publishAiQuestion"]>>;
      }
    } as unknown as QuestionRepositoryService;
    const service = new AiOrchestrationService(
      repository,
      outbox as unknown as OutboxService,
      audit as unknown as AuditLogService,
      undefined,
      questionRepository
    );

    const run = await service.requestGeneration({
      tenantId: randomUUID(),
      actorId,
      idempotencyKey: "a5-repository-promotion-generation",
      generationParameters: generationParameters(),
      controls: [controlContext()],
      providerQuestions: [providerQuestion()]
    });
    const questionId = run.questions[0].id;

    await expect(
      service.publishQuestion({
        tenantId: run.tenantId,
        actorId,
        idempotencyKey: "a5-repository-promotion-premature",
        questionId
      })
    ).rejects.toThrow("AI-origin content requires prior human approval before publish.");
    expect(promoted).toHaveLength(0);

    await service.review({
      tenantId: run.tenantId,
      actorId,
      idempotencyKey: "a5-repository-promotion-review",
      generationRunId: run.id,
      decision: "approved",
      rationale: "Human reviewer approved the repository promotion.",
      reviewerKind: "human"
    });
    const published = await service.publishQuestion({
      tenantId: run.tenantId,
      actorId,
      idempotencyKey: "a5-repository-promotion-publish",
      questionId
    });

    expect(published.state).toBe("approved");
    expect(promoted).toHaveLength(1);
    expect(promoted[0].id).toBe(questionId);
    expect(repository.publicationEvents.size).toBe(1);
  });

  it("publishes every approved question in a reviewed generation run into the governed repository", async () => {
    const repository = new InMemoryAiRepository();
    const outbox = new InMemoryOutbox();
    const audit = new InMemoryAuditLog();
    const promoted: AiQuestionVersionRecord[] = [];
    const questionRepository = {
      async publishAiQuestion(input: { question: AiQuestionVersionRecord }) {
        promoted.push(input.question);
        return {} as Awaited<ReturnType<QuestionRepositoryService["publishAiQuestion"]>>;
      }
    } as unknown as QuestionRepositoryService;
    const service = new AiOrchestrationService(
      repository,
      outbox as unknown as OutboxService,
      audit as unknown as AuditLogService,
      undefined,
      questionRepository
    );

    const responseTypes = ["boolean", "text", "maturity", "multi_select"] as GeneratedQuestionCandidate["responseType"][];
    const run = await service.requestGeneration({
      tenantId: randomUUID(),
      actorId,
      idempotencyKey: "a5-repository-run-promotion-generation",
      generationParameters: generationParameters(),
      controls: [controlContext()],
      providerQuestions: responseTypes.map((responseType) =>
        providerQuestion({
          questionText: `How should assessors answer the ${responseType} control?`,
          responseType
        })
      )
    });

    await service.review({
      tenantId: run.tenantId,
      actorId,
      idempotencyKey: "a5-repository-run-promotion-review",
      generationRunId: run.id,
      decision: "approved",
      rationale: "Human reviewer approved the full generated question set.",
      reviewerKind: "human"
    });
    const published = await service.publishGenerationQuestions({
      tenantId: run.tenantId,
      actorId,
      idempotencyKey: "a5-repository-run-promotion-publish",
      generationRunId: run.id
    });
    const replay = await service.publishGenerationQuestions({
      tenantId: run.tenantId,
      actorId,
      idempotencyKey: "a5-repository-run-promotion-publish",
      generationRunId: run.id
    });

    expect(replay.id).toBe(published.id);
    expect(promoted.map((question) => question.responseType).sort()).toEqual([...responseTypes].sort());
    expect(repository.publicationEvents.size).toBe(responseTypes.length);
  });
});

describe("A5 AIOrchestration HTTP exposure", () => {
  it("rejects missing context, missing scopes, and missing idempotency keys", async () => {
    const unauthenticated = await fetch(`${baseUrl}/v1/ai-orchestration/questions/pending-review`);
    expect(unauthenticated.status).toBe(401);

    const unauthorized = await fetch(`${baseUrl}/v1/ai-orchestration/questions/pending-review`, {
      headers: headers("assessment:read")
    });
    expect(unauthorized.status).toBe(403);

    const missingIdempotency = await fetch(`${baseUrl}/v1/ai-orchestration/question-generations`, {
      method: "POST",
      headers: headers("ai_generation_run:write"),
      body: JSON.stringify(generationBody())
    });
    expect(missingIdempotency.status).toBe(400);
  });

  it("requires human approval before AI-origin questions can be published", async () => {
    const generationKey = `a5-generation-${tenantId}`;
    const firstGeneration = await requestJson(
      "POST",
      "/v1/ai-orchestration/question-generations",
      generationBody(),
      "ai_generation_run:write",
      generationKey
    );
    const secondGeneration = await requestJson(
      "POST",
      "/v1/ai-orchestration/question-generations",
      generationBody(),
      "ai_generation_run:write",
      generationKey
    );
    expect(firstGeneration.status).toBe(201);
    expect(secondGeneration.status).toBe(201);
    const run = (await firstGeneration.json()) as AiGenerationResponse;
    expect(((await secondGeneration.json()) as AiGenerationResponse).id).toBe(run.id);

    // G-10 cutover note: appPool now connects as the RLS-scoped app_runtime
    // role, so this test-assertion helper query uses the owner-role
    // repositoryPool instead of appPool.
    const generationOutboxCount = await repositoryPool.query(
      `select count(*)::int as count from outbox_events where tenant_id = $1 and idempotency_key = $2`,
      [tenantId, generationKey]
    );
    expect(generationOutboxCount.rows[0].count).toBe(1);

    const questionId = run.questions[0].id;
    const prematurePublish = await requestJson(
      "POST",
      `/v1/ai-orchestration/questions/${questionId}/publish`,
      {},
      "ai_question_version:write",
      "a5-publish-before-review"
    );
    expect(prematurePublish.status).toBe(409);

    const pending = await getJson<AiQuestionResponse[]>(
      "/v1/ai-orchestration/questions/pending-review",
      "ai_question_version:read"
    );
    expect(pending.some((question) => question.id === questionId)).toBe(true);

    const provenance = await getJson<Record<string, unknown>>(
      `/v1/ai-orchestration/question-generations/${run.id}/provenance`,
      "ai_generation_run:read"
    );
    expect(provenance.generationRunId).toBe(run.id);
    expect(provenance.questions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: questionId,
          evidenceExpectationIds: expect.arrayContaining(["EV-MFA-POLICY", "EV-MFA-ENROLLMENT"])
        })
      ])
    );

    const aiReviewAttempt = await requestJson(
      "POST",
      `/v1/ai-orchestration/question-generations/${run.id}/reviews`,
      { decision: "approved", rationale: "Machine attempted approval.", reviewerKind: "ai" },
      "ai_generation_run:review",
      "a5-ai-review-attempt"
    );
    expect(aiReviewAttempt.status).toBe(400);

    const reviewed = await requestJson(
      "POST",
      `/v1/ai-orchestration/question-generations/${run.id}/reviews`,
      { decision: "approved", rationale: "Human reviewer approved cited, scoped output.", reviewerKind: "human" },
      "ai_generation_run:review",
      "a5-human-review"
    );
    expect(reviewed.status).toBe(201);
    expect(((await reviewed.json()) as AiGenerationResponse).status).toBe("approved");

    const approved = await getJson<AiQuestionResponse[]>(
      "/v1/ai-orchestration/questions/approved?limit=1&offset=0",
      "ai_question_version:read"
    );
    expect(approved.some((question) => question.id === questionId && question.state === "approved")).toBe(true);

    const publishedRun = await requestJson(
      "POST",
      `/v1/ai-orchestration/question-generations/${run.id}/publish`,
      {},
      "ai_question_version:write",
      "a5-publish-run-after-review"
    );
    expect(publishedRun.status).toBe(201);
    expect(((await publishedRun.json()) as AiGenerationResponse).id).toBe(run.id);

    const published = await requestJson(
      "POST",
      `/v1/ai-orchestration/questions/${questionId}/publish`,
      {},
      "ai_question_version:write",
      "a5-publish-after-review"
    );
    expect(published.status).toBe(201);
    expect(((await published.json()) as AiQuestionResponse).state).toBe("approved");
  }, 120_000);

  it("generates requested response types through the OpenAI-backed HTTP path", async () => {
    const nativeFetch = globalThis.fetch;
    const providerRequests: unknown[] = [];
    globalThis.fetch = (async (input, init) => {
      if (String(input) !== "https://api.openai.com/v1/responses") {
        return nativeFetch(input, init);
      }
      const providerBody = JSON.parse(String(init?.body));
      providerRequests.push(providerBody);
      const userPayload = JSON.parse(String(providerBody.input[1].content)) as {
        controls: Array<{
          controlTitle: string;
          evidenceExpectationIds: string[];
          citations: Array<{ sourceId: string; sourceType: string }>;
        }>;
      };
      const resolvedControl = userPayload.controls[0];
      expect(resolvedControl.controlTitle).toMatch(/Application Security/i);
      expect(resolvedControl.evidenceExpectationIds.join(" ")).toMatch(/SECURE-CODING|CODE-REVIEW|SAST/);
      expect(resolvedControl.evidenceExpectationIds).not.toEqual(["EV-MFA-POLICY", "EV-MFA-ENROLLMENT"]);
      expect(resolvedControl.citations.map((citation) => citation.sourceId.split(":")[0])).toEqual(
        expect.arrayContaining(["DPDP", "E8", "GDPR", "HITRUST", "ISO_27001", "PCI_DSS", "SOC2"])
      );
      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            questions: [
              {
                questionText: "Are secure coding standards enforced during application development?",
                responseType: "boolean",
                evidenceExpectationIds: [resolvedControl.evidenceExpectationIds[0]],
                citations: [resolvedControl.citations[0]],
                confidence: 0.93
              },
              {
                questionText: "Describe the code review and security testing evidence retained for application changes.",
                responseType: "text",
                evidenceExpectationIds: [resolvedControl.evidenceExpectationIds[1]],
                citations: [resolvedControl.citations[resolvedControl.citations.length - 1]],
                confidence: 0.9
              }
            ]
          })
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }) as typeof fetch;

    try {
      const response = await requestJson(
        "POST",
        "/v1/ai-orchestration/question-generations",
        {
          generationParameters: generationParameters(),
          responseTypes: ["boolean", "text"],
          frameworkKeys,
          questionFocus: "How are secure coding practices integrated into the software development lifecycle?"
        },
        "ai_generation_run:write",
        `a5-openai-http-${tenantId}`
      );
      expect(response.status).toBe(201);
      const run = (await response.json()) as AiGenerationResponse;
      expect(run.status).toBe("awaiting_review");
      expect(run.questions.map((question) => question.responseType).sort()).toEqual(["boolean", "text"]);
      expect(providerRequests).toHaveLength(1);
    } finally {
      globalThis.fetch = nativeFetch;
    }
  }, 120_000);

  it("explicitly triggers curated fallback generation", async () => {
    const fallback = await requestJson(
      "POST",
      "/v1/ai-orchestration/question-generations/fallback",
      {
        generationParameters: generationParameters(),
        controls: [controlContext()],
        failureReason: "model_unavailable"
      },
      "ai_generation_run:write",
      `a5-fallback-${tenantId}`
    );
    expect(fallback.status).toBe(201);
    const body = (await fallback.json()) as AiGenerationResponse;
    expect(body.status).toBe("fallback_used");
    expect(body.failureReason).toBe("model_unavailable");
  }, 120_000);
});

// G-06 Phase 1 (AI provenance lineage): a real HTTP-level proof that the new routes (knowledge
// chunks, retrieval runs/chunks, generation citations, safety checks, evaluation suites/
// cases/results, publication events) are actually reachable through the full guard/controller/
// service/repository chain, not just direct-SQL integrity tests (see
// test/ai-orchestration/g06-ai-provenance.test.ts for those). No frontend UI exists yet for these
// routes, so there is no Playwright e2e to run against them — this HTTP-level test is the
// practical substitute evidence, same pattern used for G-01/G-04/G-09's newest tables.
describe("G-06 AIOrchestration HTTP exposure", () => {
  it("records knowledge chunks, retrieval runs/chunks, citations, safety checks, evaluation suites/cases/results, and publication events through HTTP", async () => {
    const key = randomUUID();

    const retrievalIndexResponse = await repositoryPool.query(
      `insert into ai_retrieval_indexes (tenant_id, index_key, index_version, created_by, updated_by)
       values ($1, 'tenant-control-index', $2, $3, $3) returning id`,
      [tenantId, `g06-${key}`, actorId]
    );
    const retrievalIndexId = retrievalIndexResponse.rows[0].id as string;

    const chunkResponse = await requestJson(
      "POST",
      "/v1/ai-orchestration/knowledge-chunks",
      {
        retrievalIndexId,
        sourceType: "framework_requirement",
        sourceId: `req-${key}`,
        sourceVersion: "v1",
        contentHash: `hash-${key}`,
        textUri: "s3://chunk"
      },
      "knowledge_chunk:write"
    );
    expect(chunkResponse.status).toBe(201);
    const chunk = (await chunkResponse.json()) as { id: string };

    const listedChunks = await getJson<Array<{ id: string }>>("/v1/ai-orchestration/knowledge-chunks", "knowledge_chunk:read");
    expect(listedChunks.some((candidate) => candidate.id === chunk.id)).toBe(true);

    const retrievalRunResponse = await requestJson(
      "POST",
      "/v1/ai-orchestration/retrieval-runs",
      { queryHash: `query-${key}`, retrievalIndexId, topK: 5 },
      "retrieval_run:write",
      `g06-retrieval-run-${key}`
    );
    expect(retrievalRunResponse.status).toBe(201);
    const retrievalRun = (await retrievalRunResponse.json()) as { id: string };

    const retrievedChunkResponse = await requestJson(
      "POST",
      `/v1/ai-orchestration/retrieval-runs/${retrievalRun.id}/chunks`,
      { knowledgeChunkId: chunk.id, rank: 1, score: 0.87, aclDecision: "allowed" },
      "retrieved_chunk:write",
      `g06-retrieved-chunk-${key}`
    );
    expect(retrievedChunkResponse.status).toBe(201);
    const listedRetrievedChunks = await getJson<Array<{ knowledgeChunkId: string }>>(
      `/v1/ai-orchestration/retrieval-runs/${retrievalRun.id}/chunks`,
      "retrieved_chunk:read"
    );
    expect(listedRetrievedChunks.some((candidate) => candidate.knowledgeChunkId === chunk.id)).toBe(true);

    const generation = await requestJson(
      "POST",
      "/v1/ai-orchestration/question-generations/fallback",
      { generationParameters: generationParameters(), controls: [controlContext()], failureReason: "model_unavailable" },
      "ai_generation_run:write",
      `g06-generation-${key}`
    );
    const generationRun = (await generation.json()) as AiGenerationResponse;

    const citationResponse = await requestJson(
      "POST",
      `/v1/ai-orchestration/question-generations/${generationRun.id}/citations`,
      { outputPath: "questions[0].text", knowledgeChunkId: chunk.id },
      "generation_citation:write",
      `g06-citation-${key}`
    );
    expect(citationResponse.status).toBe(201);
    const listedCitations = await getJson<Array<{ outputPath: string }>>(
      `/v1/ai-orchestration/question-generations/${generationRun.id}/citations`,
      "generation_citation:read"
    );
    expect(listedCitations.some((citation) => citation.outputPath === "questions[0].text")).toBe(true);

    const safetyCheckResponse = await requestJson(
      "POST",
      `/v1/ai-orchestration/question-generations/${generationRun.id}/safety-checks`,
      { checkType: "prompt_injection", policyVersion: "v1", result: "pass" },
      "safety_check:write",
      `g06-safety-check-${key}`
    );
    expect(safetyCheckResponse.status).toBe(201);
    const listedSafetyChecks = await getJson<Array<{ result: string }>>(
      `/v1/ai-orchestration/question-generations/${generationRun.id}/safety-checks`,
      "safety_check:read"
    );
    expect(listedSafetyChecks.some((check) => check.result === "pass")).toBe(true);

    const suiteResponse = await requestJson(
      "POST",
      "/v1/ai-orchestration/evaluation-suites",
      { useCase: "assessment_question", suiteKey: `golden-set-${key}`, suiteVersion: "v1" },
      "evaluation_suite:write"
    );
    expect(suiteResponse.status).toBe(201);
    const suite = (await suiteResponse.json()) as { id: string };

    const fetchedSuite = await getJson<{ id: string }>(`/v1/ai-orchestration/evaluation-suites/${suite.id}`, "evaluation_suite:read");
    expect(fetchedSuite.id).toBe(suite.id);

    const caseResponse = await requestJson(
      "POST",
      `/v1/ai-orchestration/evaluation-suites/${suite.id}/cases`,
      { caseKey: "case-1", inputFixtureUri: "s3://fixture" },
      "evaluation_case:write"
    );
    expect(caseResponse.status).toBe(201);
    const evaluationCase = (await caseResponse.json()) as { id: string };
    const listedCases = await getJson<Array<{ id: string }>>(`/v1/ai-orchestration/evaluation-suites/${suite.id}/cases`, "evaluation_case:read");
    expect(listedCases.some((candidate) => candidate.id === evaluationCase.id)).toBe(true);

    const evaluationRunResponse = await repositoryPool.query(
      `insert into ai_evaluation_runs (
         tenant_id, target_type, target_id, suite_id, score, passed, adversarial_passed,
         tenant_isolation_passed, drift_within_threshold, approved_by, approved_at, created_by, updated_by
       )
       values ($1, 'prompt', $2, $3, 0.9, true, true, true, true, $4, now(), $4, $4)
       returning id`,
      [tenantId, randomUUID(), suite.id, actorId]
    );
    const evaluationRunId = evaluationRunResponse.rows[0].id as string;

    const resultResponse = await requestJson(
      "POST",
      `/v1/ai-orchestration/evaluation-suites/${suite.id}/results`,
      { evaluationRunId, caseId: evaluationCase.id, metric: "citation_accuracy", score: 0.92, threshold: 0.8 },
      "evaluation_result:write"
    );
    expect(resultResponse.status).toBe(201);
    const listedResults = await getJson<Array<{ passed: boolean }>>(
      `/v1/ai-orchestration/evaluation-suites/${suite.id}/results`,
      "evaluation_result:read"
    );
    expect(listedResults.some((result) => result.passed === true)).toBe(true);
  }, 120_000);
});

interface AiGenerationResponse {
  id: string;
  status: string;
  failureReason?: string;
  questions: AiQuestionResponse[];
}

interface AiQuestionResponse {
  id: string;
  state: string;
  responseType: GeneratedQuestionCandidate["responseType"];
}

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
      }
    ]
  };
}

function providerQuestion(overrides: Partial<GeneratedQuestionCandidate> = {}): GeneratedQuestionCandidate {
  return {
    questionText:
      "How is multi-factor authentication enforced for privileged, remote, and high-risk access in the scoped identity systems?",
    responseType: "text",
    evidenceExpectationIds: ["EV-MFA-POLICY", "EV-MFA-ENROLLMENT"],
    citations: controlContext().citations,
    confidence: 0.91,
    ...overrides
  };
}

function generationParameters() {
  return { temperature: 0.1, maxOutputTokens: 1200, retrievalTopK: 6 };
}

function generationBody() {
  return {
    generationParameters: generationParameters(),
    controls: [controlContext()],
    providerQuestions: [providerQuestion()]
  };
}

function headers(scopes: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-tenant-id": tenantId,
    "x-user-id": actorId,
    "x-user-clearance": "restricted",
    "x-user-scopes": scopes
  };
}

async function requestJson(
  method: "POST",
  route: string,
  body: unknown,
  scopes: string,
  idempotencyKey?: string
): Promise<Response> {
  return fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      ...headers(scopes),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
    },
    body: JSON.stringify(body)
  });
}

async function getJson<T>(route: string, scopes: string): Promise<T> {
  const response = await fetch(`${baseUrl}${route}`, { headers: headers(scopes) });
  expect(response.status).toBe(200);
  return (await response.json()) as T;
}

class InMemoryOutbox {
  readonly events: OutboxEvent[] = [];

  async findByIdempotencyKey(tenant: string, idempotencyKey: string): Promise<OutboxEvent | null> {
    return this.events.find((event) => event.tenantId === tenant && event.idempotencyKey === idempotencyKey) ?? null;
  }

  async publish(input: {
    tenantId: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    payload: Record<string, unknown>;
    idempotencyKey: string;
    createdBy: string;
    now?: Date;
  }): Promise<OutboxEvent> {
    const existing = await this.findByIdempotencyKey(input.tenantId, input.idempotencyKey);
    if (existing) {
      return existing;
    }
    const event = createOutboxEvent(input);
    this.events.push(event);
    return event;
  }
}

class InMemoryAuditLog {
  readonly events: AuditEventInput[] = [];

  async append(input: AuditEventInput): Promise<AuditEventInput> {
    this.events.push(input);
    return input;
  }
}

class InMemoryAiRepository implements AiOrchestrationRepository {
  readonly runs = new Map<string, AiGenerationRunRecord>();
  readonly questions = new Map<string, AiQuestionVersionRecord>();
  readonly knowledgeChunks = new Map<string, KnowledgeChunkRow>();
  readonly retrievalRuns = new Map<string, RetrievalRunRow>();
  readonly retrievedChunks = new Map<string, RetrievedChunkRow>();
  readonly generationCitations = new Map<string, GenerationCitationRow>();
  readonly safetyChecks = new Map<string, SafetyCheckRow>();
  readonly evaluationSuites = new Map<string, EvaluationSuiteRow>();
  readonly evaluationCases = new Map<string, EvaluationCaseRow>();
  readonly evaluationResults = new Map<string, EvaluationResultRow>();
  readonly publicationEvents = new Map<string, AiPublicationEventRow>();
  private governance?: Awaited<ReturnType<AiOrchestrationRepository["ensureGovernance"]>>;

  async resolveControlContexts(): Promise<ApprovedControlContext[]> {
    return [controlContext()];
  }

  async ensureGovernance(input: { tenantId: string; actorId: string; controls: ApprovedControlContext[] }) {
    if (this.governance) {
      return this.governance;
    }
    const evaluation = {
      id: randomUUID(),
      score: 0.98,
      passed: true,
      adversarialPassed: true,
      tenantIsolationPassed: true,
      driftWithinThreshold: true,
      approvedBy: input.actorId,
      approvedAt: new Date()
    };
    this.governance = {
      promptVersion: approvePromptVersion(
        createPromptVersion({
          key: "assessment-question-generator",
          version: "2026.07.02",
          template: "Generate cited assessment questions from approved controls only."
        }),
        evaluation
      ),
      modelDeployment: approveModelDeployment(
        createModelDeployment({
          provider: "openai",
          modelName: "approved-gateway-model",
          deploymentVersion: "2026-07-02",
          region: "us",
          riskTier: "high",
          noTraining: true,
          egressAllowList: ["api.openai.com"]
        }),
        evaluation
      ),
      retrievalIndex: approveRetrievalIndex(
        {
          tenantId: input.tenantId,
          key: "tenant-control-index",
          version: "runtime-controls-v1",
          allowedTenantIds: [input.tenantId],
          sources: input.controls.flatMap((control) => control.citations)
        },
        { approvedBy: input.actorId }
      )
    };
    return this.governance;
  }

  async createGenerationRun(run: AiGenerationRun): Promise<AiGenerationRunRecord> {
    const record: AiGenerationRunRecord = {
      ...run,
      version: 1,
      provenance: {},
      classification: "confidential",
      createdBy: run.actorId,
      updatedBy: run.actorId,
      updatedAt: run.createdAt
    };
    this.runs.set(record.id, record);
    for (const question of run.questions) {
      this.questions.set(question.id, questionRecord(record, question));
    }
    return record;
  }

  async listPendingQuestions(): Promise<AiQuestionVersionRecord[]> {
    return [...this.questions.values()].filter((question) => question.state === "pending_review");
  }

  async listApprovedQuestions(): Promise<AiQuestionVersionRecord[]> {
    return [...this.questions.values()].filter((question) => question.state === "approved");
  }

  async findGenerationRun(tenant: string, generationRunId: string): Promise<AiGenerationRunRecord | null> {
    const run = this.runs.get(generationRunId);
    return run?.tenantId === tenant ? run : null;
  }

  async findQuestion(tenant: string, questionId: string): Promise<AiQuestionVersionRecord | null> {
    const question = this.questions.get(questionId);
    return question?.tenantId === tenant ? question : null;
  }

  async recordReview(input: {
    tenantId: string;
    generationRunId: string;
    reviewerId: string;
    decision: "approved" | "rejected";
    rationale: string;
    questions: QuestionVersion[];
  }): Promise<AiGenerationRunRecord> {
    const current = await this.findGenerationRun(input.tenantId, input.generationRunId);
    if (!current) {
      throw new Error("Generation run not found.");
    }
    const updated: AiGenerationRunRecord = {
      ...current,
      status: input.decision,
      questions: input.questions,
      updatedBy: input.reviewerId,
      updatedAt: new Date()
    };
    this.runs.set(updated.id, updated);
    for (const question of input.questions) {
      this.questions.set(question.id, questionRecord(updated, question));
    }
    return updated;
  }

  async createKnowledgeChunk(input: { chunk: KnowledgeChunk; actorId: string }): Promise<KnowledgeChunkRow> {
    const record = withMetadata(input.chunk, input.actorId);
    this.knowledgeChunks.set(record.id, record);
    return record;
  }

  async listKnowledgeChunks(): Promise<KnowledgeChunkRow[]> {
    return [...this.knowledgeChunks.values()];
  }

  async createRetrievalRun(input: { run: RetrievalRun; actorId: string }): Promise<RetrievalRunRow> {
    const record = withMetadata(input.run, input.actorId);
    this.retrievalRuns.set(record.id, record);
    return record;
  }

  async listRetrievalRuns(): Promise<RetrievalRunRow[]> {
    return [...this.retrievalRuns.values()];
  }

  async createRetrievedChunk(input: { chunk: RetrievedChunk; actorId: string }): Promise<RetrievedChunkRow> {
    const record = withMetadata(input.chunk, input.actorId);
    this.retrievedChunks.set(record.id, record);
    return record;
  }

  async listRetrievedChunks(input: { retrievalRunId: string }): Promise<RetrievedChunkRow[]> {
    return [...this.retrievedChunks.values()].filter((chunk) => chunk.retrievalRunId === input.retrievalRunId);
  }

  async createGenerationCitation(input: { citation: GenerationCitation; actorId: string }): Promise<GenerationCitationRow> {
    const record = withMetadata(input.citation, input.actorId);
    this.generationCitations.set(record.id, record);
    return record;
  }

  async listGenerationCitations(input: { generationRunId: string }): Promise<GenerationCitationRow[]> {
    return [...this.generationCitations.values()].filter((citation) => citation.generationRunId === input.generationRunId);
  }

  async createSafetyCheck(input: { check: SafetyCheck; actorId: string }): Promise<SafetyCheckRow> {
    const record = withMetadata(input.check, input.actorId);
    this.safetyChecks.set(record.id, record);
    return record;
  }

  async listSafetyChecks(input: { generationRunId: string }): Promise<SafetyCheckRow[]> {
    return [...this.safetyChecks.values()].filter((check) => check.generationRunId === input.generationRunId);
  }

  async createEvaluationSuite(input: { suite: EvaluationSuite; actorId: string }): Promise<EvaluationSuiteRow> {
    const record = withMetadata(input.suite, input.actorId);
    this.evaluationSuites.set(record.id, record);
    return record;
  }

  async listEvaluationSuites(): Promise<EvaluationSuiteRow[]> {
    return [...this.evaluationSuites.values()];
  }

  async findEvaluationSuite(_tenantId: string, suiteId: string): Promise<EvaluationSuiteRow | null> {
    return this.evaluationSuites.get(suiteId) ?? null;
  }

  async createEvaluationCase(input: { evaluationCase: EvaluationCase; actorId: string }): Promise<EvaluationCaseRow> {
    const record = withMetadata(input.evaluationCase, input.actorId);
    this.evaluationCases.set(record.id, record);
    return record;
  }

  async listEvaluationCases(input: { suiteId: string }): Promise<EvaluationCaseRow[]> {
    return [...this.evaluationCases.values()].filter((evaluationCase) => evaluationCase.suiteId === input.suiteId);
  }

  async findEvaluationCase(_tenantId: string, caseId: string): Promise<EvaluationCaseRow | null> {
    return this.evaluationCases.get(caseId) ?? null;
  }

  async createEvaluationResult(input: { result: EvaluationResult; actorId: string }): Promise<EvaluationResultRow> {
    const record = withMetadata(input.result, input.actorId);
    this.evaluationResults.set(record.id, record);
    return record;
  }

  async listEvaluationResults(input: { suiteId: string }): Promise<EvaluationResultRow[]> {
    return [...this.evaluationResults.values()].filter((result) => {
      const evaluationCase = this.evaluationCases.get(result.caseId);
      return evaluationCase?.suiteId === input.suiteId;
    });
  }

  async createPublicationEvent(input: { event: AiPublicationEvent; actorId: string }): Promise<AiPublicationEventRow> {
    const record = withMetadata(input.event, input.actorId);
    this.publicationEvents.set(record.id, record);
    return record;
  }

  async listPublicationEvents(input: { targetType: string; targetId: string }): Promise<AiPublicationEventRow[]> {
    return [...this.publicationEvents.values()].filter(
      (event) => event.targetType === input.targetType && event.targetId === input.targetId
    );
  }
}

function withMetadata<T extends { id: string }>(record: T, actorId: string): T & {
  versionNumber: number;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
} {
  const now = new Date();
  return {
    ...record,
    versionNumber: 1,
    classification: "confidential",
    createdBy: actorId,
    createdAt: now,
    updatedBy: actorId,
    updatedAt: now
  };
}

function questionRecord(run: AiGenerationRunRecord, question: QuestionVersion): AiQuestionVersionRecord {
  return {
    ...question,
    tenantId: run.tenantId,
    generationRunId: run.id,
    generationStatus: run.status,
    versionNumber: 1,
    classification: "confidential",
    createdBy: run.actorId,
    createdAt: run.createdAt,
    updatedBy: run.actorId,
    updatedAt: run.createdAt
  };
}
