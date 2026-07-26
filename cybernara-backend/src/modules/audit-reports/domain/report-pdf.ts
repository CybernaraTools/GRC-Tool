import { createHash } from "node:crypto";
import PDFDocument from "pdfkit";
import type { AuditReportJson } from "../application/audit-report.types.js";

export interface AuditReportPdfInput {
  reportId: string;
  generatedAt: Date;
  report: AuditReportJson;
}

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

    doc.fontSize(20).text("Cybernara GRC Platform", { align: "center" });
    doc.fontSize(16).text("Assessment Audit Report", { align: "center" });
    doc.moveDown(2);
    doc.fontSize(11);
    doc.text(`Assessment: ${report.assessment.scopeName}`);
    doc.text(`Assessment ID: ${report.assessment.id}`);
    doc.text(`Status: ${report.assessment.status}`);
    doc.text(`Assessment Period: ${toDate(report.assessment.periodStart)} to ${toDate(report.assessment.periodEnd)}`);
    doc.text(`Closed: ${report.assessment.closedAt ? `${toDate(report.assessment.closedAt)} by ${report.assessment.closedBy}` : "Unknown"}`);
    doc.text(`Report ID: ${input.reportId}`);
    doc.text(`Report Generated: ${input.generatedAt.toISOString()}`);
    doc.moveDown();
    doc
      .fontSize(9)
      .fillColor("gray")
      .text("Every figure in this report is read directly from live platform data for this assessment and computed by deterministic rules. No AI model was used to generate this report.");
    doc.fillColor("black").fontSize(11);

    section(doc, "1. Frameworks Evaluated");
    doc.text(report.assessment.frameworkKeys.join(", ") || "None");

    section(doc, "2. Framework Compliance Scorecards");
    for (const framework of report.compliance.frameworks) {
      doc.text(`${framework.frameworkKey}: ${framework.displayPercentage}`);
      doc.fontSize(9).fillColor("gray").text(`  ${framework.formula}`);
      doc.fillColor("black").fontSize(11);
    }

    section(doc, "3. Control Evaluation Matrix");
    for (const disposition of report.compliance.dispositions) {
      doc
        .fontSize(9)
        .text(
          `${disposition.frameworkKey} | ${disposition.controlId} | ${disposition.harmonizedControlId} | ${disposition.disposition} | findings: ${disposition.findingIds.length}`
        );
    }
    doc.fontSize(11);

    section(doc, "4. Evidence Matrix");
    doc.text(`Total evidence objects: ${report.evidence.total}`);
    for (const evidence of report.evidence.items) {
      doc.fontSize(9).text(`${evidence.fileName} | state: ${evidence.state} | linked items: ${evidence.linkedItemIds.length}`);
    }
    doc.fontSize(11);

    section(doc, "5. Findings Register");
    doc.text(`Total findings: ${report.findings.total}`);
    for (const finding of report.findings.items) {
      doc.fontSize(9).text(`${finding.id} | severity: ${finding.severity} | ${finding.description}`);
    }
    doc.fontSize(11);

    section(doc, "6. Remediation Register");
    doc.text(`Total remediation tasks: ${report.remediationTasks.total}`);
    for (const task of report.remediationTasks.items) {
      doc.fontSize(9).text(`${task.id} | finding ${task.findingId} | status: ${task.status} | due: ${toDate(task.dueAt)}`);
    }
    doc.fontSize(11);

    section(doc, "7. Accepted Residual Risks");
    doc.text(`Total risk acceptances: ${report.riskAcceptances.total} (${report.riskAcceptances.active} currently active)`);
    for (const acceptance of report.riskAcceptances.items) {
      doc
        .fontSize(9)
        .text(`${acceptance.id} | finding ${acceptance.findingId} | active: ${acceptance.active} | expires: ${toDate(acceptance.expiresAt)}`);
    }
    doc.fontSize(11);

    section(doc, "8. Reviewer Decisions");
    for (const signoff of report.signoffs) {
      doc.fontSize(9).text(`${signoff.scopeType} | ${signoff.decision} | by ${signoff.signerId} at ${signoff.signedAt}`);
    }
    doc.fontSize(11);

    section(doc, "9. Report Accuracy Statement");
    doc
      .fontSize(10)
      .text(
        "Every figure in this report is read directly from live platform data for this assessment and computed by deterministic rules. No AI model was called to generate, summarize, or interpret any part of this report."
      );
    doc.fontSize(11);

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
  return new Date(value).toISOString().slice(0, 10);
}
