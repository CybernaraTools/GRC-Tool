export type TenantStatus = "active" | "suspended" | "archived";
export type Classification = "public" | "internal" | "confidential" | "restricted";

export interface Tenant {
  id: string;
  name: string;
  status: TenantStatus;
  classification: Classification;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface RoleGrant {
  tenantId: string;
  userId: string;
  roleKey: string;
  resourceType: string;
  resourceId: string;
  grantedBy: string;
  expiresAt?: Date;
}

export interface ServiceAccount {
  tenantId: string;
  name: string;
  scopes: string[];
  createdBy: string;
}

export interface WorkspaceDelegation {
  tenantId: string;
  workspaceId: string;
  principalUserId: string;
  delegatedBy: string;
  expiresAt: Date;
  reason: string;
}

export function createTenant(input: {
  id: string;
  name: string;
  createdBy: string;
  now?: Date;
  classification?: Classification;
}): Tenant {
  const now = input.now ?? new Date();
  const name = input.name.trim();

  if (name.length < 2) {
    throw new Error("Tenant name must be at least 2 characters.");
  }

  return {
    id: input.id,
    name,
    status: "active",
    classification: input.classification ?? "confidential",
    version: 1,
    createdBy: input.createdBy,
    createdAt: now,
    updatedBy: input.createdBy,
    updatedAt: now
  };
}

