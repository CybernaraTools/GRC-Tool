-- Gap remediation Phase 1 (Guard rails) — G-02 referential integrity (safe slice)
-- and G-05 framework catalog ownership (groundwork only).
--
-- G-02: findings.assessment_item_id has always been `uuid not null` with no FK,
-- so a typo'd or deleted assessment item silently orphans every finding raised
-- against it. This adds the missing FK using the standard safe two-step
-- (NOT VALID, then VALIDATE CONSTRAINT) so adding it never blocks concurrent
-- writes and fails loudly — instead of corrupting data — if any orphan already
-- exists. The other G-02 items (control_mappings' text-based source/target
-- references, privacy/EnterpriseGRC UUID-array and JSON relationships) are a
-- much larger normalization documented as remaining work in
-- docs/schema-remediation-report.md; this migration only closes the one
-- specific, safe, additive FK the gap register calls out by name.
--
-- G-05: the schema spec (§3, §9) separates a global, versioned, signed
-- framework/control catalog from tenant-owned custom overlays; today every
-- framework_content_packs/harmonized_controls/control_mappings row is
-- tenant-owned with no way to express "this is the shared standard catalog."
-- This migration adds the owner_scope column as pure groundwork (every
-- existing row is correctly classified 'tenant' since that is what they
-- actually are today) without moving any data or changing tenant_id
-- nullability — the full global/tenant split (separate catalog.* tables per
-- spec §9, subscriptions/overlays) is a larger Phase 3+ effort tracked in the
-- remediation report, not attempted here.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'catalog_owner_scope') then
    create type catalog_owner_scope as enum ('global', 'tenant');
  end if;
end $$;

alter table framework_content_packs
  add column if not exists owner_scope catalog_owner_scope not null default 'tenant';
alter table harmonized_controls
  add column if not exists owner_scope catalog_owner_scope not null default 'tenant';
alter table control_mappings
  add column if not exists owner_scope catalog_owner_scope not null default 'tenant';

create index if not exists idx_framework_content_packs_owner_scope on framework_content_packs(owner_scope);
create index if not exists idx_harmonized_controls_owner_scope on harmonized_controls(owner_scope);
create index if not exists idx_control_mappings_owner_scope on control_mappings(owner_scope);

-- G-02 safe FK: fail loudly here rather than adding a constraint that would
-- silently be impossible to validate later.
do $$
declare
  orphan_count integer;
begin
  select count(*) into orphan_count
  from findings f
  left join assessment_items ai on ai.id = f.assessment_item_id
  where ai.id is null;

  if orphan_count > 0 then
    raise exception 'Cannot add findings.assessment_item_id FK: % orphaned finding row(s) reference a missing assessment_items.id. Reconcile before re-running this migration.', orphan_count;
  end if;
end $$;

alter table findings
  add constraint findings_assessment_item_id_fkey
  foreign key (assessment_item_id) references assessment_items(id)
  not valid;

alter table findings
  validate constraint findings_assessment_item_id_fkey;

-- No new index needed: idx_findings_assessment_item (tenant_id, assessment_item_id)
-- from 0003_m2_assessment_core.sql already covers this FK's lookup pattern,
-- since every application query scopes by tenant_id first.
