import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  findSheet,
  normalizeHeader,
  readWorkbook,
  type WorksheetSnapshot
} from "../../../platform/xlsx/workbook.js";
import type { CanonicalRequirement, ContentPack, RejectedRecord } from "../domain/content-pack.js";

interface SheetAdapterConfig {
  sheetIncludes: string;
  headerRow: number;
  columns: {
    controlId: string;
    controlTitle?: string;
    subControlId?: string;
    subControlTitle?: string;
    requirementText: string;
    citation?: string;
    category?: string;
  };
}

interface FrameworkAdapterConfig {
  frameworkKey: string;
  fileName: string;
  sheets: SheetAdapterConfig[];
}

const configs: FrameworkAdapterConfig[] = [
  framework("CCPA", "CCPA_Controls.xlsx", [
    sheet("All Controls", 2, "Control ID", "Description / Requirement", {
      controlTitle: "Control Title",
      subControlId: "Sub-Control ID",
      subControlTitle: "Sub-Control Title",
      citation: "Section",
      category: "Category"
    })
  ]),
  framework("CMMI", "CMMI_Controls.xlsx", [
    sheet("Master Checklist", 3, "Practice ID & Title", "Practice Description", {
      controlTitle: "Practice Area",
      citation: "PA #",
      category: "PA Category"
    })
  ]),
  framework("DPDP", "DPDP_Controls.xlsx", [
    sheet("Controls Master", 1, "Control ID", "Description", {
      controlTitle: "Control Title",
      subControlId: "Sub-Control ID",
      subControlTitle: "Sub-Control Title",
      citation: "Penalty Reference",
      category: "Type"
    })
  ]),
  framework("E8", "E8_Controls.xlsx", [
    sheet("All Controls", 5, "Control ID", "Sub-Control Description", {
      controlTitle: "Control Area",
      subControlId: "Sub-Control #",
      citation: "Maturity Level",
      category: "Control Area"
    })
  ]),
  framework("GDPR", "GDPR_Controls.xlsx", [
    sheet("All Controls", 2, "Article No.", "Sub-Control Description", {
      controlTitle: "Article Title",
      subControlId: "Sub-Control ID",
      subControlTitle: "Sub-Control Title",
      citation: "Chapter No.",
      category: "Chapter Title"
    })
  ]),
  framework("HIPAA", "HIPAA_Controls.xlsx", [
    sheet("Standards Matrix", 2, "CFR Section", "Description", {
      controlTitle: "Standard",
      subControlId: "Implementation Specification",
      citation: "CFR Section",
      category: "Category"
    })
  ]),
  framework("HITRUST", "HITRUST_Controls.xlsx", [
    sheet("Controls Master", 2, "Control Reference", "Control Specification", {
      controlTitle: "Objective Name",
      subControlTitle: "Control Objective",
      citation: "Control Reference",
      category: "Control Category"
    })
  ]),
  framework("ISO_27001", "ISO_27001_Controls.xlsx", [
    sheet("ISMS Clauses", 2, "Clause", "Requirement Summary", {
      controlTitle: "Title",
      subControlId: "Sub-Clause",
      citation: "Clause",
      category: "Category"
    }),
    sheet("Annex A", 2, "Control ID", "Control Statement", {
      controlTitle: "Control Name",
      citation: "Control ID",
      category: "Category"
    })
  ]),
  framework("ISO_9001", "ISO_9001_Controls.xlsx", [
    sheet("Requirements", 2, "Clause", "Requirement Summary", {
      controlTitle: "Title",
      subControlId: "Sub-Clause",
      citation: "Clause",
      category: "Category"
    })
  ]),
  framework("NIST_SP800", "NIST_SP800_Controls.xlsx", [
    sheet("Control Reference", 1, "Control ID", "Control Statement", {
      controlTitle: "Control Name",
      citation: "Control ID",
      category: "Discussion"
    })
  ]),
  framework("PCI_DSS", "PCI_DSS_Controls.xlsx", [
    sheet("Compliance Register", 3, "REQ ID", "REQUIREMENT TITLE / DESCRIPTION", {
      controlTitle: "REQUIREMENT TITLE / DESCRIPTION",
      citation: "PARENT REQ",
      category: "DOMAIN"
    })
  ]),
  framework("PDPL", "PDPL_Controls.xlsx", [
    sheet("PDPL Framework", 1, "#", "Sub-Control Description (from PDF)", {
      controlTitle: "Control Name",
      subControlId: "Sub-Control Name",
      subControlTitle: "Sub-Control Name",
      citation: "PDPL Article",
      category: "Module"
    })
  ]),
  framework("SOC2", "SOC2_Controls.xlsx", [
    "Security",
    "Availability",
    "Processing Integrity",
    "Confidentiality",
    "Privacy"
  ].map((sheetName) =>
    sheet(sheetName, 2, "Control ID", "Sub-Control Description", {
      controlTitle: "Control Name",
      subControlId: "Sub-Control ID",
      subControlTitle: "Sub-Control Name",
      citation: "Parent Criterion",
      category: sheetName
    })
  ))
].flat();

export const frameworkWorkbookFiles = configs.map((config) => config.fileName);

export async function ingestFrameworkContentPacks(sourcesDir: string): Promise<ContentPack[]> {
  const packs: ContentPack[] = [];
  for (const config of configs) {
    packs.push(await ingestFrameworkContentPack(sourcesDir, config));
  }
  return packs;
}

function framework(frameworkKey: string, fileName: string, sheets: SheetAdapterConfig[]): FrameworkAdapterConfig {
  return { frameworkKey, fileName, sheets };
}

function sheet(
  sheetIncludes: string,
  headerRow: number,
  controlId: string,
  requirementText: string,
  columns: Omit<SheetAdapterConfig["columns"], "controlId" | "requirementText">
): SheetAdapterConfig {
  return {
    sheetIncludes,
    headerRow,
    columns: { controlId, requirementText, ...columns }
  };
}

async function ingestFrameworkContentPack(
  sourcesDir: string,
  config: FrameworkAdapterConfig
): Promise<ContentPack> {
  const filePath = path.join(sourcesDir, config.fileName);
  const sourceBytes = await readFile(filePath);
  const sourceChecksum = createHash("sha256").update(sourceBytes).digest("hex");
  const workbook = await readWorkbook(filePath, config.fileName);
  const requirements: CanonicalRequirement[] = [];
  const rejectedRecords: RejectedRecord[] = [];

  for (const sheetConfig of config.sheets) {
    const targetSheet = findSheet(workbook, sheetConfig.sheetIncludes);
    if (!targetSheet) {
      rejectedRecords.push({
        workbookFile: config.fileName,
        sheetName: sheetConfig.sheetIncludes,
        rowNumber: 0,
        reason: `Expected sheet containing "${sheetConfig.sheetIncludes}" was not found.`
      });
      continue;
    }

    requirements.push(
      ...parseSheet(config.frameworkKey, config.fileName, sourceChecksum, targetSheet, sheetConfig, rejectedRecords)
    );
  }

  const controlIds = new Set(requirements.map((record) => record.controlId));
  const subControlIds = new Set(requirements.map((record) => record.subControlId).filter(Boolean));
  const version = sourceChecksum.slice(0, 12);
  const signature = createHash("sha256")
    .update(JSON.stringify({ frameworkKey: config.frameworkKey, version, sourceChecksum, requirements }))
    .digest("hex");

  return {
    frameworkKey: config.frameworkKey,
    version,
    sourceWorkbook: config.fileName,
    sourceChecksum,
    requirementCount: requirements.length,
    controlCount: controlIds.size,
    subControlCount: subControlIds.size,
    signature,
    requirements,
    rejectedRecords
  };
}

function parseSheet(
  frameworkKey: string,
  workbookFile: string,
  sourceChecksum: string,
  targetSheet: WorksheetSnapshot,
  config: SheetAdapterConfig,
  rejectedRecords: RejectedRecord[]
): CanonicalRequirement[] {
  const header = targetSheet.rows.find((row) => row.rowNumber === config.headerRow);
  if (!header) {
    rejectedRecords.push({
      workbookFile,
      sheetName: targetSheet.name,
      rowNumber: config.headerRow,
      reason: "Configured header row was not found."
    });
    return [];
  }

  const headerIndex = buildHeaderIndex(header.values);
  const missingColumn = [config.columns.controlId, config.columns.requirementText]
    .map(normalizeHeader)
    .find((column) => !headerIndex.has(column));
  if (missingColumn) {
    rejectedRecords.push({
      workbookFile,
      sheetName: targetSheet.name,
      rowNumber: config.headerRow,
      reason: `Required column "${missingColumn}" was not found.`
    });
    return [];
  }

  const records: CanonicalRequirement[] = [];
  const carryForward = new Map<string, string>();
  for (const row of targetSheet.rows.filter((candidate) => candidate.rowNumber > config.headerRow)) {
    if (!row.values.some(Boolean)) {
      continue;
    }

    const controlId = readValue(row.values, headerIndex, config.columns.controlId, carryForward);
    const requirementText = readValue(row.values, headerIndex, config.columns.requirementText, carryForward);
    if (!controlId || !requirementText) {
      rejectedRecords.push({
        workbookFile,
        sheetName: targetSheet.name,
        rowNumber: row.rowNumber,
        reason: "Missing required control ID or requirement text."
      });
      continue;
    }

    const controlTitle = readValue(row.values, headerIndex, config.columns.controlTitle, carryForward) || controlId;
    const subControlId = readValue(row.values, headerIndex, config.columns.subControlId, carryForward);
    records.push({
      frameworkKey,
      controlId,
      controlTitle,
      subControlId: subControlId || null,
      subControlTitle: readValue(row.values, headerIndex, config.columns.subControlTitle, carryForward) || null,
      requirementText,
      citation: readValue(row.values, headerIndex, config.columns.citation, carryForward) || null,
      category: readValue(row.values, headerIndex, config.columns.category, carryForward) || null,
      source: {
        workbookFile,
        sheetName: targetSheet.name,
        rowNumber: row.rowNumber,
        sourceChecksum
      },
      raw: rowToObject(header.values, row.values)
    });
  }

  return records;
}

function buildHeaderIndex(headers: string[]): Map<string, number> {
  const index = new Map<string, number>();
  headers.forEach((header, position) => {
    if (header) {
      index.set(normalizeHeader(header), position);
    }
  });
  return index;
}

function readValue(
  values: string[],
  headerIndex: Map<string, number>,
  column: string | undefined,
  carryForward: Map<string, string>
): string {
  if (!column) {
    return "";
  }

  const key = normalizeHeader(column);
  const index = headerIndex.get(key);
  if (index === undefined) {
    return column;
  }

  const current = values[index] ?? "";
  if (current) {
    carryForward.set(key, current);
    return current;
  }

  return carryForward.get(key) ?? "";
}

function rowToObject(headers: string[], values: string[]): Record<string, string> {
  return headers.reduce<Record<string, string>>((accumulator, header, index) => {
    if (header) {
      accumulator[header] = values[index] ?? "";
    }
    return accumulator;
  }, {});
}

