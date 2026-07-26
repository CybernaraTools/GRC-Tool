export type UserRole = "platform_admin" | "compliance_manager" | "auditor" | "viewer";

export type SessionClaims = {
  roles?: string[];
  scopes?: string[];
  kind?: string;
  platformRole?: string;
};

export type FeatureKey = "privacy" | "enterprise";

const featurePolicies: Record<FeatureKey, { roles: UserRole[]; readScopes: string[] }> = {
  privacy: {
    roles: ["platform_admin", "compliance_manager"],
    readScopes: []
  },
  enterprise: {
    roles: ["platform_admin"],
    readScopes: []
  }
};

export function canPerform(session: SessionClaims | null, requiredScopes: string | string[]): boolean {
  const scopes = Array.isArray(requiredScopes) ? requiredScopes : [requiredScopes];
  if (scopes.length === 0) return true;
  return hasAllScopes(session, scopes);
}

export function canAccessFeature(session: SessionClaims | null, feature: FeatureKey): boolean {
  const policy = featurePolicies[feature];
  return hasAnyRole(session, policy.roles);
}

export function accessDeniedDetail(session: SessionClaims | null, feature: FeatureKey): string {
  const policy = featurePolicies[feature];
  if (!hasAnyRole(session, policy.roles)) {
    return `Your role is not allowed to open this workspace. Allowed roles: ${policy.roles.join(", ")}.`;
  }
  return "Access denied.";
}

export function hasAnyRole(session: SessionClaims | null, roles: UserRole[]): boolean {
  if (!session) return false;
  if (session.kind === "platform" || session.platformRole === "super_admin") {
    return true;
  }
  const sessionRoles = (session.roles || []).map((role) => role.toLowerCase());
  const allowedRoles = roles.map((role) => role.toLowerCase());
  return allowedRoles.some((role) => sessionRoles.includes(role));
}

export function hasAllScopes(session: SessionClaims | null, scopes: string[]): boolean {
  if (scopes.length === 0) return true;
  if (session?.kind === "platform") return true;
  const sessionScopes = session?.scopes || [];
  return scopes.every((scope) => sessionScopes.includes(scope));
}

// Custom RBAC Matrix Action Helpers
export function canCreateAssessment(session: SessionClaims | null): boolean {
  return hasAnyRole(session, ["platform_admin", "auditor"]);
}

export function canAnswerQuestion(session: SessionClaims | null): boolean {
  return hasAnyRole(session, ["platform_admin", "compliance_manager"]);
}

export function canReviewAssessment(session: SessionClaims | null): boolean {
  return hasAnyRole(session, ["platform_admin", "auditor"]);
}

export function canRaiseFinding(session: SessionClaims | null): boolean {
  return hasAnyRole(session, ["platform_admin", "auditor"]);
}

export function canCreateRisk(session: SessionClaims | null): boolean {
  return hasAnyRole(session, ["platform_admin", "auditor"]);
}

export function canExecuteRemediation(session: SessionClaims | null): boolean {
  return hasAnyRole(session, ["platform_admin", "compliance_manager"]);
}

export function canAcceptRisk(session: SessionClaims | null): boolean {
  return hasAnyRole(session, ["platform_admin", "compliance_manager"]);
}

export function canManageUsers(session: SessionClaims | null): boolean {
  return hasAnyRole(session, ["platform_admin"]);
}

export function canGenerateAiQuestions(session: SessionClaims | null): boolean {
  return hasAnyRole(session, ["platform_admin", "auditor"]);
}

export function isOnlyViewer(session: SessionClaims | null): boolean {
  if (!session) return false;
  if (session.kind === "platform" || session.platformRole === "super_admin") return false;
  const roles = (session.roles || []).map((r) => r.toLowerCase());
  return roles.includes("viewer") && !roles.some((r) => ["platform_admin", "auditor", "compliance_manager"].includes(r as UserRole));
}
