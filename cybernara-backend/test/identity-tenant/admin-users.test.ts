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

const adminScopes = [
  "admin_user:read",
  "admin_user:write",
  "admin_role:read",
  "framework-content:read"
].join(",");

describe("Admin user and role API", () => {
  let app: INestApplication;
  let baseUrl: string;
  let supabaseAdmin: SupabaseClient;
  let supabaseAnon: SupabaseClient;
  let adminPool: pg.Pool;

  const authUserIds: string[] = [];
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const actorId = randomUUID();

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
    supabaseAnon = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_ANON_KEY"), {
      auth: { persistSession: false }
    });
    adminPool = new pg.Pool({ connectionString: requiredEnv("SUPABASE_DB_URL") });

    await registerTenant(tenantA, "Admin Tenant A");
    await registerTenant(tenantB, "Admin Tenant B");
  }, 120_000);

  afterAll(async () => {
    for (const userId of authUserIds) {
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => undefined);
    }
    await cleanupTenant(adminPool, tenantB).catch(() => undefined);
    await cleanupTenant(adminPool, tenantA).catch(() => undefined);
    await adminPool.end().catch(() => undefined);
    await app.close();
  });

  it("rejects every admin endpoint for a non-admin subject", async () => {
    const headers = requestHeaders(tenantA, "assessment:read", "");
    const getRoles = await fetch(`${baseUrl}/v1/admin/roles`, { headers });
    const getUsers = await fetch(`${baseUrl}/v1/admin/users`, { headers });
    const invite = await fetch(`${baseUrl}/v1/admin/users/invite`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ email: uniqueEmail("non-admin"), roleKey: "viewer", clearance: "internal" })
    });
    const patch = await fetch(`${baseUrl}/v1/admin/users/${randomUUID()}`, {
      method: "PATCH",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ status: "disabled" })
    });

    expect(getRoles.status).toBe(403);
    expect(getUsers.status).toBe(403);
    expect(invite.status).toBe(403);
    expect(patch.status).toBe(403);
  });

  it("invites users into the caller tenant and blocks cross-tenant list/update", async () => {
    const tenantBUser = await inviteUser(tenantB, {
      email: uniqueEmail("tenant-b"),
      roleKey: "viewer",
      clearance: "internal"
    });
    authUserIds.push(tenantBUser.supabaseUserId);

    const tenantAInvite = await inviteUser(tenantA, {
      email: uniqueEmail("tenant-a"),
      roleKey: "viewer",
      clearance: "internal"
    });
    authUserIds.push(tenantAInvite.supabaseUserId);

    expect(tenantAInvite.tenantId).toBe(tenantA);
    expect(tenantAInvite.tenantId).not.toBe(tenantB);

    const listA = await fetch(`${baseUrl}/v1/admin/users`, {
      headers: requestHeaders(tenantA, adminScopes)
    });
    expect(listA.status).toBe(200);
    const usersA = (await listA.json()) as Array<{ id: string; tenantId: string }>;
    expect(usersA.some((user) => user.id === tenantAInvite.id)).toBe(true);
    expect(usersA.some((user) => user.id === tenantBUser.id)).toBe(false);

    const crossTenantPatch = await fetch(`${baseUrl}/v1/admin/users/${tenantBUser.id}`, {
      method: "PATCH",
      headers: { ...requestHeaders(tenantA, adminScopes), "content-type": "application/json" },
      body: JSON.stringify({ clearance: "restricted" })
    });
    expect(crossTenantPatch.status).toBe(404);
  }, 60_000);

  it("returns only active Compliance Managers from the assignable-user endpoint", async () => {
    const manager = await inviteUser(tenantA, {
      email: uniqueEmail("assignable-manager"),
      roleKey: "compliance_manager",
      clearance: "confidential"
    });
    authUserIds.push(manager.supabaseUserId);

    const auditor = await inviteUser(tenantA, {
      email: uniqueEmail("assignable-auditor"),
      roleKey: "auditor",
      clearance: "confidential"
    });
    authUserIds.push(auditor.supabaseUserId);

    const response = await fetch(`${baseUrl}/v1/admin/users/assignable`, {
      headers: requestHeaders(tenantA, "assessment:write")
    });
    expect(response.status).toBe(200);
    const users = (await response.json()) as Array<{
      id: string;
      supabaseUserId: string;
      email: string;
      roleKeys: string[];
    }>;

    const assignableManager = users.find((user) => user.email === manager.email);
    expect(assignableManager).toBeDefined();
    expect(assignableManager?.id).toBe(manager.id);
    expect(assignableManager?.supabaseUserId).toBe(manager.supabaseUserId);
    expect(assignableManager?.roleKeys).toEqual(["compliance_manager"]);
    expect(users.some((user) => user.email === auditor.email)).toBe(false);
  }, 60_000);

  it("updates Supabase metadata so policy.guard clearance decisions change without re-login", async () => {
    const invited = await inviteUser(tenantA, {
      email: uniqueEmail("clearance"),
      roleKey: "viewer",
      clearance: "internal"
    });
    authUserIds.push(invited.supabaseUserId);

    const signedIn = await supabaseAnon.auth.signInWithPassword({
      email: invited.email,
      password: invited.temporaryPassword
    });
    expect(signedIn.error).toBeNull();
    const accessToken = signedIn.data.session?.access_token;
    expect(accessToken).toBeTruthy();

    const beforeUser = await supabaseAnon.auth.getUser(accessToken);
    expect(beforeUser.data.user?.app_metadata.clearance).toBe("internal");

    const denied = await fetch(`${baseUrl}/v1/framework-content/requirements`, {
      headers: headersFromSupabaseUser(beforeUser.data.user)
    });
    expect(denied.status).toBe(403);

    const patched = await fetch(`${baseUrl}/v1/admin/users/${invited.id}`, {
      method: "PATCH",
      headers: { ...requestHeaders(tenantA, adminScopes), "content-type": "application/json" },
      body: JSON.stringify({ clearance: "restricted" })
    });
    expect(patched.status).toBe(200);

    const afterUser = await supabaseAnon.auth.getUser(accessToken);
    expect(afterUser.data.user?.app_metadata.clearance).toBe("restricted");

    const allowed = await fetch(`${baseUrl}/v1/framework-content/requirements`, {
      headers: headersFromSupabaseUser(afterUser.data.user)
    });
    expect(allowed.status).toBe(200);
  }, 60_000);

  it("syncs user deactivation status to Supabase metadata until the user is reactivated", async () => {
    const invited = await inviteUser(tenantA, {
      email: uniqueEmail("status-toggle"),
      roleKey: "auditor",
      clearance: "internal"
    });
    authUserIds.push(invited.supabaseUserId);

    const signedIn = await supabaseAnon.auth.signInWithPassword({
      email: invited.email,
      password: invited.temporaryPassword
    });
    expect(signedIn.error).toBeNull();
    const accessToken = signedIn.data.session?.access_token;
    expect(accessToken).toBeTruthy();

    const beforeUser = await supabaseAnon.auth.getUser(accessToken);
    expect(beforeUser.data.user?.app_metadata.status).toBe("active");
    expect(beforeUser.data.user?.app_metadata.tenant_status).toBe("active");

    const disabled = await fetch(`${baseUrl}/v1/admin/users/${invited.id}`, {
      method: "PATCH",
      headers: { ...requestHeaders(tenantA, adminScopes), "content-type": "application/json" },
      body: JSON.stringify({ status: "disabled" })
    });
    expect(disabled.status).toBe(200);
    const disabledBody = (await disabled.json()) as { status: string };
    expect(disabledBody.status).toBe("disabled");

    const disabledUser = await supabaseAnon.auth.getUser(accessToken);
    expect(disabledUser.data.user?.app_metadata.status).toBe("disabled");
    expect(disabledUser.data.user?.app_metadata.tenant_status).toBe("active");

    const reactivated = await fetch(`${baseUrl}/v1/admin/users/${invited.id}`, {
      method: "PATCH",
      headers: { ...requestHeaders(tenantA, adminScopes), "content-type": "application/json" },
      body: JSON.stringify({ status: "active" })
    });
    expect(reactivated.status).toBe(200);
    const reactivatedBody = (await reactivated.json()) as { status: string };
    expect(reactivatedBody.status).toBe("active");

    const activeUser = await supabaseAnon.auth.getUser(accessToken);
    expect(activeUser.data.user?.app_metadata.status).toBe("active");
    expect(activeUser.data.user?.app_metadata.tenant_status).toBe("active");
  }, 60_000);

  async function registerTenant(tenantId: string, name: string) {
    const response = await fetch(`${baseUrl}/v1/identity/tenants`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: tenantId, name, createdBy: actorId })
    });
    expect(response.status).toBe(201);
  }

  async function inviteUser(
    tenantId: string,
    body: { email: string; roleKey: string; clearance: "public" | "internal" | "confidential" | "restricted" }
  ): Promise<{
    id: string;
    tenantId: string;
    supabaseUserId: string;
    email: string;
    temporaryPassword: string;
  }> {
    const response = await fetch(`${baseUrl}/v1/admin/users/invite`, {
      method: "POST",
      headers: { ...requestHeaders(tenantId, adminScopes), "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    expect(response.status).toBe(201);
    return (await response.json()) as {
      id: string;
      tenantId: string;
      supabaseUserId: string;
      email: string;
      temporaryPassword: string;
    };
  }
});

function requestHeaders(tenantId: string, scopes: string, roles: string = "platform_admin"): Record<string, string> {
  return {
    "x-tenant-id": tenantId,
    "x-user-id": randomUUID(),
    "x-user-clearance": "restricted",
    "x-user-scopes": scopes,
    "x-user-roles": roles
  };
}

function headersFromSupabaseUser(user: { id: string; app_metadata: Record<string, unknown> } | null): Record<string, string> {
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

function uniqueEmail(prefix: string): string {
  return `cybernara-admin-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function cleanupTenant(pool: pg.Pool, tenantId: string): Promise<void> {
  await pool.query("delete from identity_role_grants where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity_users where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity_roles where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity_tenants where id = $1", [tenantId]);
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for admin user integration tests.`);
  }
  return value;
}
