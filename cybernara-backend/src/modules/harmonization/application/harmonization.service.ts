import { Inject, Injectable } from "@nestjs/common";
import type { Pagination } from "../../../shared/pagination.js";
import { TenantScopedDb } from "../../../platform/database/tenant-scoped-db.js";
import { CANONICAL_CONTENT_TENANT_ID } from "../../framework-content/public.js";
import { HARMONIZATION_REPOSITORY } from "./tokens.js";
import type { HarmonizationRepository } from "./harmonization.types.js";

@Injectable()
export class HarmonizationService {
  constructor(
    @Inject(HARMONIZATION_REPOSITORY) private readonly repository: HarmonizationRepository,
    @Inject(TenantScopedDb) private readonly db: TenantScopedDb
  ) {}

  async listControls(tenantId: string, pagination: Pagination) {
    const frameworkKeys = await this.enabledFrameworkKeys(tenantId);
    return this.repository.listControlsForFrameworkKeys(catalogReadTenantId(), frameworkKeys, pagination);
  }

  async getControl(tenantId: string, harmonizedId: string) {
    const frameworkKeys = await this.enabledFrameworkKeys(tenantId);
    return this.repository.findControlForFrameworkKeys(catalogReadTenantId(), harmonizedId, frameworkKeys);
  }

  async listMappingsByControl(tenantId: string, harmonizedId: string, pagination: Pagination) {
    const frameworkKeys = await this.enabledFrameworkKeys(tenantId);
    return this.repository.listMappingsByControl(catalogReadTenantId(), harmonizedId, pagination, frameworkKeys);
  }

  async listMappingsByFramework(tenantId: string, frameworkKey: string, pagination: Pagination) {
    if (!(await this.isFrameworkEnabled(tenantId, frameworkKey))) {
      return [];
    }
    return this.repository.listMappingsByFramework(catalogReadTenantId(), frameworkKey, pagination);
  }

  async listUniqueControlsByFramework(tenantId: string, frameworkKey: string, pagination: Pagination) {
    if (!(await this.isFrameworkEnabled(tenantId, frameworkKey))) {
      return [];
    }
    return this.repository.listUniqueControlsByFramework(catalogReadTenantId(), frameworkKey, pagination);
  }

  async listGlobalControls(pagination: Pagination) {
    return this.repository.listControls(catalogReadTenantId(), pagination);
  }

  async getGlobalControl(harmonizedId: string) {
    return this.repository.findControl(catalogReadTenantId(), harmonizedId);
  }

  async listGlobalMappingsByControl(harmonizedId: string, pagination: Pagination) {
    return this.repository.listMappingsByControl(catalogReadTenantId(), harmonizedId, pagination);
  }

  async listGlobalMappingsByFramework(frameworkKey: string, pagination: Pagination) {
    return this.repository.listMappingsByFramework(catalogReadTenantId(), frameworkKey, pagination);
  }

  async listGlobalUniqueControlsByFramework(frameworkKey: string, pagination: Pagination) {
    return this.repository.listUniqueControlsByFramework(catalogReadTenantId(), frameworkKey, pagination);
  }

  private async enabledFrameworkKeys(tenantId: string): Promise<string[]> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select distinct f.framework_key
          from tenant_catalog_subscriptions s
          join frameworks f on f.id = s.framework_id and f.tenant_id = $2
          where s.tenant_id = $1
            and s.status = 'active'
          order by f.framework_key
        `,
        [tenantId, catalogReadTenantId()]
      );
      return result.rows.map((row) => String(row.framework_key));
    });
  }

  private async isFrameworkEnabled(tenantId: string, frameworkKey: string): Promise<boolean> {
    const frameworkKeys = await this.enabledFrameworkKeys(tenantId);
    return frameworkKeys.includes(frameworkKey);
  }
}

function catalogReadTenantId(): string {
  return CANONICAL_CONTENT_TENANT_ID;
}
