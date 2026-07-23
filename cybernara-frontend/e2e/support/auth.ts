import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const seededTenantId = "00000000-0000-4000-8000-000000000001";
const seededActorId = "00000000-0000-4000-8000-0000000000aa";

export async function createTestAuthUser(options?: { scopes?: string[]; roles?: string[]; clearance?: string; tenantId?: string }) {
  const env = loadEnv();
  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const tenantId = options?.tenantId ?? seededTenantId;
  await ensureSeededTenant(admin, tenantId);
  const email = `cybernara-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const password = `Cybernara-${Date.now()}-Aa1!`;
  const scopes = options?.scopes ?? ["audit_event:read"];
  const roles = options?.roles ?? ["platform_admin"];
  const clearance = options?.clearance ?? "restricted";

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      tenant_id: tenantId,
      roles,
      scopes,
      clearance,
      status: "active"
    }
  });

  if (created.error || !created.data.user) {
    throw new Error(`Unable to create Supabase Auth test user: ${created.error?.message ?? "unknown error"}`);
  }

  const userId = created.data.user.id;
  return {
    email,
    password,
    userId,
    cleanup: async () => {
      const deleted = await admin.auth.admin.deleteUser(userId);
      if (deleted.error) {
        throw new Error(`Unable to delete Supabase Auth test user: ${deleted.error.message}`);
      }
    }
  };
}

export async function createPlatformAuthUser() {
  const env = loadEnv();
  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const email = `cybernara-platform-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const password = `Cybernara-${Date.now()}-Aa1!`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      platform_role: "super_admin",
      status: "active"
    }
  });

  if (created.error || !created.data.user) {
    throw new Error(`Unable to create platform Supabase Auth test user: ${created.error?.message ?? "unknown error"}`);
  }

  const userId = created.data.user.id;
  const { error } = await admin.from("platform_operators").upsert(
    {
      supabase_user_id: userId,
      email,
      platform_role: "super_admin",
      status: "active",
      classification: "restricted",
      created_by: userId,
      updated_by: userId
    },
    { onConflict: "supabase_user_id" }
  );
  if (error) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    throw new Error(`Unable to seed platform operator: ${error.message}`);
  }

  return {
    email,
    password,
    userId,
    cleanup: async () => {
      await admin.from("platform_operators").delete().eq("supabase_user_id", userId);
      const deleted = await admin.auth.admin.deleteUser(userId);
      if (deleted.error) {
        throw new Error(`Unable to delete platform Supabase Auth test user: ${deleted.error.message}`);
      }
    }
  };
}

export async function createTenantWithEnabledFrameworks(frameworkKeys: string[]) {
  const tenantId = randomUUID();
  const admin = createServiceRoleClient();
  await ensureSeededTenant(admin, tenantId);
  const canonicalTenantId = seededTenantId;
  const { data: frameworks, error: frameworksError } = await admin
    .from("frameworks")
    .select("id, framework_key")
    .eq("tenant_id", canonicalTenantId)
    .in("framework_key", frameworkKeys);
  if (frameworksError || !frameworks) {
    throw new Error(`Unable to load framework fixtures: ${frameworksError?.message ?? "no frameworks returned"}`);
  }
  const frameworkIds = frameworks.map((framework) => framework.id);
  const { data: versions, error: versionsError } = await admin
    .from("framework_versions")
    .select("id, framework_id, source_package_id, published_at, created_at")
    .eq("tenant_id", canonicalTenantId)
    .eq("status", "published")
    .in("framework_id", frameworkIds);
  if (versionsError || !versions) {
    throw new Error(`Unable to load framework version fixtures: ${versionsError?.message ?? "no versions returned"}`);
  }

  const rows = frameworks.flatMap((framework) => {
    const version = versions
      .filter((candidate) => candidate.framework_id === framework.id && candidate.source_package_id)
      .sort((left, right) => String(right.published_at ?? right.created_at).localeCompare(String(left.published_at ?? left.created_at)))[0];
    return version
      ? [{
          tenant_id: tenantId,
          framework_id: framework.id,
          source_package_id: version.source_package_id,
          status: "active",
          classification: "restricted",
          created_by: seededActorId,
          updated_by: seededActorId
        }]
      : [];
  });

  if (rows.length !== frameworkKeys.length) {
    throw new Error(`Unable to resolve all requested framework enablements: ${frameworkKeys.join(", ")}`);
  }

  await admin.from("tenant_catalog_subscriptions").delete().eq("tenant_id", tenantId);
  const { error: subscriptionsError } = await admin.from("tenant_catalog_subscriptions").insert(rows);
  if (subscriptionsError) {
    throw new Error(`Unable to seed framework enablements: ${subscriptionsError.message}`);
  }

  return {
    tenantId,
    cleanup: async () => {
      await admin.from("tenant_catalog_subscriptions").delete().eq("tenant_id", tenantId);
      await admin.from("identity_tenants").delete().eq("id", tenantId);
    }
  };
}

export function createServiceRoleClient() {
  const env = loadEnv();
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

async function ensureSeededTenant(admin: ReturnType<typeof createServiceRoleClient>, tenantId = seededTenantId) {
  const { error } = await admin.from("identity_tenants").upsert(
    {
      id: tenantId,
      tenant_id: tenantId,
      name: tenantId === seededTenantId ? "Cybernara E2E Tenant" : `Cybernara E2E Tenant ${tenantId.slice(0, 8)}`,
      status: "active",
      classification: "restricted",
      created_by: seededActorId,
      updated_by: seededActorId
    },
    { onConflict: "id" }
  );

  if (error) {
    throw new Error(`Unable to seed E2E tenant: ${error.message}`);
  }
}

export async function signInThroughUi(page: Page, user: { email: string; password: string }, nextPath = "/") {
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

function loadEnv(): Record<string, string> {
  const frontendEnv = parseEnvFile(path.resolve(process.cwd(), ".env"));
  const backendEnv = parseEnvFile(path.resolve(process.cwd(), "..", "cybernara-backend", ".env"));
  const env = { ...frontendEnv, ...backendEnv, ...process.env };

  for (const key of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const) {
    if (!env[key]) {
      throw new Error(`${key} is required for the real Supabase Auth Playwright flow.`);
    }
  }

  return env as Record<string, string>;
}

function parseEnvFile(filePath: string): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(filePath, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const index = line.indexOf("=");
          return [line.slice(0, index), line.slice(index + 1)];
        })
    );
  } catch {
    return {};
  }
}
