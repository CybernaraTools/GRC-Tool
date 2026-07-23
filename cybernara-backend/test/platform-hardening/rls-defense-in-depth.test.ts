import "dotenv/config";
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { PostgresAssessmentRepository } from "../../src/modules/assessment/infrastructure/postgres-assessment.repository.js";
import { TenantScopedDb } from "../../src/platform/database/tenant-scoped-db.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";
import { approvedControlSelectionForTenant } from "../helpers/question-repository-fixture.js";

// G-10 cutover follow-up: test/platform-hardening/rls-matrix.test.ts proves
// the RLS mechanism works, but it deliberately builds its own pg.Pool
// pointed at app_runtime — it never goes through this application's actual
// NestJS DI graph (TenantScopedDb / DATABASE_POOL as database.module.ts
// wires them). This suite closes that gap: it boots the real app the same
// way every other HTTP integration test does, pulls the *actual*
// TenantScopedDb instance the running application uses for every migrated
// repository, and proves cross-tenant isolation through it directly —
// defense-in-depth evidence that the cutover (not just the schema) works.
describe("Defense-in-depth: cross-tenant isolation through the real app_runtime connection", () => {
  let app: INestApplication;
  let baseUrl: string;
  let db: TenantScopedDb;
  const setupPool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });

  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const actorId = randomUUID();
  const ownerId = randomUUID();

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
    db = app.get(TenantScopedDb);
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  }, 120_000);

  afterAll(async () => {
    await setupPool.end();
    await app.close();
  });

  function headers(tenantId: string, scopes: string): Record<string, string> {
    return {
      "content-type": "application/json",
      "x-tenant-id": tenantId,
      "x-user-id": actorId,
      "x-user-clearance": "restricted",
      "x-user-scopes": scopes
    };
  }

  async function createAssessmentForTenant(tenantId: string, idempotencyKey: string): Promise<string> {
    const response = await fetch(`${baseUrl}/v1/assessments`, {
      method: "POST",
      headers: { ...headers(tenantId, "assessment:write"), "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({
        scopeName: "Defense-in-depth fixture",
        ownerId,
        periodStart: "2026-01-01",
        periodEnd: "2026-12-31",
        controls: [await approvedControlSelectionForTenant({ pool: setupPool, tenantId, actorId })]
      })
    });
    expect(response.status).toBe(201);
    const body = (await response.json()) as { id: string };
    return body.id;
  }

  it("blocks a real application repository from returning another tenant's row, even by exact primary key", async () => {
    const assessmentId = await createAssessmentForTenant(tenantA, `did-repo-${tenantA}`);

    // This is the actual production repository class every assessment HTTP
    // route uses, constructed with the same TenantScopedDb (and therefore
    // the same app_runtime DATABASE_POOL) the running application uses.
    const repository = new PostgresAssessmentRepository(db);

    const foundByOwner = await repository.findAssessment(tenantA, assessmentId);
    expect(foundByOwner?.id).toBe(assessmentId);

    const foundByOtherTenant = await repository.findAssessment(tenantB, assessmentId);
    expect(foundByOtherTenant).toBeNull();
  }, 30_000);

  it("blocks cross-tenant reads at the database layer even when the query itself has no tenant_id filter", async () => {
    // Simulates a hypothetical missing-tenant-filter bug in application code:
    // this query has no `where tenant_id = ...` clause at all. If RLS were
    // not enforced (e.g. still connecting as the table owner), this would
    // return the row regardless of which tenant context is set. Proving it
    // returns nothing under tenantB's context — despite matching by exact
    // primary key — demonstrates Postgres itself, not app code, is the
    // enforcement boundary post-cutover.
    const assessmentId = await createAssessmentForTenant(tenantA, `did-unscoped-${tenantA}`);

    const rowUnderOwningTenant = await db.withTenant(tenantA, undefined, async (client) => {
      const result = await client.query<{ id: string }>("select id from assessments where id = $1", [assessmentId]);
      return result.rows[0];
    });
    expect(rowUnderOwningTenant?.id).toBe(assessmentId);

    const rowUnderOtherTenant = await db.withTenant(tenantB, undefined, async (client) => {
      const result = await client.query<{ id: string }>("select id from assessments where id = $1", [assessmentId]);
      return result.rows[0];
    });
    expect(rowUnderOtherTenant).toBeUndefined();

    const rowUnderNoTenant = await db.withTenant("", undefined, async (client) => {
      const result = await client.query<{ id: string }>("select id from assessments where id = $1", [assessmentId]);
      return result.rows[0];
    });
    expect(rowUnderNoTenant).toBeUndefined();
  }, 30_000);
});
