import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { Assessment } from "../../assessment/public.js";

const deterministicTimestamp = new Date("2026-01-01T00:00:00.000Z");

export interface ReportArtifact {
  format: "pdf" | "xlsx";
  idempotencyKey: string;
  sha256: string;
  bytes: Buffer;
}

export function reportIdempotencyKey(input: {
  snapshotId: string;
  templateVersion: string;
  format: "pdf" | "xlsx";
}): string {
  return [input.snapshotId, input.templateVersion, input.format].join(":");
}

export async function renderAssessmentPdf(
  assessment: Assessment,
  templateVersion = "m2-readiness-v1"
): Promise<ReportArtifact> {
  const bytes = await new Promise<Buffer>((resolve) => {
    const chunks: Buffer[] = [];
    const document = new PDFDocument({
      margin: 48,
      info: {
        Title: "Cybernara Assessment Readiness Report",
        Author: "Cybernara",
        Creator: "Cybernara",
        Producer: "Cybernara",
        CreationDate: deterministicTimestamp,
        ModDate: deterministicTimestamp
      }
    });
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.fontSize(18).text("Cybernara Assessment Readiness Report");
    document.moveDown();
    document.fontSize(11).text(`Assessment: ${assessment.scopeName}`);
    document.text(`Status: ${assessment.status}`);
    document.text(`Snapshot: ${assessment.controlSnapshotVersion}`);
    document.moveDown();
    for (const item of assessment.items) {
      document.text(`${item.controlRef.frameworkKey} ${item.controlRef.controlId}: ${item.status}`);
    }
    document.end();
  });

  return artifact("pdf", assessment.controlSnapshotVersion, templateVersion, bytes);
}

export async function renderAssessmentWorkbook(
  assessment: Assessment,
  templateVersion = "m2-readiness-v1"
): Promise<ReportArtifact> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Cybernara";
  workbook.lastModifiedBy = "Cybernara";
  workbook.created = deterministicTimestamp;
  workbook.modified = deterministicTimestamp;
  const sheet = workbook.addWorksheet("Assessment Snapshot");
  sheet.addRow(["Scope", assessment.scopeName]);
  sheet.addRow(["Status", assessment.status]);
  sheet.addRow(["Snapshot", assessment.controlSnapshotVersion]);
  sheet.addRow([]);
  sheet.addRow(["Framework", "Control ID", "Harmonized Control", "Item Status", "Evidence Count"]);
  for (const item of assessment.items) {
    sheet.addRow([
      item.controlRef.frameworkKey,
      item.controlRef.controlId,
      item.controlRef.harmonizedControlId,
      item.status,
      item.evidenceIds.length
    ]);
  }

  const bytes = normalizeZipTimestamps(Buffer.from(await workbook.xlsx.writeBuffer()));
  return artifact("xlsx", assessment.controlSnapshotVersion, templateVersion, bytes);
}

function normalizeZipTimestamps(bytes: Buffer): Buffer {
  const localFileHeader = 0x04034b50;
  const centralDirectoryHeader = 0x02014b50;
  const dosTime = 0;
  const dosDate = ((deterministicTimestamp.getUTCFullYear() - 1980) << 9) |
    ((deterministicTimestamp.getUTCMonth() + 1) << 5) |
    deterministicTimestamp.getUTCDate();

  for (let offset = 0; offset <= bytes.length - 4; offset += 1) {
    const signature = bytes.readUInt32LE(offset);
    if (signature === localFileHeader) {
      bytes.writeUInt16LE(dosTime, offset + 10);
      bytes.writeUInt16LE(dosDate, offset + 12);
    }
    if (signature === centralDirectoryHeader) {
      bytes.writeUInt16LE(dosTime, offset + 12);
      bytes.writeUInt16LE(dosDate, offset + 14);
    }
  }
  return bytes;
}

function artifact(
  format: "pdf" | "xlsx",
  snapshotId: string,
  templateVersion: string,
  bytes: Buffer
): ReportArtifact {
  return {
    format,
    idempotencyKey: reportIdempotencyKey({ snapshotId, templateVersion, format }),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes
  };
}
