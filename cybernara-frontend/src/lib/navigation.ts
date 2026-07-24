import { hasAllScopes, type SessionClaims, type UserRole } from "./authorization";
import type { SessionContext } from "./session";

export type { UserRole } from "./authorization";
export type UploadScanStatus = "quarantined" | "clean" | "malicious";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
  savedViews: boolean;
  bulkActions: boolean;
  publicPreview: boolean;
  requiredScopes: string[];
}

export const operationalNavItems: NavItem[] = [
  {
    label: "Audit Log",
    href: "/audit",
    icon: "history",
    roles: ["platform_admin", "compliance_manager", "auditor"],
    savedViews: true,
    bulkActions: false,
    publicPreview: true,
    requiredScopes: ["audit_event:read"]
  },
  {
    label: "User Admin",
    href: "/admin/users",
    icon: "manage_accounts",
    roles: ["platform_admin"],
    savedViews: false,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: ["admin_user:read", "admin_role:read"]
  },
  {
    label: "My Tasks",
    href: "/tasks",
    icon: "task",
    roles: ["platform_admin", "compliance_manager", "auditor", "viewer"],
    savedViews: true,
    bulkActions: false,
    publicPreview: true,
    requiredScopes: ["universal_task:read"]
  },
  {
    label: "Framework Library",
    href: "/frameworks",
    icon: "policy",
    roles: ["platform_admin", "compliance_manager", "auditor", "viewer"],
    savedViews: true,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: ["framework-content:read"]
  },
  {
    label: "Framework Updates",
    href: "/frameworks/updates",
    icon: "upgrade",
    roles: ["platform_admin", "compliance_manager", "auditor"],
    savedViews: false,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: ["framework_diff:read"]
  },
  {
    label: "Harmonization",
    href: "/harmonization",
    icon: "hub",
    roles: ["platform_admin", "compliance_manager", "auditor", "viewer"],
    savedViews: true,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: ["harmonization:read"]
  },
  {
    label: "Assessments",
    href: "/assessments",
    icon: "assignment",
    roles: ["platform_admin", "compliance_manager", "auditor", "viewer"],
    savedViews: true,
    bulkActions: true,
    publicPreview: true,
    requiredScopes: ["assessment:read"]
  },
  {
    label: "Assessment Review",
    href: "/assessments/review",
    icon: "fact_check",
    roles: ["platform_admin", "compliance_manager", "auditor"],
    savedViews: true,
    bulkActions: true,
    publicPreview: false,
    requiredScopes: ["assessment:read", "assessment:review"]
  },
  {
    label: "Audit Reports",
    href: "/reports",
    icon: "summarize",
    roles: ["platform_admin", "compliance_manager", "auditor"],
    savedViews: true,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: []
  },
  {
    label: "Findings",
    href: "/findings",
    icon: "report_problem",
    roles: ["platform_admin", "compliance_manager", "auditor"],
    savedViews: true,
    bulkActions: true,
    publicPreview: false,
    requiredScopes: ["finding:read"]
  },
  {
    label: "Risk & Acceptance",
    href: "/risks",
    icon: "monitoring",
    roles: ["platform_admin", "compliance_manager", "auditor"],
    savedViews: true,
    bulkActions: true,
    publicPreview: false,
    requiredScopes: ["finding:read", "remediation_task:read", "risk:read"]
  },
  {
    label: "AI Review",
    href: "/ai",
    icon: "smart_toy",
    roles: ["platform_admin", "compliance_manager", "auditor"],
    savedViews: true,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: ["ai_generation_run:read", "ai_question_version:read"]
  },
  {
    label: "Integrations",
    href: "/integrations",
    icon: "cable",
    roles: ["platform_admin", "compliance_manager", "auditor"],
    savedViews: true,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: ["connector:read"]
  },
  {
    label: "Privacy Operations",
    href: "/privacy",
    icon: "privacy_tip",
    roles: ["platform_admin", "compliance_manager", "auditor"],
    savedViews: true,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: [
      "data_inventory_record:read",
      "processing_activity:read",
      "dpia_assessment:read",
      "privacy_rights_request:read",
      "consent_record:read",
      "privacy_incident:read",
      "retention_schedule:read"
    ]
  },
  {
    label: "Enterprise GRC",
    href: "/enterprise",
    icon: "corporate_fare",
    roles: ["platform_admin", "compliance_manager", "auditor", "viewer"],
    savedViews: false,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: [
      "policy_version:read",
      "access_review:read",
      "vendor:read",
      "audit_engagement:read",
      "trust_center_artifact:read",
      "grc_workspace:read",
      "custom_object_definition:read"
    ]
  }
];

export const platformNavItems: NavItem[] = [
  {
    label: "Client Onboarding",
    href: "/platform/tenants",
    icon: "domain_add",
    roles: [],
    savedViews: false,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: []
  },
  {
    label: "Question Repository",
    href: "/platform/questions",
    icon: "quiz",
    roles: [],
    savedViews: true,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: []
  },
  {
    label: "Framework Library",
    href: "/frameworks",
    icon: "policy",
    roles: [],
    savedViews: true,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: []
  },
  {
    label: "Framework Updates",
    href: "/frameworks/updates",
    icon: "upgrade",
    roles: [],
    savedViews: false,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: []
  },
  {
    label: "Harmonization",
    href: "/harmonization",
    icon: "hub",
    roles: [],
    savedViews: true,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: []
  }
];

export function visibleNavForRole(role: UserRole): NavItem[] {
  return operationalNavItems.filter((item) => item.roles.includes(role));
}

export function visibleNavForSession(session: (SessionClaims & { kind?: string }) | SessionContext | null): NavItem[] {
  if (!session) {
    return operationalNavItems.filter((item) => item.publicPreview);
  }
  if ("kind" in session && session.kind === "platform") {
    return platformNavItems;
  }
  const tenantSession = session as SessionClaims;
  const role = resolvePrimaryRole(tenantSession.roles ?? []);
  if (!role) {
    return [];
  }
  return visibleNavForRole(role).filter((item) => hasAllScopes(tenantSession, item.requiredScopes));
}

export function resolvePrimaryRole(roles: string[]): UserRole | null {
  for (const role of ["platform_admin", "compliance_manager", "auditor", "viewer"] as const) {
    if (roles.includes(role)) {
      return role;
    }
  }
  return null;
}

export function uploadAccessState(status: UploadScanStatus): { accessible: boolean; label: string } {
  if (status === "clean") {
    return { accessible: true, label: "Clean and available" };
  }
  if (status === "malicious") {
    return { accessible: false, label: "Rejected by scan" };
  }
  return { accessible: false, label: "Quarantined pending validation" };
}

export function redactSensitiveError(message: string): string {
  return message
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted-api-key]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted-token]")
    .replace(/secret:\/\/[^\s]+/g, "secret://[redacted]");
}
