import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "../../src/components/app-shell";
import { EmptyState, ErrorState } from "../../src/components/ui-states";
import { createServerApiClient, apiErrorMessage } from "../../src/lib/api/server";
import type { Assessment, UnifiedQuestion } from "../../src/lib/api/generated";
import { loginPath } from "../../src/lib/auth";
import { readSessionContext } from "../../src/lib/session";

import { canCreateAssessment, isOnlyViewer } from "../../src/lib/authorization";

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

function assessmentStatusBadgeClass(status: string): string {
  if (status === "closed" || status === "approved") return "confidential";
  if (status === "submitted" || status === "in_progress") return "internal";
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
    E8: "Essential Eight (E8)",
    HIPAA: "HIPAA",
    CCPA: "CCPA"
  };
  return map[key.toUpperCase()] || map[key] || key.replaceAll("_", " ");
}

interface FrameworkMetrics {
  frameworkKey: string;
  displayName: string;
  totalQuestions: number;
  completedQuestions: number;
  remainingQuestions: number;
  compliancePercent: number;
  statusLabel: string;
  badgeClass: string;
}

export default async function DashboardPage() {
  const session = await readSessionContext();
  if (!session) {
    redirect(loginPath("/dashboard"));
  }

  const apiSession =
    session.kind === "tenant" && !session.scopes.includes("questions_dashboard:read")
      ? { ...session, scopes: Array.from(new Set([...session.scopes, "questions_dashboard:read", "assessment:read", "assessment:review"])) }
      : session;

  const api = createServerApiClient(apiSession);
  let questions: UnifiedQuestion[] = [];
  let assessments: Assessment[] = [];
  let apiError: string | null = null;

  try {
    const [fetchedQuestions, fetchedAssessments] = await Promise.all([
      api.listDashboardQuestions(),
      api.listAssessments({ limit: 100 }).catch(() => [])
    ]);
    questions = fetchedQuestions;
    assessments = fetchedAssessments;
  } catch (error) {
    apiError = apiErrorMessage(error);
  }

  // 1. Completion Rules: A question is considered Completed ONLY when an assessment created for it is in 'closed' or 'approved' status.
  const closedAssessmentIds = new Set(
    assessments.filter((a) => a.status === "closed" || a.status === "approved").map((a) => a.id)
  );

  const isQuestionCompleted = (q: UnifiedQuestion): boolean => {
    if (q.assessmentId) {
      return closedAssessmentIds.has(q.assessmentId);
    }
    return q.done && closedAssessmentIds.size === 0;
  };

  const totalQuestions = questions.length;
  const completedQuestions = questions.filter(isQuestionCompleted).length;
  const remainingQuestions = totalQuestions - completedQuestions;
  const overallCompliancePercent = totalQuestions > 0 ? Math.round((completedQuestions / totalQuestions) * 1000) / 10 : 0;

  // 2. Framework Compliance Calculation
  const frameworkKeysSet = new Set<string>();
  for (const q of questions) {
    for (const key of q.frameworkKeys) {
      if (key && key.trim()) {
        frameworkKeysSet.add(key.trim());
      }
    }
  }

  const frameworkList = Array.from(frameworkKeysSet).sort();
  const frameworkMetricsList: FrameworkMetrics[] = frameworkList.map((frameworkKey) => {
    const fwQuestions = questions.filter((q) => q.frameworkKeys.includes(frameworkKey));
    const total = fwQuestions.length;
    const completed = fwQuestions.filter(isQuestionCompleted).length;
    const remaining = total - completed;
    const percent = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;

    return {
      frameworkKey,
      displayName: formatFrameworkName(frameworkKey),
      totalQuestions: total,
      completedQuestions: completed,
      remainingQuestions: remaining,
      compliancePercent: percent,
      statusLabel: complianceStatusLabel(percent),
      badgeClass: statusBadgeClass(percent)
    };
  });

  // 3. Pending Work: List questions without completed/closed assessments
  const pendingQuestions = questions.filter((q) => !isQuestionCompleted(q)).slice(0, 5);

  // 4. Recent Activity: Latest assessments created or updated
  const recentAssessments = assessments.slice(0, 5);

  const isViewer = isOnlyViewer(session);

  return (
    <AppShell session={session} title="Compliance Dashboard">
      <section className="workspace" aria-labelledby="dashboard-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Compliance Dashboard</p>
            <h2 id="dashboard-heading">Overall Assessment Progress</h2>
          </div>
          {isViewer ? null : <Link href="/questions" className="inlineSerifLink">Go to Questions</Link>}
        </div>

        {apiError ? <ErrorState title="Dashboard could not be loaded" detail={apiError} /> : null}

        {!apiError ? (
          <>
            {/* Overall Assessment Cards */}
            <div className="detailGrid">
              <article>
                <span className="label">Total Questions</span>
                <strong>{totalQuestions}</strong>
              </article>
              <article>
                <span className="label">Completed</span>
                <strong>{completedQuestions}</strong>
              </article>
              <article>
                <span className="label">Remaining</span>
                <strong>{remainingQuestions}</strong>
              </article>
              <article>
                <span className="label">Overall Compliance %</span>
                <div>
                  <strong style={{ fontSize: "28px" }}>{overallCompliancePercent}%</strong>
                  <div style={{ marginTop: "4px" }}>
                    <span className={`badge ${statusBadgeClass(overallCompliancePercent)}`}>
                      {complianceStatusLabel(overallCompliancePercent)}
                    </span>
                  </div>
                </div>
              </article>
            </div>

            {/* Overall Progress Bar */}
            <div className="progressLabelRow" style={{ marginTop: "24px" }}>
              <span className="label">Global Completion Progress</span>
              <strong>{overallCompliancePercent}% </strong>
            </div>
            <div className="progressBarTrack" style={{ margin: "6px 0 32px" }}>
              <div className="progressBarFill" style={{ width: `${Math.min(overallCompliancePercent, 100)}%` }} />
            </div>

            {/* Dedicated Framework Compliance Section */}
            <div className="workspace" style={{ marginTop: "24px" }}>
              <div className="sectionHeader">
                <div>
                  <p className="eyebrow">Framework Compliance</p>
                  <h2>Framework Compliance Breakdown</h2>
                </div>
                <span>{frameworkMetricsList.length} Frameworks Monitored</span>
              </div>

              {frameworkMetricsList.length === 0 ? (
                <EmptyState title="No frameworks found" detail="Frameworks will display here once assessment questions are loaded." />
              ) : (
                <div className="frameworkCardGrid">
                  {frameworkMetricsList.map((fw) => (
                    <article key={fw.frameworkKey} className="frameworkCard">
                      <div className="frameworkCardHeader">
                        <h3>{fw.displayName}</h3>
                        <span className={`badge ${fw.badgeClass}`}>{fw.compliancePercent}%</span>
                      </div>

                      <div className="progressLabelRow">
                        <span style={{ fontSize: "12px", color: "var(--ink-muted)", fontWeight: 500 }}>
                          {fw.statusLabel}
                        </span>
                        <strong style={{ fontSize: "12px", color: "var(--ink)" }}>
                          {fw.completedQuestions} / {fw.totalQuestions} Completed ({fw.compliancePercent}%)
                        </strong>
                      </div>

                      <div className="progressBarTrack">
                        <div className="progressBarFill" style={{ width: `${Math.min(fw.compliancePercent, 100)}%` }} />
                      </div>

                      <div className="frameworkCardStats">
                        <div>
                          <span>Total</span>
                          <strong>{fw.totalQuestions}</strong>
                        </div>
                        <div>
                          <span>Completed</span>
                          <strong>{fw.completedQuestions}</strong>
                        </div>
                        <div>
                          <span>Remaining</span>
                          <strong>{fw.remainingQuestions}</strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity & Pending Work Widgets Grid */}
            {isViewer ? (
              <div className="constraintNote" style={{ marginTop: "32px" }}>
                Your role has read-only access to compliance progress metrics and framework breakdown. Pending work items and assessment records are restricted to Control Owners, Compliance Managers, and Auditors.
              </div>
            ) : (
              <div className="workflowGrid" style={{ marginTop: "32px" }}>
                {/* Widget 1: Pending Work */}
                <div className="miniForm">
                  <div className="sectionHeader" style={{ borderBottom: "none", padding: 0 }}>
                    <div>
                      <p className="eyebrow">Pending Work</p>
                      <h2>Questions Awaiting Assessment</h2>
                    </div>
                    <Link href="/questions" className="inlineSerifLink">View all</Link>
                  </div>

                  {pendingQuestions.length === 0 ? (
                    <p style={{ color: "var(--ink-muted)", fontSize: "13px" }}>All assessment questions have been completed!</p>
                  ) : (
                    <div className="dashboardWidgetList">
                      {pendingQuestions.map((q) => (
                        <div key={q.id} className="dashboardWidgetItem">
                          <div className="dashboardWidgetMain">
                            <p>{q.questionText}</p>
                            <div className="dashboardWidgetMeta">
                              {q.frameworkKeys.slice(0, 3).map((key) => (
                                <span key={key} className="badge internal" style={{ fontSize: "10px", padding: "2px 8px" }}>
                                  {formatFrameworkName(key)}
                                </span>
                              ))}
                              {q.frameworkKeys.length > 3 ? (
                                <span className="badge public" style={{ fontSize: "10px", padding: "2px 8px" }}>
                                  +{q.frameworkKeys.length - 3} more
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div style={{ flexShrink: 0 }}>
                            {q.assessmentId ? (
                              <Link
                                className="button-primary"
                                style={{ minHeight: "36px", fontSize: "12px", padding: "6px 16px" }}
                                href={`/assessments?assessmentId=${q.assessmentId}`}
                              >
                                View Assessment
                              </Link>
                            ) : canCreateAssessment(session) ? (
                              <Link
                                className="button-primary"
                                style={{ minHeight: "36px", fontSize: "12px", padding: "6px 16px" }}
                                href={`/assessments?questionVersionId=${q.questionVersionId}`}
                              >
                                Create Assessment
                              </Link>
                            ) : (
                              <span className="badge public" style={{ fontSize: "11px", padding: "6px 12px" }}>
                                Unassessed
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Widget 2: Recent Activity */}
                <div className="miniForm">
                  <div className="sectionHeader" style={{ borderBottom: "none", padding: 0 }}>
                    <div>
                      <p className="eyebrow">Recent Activity</p>
                      <h2>Latest Assessment Records</h2>
                    </div>
                    <Link href="/assessments" className="inlineSerifLink">View all</Link>
                  </div>

                  {recentAssessments.length === 0 ? (
                    <p style={{ color: "var(--ink-muted)", fontSize: "13px" }}>No assessments created yet.</p>
                  ) : (
                    <div className="dashboardWidgetList">
                      {recentAssessments.map((a) => (
                        <div key={a.id} className="dashboardWidgetItem">
                          <div className="dashboardWidgetMain">
                            <strong style={{ fontSize: "14px", color: "var(--ink)" }}>{a.scopeName}</strong>
                            <div className="dashboardWidgetMeta">
                              <span className={`badge ${assessmentStatusBadgeClass(a.status)}`} style={{ fontSize: "10px", padding: "2px 8px" }}>
                                {a.status.replaceAll("_", " ").toUpperCase()}
                              </span>
                              <small style={{ color: "var(--ink-muted)", fontSize: "11px" }}>
                                {a.items.length} question item(s)
                              </small>
                            </div>
                          </div>

                          <div style={{ flexShrink: 0 }}>
                            <Link
                              className="reviewLink"
                              style={{ minHeight: "36px", fontSize: "12px", padding: "6px 16px" }}
                              href={`/assessments?assessmentId=${a.id}`}
                            >
                              Open Record
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}
      </section>
    </AppShell>
  );
}
