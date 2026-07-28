import Link from "next/link";
import type { CSSProperties } from "react";
import { AppShell } from "../../../src/components/app-shell";
import { ErrorState } from "../../../src/components/ui-states";
import { apiErrorMessage, createServerApiClient } from "../../../src/lib/api/server";
import type {
  PlatformDashboardCount,
  PlatformDashboardFrameworkSummary,
  PlatformDashboardResponse,
  PlatformDashboardTotals,
  PlatformDashboardTenant
} from "../../../src/lib/api/generated";
import { requirePlatformSession } from "../../../src/lib/protected-session";

type PlatformDashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function complianceStatusLabel(percent: number): string {
  if (percent >= 100) return "Fully Compliant";
  if (percent >= 75) return "Good Progress";
  if (percent >= 40) return "In Progress";
  return "Needs Attention";
}

function statusBadgeClass(percent: number): string {
  if (percent >= 100) return "confidential";
  if (percent >= 75) return "internal";
  if (percent >= 40) return "public";
  return "restricted";
}

function assessmentBadgeClass(status: string): string {
  if (status === "closed" || status === "approved") return "confidential";
  if (status === "submitted" || status === "in_progress") return "internal";
  if (status === "needs_changes") return "restricted";
  return "public";
}

function formatFrameworkName(key: string): string {
  const map: Record<string, string> = {
    SOC2: "SOC 2",
    ISO_27001: "ISO 27001",
    ISO27001: "ISO 27001",
    PCI_DSS: "PCI DSS",
    PCIDSS: "PCI DSS",
    NIST_SP800: "NIST SP 800",
    NISTSP800: "NIST SP 800",
    GDPR: "GDPR",
    HITRUST: "HITRUST",
    E8: "Essential Eight",
    HIPAA: "HIPAA",
    CCPA: "CCPA"
  };
  return map[key.toUpperCase()] || map[key] || key.replaceAll("_", " ");
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function ringStyle(value: number): CSSProperties {
  return { "--score": `${Math.max(0, Math.min(value, 100))}%` } as CSSProperties;
}

function aggregateCounts(tenants: PlatformDashboardTenant[], selector: (tenant: PlatformDashboardTenant) => PlatformDashboardCount[]) {
  const byKey = new Map<string, PlatformDashboardCount>();
  for (const tenant of tenants) {
    for (const entry of selector(tenant)) {
      const existing = byKey.get(entry.key);
      byKey.set(entry.key, {
        key: entry.key,
        label: entry.label,
        count: (existing?.count ?? 0) + entry.count
      });
    }
  }
  return [...byKey.values()].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function topFrameworks(tenants: PlatformDashboardTenant[]): PlatformDashboardFrameworkSummary[] {
  const byKey = new Map<string, PlatformDashboardFrameworkSummary>();
  for (const tenant of tenants) {
    for (const framework of tenant.frameworks) {
      const existing = byKey.get(framework.frameworkKey);
      byKey.set(framework.frameworkKey, {
        frameworkKey: framework.frameworkKey,
        totalQuestions: (existing?.totalQuestions ?? 0) + framework.totalQuestions,
        completedQuestions: (existing?.completedQuestions ?? 0) + framework.completedQuestions,
        remainingQuestions: (existing?.remainingQuestions ?? 0) + framework.remainingQuestions,
        compliancePercent: 0
      });
    }
  }
  return [...byKey.values()]
    .map((framework) => ({
      ...framework,
      compliancePercent: framework.totalQuestions > 0 ? Math.round((framework.completedQuestions / framework.totalQuestions) * 1000) / 10 : 0
    }))
    .sort((left, right) => right.totalQuestions - left.totalQuestions || left.frameworkKey.localeCompare(right.frameworkKey))
    .slice(0, 6);
}

function totalsForTenants(tenants: PlatformDashboardTenant[]): PlatformDashboardTotals {
  const totalQuestions = sum(tenants, (tenant) => tenant.totalQuestions);
  const completedQuestions = sum(tenants, (tenant) => tenant.completedQuestions);
  return {
    tenantCount: tenants.length,
    activeTenantCount: tenants.filter((tenant) => tenant.status === "active").length,
    userCount: sum(tenants, (tenant) => tenant.userCount),
    activeUserCount: sum(tenants, (tenant) => tenant.activeUserCount),
    enabledFrameworkCount: sum(tenants, (tenant) => tenant.enabledFrameworkCount),
    totalQuestions,
    completedQuestions,
    remainingQuestions: sum(tenants, (tenant) => tenant.remainingQuestions),
    compliancePercent: totalQuestions > 0 ? Math.round((completedQuestions / totalQuestions) * 1000) / 10 : 0,
    assessmentCount: sum(tenants, (tenant) => tenant.assessmentCount),
    openAssessmentCount: sum(tenants, (tenant) => tenant.openAssessmentCount),
    closedAssessmentCount: sum(tenants, (tenant) => tenant.closedAssessmentCount),
    evidenceObjectCount: sum(tenants, (tenant) => tenant.evidenceObjectCount),
    committedEvidenceObjectCount: sum(tenants, (tenant) => tenant.committedEvidenceObjectCount),
    findingCount: sum(tenants, (tenant) => tenant.findingCount),
    openFindingCount: sum(tenants, (tenant) => tenant.openFindingCount),
    riskCount: sum(tenants, (tenant) => tenant.riskCount),
    openRiskCount: sum(tenants, (tenant) => tenant.openRiskCount),
    taskCount: sum(tenants, (tenant) => tenant.taskCount),
    pendingTaskCount: sum(tenants, (tenant) => tenant.pendingTaskCount)
  };
}

function sum(tenants: PlatformDashboardTenant[], selector: (tenant: PlatformDashboardTenant) => number): number {
  return tenants.reduce((total, tenant) => total + selector(tenant), 0);
}

function value(input: string | string[] | undefined): string {
  return Array.isArray(input) ? input[0] ?? "" : input ?? "";
}

export default async function PlatformDashboardPage({ searchParams }: PlatformDashboardPageProps) {
  const params = searchParams ? await searchParams : {};
  const selectedTenantId = value(params.tenantId);
  const session = await requirePlatformSession(
    selectedTenantId ? `/platform/dashboard?tenantId=${encodeURIComponent(selectedTenantId)}` : "/platform/dashboard"
  );
  const api = createServerApiClient(session);
  let dashboard: PlatformDashboardResponse | null = null;
  let apiError: string | null = null;

  try {
    dashboard = await api.getPlatformDashboard();
  } catch (error) {
    apiError = apiErrorMessage(error);
  }

  const tenants = dashboard?.tenants ?? [];
  const totals = dashboard?.totals;
  const selectedTenant =
    selectedTenantId && selectedTenantId !== "all" ? tenants.find((tenant) => tenant.id === selectedTenantId) : undefined;
  const viewTenants = selectedTenant ? [selectedTenant] : tenants;
  const viewTotals = totals && selectedTenant ? totalsForTenants(viewTenants) : totals;
  const roleCounts = aggregateCounts(viewTenants, (tenant) => tenant.roleCounts);
  const userStatusCounts = aggregateCounts(viewTenants, (tenant) => tenant.userStatusCounts);
  const platformFrameworks = topFrameworks(viewTenants);
  const highestCompliance = [...viewTenants].sort((left, right) => right.compliancePercent - left.compliancePercent)[0];
  const newestTenant = [...viewTenants].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
  const scopeLabel = selectedTenant ? selectedTenant.name : "All Organizations";

  return (
    <AppShell session={session} title="Platform Dashboard">
      {apiError || !dashboard || !viewTotals ? (
        <ErrorState title="Platform dashboard could not be loaded" detail={apiError ?? "Dashboard response was empty."} />
      ) : (
        <main className="platformDashboardPage" aria-labelledby="platform-dashboard-heading">
          <section className="platformDashboardHero">
            <div className="platformHeroCopy">
              <div className="platformHeroTop">
                <div>
                  <p className="eyebrow">Platform super-admin</p>
                  <h2 id="platform-dashboard-heading">{selectedTenant ? `${selectedTenant.name} Dashboard` : "Tenant Intelligence Dashboard"}</h2>
                  <p>
                    {selectedTenant
                      ? "Focused oversight for this organization across users, compliance, assessments, evidence, findings, risks, and open work."
                      : "Live oversight across onboarding, tenant users, assessment progress, evidence, findings, risks, and open work."}
                  </p>
                </div>
                <form className="tenantSwitcher" action="/platform/dashboard">
                  <label htmlFor="platform-tenant-switcher">Organization</label>
                  <div className="tenantSwitcherControls">
                    <select id="platform-tenant-switcher" name="tenantId" defaultValue={selectedTenant?.id ?? "all"}>
                      <option value="all">All Organizations</option>
                      {tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="buttonWithIcon reviewLink">
                      <span className="material-symbols-outlined" aria-hidden="true">sync_alt</span>
                      View
                    </button>
                  </div>
                </form>
              </div>
              <div className="platformHeroActions">
                <Link href="/platform/tenants" className="buttonWithIcon reviewLink">
                  <span className="material-symbols-outlined" aria-hidden="true">corporate_fare</span>
                  Client Onboarding
                </Link>
                <Link href="/platform/questions" className="buttonWithIcon reviewLink">
                  <span className="material-symbols-outlined" aria-hidden="true">quiz</span>
                  Question Repository
                </Link>
              </div>
            </div>
            <div className="platformScoreRingPanel" aria-label={`${scopeLabel} compliance`}>
              <div className="scoreRing largeScoreRing" style={ringStyle(viewTotals.compliancePercent)}>
                <span>{formatPercent(viewTotals.compliancePercent)}</span>
              </div>
              <div>
                <span className={`badge ${statusBadgeClass(viewTotals.compliancePercent)}`}>{complianceStatusLabel(viewTotals.compliancePercent)}</span>
                <p>{formatNumber(viewTotals.completedQuestions)} of {formatNumber(viewTotals.totalQuestions)} questions completed through approved or closed assessments.</p>
              </div>
            </div>
          </section>

          <section className="platformBentoGrid" aria-label={`${scopeLabel} overview metrics`}>
            <MetricTile icon="domain" label="Tenants" value={viewTotals.tenantCount} detail={`${viewTotals.activeTenantCount} active`} />
            <MetricTile icon="group" label="Tenant Users" value={viewTotals.userCount} detail={`${viewTotals.activeUserCount} active users`} />
            <MetricTile icon="policy" label="Enabled Frameworks" value={viewTotals.enabledFrameworkCount} detail={selectedTenant ? "Enabled for this organization" : "Across client subscriptions"} />
            <MetricTile icon="assignment" label="Assessments" value={viewTotals.assessmentCount} detail={`${viewTotals.openAssessmentCount} open, ${viewTotals.closedAssessmentCount} closed`} />
            <MetricTile icon="folder_managed" label="Evidence Objects" value={viewTotals.evidenceObjectCount} detail={`${viewTotals.committedEvidenceObjectCount} committed`} />
            <MetricTile icon="warning" label="Findings" value={viewTotals.findingCount} detail={`${viewTotals.openFindingCount} open findings`} />
            <MetricTile icon="monitoring" label="Risks" value={viewTotals.riskCount} detail={`${viewTotals.openRiskCount} open risks`} />
            <MetricTile icon="task_alt" label="Universal Tasks" value={viewTotals.taskCount} detail={`${viewTotals.pendingTaskCount} pending or active`} />

            <article className="platformBentoTile wideTile">
              <div className="platformTileHeader">
                <div>
                  <span className="label">Tenant compliance ranking</span>
                  <h3>{selectedTenant ? "Selected organization progress" : "Progress by tenant"}</h3>
                </div>
                <span className="badge internal">{viewTenants.length} tenant{viewTenants.length === 1 ? "" : "s"}</span>
              </div>
              <div className="tenantRankList">
                {viewTenants.length === 0 ? (
                  <p className="mutedText">No client tenants exist yet.</p>
                ) : (
                  [...viewTenants]
                    .sort((left, right) => right.compliancePercent - left.compliancePercent || left.name.localeCompare(right.name))
                    .map((tenant) => (
                      <div key={tenant.id} className="tenantRankItem">
                        <div>
                          <strong>{tenant.name}</strong>
                          <small>{tenant.completedQuestions} / {tenant.totalQuestions} completed</small>
                        </div>
                        <div className="tenantRankProgress">
                          <span>{formatPercent(tenant.compliancePercent)}</span>
                          <div className="progressBarTrack">
                            <div className="progressBarFill" style={{ width: `${Math.min(tenant.compliancePercent, 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </article>

            <article className="platformBentoTile">
              <div className="platformTileHeader">
                <div>
                  <span className="label">Identity mix</span>
                  <h3>Roles</h3>
                </div>
              </div>
              <CountBarList counts={roleCounts} emptyLabel="No roles assigned yet." />
            </article>

            <article className="platformBentoTile">
              <div className="platformTileHeader">
                <div>
                  <span className="label">User lifecycle</span>
                  <h3>Status distribution</h3>
                </div>
              </div>
              <CountBarList counts={userStatusCounts} emptyLabel="No tenant users yet." />
            </article>

            <article className="platformBentoTile wideTile">
              <div className="platformTileHeader">
                <div>
                  <span className="label">Framework coverage</span>
                  <h3>Question progress by framework</h3>
                </div>
                <span>{platformFrameworks.length} tracked</span>
              </div>
              <div className="frameworkProgressGrid">
                {platformFrameworks.length === 0 ? (
                  <p className="mutedText">No enabled framework questions are available yet.</p>
                ) : (
                  platformFrameworks.map((framework) => (
                    <FrameworkProgress key={framework.frameworkKey} framework={framework} />
                  ))
                )}
              </div>
            </article>

            <article className="platformBentoTile insightTile">
              <span className="label">Highest compliance</span>
              <strong>{highestCompliance?.name ?? "None"}</strong>
              <p>{highestCompliance ? `${formatPercent(highestCompliance.compliancePercent)} complete across ${highestCompliance.totalQuestions} questions.` : "Tenant progress appears here once questions are available."}</p>
            </article>

            <article className="platformBentoTile insightTile">
              <span className="label">Newest tenant</span>
              <strong>{newestTenant?.name ?? "None"}</strong>
              <p>{newestTenant ? `Created ${formatDate(newestTenant.createdAt)} with ${newestTenant.userCount} tenant user${newestTenant.userCount === 1 ? "" : "s"}.` : "Create a tenant from Client Onboarding."}</p>
            </article>
          </section>

          <section className="tenantDetailSection" aria-labelledby="tenant-detail-heading">
              <div className="sectionHeader compactPlatformHeader">
                <div>
                  <p className="eyebrow">Tenant deep dive</p>
                  <h2 id="tenant-detail-heading">{selectedTenant ? selectedTenant.name : "Individual Tenant Intelligence"}</h2>
                </div>
                <span>Generated {formatDate(dashboard.generatedAt)}</span>
              </div>

            <div className="tenantDetailGrid">
              {viewTenants.length === 0 ? (
                <div className="constraintNote">No tenant metrics are available yet.</div>
              ) : (
                viewTenants.map((tenant) => <TenantDetail key={tenant.id} tenant={tenant} />)
              )}
            </div>
          </section>
        </main>
      )}
    </AppShell>
  );
}

function MetricTile({ icon, label, value, detail }: { icon: string; label: string; value: number; detail: string }) {
  return (
    <article className="platformBentoTile metricTile">
      <span className="material-symbols-outlined platformTileIcon" aria-hidden="true">{icon}</span>
      <span className="label">{label}</span>
      <strong>{formatNumber(value)}</strong>
      <p>{detail}</p>
    </article>
  );
}

function CountBarList({ counts, emptyLabel }: { counts: PlatformDashboardCount[]; emptyLabel: string }) {
  const max = Math.max(...counts.map((count) => count.count), 1);
  if (counts.length === 0) {
    return <p className="mutedText">{emptyLabel}</p>;
  }
  return (
    <div className="countBarList">
      {counts.map((entry) => (
        <div key={entry.key} className="countBarItem">
          <div className="countBarLabel">
            <span>{entry.label}</span>
            <strong>{entry.count}</strong>
          </div>
          <div className="countBarTrack">
            <span style={{ width: `${Math.max(8, (entry.count / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function FrameworkProgress({ framework }: { framework: PlatformDashboardFrameworkSummary }) {
  return (
    <article className="frameworkProgressItem">
      <div className="frameworkCardHeader">
        <h3>{formatFrameworkName(framework.frameworkKey)}</h3>
        <span className={`badge ${statusBadgeClass(framework.compliancePercent)}`}>{formatPercent(framework.compliancePercent)}</span>
      </div>
      <div className="progressBarTrack">
        <div className="progressBarFill" style={{ width: `${Math.min(framework.compliancePercent, 100)}%` }} />
      </div>
      <div className="frameworkCardStats">
        <div>
          <span>Total</span>
          <strong>{framework.totalQuestions}</strong>
        </div>
        <div>
          <span>Completed</span>
          <strong>{framework.completedQuestions}</strong>
        </div>
        <div>
          <span>Remaining</span>
          <strong>{framework.remainingQuestions}</strong>
        </div>
      </div>
    </article>
  );
}

function TenantDetail({ tenant }: { tenant: PlatformDashboardTenant }) {
  return (
    <article className="tenantDetailPanel">
      <header className="tenantDetailHeader">
        <div>
          <p className="eyebrow">{tenant.classification}</p>
          <h3>{tenant.name}</h3>
          <small>{tenant.id}</small>
        </div>
        <div className="tenantDetailScore">
          <div className="scoreRing" style={ringStyle(tenant.compliancePercent)}>
            <span>{formatPercent(tenant.compliancePercent)}</span>
          </div>
          <span className={`badge ${statusBadgeClass(tenant.compliancePercent)}`}>{complianceStatusLabel(tenant.compliancePercent)}</span>
        </div>
      </header>

      <div className="tenantMetricStrip">
        <MetricPill label="Users" value={tenant.userCount} detail={`${tenant.activeUserCount} active`} />
        <MetricPill label="Frameworks" value={tenant.enabledFrameworkCount} detail="enabled" />
        <MetricPill label="Assessments" value={tenant.assessmentCount} detail={`${tenant.openAssessmentCount} open`} />
        <MetricPill label="Evidence" value={tenant.evidenceObjectCount} detail={`${tenant.committedEvidenceObjectCount} committed`} />
        <MetricPill label="Findings" value={tenant.findingCount} detail={`${tenant.openFindingCount} open`} />
        <MetricPill label="Tasks" value={tenant.taskCount} detail={`${tenant.pendingTaskCount} pending`} />
      </div>

      <div className="tenantPanelColumns">
        <div>
          <div className="platformTileHeader compactTileHeader">
            <span className="label">Framework score</span>
          </div>
          <div className="tenantFrameworkList">
            {tenant.frameworks.length === 0 ? (
              <p className="mutedText">No framework question progress yet.</p>
            ) : (
              tenant.frameworks.slice(0, 5).map((framework) => (
                <div key={framework.frameworkKey} className="tenantFrameworkRow">
                  <span>{formatFrameworkName(framework.frameworkKey)}</span>
                  <strong>{formatPercent(framework.compliancePercent)}</strong>
                  <div className="progressBarTrack">
                    <div className="progressBarFill" style={{ width: `${Math.min(framework.compliancePercent, 100)}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="platformTileHeader compactTileHeader">
            <span className="label">Assessment status</span>
          </div>
          <CountBarList counts={tenant.assessmentStatusCounts} emptyLabel="No assessments yet." />
        </div>

        <div>
          <div className="platformTileHeader compactTileHeader">
            <span className="label">Tenant roles</span>
          </div>
          <CountBarList counts={tenant.roleCounts} emptyLabel="No tenant roles assigned." />
        </div>
      </div>

      <div className="tenantRecentAssessments">
        <div className="platformTileHeader compactTileHeader">
          <span className="label">Recent assessments</span>
        </div>
        {tenant.recentAssessments.length === 0 ? (
          <p className="mutedText">No assessment records yet.</p>
        ) : (
          <div className="recentAssessmentList">
            {tenant.recentAssessments.map((assessment) => (
              <div key={assessment.id} className="recentAssessmentRow">
                <div>
                  <strong>{assessment.scopeName}</strong>
                  <small>{assessment.itemCount} item{assessment.itemCount === 1 ? "" : "s"} | {formatDate(assessment.createdAt)}</small>
                </div>
                <span className={`badge ${assessmentBadgeClass(assessment.status)}`}>{assessment.status.replaceAll("_", " ")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function MetricPill({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="tenantMetricPill">
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
      <small>{detail}</small>
    </div>
  );
}
