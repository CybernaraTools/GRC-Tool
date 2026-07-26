import { createHash } from "node:crypto";
import PDFDocument from "pdfkit";
import type {
  AuditReportJson,
  EvidenceSummaryRow,
  FindingSummaryRow,
  QuestionAnswerRow,
  RemediationTaskSummaryRow,
  RiskAcceptanceSummaryRow,
  SignoffRow
} from "../application/audit-report.types.js";
import type { ControlDispositionResult, FrameworkComplianceResult } from "./compliance-engine.js";

export interface AuditReportPdfInput {
  reportId: string;
  generatedAt: Date;
  report: AuditReportJson;
}

// Colors lifted directly from cybernara-frontend/app/styles.css so the PDF
// reads as the same document as app/reports/[reportId]/page.tsx, not a
// plain-text dump of it. Section order, fields, and breakdowns mirror that
// page exactly - nothing shown here that isn't on the website, nothing on
// the website omitted here.
const INK = "#0c0a09";
const INK_MUTED = "#57534e";
const INK_FAINT = "#78716c";
const BORDER = "#e7e5e4";
const BORDER_STRONG = "#d6d3d1";
const HEADER_BG = "#f5f5f4";
const SURFACE_MUTED = "#fafaf9";

const DISPOSITION_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  approved: { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0", label: "Approved" },
  not_approved: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca", label: "Not Approved" },
  not_applicable: { bg: "#f3f4f6", text: "#4b5563", border: "#e5e7eb", label: "Not Applicable" }
};

const BOOLEAN_STYLES = {
  yes: { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0", label: "Yes" },
  no: { bg: "#f3f4f6", text: "#4b5563", border: "#e5e7eb", label: "No" }
};

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
    const left = doc.page.margins.left;
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Header card
    const headerTop = doc.y;
    doc.font("Helvetica").fontSize(9).fillColor(INK_MUTED).text("CLOSED ASSESSMENT AUDIT REPORT", left + 20, headerTop + 18, { characterSpacing: 0.6 });
    doc.font("Helvetica-Bold").fontSize(20).fillColor(INK).text(report.assessment.scopeName, left + 20, headerTop + 32, { width: contentWidth - 40 });
    let cursorY = doc.y + 6;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(INK_MUTED)
      .text(`Assessment ID: ${report.assessment.id}  ·  Report ${shortId}  ·  Generated ${input.generatedAt.toLocaleString()}`, left + 20, cursorY, {
        width: contentWidth - 40
      });
    cursorY = doc.y + 4;
    doc
      .fontSize(9)
      .fillColor(INK_FAINT)
      .text(
        `Period ${toDate(report.assessment.periodStart)} - ${toDate(report.assessment.periodEnd)}  ·  Closed ${
          report.assessment.closedAt ? `${toDate(report.assessment.closedAt)} by ${report.assessment.closedBy}` : "Unknown"
        }  ·  Frameworks: ${report.assessment.frameworkKeys.join(", ") || "None"}`,
        left + 20,
        cursorY,
        { width: contentWidth - 40 }
      );
    const headerBottom = doc.y + 18;
    doc.save();
    doc.roundedRect(left, headerTop, contentWidth, headerBottom - headerTop, 10).strokeColor(BORDER_STRONG).lineWidth(1).stroke();
    doc.restore();
    doc.y = headerBottom + 16;

    doc
      .fontSize(9)
      .fillColor(INK_FAINT)
      .text(
        "This report is a complete summary of this assessment from start to end - the questions asked, answers and evidence submitted, findings raised, remediation and risk acceptance activity, and the reviewer's own approval decisions. It does not re-evaluate anything: the compliance figures below reflect the review outcome already recorded during the assessment, exactly as recorded. No AI model was used to generate this report."
      );
    doc.moveDown(0.5);

    sectionHeader(doc, "1. Assessment Questions & Answers");
    drawQuestionAnswerCards(doc, report.questionsAndAnswers);

    sectionHeader(doc, "2. Framework Compliance Scorecards");
    drawFrameworkCards(doc, report.compliance.frameworks);

    sectionHeader(doc, "3. Control Evaluation Matrix");
    drawTable<ControlDispositionResult>(
      doc,
      [
        { header: "Framework", width: 65, text: (row) => row.frameworkKey, bold: true },
        { header: "Control", width: 80, text: (row) => row.controlId, mono: true },
        { header: "Harmonized Control", width: 80, text: (row) => row.harmonizedControlId, mono: true, muted: true },
        { header: "Disposition", width: 85, badge: (row) => DISPOSITION_STYLES[row.disposition] ?? DISPOSITION_STYLES.not_approved },
        { header: "Findings", width: 55, text: (row) => String(row.findingCount), align: "right" },
        { header: "Reason", width: contentWidth - 65 - 80 - 80 - 85 - 55, text: (row) => row.reason, muted: true }
      ],
      report.compliance.dispositions
    );

    sectionHeader(doc, "4. Evidence Matrix");
    summaryLine(doc, `Total: ${report.evidence.total}`, report.evidence.byState);
    drawTable<EvidenceSummaryRow>(
      doc,
      [
        { header: "File", width: contentWidth - 100 - 100, text: (row) => row.fileName, bold: true },
        { header: "State", width: 100, text: (row) => row.state },
        { header: "Linked Items", width: 100, text: (row) => String(row.linkedItemIds.length) }
      ],
      report.evidence.items
    );

    sectionHeader(doc, "5. Findings Register");
    summaryLine(doc, `Total: ${report.findings.total}`, report.findings.bySeverity);
    drawTable<FindingSummaryRow>(
      doc,
      [
        { header: "Control", width: 90, text: (row) => (row.frameworkKey && row.controlId ? `${row.frameworkKey} ${row.controlId}` : "—"), bold: true },
        { header: "Severity", width: 55, text: (row) => capitalize(row.severity) },
        { header: "Description", width: contentWidth - 90 - 55 - 75 - 60 - 60, text: (row) => row.description, muted: true },
        { header: "Remediated", width: 75, badge: (row) => (row.remediationStatus === "verified" ? BOOLEAN_STYLES.yes : BOOLEAN_STYLES.no) },
        { header: "Risk Accepted", width: 60, badge: (row) => (row.riskAccepted ? BOOLEAN_STYLES.yes : BOOLEAN_STYLES.no) },
        { header: "Due", width: 60, text: (row) => (row.dueAt ? toDate(row.dueAt) : "—") }
      ],
      report.findings.items
    );

    sectionHeader(doc, "6. Remediation Register");
    summaryLine(doc, `Total: ${report.remediationTasks.total}`, report.remediationTasks.byStatus);
    drawTable<RemediationTaskSummaryRow>(
      doc,
      [
        { header: "Task", width: 90, text: (row) => truncateId(row.id), mono: true },
        { header: "Finding", width: 90, text: (row) => truncateId(row.findingId), mono: true },
        { header: "Status", width: contentWidth - 90 - 90 - 100, text: (row) => row.status },
        { header: "Due", width: 100, text: (row) => toDate(row.dueAt) }
      ],
      report.remediationTasks.items
    );

    sectionHeader(doc, "7. Accepted Residual Risks");
    doc.fontSize(9).fillColor(INK_MUTED).text(`Total: ${report.riskAcceptances.total}  ·  Currently active: ${report.riskAcceptances.active}`);
    doc.moveDown(0.5);
    drawTable<RiskAcceptanceSummaryRow>(
      doc,
      [
        { header: "Finding", width: 65, text: (row) => truncateId(row.findingId), mono: true },
        { header: "Risk", width: 100, text: (row) => (row.riskTitle ? `${row.riskTitle} (${row.riskCategory ?? "—"})` : "—"), bold: true },
        {
          header: "Risk Score",
          width: 65,
          text: (row) => (row.riskInherentScore !== undefined ? `${row.riskInherentScore} → ${row.riskResidualScore}` : "—")
        },
        { header: "Rationale", width: contentWidth - 65 - 100 - 65 - 50 - 80, text: (row) => row.rationale, muted: true },
        { header: "Active", width: 50, badge: (row) => (row.active ? BOOLEAN_STYLES.yes : BOOLEAN_STYLES.no) },
        { header: "Expires", width: 80, text: (row) => toDate(row.expiresAt) }
      ],
      report.riskAcceptances.items
    );

    sectionHeader(doc, "8. Reviewer Decisions");
    if (report.signoffs.length === 0) {
      doc.fontSize(9).fillColor(INK_MUTED).text("No reviewer decisions recorded.");
    } else {
      drawTable<SignoffRow>(
        doc,
        [
          { header: "Scope", width: 90, text: (row) => row.scopeType, bold: true },
          { header: "Decision", width: 90, text: (row) => capitalize(row.decision) },
          { header: "Signer", width: 90, text: (row) => truncateId(row.signerId), mono: true },
          { header: "Signed At", width: contentWidth - 90 - 90 - 90, text: (row) => new Date(row.signedAt).toLocaleString() }
        ],
        report.signoffs
      );
    }

    doc.end();
  });
}

export function hashReportBytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number): void {
  if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

function sectionHeader(doc: PDFKit.PDFDocument, title: string): void {
  ensureSpace(doc, 44);
  doc.moveDown(1.2);
  const left = doc.page.margins.left;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.font("Helvetica-Bold").fontSize(10).fillColor(INK_MUTED).text(title.toUpperCase(), left, doc.y, { characterSpacing: 0.6 });
  const lineY = doc.y + 4;
  doc.moveTo(left, lineY).lineTo(left + contentWidth, lineY).strokeColor(BORDER).lineWidth(1.5).stroke();
  doc.y = lineY + 12;
  doc.font("Helvetica").fontSize(9).fillColor(INK);
}

function summaryLine(doc: PDFKit.PDFDocument, prefix: string, breakdown: Record<string, number>): void {
  const parts = Object.entries(breakdown).map(([key, count]) => `${key}: ${count}`);
  doc
    .fontSize(9)
    .fillColor(INK_MUTED)
    .text(parts.length > 0 ? `${prefix}  ·  ${parts.join("  ·  ")}` : prefix);
  doc.moveDown(0.5);
  doc.fillColor(INK);
}

function drawQuestionAnswerCards(doc: PDFKit.PDFDocument, rows: QuestionAnswerRow[]): void {
  if (rows.length === 0) {
    doc.fontSize(9).fillColor(INK_MUTED).text("No questions on this assessment.");
    doc.fillColor(INK);
    return;
  }

  const left = doc.page.margins.left;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const pad = 12;
  const innerWidth = contentWidth - pad * 2;

  for (const row of rows) {
    doc.font("Helvetica-Bold").fontSize(9.5);
    const questionLines = doc.heightOfString(row.questionText, { width: innerWidth });
    const answerText = row.answerText ?? "Not answered.";
    doc.font("Helvetica").fontSize(9);
    const answerLines = doc.heightOfString(answerText, { width: innerWidth });
    const metaHeight = 14;
    const cardHeight = pad * 2 + 12 + questionLines + 6 + answerLines + 8 + metaHeight;

    ensureSpace(doc, cardHeight + 10);
    const top = doc.y;

    doc.save();
    doc.roundedRect(left, top, contentWidth, cardHeight, 6).fillColor(SURFACE_MUTED).fill();
    doc.roundedRect(left, top, contentWidth, cardHeight, 6).strokeColor(BORDER).lineWidth(1).stroke();
    doc.restore();

    let cy = top + pad;
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(INK_MUTED)
      .text(`${row.frameworkKey}  ·  ${row.controlId}`, left + pad, cy, { width: innerWidth, lineBreak: false });
    cy += 12;

    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK).text(row.questionText, left + pad, cy, { width: innerWidth });
    cy += questionLines + 6;

    doc
      .font(row.answerText ? "Helvetica" : "Helvetica-Oblique")
      .fontSize(9)
      .fillColor(row.answerText ? INK_MUTED : INK_FAINT)
      .text(answerText, left + pad, cy, { width: innerWidth });
    cy += answerLines + 8;

    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(INK_FAINT)
      .text(
        `Applicable: ${row.applicable ? "Yes" : `No${row.applicabilityRationale ? ` — ${row.applicabilityRationale}` : ""}`}  ·  Evidence attached: ${row.evidenceCount}`,
        left + pad,
        cy,
        { width: innerWidth }
      );

    doc.y = top + cardHeight + 8;
  }
  doc.fillColor(INK).font("Helvetica").fontSize(9);
}

function drawFrameworkCards(doc: PDFKit.PDFDocument, frameworks: FrameworkComplianceResult[]): void {
  if (frameworks.length === 0) {
    doc.fontSize(9).fillColor(INK_MUTED).text("No framework-linked items on this assessment.");
    doc.fillColor(INK);
    return;
  }

  const left = doc.page.margins.left;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const gap = 14;
  const columns = 2;
  const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
  const cardHeight = 108;

  let col = 0;
  let rowY = doc.y;

  for (const framework of frameworks) {
    if (col === 0) {
      ensureSpace(doc, cardHeight + gap);
      rowY = doc.y;
    }
    const x = left + col * (cardWidth + gap);
    drawFrameworkCard(doc, x, rowY, cardWidth, cardHeight, framework);
    col += 1;
    if (col >= columns) {
      col = 0;
      doc.y = rowY + cardHeight + gap;
    }
  }
  if (col !== 0) {
    doc.y = rowY + cardHeight + gap;
  }
  doc.fillColor(INK).font("Helvetica").fontSize(9);
}

function drawFrameworkCard(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, framework: FrameworkComplianceResult): void {
  const pad = 14;
  doc.save();
  doc.roundedRect(x, y, w, h, 8).strokeColor(BORDER).lineWidth(1).stroke();
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(11).fillColor(INK).text(framework.frameworkKey, x + pad, y + pad, { width: w - pad * 2 - 90, lineBreak: false });
  const isNa = framework.rawPercentage === null;
  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor(isNa ? INK_FAINT : INK)
    .text(framework.displayPercentage, x + pad, y + pad - 4, { width: w - pad * 2, align: "right", lineBreak: false });

  let cy = y + pad + 24;
  doc.font("Helvetica").fontSize(7).fillColor(INK_FAINT).text(framework.formula, x + pad, cy, { width: w - pad * 2 });
  cy += doc.heightOfString(framework.formula, { width: w - pad * 2 }) + 8;

  doc.moveTo(x + pad, cy).lineTo(x + w - pad, cy).strokeColor(BORDER).lineWidth(0.75).stroke();
  cy += 10;

  const stats: Array<[string, number]> = [
    ["Approved", framework.approvedCount],
    ["Not Approved", framework.notApprovedCount],
    ["Not Applicable", framework.notApplicableCount]
  ];
  const statColWidth = (w - pad * 2) / 2;
  doc.fontSize(8);
  for (const [index, [label, value]] of stats.entries()) {
    const sx = x + pad + (index % 2) * statColWidth;
    const sy = cy + Math.floor(index / 2) * 15;
    doc.fillColor(INK_MUTED).font("Helvetica").text(label, sx, sy, { width: statColWidth - 30, lineBreak: false });
    doc.fillColor(INK).font("Helvetica-Bold").text(String(value), sx, sy, { width: statColWidth - 4, align: "right", lineBreak: false });
  }
}

interface TableColumn<T> {
  header: string;
  width: number;
  text?: (row: T) => string;
  badge?: (row: T) => { bg: string; text: string; border: string; label: string };
  bold?: boolean;
  mono?: boolean;
  muted?: boolean;
  align?: "left" | "right";
}

function drawTable<T>(doc: PDFKit.PDFDocument, columns: TableColumn<T>[], rows: T[]): void {
  if (rows.length === 0) {
    doc.moveDown(0.3);
    return;
  }

  const left = doc.page.margins.left;
  const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
  const cellPaddingX = 8;
  const cellPaddingY = 8;
  const headerHeight = 22;

  function drawHeader(): void {
    ensureSpace(doc, headerHeight + 30);
    const y = doc.y;
    doc.save();
    doc.rect(left, y, tableWidth, headerHeight).fill(HEADER_BG);
    doc.restore();
    let x = left;
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(INK_MUTED);
    for (const col of columns) {
      doc.text(col.header.toUpperCase(), x + cellPaddingX, y + 8, { width: col.width - cellPaddingX * 2, lineBreak: false, characterSpacing: 0.3 });
      x += col.width;
    }
    doc.y = y + headerHeight;
    doc.moveTo(left, doc.y).lineTo(left + tableWidth, doc.y).strokeColor(BORDER_STRONG).lineWidth(1).stroke();
    doc.font("Helvetica").fontSize(9).fillColor(INK);
  }

  drawHeader();

  for (const row of rows) {
    const cellTexts = columns.map((col) => (col.badge ? null : col.text ? col.text(row) : ""));
    doc.font("Helvetica").fontSize(8.5);
    const heights = columns.map((col, index) => (col.badge ? 18 : doc.heightOfString(cellTexts[index] ?? "", { width: col.width - cellPaddingX * 2 })));
    const rowHeight = Math.max(...heights) + cellPaddingY * 2;

    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      drawHeader();
    }

    const rowY = doc.y;
    let x = left;
    for (const [index, col] of columns.entries()) {
      if (col.badge) {
        const style = col.badge(row);
        drawBadge(doc, x + cellPaddingX, rowY + cellPaddingY - 2, style);
      } else {
        doc
          .font(col.mono ? "Courier" : col.bold ? "Helvetica-Bold" : "Helvetica")
          .fontSize(8.5)
          .fillColor(col.muted ? INK_MUTED : INK)
          .text(cellTexts[index] ?? "", x + cellPaddingX, rowY + cellPaddingY, { width: col.width - cellPaddingX * 2, align: col.align ?? "left" });
      }
      x += col.width;
    }
    doc.y = rowY + rowHeight;
    doc.moveTo(left, doc.y).lineTo(left + tableWidth, doc.y).strokeColor(BORDER).lineWidth(0.5).stroke();
  }
  doc.font("Helvetica").fontSize(9).fillColor(INK);
  doc.moveDown(0.8);
}

function drawBadge(doc: PDFKit.PDFDocument, x: number, y: number, style: { bg: string; text: string; border: string; label: string }): void {
  doc.save();
  doc.font("Helvetica-Bold").fontSize(7);
  const textWidth = doc.widthOfString(style.label);
  const paddingX = 6;
  const width = textWidth + paddingX * 2;
  const height = 15;
  doc.roundedRect(x, y, width, height, height / 2).fillColor(style.bg).fill();
  doc.roundedRect(x, y, width, height, height / 2).strokeColor(style.border).lineWidth(0.75).stroke();
  doc.fillColor(style.text).text(style.label, x + paddingX, y + 4, { lineBreak: false });
  doc.restore();
}

function toDate(value: Date | string): string {
  return new Date(value).toLocaleDateString();
}

function truncateId(value: string): string {
  return value.slice(0, 8);
}

function capitalize(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}
