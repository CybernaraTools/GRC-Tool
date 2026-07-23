import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  findSheet,
  normalizeHeader,
  readWorkbook,
  type WorksheetRow,
  type WorksheetSnapshot
} from "../../../platform/xlsx/workbook.js";
import type {
  HarmonizationIngestionResult,
  HarmonizationMapping,
  MappingClassification
} from "../domain/harmonization.js";

export const harmonizationWorkbookFiles = [
  "DPDP_SOC2_PDPL_E8_HIPAA_GDPR_CCPA_Control_Harmonization.xlsx",
  "PCI-DSS_NIST-SP-800-53_ISO-27001_ISO-9001-CMMI_HITRUST_Control_Harmonization.xlsx"
];

export async function ingestHarmonizationWorkbooks(
  sourcesDir: string,
  resolvableControlIds: Map<string, Set<string>>
): Promise<HarmonizationIngestionResult> {
  const result: HarmonizationIngestionResult = { controls: [], mappings: [], rejectedRecords: [] };

  for (const workbookFile of harmonizationWorkbookFiles) {
    const filePath = path.join(sourcesDir, workbookFile);
    const sourceChecksum = createHash("sha256").update(await readFile(filePath)).digest("hex");
    const workbook = await readWorkbook(filePath, workbookFile);
    const master = findSheet(workbook, "Master Control Library");
    if (master) {
      result.controls.push(...parseMasterControls(workbookFile, master));
    }

    if (workbookFile.startsWith("DPDP_SOC2")) {
      for (const sheet of workbook.sheets.filter((candidate) => /_Mapping$/i.test(candidate.name))) {
        result.mappings.push(
          ...parseSevenWayMapping(workbookFile, sourceChecksum, sheet, resolvableControlIds, result)
        );
      }
      const uniqueSheet = findSheet(workbook, "Framework Unique Controls");
      if (uniqueSheet) {
        result.mappings.push(...parseUniqueControls(workbookFile, uniqueSheet, result));
      }
    } else {
      const traceability = findSheet(workbook, "Traceability Matrix");
      if (traceability) {
        result.mappings.push(
          ...parseTraceabilityMapping(workbookFile, sourceChecksum, traceability, resolvableControlIds, result)
        );
      }
      const newControls = findSheet(workbook, "New Controls Report");
      if (newControls) {
        result.mappings.push(...parseNewControls(workbookFile, newControls, result));
      }
    }
  }

  return result;
}

function parseMasterControls(workbookFile: string, sheet: WorksheetSnapshot) {
  const header = detectHeader(sheet, ["Harmonized_ID"]) ?? detectHeader(sheet, ["Harmonized ID"]);
  if (!header) {
    return [];
  }

  const index = buildHeaderIndex(header.values);
  return sheet.rows
    .filter((row) => row.rowNumber > header.rowNumber)
    .map((row) => ({
      harmonizedId: read(row, index, "Harmonized_ID") || read(row, index, "Harmonized ID"),
      domain: read(row, index, "Unified Domain") || read(row, index, "Domain"),
      controlName: read(row, index, "Unified Control") || read(row, index, "Control Name"),
      controlDescription:
        read(row, index, "Unified Sub-Control") ||
        read(row, index, "Control Description") ||
        read(row, index, "Intent / Objective"),
      sourceWorkbook: workbookFile,
      sourceSheet: sheet.name,
      sourceRowNumber: row.rowNumber
    }))
    .filter((control) => control.harmonizedId && control.controlName);
}

function parseSevenWayMapping(
  workbookFile: string,
  sourceChecksum: string,
  sheet: WorksheetSnapshot,
  resolvableControlIds: Map<string, Set<string>>,
  result: HarmonizationIngestionResult
): HarmonizationMapping[] {
  const header = detectHeader(sheet, ["Framework Name", "Harmonized_ID"]);
  if (!header) {
    return [];
  }

  const index = buildHeaderIndex(header.values);
  const mappings: HarmonizationMapping[] = [];
  for (const row of sheet.rows.filter((candidate) => candidate.rowNumber > header.rowNumber)) {
    const frameworkKey = normalizeFramework(read(row, index, "Framework Name"));
    const sourceControlId =
      read(row, index, "Sub-Control ID") ||
      read(row, index, "Control ID") ||
      read(row, index, "Requirement ID");
    const targetControlId = read(row, index, "Harmonized_ID");
    const maybeMapping = buildMapping({
      workbookFile,
      sourceChecksum,
      sheet,
      row,
      frameworkKey,
      sourceControlId,
      targetControlId,
      classification: classificationFromConfidence(read(row, index, "Mapping Confidence")),
      coverage: read(row, index, "Mapping Coverage"),
      confidence: read(row, index, "Mapping Confidence"),
      rationale: read(row, index, "Mapping Rationale") || read(row, index, "Common Intent"),
      reviewer: read(row, index, "Reviewer"),
      resolvableControlIds,
      result
    });
    if (maybeMapping) {
      mappings.push(maybeMapping);
    }
  }
  return mappings;
}

function parseTraceabilityMapping(
  workbookFile: string,
  sourceChecksum: string,
  sheet: WorksheetSnapshot,
  resolvableControlIds: Map<string, Set<string>>,
  result: HarmonizationIngestionResult
): HarmonizationMapping[] {
  const header = detectHeader(sheet, ["Framework", "Source ID", "Harmonized ID"]);
  if (!header) {
    return [];
  }

  const index = buildHeaderIndex(header.values);
  const mappings: HarmonizationMapping[] = [];
  for (const row of sheet.rows.filter((candidate) => candidate.rowNumber > header.rowNumber)) {
    const maybeMapping = buildMapping({
      workbookFile,
      sourceChecksum,
      sheet,
      row,
      frameworkKey: normalizeFramework(read(row, index, "Framework")),
      sourceControlId: read(row, index, "Source ID"),
      targetControlId: read(row, index, "Harmonized ID"),
      classification: classificationFromMatch(read(row, index, "Match Type")),
      coverage: read(row, index, "Match Score %"),
      confidence: read(row, index, "Match Type"),
      rationale: read(row, index, "Notes"),
      reviewer: read(row, index, "SME Review?"),
      resolvableControlIds,
      result
    });
    if (maybeMapping) {
      mappings.push(maybeMapping);
    }
  }
  return mappings;
}

function parseUniqueControls(
  workbookFile: string,
  sheet: WorksheetSnapshot,
  result: HarmonizationIngestionResult
): HarmonizationMapping[] {
  const header = detectHeader(sheet, ["Framework", "Harmonized_ID"]);
  if (!header) {
    return [];
  }
  const index = buildHeaderIndex(header.values);
  return sheet.rows
    .filter((row) => row.rowNumber > header.rowNumber)
    .map((row) => ({
      sourceWorkbook: workbookFile,
      frameworkKey: normalizeFramework(read(row, index, "Framework")),
      sourceControlId: read(row, index, "Harmonized_ID"),
      targetControlId: read(row, index, "Harmonized_ID"),
      classification: "unique" as const,
      coverage: null,
      confidence: null,
      rationale: read(row, index, "Common Intent") || null,
      reviewer: null,
      sourceSheet: sheet.name,
      sourceRowNumber: row.rowNumber
    }))
    .filter((mapping) => {
      if (mapping.frameworkKey && mapping.sourceControlId) {
        return true;
      }
      reject(result, workbookFile, sheet.name, mapping.sourceRowNumber, "Unique-control row is incomplete.");
      return false;
    });
}

function parseNewControls(
  workbookFile: string,
  sheet: WorksheetSnapshot,
  result: HarmonizationIngestionResult
): HarmonizationMapping[] {
  const header = detectHeader(sheet, ["Framework", "Source Control ID"]);
  if (!header) {
    return [];
  }
  const index = buildHeaderIndex(header.values);
  return sheet.rows
    .filter((row) => row.rowNumber > header.rowNumber)
    .map((row) => ({
      sourceWorkbook: workbookFile,
      frameworkKey: normalizeFramework(read(row, index, "Framework")),
      sourceControlId: read(row, index, "Source Control ID"),
      targetControlId: read(row, index, "Recommended Harmonized Control ID"),
      classification: "unique" as const,
      coverage: null,
      confidence: null,
      rationale: read(row, index, "Reason for New Control Creation") || null,
      reviewer: null,
      sourceSheet: sheet.name,
      sourceRowNumber: row.rowNumber
    }))
    .filter((mapping) => {
      if (mapping.frameworkKey && mapping.sourceControlId && mapping.targetControlId) {
        return true;
      }
      reject(result, workbookFile, sheet.name, mapping.sourceRowNumber, "New-control row is incomplete.");
      return false;
    });
}

function buildMapping(input: {
  workbookFile: string;
  sourceChecksum: string;
  sheet: WorksheetSnapshot;
  row: WorksheetRow;
  frameworkKey: string;
  sourceControlId: string;
  targetControlId: string;
  classification: MappingClassification;
  coverage: string;
  confidence: string;
  rationale: string;
  reviewer: string;
  resolvableControlIds: Map<string, Set<string>>;
  result: HarmonizationIngestionResult;
}): HarmonizationMapping | null {
  if (!input.frameworkKey || !input.sourceControlId || !input.targetControlId) {
    reject(
      input.result,
      input.workbookFile,
      input.sheet.name,
      input.row.rowNumber,
      "Mapping row has no resolvable source or target control ID."
    );
    return null;
  }
  if (!input.resolvableControlIds.get(input.frameworkKey)?.has(input.sourceControlId)) {
    reject(
      input.result,
      input.workbookFile,
      input.sheet.name,
      input.row.rowNumber,
      `Source control ID "${input.sourceControlId}" was not found in ${input.frameworkKey} content pack.`
    );
    return null;
  }

  return {
    sourceWorkbook: input.workbookFile,
    frameworkKey: input.frameworkKey,
    sourceControlId: input.sourceControlId,
    targetControlId: input.targetControlId,
    classification: input.classification,
    coverage: input.coverage || null,
    confidence: input.confidence || input.sourceChecksum.slice(0, 8),
    rationale: input.rationale || null,
    reviewer: input.reviewer || null,
    sourceSheet: input.sheet.name,
    sourceRowNumber: input.row.rowNumber
  };
}

function detectHeader(sheet: WorksheetSnapshot, expectedColumns: string[]): WorksheetRow | undefined {
  return sheet.rows.find((row) => {
    const headers = new Set(row.values.map(normalizeHeader));
    return expectedColumns.every((column) => headers.has(normalizeHeader(column)));
  });
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

function read(row: WorksheetRow, index: Map<string, number>, column: string): string {
  return row.values[index.get(normalizeHeader(column)) ?? -1] ?? "";
}

function reject(
  result: HarmonizationIngestionResult,
  workbookFile: string,
  sheetName: string,
  rowNumber: number,
  reason: string
): void {
  result.rejectedRecords.push({ workbookFile, sheetName, rowNumber, reason });
}

function normalizeFramework(input: string): string {
  const normalized = normalizeHeader(input);
  const aliases: Record<string, string> = {
    ccpa: "CCPA",
    cmmi: "CMMI",
    dpdp: "DPDP",
    e8: "E8",
    gdpr: "GDPR",
    hipaa: "HIPAA",
    hitrust: "HITRUST",
    "iso 27001": "ISO_27001",
    "iso iec 27001 2022": "ISO_27001",
    "iso 9001": "ISO_9001",
    "iso 9001 2015": "ISO_9001",
    nist: "NIST_SP800",
    "nist sp 800 53": "NIST_SP800",
    "nist sp 800 53 rev5": "NIST_SP800",
    "nist sp800 53": "NIST_SP800",
    "pci dss": "PCI_DSS",
    pci: "PCI_DSS",
    pdpl: "PDPL",
    soc2: "SOC2",
    "soc 2": "SOC2"
  };
  return aliases[normalized] ?? input.replace(/\s+/g, "_").toUpperCase();
}

function classificationFromConfidence(confidence: string): MappingClassification {
  const normalized = normalizeHeader(confidence);
  if (normalized.includes("conflict")) {
    return "conflicting";
  }
  if (normalized.includes("partial") || normalized.includes("medium") || normalized.includes("low")) {
    return "partial";
  }
  return "mapped";
}

function classificationFromMatch(matchType: string): MappingClassification {
  const normalized = normalizeHeader(matchType);
  if (normalized.includes("conflict")) {
    return "conflicting";
  }
  if (normalized.includes("partial")) {
    return "partial";
  }
  return "mapped";
}

