export interface SourcePointer {
  workbookFile: string;
  sheetName: string;
  rowNumber: number;
  sourceChecksum: string;
}

export interface CanonicalRequirement {
  frameworkKey: string;
  controlId: string;
  controlTitle: string;
  subControlId: string | null;
  subControlTitle: string | null;
  requirementText: string;
  citation: string | null;
  category: string | null;
  source: SourcePointer;
  raw: Record<string, string>;
}

export interface RejectedRecord {
  workbookFile: string;
  sheetName: string;
  rowNumber: number;
  reason: string;
}

export interface ContentPack {
  frameworkKey: string;
  version: string;
  sourceWorkbook: string;
  sourceChecksum: string;
  requirementCount: number;
  controlCount: number;
  subControlCount: number;
  signature: string;
  requirements: CanonicalRequirement[];
  rejectedRecords: RejectedRecord[];
}

export interface ContentIngestionResult {
  packs: ContentPack[];
  rejectedRecords: RejectedRecord[];
}

