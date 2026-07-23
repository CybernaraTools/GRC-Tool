import { redirect } from "next/navigation";
import { AppShell } from "../../../src/components/app-shell";
import { ErrorState } from "../../../src/components/ui-states";
import { createServerApiClient, apiErrorMessage } from "../../../src/lib/api/server";
import type { AuditReport } from "../../../src/lib/api/generated";
import { loginPath } from "../../../src/lib/auth";
import { readSessionContext } from "../../../src/lib/session";

interface FrameworkComplianceView {
  frameworkKey: string;
  displayPercentage: string;
  formula: string;
  applicableCount: number;
  satisfiedCount: number;
  remediatedCount: number;
  acceptedRiskCount: number;
  unresolvedCount: number;
  notApplicableCount: number;
}

interface ControlDispositionView {
  controlId: string;
  harmonizedControlId: string;
  frameworkKey: string;
  disposition: string;
  reason: string;
}

interface NarrativeStatementView {
  text: string;
  citations: string[];
  claimType: "fact" | "inference" | "commentary";
}

type NarrativeSectionsView = Record<string, NarrativeStatementView[]>;

interface StructuredReportView {
  engineResult: { frameworks: FrameworkComplianceView[]; dispositions: ControlDispositionView[] };
  narrative: NarrativeSectionsView | null;
  evidenceLimitations: string[];
}

const NARRATIVE_SECTION_LABELS: Record<string, string> = {
  executiveSummary: "Executive Summary",
  overallAssessmentAnalysis: "Overall Assessment Analysis",
  frameworkComplianceNarrative: "Framework Compliance Narrative",
  controlObservations: "Control Observations",
  evidenceAnalysis: "Evidence Analysis",
  materialFindings: "Material Findings",
  riskAnalysis: "Risk Analysis",
  remediationAnalysis: "Remediation Analysis",
  acceptedResidualRiskNarrative: "Accepted Residual Risk Narrative",
  remainingGaps: "Remaining Gaps",
  managementAttentionAreas: "Management Attention Areas",
  auditorNotes: "Auditor Notes",
  limitations: "Limitations",
  conclusion: "Conclusion"
};

export default async function ReportViewerPage({
  params,
  searchParams
}: {
  params: Promise<{ reportId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { reportId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
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

  const actionError = value(resolvedSearchParams?.error);

  if (apiError || !report) {
    return (
      <AppShell session={session} title="Audit Report">
        <section className="workspace">
          <ErrorState title="Report could not be loaded" detail={apiError ?? "Report not found."} />
        </section>
      </AppShell>
    );
  }

  const structured = report.structuredReportJson as unknown as StructuredReportView;

  return (
    <AppShell session={session} title="Audit Report">
      <section className="workspace" aria-labelledby="report-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Audit Report</p>
            <h2 id="report-heading">Report {report.id}</h2>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span className={`badge ${report.lifecycleStatus === "published" ? "confidential" : "internal"}`}>{report.lifecycleStatus}</span>
            <a href={`/reports/${report.id}/download`}>Download PDF</a>
          </div>
        </div>

        {actionError ? <ErrorState title="Action failed" detail={actionError} /> : null}

        <GroundednessBadge report={report} />

        {report.lifecycleStatus === "draft" && report.groundednessScore === 100 ? (
          <form action="/reports/actions" method="post">
            <input type="hidden" name="intent" value="publishReport" />
            <input type="hidden" name="reportId" value={report.id} />
            <button type="submit">Publish Report</button>
          </form>
        ) : null}

        <div className="detailGrid">
          {structured.engineResult.frameworks.map((framework) => (
            <article key={framework.frameworkKey}>
              <span className="label">{framework.frameworkKey}</span>
              <strong>{framework.displayPercentage}</strong>
              <small>{framework.formula}</small>
              <small>
                Satisfied {framework.satisfiedCount} &middot; Remediation verified {framework.remediatedCount} &middot; Accepted risk{" "}
                {framework.acceptedRiskCount} &middot; Unresolved {framework.unresolvedCount} &middot; N/A {framework.notApplicableCount}
              </small>
            </article>
          ))}
        </div>

        <h3>Control Evaluation Matrix</h3>
        <div className="tableScroller">
          <table>
            <thead>
              <tr>
                <th scope="col">Framework</th>
                <th scope="col">Control</th>
                <th scope="col">Harmonized</th>
                <th scope="col">Disposition</th>
                <th scope="col">Reason</th>
              </tr>
            </thead>
            <tbody>
              {structured.engineResult.dispositions.map((disposition, index) => (
                <tr key={`${disposition.controlId}-${index}`}>
                  <td>{disposition.frameworkKey}</td>
                  <td>{disposition.controlId}</td>
                  <td>{disposition.harmonizedControlId}</td>
                  <td>{disposition.disposition}</td>
                  <td>{disposition.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {structured.evidenceLimitations.length > 0 ? (
          <>
            <h3>Evidence Limitations</h3>
            <ul>
              {structured.evidenceLimitations.map((limitation, index) => (
                <li key={index}>{limitation}</li>
              ))}
            </ul>
          </>
        ) : null}

        {Object.entries(NARRATIVE_SECTION_LABELS).map(([key, label]) => (
          <NarrativeSection key={key} label={label} statements={structured.narrative?.[key]} narrativeAvailable={report!.narrativeAvailable} />
        ))}
      </section>
    </AppShell>
  );
}

function GroundednessBadge({ report }: { report: AuditReport }) {
  const passed = report.groundednessScore === 100;
  return (
    <section className="stateBox" aria-live="polite">
      <h2>Groundedness: {report.groundednessScore}%</h2>
      <p>
        {passed
          ? "Every fact/inference statement in this report's narrative was verified against a real, cited source record before publication."
          : "This report's AI narrative did not reach 100% groundedness on generation. Narrative sections are marked unavailable below; all compliance scorecards, control matrix, findings/risk/remediation registers, and evidence matrix are still the full, trusted deterministic output."}
      </p>
      <small>
        Narrative available: {String(report.narrativeAvailable)} &middot; Validation attempts: {report.groundednessValidationLog.length}
      </small>
    </section>
  );
}

function NarrativeSection({
  label,
  statements,
  narrativeAvailable
}: {
  label: string;
  statements: NarrativeStatementView[] | undefined;
  narrativeAvailable: boolean;
}) {
  if (!narrativeAvailable || !statements || statements.length === 0) {
    return (
      <div>
        <h3>{label}</h3>
        <p className="badge public">AI narrative synthesis unavailable — did not pass grounding validation.</p>
      </div>
    );
  }
  return (
    <div>
      <h3>{label}</h3>
      {statements.map((statement, index) => (
        <p key={index} className={statement.claimType === "commentary" ? "badge internal" : undefined}>
          {statement.claimType === "commentary" ? <em>[AI professional observation] </em> : null}
          {statement.text}
          {statement.citations.length > 0 ? <small> ({statement.citations.join(", ")})</small> : null}
        </p>
      ))}
    </div>
  );
}

function value(input: string | string[] | undefined): string {
  return Array.isArray(input) ? input[0] ?? "" : input ?? "";
}
