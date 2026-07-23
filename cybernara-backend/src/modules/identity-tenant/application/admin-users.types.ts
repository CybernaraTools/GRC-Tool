import type { Classification } from "../../platform-hardening/public.js";
import type { AdminRoleDefinition } from "./admin-role-catalog.js";

export type AdminUserStatus = "active" | "invited" | "disabled";

export interface AdminIdentityUser {
  id: string;
  tenantId: string;
  supabaseUserId: string;
  email: string;
  displayName?: string;
  status: AdminUserStatus;
  clearance: Classification;
  roleKeys: string[];
  scopes: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUsersRepository {
  listUsers(tenantId: string): Promise<AdminIdentityUser[]>;
  findUser(tenantId: string, userId: string): Promise<AdminIdentityUser | null>;
  createUser(input: {
    tenantId: string;
    actorId: string;
    supabaseUserId: string;
    email: string;
    displayName?: string;
    status: AdminUserStatus;
    clearance: Classification;
    role: AdminRoleDefinition;
  }): Promise<AdminIdentityUser>;
  updateUser(input: {
    tenantId: string;
    actorId: string;
    userId: string;
    status?: AdminUserStatus;
    clearance?: Classification;
    role?: AdminRoleDefinition;
  }): Promise<AdminIdentityUser | null>;
}
