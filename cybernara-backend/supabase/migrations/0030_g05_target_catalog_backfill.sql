-- Gap remediation — G-05 target-state catalog structure, Backfill stage (task #114)
-- This migration populates the 9 new target tables from the existing 3 legacy tables
-- and updates the existing tables with references to the new structured tables.

-- 1. frameworks
insert into frameworks (tenant_id, version, framework_key, name, description, owner_scope, classification, created_by, updated_by, created_at, updated_at)
select distinct on (tenant_id, framework_key)
  tenant_id,
  1 as version,
  framework_key,
  framework_key as name, -- Legacy table doesn't have a specific name, fallback to key
  'Backfilled from legacy content packs' as description,
  owner_scope,
  classification,
  created_by,
  updated_by,
  created_at,
  updated_at
from framework_content_packs
order by tenant_id, framework_key, updated_at desc
on conflict (tenant_id, framework_key) do nothing;

-- 2. framework_versions
insert into framework_versions (tenant_id, version, framework_id, version_key, status, published_at, owner_scope, classification, created_by, updated_by, created_at, updated_at)
select
  p.tenant_id,
  1 as version,
  f.id as framework_id,
  p.pack_version as version_key,
  p.status,
  p.published_at,
  p.owner_scope,
  p.classification,
  p.created_by,
  p.updated_by,
  p.created_at,
  p.updated_at
from framework_content_packs p
join frameworks f on f.framework_key = p.framework_key and f.tenant_id = p.tenant_id
on conflict (tenant_id, framework_id, version_key) do nothing;

-- 2b. Back-populate framework_content_packs.framework_version_id
update framework_content_packs p
set framework_version_id = fv.id
from framework_versions fv
join frameworks f on fv.framework_id = f.id
where p.framework_key = f.framework_key 
  and p.pack_version = fv.version_key 
  and p.tenant_id = f.tenant_id
  and p.framework_version_id is null;

-- 3. control_sets
-- A framework_version needs at least one control set to hold its controls. 
insert into control_sets (tenant_id, version, framework_version_id, set_key, name, owner_scope, classification, created_by, updated_by, created_at, updated_at)
select
  fv.tenant_id,
  1 as version,
  fv.id as framework_version_id,
  'default' as set_key,
  f.name || ' Controls' as name,
  fv.owner_scope,
  fv.classification,
  fv.created_by,
  fv.updated_by,
  fv.created_at,
  fv.updated_at
from framework_versions fv
join frameworks f on fv.framework_id = f.id
on conflict (tenant_id, framework_version_id, set_key) do nothing;

-- 4. controls
insert into controls (id, tenant_id, version, control_set_id, control_key, title, category, requirement_text, citation, source_workbook, source_sheet, source_row_number, owner_scope, classification, created_by, updated_by, created_at, updated_at)
select distinct on (req.tenant_id, cs.id, req.control_id)
  gen_random_uuid() as id,
  req.tenant_id,
  1 as version,
  cs.id as control_set_id,
  req.control_id as control_key,
  req.control_title as title,
  req.category,
  case when req.sub_control_id is null then req.requirement_text else null end as requirement_text,
  req.citation,
  req.source_workbook,
  req.source_sheet,
  req.source_row_number,
  p.owner_scope,
  req.classification,
  req.created_by,
  req.updated_by,
  req.created_at,
  req.updated_at
from framework_requirements req
join framework_content_packs p on req.framework_pack_id = p.id
join framework_versions fv on p.framework_version_id = fv.id
join control_sets cs on cs.framework_version_id = fv.id and cs.set_key = 'default'
order by req.tenant_id, cs.id, req.control_id, (req.sub_control_id is null) desc, req.updated_at desc
on conflict (tenant_id, control_set_id, control_key) do nothing;

-- 4b. Back-populate framework_requirements.control_id_ref
update framework_requirements req
set control_id_ref = c.id
from controls c
join control_sets cs on c.control_set_id = cs.id
join framework_versions fv on cs.framework_version_id = fv.id
join framework_content_packs p on fv.id = p.framework_version_id
where req.framework_pack_id = p.id
  and req.control_id = c.control_key
  and req.tenant_id = c.tenant_id
  and req.control_id_ref is null;

-- 5. control_subcontrols
insert into control_subcontrols (id, tenant_id, version, control_id, subcontrol_key, title, requirement_text, citation, source_workbook, source_sheet, source_row_number, owner_scope, classification, created_by, updated_by, created_at, updated_at)
select distinct on (req.tenant_id, req.control_id_ref, req.sub_control_id)
  gen_random_uuid() as id,
  req.tenant_id,
  1 as version,
  req.control_id_ref as control_id,
  req.sub_control_id as subcontrol_key,
  coalesce(req.sub_control_title, req.sub_control_id) as title,
  req.requirement_text,
  req.citation,
  req.source_workbook,
  req.source_sheet,
  req.source_row_number,
  p.owner_scope,
  req.classification,
  req.created_by,
  req.updated_by,
  req.created_at,
  req.updated_at
from framework_requirements req
join framework_content_packs p on req.framework_pack_id = p.id
where req.sub_control_id is not null and req.control_id_ref is not null
order by req.tenant_id, req.control_id_ref, req.sub_control_id, req.updated_at desc
on conflict (tenant_id, control_id, subcontrol_key) do nothing;

-- 5b. Back-populate framework_requirements.control_subcontrol_id
update framework_requirements req
set control_subcontrol_id = sub.id
from control_subcontrols sub
where req.control_id_ref = sub.control_id
  and req.sub_control_id = sub.subcontrol_key
  and req.tenant_id = sub.tenant_id
  and req.control_subcontrol_id is null;

-- 6. mapping_versions
insert into mapping_versions (tenant_id, version, version_key, status, published_at, owner_scope, classification, created_by, updated_by, created_at, updated_at)
select distinct on (tenant_id)
  tenant_id,
  1 as version,
  'v1' as version_key,
  'published' as status,
  now() as published_at,
  owner_scope,
  classification,
  created_by,
  updated_by,
  created_at,
  updated_at
from control_mappings
order by tenant_id, updated_at desc
on conflict (tenant_id, version_key) do nothing;

-- 6b. Back-populate control_mappings.mapping_version_id
update control_mappings m
set mapping_version_id = mv.id
from mapping_versions mv
where m.tenant_id = mv.tenant_id
  and mv.version_key = 'v1'
  and m.mapping_version_id is null;

-- 7. mapping_reviews
insert into mapping_reviews (tenant_id, version, control_mapping_id, reviewer_id, decision, rationale, reviewed_at, classification, created_by, updated_by, created_at, updated_at)
select
  m.tenant_id,
  1 as version,
  m.id as control_mapping_id,
  m.updated_by as reviewer_id, -- use updated_by as fallback since we can't easily parse arbitrary reviewer string to uuid
  'approved' as decision,
  coalesce(m.rationale, 'Legacy mapping backfill') as rationale,
  m.updated_at as reviewed_at,
  m.classification,
  m.created_by,
  m.updated_by,
  m.created_at,
  m.updated_at
from control_mappings m
where m.status = 'published' and not exists (
  select 1 from mapping_reviews r where r.control_mapping_id = m.id
);
