import "dotenv/config";
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { CANONICAL_CONTENT_TENANT_ID } from "../../src/modules/framework-content/public.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";

describe("Platform question repository API", () => {
  let app: INestApplication;
  let baseUrl: string;
  let adminPool: pg.Pool;

  const operatorUserId = randomUUID();
  const operatorEmail = `question-repo-operator-${Date.now()}@example.com`;
  const createdQuestionSetIds: string[] = [];

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalFilters(new ProblemDetailsFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidUnknownValues: true, transform: true }));
    await app.listen(0);
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;

    adminPool = new pg.Pool({ connectionString: requiredEnv("SUPABASE_DB_URL") });
    await adminPool.query(
      `
        insert into platform_operators (
          supabase_user_id, email, platform_role, status, classification,
          created_by, created_at, updated_by, updated_at
        )
        values ($1, $2, 'super_admin', 'active', 'restricted', $1, now(), $1, now())
      `,
      [operatorUserId, operatorEmail]
    );
  }, 120_000);

  afterAll(async () => {
    for (const questionSetId of createdQuestionSetIds) {
      await adminPool.query("delete from question_versions where question_set_id = $1", [questionSetId]).catch(() => undefined);
      await adminPool.query("delete from question_sets where id = $1", [questionSetId]).catch(() => undefined);
    }
    await adminPool.query("delete from platform_operators where supabase_user_id = $1", [operatorUserId]).catch(() => undefined);
    await adminPool.end().catch(() => undefined);
    await app.close();
  });

  it("rejects tenant-scoped admins from global repository endpoints", async () => {
    const tenantAdminHeaders = {
      "x-tenant-id": randomUUID(),
      "x-user-id": randomUUID(),
      "x-user-clearance": "restricted",
      "x-user-scopes": "framework-content:read,framework-content:write,question_version:read,question_version:write",
      "x-user-roles": "platform_admin",
      "x-platform-role": "super_admin"
    };

    const list = await fetch(`${baseUrl}/v1/platform/question-repository/questions`, { headers: tenantAdminHeaders });
    const generate = await fetch(`${baseUrl}/v1/platform/question-repository/baseline-generation`, {
      method: "POST",
      headers: { ...tenantAdminHeaders, "content-type": "application/json" },
      body: JSON.stringify({ limit: 1 })
    });

    await expectStatus(list, 403);
    await expectStatus(generate, 403);
  }, 30_000);

  it("allows platform super-admin lifecycle actions and idempotent baseline generation", async () => {
    const list = await fetch(`${baseUrl}/v1/platform/question-repository/questions?limit=5&offset=0`, {
      headers: platformHeaders()
    });
    await expectStatus(list, 200);

    const controls = await fetch(`${baseUrl}/v1/platform/question-repository/controls?limit=5&offset=0`, {
      headers: platformHeaders()
    });
    await expectStatus(controls, 200);
    const controlBody = (await controls.json()) as Array<{
      harmonizedControlId: string;
      evidenceExpectationIds: string[];
      frameworkKeys: string[];
      sourceControls: unknown[];
    }>;
    expect(controlBody.length).toBeGreaterThan(0);
    expect(controlBody[0].harmonizedControlId).toMatch(/^HARM-/);
    expect(controlBody[0].evidenceExpectationIds.length).toBeGreaterThan(0);
    expect(controlBody[0].frameworkKeys.length).toBeGreaterThan(0);
    expect(controlBody[0].sourceControls.length).toBeGreaterThan(0);

    const beforeBaselineCount = await curatedBaselineCount();
    const firstBaseline = await fetch(`${baseUrl}/v1/platform/question-repository/baseline-generation`, {
      method: "POST",
      headers: { ...platformHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ limit: 5 })
    });
    await expectStatus(firstBaseline, 201);
    const firstResult = (await firstBaseline.json()) as { examined: number; created: number };
    expect(firstResult.examined).toBeGreaterThan(0);

    const afterFirstBaselineCount = await curatedBaselineCount();
    const secondBaseline = await fetch(`${baseUrl}/v1/platform/question-repository/baseline-generation`, {
      method: "POST",
      headers: { ...platformHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ limit: 5 })
    });
    await expectStatus(secondBaseline, 201);
    const secondResult = (await secondBaseline.json()) as { created: number };
    expect(secondResult.created).toBe(0);
    expect(await curatedBaselineCount()).toBe(afterFirstBaselineCount);
    expect(afterFirstBaselineCount).toBeGreaterThanOrEqual(beforeBaselineCount);

    const controlId = `HARM-API-${randomUUID()}`;
    const draft = await fetch(`${baseUrl}/v1/platform/question-repository/questions`, {
      method: "POST",
      headers: { ...platformHeaders(), "content-type": "application/json" },
      body: JSON.stringify({
        harmonizedControlId: controlId,
        questionText: "How does the organization preserve governed question repository lifecycle evidence?",
        responseType: "text",
        evidenceExpectationIds: ["EV-QUESTION-REPOSITORY-LIFECYCLE"],
        citations: [{ sourceId: controlId, sourceType: "harmonized_control" }],
        confidence: 0.74
      })
    });
    await expectStatus(draft, 201);
    const draftBody = (await draft.json()) as { id: string; questionSetId: string; status: string };
    createdQuestionSetIds.push(draftBody.questionSetId);
    expect(draftBody.status).toBe("draft");

    const approved = await fetch(`${baseUrl}/v1/platform/question-repository/questions/${draftBody.id}/approve`, {
      method: "POST",
      headers: platformHeaders()
    });
    await expectStatus(approved, 201);
    expect(((await approved.json()) as { status: string }).status).toBe("approved");

    const revision = await fetch(`${baseUrl}/v1/platform/question-repository/questions/${draftBody.id}/revisions`, {
      method: "POST",
      headers: { ...platformHeaders(), "content-type": "application/json" },
      body: JSON.stringify({
        harmonizedControlId: controlId,
        questionText: "How does the organization preserve governed question repository lifecycle evidence after revision?",
        responseType: "text",
        evidenceExpectationIds: ["EV-QUESTION-REPOSITORY-LIFECYCLE"],
        citations: [{ sourceId: controlId, sourceType: "harmonized_control" }],
        confidence: 1
      })
    });
    await expectStatus(revision, 201);
    const revisionBody = (await revision.json()) as { questionSetId: string; status: string; questionVersion: number };
    expect(revisionBody.questionSetId).toBe(draftBody.questionSetId);
    expect(revisionBody.status).toBe("draft");
    expect(revisionBody.questionVersion).toBeGreaterThan(1);

    const inactive = await updateStatus(draftBody.id, "inactive");
    expect(inactive.status).toBe("inactive");

    const restored = await updateStatus(draftBody.id, "approved");
    expect(restored.status).toBe("approved");
  }, 60_000);

  async function updateStatus(questionVersionId: string, status: "approved" | "inactive") {
    const response = await fetch(`${baseUrl}/v1/platform/question-repository/questions/${questionVersionId}/status`, {
      method: "POST",
      headers: { ...platformHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ status })
    });
    await expectStatus(response, 201);
    return (await response.json()) as { status: string };
  }

  function platformHeaders(): Record<string, string> {
    return {
      "x-user-id": operatorUserId,
      "x-platform-role": "super_admin",
      "x-user-email": operatorEmail
    };
  }

  async function curatedBaselineCount(): Promise<number> {
    const result = await adminPool.query(
      `select count(*)::int as count
       from question_versions
       where tenant_id = $1 and payload_json ->> 'source' = 'curated_baseline'`,
      [CANONICAL_CONTENT_TENANT_ID]
    );
    return Number(result.rows[0].count);
  }
});

async function expectStatus(response: Response, expected: number): Promise<void> {
  const body = await response.clone().text();
  expect(response.status, body).toBe(expected);
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for question repository platform API tests.`);
  }
  return value;
}
