-- 0041_shared_reference_catalog_visibility.sql
-- Let customer tenants read the seeded reference catalog without copying catalog rows
-- or writing to frozen legacy tables. The reference tenant stores platform catalog data.

do $$
declare
  reference_tenant uuid := '00000000-0000-4000-8000-000000000001';
begin
  drop policy if exists frameworks_select_reference_catalog on frameworks;
  execute format(
    'create policy frameworks_select_reference_catalog on frameworks for select using (tenant_id = %L::uuid)',
    reference_tenant
  );

  drop policy if exists framework_versions_select_reference_catalog on framework_versions;
  execute format(
    'create policy framework_versions_select_reference_catalog on framework_versions for select using (tenant_id = %L::uuid)',
    reference_tenant
  );

  drop policy if exists framework_content_packs_select_reference_catalog on framework_content_packs;
  execute format(
    'create policy framework_content_packs_select_reference_catalog on framework_content_packs for select using (tenant_id = %L::uuid)',
    reference_tenant
  );

  drop policy if exists framework_requirements_select_reference_catalog on framework_requirements;
  execute format(
    'create policy framework_requirements_select_reference_catalog on framework_requirements for select using (tenant_id = %L::uuid)',
    reference_tenant
  );

  drop policy if exists control_sets_select_reference_catalog on control_sets;
  execute format(
    'create policy control_sets_select_reference_catalog on control_sets for select using (tenant_id = %L::uuid)',
    reference_tenant
  );

  drop policy if exists controls_select_reference_catalog on controls;
  execute format(
    'create policy controls_select_reference_catalog on controls for select using (tenant_id = %L::uuid)',
    reference_tenant
  );

  drop policy if exists control_subcontrols_select_reference_catalog on control_subcontrols;
  execute format(
    'create policy control_subcontrols_select_reference_catalog on control_subcontrols for select using (tenant_id = %L::uuid)',
    reference_tenant
  );

  drop policy if exists mapping_versions_select_reference_catalog on mapping_versions;
  execute format(
    'create policy mapping_versions_select_reference_catalog on mapping_versions for select using (tenant_id = %L::uuid)',
    reference_tenant
  );

  drop policy if exists control_mappings_select_reference_catalog on control_mappings;
  execute format(
    'create policy control_mappings_select_reference_catalog on control_mappings for select using (tenant_id = %L::uuid)',
    reference_tenant
  );

  drop policy if exists harmonized_controls_select_reference_catalog on harmonized_controls;
  execute format(
    'create policy harmonized_controls_select_reference_catalog on harmonized_controls for select using (tenant_id = %L::uuid)',
    reference_tenant
  );
end $$;
