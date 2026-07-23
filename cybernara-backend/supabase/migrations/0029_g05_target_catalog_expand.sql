-- Gap remediation — G-05 target-state catalog structure (spec §9), Expand stage (spec §24:
-- Design -> Expand -> Backfill -> Dual operate -> Constrain -> Cutover -> Contract).
--
-- Design, documented here rather than only in the ledger:
--
-- Spec §9 names: source_packages, frameworks, framework_versions, control_sets, controls,
-- control_subcontrols, mapping_versions, control_mappings (restructured), mapping_reviews,
-- mapping_conflicts, tenant_catalog_subscriptions.
--
-- 1. "source_packages" already exists functionally as `content_source_packages` (migration
--    0002) — same identity (one row per ingested source file), same shape. Not renamed: renaming
--    a live table touched by real application code is a needless risk for a naming difference
--    alone. Spec intent is satisfied by the existing table; noted here so a future reader doesn't
--    go looking for a table that was deliberately not created.
--
-- 2. `frameworks`/`framework_versions` are new: today `framework_content_packs` conflates "this
--    is the SOC2 framework" with "this is pack_version b01c65d04ae5 of SOC2" in one row with no
--    separate identity for the framework itself. `frameworks` (one row per framework_key) and
--    `framework_versions` (one row per framework+version) give that a real identity;
--    `framework_content_packs` gets an additive nullable `framework_version_id` link (populated in
--    a later Backfill-stage migration, not this one).
--
-- 3. `control_sets`/`controls`/`control_subcontrols` are new: today `framework_requirements` is a
--    flat table where `control_id`/`control_title` and `sub_control_id`/`sub_control_title` are
--    free-text columns on every requirement row, with no real control identity a mapping or an
--    assessment's pinned control ref can point to relationally. `controls` becomes the real
--    identity (one row per distinct control within a control_set), carrying requirement text
--    directly for the common case (most controls have no sub-control breakdown — confirmed
--    against live data: 3,643 framework_requirements rows, 289 harmonized_controls, a small
--    fraction of source rows have a non-null sub_control_id). `control_subcontrols` is the
--    optional child table for the rows that do have real sub-control granularity, carrying its
--    own requirement text (a sub-control's guidance is often materially different from its
--    parent's). `control_sets` groups controls within a framework_version (today's schema has no
--    equivalent — every requirement is only ever grouped by its parent framework_content_pack).
--    `framework_requirements` gets additive nullable `control_id_ref`/`control_subcontrol_id`
--    links (populated later, not this migration).
--
-- 4. `mapping_versions` is new: today `control_mappings` has its own `version` integer column but
--    no shared identity a re-harmonization pass can be grouped under — every mapping row versions
--    independently, with no way to say "these 4,523 mappings are all harmonization pass v1."
--    `control_mappings` gets an additive nullable `mapping_version_id` link (populated later).
--
-- 5. `mapping_reviews`/`mapping_conflicts` are new: today `control_mappings.reviewer`/`rationale`
--    are flat, overwritable text columns with no history and no structured conflict-resolution
--    workflow, even though `mapping_classification` already has a `'conflicting'` enum value with
--    nothing that actually tracks how a conflict got resolved. These are genuinely new tables, not
--    restructured existing ones.
--
-- 6. `tenant_catalog_subscriptions` is new and is the actual mechanism this gap's "global vs
--    tenant visibility model" needs: today every framework_content_packs/harmonized_controls/
--    control_mappings row already has an `owner_scope` column (added as groundwork under an
--    earlier pass in this campaign) but nothing reads it — RLS still filters by exact tenant_id
--    match only, so in practice a tenant other than the canonical content tenant cannot see any
--    framework/harmonization content through the standard RLS-scoped read path at all (confirmed
--    live: `select owner_scope, count(*) from framework_content_packs group by owner_scope` shows
--    all 14 rows still `'tenant'`-scoped under the canonical tenant; the only reason the app works
--    today is `AssessmentService`'s own workaround of opening a second connection scoped as the
--    canonical tenant to read canonical content, not a real RLS policy). This table is Expand-only
--    here — the real RLS policy rewrite that makes `owner_scope = 'global'` rows actually visible
--    to every tenant (with or without an explicit subscription row, a decision this migration
--    does not make) is separate, later work, tracked as its own task (#115) — schema and RLS
--    policy changes should not land in the same migration when the RLS change touches read paths
--    this many existing tests already exercise.
--
-- What this migration does NOT do, deliberately: no data movement (Backfill), no application code
-- changes, no RLS policy changes beyond what FORCE ROW LEVEL SECURITY + the existing per-table
-- tenant-isolation policies already provide by default on every new table (identical boilerplate
-- to every other tenant-owned table added throughout this campaign). Every new table is additive;
-- every new column on an existing table is nullable. Nothing here can break existing behavior.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'catalog_subscription_status') then
    create type catalog_subscription_status as enum ('active', 'paused', 'revoked');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'mapping_review_decision') then
    create type mapping_review_decision as enum ('approved', 'rejected', 'needs_changes');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'mapping_conflict_resolution_status') then
    create type mapping_conflict_resolution_status as enum ('open', 'resolved', 'wont_fix');
  end if;
end $$;

-- 1. frameworks — canonical identity for a framework, independent of any one version/pack.
create table if not exists frameworks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  framework_key text not null,
  name text not null,
  description text,
  owner_scope catalog_owner_scope not null default 'tenant',
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, framework_key)
);

-- 2. framework_versions — one row per (framework, version); framework_content_packs.
-- framework_version_id (added below) links the existing pack rows to this once backfilled.
create table if not exists framework_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  framework_id uuid not null references frameworks(id),
  version_key text not null,
  status content_pack_status not null default 'staged',
  published_at timestamptz,
  owner_scope catalog_owner_scope not null default 'tenant',
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, framework_id, version_key)
);

-- 3. control_sets — groups controls within a framework_version (no equivalent exists today).
create table if not exists control_sets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  framework_version_id uuid not null references framework_versions(id),
  set_key text not null,
  name text not null,
  owner_scope catalog_owner_scope not null default 'tenant',
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, framework_version_id, set_key)
);

-- 4. controls — real control identity, replacing framework_requirements' free-text control_id/
-- control_title. Carries requirement text directly for the common (no-sub-control) case.
create table if not exists controls (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  control_set_id uuid not null references control_sets(id),
  control_key text not null,
  title text not null,
  category text,
  requirement_text text,
  citation text,
  source_workbook text,
  source_sheet text,
  source_row_number integer,
  owner_scope catalog_owner_scope not null default 'tenant',
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, control_set_id, control_key)
);

-- 5. control_subcontrols — optional child of controls, for source rows that had a real
-- sub_control_id. Carries its own requirement text (a sub-control's guidance is often materially
-- different from its parent's, matching framework_requirements' existing sub_control_title shape).
create table if not exists control_subcontrols (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  control_id uuid not null references controls(id),
  subcontrol_key text not null,
  title text not null,
  requirement_text text,
  citation text,
  source_workbook text,
  source_sheet text,
  source_row_number integer,
  owner_scope catalog_owner_scope not null default 'tenant',
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, control_id, subcontrol_key)
);

-- 6. mapping_versions — shared identity a harmonization/re-harmonization pass can be grouped
-- under; control_mappings.mapping_version_id (added below) links existing rows once backfilled.
create table if not exists mapping_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  version_key text not null,
  status content_pack_status not null default 'staged',
  published_at timestamptz,
  owner_scope catalog_owner_scope not null default 'tenant',
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, version_key)
);

-- 7. mapping_reviews — structured, append-only review history for a control_mapping row,
-- replacing the flat overwritable reviewer/rationale text columns.
create table if not exists mapping_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  control_mapping_id uuid not null references control_mappings(id),
  reviewer_id uuid not null,
  decision mapping_review_decision not null,
  rationale text not null,
  reviewed_at timestamptz not null default now(),
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

-- 8. mapping_conflicts — structured tracking for the mapping_classification = 'conflicting' case,
-- which today has no actual resolution workflow attached to it.
create table if not exists mapping_conflicts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  control_mapping_id uuid not null references control_mappings(id),
  conflicting_mapping_id uuid references control_mappings(id),
  description text not null,
  resolution_status mapping_conflict_resolution_status not null default 'open',
  resolved_by uuid,
  resolved_at timestamptz,
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  check (resolution_status = 'open' or (resolved_by is not null and resolved_at is not null))
);

-- 9. tenant_catalog_subscriptions — the actual global-content opt-in mechanism; the RLS policy
-- change that makes owner_scope = 'global' rows visible via this table is deliberately deferred
-- to its own migration (task #115), not bundled here.
create table if not exists tenant_catalog_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  framework_id uuid references frameworks(id),
  source_package_id uuid references content_source_packages(id),
  status catalog_subscription_status not null default 'active',
  subscribed_at timestamptz not null default now(),
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  check (framework_id is not null or source_package_id is not null)
);

-- Additive nullable links from the existing flat tables to the new normalized identities —
-- population is Backfill-stage work (task #114 continuation), not this migration.
alter table framework_content_packs add column if not exists framework_version_id uuid references framework_versions(id);
alter table framework_requirements add column if not exists control_id_ref uuid references controls(id);
alter table framework_requirements add column if not exists control_subcontrol_id uuid references control_subcontrols(id);
alter table control_mappings add column if not exists mapping_version_id uuid references mapping_versions(id);

create index if not exists idx_frameworks_owner_scope on frameworks(owner_scope);
create index if not exists idx_framework_versions_framework on framework_versions(tenant_id, framework_id);
create index if not exists idx_framework_versions_owner_scope on framework_versions(owner_scope);
create index if not exists idx_control_sets_framework_version on control_sets(tenant_id, framework_version_id);
create index if not exists idx_controls_control_set on controls(tenant_id, control_set_id);
create index if not exists idx_control_subcontrols_control on control_subcontrols(tenant_id, control_id);
create index if not exists idx_mapping_versions_owner_scope on mapping_versions(owner_scope);
create index if not exists idx_mapping_reviews_control_mapping on mapping_reviews(tenant_id, control_mapping_id);
create index if not exists idx_mapping_conflicts_control_mapping on mapping_conflicts(tenant_id, control_mapping_id);
create index if not exists idx_tenant_catalog_subscriptions_tenant on tenant_catalog_subscriptions(tenant_id);
create index if not exists idx_framework_content_packs_framework_version on framework_content_packs(framework_version_id);
create index if not exists idx_framework_requirements_control_ref on framework_requirements(control_id_ref);
create index if not exists idx_framework_requirements_subcontrol_ref on framework_requirements(control_subcontrol_id);
create index if not exists idx_control_mappings_mapping_version on control_mappings(mapping_version_id);

-- FORCE ROW LEVEL SECURITY + the standard two-policy-plus-grant pattern used by every tenant-
-- owned table added throughout this campaign (see 0008_g10_rls_foundation.sql for
-- app_current_tenant() and the app_runtime role; 0025_g13_custom_platform.sql for the most recent
-- prior example of this exact pattern, reused verbatim here): one policy for Supabase
-- Auth-JWT-based access, one for the app_runtime role's session-scoped tenant context.
alter table frameworks enable row level security;
alter table framework_versions enable row level security;
alter table control_sets enable row level security;
alter table controls enable row level security;
alter table control_subcontrols enable row level security;
alter table mapping_versions enable row level security;
alter table mapping_reviews enable row level security;
alter table mapping_conflicts enable row level security;
alter table tenant_catalog_subscriptions enable row level security;

create policy frameworks_tenant_isolation on frameworks
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy frameworks_app_context_isolation on frameworks
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on frameworks to app_runtime;

create policy framework_versions_tenant_isolation on framework_versions
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy framework_versions_app_context_isolation on framework_versions
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on framework_versions to app_runtime;

create policy control_sets_tenant_isolation on control_sets
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy control_sets_app_context_isolation on control_sets
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on control_sets to app_runtime;

create policy controls_tenant_isolation on controls
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy controls_app_context_isolation on controls
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on controls to app_runtime;

create policy control_subcontrols_tenant_isolation on control_subcontrols
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy control_subcontrols_app_context_isolation on control_subcontrols
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on control_subcontrols to app_runtime;

create policy mapping_versions_tenant_isolation on mapping_versions
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy mapping_versions_app_context_isolation on mapping_versions
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on mapping_versions to app_runtime;

create policy mapping_reviews_tenant_isolation on mapping_reviews
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy mapping_reviews_app_context_isolation on mapping_reviews
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on mapping_reviews to app_runtime;

create policy mapping_conflicts_tenant_isolation on mapping_conflicts
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy mapping_conflicts_app_context_isolation on mapping_conflicts
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on mapping_conflicts to app_runtime;

create policy tenant_catalog_subscriptions_tenant_isolation on tenant_catalog_subscriptions
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy tenant_catalog_subscriptions_app_context_isolation on tenant_catalog_subscriptions
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on tenant_catalog_subscriptions to app_runtime;

alter table frameworks force row level security;
alter table framework_versions force row level security;
alter table control_sets force row level security;
alter table controls force row level security;
alter table control_subcontrols force row level security;
alter table mapping_versions force row level security;
alter table mapping_reviews force row level security;
alter table mapping_conflicts force row level security;
alter table tenant_catalog_subscriptions force row level security;
