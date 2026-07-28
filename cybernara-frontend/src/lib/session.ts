import { cookies } from "next/headers";
import { z } from "zod";
import { createSupabaseSessionClient } from "./supabase/server";

export const accessTokenCookieName = "sb-access-token";
export const refreshTokenCookieName = "sb-refresh-token";

export const clearanceLevels = ["public", "internal", "confidential", "restricted"] as const;

export type TenantSessionContext = {
  kind: "tenant";
  userId: string;
  tenantId: string;
  roles: string[];
  scopes: string[];
  clearance: string;
  email?: string;
};

export type PlatformSessionContext = {
  kind: "platform";
  userId: string;
  platformRole: string;
  email?: string;
};

export type SessionContext = TenantSessionContext | PlatformSessionContext;

const tenantMetadataSchema = z.object({
  tenant_id: z.string().uuid(),
  roles: z.array(z.string()).default(["viewer"]),
  scopes: z.array(z.string()).default([]),
  clearance: z.string().default("public"),
  status: z.enum(["active", "invited", "disabled"]).default("active"),
  tenant_status: z.enum(["active", "suspended", "archived"]).optional()
});

export async function readSessionContext(): Promise<SessionContext | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(accessTokenCookieName)?.value;
  return readSessionContextFromAccessToken(accessToken);
}

export async function readSessionContextFromAccessToken(accessToken?: string): Promise<SessionContext | null> {
  if (!accessToken) {
    return null;
  }
  const supabase = createSupabaseSessionClient(accessToken);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  return sessionContextFromSupabaseUser(data.user);
}

export function sessionContextFromSupabaseUser(user: { id: string; email?: string; app_metadata?: Record<string, unknown> }): SessionContext | null {
  const metadata = user.app_metadata || {};
  const userEmail = user.email;

  if (typeof metadata.platform_role === "string") {
    return {
      kind: "platform",
      userId: user.id,
      platformRole: metadata.platform_role,
      email: userEmail
    };
  }

  const parsed = tenantMetadataSchema.safeParse({
    tenant_id: metadata.tenant_id,
    roles: stringArray(metadata.roles),
    scopes: stringArray(metadata.scopes),
    clearance: typeof metadata.clearance === "string" ? metadata.clearance : "public",
    status: typeof metadata.status === "string" ? metadata.status : "active",
    tenant_status: typeof metadata.tenant_status === "string" ? metadata.tenant_status : undefined
  });

  if (!parsed.success) {
    return null;
  }

  if (parsed.data.status !== "active" || parsed.data.tenant_status === "suspended" || parsed.data.tenant_status === "archived") {
    return null;
  }

  return {
    kind: "tenant",
    userId: user.id,
    tenantId: parsed.data.tenant_id,
    roles: parsed.data.roles,
    scopes: parsed.data.scopes,
    clearance: parsed.data.clearance,
    email: userEmail
  };
}

export function sessionBackendHeaders(session: SessionContext): Record<string, string> {
  if (session.kind === "platform") {
    return {
      "x-user-id": session.userId,
      "x-platform-role": session.platformRole,
      ...(session.email ? { "x-user-email": session.email } : {})
    };
  }

  const defaultScopes = [
    "audit_event:read",
    "assessment:read",
    "assessment:write",
    "assessment:review",
    "finding:read",
    "finding:write",
    "risk:read",
    "risk:write",
    "remediation_task:read",
    "remediation_task:write",
    "universal_task:read",
    "universal_task:write",
    "framework-content:read",
    "questions_dashboard:read"
  ];

  const scopes = Array.from(new Set([...session.scopes, ...defaultScopes]));

  return {
    "x-tenant-id": session.tenantId,
    "x-user-id": session.userId,
    "x-user-roles": session.roles.join(","),
    "x-user-scopes": scopes.join(","),
    "x-user-clearance": session.clearance
  };
}

function stringArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }
  return input.filter((item): item is string => typeof item === "string");
}

export function isPlatformSession(session: SessionContext | null): session is PlatformSessionContext {
  return session?.kind === "platform";
}

export function isTenantSession(session: SessionContext | null): session is TenantSessionContext {
  return session?.kind === "tenant";
}
