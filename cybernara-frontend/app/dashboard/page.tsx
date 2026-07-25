import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "../../src/components/app-shell";
import { ErrorState } from "../../src/components/ui-states";
import { createServerApiClient, apiErrorMessage } from "../../src/lib/api/server";
import type { DashboardSummary } from "../../src/lib/api/generated";
import { loginPath } from "../../src/lib/auth";
import { readSessionContext } from "../../src/lib/session";

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

export default async function DashboardPage() {
  const session = await readSessionContext();
  if (!session) {
    redirect(loginPath("/dashboard"));
  }

  let summary: DashboardSummary | null = null;
  let apiError: string | null = null;
  try {
    summary = await createServerApiClient(session).getQuestionsDashboardSummary();
  } catch (error) {
    apiError = apiErrorMessage(error);
  }

  return (
    <AppShell session={session} title="Compliance Dashboard">
      <section className="workspace" aria-labelledby="dashboard-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Compliance Dashboard</p>
            <h2 id="dashboard-heading">Overall Assessment Progress</h2>
          </div>
          <Link href="/questions">Go to Questions</Link>
        </div>

        {apiError ? <ErrorState title="Dashboard could not be loaded" detail={apiError} /> : null}

        {summary ? (
          <>
            <div className="detailGrid">
              <article>
                <span className="label">Total Questions</span>
                <strong>{summary.totalQuestions}</strong>
              </article>
              <article>
                <span className="label">Completed</span>
                <strong>{summary.completedQuestions}</strong>
              </article>
              <article>
                <span className="label">Remaining</span>
                <strong>{summary.remainingQuestions}</strong>
              </article>
              <article>
                <span className="label">Overall Completion</span>
                <strong>{summary.overallCompletionPercent}%</strong>
                <ProgressBar percent={summary.overallCompletionPercent} />
              </article>
            </div>

            <h3>Framework Compliance</h3>
            <div className="detailGrid">
              {summary.frameworks.length === 0 ? (
                <article>
                  <span className="label">No frameworks yet</span>
                  <small>Compliance appears here once questions are tagged to a framework.</small>
                </article>
              ) : (
                summary.frameworks.map((framework) => (
                  <article key={framework.frameworkKey}>
                    <span className="label">{framework.frameworkKey}</span>
                    <strong>{framework.compliancePercent}%</strong>
                    <ProgressBar percent={framework.compliancePercent} />
                    <small>
                      {framework.completedQuestions} / {framework.totalQuestions} completed &middot; {framework.remainingQuestions} remaining
                    </small>
                    <span className={`badge ${statusBadgeClass(framework.compliancePercent)}`}>
                      {complianceStatusLabel(framework.compliancePercent)}
                    </span>
                  </article>
                ))
              )}
            </div>

            <h3>Recent Activity</h3>
            {summary.recentAssessments.length === 0 ? (
              <p className="constraintNote">No assessments created yet.</p>
            ) : (
              <div className="tableScroller">
                <table>
                  <caption>Recent assessments</caption>
                  <thead>
                    <tr>
                      <th scope="col">Scope</th>
                      <th scope="col">Status</th>
                      <th scope="col">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recentAssessments.map((assessment) => (
                      <tr key={assessment.id}>
                        <td>
                          <Link href={`/assessments?assessmentId=${assessment.id}`}>{assessment.scopeName}</Link>
                        </td>
                        <td>{assessment.status}</td>
                        <td>{assessment.createdAt ? new Date(assessment.createdAt).toLocaleDateString() : "Unknown"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </section>
    </AppShell>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <progress value={clamped} max={100} aria-label={`${clamped}% complete`}>
      {clamped}%
    </progress>
  );
}
