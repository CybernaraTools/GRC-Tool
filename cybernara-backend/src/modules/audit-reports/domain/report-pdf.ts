import { createHash } from "node:crypto";
import PDFDocument from "pdfkit";
import type { ClosureSnapshotPayload } from "../../closure-snapshot/public.js";
import type { ComplianceEngineResult } from "./compliance-engine.js";
import type { NarrativePayload, NarrativeStatement } from "./narrative-schema.js";
import type { ValidationAttemptResult } from "./groundedness-validator.js";

export interface AuditReportPdfInput {
  reportId: string;
  snapshotId: string;
  reportHash: string;
  generatedAt: Date;
  snapshot: ClosureSnapshotPayload;
  engineResult: ComplianceEngineResult;
  narrative: NarrativePayload | null;
  narrativeAvailable: boolean;
  finalValidation: ValidationAttemptResult;
  groundednessScore: number;
}

const NARRATIVE_UNAVAILABLE_MESSAGE = "AI narrative synthesis unavailable — did not pass grounding validation.";

export async function renderAuditReportPdf(input: AuditReportPdfInput): Promise<Buffer> {
  return new Promise<Buffer>((resolve) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 48, bufferPages: true, info: { Title: "Cybernara GRC Platform - Assessment Audit Report", Author: "Cybernara" } });
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    // 1. Cover page
    doc.fontSize(20).text("Cybernara GRC Platform", { align: "center" });
    doc.fontSize(16).text("Assessment Audit Report", { align: "center" });
    doc.moveDown(2);
    doc.fontSize(11);
    doc.text(`Assessment Name: ${input.snapshot.assessment.scopeName}`);
    doc.text(`Assessment ID: ${input.snapshot.assessment.id}`);
    doc.text(`Assessment Period: ${input.snapshot.assessment.periodStart} to ${input.snapshot.assessment.periodEnd}`);
    doc.text(`Closure Date: ${input.snapshot.capturedAt}`);
    doc.text(`Report Generated Date: ${input.generatedAt.toISOString()}`);
    doc.text(`Report ID: ${input.reportId}`);
    doc.text(`Snapshot ID: ${input.snapshotId}`);
    doc.text(`Report Hash: ${input.reportHash}`);
    doc.text(`Historical Assurance Level: ${input.snapshot.historicalAssuranceLevel}`);
    if (input.snapshot.reconstructed) {
      doc.moveDown();
      doc.fillColor("red").text(`Reconstructed snapshot: ${input.snapshot.reconstructionNote ?? "This assessment closed before native snapshot capture existed."}`);
      doc.fillColor("black");
    }

    section(doc, "2. Executive Summary");
    renderSection(doc, input.narrative?.executiveSummary, input.narrativeAvailable);

    section(doc, "3. Assessment Scope");
    doc.text(`Scope: ${input.snapshot.assessment.scopeName}`);
    doc.text(`Status at closure: ${input.snapshot.assessment.status}`);
    doc.text(`Control snapshot version: ${input.snapshot.assessment.controlSnapshotVersion}`);

    section(doc, "4. Frameworks Evaluated");
    for (const framework of input.engineResult.frameworks) {
      doc.text(`${framework.frameworkKey} (${framework.frameworkVersion})`);
    }

    section(doc, "5. Overall Compliance Summary");
    renderSection(doc, input.narrative?.overallAssessmentAnalysis, input.narrativeAvailable);

    section(doc, "6. Framework Compliance Scorecards");
    for (const framework of input.engineResult.frameworks) {
      doc.text(`${framework.frameworkKey}: ${framework.displayPercentage}`, { continued: false });
    }

    section(doc, "7. Compliance Calculation Methodology");
    for (const framework of input.engineResult.frameworks) {
      doc.fontSize(10).text(`${framework.frameworkKey}: ${framework.formula}`);
    }
    doc.fontSize(11);

    section(doc, "8. Harmonized Control Coverage");
    const harmonizedIds = new Set(input.snapshot.items.map((item) => item.controlRef.harmonizedControlId));
    doc.text(`${harmonizedIds.size} distinct harmonized controls in scope across ${input.engineResult.frameworks.length} framework(s).`);

    section(doc, "9. Detailed Control Evaluation Matrix");
    for (const disposition of input.engineResult.dispositions) {
      doc
        .fontSize(9)
        .text(
          `${disposition.frameworkKey} | ${disposition.controlId} | ${disposition.harmonizedControlId} | ${disposition.disposition} | findings: ${disposition.findingIds.length}`
        );
    }
    doc.fontSize(11);

    section(doc, "10. Assessment Question & Answer Details");
    for (const item of input.snapshot.items) {
      doc.fontSize(9).text(`[${item.controlRef.controlId}] Answer: ${item.answerText ?? "Not provided"}`);
    }
    doc.fontSize(11);

    section(doc, "11. Evidence Matrix");
    for (const evidence of input.snapshot.evidence) {
      doc
        .fontSize(9)
        .text(`${evidence.fileName} | ${evidence.linkedTargetType}:${evidence.linkedTargetId} | sha256: ${evidence.sha256 ?? "Not available"} | state: ${evidence.state}`);
    }
    doc.fontSize(11);

    section(doc, "12. Findings Register");
    for (const finding of input.snapshot.findings) {
      doc.fontSize(9).text(`${finding.id} | severity: ${finding.severity} | ${finding.description}`);
    }
    doc.fontSize(11);

    section(doc, "13. Risk Register");
    for (const risk of input.snapshot.risks) {
      doc.fontSize(9).text(`${risk.riskKey} | ${risk.title} | inherent: ${risk.inherentScore} residual: ${risk.residualScore} | status: ${risk.status}`);
    }
    doc.fontSize(11);

    section(doc, "14. Remediation Register");
    for (const task of input.snapshot.remediationTasks) {
      doc.fontSize(9).text(`${task.id} | finding ${task.findingId} | status: ${task.status} | due: ${task.dueAt}`);
    }
    doc.fontSize(11);

    section(doc, "15. Accepted Residual Risks");
    for (const acceptance of input.snapshot.riskAcceptances) {
      doc
        .fontSize(9)
        .text(`${acceptance.id} | finding ${acceptance.findingId} | active at capture: ${acceptance.isActiveAtCapture} | expires: ${acceptance.expiresAt}`);
    }
    doc.fontSize(11);

    section(doc, "16. Reviewer Decisions");
    for (const signoff of input.snapshot.signoffs) {
      doc.fontSize(9).text(`${signoff.scopeType} | ${signoff.decision} | by ${signoff.signerId} at ${signoff.signedAt}`);
    }
    doc.fontSize(11);

    section(doc, "17. AI Evidence Analysis");
    renderSection(doc, input.narrative?.evidenceAnalysis, input.narrativeAvailable);

    section(doc, "18. Remaining Gaps");
    renderSection(doc, input.narrative?.remainingGaps, input.narrativeAvailable);

    section(doc, "19. Limitations");
    renderSection(doc, input.narrative?.limitations, input.narrativeAvailable);

    section(doc, "20. Audit Trail / Provenance");
    doc.fontSize(9);
    doc.text(`Groundedness score: ${input.groundednessScore}%`);
    doc.text(`Final validation passed: ${input.finalValidation.passed}`);
    doc.text(`Statements verified: ${input.finalValidation.verifiedFactInferenceStatements}/${input.finalValidation.totalFactInferenceStatements}`);
    doc.text(`Narrative available: ${input.narrativeAvailable}`);
    doc.fontSize(11);

    section(doc, "21. Report Accuracy & Grounding Statement");
    doc
      .fontSize(10)
      .text(
        "Every narrative claim in this report was verified against cited source records before publication. The compliance percentages above are computed by a deterministic rules engine, not by AI. Where AI commentary appears without a citation, it is clearly labeled as professional observation rather than a sourced fact."
      );
    doc.fontSize(11);

    section(doc, "22. Final Conclusion");
    renderSection(doc, input.narrative?.conclusion, input.narrativeAvailable);

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

function renderSection(doc: PDFKit.PDFDocument, statements: NarrativeStatement[] | undefined, narrativeAvailable: boolean): void {
  if (!narrativeAvailable || !statements || statements.length === 0) {
    doc.fillColor("gray").fontSize(10).text(NARRATIVE_UNAVAILABLE_MESSAGE);
    doc.fillColor("black").fontSize(11);
    return;
  }
  for (const statement of statements) {
    const prefix = statement.claimType === "commentary" ? "[AI professional observation] " : "";
    doc.fontSize(10).text(`${prefix}${statement.text}`);
    if (statement.citations.length > 0) {
      doc.fontSize(8).fillColor("gray").text(`Citations: ${statement.citations.join(", ")}`);
      doc.fillColor("black");
    }
    doc.moveDown(0.3);
  }
  doc.fontSize(11);
}
