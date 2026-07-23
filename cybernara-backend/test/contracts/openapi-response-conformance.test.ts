import "dotenv/config";
import "reflect-metadata";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import AjvModule from "ajv";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("SUPABASE_DB_URL is not set; OpenAPI response conformance tests require a real database.");
}

type OpenApiOperation = {
  responses: Record<string, { content?: Record<string, { schema?: Record<string, unknown> }> }>;
};

type OpenApiSpec = {
  paths: Record<string, Record<string, OpenApiOperation>>;
  components?: Record<string, unknown>;
};

type JsonValidator = ((body: unknown) => boolean) & { errors?: unknown };

const actorId = randomUUID();
const tenantId = randomUUID();
let app: INestApplication;
let baseUrl: string;
let spec: OpenApiSpec;
let ajv: { compile(schema: unknown): JsonValidator };

const repositoryPool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });

beforeAll(async () => {
  spec = JSON.parse(await readFile("openapi/cybernara.openapi.json", "utf8")) as OpenApiSpec;
  const AjvCtor = AjvModule as unknown as new (options: Record<string, unknown>) => {
    compile(schema: unknown): JsonValidator;
  };
  ajv = new AjvCtor({ allErrors: true, strict: false, validateFormats: false });
  app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new ProblemDetailsFilter());
  await app.listen(0);
  const address = app.getHttpServer().address() as AddressInfo;
  baseUrl = `http://localhost:${address.port}`;
});

afterAll(async () => {
  await app.close();
  await repositoryPool.end();
});

describe("OpenAPI response conformance", () => {
  it("validates live /v1/tasks and framework-update responses against the OpenAPI schemas", async () => {
    await seedUniversalTask();
    const tasksResponse = await fetch(`${baseUrl}/v1/tasks`, { headers: requestHeaders("universal_task:read") });
    const tasksBody = await expectJson(tasksResponse, 200);
    expectMatchesOpenApi("/v1/tasks", "get", "200", tasksBody);

    const fixture = await seedFrameworkUpdateFixture();
    const diffResponse = await fetch(`${baseUrl}/v1/frameworks/diffs`, {
      method: "POST",
      headers: requestHeaders("framework_diff:write", { "content-type": "application/json" }),
      body: JSON.stringify({
        frameworkKey: fixture.frameworkKey,
        fromVersionKey: fixture.fromVersionKey,
        toVersionKey: fixture.toVersionKey
      })
    });
    const diffBody = await expectJson(diffResponse, 201);
    expectMatchesOpenApi("/v1/frameworks/diffs", "post", "201", diffBody);

    const diffId = readId(diffBody);
    const diffItemsResponse = await fetch(`${baseUrl}/v1/frameworks/diffs/${diffId}/items`, {
      headers: requestHeaders("framework_diff:read")
    });
    const diffItemsBody = await expectJson(diffItemsResponse, 200);
    expectMatchesOpenApi("/v1/frameworks/diffs/{id}/items", "get", "200", diffItemsBody);

    const impactsResponse = await fetch(`${baseUrl}/v1/frameworks/updates/impacts`, {
      headers: requestHeaders("framework_update_impact:read")
    });
    const impactsBody = await expectJson(impactsResponse, 200);
    expectMatchesOpenApi("/v1/frameworks/updates/impacts", "get", "200", impactsBody);
  }, 30_000);
});

function requestHeaders(scope: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    "x-tenant-id": tenantId,
    "x-user-id": actorId,
    "x-user-roles": "compliance_manager",
    "x-user-clearance": "restricted",
    "x-user-scopes": scope,
    ...extra
  };
}

async function expectJson(response: Response, expectedStatus: number): Promise<unknown> {
  const body = await response.json();
  expect(response.status, JSON.stringify(body)).toBe(expectedStatus);
  return body;
}

function expectMatchesOpenApi(path: string, method: string, status: string, body: unknown): void {
  const schema = spec.paths[path]?.[method]?.responses[status]?.content?.["application/json"]?.schema;
  if (!schema) {
    throw new Error(`Missing OpenAPI response schema for ${method.toUpperCase()} ${path} ${status}`);
  }
  const validate = ajv.compile({ ...schema, components: spec.components });
  expect(validate(body), JSON.stringify(validate.errors, null, 2)).toBe(true);
}

function readId(value: unknown): string {
  if (!value || typeof value !== "object" || typeof (value as { id?: unknown }).id !== "string") {
    throw new Error("Expected response object with string id.");
  }
  return (value as { id: string }).id;
}

async function seedUniversalTask(): Promise<void> {
  const taskId = randomUUID();
  await repositoryPool.query(
    `insert into universal_tasks (
       id, tenant_id, target_type, target_id, title, description, priority, status, due_at, owner_id, created_by, updated_by
     )
     values ($1, $2, 'remediation_task', $1, 'Contract task', 'OpenAPI contract fixture', 'medium', 'pending', $3, $4, $4, $4)`,
    [taskId, tenantId, "2026-12-31T00:00:00.000Z", actorId]
  );
}

async function seedFrameworkUpdateFixture(): Promise<{
  frameworkKey: string;
  fromVersionKey: string;
  toVersionKey: string;
}> {
  const frameworkKey = `FW-${randomUUID().slice(0, 8)}`;
  const framework = await repositoryPool.query<{ id: string }>(
    `insert into frameworks (tenant_id, framework_key, name, created_by, updated_by)
     values ($1, $2, $3, $4, $4) returning id`,
    [tenantId, frameworkKey, "Contract Framework", actorId]
  );
  const fromVersion = await repositoryPool.query<{ id: string }>(
    `insert into framework_versions (tenant_id, framework_id, version_key, status, created_by, updated_by)
     values ($1, $2, 'v1', 'published', $3, $3) returning id`,
    [tenantId, framework.rows[0].id, actorId]
  );
  const toVersion = await repositoryPool.query<{ id: string }>(
    `insert into framework_versions (tenant_id, framework_id, version_key, status, created_by, updated_by)
     values ($1, $2, 'v2', 'staged', $3, $3) returning id`,
    [tenantId, framework.rows[0].id, actorId]
  );
  const fromSet = await repositoryPool.query<{ id: string }>(
    `insert into control_sets (tenant_id, framework_version_id, set_key, name, created_by, updated_by)
     values ($1, $2, 'set1', 'Set 1', $3, $3) returning id`,
    [tenantId, fromVersion.rows[0].id, actorId]
  );
  const toSet = await repositoryPool.query<{ id: string }>(
    `insert into control_sets (tenant_id, framework_version_id, set_key, name, created_by, updated_by)
     values ($1, $2, 'set1', 'Set 1', $3, $3) returning id`,
    [tenantId, toVersion.rows[0].id, actorId]
  );
  await repositoryPool.query(
    `insert into controls (tenant_id, control_set_id, control_key, title, requirement_text, created_by, updated_by)
     values ($1, $2, 'C1', 'Control 1', 'Req A', $3, $3)`,
    [tenantId, fromSet.rows[0].id, actorId]
  );
  await repositoryPool.query(
    `insert into controls (tenant_id, control_set_id, control_key, title, requirement_text, created_by, updated_by)
     values ($1, $2, 'C1', 'Control 1', 'Req A modified', $3, $3)`,
    [tenantId, toSet.rows[0].id, actorId]
  );
  const assessment = await repositoryPool.query<{ id: string }>(
    `insert into assessments (tenant_id, scope_name, control_snapshot_version, period_start, period_end, status, created_by, updated_by)
     values ($1, $2, 'v1', '2026-01-01', '2026-12-31', 'in_progress', $3, $3) returning id`,
    [tenantId, `contract-assessment-${randomUUID()}`, actorId]
  );
  await repositoryPool.query(
    `insert into control_instances (
       tenant_id, assessment_id, control_id, framework_key, framework_version, mapping_version, owner_id, created_by, updated_by
     )
     values ($1, $2, 'C1', $3, 'v1', 'm1', $4, $4, $4)`,
    [tenantId, assessment.rows[0].id, frameworkKey, actorId]
  );

  return { frameworkKey, fromVersionKey: "v1", toVersionKey: "v2" };
}
