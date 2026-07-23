import type { ContentPack } from "../domain/content-pack.js";
import type { HarmonizationIngestionResult } from "../../harmonization/public.js";
import type { Pagination } from "../../../shared/pagination.js";

export interface PublishedContentIngestion {
  sourcePackageCount: number;
  contentPackCount: number;
  requirementCount: number;
  harmonizedControlCount: number;
  mappingCount: number;
  rejectedRecordCount: number;
  sourcePackageIds: string[];
  contentPackIds: string[];
}

export interface ContentRowCounts {
  contentSourcePackages: number;
  frameworkContentPacks: number;
  frameworkRequirements: number;
  harmonizedControls: number;
  controlMappings: number;
  contentRejectedRecords: number;
}

export interface SourcePackageRecord {
  id: string;
  tenantId: string;
  version: number;
  sourceFileName: string;
  sourceSha256: string;
  status: string;
  diagnosticSummary: Record<string, unknown>;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface FrameworkContentPackRecord {
  id: string;
  tenantId: string;
  version: number;
  frameworkKey: string;
  packVersion: string;
  sourcePackageId: string;
  sourceSha256: string;
  signature: string;
  status: string;
  publishedAt: Date | null;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface FrameworkRequirementRecord {
  id: string;
  tenantId: string;
  version: number;
  frameworkPackId: string;
  frameworkKey: string;
  controlId: string;
  controlTitle: string;
  subControlId: string | null;
  subControlTitle: string | null;
  requirementText: string;
  citation: string | null;
  category: string | null;
  sourceWorkbook: string;
  sourceSheet: string;
  sourceRowNumber: number;
  sourceSha256: string;
  rawRecord: Record<string, unknown>;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface RejectedRecordRow {
  id: string;
  tenantId: string;
  version: number;
  sourceWorkbook: string;
  sourceSheet: string;
  sourceRowNumber: number;
  reason: string;
  remediationStatus: string;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface FrameworkContentRepository {
  publishIngestion(input: {
    tenantId: string;
    actorId: string;
    packs: ContentPack[];
    harmonization: HarmonizationIngestionResult;
  }): Promise<PublishedContentIngestion>;
  countRows(tenantId: string): Promise<ContentRowCounts>;
  listSourcePackages(tenantId: string, pagination: Pagination): Promise<SourcePackageRecord[]>;
  listContentPacks(tenantId: string, pagination: Pagination): Promise<FrameworkContentPackRecord[]>;
  findContentPack(tenantId: string, packId: string): Promise<FrameworkContentPackRecord | null>;
  listRequirements(input: {
    tenantId: string;
    packId?: string;
    frameworkKey?: string;
    pagination: Pagination;
  }): Promise<FrameworkRequirementRecord[]>;
  listRejectedRecords(tenantId: string, pagination: Pagination): Promise<RejectedRecordRow[]>;
}

export interface ContentIngestionInput {
  tenantId: string;
  actorId: string;
  sourcesDir: string;
  idempotencyKey: string;
}

export interface ContentIngestionPublishResult {
  parsed: {
    contentPackCount: number;
    requirementCount: number;
    harmonizedControlRowCount: number;
    acceptedMappingCount: number;
    rejectedRecordCount: number;
  };
  published: PublishedContentIngestion;
  rowCounts: ContentRowCounts;
  outboxEventId: string | null;
  auditEventId: string | null;
}
