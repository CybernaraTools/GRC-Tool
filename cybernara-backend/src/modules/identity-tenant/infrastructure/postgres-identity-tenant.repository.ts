import { Inject, Injectable } from "@nestjs/common";
import { TenantScopedDb } from "../../../platform/database/tenant-scoped-db.js";
import type { Tenant } from "../domain/identity-tenant.js";
import type { IdentityTenantRepository } from "../application/identity-tenant.service.js";

// identity_tenants has `check (tenant_id = id)` — a tenant's own row is its
// own tenant scope, so `tenant.id` doubles as the RLS context tenantId here.
@Injectable()
export class PostgresIdentityTenantRepository implements IdentityTenantRepository {
  constructor(@Inject(TenantScopedDb) private readonly db: TenantScopedDb) {}

  async saveTenant(tenant: Tenant): Promise<void> {
    await this.db.withTenant(tenant.id, tenant.createdBy, async (client) => {
      await client.query(
        `
          insert into identity_tenants (
            id, tenant_id, name, status, classification, version,
            created_by, created_at, updated_by, updated_at
          )
          values ($1, $1, $2, $3, $4, $5, $6, $7, $6, $7)
          on conflict (id) do update
            set name = excluded.name,
                status = excluded.status,
                classification = excluded.classification,
                version = identity_tenants.version + 1,
                updated_by = excluded.updated_by,
                updated_at = excluded.updated_at
        `,
        [
          tenant.id,
          tenant.name,
          tenant.status,
          tenant.classification,
          tenant.version,
          tenant.createdBy,
          tenant.createdAt
        ]
      );
    });
  }

  async findTenantById(tenantId: string): Promise<Tenant | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select id, name, status, classification, version,
                 created_by, created_at, updated_by, updated_at
          from identity_tenants
          where id = $1
        `,
        [tenantId]
      );

      const row = result.rows[0];
      if (!row) {
        return null;
      }

      return {
        id: String(row.id),
        name: String(row.name),
        status: row.status as Tenant["status"],
        classification: row.classification as Tenant["classification"],
        version: Number(row.version),
        createdBy: String(row.created_by),
        createdAt: row.created_at as Date,
        updatedBy: String(row.updated_by),
        updatedAt: row.updated_at as Date
      };
    });
  }
}

