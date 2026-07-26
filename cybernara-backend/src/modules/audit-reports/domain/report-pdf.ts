import { createHash } from "node:crypto";
import PDFDocument from "pdfkit";
import type { AuditReportJson } from "../application/audit-report.types.js";

export interface AuditReportPdfInput {
  reportId: string;
  generatedAt: Date;
  report: AuditReportJson;
}

// Mirrors app/reports/[reportId]/page.tsx section-for-section, field-for-field:
// same header content, same "no AI" note, the same 7 numbered sections in the
// same order, the same summary breakdowns, the same table columns. Nothing
// shown here that isn't on the website, and nothing on the website omitted
// here.
export async function renderAuditReportPdf(input: AuditReportPdfInput): Promise<Buffer> {
  return new Promise<Buffer>((resolve) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      margin: 48,
      bufferPages: true,
      info: { Title: "Cybernara GRC Platform - Assessment Audit Report", Author: "Cybernara" }
    });
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    const report = input.report;
    const shortId = `report-${input.reportId.slice(0, 8)}`;

    doc.fontSize(9).fillColor("gray").text("Closed Assessment Audit Report");
    doc.fillColor("black").fontSize(18).text(report.assessment.scopeName);
    doc.moveDown(0.3);
    doc.fontSize(10).text(`Assessment ID: ${report.assessment.id}  ·  Report ${shortId}  ·  Generated ${input.generatedAt.toLocaleString()}`);
    doc
      .fontSize(10)
      .fillColor("gray")
      .text(
        `Period ${toDate(report.assessment.periodStart)} - ${toDate(report.assessment.periodEnd)}  ·  Closed ${report.assessment.closedAt ? `${toDate(report.assessment.closedAt)} by ${report.assessment.closedBy}` : "Unknown"}  ·  Frameworks: ${report.assessment.frameworkKeys.join(", ") || "None"}`
      );
    doc.fillColor("black");
    doc.moveDown();
    doc
      .fontSize(9)
      .fillColor("gray")
      .text("Every figure below is read directly from live data for this assessment and computed by deterministic rules. No AI model was used to generate this report.");
    doc.fillColor("black").fontSize(11);

    section(doc, "1. Framework Compliance Scorecards");
    for (const framework of report.compliance.frameworks) {
      doc.text(`${framework.frameworkKey}: ${framework.displayPercentage}`);
      doc.fontSize(9).fillColor("gray").text(`  ${framework.formula}`);
      doc
        .text(
          `  Satisfied: ${framework.satisfiedCount}  Remediated: ${framework.remediatedCount}  Accepted Risk: ${framework.acceptedRiskCount}  Unresolved: ${framework.unresolvedCount}  Not Applicable: ${framework.notApplicableCount}`
        );
      doc.fillColor("black").fontSize(11);
    }
    if (report.compliance.frameworks.length === 0) {
      doc.fontSize(10).fillColor("gray").text("No framework-linked items on this assessment.");
      doc.fillColor("black").fontSize(11);
    }

    section(doc, "2. Control Evaluation Matrix");
    for (const disposition of report.compliance.dispositions) {
      doc
        .fontSize(9)
        .text(
          `${disposition.frameworkKey} | ${disposition.controlId} | ${disposition.harmonizedControlId} | ${disposition.disposition} | ${disposition.reason}`
        );
    }
    doc.fontSize(11);

    section(doc, "3. Evidence Matrix");
    doc
      .fontSize(10)
      .text(`Total: ${report.evidence.total}  ·  ${Object.entries(report.evidence.byState).map(([state, count]) => `${state}: ${count}`).join("  ·  ")}`);
    doc.fontSize(11);
    for (const evidence of report.evidence.items) {
      doc.fontSize(9).text(`${evidence.fileName} | ${evidence.state} | linked items: ${evidence.linkedItemIds.length}`);
    }
    doc.fontSize(11);

    section(doc, "4. Findings Register");
    doc
      .fontSize(10)
      .text(`Total: ${report.findings.total}  ·  ${Object.entries(report.findings.bySeverity).map(([severity, count]) => `${severity}: ${count}`).join("  ·  ")}`);
    doc.fontSize(11);
    for (const finding of report.findings.items) {
      doc.fontSize(9).text(`${finding.severity} | ${finding.description} | due: ${finding.dueAt ? toDate(finding.dueAt) : "—"}`);
    }
    doc.fontSize(11);

    section(doc, "5. Remediation Register");
    doc
      .fontSize(10)
      .text(`Total: ${report.remediationTasks.total}  ·  ${Object.entries(report.remediationTasks.byStatus).map(([status, count]) => `${status}: ${count}`).join("  ·  ")}`);
    doc.fontSize(11);
    for (const task of report.remediationTasks.items) {
      doc.fontSize(9).text(`${truncateId(task.id)} | finding ${truncateId(task.findingId)} | status: ${task.status} | due: ${toDate(task.dueAt)}`);
    }
    doc.fontSize(11);

    section(doc, "6. Accepted Residual Risks");
    doc.fontSize(10).text(`Total: ${report.riskAcceptances.total}  ·  Currently active: ${report.riskAcceptances.active}`);
    doc.fontSize(11);
    for (const acceptance of report.riskAcceptances.items) {
      doc
        .fontSize(9)
        .text(`finding ${truncateId(acceptance.findingId)} | ${acceptance.rationale} | active: ${acceptance.active ? "Yes" : "No"} | expires: ${toDate(acceptance.expiresAt)}`);
    }
    doc.fontSize(11);

    section(doc, "7. Reviewer Decisions");
    if (report.signoffs.length === 0) {
      doc.fontSize(10).fillColor("gray").text("No reviewer decisions recorded.");
      doc.fillColor("black").fontSize(11);
    } else {
      for (const signoff of report.signoffs) {
        doc.fontSize(9).text(`${signoff.scopeType} | ${signoff.decision} | ${truncateId(signoff.signerId)} | ${new Date(signoff.signedAt).toLocaleString()}`);
      }
      doc.fontSize(11);
    }

    doc.end();
  });
}

export function hashReportBytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function section(doc: PDFKit.PDFDocument, title: string): void {
  doc.moveDown(1.5);
  doc.fontSize(13).text(title);
  doc.fontSize(11);
  doc.moveDown(0.5);
}

function toDate(value: Date | string): string {
  return new Date(value).toLocaleDateString();
}

function truncateId(value: string): string {
  return value.slice(0, 8);
}
