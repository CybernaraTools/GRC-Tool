import "dotenv/config";
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { adminRoleCatalog, type AdminRoleKey } from "../../src/modules/identity-tenant/application/admin-role-catalog.js";
import { CANONICAL_CONTENT_TENANT_ID } from "../../src/modules/framework-content/public.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";

describe("framework enablement and question option access matrix", () => {
  let app: INestApplication;
  let baseUrl: string;
  let pool: pg.Pool;
  const createdTenantIds: string[] = [];

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalFilters(new ProblemDetailsFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidUnknownValues: true, transform: true }));
    await app.listen(0);
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    pool = new pg.Pool({ connectionString: requiredEnv("SUPABASE_DB_URL") });
  }, 120_000);

  afterAll(async () => {
    for (const tenantId of createdTenantIds) {
      await pool.query("delete from tenant_catalog_subscriptions where tenant_id = $1", [tenantId]).catch(() => undefined);
      await pool.query("delete from identity_tenants where id = $1", [tenantId]).catch(() => undefined);
    }
    await pool.end().catch(() => undefined);
    await app.close();
  });

  it.each(["platform_admin", "compliance_manager", "auditor", "viewer"] as const)(
    "allows %s to read enabled frameworks and assessment question options",
    async (roleKey) => {
      const tenantId = randomUUID();
      const enabled = await fetch(`${baseUrl}/v1/framework-content/enabled-frameworks`, {
        headers: headersForRole(tenantId, roleKey)
      });
      const options = await fetch(`${baseUrl}/v1/framework-content/question-options`, {
        headers: headersForRole(tenantId, roleKey)
      });

      await expectStatus(enabled, 200);
      await expectStatus(options, 200);
    },
    30_000
  );

  it.each(["platform_admin", "compliance_manager"] as const)(
    "allows %s to enable a published framework",
    async (roleKey) => {
      const tenantId = randomUUID();
      await ensureTenant(tenantId);
      const frameworkVersionId = await firstPublishedFrameworkVersionId();
      const response = await fetch(`${baseUrl}/v1/framework-content/enabled-frameworks`, {
        method: "POST",
        headers: { ...headersForRole(tenantId, roleKey), "content-type": "application/json" },
        body: JSON.stringify({ frameworkVersionId })
      });

      await expectStatus(response, 201);
      const body = (await response.json()) as { frameworkVersionId: string };
      expect(body.frameworkVersionId).toBe(frameworkVersionId);
    },
    60_000
  );

  it.each(["auditor", "viewer"] as const)("denies %s framework enablement writes", async (roleKey) => {
    const tenantId = randomUUID();
    await ensureTenant(tenantId);
    const response = await fetch(`${baseUrl}/v1/framework-content/enabled-frameworks`, {
      method: "POST",
      headers: { ...headersForRole(tenantId, roleKey), "content-type": "application/json" },
      body: JSON.stringify({ frameworkVersionId: await firstPublishedFrameworkVersionId() })
    });

    await expectStatus(response, 403);
  }, 30_000);

  it("derives question_version:read from the role catalog when session scopes are stale", async () => {
    const response = await fetch(`${baseUrl}/v1/framework-content/question-options`, {
      headers: {
        "x-tenant-id": randomUUID(),
        "x-user-id": randomUUID(),
        "x-user-clearance": "restricted",
        "x-user-scopes": "framework-content:read",
        "x-user-roles": "platform_admin"
      }
    });

    await expectStatus(response, 200);
  }, 30_000);

  it("still denies question option reads when neither explicit scopes nor roles grant question_version:read", async () => {
    const response = await fetch(`${baseUrl}/v1/framework-content/question-options`, {
      headers: {
        "x-tenant-id": randomUUID(),
        "x-user-id": randomUUID(),
        "x-user-clearance": "restricted",
        "x-user-scopes": "framework-content:read",
        "x-user-roles": ""
      }
    });

    await expectStatus(response, 403);
  }, 30_000);

  function headersForRole(tenantId: string, roleKey: AdminRoleKey): Record<string, string> {
    const role = adminRoleCatalog.find((entry) => entry.roleKey === roleKey);
    if (!role) {
      throw new Error(`Unknown role ${roleKey}.`);
    }
    return {
      "x-tenant-id": tenantId,
      "x-user-id": randomUUID(),
      "x-user-clearance": "restricted",
      "x-user-scopes": role.scopes.join(","),
      "x-user-roles": roleKey
    };
  }

  async function firstPublishedFrameworkVersionId(): Promise<string> {
    const result = await pool.query(
      `
        select fv.id
        from framework_versions fv
        join frameworks f on f.id = fv.framework_id and f.tenant_id = fv.tenant_id
        where fv.tenant_id = $1 and fv.status = 'published'
        order by f.framework_key, fv.published_at desc nulls last, fv.created_at desc
        limit 1
      `,
      [CANONICAL_CONTENT_TENANT_ID]
    );
    if (!result.rows[0]) {
      throw new Error("A published framework version is required for the access test.");
    }
    return String(result.rows[0].id);
  }

  async function ensureTenant(tenantId: string): Promise<void> {
    await pool.query(
      `
        insert into identity_tenants (id, tenant_id, name, status, classification, created_by, updated_by)
        values ($1, $1, $2, 'active', 'restricted', $3, $3)
        on conflict (id) do nothing
      `,
      [tenantId, `Question options access ${tenantId.slice(0, 8)}`, randomUUID()]
    );
    createdTenantIds.push(tenantId);
  }
});

async function expectStatus(response: Response, expected: number): Promise<void> {
  const body = await response.clone().text();
  expect(response.status, body).toBe(expected);
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for framework access tests.`);
  }
  return value;
}
