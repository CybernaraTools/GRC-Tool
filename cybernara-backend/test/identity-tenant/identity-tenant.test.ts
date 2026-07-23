import "dotenv/config";
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { createTenant } from "../../src/modules/identity-tenant/domain/identity-tenant.js";
import { PostgresIdentityTenantRepository } from "../../src/modules/identity-tenant/infrastructure/postgres-identity-tenant.repository.js";
import { TenantScopedDb } from "../../src/platform/database/tenant-scoped-db.js";
import { DATABASE_POOL } from "../../src/platform/database/tokens.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";

describe("IdentityTenant domain", () => {
  it("normalizes tenant names and initializes mutable record conventions", () => {
    const now = new Date("2026-07-02T00:00:00.000Z");
    const tenant = createTenant({
      id: "00000000-0000-4000-8000-000000000001",
      name: "  Acme Corp  ",
      createdBy: "00000000-0000-4000-8000-000000000002",
      now
    });

    expect(tenant.name).toBe("Acme Corp");
    expect(tenant.version).toBe(1);
    expect(tenant.status).toBe("active");
    expect(tenant.classification).toBe("confidential");
    expect(tenant.createdAt).toBe(now);
    expect(tenant.updatedAt).toBe(now);
  });

  it("rejects unusable tenant names", () => {
    expect(() =>
      createTenant({
        id: "00000000-0000-4000-8000-000000000001",
        name: "x",
        createdBy: "00000000-0000-4000-8000-000000000002"
      })
    ).toThrow(/at least 2/);
  });
});

// G-10: PostgresIdentityTenantRepository had zero real-Supabase test
// coverage anywhere in this suite before this migration — every prior test
// for this module exercised only the pure domain function above. Since
// identity_tenants is the one table where `id === tenant_id` (its own check
// constraint), and TenantScopedDb.withTenant requires a real tenantId, this
// adds the real coverage the migration itself needed to be trusted.
describe("IdentityTenant repository", () => {
  const repositoryPool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
  const repositoryDb = new TenantScopedDb(repositoryPool);

  afterAll(async () => {
    await repositoryPool.end();
  });

  it("saves and re-fetches a tenant scoped by its own id against real Supabase", async () => {
    const repository = new PostgresIdentityTenantRepository(repositoryDb);
    const tenant = createTenant({
      id: randomUUID(),
      name: "Repository Real Tenant",
      createdBy: randomUUID()
    });

    await repository.saveTenant(tenant);
    const found = await repository.findTenantById(tenant.id);

    expect(found?.id).toBe(tenant.id);
    expect(found?.name).toBe("Repository Real Tenant");
    expect(found?.status).toBe("active");
    expect(found?.classification).toBe("confidential");
  });

  it("returns null for a tenant id that was never registered", async () => {
    const repository = new PostgresIdentityTenantRepository(repositoryDb);
    const found = await repository.findTenantById(randomUUID());
    expect(found).toBeNull();
  });
});

describe("IdentityTenant HTTP exposure", () => {
  let app: INestApplication;
  let appPool: pg.Pool;
  let baseUrl: string;

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
  });

  it("registers a tenant and fetches it back through the real HTTP surface", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();

    const registerResponse = await fetch(`${baseUrl}/v1/identity/tenants`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: tenantId, name: "HTTP Real Tenant", createdBy: actorId })
    });
    expect(registerResponse.status).toBe(201);

    const fetchResponse = await fetch(`${baseUrl}/v1/identity/tenants/${tenantId}`);
    expect(fetchResponse.status).toBe(200);
    const body = (await fetchResponse.json()) as { id: string; name: string };
    expect(body.id).toBe(tenantId);
    expect(body.name).toBe("HTTP Real Tenant");
  }, 30_000);

  it("returns 404 for a tenant id that does not exist", async () => {
    const response = await fetch(`${baseUrl}/v1/identity/tenants/${randomUUID()}`);
    expect(response.status).toBe(404);
  });
});

