import "dotenv/config";
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";

const tenantAdminScopes = [
  "admin_user:read",
  "admin_user:write",
  "admin_role:read",
  "framework-content:read"
].join(",");

describe("Platform super-admin onboarding API", () => {
  let app: INestApplication;
  let baseUrl: string;
  let supabaseAdmin: SupabaseClient;
  let adminPool: pg.Pool;

  const platformOperatorUserId = randomUUID();
  const platformOperatorEmail = uniqueEmail("operator");
  const authUserIds: string[] = [];
  const tenantIds: string[] = [];

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalFilters(new ProblemDetailsFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidUnknownValues: true, transform: true }));
    await app.listen(0);
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;

    supabaseAdmin = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false }
    });
    adminPool = new pg.Pool({ connectionString: requiredEnv("SUPABASE_DB_URL") });

    await adminPool.query(
      `
        insert into platform_operators (
          supabase_user_id, email, platform_role, status, classification,
          created_by, created_at, updated_by, updated_at
        )
        values ($1, $2, 'super_admin', 'active', 'restricted', $1, now(), $1, now())
      `,
      [platformOperatorUserId, platformOperatorEmail]
    );
  }, 120_000);

  afterAll(async () => {
    for (const userId of authUserIds) {
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => undefined);
    }
    for (const tenantId of tenantIds.reverse()) {
      await cleanupTenant(adminPool, tenantId).catch(() => undefined);
    }
    await adminPool
      .query("delete from platform_operators where supabase_user_id = $1", [platformOperatorUserId])
      .catch(() => undefined);
    await adminPool.end().catch(() => undefined);
    await app.close();
  });

  it("rejects tenant-scoped admins from every platform endpoint, even with spoofed platform headers", async () => {
    const tenantId = await createTenantThroughLegacyEndpoint("Tenant Admin Boundary Co");
    const tenantAdmin = await inviteTenantAdmin(tenantId, uniqueEmail("tenant-boundary-admin"));
    authUserIds.push(tenantAdmin.supabaseUserId);

    const spoofedPlatformHeaders = {
      ...platformHeaders(tenantAdmin.supabaseUserId, tenantAdmin.email),
      "x-tenant-id": tenantId,
      "x-user-scopes": tenantAdminScopes,
      "x-user-clearance": "restricted",
      "x-user-roles": "platform_admin"
    };

    const list = await fetch(`${baseUrl}/v1/platform/tenants`, { headers: spoofedPlatformHeaders });
    const create = await fetch(`${baseUrl}/v1/platform/tenants`, {
      method: "POST",
      headers: { ...spoofedPlatformHeaders, "content-type": "application/json" },
      body: JSON.stringify({ name: "Should Not Exist" })
    });
    const invite = await fetch(`${baseUrl}/v1/platform/tenants/${tenantId}/admin-invite`, {
      method: "POST",
      headers: { ...spoofedPlatformHeaders, "content-type": "application/json" },
      body: JSON.stringify({ email: uniqueEmail("should-not-invite") })
    });

    await expectStatus(list, 403);
    await expectStatus(create, 403);
    await expectStatus(invite, 403);
  }, 60_000);

  it("creates a tenant, invites its first tenant admin, and keeps that admin tenant-scoped", async () => {
    const tenant = await platformCreateTenant("Platform Proof Co");
    tenantIds.push(tenant.id);

    const list = await fetch(`${baseUrl}/v1/platform/tenants`, { headers: platformHeaders() });
    await expectStatus(list, 200);
    const tenants = (await list.json()) as Array<{ id: string; name: string }>;
    expect(tenants.some((entry) => entry.id === tenant.id && entry.name === "Platform Proof Co")).toBe(true);

    const invited = await platformInviteTenantAdmin(tenant.id, uniqueEmail("first-admin"));
    authUserIds.push(invited.supabaseUserId);
    expect(invited.tenantId).toBe(tenant.id);

    const supabaseUser = await supabaseAdmin.auth.admin.getUserById(invited.supabaseUserId);
    expect(supabaseUser.error).toBeNull();
    expect(supabaseUser.data.user?.app_metadata.tenant_id).toBe(tenant.id);
    expect(supabaseUser.data.user?.app_metadata.platform_role).toBeUndefined();
    expect(supabaseUser.data.user?.app_metadata.roles).toContain("platform_admin");

    const tenantAdminList = await fetch(`${baseUrl}/v1/admin/users`, {
      headers: tenantHeadersFromMetadata(supabaseUser.data.user)
    });
    await expectStatus(tenantAdminList, 200);
    const users = (await tenantAdminList.json()) as Array<{ id: string; tenantId: string }>;
    expect(users.some((user) => user.id === invited.id && user.tenantId === tenant.id)).toBe(true);

    const tenantAdminPlatformAttempt = await fetch(`${baseUrl}/v1/platform/tenants`, {
      headers: platformHeaders(invited.supabaseUserId, invited.email)
    });
    await expectStatus(tenantAdminPlatformAttempt, 403);
  }, 60_000);

  async function createTenantThroughLegacyEndpoint(name: string): Promise<string> {
    const tenantId = randomUUID();
    const response = await fetch(`${baseUrl}/v1/identity/tenants`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: tenantId, name, createdBy: randomUUID() })
    });
    await expectStatus(response, 201);
    tenantIds.push(tenantId);
    return tenantId;
  }

  async function inviteTenantAdmin(
    tenantId: string,
    email: string
  ): Promise<{ id: string; tenantId: string; supabaseUserId: string; email: string; temporaryPassword: string }> {
    const response = await fetch(`${baseUrl}/v1/admin/users/invite`, {
      method: "POST",
      headers: { ...tenantAdminHeaders(tenantId), "content-type": "application/json" },
      body: JSON.stringify({ email, roleKey: "platform_admin", clearance: "restricted" })
    });
    await expectStatus(response, 201);
    return (await response.json()) as {
      id: string;
      tenantId: string;
      supabaseUserId: string;
      email: string;
      temporaryPassword: string;
    };
  }

  async function platformCreateTenant(name: string): Promise<{ id: string; name: string }> {
    const response = await fetch(`${baseUrl}/v1/platform/tenants`, {
      method: "POST",
      headers: { ...platformHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ name, classification: "confidential" })
    });
    await expectStatus(response, 201);
    return (await response.json()) as { id: string; name: string };
  }

  async function platformInviteTenantAdmin(
    tenantId: string,
    email: string
  ): Promise<{ id: string; tenantId: string; supabaseUserId: string; email: string }> {
    const response = await fetch(`${baseUrl}/v1/platform/tenants/${tenantId}/admin-invite`, {
      method: "POST",
      headers: { ...platformHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ email, displayName: "First Tenant Admin" })
    });
    expect(response.status).toBe(201);
    return (await response.json()) as { id: string; tenantId: string; supabaseUserId: string; email: string };
  }

  function platformHeaders(userId: string = platformOperatorUserId, email: string = platformOperatorEmail): Record<string, string> {
    return {
      "x-user-id": userId,
      "x-platform-role": "super_admin",
      "x-user-email": email
    };
  }

  function tenantAdminHeaders(tenantId: string): Record<string, string> {
    return {
      "x-tenant-id": tenantId,
      "x-user-id": randomUUID(),
      "x-user-clearance": "restricted",
      "x-user-scopes": tenantAdminScopes,
      "x-user-roles": "platform_admin"
    };
  }
});

function tenantHeadersFromMetadata(user: { id: string; app_metadata: Record<string, unknown> } | null): Record<string, string> {
  if (!user) {
    throw new Error("Expected Supabase user.");
  }
  const metadata = user.app_metadata;
  return {
    "x-tenant-id": String(metadata.tenant_id),
    "x-user-id": user.id,
    "x-user-clearance": String(metadata.clearance),
    "x-user-scopes": Array.isArray(metadata.scopes) ? metadata.scopes.join(",") : "",
    "x-user-roles": Array.isArray(metadata.roles) ? metadata.roles.join(",") : ""
  };
}

async function cleanupTenant(pool: pg.Pool, tenantId: string): Promise<void> {
  await pool.query("delete from identity_role_grants where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity_users where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity_roles where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity_tenants where id = $1", [tenantId]);
}

function uniqueEmail(prefix: string): string {
  return `cybernara-platform-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function expectStatus(response: Response, expected: number): Promise<void> {
  const body = await response.clone().text();
  expect(response.status, body).toBe(expected);
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for platform onboarding integration tests.`);
  }
  return value;
}
