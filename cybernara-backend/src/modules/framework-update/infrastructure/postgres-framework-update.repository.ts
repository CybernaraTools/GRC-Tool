import { Inject, Injectable } from "@nestjs/common";
import { TenantScopedDb } from "../../../platform/database/tenant-scoped-db.js";
import { CANONICAL_CONTENT_ACTOR_ID, CANONICAL_CONTENT_TENANT_ID } from "../../framework-content/public.js";
import type { FrameworkUpdateRepository } from "../application/framework-update.types.js";
import type { FrameworkDiff, FrameworkDiffItem, FrameworkUpdateImpact } from "../domain/diff.js";
import type { Pagination } from "../../../shared/pagination.js";

@Injectable()
export class PostgresFrameworkUpdateRepository implements FrameworkUpdateRepository {
  constructor(@Inject(TenantScopedDb) private readonly db: TenantScopedDb) {}

  async fetchVersionControls(tenantId: string, frameworkVersionId: string): Promise<unknown[]> {
    const catalogTenantId = await this.findVersionTenant(tenantId, frameworkVersionId);
    if (!catalogTenantId) return [];

    return this.db.withTenant(catalogTenantId, principalForCatalogTenant(catalogTenantId), async (client) => {
      const res = await client.query(
        `
          select c.control_key as "controlKey", c.title, c.requirement_text as "requirementText", c.citation
          from controls c
          join control_sets cs on c.control_set_id = cs.id
          where c.tenant_id = $1 and cs.framework_version_id = $2
        `,
        [catalogTenantId, frameworkVersionId]
      );
      return res.rows;
    });
  }

  async fetchActiveControlInstances(tenantId: string, fromVersionId: string): Promise<unknown[]> {
    const catalogTenantId = await this.findVersionTenant(tenantId, fromVersionId);
    if (!catalogTenantId) return [];

    const catalogVersion = await this.db.withTenant(
      catalogTenantId,
      principalForCatalogTenant(catalogTenantId),
      async (client) => {
        const res = await client.query(
          `
            select f.framework_key as "frameworkKey", fv.version_key as "versionKey"
            from framework_versions fv
            join frameworks f on fv.framework_id = f.id
            where fv.tenant_id = $1 and fv.id = $2
          `,
          [catalogTenantId, fromVersionId]
        );
        return res.rows[0] as { frameworkKey: string; versionKey: string } | undefined;
      }
    );
    if (!catalogVersion) return [];

    return this.db.withTenant(tenantId, undefined, async (client) => {
      const res = await client.query(
        `
          select ci.id as "controlInstanceId", ci.assessment_id as "assessmentId", ci.control_id as "controlKey", ci.owner_id as "ownerId"
          from control_instances ci
          join assessments a on ci.assessment_id = a.id
          where ci.framework_key = $1 and ci.framework_version = $2 and a.status <> 'closed' and a.tenant_id = $3
        `,
        [catalogVersion.frameworkKey, catalogVersion.versionKey, tenantId]
      );
      return res.rows;
    });
  }

  async createDiff(input: {
    tenantId: string;
    frameworkId: string;
    fromVersionId: string;
    toVersionId: string;
    createdBy: string;
    items: Omit<FrameworkDiffItem, "id" | "version" | "diffId" | "createdBy" | "createdAt">[];
  }): Promise<FrameworkDiff> {
    return this.db.withTenant(input.tenantId, input.createdBy, async (client) => {
      const diffRes = await client.query(
        `
          insert into framework_diffs (tenant_id, framework_id, from_version_id, to_version_id, created_by, updated_by)
          values ($1, $2, $3, $4, $5, $5)
          returning id, tenant_id as "tenantId", version, framework_id as "frameworkId", from_version_id as "fromVersionId", to_version_id as "toVersionId", created_by as "createdBy", created_at as "createdAt"
        `,
        [input.tenantId, input.frameworkId, input.fromVersionId, input.toVersionId, input.createdBy]
      );
      const diff = diffRes.rows[0] as unknown as FrameworkDiff;

      for (const item of input.items) {
        await client.query(
          `
            insert into framework_diff_items (tenant_id, diff_id, change_type, control_key, old_value, new_value, created_by, updated_by)
            values ($1, $2, $3, $4, $5, $6, $7, $7)
          `,
          [
            input.tenantId,
            diff.id,
            item.changeType,
            item.controlKey,
            item.oldValue ? JSON.stringify(item.oldValue) : null,
            item.newValue ? JSON.stringify(item.newValue) : null,
            input.createdBy
          ]
        );
      }

      return {
        id: diff.id,
        tenantId: diff.tenantId,
        version: diff.version,
        frameworkId: diff.frameworkId,
        fromVersionId: diff.fromVersionId,
        toVersionId: diff.toVersionId,
        createdBy: diff.createdBy,
        createdAt: new Date(diff.createdAt)
      };
    });
  }

  async findDiff(tenantId: string, diffId: string): Promise<FrameworkDiff | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const res = await client.query(
        `
          select id, tenant_id as "tenantId", version, framework_id as "frameworkId", from_version_id as "fromVersionId", to_version_id as "toVersionId", created_by as "createdBy", created_at as "createdAt"
          from framework_diffs
          where tenant_id = $1 and id = $2
        `,
        [tenantId, diffId]
      );
      if (res.rows.length === 0) return null;
      const row = res.rows[0] as Record<string, unknown>;
      return {
        id: row.id as string,
        tenantId: row.tenantId as string,
        version: row.version as number,
        frameworkId: row.frameworkId as string,
        fromVersionId: row.fromVersionId as string,
        toVersionId: row.toVersionId as string,
        createdBy: row.createdBy as string,
        createdAt: new Date(row.createdAt as string)
      };
    });
  }

  async listDiffs(tenantId: string, pagination: Pagination): Promise<FrameworkDiff[]> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const res = await client.query(
        `
          select id, tenant_id as "tenantId", version, framework_id as "frameworkId", from_version_id as "fromVersionId", to_version_id as "toVersionId", created_by as "createdBy", created_at as "createdAt"
          from framework_diffs
          where tenant_id = $1
          order by created_at desc
          limit $2 offset $3
        `,
        [tenantId, pagination.limit, pagination.offset]
      );
      return res.rows.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        tenantId: row.tenantId as string,
        version: row.version as number,
        frameworkId: row.frameworkId as string,
        fromVersionId: row.fromVersionId as string,
        toVersionId: row.toVersionId as string,
        createdBy: row.createdBy as string,
        createdAt: new Date(row.createdAt as string)
      }));
    });
  }

  async listDiffItems(tenantId: string, diffId: string, pagination: Pagination): Promise<FrameworkDiffItem[]> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const res = await client.query(
        `
          select id, tenant_id as "tenantId", version, diff_id as "diffId", change_type as "changeType", control_key as "controlKey", old_value as "oldValue", new_value as "newValue", created_by as "createdBy", created_at as "createdAt"
          from framework_diff_items
          where tenant_id = $1 and diff_id = $2
          order by control_key asc
          limit $3 offset $4
        `,
        [tenantId, diffId, pagination.limit, pagination.offset]
      );
      return res.rows.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        tenantId: row.tenantId as string,
        version: row.version as number,
        diffId: row.diffId as string,
        changeType: row.changeType as "added" | "removed" | "modified",
        controlKey: row.controlKey as string,
        oldValue: row.oldValue ? (row.oldValue as Record<string, unknown>) : undefined,
        newValue: row.newValue ? (row.newValue as Record<string, unknown>) : undefined,
        createdBy: row.createdBy as string,
        createdAt: new Date(row.createdAt as string)
      }));
    });
  }

  async createImpacts(input: {
    tenantId: string;
    createdBy: string;
    impacts: {
      diffItemId: string;
      assessmentId: string;
      controlInstanceId?: string;
    }[];
  }): Promise<FrameworkUpdateImpact[]> {
    return this.db.withTenant(input.tenantId, input.createdBy, async (client) => {
      const createdImpacts: FrameworkUpdateImpact[] = [];
      for (const imp of input.impacts) {
        const res = await client.query(
          `
            insert into framework_update_impacts (tenant_id, diff_item_id, assessment_id, control_instance_id, created_by, updated_by)
            values ($1, $2, $3, $4, $5, $5)
            on conflict (tenant_id, diff_item_id, assessment_id, control_instance_id) do nothing
            returning id, tenant_id as "tenantId", version, diff_item_id as "diffItemId", assessment_id as "assessmentId", control_instance_id as "controlInstanceId", status, resolution_rationale as "resolutionRationale", resolved_by as "resolvedBy", resolved_at as "resolvedAt", created_by as "createdBy", created_at as "createdAt", updated_by as "updatedBy", updated_at as "updatedAt"
          `,
          [input.tenantId, imp.diffItemId, imp.assessmentId, imp.controlInstanceId ?? null, input.createdBy]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0] as Record<string, unknown>;
          createdImpacts.push({
            id: row.id as string,
            tenantId: row.tenantId as string,
            version: row.version as number,
            diffItemId: row.diffItemId as string,
            assessmentId: row.assessmentId as string,
            controlInstanceId: row.controlInstanceId as string | undefined,
            status: row.status as "pending" | "reassessed" | "accepted" | "ignored",
            resolutionRationale: row.resolutionRationale as string | undefined,
            resolvedBy: row.resolvedBy as string | undefined,
            resolvedAt: row.resolvedAt ? new Date(row.resolvedAt as string) : undefined,
            createdBy: row.createdBy as string,
            createdAt: new Date(row.createdAt as string),
            updatedBy: row.updatedBy as string,
            updatedAt: new Date(row.updatedAt as string)
          });
        }
      }
      return createdImpacts;
    });
  }

  async listImpacts(input: {
    tenantId: string;
    assessmentId?: string;
    controlInstanceId?: string;
    status?: string;
    pagination: Pagination;
  }): Promise<FrameworkUpdateImpact[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const params: unknown[] = [input.tenantId];
      let query = `
        select id, tenant_id as "tenantId", version, diff_item_id as "diffItemId", assessment_id as "assessmentId", control_instance_id as "controlInstanceId", status, resolution_rationale as "resolutionRationale", resolved_by as "resolvedBy", resolved_at as "resolvedAt", created_by as "createdBy", created_at as "createdAt", updated_by as "updatedBy", updated_at as "updatedAt"
        from framework_update_impacts
        where tenant_id = $1
      `;
      if (input.assessmentId) {
        params.push(input.assessmentId);
        query += ` and assessment_id = $${params.length}`;
      }
      if (input.controlInstanceId) {
        params.push(input.controlInstanceId);
        query += ` and control_instance_id = $${params.length}`;
      }
      if (input.status) {
        params.push(input.status);
        query += ` and status = $${params.length}`;
      }
      params.push(input.pagination.limit, input.pagination.offset);
      query += ` order by created_at desc limit $${params.length - 1} offset $${params.length}`;

      const res = await client.query(query, params);
      return res.rows.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        tenantId: row.tenantId as string,
        version: row.version as number,
        diffItemId: row.diffItemId as string,
        assessmentId: row.assessmentId as string,
        controlInstanceId: row.controlInstanceId as string | undefined,
        status: row.status as "pending" | "reassessed" | "accepted" | "ignored",
        resolutionRationale: row.resolutionRationale as string | undefined,
        resolvedBy: row.resolvedBy as string | undefined,
        resolvedAt: row.resolvedAt ? new Date(row.resolvedAt as string) : undefined,
        createdBy: row.createdBy as string,
        createdAt: new Date(row.createdAt as string),
        updatedBy: row.updatedBy as string,
        updatedAt: new Date(row.updatedAt as string)
      }));
    });
  }

  async findImpact(tenantId: string, impactId: string): Promise<FrameworkUpdateImpact | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const res = await client.query(
        `
          select id, tenant_id as "tenantId", version, diff_item_id as "diffItemId", assessment_id as "assessmentId", control_instance_id as "controlInstanceId", status, resolution_rationale as "resolutionRationale", resolved_by as "resolvedBy", resolved_at as "resolvedAt", created_by as "createdBy", created_at as "createdAt", updated_by as "updatedBy", updated_at as "updatedAt"
          from framework_update_impacts
          where tenant_id = $1 and id = $2
        `,
        [tenantId, impactId]
      );
      if (res.rows.length === 0) return null;
      const row = res.rows[0] as Record<string, unknown>;
      return {
        id: row.id as string,
        tenantId: row.tenantId as string,
        version: row.version as number,
        diffItemId: row.diffItemId as string,
        assessmentId: row.assessmentId as string,
        controlInstanceId: row.controlInstanceId as string | undefined,
        status: row.status as "pending" | "reassessed" | "accepted" | "ignored",
        resolutionRationale: row.resolutionRationale as string | undefined,
        resolvedBy: row.resolvedBy as string | undefined,
        resolvedAt: row.resolvedAt ? new Date(row.resolvedAt as string) : undefined,
        createdBy: row.createdBy as string,
        createdAt: new Date(row.createdAt as string),
        updatedBy: row.updatedBy as string,
        updatedAt: new Date(row.updatedAt as string)
      };
    });
  }

  async updateImpact(input: {
    tenantId: string;
    impactId: string;
    status: string;
    resolutionRationale: string;
    resolvedBy: string;
    updatedBy: string;
  }): Promise<FrameworkUpdateImpact> {
    return this.db.withTenant(input.tenantId, input.updatedBy, async (client) => {
      const res = await client.query(
        `
          update framework_update_impacts
          set status = $1, resolution_rationale = $2, resolved_by = $3, resolved_at = now(), updated_by = $4, updated_at = now(), version = version + 1
          where tenant_id = $5 and id = $6
          returning id, tenant_id as "tenantId", version, diff_item_id as "diffItemId", assessment_id as "assessmentId", control_instance_id as "controlInstanceId", status, resolution_rationale as "resolutionRationale", resolved_by as "resolvedBy", resolved_at as "resolvedAt", created_by as "createdBy", created_at as "createdAt", updated_by as "updatedBy", updated_at as "updatedAt"
        `,
        [input.status, input.resolutionRationale, input.resolvedBy, input.updatedBy, input.tenantId, input.impactId]
      );
      if (res.rows.length === 0) {
        throw new Error("Framework update impact not found or unauthorized update.");
      }
      const row = res.rows[0] as Record<string, unknown>;
      return {
        id: row.id as string,
        tenantId: row.tenantId as string,
        version: row.version as number,
        diffItemId: row.diffItemId as string,
        assessmentId: row.assessmentId as string,
        controlInstanceId: row.controlInstanceId as string | undefined,
        status: row.status as "pending" | "reassessed" | "accepted" | "ignored",
        resolutionRationale: row.resolutionRationale as string | undefined,
        resolvedBy: row.resolvedBy as string | undefined,
        resolvedAt: row.resolvedAt ? new Date(row.resolvedAt as string) : undefined,
        createdBy: row.createdBy as string,
        createdAt: new Date(row.createdAt as string),
        updatedBy: row.updatedBy as string,
        updatedAt: new Date(row.updatedAt as string)
      };
    });
  }

  async resolveVersionIds(tenantId: string, frameworkKey: string, fromVersionKey: string, toVersionKey: string): Promise<{ frameworkId: string; fromVersionId: string; toVersionId: string } | null> {
    for (const catalogTenantId of catalogTenantCandidates(tenantId)) {
      const ids = await this.db.withTenant(catalogTenantId, principalForCatalogTenant(catalogTenantId), async (client) => {
        const fwRes = await client.query(
          `select id from frameworks where tenant_id = $1 and framework_key = $2`,
          [catalogTenantId, frameworkKey]
        );
        if (fwRes.rows.length === 0) return null;
        const frameworkId = (fwRes.rows[0] as Record<string, unknown>).id;

        const fromRes = await client.query(
          `select id from framework_versions where tenant_id = $1 and framework_id = $2 and version_key = $3`,
          [catalogTenantId, frameworkId, fromVersionKey]
        );
        if (fromRes.rows.length === 0) return null;
        const fromVersionId = (fromRes.rows[0] as Record<string, unknown>).id;

        const toRes = await client.query(
          `select id from framework_versions where tenant_id = $1 and framework_id = $2 and version_key = $3`,
          [catalogTenantId, frameworkId, toVersionKey]
        );
        if (toRes.rows.length === 0) return null;
        const toVersionId = (toRes.rows[0] as Record<string, unknown>).id;

        return {
          frameworkId: frameworkId as string,
          fromVersionId: fromVersionId as string,
          toVersionId: toVersionId as string
        };
      });
      if (ids) return ids;
    }

    return null;
  }

  private async findVersionTenant(requestTenantId: string, frameworkVersionId: string): Promise<string | null> {
    for (const catalogTenantId of catalogTenantCandidates(requestTenantId)) {
      const found = await this.db.withTenant(catalogTenantId, principalForCatalogTenant(catalogTenantId), async (client) => {
        const res = await client.query(
          `select 1 from framework_versions where tenant_id = $1 and id = $2`,
          [catalogTenantId, frameworkVersionId]
        );
        return res.rows.length > 0;
      });
      if (found) return catalogTenantId;
    }

    return null;
  }
}

function catalogTenantCandidates(requestTenantId: string): string[] {
  return Array.from(new Set([requestTenantId, CANONICAL_CONTENT_TENANT_ID]));
}

function principalForCatalogTenant(catalogTenantId: string): string | undefined {
  return catalogTenantId === CANONICAL_CONTENT_TENANT_ID ? CANONICAL_CONTENT_ACTOR_ID : undefined;
}
