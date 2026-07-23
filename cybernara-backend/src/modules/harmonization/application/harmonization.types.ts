import type { Pagination } from "../../../shared/pagination.js";

export interface HarmonizedControlRecord {
  id: string;
  tenantId: string;
  version: number;
  harmonizedId: string;
  domain: string;
  controlName: string;
  controlDescription: string;
  sourceWorkbook: string;
  sourceSheet: string;
  sourceRowNumber: number;
  status: string;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface ControlMappingRecord {
  id: string;
  tenantId: string;
  version: number;
  frameworkKey: string;
  sourceControlId: string;
  harmonizedControlId: string;
  mappingClassification: string;
  coverage: string | null;
  confidence: string | null;
  rationale: string | null;
  reviewer: string | null;
  sourceWorkbook: string;
  sourceSheet: string;
  sourceRowNumber: number;
  status: string;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface HarmonizationRepository {
  listControls(tenantId: string, pagination: Pagination): Promise<HarmonizedControlRecord[]>;
  listControlsForFrameworkKeys(
    tenantId: string,
    frameworkKeys: string[],
    pagination: Pagination
  ): Promise<HarmonizedControlRecord[]>;
  findControl(tenantId: string, harmonizedId: string): Promise<HarmonizedControlRecord | null>;
  findControlForFrameworkKeys(
    tenantId: string,
    harmonizedId: string,
    frameworkKeys: string[]
  ): Promise<HarmonizedControlRecord | null>;
  listMappingsByControl(
    tenantId: string,
    harmonizedId: string,
    pagination: Pagination,
    frameworkKeys?: string[]
  ): Promise<ControlMappingRecord[]>;
  listMappingsByFramework(
    tenantId: string,
    frameworkKey: string,
    pagination: Pagination
  ): Promise<ControlMappingRecord[]>;
  listUniqueControlsByFramework(
    tenantId: string,
    frameworkKey: string,
    pagination: Pagination
  ): Promise<ControlMappingRecord[]>;
}
