import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Classification } from "../domain/identity-tenant.js";
import { AdminUsersService } from "./admin-users.service.js";
import type {
  InviteTenantAdminResponse,
  PlatformOnboardingRepository,
  PlatformOperator,
  PlatformRole,
  PlatformTenant
} from "./platform-onboarding.types.js";
import { PLATFORM_ONBOARDING_REPOSITORY } from "./tokens.js";

@Injectable()
export class PlatformOnboardingService {
  constructor(
    @Inject(PLATFORM_ONBOARDING_REPOSITORY)
    private readonly repository: PlatformOnboardingRepository,
    @Inject(AdminUsersService) private readonly adminUsers: AdminUsersService
  ) {}

  async assertActiveOperator(input: { supabaseUserId: string; platformRole: PlatformRole }): Promise<PlatformOperator> {
    const operator = await this.repository.findActiveOperator(input);
    if (!operator) {
      throw new ForbiddenException("Active platform operator not found.");
    }
    return operator;
  }

  async listTenants(): Promise<PlatformTenant[]> {
    return this.repository.listTenants();
  }

  async createTenant(input: {
    operatorUserId: string;
    name: string;
    classification?: Classification;
  }): Promise<PlatformTenant> {
    const name = input.name.trim();
    if (name.length < 2) {
      throw new BadRequestException("Tenant name must be at least 2 characters.");
    }
    return this.repository.createTenant({
      tenantId: randomUUID(),
      name,
      classification: input.classification ?? "confidential",
      createdBy: input.operatorUserId
    });
  }

  async inviteFirstAdmin(input: {
    operatorUserId: string;
    tenantId: string;
    email: string;
    displayName?: string;
    roleKey?: string;
    clearance?: Classification;
  }): Promise<InviteTenantAdminResponse> {
    const tenant = await this.repository.findTenantById(input.tenantId);
    if (!tenant) {
      throw new NotFoundException("Tenant not found.");
    }
    return this.adminUsers.inviteUser({
      tenantId: input.tenantId,
      actorId: input.operatorUserId,
      email: input.email,
      displayName: input.displayName,
      roleKey: input.roleKey ?? "platform_admin",
      clearance: input.clearance ?? "restricted"
    });
  }
}
