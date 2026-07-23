import { Inject, Injectable } from "@nestjs/common";
import {
  createTenant,
  type Classification,
  type Tenant
} from "../domain/identity-tenant.js";
import { IDENTITY_TENANT_REPOSITORY } from "./tokens.js";

export interface IdentityTenantRepository {
  saveTenant(tenant: Tenant): Promise<void>;
  findTenantById(tenantId: string): Promise<Tenant | null>;
}

@Injectable()
export class IdentityTenantService {
  constructor(
    @Inject(IDENTITY_TENANT_REPOSITORY)
    private readonly repository: IdentityTenantRepository
  ) {}

  async registerTenant(input: {
    id: string;
    name: string;
    createdBy: string;
    classification?: Classification;
  }): Promise<Tenant> {
    const tenant = createTenant(input);
    await this.repository.saveTenant(tenant);
    return tenant;
  }

  async getTenant(tenantId: string): Promise<Tenant | null> {
    return this.repository.findTenantById(tenantId);
  }
}

