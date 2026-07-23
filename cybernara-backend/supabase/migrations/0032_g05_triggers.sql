-- Gap remediation — G-05 Ingestion Triggers for Dual-Write & Normalization
--

-- A. Trigger for framework_content_packs
create or replace function fn_backfill_framework_content_packs()
returns trigger as $$
declare
  v_framework_id uuid;
  v_framework_version_id uuid;
begin
  if NEW.framework_version_id is null then
    -- 1. Get or create framework
    insert into frameworks (tenant_id, version, framework_key, name, description, owner_scope, classification, created_by, updated_by)
    values (NEW.tenant_id, 1, NEW.framework_key, NEW.framework_key, 'Auto-created framework', NEW.owner_scope, NEW.classification, NEW.created_by, NEW.updated_by)
    on conflict (tenant_id, framework_key) do update
      set updated_at = now()
    returning id into v_framework_id;

    -- 2. Get or create framework_version
    insert into framework_versions (tenant_id, version, framework_id, version_key, status, published_at, owner_scope, classification, created_by, updated_by)
    values (NEW.tenant_id, 1, v_framework_id, NEW.pack_version, NEW.status, NEW.published_at, NEW.owner_scope, NEW.classification, NEW.created_by, NEW.updated_by)
    on conflict (tenant_id, framework_id, version_key) do update
      set updated_at = now()
    returning id into v_framework_version_id;

    NEW.framework_version_id := v_framework_version_id;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_backfill_framework_content_packs on framework_content_packs;
create trigger trg_backfill_framework_content_packs
  before insert or update on framework_content_packs
  for each row execute function fn_backfill_framework_content_packs();


-- B. Trigger for framework_requirements
create or replace function fn_backfill_framework_requirements()
returns trigger as $$
declare
  v_framework_version_id uuid;
  v_owner_scope catalog_owner_scope;
  v_control_set_id uuid;
  v_control_id uuid;
  v_control_subcontrol_id uuid;
begin
  if NEW.control_id_ref is null then
    -- 1. Get parent pack info
    select framework_version_id, owner_scope
    into v_framework_version_id, v_owner_scope
    from framework_content_packs
    where id = NEW.framework_pack_id;

    if v_framework_version_id is null then
      -- Parent pack not found or doesn't have framework_version_id yet
      return NEW;
    end if;

    -- 2. Get or create control_set
    insert into control_sets (tenant_id, version, framework_version_id, set_key, name, owner_scope, classification, created_by, updated_by)
    values (NEW.tenant_id, 1, v_framework_version_id, 'default', 'Default Control Set', v_owner_scope, NEW.classification, NEW.created_by, NEW.updated_by)
    on conflict (tenant_id, framework_version_id, set_key) do update
      set updated_at = now()
    returning id into v_control_set_id;

    -- 3. Get or create control
    insert into controls (tenant_id, version, control_set_id, control_key, title, requirement_text, citation, source_workbook, source_sheet, source_row_number, owner_scope, classification, created_by, updated_by)
    values (NEW.tenant_id, 1, v_control_set_id, NEW.control_id, NEW.control_title, NEW.requirement_text, NEW.citation, NEW.source_workbook, NEW.source_sheet, NEW.source_row_number, v_owner_scope, NEW.classification, NEW.created_by, NEW.updated_by)
    on conflict (tenant_id, control_set_id, control_key) do update
      set updated_at = now()
    returning id into v_control_id;

    NEW.control_id_ref := v_control_id;

    -- 4. If subcontrol exists, get or create control_subcontrols
    if NEW.sub_control_id is not null then
      insert into control_subcontrols (tenant_id, version, control_id, subcontrol_key, title, requirement_text, citation, source_workbook, source_sheet, source_row_number, owner_scope, classification, created_by, updated_by)
      values (NEW.tenant_id, 1, v_control_id, NEW.sub_control_id, coalesce(NEW.sub_control_title, NEW.sub_control_id), NEW.requirement_text, NEW.citation, NEW.source_workbook, NEW.source_sheet, NEW.source_row_number, v_owner_scope, NEW.classification, NEW.created_by, NEW.updated_by)
      on conflict (tenant_id, control_id, subcontrol_key) do update
        set updated_at = now()
      returning id into v_control_subcontrol_id;

      NEW.control_subcontrol_id := v_control_subcontrol_id;
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_backfill_framework_requirements on framework_requirements;
create trigger trg_backfill_framework_requirements
  before insert or update on framework_requirements
  for each row execute function fn_backfill_framework_requirements();


-- C. Trigger for control_mappings (BEFORE)
create or replace function fn_backfill_control_mappings()
returns trigger as $$
declare
  v_mapping_version_id uuid;
begin
  if NEW.mapping_version_id is null then
    insert into mapping_versions (tenant_id, version, version_key, status, published_at, owner_scope, classification, created_by, updated_by)
    values (NEW.tenant_id, 1, 'v1', 'published', now(), NEW.owner_scope, NEW.classification, NEW.created_by, NEW.updated_by)
    on conflict (tenant_id, version_key) do update
      set updated_at = now()
    returning id into v_mapping_version_id;

    NEW.mapping_version_id := v_mapping_version_id;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_backfill_control_mappings on control_mappings;
create trigger trg_backfill_control_mappings
  before insert or update on control_mappings
  for each row execute function fn_backfill_control_mappings();


-- D. Trigger for control_mappings (AFTER)
create or replace function fn_after_control_mappings()
returns trigger as $$
begin
  insert into mapping_reviews (tenant_id, version, control_mapping_id, reviewer_id, decision, rationale, reviewed_at, classification, created_by, updated_by)
  values (NEW.tenant_id, 1, NEW.id, NEW.updated_by, 'approved', coalesce(NEW.rationale, 'Legacy mapping backfill'), NEW.updated_at, NEW.classification, NEW.created_by, NEW.updated_by)
  on conflict do nothing;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_after_control_mappings on control_mappings;
create trigger trg_after_control_mappings
  after insert on control_mappings
  for each row execute function fn_after_control_mappings();
