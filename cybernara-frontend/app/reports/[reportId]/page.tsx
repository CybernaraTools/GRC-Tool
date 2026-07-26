import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "../../../src/components/app-shell";
import { ErrorState } from "../../../src/components/ui-states";
import { createServerApiClient, apiErrorMessage } from "../../../src/lib/api/server";
import type {
  AuditReport,
  ControlDispositionResult,
  EvidenceSummaryRow,
  FindingSummaryRow,
  FrameworkComplianceResult,
  QuestionAnswerRow,
  RemediationTaskSummaryRow,
  RiskAcceptanceSummaryRow,
  SignoffRow
} from "../../../src/lib/api/generated";
import { loginPath } from "../../../src/lib/auth";
import { readSessionContext } from "../../../src/lib/session";

export default async function ReportViewerPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const session = await readSessionContext();
  if (!session) {
    redirect(loginPath(`/reports/${reportId}`));
  }

  let report: AuditReport | null = null;
  let apiError: string | null = null;
  try {
    report = await createServerApiClient(session).getAuditReport(reportId);
  } catch (error) {
    apiError = apiErrorMessage(error);
  }

  if (apiError || !report) {
    return (
      <AppShell session={session} title="Audit Report">
        <section className="workspace">
          <ErrorState title="Report could not be loaded" detail={apiError ?? "Report not found."} />
        </section>
      </AppShell>
    );
  }

  const json = report.structuredReportJson;
  const shortId = `report-${report.id.slice(0, 8)}`;

  return (
    <AppShell session={session} title="Audit Report Viewer">
      <div className="reportDocContainer">
        <Link href="/reports" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: "var(--ink-muted)", textDecoration: "none" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>arrow_back</span>
          Back to Reports
        </Link>

        <header className="reportHeaderCard">
          <div className="reportHeaderLeft">
            <span className="eyebrow">Closed Assessment Audit Report</span>
            <h2 className="reportHeaderTitle">{json.assessment.scopeName}</h2>
            <div className="reportIdMeta">
              <span>Assessment ID:</span>
              <code className="reportIdChip" title={json.assessment.id}>{json.assessment.id}</code>
              <span>&middot;</span>
              <span>Report {shortId}</span>
              <span>&middot;</span>
              <span>Generated {new Date(report.generatedAt).toLocaleString()}</span>
            </div>
            <p style={{ fontSize: "12px", color: "var(--ink-muted)", marginTop: "6px" }}>
              Period {new Date(json.assessment.periodStart).toLocaleDateString()} - {new Date(json.assessment.periodEnd).toLocaleDateString()}
              {" · "}
              Closed {json.assessment.closedAt ? `${new Date(json.assessment.closedAt).toLocaleDateString()} by ${json.assessment.closedBy}` : "Unknown"}
              {" · "}
              Frameworks: {json.assessment.frameworkKeys.join(", ") || "None"}
            </p>
          </div>

          <div className="reportHeaderActions">
            <a href={`/reports/${report.id}/download`} style={{ textDecoration: "none" }}>
              <button type="button" className="secondaryButton" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>download</span>
                Download PDF
              </button>
            </a>
          </div>
        </header>

        <p style={{ fontSize: "12px", color: "var(--ink-faint)" }}>
          This report is a complete summary of this assessment from start to end — the questions asked, answers and evidence
          submitted, findings raised, remediation and risk acceptance activity, and the reviewer&rsquo;s own approval
          decisions. It does not re-evaluate anything: the compliance figures below reflect the review outcome already
          recorded during the assessment, exactly as recorded. No AI model was used to generate this report.
        </p>

        <section className="trustBoundary" aria-label="Assessment questions and answers">
          <div className="trustBoundaryHeader">
            <span className="trustBoundaryTitle">1. Assessment Questions & Answers</span>
          </div>
          <QuestionAnswerList rows={json.questionsAndAnswers} />
        </section>

        <section className="trustBoundary" aria-label="Framework compliance">
          <div className="trustBoundaryHeader">
            <span className="trustBoundaryTitle">2. Framework Compliance Scorecards</span>
          </div>
          <div className="frameworkGrid">
            {json.compliance.frameworks.map((framework) => (
              <FrameworkScorecardView key={framework.frameworkKey} framework={framework} />
            ))}
          </div>
          {json.compliance.frameworks.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--ink-muted)" }}>No framework-linked items on this assessment.</p>
          ) : null}
        </section>

        <section className="trustBoundary" aria-label="Control disposition matrix">
          <div className="trustBoundaryHeader">
            <span className="trustBoundaryTitle">3. Control Evaluation Matrix</span>
          </div>
          <DispositionMatrix rows={json.compliance.dispositions} />
        </section>

        <section className="trustBoundary" aria-label="Evidence matrix">
          <div className="trustBoundaryHeader">
            <span className="trustBoundaryTitle">4. Evidence Matrix</span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--ink-muted)" }}>
            Total: <strong>{json.evidence.total}</strong>
            {" · "}
            {Object.entries(json.evidence.byState).map(([state, count]) => `${state}: ${count}`).join(" · ")}
          </p>
          <EvidenceTable rows={json.evidence.items} />
        </section>

        <section className="trustBoundary" aria-label="Findings register">
          <div className="trustBoundaryHeader">
            <span className="trustBoundaryTitle">5. Findings Register</span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--ink-muted)" }}>
            Total: <strong>{json.findings.total}</strong>
            {" · "}
            {Object.entries(json.findings.bySeverity).map(([severity, count]) => `${severity}: ${count}`).join(" · ")}
          </p>
          <FindingsTable rows={json.findings.items} />
        </section>

        <section className="trustBoundary" aria-label="Remediation tasks">
          <div className="trustBoundaryHeader">
            <span className="trustBoundaryTitle">6. Remediation Register</span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--ink-muted)" }}>
            Total: <strong>{json.remediationTasks.total}</strong>
            {" · "}
            {Object.entries(json.remediationTasks.byStatus).map(([status, count]) => `${status}: ${count}`).join(" · ")}
          </p>
          <RemediationTable rows={json.remediationTasks.items} />
        </section>

        <section className="trustBoundary" aria-label="Risk acceptances">
          <div className="trustBoundaryHeader">
            <span className="trustBoundaryTitle">7. Accepted Residual Risks</span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--ink-muted)" }}>
            Total: <strong>{json.riskAcceptances.total}</strong> · Currently active: <strong>{json.riskAcceptances.active}</strong>
          </p>
          <AcceptancesTable rows={json.riskAcceptances.items} />
        </section>

        <section className="trustBoundary" aria-label="Reviewer decisions">
          <div className="trustBoundaryHeader">
            <span className="trustBoundaryTitle">8. Reviewer Decisions</span>
          </div>
          <SignoffsTable rows={json.signoffs} />
        </section>
      </div>
    </AppShell>
  );
}

function QuestionAnswerList({ rows }: { rows: QuestionAnswerRow[] }) {
  if (rows.length === 0) {
    return <p style={{ fontSize: "13px", color: "var(--ink-muted)" }}>No questions on this assessment.</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {rows.map((row) => (
        <article
          key={row.itemId}
          style={{ border: "1px solid var(--border)", borderRadius: "10px", background: "var(--surface-muted)", padding: "14px 16px" }}
        >
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink-muted)", marginBottom: "6px" }}>
            {row.frameworkKey} &middot; {row.controlId}
          </div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)", marginBottom: "6px" }}>{row.questionText}</div>
          <div style={{ fontSize: "13px", color: row.answerText ? "var(--ink-muted)" : "var(--ink-faint)", fontStyle: row.answerText ? "normal" : "italic" }}>
            {row.answerText ?? "Not answered."}
          </div>
          <div style={{ fontSize: "11px", color: "var(--ink-faint)", marginTop: "8px" }}>
            Applicable: {row.applicable ? "Yes" : `No${row.applicabilityRationale ? ` — ${row.applicabilityRationale}` : ""}`}
            {" · "}
            Evidence attached: {row.evidenceCount}
          </div>
        </article>
      ))}
    </div>
  );
}

function FrameworkScorecardView({ framework }: { framework: FrameworkComplianceResult }) {
  const isNa = framework.rawPercentage === null;
  return (
    <article className="frameworkScorecard">
      <div className="frameworkScorecardHeader">
        <span className="frameworkKeyBadge">{framework.frameworkKey}</span>
        <span className={isNa ? "frameworkBigNa" : "frameworkBigPercentage"}>{framework.displayPercentage}</span>
      </div>
      <div className="frameworkFormula">{framework.formula}</div>
      <div className="frameworkStatsList">
        <div className="frameworkStatItem">
          <span>Approved</span>
          <strong>{framework.approvedCount}</strong>
        </div>
        <div className="frameworkStatItem">
          <span>Not Approved</span>
          <strong>{framework.notApprovedCount}</strong>
        </div>
        <div className="frameworkStatItem" style={{ gridColumn: "span 2" }}>
          <span>Not Applicable</span>
          <strong>{framework.notApplicableCount}</strong>
        </div>
      </div>
    </article>
  );
}

function DispositionMatrix({ rows }: { rows: ControlDispositionResult[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="tableScrollerClean">
      <table className="matrixTable">
        <thead>
          <tr>
            <th scope="col">Framework</th>
            <th scope="col">Control</th>
            <th scope="col">Harmonized Control</th>
            <th scope="col">Disposition</th>
            <th scope="col">Findings</th>
            <th scope="col">Reason</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={`${row.itemId}-${idx}`}>
              <td style={{ fontWeight: 700 }}>{row.frameworkKey}</td>
              <td><code style={{ fontSize: "12px" }}>{row.controlId}</code></td>
              <td><code style={{ fontSize: "11px", color: "var(--ink-muted)" }}>{row.harmonizedControlId}</code></td>
              <td><DispositionPill disposition={row.disposition} /></td>
              <td>{row.findingCount}</td>
              <td className="matrixReasonText">{row.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EvidenceTable({ rows }: { rows: EvidenceSummaryRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="tableScrollerClean">
      <table className="matrixTable">
        <thead>
          <tr>
            <th scope="col">File</th>
            <th scope="col">State</th>
            <th scope="col">Linked Items</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td style={{ fontWeight: 700 }}>{row.fileName}</td>
              <td>{row.state}</td>
              <td>{row.linkedItemIds.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FindingsTable({ rows }: { rows: FindingSummaryRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="tableScrollerClean">
      <table className="matrixTable">
        <thead>
          <tr>
            <th scope="col">Control</th>
            <th scope="col">Severity</th>
            <th scope="col">Description</th>
            <th scope="col">Remediated</th>
            <th scope="col">Risk Accepted</th>
            <th scope="col">Due</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td style={{ fontWeight: 700 }}>{row.frameworkKey && row.controlId ? `${row.frameworkKey} ${row.controlId}` : "—"}</td>
              <td style={{ textTransform: "capitalize" }}>{row.severity}</td>
              <td className="matrixReasonText">{row.description}</td>
              <td><BooleanPill value={row.remediationStatus === "verified"} /></td>
              <td><BooleanPill value={row.riskAccepted} /></td>
              <td>{row.dueAt ? new Date(row.dueAt).toLocaleDateString() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RemediationTable({ rows }: { rows: RemediationTaskSummaryRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="tableScrollerClean">
      <table className="matrixTable">
        <thead>
          <tr>
            <th scope="col">Task</th>
            <th scope="col">Finding</th>
            <th scope="col">Status</th>
            <th scope="col">Due</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td><code style={{ fontSize: "12px" }}>{row.id.slice(0, 8)}</code></td>
              <td><code style={{ fontSize: "12px" }}>{row.findingId.slice(0, 8)}</code></td>
              <td>{row.status}</td>
              <td>{new Date(row.dueAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AcceptancesTable({ rows }: { rows: RiskAcceptanceSummaryRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="tableScrollerClean">
      <table className="matrixTable">
        <thead>
          <tr>
            <th scope="col">Finding</th>
            <th scope="col">Risk</th>
            <th scope="col">Risk Score</th>
            <th scope="col">Rationale</th>
            <th scope="col">Active</th>
            <th scope="col">Expires</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td><code style={{ fontSize: "12px" }}>{row.findingId.slice(0, 8)}</code></td>
              <td style={{ fontWeight: 700 }}>{row.riskTitle ? `${row.riskTitle} (${row.riskCategory ?? "—"})` : "—"}</td>
              <td>{row.riskInherentScore !== undefined ? `${row.riskInherentScore} → ${row.riskResidualScore}` : "—"}</td>
              <td className="matrixReasonText">{row.rationale}</td>
              <td><BooleanPill value={row.active} /></td>
              <td>{new Date(row.expiresAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SignoffsTable({ rows }: { rows: SignoffRow[] }) {
  if (rows.length === 0) {
    return <p style={{ fontSize: "13px", color: "var(--ink-muted)" }}>No reviewer decisions recorded.</p>;
  }
  return (
    <div className="tableScrollerClean">
      <table className="matrixTable">
        <thead>
          <tr>
            <th scope="col">Scope</th>
            <th scope="col">Decision</th>
            <th scope="col">Signer</th>
            <th scope="col">Signed At</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td style={{ fontWeight: 700 }}>{row.scopeType}</td>
              <td style={{ textTransform: "capitalize" }}>{row.decision}</td>
              <td><code style={{ fontSize: "12px" }}>{row.signerId.slice(0, 8)}</code></td>
              <td>{new Date(row.signedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DispositionPill({ disposition }: { disposition: string }) {
  switch (disposition) {
    case "approved":
      return <span className="dispBadge dispSatisfied">Approved</span>;
    case "not_applicable":
      return <span className="dispBadge dispNotApplicable">Not Applicable</span>;
    case "not_approved":
    default:
      return <span className="dispBadge dispUnresolved">Not Approved</span>;
  }
}

function BooleanPill({ value }: { value: boolean }) {
  return value ? (
    <span className="dispBadge dispSatisfied">Yes</span>
  ) : (
    <span className="dispBadge dispNotApplicable">No</span>
  );
}
