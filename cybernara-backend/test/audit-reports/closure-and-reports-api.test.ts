import "dotenv/config";
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import pg from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { DATABASE_POOL } from "../../src/platform/database/tokens.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";
import { approvedControlSelectionForTenant } from "../helpers/question-repository-fixture.js";

let app: INestApplication;
let baseUrl: string;
let appPool: pg.Pool;
const repositoryPool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
const originalFetch = globalThis.fetch;

beforeAll(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidUnknownValues: true, transform: true }));
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

afterEach(() => {
  globalThis.fetch = originalFetch;
});

/**
 * Fails the test immediately if anything in the audit report generation
 * path ever calls out to OpenAI - report generation is 100% deterministic,
 * no AI key usage at all.
 */
function failOnOpenAiCall(): void {
  globalThis.fetch = (async (url, init) => {
    if (typeof url === "string" && url.includes("api.openai.com")) {
      throw new Error(`Audit report generation must never call OpenAI, but a request was made to ${url}`);
    }
    return originalFetch(url as never, init);
  }) as typeof fetch;
}

async function createAssessment(
  tenantId: string,
  actorId: string,
  scopeName: string
): Promise<{ assessmentId: string; itemId: string }> {
  const created = await postJson(
    tenantId,
    "/v1/assessments",
    {
      scopeName,
      ownerId: actorId,
      periodStart: "2026-01-01",
      periodEnd: "2026-12-31",
      controls: [await approvedControlSelectionForTenant({ pool: repositoryPool, tenantId, actorId })]
    },
    "assessment:write",
    `ar-create-${randomUUID()}`
  );
  expect(created.status).toBe(201);
  const assessment = (await created.json()) as { id: string; items: Array<{ id: string }> };
  return { assessmentId: assessment.id, itemId: assessment.items[0].id };
}

async function createClosedAssessment(tenantId: string, actorId: string): Promise<{ assessmentId: string; itemId: string }> {
  const evidenceId = randomUUID();
  const { assessmentId, itemId } = await createAssessment(tenantId, actorId, `Audit Report Regression ${randomUUID()}`);

  await postJson(
    tenantId,
    `/v1/assessments/${assessmentId}/items/${itemId}/applicability`,
    { applicable: true, rationale: "Applies to this control." },
    "assessment:write",
    `ar-applicability-${randomUUID()}`
  );
  await postJson(
    tenantId,
    `/v1/assessments/${assessmentId}/items/${itemId}/answers`,
    { answerText: "Control operating effectively.", evidenceIds: [evidenceId] },
    "assessment:write",
    `ar-answer-${randomUUID()}`
  );
  await postJson(
    tenantId,
    `/v1/assessments/${assessmentId}/items/${itemId}/reviews`,
    { approved: true },
    "assessment:review",
    `ar-review-${randomUUID()}`
  );
  const closed = await postJson(tenantId, `/v1/assessments/${assessmentId}/close`, {}, "assessment:review", `ar-close-${randomUUID()}`);
  expect(closed.status).toBe(201);
  return { assessmentId, itemId };
}

describe("Closure snapshot capture (regression-safe)", () => {
  it("closing an assessment still creates exactly one closure snapshot", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const { assessmentId } = await createClosedAssessment(tenantId, actorId);

    const snapshots = await repositoryPool.query(
      `select count(*)::int as count from assessment_snapshots where tenant_id = $1 and assessment_id = $2 and snapshot_type = 'closure'`,
      [tenantId, assessmentId]
    );
    expect(snapshots.rows[0].count).toBe(1);
  }, 120_000);
});

describe("Per-assessment audit report generation (no AI, fetches everything for that assessment live)", () => {
  it("a non-closed assessment does not appear in /reports, and rejects report generation", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const { assessmentId } = await createAssessment(tenantId, actorId, `Audit Report Not Closed ${randomUUID()}`);

    const closedAssessments = await getJson<Array<{ assessmentId: string }>>(tenantId, "/v1/audit-reports/closed-assessments?limit=100&offset=0", "audit_report:read");
    expect(closedAssessments.some((entry) => entry.assessmentId === assessmentId)).toBe(false);

    const generated = await postJson(tenantId, `/v1/audit-reports/assessments/${assessmentId}/generate`, {}, "audit_report:write", `ar-notclosed-${randomUUID()}`);
    expect(generated.status).toBe(403);
  }, 120_000);

  it("generates a report with no OpenAI call anywhere in the path, describing this one assessment", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const { assessmentId } = await createClosedAssessment(tenantId, actorId);

    const closedAssessments = await getJson<Array<{ assessmentId: string; frameworks: string[] }>>(
      tenantId,
      "/v1/audit-reports/closed-assessments?limit=100&offset=0",
      "audit_report:read"
    );
    const entry = closedAssessments.find((row) => row.assessmentId === assessmentId);
    expect(entry).toBeDefined();
    expect(entry?.frameworks).toContain("SOC2");

    failOnOpenAiCall();
    const generated = await postJson(tenantId, `/v1/audit-reports/assessments/${assessmentId}/generate`, {}, "audit_report:write", `ar-gen-${randomUUID()}`);
    expect(generated.status).toBe(201);
    const report = (await generated.json()) as {
      id: string;
      assessmentId: string;
      structuredReportJson: {
        assessment: { id: string; scopeName: string; frameworkKeys: string[] };
        compliance: { frameworks: Array<{ frameworkKey: string; rawPercentage: number | null }> };
      };
    };

    expect(report.assessmentId).toBe(assessmentId);
    expect(report.structuredReportJson.assessment.id).toBe(assessmentId);
    expect(report.structuredReportJson.assessment.frameworkKeys).toContain("SOC2");
    const soc2 = report.structuredReportJson.compliance.frameworks.find((f) => f.frameworkKey === "SOC2");
    expect(soc2).toBeDefined();
    expect(soc2?.rawPercentage).toBe(100);
  }, 120_000);

  it("is persisted, retrievable, listed per assessment, and downloadable as a PDF", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const { assessmentId } = await createClosedAssessment(tenantId, actorId);

    failOnOpenAiCall();
    const generated = await postJson(tenantId, `/v1/audit-reports/assessments/${assessmentId}/generate`, {}, "audit_report:write", `ar-gen-persist-${randomUUID()}`);
    const report = (await generated.json()) as { id: string };

    const reloaded = await getJson<{ id: string }>(tenantId, `/v1/audit-reports/${report.id}`, "audit_report:read");
    expect(reloaded.id).toBe(report.id);

    const listForAssessment = await getJson<Array<{ id: string }>>(tenantId, `/v1/audit-reports/assessments/${assessmentId}`, "audit_report:read");
    expect(listForAssessment.some((entry) => entry.id === report.id)).toBe(true);

    const download = await fetch(`${baseUrl}/v1/audit-reports/${report.id}/download`, { headers: headers(tenantId, "audit_report:read") });
    expect(download.status).toBe(200);
    expect((await download.arrayBuffer()).byteLength).toBeGreaterThan(100);
  }, 120_000);

  it("replays the same report for a repeated idempotency key instead of generating a duplicate", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const { assessmentId } = await createClosedAssessment(tenantId, actorId);
    const idempotencyKey = `ar-replay-${randomUUID()}`;

    failOnOpenAiCall();
    const first = await postJson(tenantId, `/v1/audit-reports/assessments/${assessmentId}/generate`, {}, "audit_report:write", idempotencyKey);
    const second = await postJson(tenantId, `/v1/audit-reports/assessments/${assessmentId}/generate`, {}, "audit_report:write", idempotencyKey);
    const r1 = (await first.json()) as { id: string };
    const r2 = (await second.json()) as { id: string };
    expect(r1.id).toBe(r2.id);
  }, 120_000);

  it("each independent generation is its own report row, never overwriting a prior one", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const { assessmentId } = await createClosedAssessment(tenantId, actorId);

    failOnOpenAiCall();
    const first = await postJson(tenantId, `/v1/audit-reports/assessments/${assessmentId}/generate`, {}, "audit_report:write", `ar-r1-${randomUUID()}`);
    const second = await postJson(tenantId, `/v1/audit-reports/assessments/${assessmentId}/generate`, {}, "audit_report:write", `ar-r2-${randomUUID()}`);
    const r1 = (await first.json()) as { id: string };
    const r2 = (await second.json()) as { id: string };
    expect(r1.id).not.toBe(r2.id);

    const listForAssessment = await getJson<Array<{ id: string }>>(tenantId, `/v1/audit-reports/assessments/${assessmentId}`, "audit_report:read");
    expect(listForAssessment.length).toBeGreaterThanOrEqual(2);
  }, 120_000);
});

describe("Cross-tenant isolation", () => {
  it("a report is not visible to another tenant, and does not appear in the other tenant's assessment list", async () => {
    const tenantId = randomUUID();
    const otherTenantId = randomUUID();
    const actorId = randomUUID();
    const { assessmentId } = await createClosedAssessment(tenantId, actorId);

    failOnOpenAiCall();
    const generated = await postJson(tenantId, `/v1/audit-reports/assessments/${assessmentId}/generate`, {}, "audit_report:write", `ar-xt-${randomUUID()}`);
    const report = (await generated.json()) as { id: string };

    const crossTenantRead = await fetch(`${baseUrl}/v1/audit-reports/${report.id}`, { headers: headers(otherTenantId, "audit_report:read") });
    expect(crossTenantRead.status).toBe(404);

    const crossTenantList = await getJson<Array<{ assessmentId: string }>>(otherTenantId, "/v1/audit-reports/closed-assessments?limit=100&offset=0", "audit_report:read");
    expect(crossTenantList.some((entry) => entry.assessmentId === assessmentId)).toBe(false);
  }, 120_000);
});

function headers(tenantId: string, scopes: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-tenant-id": tenantId,
    "x-user-id": randomUUID(),
    "x-user-clearance": "restricted",
    "x-user-scopes": scopes
  };
}

async function postJson(tenantId: string, route: string, body: unknown, scopes: string, idempotencyKey: string): Promise<Response> {
  return fetch(`${baseUrl}${route}`, {
    method: "POST",
    headers: { ...headers(tenantId, scopes), "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body)
  });
}

async function getJson<T>(tenantId: string, route: string, scopes: string): Promise<T> {
  const response = await fetch(`${baseUrl}${route}`, { headers: headers(tenantId, scopes) });
  expect(response.status).toBe(200);
  return (await response.json()) as T;
}
