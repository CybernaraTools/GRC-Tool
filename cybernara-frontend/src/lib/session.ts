import { cookies } from "next/headers";
import { z } from "zod";
import { createSupabaseSessionClient } from "./supabase/server";

export const accessTokenCookieName = "sb-access-token";
export const refreshTokenCookieName = "sb-refresh-token";

export const clearanceLevels = ["public", "internal", "confidential", "restricted"] as const;

export const tenantSessionContextSchema = z.object({
  kind: z.literal("tenant"),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  email: z.string().email().optional(),
  roles: z.array(z.string()),
  scopes: z.array(z.string()),
  clearance: z.enum(clearanceLevels)
});

export const platformSessionContextSchema = z.object({
  kind: z.literal("platform"),
  userId: z.string().uuid(),
  email: z.string().email().optional(),
  platformRole: z.literal("super_admin")
});

export type TenantSessionContext = z.infer<typeof tenantSessionContextSchema>;
export type PlatformSessionContext = z.infer<typeof platformSessionContextSchema>;
export type SessionContext = TenantSessionContext | PlatformSessionContext;

type SupabaseSessionUser = {
  id: string;
  email?: string;
  app_metadata: Record<string, unknown>;
};

export async function readSessionContext(): Promise<SessionContext | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(accessTokenCookieName)?.value;
  return readSessionContextFromAccessToken(accessToken);
}

export async function readSessionContextFromAccessToken(accessToken?: string | null): Promise<SessionContext | null> {
  if (!accessToken) {
    return null;
  }

  const supabase = createSupabaseSessionClient(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }

  return sessionContextFromSupabaseUser(data.user);
}

export function sessionContextFromSupabaseUser(user: SupabaseSessionUser): SessionContext | null {
  const metadata = user.app_metadata as Record<string, unknown>;
  if (metadata.status === "disabled" || metadata.active === false) {
    return null;
  }

  if (metadata.platform_role === "super_admin") {
    const platformParsed = platformSessionContextSchema.safeParse({
      kind: "platform",
      userId: user.id,
      email: user.email,
      platformRole: metadata.platform_role
    });
    return platformParsed.success ? platformParsed.data : null;
  }

  const parsed = tenantSessionContextSchema.safeParse({
    kind: "tenant",
    tenantId: metadata.tenant_id,
    userId: user.id,
    email: user.email,
    roles: stringArray(metadata.roles),
    scopes: stringArray(metadata.scopes),
    clearance: typeof metadata.clearance === "string" ? metadata.clearance : "public"
  });

  return parsed.success ? parsed.data : null;
}

export function sessionBackendHeaders(session: SessionContext): Record<string, string> {
  if (session.kind === "platform") {
    return {
      "x-user-id": session.userId,
      "x-platform-role": session.platformRole,
      ...(session.email ? { "x-user-email": session.email } : {})
    };
  }

  return {
    "x-tenant-id": session.tenantId,
    "x-user-id": session.userId,
    "x-user-roles": session.roles.join(","),
    "x-user-scopes": session.scopes.join(","),
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
