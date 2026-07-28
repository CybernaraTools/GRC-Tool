import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Classification, TenantStatus } from "../domain/identity-tenant.js";
import { AdminUsersService } from "./admin-users.service.js";
import type {
  InviteTenantAdminResponse,
  PlatformDashboard,
  PlatformDashboardTenant,
  PlatformDashboardTotals,
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

  async getDashboard(): Promise<PlatformDashboard> {
    const tenants = await this.repository.getDashboard();
    return {
      generatedAt: new Date(),
      totals: dashboardTotals(tenants),
      tenants
    };
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

  async deactivateTenant(input: { operatorUserId: string; tenantId: string }): Promise<PlatformTenant> {
    return this.setTenantStatus({
      operatorUserId: input.operatorUserId,
      tenantId: input.tenantId,
      status: "suspended"
    });
  }

  async activateTenant(input: { operatorUserId: string; tenantId: string }): Promise<PlatformTenant> {
    return this.setTenantStatus({
      operatorUserId: input.operatorUserId,
      tenantId: input.tenantId,
      status: "active"
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
    if (tenant.status !== "active") {
      throw new BadRequestException("Tenant must be active before provisioning tenant admins.");
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

  private async setTenantStatus(input: {
    operatorUserId: string;
    tenantId: string;
    status: Extract<TenantStatus, "active" | "suspended">;
  }): Promise<PlatformTenant> {
    const tenant = await this.repository.findTenantById(input.tenantId);
    if (!tenant) {
      throw new NotFoundException("Tenant not found.");
    }

    const updated = await this.repository.updateTenantStatus({
      tenantId: input.tenantId,
      status: input.status,
      updatedBy: input.operatorUserId
    });
    if (!updated) {
      throw new NotFoundException("Tenant not found.");
    }

    await this.adminUsers.syncTenantAccessMetadata({
      tenantId: input.tenantId,
      tenantStatus: input.status
    });
    return updated;
  }
}

function dashboardTotals(tenants: PlatformDashboardTenant[]): PlatformDashboardTotals {
  const totalQuestions = sum(tenants, (tenant) => tenant.totalQuestions);
  const completedQuestions = sum(tenants, (tenant) => tenant.completedQuestions);
  return {
    tenantCount: tenants.length,
    activeTenantCount: tenants.filter((tenant) => tenant.status === "active").length,
    userCount: sum(tenants, (tenant) => tenant.userCount),
    activeUserCount: sum(tenants, (tenant) => tenant.activeUserCount),
    enabledFrameworkCount: sum(tenants, (tenant) => tenant.enabledFrameworkCount),
    totalQuestions,
    completedQuestions,
    remainingQuestions: sum(tenants, (tenant) => tenant.remainingQuestions),
    compliancePercent: totalQuestions > 0 ? round2((completedQuestions / totalQuestions) * 100) : 0,
    assessmentCount: sum(tenants, (tenant) => tenant.assessmentCount),
    openAssessmentCount: sum(tenants, (tenant) => tenant.openAssessmentCount),
    closedAssessmentCount: sum(tenants, (tenant) => tenant.closedAssessmentCount),
    evidenceObjectCount: sum(tenants, (tenant) => tenant.evidenceObjectCount),
    committedEvidenceObjectCount: sum(tenants, (tenant) => tenant.committedEvidenceObjectCount),
    findingCount: sum(tenants, (tenant) => tenant.findingCount),
    openFindingCount: sum(tenants, (tenant) => tenant.openFindingCount),
    riskCount: sum(tenants, (tenant) => tenant.riskCount),
    openRiskCount: sum(tenants, (tenant) => tenant.openRiskCount),
    taskCount: sum(tenants, (tenant) => tenant.taskCount),
    pendingTaskCount: sum(tenants, (tenant) => tenant.pendingTaskCount)
  };
}

function sum(tenants: PlatformDashboardTenant[], selector: (tenant: PlatformDashboardTenant) => number): number {
  return tenants.reduce((total, tenant) => total + selector(tenant), 0);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
