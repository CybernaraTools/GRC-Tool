-- Gap remediation — G-05 Constrain and RLS Global Visibility
--

-- 1. G-05 Constrain Stage: add CHECK constraints (NOT NULL check) as NOT VALID, then VALIDATE them.
-- Since the tables are small, we can add them and validate immediately in the transaction.

-- framework_content_packs.framework_version_id NOT NULL
alter table framework_content_packs add constraint chk_framework_version_id_not_null check (framework_version_id is not null) not valid;
alter table framework_content_packs validate constraint chk_framework_version_id_not_null;

-- framework_requirements.control_id_ref NOT NULL
alter table framework_requirements add constraint chk_control_id_ref_not_null check (control_id_ref is not null) not valid;
alter table framework_requirements validate constraint chk_control_id_ref_not_null;

-- control_mappings.mapping_version_id NOT NULL
alter table control_mappings add constraint chk_mapping_version_id_not_null check (mapping_version_id is not null) not valid;
alter table control_mappings validate constraint chk_mapping_version_id_not_null;

-- 2. G-05 RLS Global Visibility
-- Rewrite policies to allow SELECT on owner_scope = 'global' rows across all catalog tables.

-- A. frameworks
drop policy if exists frameworks_tenant_isolation on frameworks;
drop policy if exists frameworks_app_context_isolation on frameworks;

create policy frameworks_select_tenant_isolation on frameworks
  for select using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', '') or owner_scope = 'global');
create policy frameworks_write_tenant_isolation on frameworks
  for all using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', '')) with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy frameworks_select_app_context_isolation on frameworks
  for select using (tenant_id = app_current_tenant() or owner_scope = 'global');
create policy frameworks_write_app_context_isolation on frameworks
  for all using (tenant_id = app_current_tenant()) with check (tenant_id = app_current_tenant());

-- B. framework_versions
drop policy if exists framework_versions_tenant_isolation on framework_versions;
drop policy if exists framework_versions_app_context_isolation on framework_versions;

create policy framework_versions_select_tenant_isolation on framework_versions
  for select using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', '') or owner_scope = 'global');
create policy framework_versions_write_tenant_isolation on framework_versions
  for all using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', '')) with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy framework_versions_select_app_context_isolation on framework_versions
  for select using (tenant_id = app_current_tenant() or owner_scope = 'global');
create policy framework_versions_write_app_context_isolation on framework_versions
  for all using (tenant_id = app_current_tenant()) with check (tenant_id = app_current_tenant());

-- C. control_sets
drop policy if exists control_sets_tenant_isolation on control_sets;
drop policy if exists control_sets_app_context_isolation on control_sets;

create policy control_sets_select_tenant_isolation on control_sets
  for select using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', '') or owner_scope = 'global');
create policy control_sets_write_tenant_isolation on control_sets
  for all using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', '')) with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy control_sets_select_app_context_isolation on control_sets
  for select using (tenant_id = app_current_tenant() or owner_scope = 'global');
create policy control_sets_write_app_context_isolation on control_sets
  for all using (tenant_id = app_current_tenant()) with check (tenant_id = app_current_tenant());

-- D. controls
drop policy if exists controls_tenant_isolation on controls;
drop policy if exists controls_app_context_isolation on controls;

create policy controls_select_tenant_isolation on controls
  for select using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', '') or owner_scope = 'global');
create policy controls_write_tenant_isolation on controls
  for all using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', '')) with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy controls_select_app_context_isolation on controls
  for select using (tenant_id = app_current_tenant() or owner_scope = 'global');
create policy controls_write_app_context_isolation on controls
  for all using (tenant_id = app_current_tenant()) with check (tenant_id = app_current_tenant());

-- E. control_subcontrols
drop policy if exists control_subcontrols_tenant_isolation on control_subcontrols;
drop policy if exists control_subcontrols_app_context_isolation on control_subcontrols;

create policy control_subcontrols_select_tenant_isolation on control_subcontrols
  for select using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', '') or owner_scope = 'global');
create policy control_subcontrols_write_tenant_isolation on control_subcontrols
  for all using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', '')) with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy control_subcontrols_select_app_context_isolation on control_subcontrols
  for select using (tenant_id = app_current_tenant() or owner_scope = 'global');
create policy control_subcontrols_write_app_context_isolation on control_subcontrols
  for all using (tenant_id = app_current_tenant()) with check (tenant_id = app_current_tenant());

-- F. mapping_versions
drop policy if exists mapping_versions_tenant_isolation on mapping_versions;
drop policy if exists mapping_versions_app_context_isolation on mapping_versions;

create policy mapping_versions_select_tenant_isolation on mapping_versions
  for select using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', '') or owner_scope = 'global');
create policy mapping_versions_write_tenant_isolation on mapping_versions
  for all using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', '')) with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy mapping_versions_select_app_context_isolation on mapping_versions
  for select using (tenant_id = app_current_tenant() or owner_scope = 'global');
create policy mapping_versions_write_app_context_isolation on mapping_versions
  for all using (tenant_id = app_current_tenant()) with check (tenant_id = app_current_tenant());

-- G. mapping_reviews
drop policy if exists mapping_reviews_tenant_isolation on mapping_reviews;
drop policy if exists mapping_reviews_app_context_isolation on mapping_reviews;

create policy mapping_reviews_select_tenant_isolation on mapping_reviews
  for select using (
    tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', '')
    or exists (
      select 1 from control_mappings m
      where m.id = control_mapping_id and m.owner_scope = 'global'
    )
  );
create policy mapping_reviews_write_tenant_isolation on mapping_reviews
  for all using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', '')) with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy mapping_reviews_select_app_context_isolation on mapping_reviews
  for select using (
    tenant_id = app_current_tenant()
    or exists (
      select 1 from control_mappings m
      where m.id = control_mapping_id and m.owner_scope = 'global'
    )
  );
create policy mapping_reviews_write_app_context_isolation on mapping_reviews
  for all using (tenant_id = app_current_tenant()) with check (tenant_id = app_current_tenant());

-- H. control_mappings
drop policy if exists control_mappings_tenant_isolation on control_mappings;
drop policy if exists control_mappings_app_context_isolation on control_mappings;

create policy control_mappings_select_tenant_isolation on control_mappings
  for select using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', '') or owner_scope = 'global');
create policy control_mappings_write_tenant_isolation on control_mappings
  for all using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', '')) with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy control_mappings_select_app_context_isolation on control_mappings
  for select using (tenant_id = app_current_tenant() or owner_scope = 'global');
create policy control_mappings_write_app_context_isolation on control_mappings
  for all using (tenant_id = app_current_tenant()) with check (tenant_id = app_current_tenant());
