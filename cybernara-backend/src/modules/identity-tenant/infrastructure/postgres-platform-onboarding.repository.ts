import { Inject, Injectable } from "@nestjs/common";
import pg from "pg";
import { ADMIN_DATABASE_POOL } from "../../../platform/database/tokens.js";
import type { Classification } from "../domain/identity-tenant.js";
import type {
  PlatformOnboardingRepository,
  PlatformOperator,
  PlatformOperatorStatus,
  PlatformRole,
  PlatformTenant
} from "../application/platform-onboarding.types.js";

@Injectable()
export class PostgresPlatformOnboardingRepository implements PlatformOnboardingRepository {
  constructor(@Inject(ADMIN_DATABASE_POOL) private readonly pool: pg.Pool) {}

  async findActiveOperator(input: {
    supabaseUserId: string;
    platformRole: PlatformRole;
  }): Promise<PlatformOperator | null> {
    const result = await this.pool.query(
      `
        select id, supabase_user_id, email, display_name, platform_role, status,
               classification, version, created_at, updated_at
        from platform_operators
        where supabase_user_id = $1
          and platform_role = $2
          and status = 'active'
      `,
      [input.supabaseUserId, input.platformRole]
    );
    return result.rows[0] ? mapOperator(result.rows[0]) : null;
  }

  async listTenants(): Promise<PlatformTenant[]> {
    const result = await this.pool.query(
      `
        select id, name, status, classification, version, created_at, updated_at
        from identity_tenants
        order by created_at desc, name asc
      `
    );
    return result.rows.map(mapTenant);
  }

  async findTenantById(tenantId: string): Promise<PlatformTenant | null> {
    const result = await this.pool.query(
      `
        select id, name, status, classification, version, created_at, updated_at
        from identity_tenants
        where id = $1
      `,
      [tenantId]
    );
    return result.rows[0] ? mapTenant(result.rows[0]) : null;
  }

  async createTenant(input: {
    tenantId: string;
    name: string;
    classification: Classification;
    createdBy: string;
  }): Promise<PlatformTenant> {
    const result = await this.pool.query(
      `
        insert into identity_tenants (
          id, tenant_id, name, status, classification, version,
          created_by, created_at, updated_by, updated_at
        )
        values ($1, $1, $2, 'active', $3, 1, $4, now(), $4, now())
        returning id, name, status, classification, version, created_at, updated_at
      `,
      [input.tenantId, input.name.trim(), input.classification, input.createdBy]
    );
    return mapTenant(result.rows[0]);
  }
}

function mapOperator(row: Record<string, unknown>): PlatformOperator {
  return {
    id: String(row.id),
    supabaseUserId: String(row.supabase_user_id),
    email: String(row.email),
    displayName: typeof row.display_name === "string" ? row.display_name : undefined,
    platformRole: row.platform_role as PlatformRole,
    status: row.status as PlatformOperatorStatus,
    classification: row.classification as Classification,
    version: Number(row.version),
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date
  };
}

function mapTenant(row: Record<string, unknown>): PlatformTenant {
  return {
    id: String(row.id),
    name: String(row.name),
    status: row.status as PlatformTenant["status"],
    classification: row.classification as Classification,
    version: Number(row.version),
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date
  };
}

