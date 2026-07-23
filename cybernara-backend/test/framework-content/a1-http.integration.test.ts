import "dotenv/config";
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { CANONICAL_CONTENT_TENANT_ID } from "../../src/modules/framework-content/public.js";
import { ADMIN_DATABASE_POOL } from "../../src/platform/database/tokens.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";

// G-05 fix: this test publishes the entire real framework/harmonization corpus (13 packs,
// 3642 requirements, 4522 mappings, 820 rejected records) through the real HTTP surface. It must
// target the canonical shared-catalog tenant, not a fresh randomUUID() per run - every ingestion
// conflict key in postgres-framework-content.repository.ts is scoped by tenant_id, so publishing
// under a fresh tenant every run created a brand new full copy every time `npm run test` ran,
// which is exactly what filled the live Supabase project's free-tier storage (see
// docs/schema-remediation-report.md's G-05 incident write-up). Publishing repeatedly to the
// canonical tenant is safe and produces zero growth: every insert is `on conflict ... do update`.
const tenantId = CANONICAL_CONTENT_TENANT_ID;
const userId = randomUUID();
const idempotencyKey = `a1-http-${tenantId}`;

interface PublishResponse {
  published: {
    contentPackCount: number;
    requirementCount: number;
    harmonizedControlCount: number;
    mappingCount: number;
    rejectedRecordCount: number;
  };
  outboxEventId: string;
}

interface IdentifiedRecord {
  id: string;
  tenantId: string;
}

let app: INestApplication;
let baseUrl: string;
let pool: pg.Pool;

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
  // G-10 cutover note: DATABASE_POOL is now the RLS-scoped app_runtime pool;
  // this test's own verification query has no tenant context set, so it uses
  // the owner-role ADMIN_DATABASE_POOL instead (see tokens.ts).
  pool = app.get<pg.Pool>(ADMIN_DATABASE_POOL);
  const address = app.getHttpServer().address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
}, 120_000);

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe("A1 FrameworkContent/Harmonization HTTP exposure", () => {
  it("rejects unauthenticated and unauthorized tenant-scoped reads", async () => {
    const unauthenticated = await fetch(`${baseUrl}/v1/framework-content/content-packs`);
    expect(unauthenticated.status).toBe(401);

    const unauthorized = await fetch(`${baseUrl}/v1/harmonization/controls`, {
      headers: requestHeaders("framework-content:read")
    });
    expect(unauthorized.status).toBe(403);
  });

  it("validates idempotency headers and exposes a full A1 publish/read flow", async () => {
    const missingIdempotency = await fetch(`${baseUrl}/v1/framework-content/ingestion-runs`, {
      method: "POST",
      headers: requestHeaders("framework-content:write"),
      body: JSON.stringify({})
    });
    expect(missingIdempotency.status).toBe(400);

    const firstPublish = await postIngestion();
    const secondPublish = await postIngestion();

    if (firstPublish.status !== 201) {
      throw new Error(`first publish failed: ${firstPublish.status} ${await firstPublish.text()}`);
    }
    if (secondPublish.status !== 201) {
      throw new Error(`second publish failed: ${secondPublish.status} ${await secondPublish.text()}`);
    }
    const firstBody = (await firstPublish.json()) as PublishResponse;
    const secondBody = (await secondPublish.json()) as PublishResponse;
    expect(firstBody.published).toMatchObject({
      contentPackCount: 13,
      requirementCount: 3642,
      harmonizedControlCount: 200,
      mappingCount: 4522,
      rejectedRecordCount: 820
    });
    expect(secondBody.outboxEventId).toBe(firstBody.outboxEventId);

    const outboxCount = await pool.query(
      `select count(*)::int as count from outbox_events where tenant_id = $1 and idempotency_key = $2`,
      [tenantId, idempotencyKey]
    );
    expect(outboxCount.rows[0].count).toBe(1);

    const packs = await getJson<IdentifiedRecord[]>("/v1/framework-content/content-packs", "framework-content:read");
    expect(packs.length).toBeGreaterThan(0);

    const requirements = await getJson<unknown[]>(
      `/v1/framework-content/content-packs/${packs[0].id}/requirements`,
      "framework-content:read"
    );
    expect(requirements.length).toBeGreaterThan(0);

    const rejected = await getJson<unknown[]>("/v1/framework-content/rejected-records", "framework-content:read");
    expect(rejected.length).toBeGreaterThan(0);

    const controls = await getJson<unknown[]>("/v1/harmonization/controls", "harmonization:read");
    expect(controls.length).toBeGreaterThan(0);

    const mappings = await getJson<unknown[]>("/v1/harmonization/frameworks/CCPA/mappings", "harmonization:read");
    expect(mappings.length).toBeGreaterThan(0);

    const uniqueControls = await getJson(
      "/v1/harmonization/frameworks/CCPA/unique-controls",
      "harmonization:read"
    );
    expect(Array.isArray(uniqueControls)).toBe(true);

    const customerTenantId = randomUUID();
    const customerPacks = await getJson<IdentifiedRecord[]>(
      "/v1/framework-content/content-packs?limit=25",
      "framework-content:read",
      customerTenantId
    );
    expect(customerPacks.length).toBeGreaterThan(0);
    expect(customerPacks.every((pack) => pack.tenantId === CANONICAL_CONTENT_TENANT_ID)).toBe(true);

    const customerRequirements = await getJson<IdentifiedRecord[]>(
      "/v1/framework-content/requirements?frameworkKey=SOC2&limit=25",
      "framework-content:read",
      customerTenantId
    );
    expect(customerRequirements.length).toBeGreaterThan(0);
    expect(customerRequirements.every((requirement) => requirement.tenantId === CANONICAL_CONTENT_TENANT_ID)).toBe(true);

    const customerControls = await getJson<IdentifiedRecord[]>(
      "/v1/harmonization/controls?limit=25",
      "harmonization:read",
      customerTenantId
    );
    expect(customerControls.length).toBeGreaterThan(0);
    expect(customerControls.every((control) => control.tenantId === CANONICAL_CONTENT_TENANT_ID)).toBe(true);

    const customerMappings = await getJson<IdentifiedRecord[]>(
      "/v1/harmonization/frameworks/SOC2/mappings?limit=25",
      "harmonization:read",
      customerTenantId
    );
    expect(customerMappings.length).toBeGreaterThan(0);
    expect(customerMappings.every((mapping) => mapping.tenantId === CANONICAL_CONTENT_TENANT_ID)).toBe(true);
  }, 120_000);
});

function requestHeaders(scopes: string, requestTenantId = tenantId): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-tenant-id": requestTenantId,
    "x-user-id": userId,
    "x-user-clearance": "restricted",
    "x-user-scopes": scopes
  };
}

async function postIngestion(): Promise<Response> {
  return fetch(`${baseUrl}/v1/framework-content/ingestion-runs`, {
    method: "POST",
    headers: {
      ...requestHeaders("framework-content:write"),
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify({})
  });
}

async function getJson<T>(route: string, scopes: string, requestTenantId = tenantId): Promise<T> {
  const response = await fetch(`${baseUrl}${route}`, {
    headers: requestHeaders(scopes, requestTenantId)
  });
  expect(response.status).toBe(200);
  return (await response.json()) as T;
}
