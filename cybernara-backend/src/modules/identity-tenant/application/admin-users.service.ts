import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_CLIENT } from "../../../platform/supabase/supabase.module.js";
import type { Classification } from "../../platform-hardening/public.js";
import {
  adminRoleCatalog,
  clearanceLevels,
  findAdminRole,
  scopesForRoleKeys,
  type AdminRoleDefinition
} from "./admin-role-catalog.js";
import type { AdminIdentityUser, AdminUsersRepository, AdminUserStatus } from "./admin-users.types.js";
import { ADMIN_USERS_REPOSITORY } from "./tokens.js";

export interface AdminRoleListResponse {
  roles: AdminRoleDefinition[];
  clearanceLevels: Classification[];
}

export interface InviteAdminUserResponse extends AdminIdentityUser {
  temporaryPassword: string;
}

@Injectable()
export class AdminUsersService {
  constructor(
    @Inject(ADMIN_USERS_REPOSITORY) private readonly repository: AdminUsersRepository,
    @Inject(SUPABASE_SERVICE_CLIENT) private readonly supabase: SupabaseClient
  ) {}

  listRoles(): AdminRoleListResponse {
    return { roles: adminRoleCatalog, clearanceLevels };
  }

  async listUsers(tenantId: string): Promise<AdminIdentityUser[]> {
    const users = await this.repository.listUsers(tenantId);
    return users.map(enrichScopes);
  }

  /**
   * A deliberately minimal projection of listUsers() - just enough to build
   * an "assign to" picker (id/email/display name/role) - exposed to anyone
   * who can create or manage assessment work, not gated behind full
   * admin_user:read. Never returns scopes, clearance, or status.
   */
  async listAssignableUsers(tenantId: string): Promise<Array<{ id: string; email: string; displayName?: string; roleKeys: string[] }>> {
    const users = await this.repository.listUsers(tenantId);
    return users
      .filter((user) => user.status === "active")
      .map((user) => ({ id: user.id, email: user.email, displayName: user.displayName, roleKeys: user.roleKeys }));
  }

  async inviteUser(input: {
    tenantId: string;
    actorId: string;
    email: string;
    displayName?: string;
    roleKey: string;
    clearance: Classification;
  }): Promise<InviteAdminUserResponse> {
    const role = requiredRole(input.roleKey);
    const email = input.email.trim().toLowerCase();
    const temporaryPassword = generateTemporaryPassword();
    const appMetadata = appMetadataFor({
      tenantId: input.tenantId,
      roleKeys: [role.roleKey],
      clearance: input.clearance,
      status: "active"
    });

    const created = await this.supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      app_metadata: appMetadata,
      user_metadata: input.displayName?.trim() ? { display_name: input.displayName.trim() } : undefined
    });
    if (created.error || !created.data.user) {
      throw new BadRequestException(`Unable to create Supabase Auth user: ${created.error?.message ?? "unknown error"}`);
    }

    try {
      const user = await this.repository.createUser({
        tenantId: input.tenantId,
        actorId: input.actorId,
        supabaseUserId: created.data.user.id,
        email,
        displayName: input.displayName,
        status: "active",
        clearance: input.clearance,
        role
      });
      return { ...enrichScopes(user), temporaryPassword };
    } catch (error) {
      await this.supabase.auth.admin.deleteUser(created.data.user.id).catch(() => undefined);
      throw error;
    }
  }

  async updateUser(input: {
    tenantId: string;
    actorId: string;
    userId: string;
    status?: AdminUserStatus;
    roleKey?: string;
    clearance?: Classification;
  }): Promise<AdminIdentityUser> {
    const current = await this.repository.findUser(input.tenantId, input.userId);
    if (!current) {
      throw new NotFoundException("Admin user not found.");
    }

    const role = input.roleKey ? requiredRole(input.roleKey) : undefined;
    const nextRoleKeys = role ? [role.roleKey] : current.roleKeys;
    const nextStatus = input.status ?? current.status;
    const nextClearance = input.clearance ?? current.clearance;

    await this.updateSupabaseMetadata(current.supabaseUserId, {
      tenantId: input.tenantId,
      roleKeys: nextRoleKeys,
      clearance: nextClearance,
      status: nextStatus
    });

    const updated = await this.repository.updateUser({
      tenantId: input.tenantId,
      actorId: input.actorId,
      userId: input.userId,
      status: input.status,
      clearance: input.clearance,
      role
    });
    if (!updated) {
      throw new NotFoundException("Admin user not found.");
    }
    return enrichScopes(updated);
  }

  private async updateSupabaseMetadata(
    supabaseUserId: string,
    input: { tenantId: string; roleKeys: string[]; clearance: Classification; status: AdminUserStatus }
  ): Promise<void> {
    const current = await this.supabase.auth.admin.getUserById(supabaseUserId);
    if (current.error || !current.data.user) {
      throw new BadRequestException(`Supabase Auth user not found: ${current.error?.message ?? supabaseUserId}`);
    }
    const metadata = {
      ...(current.data.user.app_metadata ?? {}),
      ...appMetadataFor(input)
    };
    const updated = await this.supabase.auth.admin.updateUserById(supabaseUserId, { app_metadata: metadata });
    if (updated.error) {
      throw new BadRequestException(`Unable to update Supabase Auth metadata: ${updated.error.message}`);
    }
  }
}

function requiredRole(roleKey: string): AdminRoleDefinition {
  const role = findAdminRole(roleKey);
  if (!role) {
    throw new BadRequestException(`Unsupported roleKey '${roleKey}'.`);
  }
  return role;
}

function enrichScopes(user: AdminIdentityUser): AdminIdentityUser {
  return { ...user, scopes: scopesForRoleKeys(user.roleKeys) };
}

function appMetadataFor(input: {
  tenantId: string;
  roleKeys: string[];
  clearance: Classification;
  status: AdminUserStatus;
}): Record<string, unknown> {
  return {
    tenant_id: input.tenantId,
    roles: input.roleKeys,
    scopes: scopesForRoleKeys(input.roleKeys),
    clearance: input.clearance,
    status: input.status
  };
}

function generateTemporaryPassword(): string {
  return `Cybernara-${randomBytes(18).toString("base64url")}-Aa1!`;
}
