import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "../../../src/components/app-shell";
import { ErrorState } from "../../../src/components/ui-states";
import { createServerApiClient, apiErrorMessage } from "../../../src/lib/api/server";
import type { AuditReport } from "../../../src/lib/api/generated";
import { loginPath } from "../../../src/lib/auth";
import { readSessionContext } from "../../../src/lib/session";

interface FrameworkComplianceView {
  frameworkKey: string;
  displayPercentage: string;
  rawPercentage: number | null;
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
  const shortId = `report-${report.id.slice(0, 8)}`;
  const canPublish = report.lifecycleStatus === "draft" && report.groundednessScore === 100;

  return (
    <AppShell session={session} title="Audit Report Viewer">
      <div className="reportDocContainer">
        <Link href="/reports" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: "var(--ink-muted)", textDecoration: "none" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>arrow_back</span>
          Back to Audit Reports
        </Link>

        {/* 1. REPORT HEADER */}
        <header className="reportHeaderCard">
          <div className="reportHeaderLeft">
            <span className="eyebrow">Closed Assessment Audit Report</span>
            <h2 className="reportHeaderTitle">Report {shortId}</h2>
            <div className="reportIdMeta">
              <span>Full Identifier:</span>
              <code className="reportIdChip" title={report.id}>{report.id}</code>
              <span>&middot;</span>
              <span>Generated {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString() : "recent"}</span>
            </div>
          </div>

          <div className="reportHeaderActions">
            <span className={`dispBadge ${report.lifecycleStatus === "published" ? "dispSatisfied" : "dispNotApplicable"}`}>
              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                {report.lifecycleStatus === "published" ? "verified" : "edit_note"}
              </span>
              {report.lifecycleStatus.toUpperCase()}
            </span>

            <a href={`/reports/${report.id}/download`} style={{ textDecoration: "none" }}>
              <button type="button" className="secondaryButton" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>download</span>
                Download PDF
              </button>
            </a>

            {canPublish ? (
              <form action="/reports/actions" method="post" style={{ margin: 0 }}>
                <input type="hidden" name="intent" value="publishReport" />
                <input type="hidden" name="reportId" value={report.id} />
                <button type="submit" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>publish</span>
                  Publish Report
                </button>
              </form>
            ) : null}
          </div>
        </header>

        {actionError ? <ErrorState title="Action failed" detail={actionError} /> : null}

        {/* 2. GROUNDEDNESS / ASSURANCE CARD */}
        <GroundednessAssuranceCard report={report} />

        {/* TRUST BOUNDARY 1: DETERMINISTIC PLATFORM DATA */}
        <section className="trustBoundary" aria-label="Deterministic compliance data">
          <div className="trustBoundaryHeader">
            <span className="trustBoundaryTitle">Deterministic Platform Data (Source of Truth)</span>
            <span className="trustBoundaryBadge trustBoundaryBadgeVerified">
              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>verified_user</span>
              Engine Verified
            </span>
          </div>

          {/* 3. FRAMEWORK COMPLIANCE SCORECARDS */}
          <div className="frameworkGrid">
            {structured.engineResult.frameworks.map((fw) => (
              <FrameworkScorecardView key={fw.frameworkKey} framework={fw} />
            ))}
          </div>

          {/* 4. CONTROL EVALUATION MATRIX */}
          <article className="matrixCard">
            <div>
              <h3>Control Evaluation Matrix</h3>
              <p style={{ fontSize: "12px", color: "var(--ink-muted)", marginTop: "4px" }}>
                Deterministic evaluation of controls based on submitted answers, evidence links, reviewer approvals, and risk acceptances.
              </p>
            </div>
            <div className="tableScrollerClean">
              <table className="matrixTable">
                <thead>
                  <tr>
                    <th scope="col">Framework</th>
                    <th scope="col">Control</th>
                    <th scope="col">Harmonized Control</th>
                    <th scope="col">Disposition</th>
                    <th scope="col">Evaluation Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {structured.engineResult.dispositions.map((disp, idx) => (
                    <tr key={`${disp.controlId}-${idx}`}>
                      <td style={{ fontWeight: 700 }}>{disp.frameworkKey}</td>
                      <td>
                        <code style={{ fontSize: "12px", fontWeight: 700 }}>{disp.controlId}</code>
                      </td>
                      <td>
                        <code style={{ fontSize: "11px", color: "var(--ink-muted)" }}>{disp.harmonizedControlId}</code>
                      </td>
                      <td>
                        <DispositionPill disposition={disp.disposition} />
                      </td>
                      <td className="matrixReasonText">{disp.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          {/* 5. EVIDENCE / DATA QUALITY LIMITATIONS */}
          {structured.evidenceLimitations.length > 0 ? (
            <article className="limitationsCard">
              <div className="limitationsTitle">
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>warning</span>
                Data Quality & Evidence Limitations
              </div>
              <ul className="limitationsList">
                {structured.evidenceLimitations.map((lim, idx) => (
                  <li key={idx}>{lim}</li>
                ))}
              </ul>
            </article>
          ) : null}
        </section>

        {/* TRUST BOUNDARY 2: AI NARRATIVE SYNTHESIS */}
        <section className="trustBoundary" aria-label="AI narrative synthesis">
          <div className="trustBoundaryHeader">
            <span className="trustBoundaryTitle">AI Narrative Synthesis</span>
            <span className="trustBoundaryBadge trustBoundaryBadgeAi">
              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>psychology</span>
              Governed AI Synthesis
            </span>
          </div>

          {/* 9. NARRATIVE UNAVAILABLE STATE OR SECTIONS */}
          {!report.narrativeAvailable ? (
            <article className="narrativeUnavailablePanel">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--ink-muted)" }}>info</span>
                <span className="narrativeUnavailableTitle">AI Narrative Synthesis Unavailable</span>
              </div>
              <p className="narrativeUnavailableDesc">
                The generated AI narrative did not satisfy Cybernara's strict 100% grounding requirement during validation attempt budget and was excluded from this report. All deterministic framework scorecards, control matrix, and data quality limitations above remain fully available as the primary source of truth.
              </p>
            </article>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {Object.entries(NARRATIVE_SECTION_LABELS).map(([key, label]) => {
                const stmts = structured.narrative?.[key];
                if (!stmts || stmts.length === 0) return null;
                return <NarrativeSectionCard key={key} label={label} statements={stmts} />;
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function GroundednessAssuranceCard({ report }: { report: AuditReport }) {
  const passed = report.groundednessScore === 100;
  return (
    <article className={`assuranceCard ${passed ? "assuranceCardSuccess" : "assuranceCardWarning"}`}>
      <div className="assuranceHeader">
        <div className="assuranceScoreGroup">
          <span className={`material-symbols-outlined ${passed ? "assuranceScoreSuccess" : "assuranceScoreWarning"}`} style={{ fontSize: "32px" }}>
            {passed ? "verified" : "gpp_maybe"}
          </span>
          <div>
            <div className={`assuranceScore ${passed ? "assuranceScoreSuccess" : "assuranceScoreWarning"}`}>
              {report.groundednessScore}% Groundedness
            </div>
            <div className="assuranceTitle">
              {passed ? "Rule #2 Citation-Grounded Narrative" : "AI Narrative Grounding Rejected"}
            </div>
          </div>
        </div>

        <div className="assurancePills">
          <span className="assurancePill">
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
              {passed ? "check_circle" : "cancel"}
            </span>
            Narrative: {report.narrativeAvailable ? "Verified & Included" : "Excluded (<100%)"}
          </span>

          <span className="assurancePill">
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>refresh</span>
            Validation Attempts: {report.groundednessValidationLog.length}
          </span>
        </div>
      </div>

      <p className="assuranceDescription">
        {passed
          ? "Every fact and inference statement in this narrative was strictly verified against a cited source record before publication. No ungrounded claims or hallucinated numeric values were permitted."
          : "This report's AI narrative did not reach 100% groundedness during generation and was excluded from display. The deterministic compliance output below remains the fully trusted source of truth."}
      </p>
    </article>
  );
}

function FrameworkScorecardView({ framework }: { framework: FrameworkComplianceView }) {
  const isNa = framework.rawPercentage === null;
  return (
    <article className="frameworkScorecard">
      <div className="frameworkScorecardHeader">
        <span className="frameworkKeyBadge">{framework.frameworkKey}</span>
        <span className={isNa ? "frameworkBigNa" : "frameworkBigPercentage"}>
          {framework.displayPercentage}
        </span>
      </div>

      <div className="frameworkFormula">{framework.formula}</div>

      <div className="frameworkStatsList">
        <div className="frameworkStatItem">
          <span>Satisfied</span>
          <strong>{framework.satisfiedCount}</strong>
        </div>
        <div className="frameworkStatItem">
          <span>Remediated</span>
          <strong>{framework.remediatedCount}</strong>
        </div>
        <div className="frameworkStatItem">
          <span>Accepted Risk</span>
          <strong>{framework.acceptedRiskCount}</strong>
        </div>
        <div className="frameworkStatItem">
          <span>Unresolved</span>
          <strong>{framework.unresolvedCount}</strong>
        </div>
        <div className="frameworkStatItem" style={{ gridColumn: "span 2" }}>
          <span>Not Applicable</span>
          <strong>{framework.notApplicableCount}</strong>
        </div>
      </div>
    </article>
  );
}

function DispositionPill({ disposition }: { disposition: string }) {
  switch (disposition) {
    case "satisfied":
      return <span className="dispBadge dispSatisfied">Satisfied</span>;
    case "remediation_verified":
      return <span className="dispBadge dispRemediated">Remediation Verified</span>;
    case "accepted_residual_risk":
      return <span className="dispBadge dispAcceptedRisk">Accepted Residual Risk</span>;
    case "not_applicable":
      return <span className="dispBadge dispNotApplicable">Not Applicable</span>;
    case "unresolved":
    default:
      return <span className="dispBadge dispUnresolved">Unresolved</span>;
  }
}

function NarrativeSectionCard({ label, statements }: { label: string; statements: NarrativeStatementView[] }) {
  return (
    <article className="narrativeCard">
      <div className="narrativeSectionHeader">
        <h3 className="narrativeTitle">{label}</h3>
        <span className="label" style={{ fontSize: "10px" }}>AI Synthesis</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {statements.map((stmt, idx) => (
          <NarrativeStatementBlock key={idx} statement={stmt} />
        ))}
      </div>
    </article>
  );
}

function NarrativeStatementBlock({ statement }: { statement: NarrativeStatementView }) {
  if (statement.claimType === "commentary") {
    return (
      <div className="aiObservationBox">
        <div className="aiObservationHeader">
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>lightbulb</span>
          AI Advisory Observation
        </div>
        <div className="aiObservationText">{statement.text}</div>
      </div>
    );
  }

  return (
    <div className="narrativeStatement">
      <div>{statement.text}</div>
      {statement.citations.length > 0 ? (
        <div className="citationChipsRow">
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink-faint)", marginRight: "2px" }}>Sources:</span>
          {statement.citations.map((citationId) => (
            <CitationChip key={citationId} citationId={citationId} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CitationChip({ citationId }: { citationId: string }) {
  const parts = citationId.split(":");
  const type = parts[0] ?? "";
  let icon = "description";
  let label = citationId;

  if (type === "FRAMEWORK_COMPLIANCE") {
    icon = "verified";
    label = `Framework · ${parts[1] ?? ""}`;
  } else if (type === "CONTROL") {
    icon = "rule";
    label = `Control · ${parts[2] ?? parts[1] ?? ""}`;
  } else if (type === "FINDING") {
    icon = "warning";
    label = `Finding · ${parts[1]?.slice(0, 8) ?? ""}`;
  } else if (type === "RISK_ACCEPTANCE") {
    icon = "task_alt";
    label = `Risk Acceptance · ${parts[1]?.slice(0, 8) ?? ""}`;
  } else if (type === "EVIDENCE") {
    icon = "description";
    label = `Evidence · ${parts[1]?.slice(0, 8) ?? ""}`;
  } else if (type === "RISK") {
    icon = "shield";
    label = `Risk · ${parts[1]?.slice(0, 8) ?? ""}`;
  }

  return (
    <span className="citationChip" title={`Source Citation: ${citationId}`}>
      <span className="material-symbols-outlined citationChipIcon">{icon}</span>
      <span>{label}</span>
    </span>
  );
}

function value(input: string | string[] | undefined): string {
  return Array.isArray(input) ? input[0] ?? "" : input ?? "";
}
