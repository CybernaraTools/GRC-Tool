export type UserRole = "platform_admin" | "compliance_manager" | "auditor" | "viewer";

export type SessionClaims = {
  roles: string[];
  scopes: string[];
};

export type FeatureKey = "privacy" | "enterprise";

const featurePolicies: Record<FeatureKey, { roles: UserRole[]; readScopes: string[] }> = {
  privacy: {
    roles: ["platform_admin", "compliance_manager"],
    readScopes: [
      "data_inventory_record:read",
      "processing_activity:read",
      "dpia_assessment:read",
      "privacy_rights_request:read",
      "consent_record:read",
      "privacy_incident:read",
      "retention_schedule:read"
    ]
  },
  enterprise: {
    roles: ["platform_admin", "compliance_manager", "auditor"],
    readScopes: [
      "policy_version:read",
      "access_review:read",
      "vendor:read",
      "audit_engagement:read",
      "trust_center_artifact:read",
      "grc_workspace:read",
      "custom_object_definition:read"
    ]
  }
};

export function canPerform(session: SessionClaims | null, requiredScopes: string | string[]): boolean {
  const scopes = Array.isArray(requiredScopes) ? requiredScopes : [requiredScopes];
  return hasAllScopes(session, scopes);
}

export function canAccessFeature(session: SessionClaims | null, feature: FeatureKey): boolean {
  const policy = featurePolicies[feature];
  return hasAnyRole(session, policy.roles) && hasAllScopes(session, policy.readScopes);
}

export function accessDeniedDetail(session: SessionClaims | null, feature: FeatureKey): string {
  const policy = featurePolicies[feature];
  if (!hasAnyRole(session, policy.roles)) {
    return `Your role is not allowed to open this workspace. Allowed roles: ${policy.roles.join(", ")}.`;
  }
  const missingScopes = policy.readScopes.filter((scope) => !session?.scopes.includes(scope));
  return `Your session is missing required read scope(s): ${missingScopes.join(", ")}.`;
}

export function hasAnyRole(session: SessionClaims | null, roles: UserRole[]): boolean {
  return roles.some((role) => session?.roles.includes(role));
}

export function hasAllScopes(session: SessionClaims | null, scopes: string[]): boolean {
  return scopes.every((scope) => session?.scopes.includes(scope));
}
