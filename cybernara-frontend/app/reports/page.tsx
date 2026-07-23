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
    if (statusFilter === "draft" && assessment.latestReport?.lifecycleStatus !== "draft") {
      return false;
    }
    if (statusFilter === "published" && assessment.latestReport?.lifecycleStatus !== "published") {
      return false;
    }
    return true;
  });

  return (
    <AppShell session={session} title="Assessment Audit Reports">
      <section className="workspace" aria-labelledby="reports-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Audit Reports</p>
            <h2 id="reports-heading">Closed Assessments</h2>
          </div>
          <span>{filtered.length} of {assessments.length} closed assessment(s)</span>
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
      </section>
    </AppShell>
  );
}

function ReportFiltersForm({ defaults }: { defaults: Record<string, string | string[] | undefined> }) {
  return (
    <form className="filterForm" method="get" aria-label="Audit report filters">
      <label>
        Search
        <input name="q" defaultValue={value(defaults.q)} placeholder="Assessment name" />
      </label>
      <label>
        Framework
        <input name="framework" defaultValue={value(defaults.framework)} placeholder="SOC 2" />
      </label>
      <label>
        Report status
        <select name="reportStatus" defaultValue={value(defaults.reportStatus)}>
          <option value="">Any</option>
          <option value="not_generated">Not generated</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </label>
      <div className="formActions">
        <button type="submit">Apply filters</button>
        <Link href="/reports">Reset</Link>
      </div>
    </form>
  );
}

function ClosedAssessmentCard({ assessment }: { assessment: ClosedAssessmentSummary }) {
  const report = assessment.latestReport;
  return (
    <article>
      <span className="label">{assessment.scopeName}</span>
      <p>
        Frameworks: <strong>{assessment.frameworks.length > 0 ? assessment.frameworks.join(" · ") : "None"}</strong>
      </p>
      <small>
        Closed: {assessment.closedAt ? new Date(assessment.closedAt).toLocaleDateString() : "Not available"}
        {assessment.closedBy ? ` by ${assessment.closedBy}` : ""}
      </small>
      <small>
        {assessment.itemCount} item(s) &middot; {assessment.findingCount} finding(s)
      </small>
      <p>
        Report:{" "}
        {report ? (
          <span className={`badge ${report.lifecycleStatus === "published" ? "confidential" : "internal"}`}>
            {report.lifecycleStatus} &middot; generated {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString() : "unknown"} &middot;{" "}
            groundedness {report.groundednessScore}%
          </span>
        ) : (
          <span className="badge public">Not generated</span>
        )}
      </p>
      <div className="formActions">
        {report ? (
          <>
            <Link href={`/reports/${report.reportId}`}>View Report</Link>
            <a href={`/reports/${report.reportId}/download`}>Download PDF</a>
            <GenerateReportForm assessmentId={assessment.assessmentId} label="Regenerate Report" />
          </>
        ) : (
          <GenerateReportForm assessmentId={assessment.assessmentId} label="Generate Report" />
        )}
      </div>
    </article>
  );
}

function GenerateReportForm({ assessmentId, label }: { assessmentId: string; label: string }) {
  return (
    <form action="/reports/actions" method="post">
      <input type="hidden" name="intent" value="generateReport" />
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <button type="submit">{label}</button>
    </form>
  );
}

function value(input: string | string[] | undefined): string {
  return Array.isArray(input) ? input[0] ?? "" : input ?? "";
}
