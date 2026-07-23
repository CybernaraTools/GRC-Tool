import type { Classification, TenantStatus } from "../domain/identity-tenant.js";
import type { InviteAdminUserResponse } from "./admin-users.service.js";

export type PlatformRole = "super_admin";
export type PlatformOperatorStatus = "active" | "disabled";

export interface PlatformOperator {
  id: string;
  supabaseUserId: string;
  email: string;
  displayName?: string;
  platformRole: PlatformRole;
  status: PlatformOperatorStatus;
  classification: Classification;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformTenant {
  id: string;
  name: string;
  status: TenantStatus;
  classification: Classification;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformOnboardingRepository {
  findActiveOperator(input: { supabaseUserId: string; platformRole: PlatformRole }): Promise<PlatformOperator | null>;
  listTenants(): Promise<PlatformTenant[]>;
  findTenantById(tenantId: string): Promise<PlatformTenant | null>;
  createTenant(input: {
    tenantId: string;
    name: string;
    classification: Classification;
    createdBy: string;
  }): Promise<PlatformTenant>;
}

export type InviteTenantAdminResponse = InviteAdminUserResponse;
