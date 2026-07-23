// Type declarations for backfill-g05-target-catalog.mjs (untyped JS script)
// These allow test files to import from the script without @ts-nocheck

import type { Pool, PoolClient } from 'pg';

interface BackfillSummary {
  [key: string]: unknown;
}

interface PackRow {
  id: string;
  tenant_id: string;
  framework_key: string;
  pack_version: string;
  status: string;
  published_at: Date | null;
  owner_scope?: string;
  classification?: string;
  created_by: string;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
  [key: string]: unknown;
}

interface RequirementRow {
  id: string;
  tenant_id: string;
  framework_pack_id: string;
  framework_key: string;
  control_id: string;
  control_title: string;
  sub_control_id: string | null;
  sub_control_title: string | null;
  requirement_text: string;
  citation?: string | null;
  [key: string]: unknown;
}

interface MappingProvenance {
  tenant_id: string;
  [key: string]: unknown;
}

type Queryable = Pick<Pool | PoolClient, "query">;

export declare function deriveFrameworkInsertValues(pack: PackRow): Record<string, unknown>;
export declare function deriveFrameworkVersionInsertValues(pack: PackRow, frameworkId: string): Record<string, unknown>;
export declare function deriveControlSetInsertValues(pack: PackRow, frameworkVersionId: string): Record<string, unknown>;
export declare function deriveControlInsertValues(requirement: RequirementRow, controlSetId: string): Record<string, unknown>;
export declare function deriveControlSubcontrolInsertValues(requirement: RequirementRow, controlId: string): Record<string, unknown>;
export declare function deriveMappingVersionInsertValues(tenantId: string, provenance: MappingProvenance): Record<string, unknown>;
export declare function backfillFrameworkContentPack(client: Queryable, packId: string, summary?: BackfillSummary): Promise<void>;
export declare function backfillFrameworkRequirement(client: Queryable, requirementId: string, summary?: BackfillSummary): Promise<void>;
export declare function backfillControlMapping(client: Queryable, mappingId: string, summary?: BackfillSummary): Promise<void>;
