import { Inject, Injectable } from "@nestjs/common";
import { TenantScopedDb, type TenantScopedClient } from "../../../platform/database/tenant-scoped-db.js";
import type { Classification } from "../../platform-hardening/public.js";
import type { AdminRoleDefinition } from "../application/admin-role-catalog.js";
import type { AdminIdentityUser, AdminUsersRepository, AdminUserStatus } from "../application/admin-users.types.js";

@Injectable()
export class PostgresAdminUsersRepository implements AdminUsersRepository {
  constructor(@Inject(TenantScopedDb) private readonly db: TenantScopedDb) {}

  async listUsers(tenantId: string): Promise<AdminIdentityUser[]> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(userSelectSql("where u.tenant_id = $1"), [tenantId]);
      return result.rows.map(mapUser);
    });
  }

  async findUser(tenantId: string, userId: string): Promise<AdminIdentityUser | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(userSelectSql("where u.tenant_id = $1 and u.id = $2"), [tenantId, userId]);
      return result.rows[0] ? mapUser(result.rows[0]) : null;
    });
  }

  async createUser(input: {
    tenantId: string;
    actorId: string;
    supabaseUserId: string;
    email: string;
    displayName?: string;
    status: AdminUserStatus;
    clearance: Classification;
    role: AdminRoleDefinition;
  }): Promise<AdminIdentityUser> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const roleId = await upsertRole(client, input.tenantId, input.actorId, input.role);
      const inserted = await client.query<{ id: string }>(
        `
          insert into identity_users (
            tenant_id, supabase_user_id, email, display_name, status, classification,
            created_by, created_at, updated_by, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, now(), $7, now())
          returning id
        `,
        [
          input.tenantId,
          input.supabaseUserId,
          input.email.toLowerCase(),
          input.displayName?.trim() || null,
          input.status,
          input.clearance,
          input.actorId
        ]
      );
      await replaceTenantRoleGrant(client, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        userId: inserted.rows[0].id,
        roleId
      });
      const result = await client.query(userSelectSql("where u.tenant_id = $1 and u.id = $2"), [
        input.tenantId,
        inserted.rows[0].id
      ]);
      return mapUser(result.rows[0]);
    });
  }

  async updateUser(input: {
    tenantId: string;
    actorId: string;
    userId: string;
    status?: AdminUserStatus;
    clearance?: Classification;
    role?: AdminRoleDefinition;
  }): Promise<AdminIdentityUser | null> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      if (input.role) {
        const roleId = await upsertRole(client, input.tenantId, input.actorId, input.role);
        await replaceTenantRoleGrant(client, {
          tenantId: input.tenantId,
          actorId: input.actorId,
          userId: input.userId,
          roleId
        });
      }

      const result = await client.query(
        `
          update identity_users
          set status = coalesce($3, status),
              classification = coalesce($4::cybernara_classification, classification),
              updated_by = $5,
              updated_at = now(),
              version = version + 1
          where tenant_id = $1 and id = $2
          returning id
        `,
        [input.tenantId, input.userId, input.status ?? null, input.clearance ?? null, input.actorId]
      );
      if (!result.rows[0]) {
        return null;
      }

      const user = await client.query(userSelectSql("where u.tenant_id = $1 and u.id = $2"), [
        input.tenantId,
        input.userId
      ]);
      return user.rows[0] ? mapUser(user.rows[0]) : null;
    });
  }
}

async function upsertRole(
  client: TenantScopedClient,
  tenantId: string,
  actorId: string,
  role: AdminRoleDefinition
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      insert into identity_roles (
        tenant_id, role_key, display_name, description, classification,
        created_by, created_at, updated_by, updated_at
      )
      values ($1, $2, $3, $4, 'internal', $5, now(), $5, now())
      on conflict (tenant_id, role_key) do update
      set display_name = excluded.display_name,
          description = excluded.description,
          updated_by = excluded.updated_by,
          updated_at = now()
      returning id
    `,
    [tenantId, role.roleKey, role.displayName, role.description, actorId]
  );
  return result.rows[0].id;
}

async function replaceTenantRoleGrant(
  client: TenantScopedClient,
  input: { tenantId: string; actorId: string; userId: string; roleId: string }
): Promise<void> {
  await client.query(
    `
      delete from identity_role_grants
      where tenant_id = $1 and user_id = $2 and resource_type = 'tenant'
    `,
    [input.tenantId, input.userId]
  );
  await client.query(
    `
      insert into identity_role_grants (
        tenant_id, user_id, role_id, resource_type, resource_id, classification,
        created_by, created_at, updated_by, updated_at
      )
      values ($1, $2, $3, 'tenant', $1, 'confidential', $4, now(), $4, now())
    `,
    [input.tenantId, input.userId, input.roleId, input.actorId]
  );
}

function userSelectSql(whereClause: string): string {
  return `
    select
      u.id,
      u.tenant_id,
      u.supabase_user_id,
      u.email,
      u.display_name,
      u.status,
      u.classification,
      u.version,
      u.created_at,
      u.updated_at,
      coalesce(array_remove(array_agg(distinct r.role_key order by r.role_key), null), array[]::text[]) as role_keys
    from identity_users u
    left join identity_role_grants g
      on g.tenant_id = u.tenant_id
      and g.user_id = u.id
      and g.resource_type = 'tenant'
      and (g.expires_at is null or g.expires_at > now())
    left join identity_roles r on r.tenant_id = u.tenant_id and r.id = g.role_id
    ${whereClause}
    group by u.id, u.tenant_id, u.supabase_user_id, u.email, u.display_name, u.status, u.classification, u.version, u.created_at, u.updated_at
    order by u.created_at desc
  `;
}

function mapUser(row: Record<string, unknown>): AdminIdentityUser {
  const roleKeys = Array.isArray(row.role_keys) ? row.role_keys.filter((entry): entry is string => typeof entry === "string") : [];
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    supabaseUserId: String(row.supabase_user_id),
    email: String(row.email),
    displayName: typeof row.display_name === "string" ? row.display_name : undefined,
    status: row.status as AdminUserStatus,
    clearance: row.classification as Classification,
    roleKeys,
    scopes: [],
    version: Number(row.version),
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date
  };
}
