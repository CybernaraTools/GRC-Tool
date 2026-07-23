import "dotenv/config";
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { createAssessment, approveApplicability } from "../../src/modules/assessment/public.js";
import { PostgresAssessmentRepository } from "../../src/modules/assessment/infrastructure/postgres-assessment.repository.js";
import { createAnswerRevision, createApplicabilityDecision } from "../../src/modules/assessment/domain/execution-graph.js";
import { TenantScopedDb } from "../../src/platform/database/tenant-scoped-db.js";
import { DATABASE_POOL } from "../../src/platform/database/tokens.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";
import { approvedControlRefForTenant, approvedControlSelectionForTenant } from "../helpers/question-repository-fixture.js";

const actorId = randomUUID();
const ownerId = randomUUID();
const tenantId = randomUUID();
const evidenceId = randomUUID();

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

describe("A2 Assessment repository", () => {
  it("persists assessments and item state transitions against real Supabase", async () => {
    // G-09-session note: createAssessment now also resolves canonical
    // requirement ids and writes requirement_instances/question_sets/
    // question_versions (G-01 completion, 0017), pushing this real-Supabase
    // call chain past the default 5000ms vitest timeout — same fix already
    // applied to test/reporting-analytics/a4-reporting-api.test.ts.
    const repository = new PostgresAssessmentRepository(repositoryDb);
    const repositoryTenantId = randomUUID();
    const assessment = createAssessment({
      tenantId: repositoryTenantId,
      scopeName: "Repository A2",
      createdBy: actorId,
      ownerId,
      controls: [await approvedControlRefForTenant({ pool: repositoryPool, tenantId: repositoryTenantId, actorId })]
    });
    const persisted = await repository.createAssessment({
      assessment,
      periodStart: new Date("2026-01-01T00:00:00.000Z"),
      periodEnd: new Date("2026-12-31T00:00:00.000Z")
    });
    const item = persisted.items[0];
    const updated = approveApplicability(item, {
      applicable: true,
      rationale: "Applies to the scoped system.",
      approvedBy: actorId
    });

    await repository.updateItem({
      tenantId: persisted.tenantId,
      assessmentId: persisted.id,
      item: updated,
      actorId
    });
    const reloaded = await repository.findAssessment(persisted.tenantId, persisted.id);

    expect(reloaded?.items[0].status).toBe("in_progress");
    expect(reloaded?.items[0].applicability?.rationale).toBe("Applies to the scoped system.");
  }, 30_000);
});

describe("G-01 Cutover: assessment reads source from normalized tables, not legacy flat columns", () => {
  it("returns the normalized answer_revisions/applicability_decisions value even when the legacy flat column has since diverged", async () => {
    const repository = new PostgresAssessmentRepository(repositoryDb);
    const cutoverTenantId = randomUUID();
    const assessment = createAssessment({
      tenantId: cutoverTenantId,
      scopeName: "G-01 Cutover proof",
      createdBy: actorId,
      ownerId,
      controls: [await approvedControlRefForTenant({ pool: repositoryPool, tenantId: cutoverTenantId, actorId })]
    });
    const persisted = await repository.createAssessment({
      assessment,
      periodStart: new Date("2026-01-01T00:00:00.000Z"),
      periodEnd: new Date("2026-12-31T00:00:00.000Z")
    });
    const itemId = persisted.items[0].id;

    // Write a real normalized answer revision (the authoritative source post-Cutover) via the
    // repository's own dual-write method — the same call path AssessmentService.submitAnswer uses.
    await repository.recordAnswerRevision({
      tenantId: cutoverTenantId,
      revision: createAnswerRevision({
        assessmentItemId: itemId,
        revision: 1,
        responseJson: { answerText: "NORMALIZED ANSWER", evidenceIds: [evidenceId] },
        submittedBy: actorId
      })
    });
    const controlInstance = await repository.findControlInstanceByItem(cutoverTenantId, itemId);
    if (!controlInstance) {
      throw new Error("Expected a control_instance to be linked for a freshly-created item.");
    }
    await repository.recordApplicabilityDecision({
      tenantId: cutoverTenantId,
      decision: createApplicabilityDecision({
        controlInstanceId: controlInstance.id,
        applicable: false,
        rationale: "NORMALIZED RATIONALE",
        decidedBy: actorId
      })
    });

    // Directly diverge the legacy flat columns out-of-band (bypassing the repository entirely) —
    // proves the read path is no longer sourcing from these columns as primary, since a real
    // dual-write would never leave them out of sync like this.
    await repositoryPool.query(
      `update assessment_items
       set answer_text = 'STALE-LEGACY-ANSWER',
           applicability = '{"applicable":true,"rationale":"STALE-LEGACY-RATIONALE","approvedBy":"someone-else","approvedAt":"2020-01-01T00:00:00.000Z"}'::jsonb
       where tenant_id = $1 and id = $2`,
      [cutoverTenantId, itemId]
    );

    const reloadedItem = await repository.findItem(cutoverTenantId, persisted.id, itemId);
    expect(reloadedItem?.answerText).toBe("NORMALIZED ANSWER");
    expect(reloadedItem?.evidenceIds).toEqual([evidenceId]);
    expect(reloadedItem?.applicability?.applicable).toBe(false);
    expect(reloadedItem?.applicability?.rationale).toBe("NORMALIZED RATIONALE");
    expect(reloadedItem?.applicability?.approvedBy).toBe(actorId);

    const reloadedAssessment = await repository.findAssessment(cutoverTenantId, persisted.id);
    expect(reloadedAssessment?.items[0].answerText).toBe("NORMALIZED ANSWER");
    expect(reloadedAssessment?.items[0].applicability?.rationale).toBe("NORMALIZED RATIONALE");
  }, 30_000);

  it("falls back to the legacy flat column when no normalized record exists yet", async () => {
    const repository = new PostgresAssessmentRepository(repositoryDb);
    const fallbackTenantId = randomUUID();
    const assessment = createAssessment({
      tenantId: fallbackTenantId,
      scopeName: "G-01 Cutover fallback proof",
      createdBy: actorId,
      ownerId,
      controls: [await approvedControlRefForTenant({ pool: repositoryPool, tenantId: fallbackTenantId, actorId })]
    });
    const persisted = await repository.createAssessment({
      assessment,
      periodStart: new Date("2026-01-01T00:00:00.000Z"),
      periodEnd: new Date("2026-12-31T00:00:00.000Z")
    });
    const itemId = persisted.items[0].id;

    // No answer_revisions/applicability_decisions rows exist for this item — only the flat
    // columns, written directly (simulating a write path that hasn't run through the service's
    // dual-write, e.g. a future migration script). The read path must still surface this data.
    await repositoryPool.query(
      `update assessment_items
       set answer_text = 'FLAT-COLUMN-ONLY-ANSWER',
           applicability = '{"applicable":true,"rationale":"FLAT-COLUMN-ONLY-RATIONALE","approvedBy":"someone","approvedAt":"2026-01-01T00:00:00.000Z"}'::jsonb
       where tenant_id = $1 and id = $2`,
      [fallbackTenantId, itemId]
    );

    const reloadedItem = await repository.findItem(fallbackTenantId, persisted.id, itemId);
    expect(reloadedItem?.answerText).toBe("FLAT-COLUMN-ONLY-ANSWER");
    expect(reloadedItem?.applicability?.rationale).toBe("FLAT-COLUMN-ONLY-RATIONALE");
  }, 30_000);
});

describe("A2 Assessment HTTP exposure", () => {
  it("rejects missing context, missing scopes, and missing idempotency keys", async () => {
    const unauthenticated = await fetch(`${baseUrl}/v1/assessments`);
    expect(unauthenticated.status).toBe(401);

    const unauthorized = await fetch(`${baseUrl}/v1/assessments`, {
      headers: headers("framework-content:read")
    });
    expect(unauthorized.status).toBe(403);

    const missingIdempotency = await fetch(`${baseUrl}/v1/assessments`, {
      method: "POST",
      headers: headers("assessment:write"),
      body: JSON.stringify(await createBody())
    });
    expect(missingIdempotency.status).toBe(400);
  }, 30_000);

  it("runs the assessment lifecycle through HTTP and deduplicates mutation replays", async () => {
    const createKey = `a2-create-${tenantId}`;
    const body = await createBody();
    const firstCreate = await postJson("/v1/assessments", body, "assessment:write", createKey);
    const secondCreate = await postJson("/v1/assessments", body, "assessment:write", createKey);
    expect(firstCreate.status).toBe(201);
    expect(secondCreate.status).toBe(201);

    const created = (await firstCreate.json()) as AssessmentResponse;
    const replayed = (await secondCreate.json()) as AssessmentResponse;
    expect(replayed.id).toBe(created.id);
    expect(created.items).toHaveLength(1);

    // G-10 cutover note: appPool now connects as the RLS-scoped app_runtime
    // role, so this test-assertion helper query uses the owner-role
    // repositoryPool instead of appPool.
    const outboxCount = await repositoryPool.query(
      `select count(*)::int as count from outbox_events where tenant_id = $1 and idempotency_key = $2`,
      [tenantId, createKey]
    );
    expect(outboxCount.rows[0].count).toBe(1);

    const itemId = created.items[0].id;
    const applicable = await postJson(
      `/v1/assessments/${created.id}/items/${itemId}/applicability`,
      { applicable: true, rationale: "SOC 2 access control applies." },
      "assessment:write",
      "a2-applicability"
    );
    expect(((await applicable.json()) as AssessmentResponse).status).toBe("in_progress");

    const answered = await postJson(
      `/v1/assessments/${created.id}/items/${itemId}/answers`,
      { answerText: "Quarterly access review completed.", evidenceIds: [evidenceId] },
      "assessment:write",
      "a2-answer"
    );
    expect(((await answered.json()) as AssessmentResponse).status).toBe("submitted");

    const reviewed = await postJson(
      `/v1/assessments/${created.id}/items/${itemId}/reviews`,
      { approved: true },
      "assessment:review",
      "a2-review"
    );
    expect(((await reviewed.json()) as AssessmentResponse).status).toBe("approved");

    const reopened = await postJson(
      `/v1/assessments/${created.id}/items/${itemId}/reopen`,
      { reason: "Reviewer requested updated evidence reference." },
      "assessment:review",
      "a2-reopen"
    );
    expect(((await reopened.json()) as AssessmentResponse).status).toBe("needs_changes");

    await postJson(
      `/v1/assessments/${created.id}/items/${itemId}/answers`,
      { answerText: "Updated access review evidence attached.", evidenceIds: [evidenceId] },
      "assessment:write",
      "a2-answer-2"
    );
    await postJson(
      `/v1/assessments/${created.id}/items/${itemId}/reviews`,
      { approved: true },
      "assessment:review",
      "a2-review-2"
    );
    const closed = await postJson(`/v1/assessments/${created.id}/close`, {}, "assessment:review", "a2-close");
    expect(((await closed.json()) as AssessmentResponse).status).toBe("closed");

    const listed = await getJson<AssessmentResponse[]>("/v1/assessments", "assessment:read");
    expect(listed.some((assessment) => assessment.id === created.id)).toBe(true);
    const items = await getJson<AssessmentItemResponse[]>(`/v1/assessments/${created.id}/items`, "assessment:read");
    expect(items[0].status).toBe("approved");
  }, 120_000);

  it("edits draft assessments and rejects edits once work has started", async () => {
    const createKey = `a2-edit-create-${randomUUID()}`;
    const created = (await (await postJson(
      "/v1/assessments",
      await createBody(),
      "assessment:write",
      createKey
    )).json()) as AssessmentResponse;

    const updated = await patchJson(
      `/v1/assessments/${created.id}`,
      {
        ...(await createBody()),
        scopeName: "A2 edited draft",
        periodStart: "2026-02-01",
        periodEnd: "2026-11-30"
      },
      "assessment:write",
      `a2-edit-draft-${randomUUID()}`
    );
    expect(updated.status).toBe(200);
    const updatedBody = (await updated.json()) as AssessmentResponse;
    expect(updatedBody.id).toBe(created.id);
    expect(updatedBody.scopeName).toBe("A2 edited draft");
    expect(updatedBody.status).toBe("not_started");
    expect(updatedBody.items).toHaveLength(1);

    const itemId = updatedBody.items[0].id;
    await postJson(
      `/v1/assessments/${created.id}/items/${itemId}/applicability`,
      { applicable: true, rationale: "Editing should lock after work starts." },
      "assessment:write",
      `a2-edit-start-${randomUUID()}`
    );

    const rejected = await patchJson(
      `/v1/assessments/${created.id}`,
      {
        ...(await createBody()),
        scopeName: "Should not save"
      },
      "assessment:write",
      `a2-edit-reject-${randomUUID()}`
    );
    expect(rejected.status).toBe(400);
  }, 120_000);
});

describe("G-01 Final Completion Pass: answer/applicability/review history, sign-offs, test procedures", () => {
  it("exposes full history for answers/applicability/reviews, sign-offs on close, and a manual test-procedure/result workflow", async () => {
    const reviewerId = randomUUID();
    const createKey = `g01-history-create-${randomUUID()}`;
    const created = (await (await postJson("/v1/assessments", await createBody(), "assessment:write", createKey)).json()) as AssessmentResponse;
    const itemId = created.items[0].id;

    const applicabilityResponse = await postJson(
      `/v1/assessments/${created.id}/items/${itemId}/applicability`,
      { applicable: true, rationale: "In scope for the G-01 history proof." },
      "assessment:write",
      `g01-history-applicability-${randomUUID()}`
    );
    // NestJS defaults a bare @Post() handler to 201, and these routes never override that with
    // @HttpCode(200) — matches every other mutation on this controller (none of them are 200
    // despite the OpenAPI doc's "200" description; a pre-existing doc/reality nuance, not
    // something this pass changes).
    expect(applicabilityResponse.status).toBe(201);
    // applicable=true requires at least one evidence reference (domain rule in submitAnswer).
    const answer1Response = await postJson(
      `/v1/assessments/${created.id}/items/${itemId}/answers`,
      { answerText: "First answer revision.", evidenceIds: [evidenceId] },
      "assessment:write",
      `g01-history-answer-1-${randomUUID()}`
    );
    expect(answer1Response.status).toBe(201);
    const answer2Response = await postJson(
      `/v1/assessments/${created.id}/items/${itemId}/answers`,
      { answerText: "Second answer revision, supersedes the first.", evidenceIds: [evidenceId] },
      "assessment:write",
      `g01-history-answer-2-${randomUUID()}`
    );
    expect(answer2Response.status).toBe(201);

    const answerHistory = await getJson<Array<{ revision: number; responseJson: { answerText: string } }>>(
      `/v1/assessments/${created.id}/items/${itemId}/answers/history`,
      "assessment:read"
    );
    expect(answerHistory).toHaveLength(2);
    expect(answerHistory[0].revision).toBe(2);
    expect(answerHistory[0].responseJson.answerText).toBe("Second answer revision, supersedes the first.");
    expect(answerHistory[1].revision).toBe(1);

    const applicabilityHistory = await getJson<Array<{ decision: string; rationale: string }>>(
      `/v1/assessments/${created.id}/items/${itemId}/applicability/history`,
      "assessment:read"
    );
    expect(applicabilityHistory).toHaveLength(1);
    expect(applicabilityHistory[0].decision).toBe("applicable");
    expect(applicabilityHistory[0].rationale).toBe("In scope for the G-01 history proof.");

    // Review must come from a distinct principal (reviewer != submitter, enforced by the domain
    // and the review_decisions DB trigger) for a real review_decisions row to be recorded.
    const reviewResponse = await fetch(`${baseUrl}/v1/assessments/${created.id}/items/${itemId}/reviews`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": tenantId,
        "x-user-id": reviewerId,
        "x-user-clearance": "restricted",
        "x-user-scopes": "assessment:review",
        "Idempotency-Key": `g01-history-review-${randomUUID()}`
      },
      body: JSON.stringify({ approved: true, reason: "Second revision is sufficient." })
    });
    expect(reviewResponse.status).toBe(201);

    const reviewHistory = await getJson<Array<{ reviewerId: string; decision: string; rationale: string | null }>>(
      `/v1/assessments/${created.id}/items/${itemId}/reviews/history`,
      "assessment:read"
    );
    expect(reviewHistory).toHaveLength(1);
    expect(reviewHistory[0].reviewerId).toBe(reviewerId);
    expect(reviewHistory[0].decision).toBe("approved");

    // Test procedures/results: define a manual procedure for the item's control, then record a
    // result against it — both entirely new capabilities this pass wires up end to end.
    const procedureResponse = await postJson(
      `/v1/assessments/${created.id}/items/${itemId}/test-procedures`,
      {
        procedureKey: `tp-${randomUUID()}`,
        method: "Inspect the access review log for the assessment period.",
        expectedResult: "Every access grant has a documented, dated approver."
      },
      "assessment:write",
      `g01-history-procedure-${randomUUID()}`
    );
    expect(procedureResponse.status).toBe(201);
    const procedure = (await procedureResponse.json()) as { id: string; status: string };
    expect(procedure.status).toBe("active");

    const procedures = await getJson<Array<{ id: string }>>(
      `/v1/assessments/${created.id}/items/${itemId}/test-procedures`,
      "assessment:read"
    );
    expect(procedures.some((entry) => entry.id === procedure.id)).toBe(true);

    const resultResponse = await postJson(
      `/v1/assessments/${created.id}/items/${itemId}/test-results`,
      { testProcedureId: procedure.id, result: "pass", population: "All Q2 access grants (n=42)" },
      "assessment:write",
      `g01-history-result-${randomUUID()}`
    );
    expect(resultResponse.status).toBe(201);
    const testResult = (await resultResponse.json()) as { id: string; result: string };
    expect(testResult.result).toBe("pass");

    const results = await getJson<Array<{ id: string; result: string }>>(
      `/v1/assessments/${created.id}/items/${itemId}/test-results`,
      "assessment:read"
    );
    expect(results.some((entry) => entry.id === testResult.id && entry.result === "pass")).toBe(true);

    // Sign-offs: empty before close, one real 'final' sign-off after — proves close() really
    // persists a durable record, not just an assessments.status flag flip.
    const signoffsBeforeClose = await getJson<unknown[]>(`/v1/assessments/${created.id}/signoffs`, "assessment:read");
    expect(signoffsBeforeClose).toHaveLength(0);

    const closeResponse = await postJson(`/v1/assessments/${created.id}/close`, {}, "assessment:review", `g01-history-close-${randomUUID()}`);
    expect(closeResponse.status).toBe(201);

    const signoffsAfterClose = await getJson<Array<{ scopeType: string; decision: string; signerId: string }>>(
      `/v1/assessments/${created.id}/signoffs`,
      "assessment:read"
    );
    expect(signoffsAfterClose).toHaveLength(1);
    expect(signoffsAfterClose[0].scopeType).toBe("final");
    expect(signoffsAfterClose[0].decision).toBe("approved");
  }, 60_000);
});

interface AssessmentItemResponse {
  id: string;
  status: string;
}

interface AssessmentResponse {
  id: string;
  scopeName: string;
  status: string;
  items: AssessmentItemResponse[];
}

async function createBody() {
  return {
    scopeName: "A2 readiness",
    ownerId,
    periodStart: "2026-01-01",
    periodEnd: "2026-12-31",
    controls: [await approvedControlSelectionForTenant({ pool: repositoryPool, tenantId, actorId })]
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

async function postJson(route: string, body: unknown, scopes: string, idempotencyKey: string): Promise<Response> {
  return fetch(`${baseUrl}${route}`, {
    method: "POST",
    headers: {
      ...headers(scopes),
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify(body)
  });
}

async function patchJson(route: string, body: unknown, scopes: string, idempotencyKey: string): Promise<Response> {
  return fetch(`${baseUrl}${route}`, {
    method: "PATCH",
    headers: {
      ...headers(scopes),
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify(body)
  });
}

async function getJson<T>(route: string, scopes: string): Promise<T> {
  const response = await fetch(`${baseUrl}${route}`, { headers: headers(scopes) });
  expect(response.status).toBe(200);
  return (await response.json()) as T;
}
