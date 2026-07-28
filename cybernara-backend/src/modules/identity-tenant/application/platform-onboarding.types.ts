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

export interface PlatformDashboardCount {
  key: string;
  label: string;
  count: number;
}

export interface PlatformDashboardFrameworkSummary {
  frameworkKey: string;
  totalQuestions: number;
  completedQuestions: number;
  remainingQuestions: number;
  compliancePercent: number;
}

export interface PlatformDashboardRecentAssessment {
  id: string;
  scopeName: string;
  status: string;
  itemCount: number;
  createdAt: Date;
}

export interface PlatformDashboardTenant {
  id: string;
  name: string;
  status: TenantStatus;
  classification: Classification;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  userCount: number;
  activeUserCount: number;
  invitedUserCount: number;
  disabledUserCount: number;
  roleCounts: PlatformDashboardCount[];
  userStatusCounts: PlatformDashboardCount[];
  enabledFrameworkCount: number;
  totalQuestions: number;
  completedQuestions: number;
  remainingQuestions: number;
  compliancePercent: number;
  frameworks: PlatformDashboardFrameworkSummary[];
  assessmentCount: number;
  openAssessmentCount: number;
  closedAssessmentCount: number;
  assessmentStatusCounts: PlatformDashboardCount[];
  assessmentItemCount: number;
  evidenceObjectCount: number;
  committedEvidenceObjectCount: number;
  findingCount: number;
  openFindingCount: number;
  riskCount: number;
  openRiskCount: number;
  taskCount: number;
  pendingTaskCount: number;
  recentAssessments: PlatformDashboardRecentAssessment[];
}

export interface PlatformDashboardTotals {
  tenantCount: number;
  activeTenantCount: number;
  userCount: number;
  activeUserCount: number;
  enabledFrameworkCount: number;
  totalQuestions: number;
  completedQuestions: number;
  remainingQuestions: number;
  compliancePercent: number;
  assessmentCount: number;
  openAssessmentCount: number;
  closedAssessmentCount: number;
  evidenceObjectCount: number;
  committedEvidenceObjectCount: number;
  findingCount: number;
  openFindingCount: number;
  riskCount: number;
  openRiskCount: number;
  taskCount: number;
  pendingTaskCount: number;
}

export interface PlatformDashboard {
  generatedAt: Date;
  totals: PlatformDashboardTotals;
  tenants: PlatformDashboardTenant[];
}

export interface PlatformOnboardingRepository {
  findActiveOperator(input: { supabaseUserId: string; platformRole: PlatformRole }): Promise<PlatformOperator | null>;
  listTenants(): Promise<PlatformTenant[]>;
  getDashboard(): Promise<PlatformDashboardTenant[]>;
  findTenantById(tenantId: string): Promise<PlatformTenant | null>;
  createTenant(input: {
    tenantId: string;
    name: string;
    classification: Classification;
    createdBy: string;
  }): Promise<PlatformTenant>;
  updateTenantStatus(input: {
    tenantId: string;
    status: TenantStatus;
    updatedBy: string;
  }): Promise<PlatformTenant | null>;
}

export type InviteTenantAdminResponse = InviteAdminUserResponse;
