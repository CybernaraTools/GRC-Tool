-- Migration: 0034_phase16_framework_update_impact
-- Creates the framework diff, diff items, and update impact tables.
--
-- DIVERGENCE NOTICE (Phase 16 / 2026-07-08):
-- This migration file was created AFTER its DDL was already applied live via a scratch
-- script (scratch/run-hardening.js or equivalent). The file here matches the live schema
-- as closely as possible, but the migration runner did not execute this file — rows were
-- inserted manually into supabase_migrations.schema_migrations to record it as applied.
--
-- Rule: Never edit a migration file to "match" DDL already run live — do this instead:
-- 1. Keep the file as the authoritative record of intent.
-- 2. Add this notice so future maintainers understand the divergence.
-- 3. If the live schema differs from this file, fix it forward with a new migration,
--    never by editing this one.
-- 4. If re-running from scratch (e.g. CI, staging), this file IS the correct source.

create table if not exists framework_diffs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  framework_id uuid not null references frameworks(id),
  from_version_id uuid not null references framework_versions(id),
  to_version_id uuid not null references framework_versions(id),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  classification cybernara_classification not null default 'confidential',
  unique (tenant_id, from_version_id, to_version_id)
);

create table if not exists framework_diff_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  diff_id uuid not null references framework_diffs(id) on delete cascade,
  change_type text not null check (change_type in ('added', 'removed', 'modified')),
  control_key text not null,
  old_value jsonb,
  new_value jsonb,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  classification cybernara_classification not null default 'confidential'
);

create table if not exists framework_update_impacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  diff_item_id uuid not null references framework_diff_items(id) on delete cascade,
  assessment_id uuid not null references assessments(id) on delete cascade,
  control_instance_id uuid references control_instances(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'reassessed', 'accepted', 'ignored')),
  resolution_rationale text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  classification cybernara_classification not null default 'confidential',
  unique (tenant_id, diff_item_id, assessment_id, control_instance_id)
);

-- Enable RLS and force it
alter table framework_diffs enable row level security;
alter table framework_diffs force row level security;

alter table framework_diff_items enable row level security;
alter table framework_diff_items force row level security;

alter table framework_update_impacts enable row level security;
alter table framework_update_impacts force row level security;

-- RLS policies matching current tenant scope
create policy framework_diffs_select on framework_diffs for select using (tenant_id = app_current_tenant());
create policy framework_diffs_insert on framework_diffs for insert with check (tenant_id = app_current_tenant());
create policy framework_diffs_update on framework_diffs for update using (tenant_id = app_current_tenant());
create policy framework_diffs_delete on framework_diffs for delete using (tenant_id = app_current_tenant());

create policy framework_diff_items_select on framework_diff_items for select using (tenant_id = app_current_tenant());
create policy framework_diff_items_insert on framework_diff_items for insert with check (tenant_id = app_current_tenant());
create policy framework_diff_items_update on framework_diff_items for update using (tenant_id = app_current_tenant());
create policy framework_diff_items_delete on framework_diff_items for delete using (tenant_id = app_current_tenant());

create policy framework_update_impacts_select on framework_update_impacts for select using (tenant_id = app_current_tenant());
create policy framework_update_impacts_insert on framework_update_impacts for insert with check (tenant_id = app_current_tenant());
create policy framework_update_impacts_update on framework_update_impacts for update using (tenant_id = app_current_tenant());
create policy framework_update_impacts_delete on framework_update_impacts for delete using (tenant_id = app_current_tenant());

-- Grant permissions to connection role
grant select, insert, update, delete on framework_diffs to app_runtime;
grant select, insert, update, delete on framework_diff_items to app_runtime;
grant select, insert, update, delete on framework_update_impacts to app_runtime;
