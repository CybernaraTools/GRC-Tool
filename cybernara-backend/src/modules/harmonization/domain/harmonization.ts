export interface HarmonizedControl {
  harmonizedId: string;
  domain: string;
  controlName: string;
  controlDescription: string;
  sourceWorkbook: string;
  sourceSheet: string;
  sourceRowNumber: number;
}

export type MappingClassification = "mapped" | "partial" | "conflicting" | "unique";

export interface HarmonizationMapping {
  sourceWorkbook: string;
  frameworkKey: string;
  sourceControlId: string;
  targetControlId: string;
  classification: MappingClassification;
  coverage: string | null;
  confidence: string | null;
  rationale: string | null;
  reviewer: string | null;
  sourceSheet: string;
  sourceRowNumber: number;
}

export interface HarmonizationRejectedRecord {
  workbookFile: string;
  sheetName: string;
  rowNumber: number;
  reason: string;
}

export interface HarmonizationIngestionResult {
  controls: HarmonizedControl[];
  mappings: HarmonizationMapping[];
  rejectedRecords: HarmonizationRejectedRecord[];
}

