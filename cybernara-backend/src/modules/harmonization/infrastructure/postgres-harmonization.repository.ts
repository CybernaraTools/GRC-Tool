import { Inject, Injectable } from "@nestjs/common";
import { TenantScopedDb } from "../../../platform/database/tenant-scoped-db.js";
import type {
  ControlMappingRecord,
  HarmonizationRepository,
  HarmonizedControlRecord
} from "../application/harmonization.types.js";
import type { Pagination } from "../../../shared/pagination.js";

@Injectable()
export class PostgresHarmonizationRepository implements HarmonizationRepository {
  constructor(@Inject(TenantScopedDb) private readonly db: TenantScopedDb) {}

  async listControls(tenantId: string, pagination: Pagination): Promise<HarmonizedControlRecord[]> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select id, tenant_id, version, harmonized_id, domain, control_name, control_description,
                 source_workbook, source_sheet, source_row_number, status, classification,
                 created_by, created_at, updated_by, updated_at
          from harmonized_controls
          where tenant_id = $1
          order by harmonized_id
          limit $2 offset $3
        `,
        [tenantId, pagination.limit, pagination.offset]
      );
      return result.rows.map(mapControl);
    });
  }

  async listControlsForFrameworkKeys(
    tenantId: string,
    frameworkKeys: string[],
    pagination: Pagination
  ): Promise<HarmonizedControlRecord[]> {
    if (frameworkKeys.length === 0) {
      return [];
    }
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select distinct on (hc.harmonized_id)
                 hc.id, hc.tenant_id, hc.version, hc.harmonized_id, hc.domain, hc.control_name, hc.control_description,
                 hc.source_workbook, hc.source_sheet, hc.source_row_number, hc.status, hc.classification,
                 hc.created_by, hc.created_at, hc.updated_by, hc.updated_at
          from harmonized_controls hc
          join control_mappings cm
            on cm.tenant_id = hc.tenant_id
           and cm.harmonized_control_id = hc.harmonized_id
           and cm.status = 'published'
           and cm.framework_key = any($2::text[])
          where hc.tenant_id = $1
            and hc.status = 'published'
          order by hc.harmonized_id
          limit $3 offset $4
        `,
        [tenantId, frameworkKeys, pagination.limit, pagination.offset]
      );
      return result.rows.map(mapControl);
    });
  }

  async findControl(tenantId: string, harmonizedId: string): Promise<HarmonizedControlRecord | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select id, tenant_id, version, harmonized_id, domain, control_name, control_description,
                 source_workbook, source_sheet, source_row_number, status, classification,
                 created_by, created_at, updated_by, updated_at
          from harmonized_controls
          where tenant_id = $1 and harmonized_id = $2
        `,
        [tenantId, harmonizedId]
      );
      return result.rows[0] ? mapControl(result.rows[0]) : null;
    });
  }

  async findControlForFrameworkKeys(
    tenantId: string,
    harmonizedId: string,
    frameworkKeys: string[]
  ): Promise<HarmonizedControlRecord | null> {
    if (frameworkKeys.length === 0) {
      return null;
    }
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select distinct on (hc.harmonized_id)
                 hc.id, hc.tenant_id, hc.version, hc.harmonized_id, hc.domain, hc.control_name, hc.control_description,
                 hc.source_workbook, hc.source_sheet, hc.source_row_number, hc.status, hc.classification,
                 hc.created_by, hc.created_at, hc.updated_by, hc.updated_at
          from harmonized_controls hc
          join control_mappings cm
            on cm.tenant_id = hc.tenant_id
           and cm.harmonized_control_id = hc.harmonized_id
           and cm.status = 'published'
           and cm.framework_key = any($3::text[])
          where hc.tenant_id = $1 and hc.harmonized_id = $2
          order by hc.harmonized_id
        `,
        [tenantId, harmonizedId, frameworkKeys]
      );
      return result.rows[0] ? mapControl(result.rows[0]) : null;
    });
  }

  async listMappingsByControl(
    tenantId: string,
    harmonizedId: string,
    pagination: Pagination,
    frameworkKeys?: string[]
  ): Promise<ControlMappingRecord[]> {
    if (frameworkKeys && frameworkKeys.length === 0) {
      return [];
    }
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const frameworkFilter = frameworkKeys ? " and framework_key = any($5::text[])" : "";
      const result = await client.query(
        `${mappingSelect()} where tenant_id = $1 and harmonized_control_id = $2${frameworkFilter}
         order by framework_key, source_control_id limit $3 offset $4`,
        frameworkKeys
          ? [tenantId, harmonizedId, pagination.limit, pagination.offset, frameworkKeys]
          : [tenantId, harmonizedId, pagination.limit, pagination.offset]
      );
      return result.rows.map(mapMapping);
    });
  }

  async listMappingsByFramework(
    tenantId: string,
    frameworkKey: string,
    pagination: Pagination
  ): Promise<ControlMappingRecord[]> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `${mappingSelect()} where tenant_id = $1 and framework_key = $2
         order by source_control_id, harmonized_control_id limit $3 offset $4`,
        [tenantId, frameworkKey, pagination.limit, pagination.offset]
      );
      return result.rows.map(mapMapping);
    });
  }

  async listUniqueControlsByFramework(
    tenantId: string,
    frameworkKey: string,
    pagination: Pagination
  ): Promise<ControlMappingRecord[]> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `${mappingSelect()} where tenant_id = $1 and framework_key = $2 and mapping_classification = 'unique'
         order by source_control_id, harmonized_control_id limit $3 offset $4`,
        [tenantId, frameworkKey, pagination.limit, pagination.offset]
      );
      return result.rows.map(mapMapping);
    });
  }
}

function mappingSelect(): string {
  return `
    select
      m.id,
      m.tenant_id,
      m.version,
      m.framework_key,
      m.source_control_id,
      m.harmonized_control_id,
      m.mapping_classification,
      m.coverage,
      m.confidence,
      coalesce(r.rationale, m.rationale) as rationale,
      coalesce(r.reviewer_id::text, m.reviewer) as reviewer,
      m.source_workbook,
      m.source_sheet,
      m.source_row_number,
      m.status,
      m.classification,
      m.created_by,
      m.created_at,
      m.updated_by,
      m.updated_at
    from control_mappings m
    left join lateral (
      select rationale, reviewer_id
      from mapping_reviews
      where control_mapping_id = m.id
      order by reviewed_at desc, created_at desc
      limit 1
    ) r on true
  `;
}

function mapControl(row: Record<string, unknown>): HarmonizedControlRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    harmonizedId: String(row.harmonized_id),
    domain: String(row.domain),
    controlName: String(row.control_name),
    controlDescription: String(row.control_description),
    sourceWorkbook: String(row.source_workbook),
    sourceSheet: String(row.source_sheet),
    sourceRowNumber: Number(row.source_row_number),
    status: String(row.status),
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

function mapMapping(row: Record<string, unknown>): ControlMappingRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    frameworkKey: String(row.framework_key),
    sourceControlId: String(row.source_control_id),
    harmonizedControlId: String(row.harmonized_control_id),
    mappingClassification: String(row.mapping_classification),
    coverage: (row.coverage as string | null) ?? null,
    confidence: (row.confidence as string | null) ?? null,
    rationale: (row.rationale as string | null) ?? null,
    reviewer: (row.reviewer as string | null) ?? null,
    sourceWorkbook: String(row.source_workbook),
    sourceSheet: String(row.source_sheet),
    sourceRowNumber: Number(row.source_row_number),
    status: String(row.status),
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}
