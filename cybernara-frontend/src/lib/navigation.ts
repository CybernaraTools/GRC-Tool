export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: string[];
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
    roles: ["platform_admin", "auditor"],
    savedViews: true,
    bulkActions: false,
    publicPreview: true,
    requiredScopes: []
  },
  {
    label: "User Admin",
    href: "/admin/users",
    icon: "manage_accounts",
    roles: ["platform_admin"],
    savedViews: false,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: []
  },
  {
    label: "My Tasks",
    href: "/tasks",
    icon: "task",
    roles: ["platform_admin", "compliance_manager"],
    savedViews: true,
    bulkActions: false,
    publicPreview: true,
    requiredScopes: []
  },
  {
    label: "Framework Library",
    href: "/frameworks",
    icon: "policy",
    roles: ["platform_admin", "compliance_manager", "auditor", "viewer"],
    savedViews: true,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: []
  },
  {
    label: "Framework Updates",
    href: "/frameworks/updates",
    icon: "upgrade",
    roles: ["platform_admin", "compliance_manager", "auditor"],
    savedViews: false,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: []
  },
  {
    label: "Harmonization",
    href: "/harmonization",
    icon: "hub",
    roles: ["platform_admin", "compliance_manager", "auditor", "viewer"],
    savedViews: true,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: []
  },
  {
    label: "Questions",
    href: "/questions",
    icon: "quiz",
    roles: ["platform_admin", "compliance_manager", "auditor"],
    savedViews: false,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: []
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "insights",
    roles: ["platform_admin", "compliance_manager", "auditor", "viewer"],
    savedViews: false,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: []
  },
  {
    label: "Assessments",
    href: "/assessments",
    icon: "assignment",
    roles: ["platform_admin", "compliance_manager", "auditor"],
    savedViews: true,
    bulkActions: true,
    publicPreview: true,
    requiredScopes: []
  },
  {
    label: "Assessment Review",
    href: "/assessments/review",
    icon: "fact_check",
    roles: ["platform_admin", "auditor"],
    savedViews: true,
    bulkActions: true,
    publicPreview: false,
    requiredScopes: []
  },
  {
    label: "Audit Reports",
    href: "/reports",
    icon: "summarize",
    roles: ["platform_admin", "compliance_manager", "auditor", "viewer"],
    savedViews: true,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: []
  },
  {
    label: "Findings",
    href: "/findings",
    icon: "report_problem",
    roles: ["platform_admin", "auditor"],
    savedViews: true,
    bulkActions: true,
    publicPreview: false,
    requiredScopes: []
  },
  {
    label: "Risk & Acceptance",
    href: "/risks",
    icon: "monitoring",
    roles: ["platform_admin", "auditor", "compliance_manager"],
    savedViews: true,
    bulkActions: true,
    publicPreview: false,
    requiredScopes: []
  },
  {
    label: "AI Question Generation",
    href: "/ai",
    icon: "smart_toy",
    roles: ["platform_admin", "auditor"],
    savedViews: true,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: []
  },
  {
    label: "Integrations",
    href: "/integrations",
    icon: "cable",
    roles: ["platform_admin"],
    savedViews: true,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: []
  },
  {
    label: "Privacy Operations",
    href: "/privacy",
    icon: "privacy_tip",
    roles: ["platform_admin", "compliance_manager"],
    savedViews: true,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: []
  },
  {
    label: "Enterprise GRC",
    href: "/enterprise",
    icon: "corporate_fare",
    roles: ["platform_admin"],
    savedViews: false,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: []
  }
];

export const platformNavItems: NavItem[] = [
  {
    label: "Client Onboarding",
    href: "/platform/tenants",
    icon: "corporate_fare",
    roles: ["platform_admin"],
    savedViews: false,
    bulkActions: false,
    publicPreview: false,
    requiredScopes: ["tenant:write"]
  }
];

export function visibleNavForRole(role: string): NavItem[] {
  return operationalNavItems.filter((item) => item.roles.includes(role));
}

export function visibleNavForSession(
  session: { roles?: string[]; scopes?: string[]; kind?: string; platformRole?: string } | null
): NavItem[] {
  if (!session) {
    return [];
  }

  if (session.kind === "platform") {
    return platformNavItems;
  }

  const role = session.roles && session.roles.length > 0 ? session.roles[0] : "viewer";
  return visibleNavForRole(role);
}

export function uploadAccessState(status: string) {
  if (status === "clean") {
    return { accessible: true, label: "Clean" };
  }
  return { accessible: false, label: "Quarantined pending validation" };
}

export function redactSensitiveError(message: string): string {
  return message
    .replace(/sk-[a-zA-Z0-9_-]+/g, "[redacted-api-key]")
    .replace(/Bearer\s+[a-zA-Z0-9_.-]+/g, "Bearer [redacted-token]")
    .replace(/secret:\/\/[^\s]+/g, "secret://[redacted]");
}

export function resolvePrimaryRole(
  input: { roles?: string[]; platformRole?: string } | string[] | null
): string {
  if (!input) return "viewer";
  if (Array.isArray(input)) return input[0] || "viewer";
  if (input.platformRole) return input.platformRole;
  if (input.roles && input.roles.length > 0) return input.roles[0];
  return "viewer";
}
