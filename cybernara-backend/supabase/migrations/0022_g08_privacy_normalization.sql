-- Gap remediation — G-08 (privacy normalization).
--
-- Gap report's exact sentence (both source PDFs re-read fresh before starting this gap): "Processing,
-- purposes, lawful bases, recipients, transfers and retention relationships are compressed into
-- arrays/JSON. Create typed entities and join tables with effective dating and deletion workflow."
-- Traceability PRV-01..07. The gap report's own fuller narrative row for "Privacy" reads: "Seven
-- high-level records -> Normalized processing graph, request tasks, incident notifications,
-- transfers, holds and deletion proof." Spec §5 (Privacy ERD) names ~16 logical entities plus 5
-- named join tables ("Join tables replace UUID arrays: processing_inventory_links,
-- processing_purposes, processing_recipients, processing_transfers, and processing_retention_links");
-- spec §13 (both halves: "Processing and Data Map" and "Rights, Consent, Incidents, and Retention")
-- gives the real column-level detail across ~30 tables. Today's schema (migration 0006) has exactly
-- the 7 flat tables the gap report calls "Seven high-level records": `data_inventory_records`,
-- `processing_activities`, `dpia_assessments`, `privacy_rights_requests`, `consent_records`,
-- `privacy_incidents`, `retention_schedules` — confirmed by direct inspection:
-- `processing_activities.purpose`/`lawful_basis` are plain `text` columns, `recipients`/`transfers`
-- are plain `text[]` arrays, `retention_months` is a bare integer with no typed FK to a category or
-- jurisdiction, and there is no effective-dating on any of it.
--
-- Scoping decision, confirmed with the user via AskUserQuestion before writing any code: the user
-- chose the broadest option — "Absolute full spec §13, including data-discovery" — with one
-- exception both options excluded: `retention_assignments`, `legal_holds`, `legal_hold_items`,
-- `deletion_jobs`, `deletion_items` are explicitly claimed by **G-12's own gap sentence** ("Add
-- holds, retention assignments, deletion jobs/items and destruction attestations"), so building them
-- here would duplicate/collide with G-12's future work. They are deferred to G-12, not to a later
-- G-08 phase. Everything else spec §13 names is built here: 22 new tables plus additive columns on
-- the 2 existing tables whose spec-target shape most changed (`data_inventory_records`,
-- `processing_activities`).
--
-- Reconciliation and naming decisions (documented, not silently assumed):
-- 1. None of the 7 existing tables are renamed or dropped (Expand only, non-destructive — this
--    schema's live privacy data is not migrated in this pass). Where spec's target table shares an
--    existing table's name but a materially different shape (`data_inventory_records`,
--    `processing_activities`), the existing table gains additive nullable columns matching spec's
--    identity-level shape; where spec's target is conceptually the same aggregate as an existing
--    table but named differently (`dpias` vs `dpia_assessments`, `rights_requests` vs
--    `privacy_rights_requests`, `consent_purposes`/`consent_events` vs `consent_records`,
--    `incident_assessments`/`incident_notifications` vs the `timeline`/`actions` jsonb embedded in
--    `privacy_incidents`, `retention_rules` vs `retention_schedules`), the new normalized table(s)
--    are built as genuinely new, additional tables, and reference the *existing* table's `id` as
--    their parent FK rather than inventing a duplicate parent — e.g. `rights_request_tasks`
--    references `privacy_rights_requests(id)`, `incident_assessments`/`incident_notifications`
--    reference `privacy_incidents(id)`. This exact "new normalized child/sibling, legacy identity
--    row untouched" pattern is the same one used for every prior gap this size (G-01, G-07, G-09).
--    Backfilling historical data and eventually cutting reads over to the new tables are explicitly
--    deferred Backfill/Constrain/Cutover/Contract-stage work, not done in this pass.
-- 2. `lawful_bases.framework_version_id` (spec's literal column) has no real target: this schema has
--    no `framework_versions` identity table (the framework-content module's `framework_key`/
--    `framework_version` are plain text columns on `framework_content_packs`, not a queryable
--    identity a privacy lawful-basis row could FK against, and conceptually a *regulatory* framework
--    version like "GDPR 2018" is a different kind of thing from this schema's *compliance-control*
--    framework catalog like "SOC2"). `lawful_bases` is keyed by `(tenant_id, jurisdiction, basis_key)`
--    instead.
-- 3. `processing_recipients.data_categories` (spec's literal "typed relation" column, a set of data
--    category ids flowing to one recipient for one purpose) is kept as a plain `uuid[]` rather than
--    inventing an unnamed 4th join table beyond what spec's own table list enumerates — spec does not
--    name a `processing_recipient_categories` table, and this array is genuinely just the "which
--    categories" detail of an already-typed, already-FK'd relationship row, not a bare identifier
--    array replacing a missing relationship the way this whole gap is otherwise about fixing.
-- 4. "Nonoverlap active relation"/"nonoverlap active versions" (spec's own critical-constraint
--    wording for `processing_purposes` and `consent_purposes`) is enforced via a partial unique index
--    on `(... columns ..., effective_to is null)` — guaranteeing only one *currently open-ended*
--    active period per key — rather than a full temporal-range exclusion constraint (which would
--    need the `btree_gist` extension this schema does not otherwise depend on). This covers the
--    common case the constraint name describes without adding a new extension dependency.
-- 5. Every new table here is tenant-scoped (`tenant_id not null`, real per-tenant data), matching
--    this schema's dominant convention — including the taxonomy-like tables spec marks
--    "tenant_id nullable" (`data_categories`, `data_subject_categories`, `purposes`, `lawful_bases`),
--    the same reasoning already used for G-07's `automated_tests`: each tenant manages its own
--    privacy taxonomy as real operational configuration, not shared catalog content the way
--    `framework_requirements`/`harmonized_controls` are.
-- 6. `privacy_notice_versions` is immutable ("Immutable notice version" per spec's own Purpose
--    column) and append-only, following the same convention as every other immutable-version table
--    in this schema (G-07's `evidence_versions`, G-09's `policy_versions`... — though
--    `policy_versions` itself is mutable; the closer precedent is G-07's `evidence_versions`, which
--    also needed an actor/timestamp column spec didn't name: `published_at`/`approved_by` here play
--    the same role `uploaded_at`/`uploaded_by` played there). `consent_events` is also append-only
--    (spec's own Purpose column: "Append-only consent ledger").
-- 7. `consent_purposes.notice_version` (spec's literal free-text column name) is implemented as a
--    real `notice_version_id` FK to the new `privacy_notice_versions(id)` — an improvement over a
--    free-text version string, consistent with this whole gap's purpose of replacing loose
--    references with typed FKs.

alter table data_inventory_records add column if not exists system_id uuid;
alter table data_inventory_records add column if not exists data_category_id uuid;
alter table data_inventory_records add column if not exists location text;
alter table data_inventory_records add column if not exists format text;
alter table data_inventory_records add column if not exists source text;
alter table data_inventory_records add column if not exists steward_id uuid;

alter table processing_activities add column if not exists workspace_id uuid;
alter table processing_activities add column if not exists name text;
alter table processing_activities add column if not exists controller_processor_role text
  check (controller_processor_role is null or controller_processor_role in ('controller', 'processor', 'joint_controller'));
alter table processing_activities add column if not exists status text
  check (status is null or status in ('draft', 'active', 'retired'));

create table if not exists systems_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  workspace_id uuid references grc_workspaces(id),
  name text not null,
  asset_type text not null,
  owner_id uuid not null,
  region text,
  criticality text check (criticality in ('low', 'medium', 'high', 'critical')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, workspace_id, name)
);

alter table data_inventory_records add constraint fk_data_inventory_records_system
  foreign key (system_id) references systems_assets(id);

create table if not exists data_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  category_key text not null,
  name text not null,
  sensitivity text not null check (sensitivity in ('low', 'moderate', 'high', 'special_category')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, category_key)
);

alter table data_inventory_records add constraint fk_data_inventory_records_category
  foreign key (data_category_id) references data_categories(id);

create table if not exists data_subject_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  subject_key text not null,
  name text not null,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, subject_key)
);

create table if not exists data_discovery_scans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  system_id uuid not null references systems_assets(id),
  connector_id uuid not null references connectors(id),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  classifier_version text not null,
  idempotency_key text not null,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);

create table if not exists data_discovery_findings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  scan_id uuid not null references data_discovery_scans(id),
  locator_hash text not null,
  data_category_id uuid not null references data_categories(id),
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  sample_prohibited boolean not null default false,
  review_status text not null default 'pending' check (review_status in ('pending', 'confirmed', 'rejected')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (scan_id, locator_hash, data_category_id)
);

create table if not exists privacy_notices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  notice_key text not null,
  audience text not null,
  owner_id uuid not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, notice_key)
);

-- @append_only
create table if not exists privacy_notice_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  privacy_notice_id uuid not null references privacy_notices(id),
  notice_version_no integer not null check (notice_version_no > 0),
  content_uri text not null,
  sha256 text not null check (length(trim(sha256)) = 64),
  jurisdictions text[] not null default '{}',
  effective_from timestamptz not null,
  effective_to timestamptz,
  approved_by uuid not null,
  published_at timestamptz not null default now(),
  classification cybernara_classification not null default 'restricted',
  created_by uuid generated always as (approved_by) stored,
  created_at timestamptz generated always as (published_at) stored,
  unique (privacy_notice_id, notice_version_no)
);

create table if not exists processing_inventory_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  processing_activity_id uuid not null references processing_activities(id),
  inventory_record_id uuid not null references data_inventory_records(id),
  role text not null check (role in ('source', 'destination', 'processor')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (processing_activity_id, inventory_record_id, role)
);

create table if not exists purposes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  purpose_key text not null,
  name text not null,
  description text,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, purpose_key)
);

create table if not exists lawful_bases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  jurisdiction text not null,
  basis_key text not null,
  name text not null,
  citation text,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, jurisdiction, basis_key)
);

create table if not exists processing_purposes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  processing_activity_id uuid not null references processing_activities(id),
  purpose_id uuid not null references purposes(id),
  lawful_basis_id uuid not null references lawful_bases(id),
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_processing_purposes_active_unique
  on processing_purposes(processing_activity_id, purpose_id)
  where effective_to is null;

create table if not exists recipients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  name text not null,
  recipient_type text not null check (recipient_type in ('controller', 'processor', 'sub_processor')),
  country text not null,
  vendor_id uuid references vendors(id),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, name, recipient_type)
);

create table if not exists processing_recipients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  processing_activity_id uuid not null references processing_activities(id),
  recipient_id uuid not null references recipients(id),
  purpose_id uuid not null references purposes(id),
  data_categories uuid[] not null default '{}',
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (processing_activity_id, recipient_id, purpose_id)
);

create table if not exists transfers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  processing_activity_id uuid not null references processing_activities(id),
  from_country text not null,
  to_country text not null,
  mechanism text not null check (mechanism in ('sccs', 'adequacy_decision', 'bcr', 'derogation')),
  safeguards text,
  status text not null default 'active' check (status in ('active', 'suspended', 'terminated')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists dpias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  processing_activity_id uuid not null references processing_activities(id),
  trigger_reason text not null,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'rejected')),
  owner_id uuid not null,
  approved_by uuid,
  approved_at timestamptz,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists dpia_risks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  dpia_id uuid not null references dpias(id),
  description text not null,
  likelihood text not null check (likelihood in ('low', 'medium', 'high')),
  impact text not null check (impact in ('low', 'medium', 'high')),
  treatment text,
  residual_score integer not null check (residual_score >= 0 and residual_score <= 100),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists rights_request_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  rights_request_id uuid not null references privacy_rights_requests(id),
  system_id uuid not null references systems_assets(id),
  owner_id uuid not null,
  task_type text not null check (task_type in ('search', 'decision', 'fulfillment')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'blocked')),
  result_ref text,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (rights_request_id, system_id, task_type)
);

create table if not exists consent_purposes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  purpose_id uuid not null references purposes(id),
  notice_version_id uuid not null references privacy_notice_versions(id),
  channel text not null,
  region text not null,
  active_from timestamptz not null default now(),
  active_to timestamptz,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_consent_purposes_active_unique
  on consent_purposes(tenant_id, purpose_id, channel, region)
  where active_to is null;

-- @append_only
create table if not exists consent_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  subject_token text not null,
  consent_purpose_id uuid not null references consent_purposes(id),
  event_type text not null check (event_type in ('granted', 'withdrawn', 'updated')),
  occurred_at timestamptz not null default now(),
  source text not null,
  proof_hash text not null,
  idempotency_key text not null,
  recorded_by uuid not null,
  recorded_at timestamptz not null default now(),
  classification cybernara_classification not null default 'restricted',
  created_by uuid generated always as (recorded_by) stored,
  created_at timestamptz generated always as (recorded_at) stored,
  unique (tenant_id, idempotency_key)
);

create table if not exists incident_assessments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  incident_id uuid not null references privacy_incidents(id),
  jurisdiction text not null,
  reportable boolean not null,
  rationale text not null,
  assessor_id uuid not null,
  decided_at timestamptz not null default now(),
  assessment_version_no integer not null default 1 check (assessment_version_no > 0),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (incident_id, jurisdiction, assessment_version_no)
);

create table if not exists incident_notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  incident_id uuid not null references privacy_incidents(id),
  recipient_type text not null check (recipient_type in ('regulator', 'data_subject', 'partner')),
  jurisdiction text not null,
  due_at timestamptz not null,
  sent_at timestamptz,
  artifact_id uuid,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists retention_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  data_category_id uuid not null references data_categories(id),
  jurisdiction text not null,
  retention_trigger text not null,
  duration_days integer not null check (duration_days > 0),
  disposition text not null check (disposition in ('delete', 'anonymize', 'archive')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_systems_assets_tenant_type on systems_assets(tenant_id, asset_type);
create index if not exists idx_data_categories_sensitivity on data_categories(sensitivity);
create index if not exists idx_data_subject_categories_key on data_subject_categories(subject_key);
create index if not exists idx_data_discovery_scans_system_status on data_discovery_scans(system_id, status);
create index if not exists idx_data_discovery_findings_scan_status on data_discovery_findings(scan_id, review_status);
create index if not exists idx_privacy_notices_tenant_status on privacy_notices(tenant_id, status);
create index if not exists idx_processing_inventory_links_activity on processing_inventory_links(processing_activity_id);
create index if not exists idx_purposes_key on purposes(purpose_key);
create index if not exists idx_lawful_bases_key on lawful_bases(basis_key);
create index if not exists idx_processing_purposes_activity on processing_purposes(processing_activity_id);
create index if not exists idx_recipients_tenant_type on recipients(tenant_id, recipient_type);
create index if not exists idx_processing_recipients_activity on processing_recipients(processing_activity_id);
create index if not exists idx_transfers_activity_status on transfers(processing_activity_id, status);
create index if not exists idx_dpias_activity_status on dpias(processing_activity_id, status);
create index if not exists idx_dpia_risks_dpia on dpia_risks(dpia_id);
create index if not exists idx_rights_request_tasks_request_status on rights_request_tasks(rights_request_id, status);
create index if not exists idx_consent_purposes_tenant_purpose on consent_purposes(tenant_id, purpose_id);
create index if not exists idx_consent_events_subject_occurred on consent_events(subject_token, occurred_at);
create index if not exists idx_incident_assessments_incident on incident_assessments(incident_id);
create index if not exists idx_incident_notifications_incident_due on incident_notifications(incident_id, due_at);
create index if not exists idx_retention_rules_category_jurisdiction on retention_rules(data_category_id, jurisdiction);

alter table systems_assets enable row level security;
alter table data_categories enable row level security;
alter table data_subject_categories enable row level security;
alter table data_discovery_scans enable row level security;
alter table data_discovery_findings enable row level security;
alter table privacy_notices enable row level security;
alter table privacy_notice_versions enable row level security;
alter table processing_inventory_links enable row level security;
alter table purposes enable row level security;
alter table lawful_bases enable row level security;
alter table processing_purposes enable row level security;
alter table recipients enable row level security;
alter table processing_recipients enable row level security;
alter table transfers enable row level security;
alter table dpias enable row level security;
alter table dpia_risks enable row level security;
alter table rights_request_tasks enable row level security;
alter table consent_purposes enable row level security;
alter table consent_events enable row level security;
alter table incident_assessments enable row level security;
alter table incident_notifications enable row level security;
alter table retention_rules enable row level security;

create policy systems_assets_tenant_isolation on systems_assets
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy systems_assets_app_context_isolation on systems_assets
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on systems_assets to app_runtime;

create policy data_categories_tenant_isolation on data_categories
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy data_categories_app_context_isolation on data_categories
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on data_categories to app_runtime;

create policy data_subject_categories_tenant_isolation on data_subject_categories
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy data_subject_categories_app_context_isolation on data_subject_categories
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on data_subject_categories to app_runtime;

create policy data_discovery_scans_tenant_isolation on data_discovery_scans
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy data_discovery_scans_app_context_isolation on data_discovery_scans
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on data_discovery_scans to app_runtime;

create policy data_discovery_findings_tenant_isolation on data_discovery_findings
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy data_discovery_findings_app_context_isolation on data_discovery_findings
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on data_discovery_findings to app_runtime;

create policy privacy_notices_tenant_isolation on privacy_notices
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy privacy_notices_app_context_isolation on privacy_notices
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on privacy_notices to app_runtime;

create policy privacy_notice_versions_tenant_isolation on privacy_notice_versions
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy privacy_notice_versions_app_context_isolation on privacy_notice_versions
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert on privacy_notice_versions to app_runtime;

create policy processing_inventory_links_tenant_isolation on processing_inventory_links
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy processing_inventory_links_app_context_isolation on processing_inventory_links
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on processing_inventory_links to app_runtime;

create policy purposes_tenant_isolation on purposes
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy purposes_app_context_isolation on purposes
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on purposes to app_runtime;

create policy lawful_bases_tenant_isolation on lawful_bases
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy lawful_bases_app_context_isolation on lawful_bases
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on lawful_bases to app_runtime;

create policy processing_purposes_tenant_isolation on processing_purposes
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy processing_purposes_app_context_isolation on processing_purposes
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on processing_purposes to app_runtime;

create policy recipients_tenant_isolation on recipients
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy recipients_app_context_isolation on recipients
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on recipients to app_runtime;

create policy processing_recipients_tenant_isolation on processing_recipients
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy processing_recipients_app_context_isolation on processing_recipients
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on processing_recipients to app_runtime;

create policy transfers_tenant_isolation on transfers
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy transfers_app_context_isolation on transfers
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on transfers to app_runtime;

create policy dpias_tenant_isolation on dpias
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy dpias_app_context_isolation on dpias
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on dpias to app_runtime;

create policy dpia_risks_tenant_isolation on dpia_risks
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy dpia_risks_app_context_isolation on dpia_risks
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on dpia_risks to app_runtime;

create policy rights_request_tasks_tenant_isolation on rights_request_tasks
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy rights_request_tasks_app_context_isolation on rights_request_tasks
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on rights_request_tasks to app_runtime;

create policy consent_purposes_tenant_isolation on consent_purposes
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy consent_purposes_app_context_isolation on consent_purposes
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on consent_purposes to app_runtime;

create policy consent_events_tenant_isolation on consent_events
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy consent_events_app_context_isolation on consent_events
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert on consent_events to app_runtime;

create policy incident_assessments_tenant_isolation on incident_assessments
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy incident_assessments_app_context_isolation on incident_assessments
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on incident_assessments to app_runtime;

create policy incident_notifications_tenant_isolation on incident_notifications
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy incident_notifications_app_context_isolation on incident_notifications
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on incident_notifications to app_runtime;

create policy retention_rules_tenant_isolation on retention_rules
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy retention_rules_app_context_isolation on retention_rules
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on retention_rules to app_runtime;

-- Append-only enforcement, shared across this migration's two immutable tables (matching the
-- existing `prevent_assessment_history_mutation()`/`prevent_evidence_graph_mutation()` precedent
-- from migrations 0013/0021, which reuse one function across several tables via tg_table_name).
create or replace function prevent_privacy_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

drop trigger if exists trg_prevent_privacy_notice_versions_mutation on privacy_notice_versions;
create trigger trg_prevent_privacy_notice_versions_mutation
  before update or delete on privacy_notice_versions
  for each row execute function prevent_privacy_ledger_mutation();

drop trigger if exists trg_prevent_consent_events_mutation on consent_events;
create trigger trg_prevent_consent_events_mutation
  before update or delete on consent_events
  for each row execute function prevent_privacy_ledger_mutation();

alter table systems_assets force row level security;
alter table data_categories force row level security;
alter table data_subject_categories force row level security;
alter table data_discovery_scans force row level security;
alter table data_discovery_findings force row level security;
alter table privacy_notices force row level security;
alter table privacy_notice_versions force row level security;
alter table processing_inventory_links force row level security;
alter table purposes force row level security;
alter table lawful_bases force row level security;
alter table processing_purposes force row level security;
alter table recipients force row level security;
alter table processing_recipients force row level security;
alter table transfers force row level security;
alter table dpias force row level security;
alter table dpia_risks force row level security;
alter table rights_request_tasks force row level security;
alter table consent_purposes force row level security;
alter table consent_events force row level security;
alter table incident_assessments force row level security;
alter table incident_notifications force row level security;
alter table retention_rules force row level security;
