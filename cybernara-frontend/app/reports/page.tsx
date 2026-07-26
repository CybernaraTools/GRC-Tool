import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "../../src/components/app-shell";
import { EmptyState, ErrorState } from "../../src/components/ui-states";
import { createServerApiClient, apiErrorMessage } from "../../src/lib/api/server";
import type { ClosedAssessmentSummary } from "../../src/lib/api/generated";
import { loginPath } from "../../src/lib/auth";
import { readSessionContext } from "../../src/lib/session";

type ReportsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const session = await readSessionContext();
  if (!session) {
    redirect(loginPath("/reports"));
  }

  let assessments: ClosedAssessmentSummary[] = [];
  let apiError: string | null = null;
  try {
    assessments = await createServerApiClient(session).listClosedAssessmentsForAudit({ limit: 100, offset: 0 });
  } catch (error) {
    apiError = apiErrorMessage(error);
  }

  const search = value(resolvedSearchParams.q).toLowerCase();
  const frameworkFilter = value(resolvedSearchParams.framework).toLowerCase();
  const statusFilter = value(resolvedSearchParams.reportStatus);
  const actionError = value(resolvedSearchParams.error);

  const filtered = assessments.filter((assessment) => {
    if (search && !assessment.scopeName.toLowerCase().includes(search)) {
      return false;
    }
    if (frameworkFilter && !assessment.frameworks.some((framework) => framework.toLowerCase().includes(frameworkFilter))) {
      return false;
    }
    if (statusFilter === "not_generated" && assessment.latestReport) {
      return false;
    }
    if (statusFilter === "generated" && !assessment.latestReport) {
      return false;
    }
    return true;
  });

  const totalClosed = assessments.length;
  const totalGenerated = assessments.filter((a) => a.latestReport).length;

  return (
    <AppShell session={session} title="Assessment Audit Reports">
      <div className="reportDocContainer">
        <div className="reportsSummaryGrid">
          <div className="reportsSummaryCard">
            <span className="label">Closed Assessments</span>
            <strong>{totalClosed}</strong>
            <small>Eligible for report generation</small>
          </div>
          <div className="reportsSummaryCard">
            <span className="label">Reports Generated</span>
            <strong>{totalGenerated}</strong>
            <small>Deterministic, no AI</small>
          </div>
        </div>

        <div className="sectionHeader" style={{ paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <span className="eyebrow">Audit & Assurance</span>
            <h2 id="reports-heading" style={{ fontSize: "20px", fontWeight: 800 }}>Closed Assessment Audit Reports</h2>
            <p style={{ fontSize: "13px", color: "var(--ink-muted)", marginTop: "6px", maxWidth: "640px" }}>
              Each report covers one closed assessment: its framework compliance, control dispositions, evidence, findings,
              remediation, risk acceptances, and reviewer sign-offs — read directly from live data. No AI is used.
            </p>
          </div>
          <span>Showing {filtered.length} of {totalClosed} assessment(s)</span>
        </div>

        <ReportFiltersForm defaults={resolvedSearchParams} />

        {actionError ? <ErrorState title="Action failed" detail={actionError} /> : null}
        {apiError ? <ErrorState title="Closed assessments could not be loaded" detail={apiError} /> : null}

        {!apiError && filtered.length === 0 ? (
          <EmptyState
            title="No closed assessments match these filters"
            detail="Only assessments with status 'closed' appear here. Draft, in-progress, and approved-but-not-closed assessments are intentionally excluded."
          />
        ) : null}

        {!apiError && filtered.length > 0 ? (
          <div className="detailGrid">
            {filtered.map((assessment) => (
              <ClosedAssessmentCard key={assessment.assessmentId} assessment={assessment} />
            ))}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function ReportFiltersForm({ defaults }: { defaults: Record<string, string | string[] | undefined> }) {
  return (
    <form className="filterForm" method="get" aria-label="Audit report filters">
      <label>
        Search
        <input name="q" defaultValue={value(defaults.q)} placeholder="Assessment scope name" />
      </label>
      <label>
        Framework
        <input name="framework" defaultValue={value(defaults.framework)} placeholder="SOC 2, CCPA, E8..." />
      </label>
      <label>
        Report status
        <select name="reportStatus" defaultValue={value(defaults.reportStatus)}>
          <option value="">All statuses</option>
          <option value="not_generated">Not generated</option>
          <option value="generated">Generated</option>
        </select>
      </label>
      <div className="formActions">
        <button type="submit" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>filter_list</span>
          Apply Filters
        </button>
        <Link href="/reports" style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "10px 14px", textDecoration: "none", fontSize: "13px", color: "var(--ink-muted)" }}>
          Reset
        </Link>
      </div>
    </form>
  );
}

function ClosedAssessmentCard({ assessment }: { assessment: ClosedAssessmentSummary }) {
  const report = assessment.latestReport;
  const hasReport = Boolean(report);

  return (
    <article style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "20px", borderRadius: "var(--radius-card)", background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div>
          <span className="eyebrow" style={{ fontSize: "10px" }}>Assessment Scope</span>
          <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--ink)" }}>{assessment.scopeName}</h3>
        </div>
        {hasReport ? (
          <span className="dispBadge dispSatisfied">REPORT GENERATED</span>
        ) : (
          <span className="dispBadge" style={{ background: "var(--surface-muted)", color: "var(--ink-muted)", border: "1px solid var(--border)" }}>
            NOT GENERATED
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", fontSize: "12px", color: "var(--ink-muted)" }}>
        <span style={{ fontWeight: 600 }}>Frameworks:</span>
        {assessment.frameworks.length > 0 ? (
          assessment.frameworks.map((fw) => (
            <span key={fw} className="reportIdChip" style={{ textTransform: "uppercase" }}>{fw}</span>
          ))
        ) : (
          <span>None</span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px", color: "var(--ink-muted)", paddingTop: "10px", borderTop: "1px solid var(--border)" }}>
        <div>
          Closed: <strong>{assessment.closedAt ? new Date(assessment.closedAt).toLocaleDateString() : "Unknown"}</strong>
        </div>
        <div>
          Items / Findings: <strong>{assessment.itemCount} / {assessment.findingCount}</strong>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "auto", paddingTop: "8px" }}>
        {hasReport ? (
          <>
            <Link href={`/reports/${report!.reportId}`} style={{ textDecoration: "none" }}>
              <button type="button">
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>visibility</span>
                View Report
              </button>
            </Link>
            <a href={`/reports/${report!.reportId}/download`} style={{ textDecoration: "none" }}>
              <button type="button">
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>download</span>
                PDF
              </button>
            </a>
            <GenerateReportForm assessmentId={assessment.assessmentId} label="Regenerate" isSecondary />
          </>
        ) : (
          <GenerateReportForm assessmentId={assessment.assessmentId} label="Generate Report" />
        )}
      </div>
    </article>
  );
}

function GenerateReportForm({ assessmentId, label, isSecondary }: { assessmentId: string; label: string; isSecondary?: boolean }) {
  return (
    <form action="/reports/actions" method="post" style={{ margin: 0 }}>
      <input type="hidden" name="intent" value="generateReport" />
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <button type="submit" className={isSecondary ? "secondary" : undefined}>
        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>summarize</span>
        {label}
      </button>
    </form>
  );
}

function value(input: string | string[] | undefined): string {
  return Array.isArray(input) ? input[0] ?? "" : input ?? "";
}
