import { Inject, Injectable } from "@nestjs/common";
import { TenantScopedDb, type TenantScopedClient } from "../../../platform/database/tenant-scoped-db.js";
import type {
  ContentRowCounts,
  FrameworkContentPackRecord,
  FrameworkContentRepository,
  FrameworkRequirementRecord,
  PublishedContentIngestion,
  RejectedRecordRow,
  SourcePackageRecord
} from "../application/framework-content.types.js";
import type { ContentPack, RejectedRecord } from "../domain/content-pack.js";
import type {
  HarmonizationIngestionResult,
  HarmonizationMapping,
  HarmonizationRejectedRecord,
  HarmonizedControl
} from "../../harmonization/public.js";

interface RequirementInsertRow {
  frameworkVersionId: string;
  controlSetId: string;
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
  rawRecord: Record<string, string>;
}

interface PublishedPackRef {
  frameworkVersionId: string;
  controlSetId: string;
}

@Injectable()
export class PostgresFrameworkContentRepository implements FrameworkContentRepository {
  constructor(@Inject(TenantScopedDb) private readonly db: TenantScopedDb) {}

  async publishIngestion(input: {
    tenantId: string;
    actorId: string;
    packs: ContentPack[];
    harmonization: HarmonizationIngestionResult;
  }): Promise<PublishedContentIngestion> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const sourcePackageIds: string[] = [];
      const contentPackIds: string[] = [];
      const requirementRows: RequirementInsertRow[] = [];

      for (const pack of input.packs) {
        const sourcePackageId = await upsertSourcePackage(client, input.tenantId, input.actorId, pack);
        sourcePackageIds.push(sourcePackageId);
        const publishedPack = await upsertFrameworkVersion(
          client,
          input.tenantId,
          input.actorId,
          pack,
          sourcePackageId
        );
        contentPackIds.push(publishedPack.frameworkVersionId);

        requirementRows.push(
          ...pack.requirements.map((requirement) => ({
            frameworkVersionId: publishedPack.frameworkVersionId,
            controlSetId: publishedPack.controlSetId,
            frameworkKey: requirement.frameworkKey,
            controlId: requirement.controlId,
            controlTitle: requirement.controlTitle,
            subControlId: requirement.subControlId,
            subControlTitle: requirement.subControlTitle,
            requirementText: requirement.requirementText,
            citation: requirement.citation,
            category: requirement.category,
            sourceWorkbook: requirement.source.workbookFile,
            sourceSheet: requirement.source.sheetName,
            sourceRowNumber: requirement.source.rowNumber,
            sourceSha256: requirement.source.sourceChecksum,
            rawRecord: requirement.raw
          }))
        );
      }

      await upsertRequirements(client, input.tenantId, input.actorId, requirementRows);
      await upsertHarmonizedControls(client, input.tenantId, input.actorId, input.harmonization.controls);
      await upsertMappingVersions(client, input.tenantId, input.actorId, input.harmonization.mappings);

      const rejectedSources = rejectedSourceWorkbooks(input.packs, input.harmonization);
      if (rejectedSources.length > 0) {
        await client.query(
          `delete from content_rejected_records where tenant_id = $1 and source_workbook = any($2::text[])`,
          [input.tenantId, rejectedSources]
        );
      }
      await insertRejectedRecords(client, input.tenantId, input.actorId, rejectedRecords(input.packs, input.harmonization));

      return {
        sourcePackageCount: input.packs.length,
        contentPackCount: input.packs.length,
        requirementCount: input.packs.reduce((count, pack) => count + pack.requirements.length, 0),
        harmonizedControlCount: uniqueHarmonizedControlCount(input.harmonization.controls),
        mappingCount: uniqueMappingCount(input.harmonization.mappings),
        rejectedRecordCount: rejectedRecords(input.packs, input.harmonization).length,
        sourcePackageIds,
        contentPackIds
      };
    });
  }

  async countRows(tenantId: string): Promise<ContentRowCounts> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select
            (select count(*)::int from content_source_packages where tenant_id = $1) as content_source_packages,
            (select count(*)::int from framework_versions where tenant_id = $1) as framework_content_packs,
            (
              (select count(*)::int from controls where tenant_id = $1 and requirement_text is not null)
              + (select count(*)::int from control_subcontrols where tenant_id = $1)
            ) as framework_requirements,
            (select count(*)::int from harmonized_controls where tenant_id = $1) as harmonized_controls,
            (select count(*)::int from mapping_versions where tenant_id = $1) as control_mappings,
            (select count(*)::int from content_rejected_records where tenant_id = $1) as content_rejected_records
        `,
        [tenantId]
      );
      return mapCounts(result.rows[0]);
    });
  }

  async listSourcePackages(tenantId: string, pagination: { limit: number; offset: number }): Promise<SourcePackageRecord[]> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select id, tenant_id, version, source_file_name, source_sha256, status, diagnostic_summary,
                 classification, created_by, created_at, updated_by, updated_at
          from content_source_packages
          where tenant_id = $1
          order by source_file_name
          limit $2 offset $3
        `,
        [tenantId, pagination.limit, pagination.offset]
      );
      return result.rows.map(mapSourcePackage);
    });
  }

  async listContentPacks(tenantId: string, pagination: { limit: number; offset: number }): Promise<FrameworkContentPackRecord[]> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select p.id, p.tenant_id, p.version, f.framework_key, fv.version_key as pack_version, p.source_package_id,
                 p.source_sha256, p.signature, p.status, p.published_at, p.classification,
                 p.created_by, p.created_at, p.updated_by, p.updated_at
          from framework_versions p
          join framework_versions fv on p.id = fv.id
          join frameworks f on fv.framework_id = f.id
          where p.tenant_id = $1
          order by f.framework_key, fv.version_key
          limit $2 offset $3
        `,
        [tenantId, pagination.limit, pagination.offset]
      );
      return result.rows.map(mapContentPack);
    });
  }

  async findContentPack(tenantId: string, packId: string): Promise<FrameworkContentPackRecord | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select p.id, p.tenant_id, p.version, f.framework_key, fv.version_key as pack_version, p.source_package_id,
                 p.source_sha256, p.signature, p.status, p.published_at, p.classification,
                 p.created_by, p.created_at, p.updated_by, p.updated_at
          from framework_versions p
          join framework_versions fv on p.id = fv.id
          join frameworks f on fv.framework_id = f.id
          where p.tenant_id = $1 and p.id = $2
        `,
        [tenantId, packId]
      );
      return result.rows[0] ? mapContentPack(result.rows[0]) : null;
    });
  }

  async listRequirements(input: {
    tenantId: string;
    packId?: string;
    frameworkKey?: string;
    pagination: { limit: number; offset: number };
  }): Promise<FrameworkRequirementRecord[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select *
          from (
            select
              c.id,
              c.tenant_id,
              c.version,
              fv.id as framework_pack_id,
              f.framework_key,
              c.control_key as control_id,
              c.title as control_title,
              null::text as sub_control_id,
              null::text as sub_control_title,
              c.requirement_text,
              c.citation,
              c.category,
              c.source_workbook,
              c.source_sheet,
              c.source_row_number,
              c.source_sha256,
              c.raw_record,
              c.classification,
              c.created_by,
              c.created_at,
              c.updated_by,
              c.updated_at
            from controls c
            join control_sets cs on c.control_set_id = cs.id
            join framework_versions fv on cs.framework_version_id = fv.id
            join frameworks f on fv.framework_id = f.id
            where c.requirement_text is not null
            union all
            select
              sc.id,
              sc.tenant_id,
              sc.version,
              fv.id as framework_pack_id,
              f.framework_key,
              c.control_key as control_id,
              c.title as control_title,
              sc.subcontrol_key as sub_control_id,
              sc.title as sub_control_title,
              sc.requirement_text,
              sc.citation,
              c.category,
              sc.source_workbook,
              sc.source_sheet,
              sc.source_row_number,
              sc.source_sha256,
              sc.raw_record,
              sc.classification,
              sc.created_by,
              sc.created_at,
              sc.updated_by,
              sc.updated_at
            from control_subcontrols sc
            join controls c on sc.control_id = c.id
            join control_sets cs on c.control_set_id = cs.id
            join framework_versions fv on cs.framework_version_id = fv.id
            join frameworks f on fv.framework_id = f.id
          ) req
          where req.tenant_id = $1
            and ($2::uuid is null or req.framework_pack_id = $2)
            and ($3::text is null or req.framework_key = $3)
          order by req.framework_key, req.control_id, req.sub_control_id nulls first, req.source_row_number
          limit $4 offset $5
        `,
        [
          input.tenantId,
          input.packId ?? null,
          input.frameworkKey ?? null,
          input.pagination.limit,
          input.pagination.offset
        ]
      );
      return result.rows.map(mapRequirement);
    });
  }

  async listRejectedRecords(tenantId: string, pagination: { limit: number; offset: number }): Promise<RejectedRecordRow[]> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select id, tenant_id, version, source_workbook, source_sheet, source_row_number, reason,
                 remediation_status, classification, created_by, created_at, updated_by, updated_at
          from content_rejected_records
          where tenant_id = $1
          order by source_workbook, source_sheet, source_row_number
          limit $2 offset $3
        `,
        [tenantId, pagination.limit, pagination.offset]
      );
      return result.rows.map(mapRejectedRecord);
    });
  }
}

async function upsertSourcePackage(
  client: TenantScopedClient,
  tenantId: string,
  actorId: string,
  pack: ContentPack
): Promise<string> {
  const result = await client.query(
    `
      insert into content_source_packages (
        tenant_id, source_file_name, source_sha256, status, diagnostic_summary,
        classification, created_by, updated_by
      )
      values ($1, $2, $3, 'published', $4::jsonb, 'restricted', $5, $5)
      on conflict (tenant_id, source_file_name, source_sha256) do update
        set status = 'published',
            diagnostic_summary = excluded.diagnostic_summary,
            updated_by = excluded.updated_by,
            updated_at = now()
      returning id
    `,
    [
      tenantId,
      pack.sourceWorkbook,
      pack.sourceChecksum,
      JSON.stringify({
        frameworkKey: pack.frameworkKey,
        requirementCount: pack.requirementCount,
        controlCount: pack.controlCount,
        subControlCount: pack.subControlCount,
        rejectedRecordCount: pack.rejectedRecords.length
      }),
      actorId
    ]
  );
  return String(result.rows[0].id);
}

async function upsertFrameworkVersion(
  client: TenantScopedClient,
  tenantId: string,
  actorId: string,
  pack: ContentPack,
  sourcePackageId: string
): Promise<PublishedPackRef> {
  const frameworkResult = await client.query(
    `
      insert into frameworks (
        tenant_id, framework_key, name, owner_scope, classification, created_by, updated_by
      )
      values ($1, $2, $2, 'tenant', 'restricted', $3, $3)
      on conflict (tenant_id, framework_key) do update
        set name = excluded.name,
            updated_by = excluded.updated_by,
            updated_at = now()
      returning id
    `,
    [tenantId, pack.frameworkKey, actorId]
  );
  const frameworkId = String(frameworkResult.rows[0].id);

  const versionResult = await client.query(
    `
      insert into framework_versions (
        tenant_id, framework_id, version_key, status, published_at, source_package_id,
        source_sha256, signature, owner_scope, classification, created_by, updated_by
      )
      values ($1, $2, $3, 'published', now(), $4, $5, $6, 'tenant', 'restricted', $7, $7)
      on conflict (tenant_id, framework_id, version_key) do update
        set source_package_id = excluded.source_package_id,
            source_sha256 = excluded.source_sha256,
            signature = excluded.signature,
            status = 'published',
            published_at = coalesce(framework_versions.published_at, excluded.published_at),
            updated_by = excluded.updated_by,
            updated_at = now()
      returning id
    `,
    [tenantId, frameworkId, pack.version, sourcePackageId, pack.sourceChecksum, pack.signature, actorId]
  );
  const frameworkVersionId = String(versionResult.rows[0].id);

  const controlSetResult = await client.query(
    `
      insert into control_sets (
        tenant_id, framework_version_id, set_key, name, owner_scope, classification, created_by, updated_by
      )
      values ($1, $2, 'default', $3, 'tenant', 'restricted', $4, $4)
      on conflict (tenant_id, framework_version_id, set_key) do update
        set name = excluded.name,
            updated_by = excluded.updated_by,
            updated_at = now()
      returning id
    `,
    [tenantId, frameworkVersionId, `${pack.frameworkKey} default control set`, actorId]
  );

  return {
    frameworkVersionId,
    controlSetId: String(controlSetResult.rows[0].id)
  };
}

async function upsertRequirements(
  client: TenantScopedClient,
  tenantId: string,
  actorId: string,
  rows: RequirementInsertRow[]
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const payload = JSON.stringify(rows.map(normalizedRequirementRowToJson));

  await client.query(
    `
      with source_rows as (
        select *
        from jsonb_to_recordset($2::jsonb) as row(
          control_set_id uuid,
          control_id text,
          control_title text,
          sub_control_id text,
          requirement_text text,
          citation text,
          category text,
          source_workbook text,
          source_sheet text,
          source_row_number integer,
          source_sha256 text,
          raw_record jsonb
        )
      ),
      control_rows as (
        select distinct on (control_set_id, control_id) *
        from source_rows
        order by control_set_id, control_id, (sub_control_id is not null), source_row_number
      )
      insert into controls (
        tenant_id, control_set_id, control_key, title, category, requirement_text, citation,
        source_workbook, source_sheet, source_row_number, source_sha256, raw_record,
        owner_scope, classification, created_by, updated_by
      )
      select
        $1,
        row.control_set_id,
        row.control_id,
        row.control_title,
        row.category,
        case when row.sub_control_id is null then row.requirement_text else null end,
        case when row.sub_control_id is null then row.citation else null end,
        case when row.sub_control_id is null then row.source_workbook else null end,
        case when row.sub_control_id is null then row.source_sheet else null end,
        case when row.sub_control_id is null then row.source_row_number else null end,
        case when row.sub_control_id is null then row.source_sha256 else null end,
        case when row.sub_control_id is null then row.raw_record else '{}'::jsonb end,
        'tenant',
        'restricted',
        $3,
        $3
      from control_rows row
      on conflict (tenant_id, control_set_id, control_key) do update
        set title = excluded.title,
            category = coalesce(excluded.category, controls.category),
            requirement_text = coalesce(excluded.requirement_text, controls.requirement_text),
            citation = coalesce(excluded.citation, controls.citation),
            source_workbook = coalesce(excluded.source_workbook, controls.source_workbook),
            source_sheet = coalesce(excluded.source_sheet, controls.source_sheet),
            source_row_number = coalesce(excluded.source_row_number, controls.source_row_number),
            source_sha256 = coalesce(excluded.source_sha256, controls.source_sha256),
            raw_record = case when excluded.requirement_text is null then controls.raw_record else excluded.raw_record end,
            updated_by = excluded.updated_by,
            updated_at = now()
    `,
    [tenantId, payload, actorId]
  );

  await client.query(
    `
      with source_rows as (
        select *
        from jsonb_to_recordset($2::jsonb) as row(
          control_set_id uuid,
          control_id text,
          control_title text,
          sub_control_id text,
          sub_control_title text,
          requirement_text text,
          citation text,
          source_workbook text,
          source_sheet text,
          source_row_number integer,
          source_sha256 text,
          raw_record jsonb
        )
        where sub_control_id is not null
      ),
      subcontrol_rows as (
        select distinct on (control_set_id, control_id, sub_control_id) *
        from source_rows
        order by control_set_id, control_id, sub_control_id, source_row_number
      )
      insert into control_subcontrols (
        tenant_id, control_id, subcontrol_key, title, requirement_text, citation,
        source_workbook, source_sheet, source_row_number, source_sha256, raw_record,
        owner_scope, classification, created_by, updated_by
      )
      select
        $1,
        c.id,
        row.sub_control_id,
        coalesce(row.sub_control_title, row.sub_control_id),
        row.requirement_text,
        row.citation,
        row.source_workbook,
        row.source_sheet,
        row.source_row_number,
        row.source_sha256,
        row.raw_record,
        'tenant',
        'restricted',
        $3,
        $3
      from subcontrol_rows row
      join controls c
        on c.tenant_id = $1
       and c.control_set_id = row.control_set_id
       and c.control_key = row.control_id
      on conflict (tenant_id, control_id, subcontrol_key) do update
        set title = excluded.title,
            requirement_text = excluded.requirement_text,
            citation = excluded.citation,
            source_workbook = excluded.source_workbook,
            source_sheet = excluded.source_sheet,
            source_row_number = excluded.source_row_number,
            source_sha256 = excluded.source_sha256,
            raw_record = excluded.raw_record,
            updated_by = excluded.updated_by,
            updated_at = now()
    `,
    [tenantId, payload, actorId]
  );
}

function normalizedRequirementRowToJson(row: RequirementInsertRow) {
  return {
    control_set_id: row.controlSetId,
    control_id: row.controlId,
    control_title: row.controlTitle,
    sub_control_id: row.subControlId,
    sub_control_title: row.subControlTitle,
    requirement_text: row.requirementText,
    citation: row.citation,
    category: row.category,
    source_workbook: row.sourceWorkbook,
    source_sheet: row.sourceSheet,
    source_row_number: row.sourceRowNumber,
    source_sha256: row.sourceSha256,
    raw_record: row.rawRecord
  };
}

async function upsertHarmonizedControls(
  client: TenantScopedClient,
  tenantId: string,
  actorId: string,
  controls: HarmonizedControl[]
): Promise<void> {
  if (controls.length === 0) {
    return;
  }
  const dedupedControls = [...new Map(controls.map((control) => [control.harmonizedId, control])).values()];

  await client.query(
    `
      insert into harmonized_controls (
        tenant_id, harmonized_id, domain, control_name, control_description,
        source_workbook, source_sheet, source_row_number, status, classification,
        created_by, updated_by
      )
      select
        $1,
        row.harmonized_id,
        row.domain,
        row.control_name,
        row.control_description,
        row.source_workbook,
        row.source_sheet,
        row.source_row_number,
        'published',
        'restricted',
        $3,
        $3
      from jsonb_to_recordset($2::jsonb) as row(
        harmonized_id text,
        domain text,
        control_name text,
        control_description text,
        source_workbook text,
        source_sheet text,
        source_row_number integer
      )
      on conflict (tenant_id, harmonized_id) do update
        set domain = excluded.domain,
            control_name = excluded.control_name,
            control_description = excluded.control_description,
            source_workbook = excluded.source_workbook,
            source_sheet = excluded.source_sheet,
            source_row_number = excluded.source_row_number,
            status = 'published',
            updated_by = excluded.updated_by,
            updated_at = now()
    `,
    [tenantId, JSON.stringify(dedupedControls.map(controlToJson)), actorId]
  );
}

async function upsertMappingVersions(
  client: TenantScopedClient,
  tenantId: string,
  actorId: string,
  mappings: HarmonizationMapping[]
): Promise<void> {
  if (mappings.length === 0) {
    return;
  }

  await client.query(
    `
      insert into mapping_versions (
        tenant_id, version_key, status, published_at, owner_scope, classification, created_by, updated_by
      )
      values ($1, 'published-ingestion', 'published', now(), 'tenant', 'restricted', $2, $2)
      on conflict (tenant_id, version_key) do update
        set status = 'published',
            published_at = coalesce(mapping_versions.published_at, excluded.published_at),
            updated_by = excluded.updated_by,
            updated_at = now()
    `,
    [tenantId, actorId]
  );
}

async function insertRejectedRecords(
  client: TenantScopedClient,
  tenantId: string,
  actorId: string,
  rows: Array<RejectedRecord | HarmonizationRejectedRecord>
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  await client.query(
    `
      insert into content_rejected_records (
        tenant_id, source_workbook, source_sheet, source_row_number, reason,
        remediation_status, classification, created_by, updated_by
      )
      select
        $1,
        row.source_workbook,
        row.source_sheet,
        row.source_row_number,
        row.reason,
        'open',
        'restricted',
        $3,
        $3
      from jsonb_to_recordset($2::jsonb) as row(
        source_workbook text,
        source_sheet text,
        source_row_number integer,
        reason text
      )
    `,
    [tenantId, JSON.stringify(rows.map(rejectedToJson)), actorId]
  );
}

function controlToJson(control: HarmonizedControl) {
  return {
    harmonized_id: control.harmonizedId,
    domain: control.domain,
    control_name: control.controlName,
    control_description: control.controlDescription,
    source_workbook: control.sourceWorkbook,
    source_sheet: control.sourceSheet,
    source_row_number: control.sourceRowNumber
  };
}

function rejectedToJson(rejected: RejectedRecord | HarmonizationRejectedRecord) {
  return {
    source_workbook: rejected.workbookFile,
    source_sheet: rejected.sheetName,
    source_row_number: rejected.rowNumber,
    reason: rejected.reason
  };
}

function uniqueHarmonizedControlCount(controls: HarmonizedControl[]): number {
  return new Set(controls.map((control) => control.harmonizedId)).size;
}

function uniqueMappingCount(mappings: HarmonizationMapping[]): number {
  return new Set(mappings.map(mappingConflictKey)).size;
}

function mappingConflictKey(mapping: HarmonizationMapping): string {
  return [
    mapping.frameworkKey,
    mapping.sourceControlId,
    mapping.targetControlId,
    mapping.sourceWorkbook,
    mapping.sourceRowNumber
  ].join("|");
}

function rejectedRecords(
  packs: ContentPack[],
  harmonization: HarmonizationIngestionResult
): Array<RejectedRecord | HarmonizationRejectedRecord> {
  return [...packs.flatMap((pack) => pack.rejectedRecords), ...harmonization.rejectedRecords];
}

function rejectedSourceWorkbooks(packs: ContentPack[], harmonization: HarmonizationIngestionResult): string[] {
  return [
    ...new Set([
      ...packs.map((pack) => pack.sourceWorkbook),
      ...harmonization.controls.map((control) => control.sourceWorkbook),
      ...harmonization.mappings.map((mapping) => mapping.sourceWorkbook),
      ...harmonization.rejectedRecords.map((record) => record.workbookFile)
    ])
  ];
}

function mapCounts(row: Record<string, unknown>): ContentRowCounts {
  return {
    contentSourcePackages: Number(row.content_source_packages),
    frameworkContentPacks: Number(row.framework_content_packs),
    frameworkRequirements: Number(row.framework_requirements),
    harmonizedControls: Number(row.harmonized_controls),
    controlMappings: Number(row.control_mappings),
    contentRejectedRecords: Number(row.content_rejected_records)
  };
}

function mapSourcePackage(row: Record<string, unknown>): SourcePackageRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    sourceFileName: String(row.source_file_name),
    sourceSha256: String(row.source_sha256),
    status: String(row.status),
    diagnosticSummary: row.diagnostic_summary as Record<string, unknown>,
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

function mapContentPack(row: Record<string, unknown>): FrameworkContentPackRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    frameworkKey: String(row.framework_key),
    packVersion: String(row.pack_version),
    sourcePackageId: String(row.source_package_id),
    sourceSha256: String(row.source_sha256),
    signature: String(row.signature),
    status: String(row.status),
    publishedAt: (row.published_at as Date | null) ?? null,
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

function mapRequirement(row: Record<string, unknown>): FrameworkRequirementRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    frameworkPackId: String(row.framework_pack_id),
    frameworkKey: String(row.framework_key),
    controlId: String(row.control_id),
    controlTitle: String(row.control_title),
    subControlId: (row.sub_control_id as string | null) ?? null,
    subControlTitle: (row.sub_control_title as string | null) ?? null,
    requirementText: String(row.requirement_text),
    citation: (row.citation as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    sourceWorkbook: String(row.source_workbook),
    sourceSheet: String(row.source_sheet),
    sourceRowNumber: Number(row.source_row_number),
    sourceSha256: String(row.source_sha256),
    rawRecord: row.raw_record as Record<string, unknown>,
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

function mapRejectedRecord(row: Record<string, unknown>): RejectedRecordRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    sourceWorkbook: String(row.source_workbook),
    sourceSheet: String(row.source_sheet),
    sourceRowNumber: Number(row.source_row_number),
    reason: String(row.reason),
    remediationStatus: String(row.remediation_status),
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}
