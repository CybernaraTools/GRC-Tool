-- Gap remediation — G-07 (evidence graph).
--
-- Gap report's exact sentence (both source PDFs re-read fresh before starting this gap): "Evidence
-- objects are not fully linked to control instances, questions, tests, periods, requests or
-- reviews. Add evidence_links, evidence_versions, requests, reviews, samples and retention
-- actions." Traceability EVD-01..06. The gap report's own fuller narrative row for "Evidence"
-- reads: "Versions, links, requests, reviews, samples, chain of custody, expiry and disposal."
-- Spec §11 ("Evidence and Assurance") names 10 target tables. Today's schema (migration 0003) has
-- exactly one: `evidence_objects`, a single flat, mutable row combining identity (owner, state)
-- with content (file_name, storage_uri, sha256, period_start/end, scope_tags) — confirmed by direct
-- inspection of `postgres-evidence-assurance.repository.ts` and 261 live rows. There is no
-- versioning (a re-upload just overwrites the same row's state), no typed link to control
-- instances/questions/tests, no request/review/sample workflow, no malware-scan record (today
-- `commitCleanEvidence` takes a one-shot `scannerVerdict` parameter and throws it away), and no
-- expiry/custody history at all.
--
-- Scoping decision, confirmed with the user via AskUserQuestion before writing any code (same
-- discipline as G-01/G-06/G-09's phasing): the user chose "Full §11 in one pass" — build all 10
-- target tables now, including `automated_tests`/`automated_test_runs`, even though those two
-- describe connector-driven control testing (a different sub-domain from evidence custody) and
-- aren't named anywhere in G-07's own gap-report text. They are still built here per that explicit
-- choice, because `evidence_samples.test_result_id` and `evidence_links`'s "tests" target both
-- depend on a real test-execution identity existing.
--
-- Reconciliation and naming decisions (documented, not silently assumed):
-- 1. `evidence_objects`/`evidence_versions` split mirrors the same "identity vs. immutable version"
--    pattern already used for G-09's `policies`/`policy_versions`. `evidence_objects` keeps its
--    existing flat columns untouched (Expand only, non-destructive — this schema's 261 live rows
--    are not migrated in this pass); it additionally gains nullable `title`/`source_type`/
--    `retention_until` columns matching spec's identity-table shape, populated by the application
--    going forward. `evidence_versions` is new and immutable ("Immutable object version" per
--    spec's own Purpose column), following the append-only convention (reject UPDATE/DELETE via
--    trigger). Backfilling the 261 pre-existing `evidence_objects` rows into `evidence_versions`,
--    and eventually contracting the now-redundant legacy columns off `evidence_objects`, are
--    explicitly deferred Backfill/Constrain/Cutover/Contract-stage work — not done in this pass,
--    exactly matching G-01's own precedent for a normalization this size.
-- 2. Spec's own "version" column name for `evidence_versions` collides with this schema's
--    standard cross-cutting `version` column (the per-row optimistic-concurrency counter present
--    on every mutable table). To avoid conflating "which edition of this evidence content" with
--    "how many times has this row been updated," the domain version number is named
--    `evidence_version_no` here instead of `version`.
-- 3. Spec does not name an actor column for `evidence_versions` or `evidence_expiry_events`, but
--    every table in this schema must still satisfy the cross-cutting `created_by`/`created_at`
--    contract (spec §2). `evidence_versions` gains `uploaded_by`/`uploaded_at` (created_by/
--    created_at are generated from these); `evidence_expiry_events` gains `actor_id` (created_by
--    generated from it). `evidence_custody_events` already names `actor_id` in spec, so no
--    addition was needed there. `uploaded_at` is kept distinct from `observed_at` because the two
--    are not the same instant: `observed_at` is when the evidence content was collected/observed
--    (which can legitimately predate the upload), while `uploaded_at` is the real row-creation
--    time the append-only contract needs.
-- 4. `evidence_reviews`'s "reviewer separation" critical constraint (spec §11) cannot be expressed
--    as a single-table CHECK constraint (it requires comparing `reviewer_id` against the evidence
--    object's `owner_id`, a different table) — same limitation already noted for this schema's
--    other cross-table invariants (e.g. G-03's tenant-match-on-FK). It is enforced at the
--    application layer instead (`EvidenceAssuranceService`), and proven with a real integration
--    test that attempts a self-review and expects rejection.
-- 5. `malware_scan_results`'s "one final result per version/engine" critical constraint is read
--    literally as one row, ever, per (evidence_version_id, engine) pair — not "the latest of many"
--    — so it is enforced via `unique(evidence_version_id, engine)`.
-- 6. `automated_test_runs`'s "idempotency" critical constraint doesn't name its own key columns in
--    the gap-report-style spec table. Rather than inventing a new watermark-based dedupe rule, this
--    reuses the exact `idempotency_key text` + `unique(tenant_id, idempotency_key)` convention
--    already used by every other creatable entity in this codebase (via `OutboxService`'s
--    idempotency-replay pattern), for consistency with the rest of the schema.
-- 7. `evidence_links.target_type` is a CHECK-constraint-based static registry covering the three
--    target kinds G-07's own gap sentence names — control instances, questions (assessment items),
--    and tests (automated test runs) — the same static-registry pattern already used for G-06's
--    `ai_publication_events.target_type` and G-09's `risk_links.target_type`.
-- 8. `automated_tests.tenant_id` is kept `not null` with real per-tenant scoping (not spec's
--    "tenant_id nullable" platform-default, and not the `CANONICAL_CONTENT_TENANT_ID` sentinel used
--    for genuinely shared catalog content like `risk_models`) — each tenant authors its own
--    connector-driven test definitions, so this is tenant-owned operational configuration, not
--    shared catalog content. `automated_tests.control_id` references the catalog `harmonized_controls`
--    table (a test definition targets a harmonized control, not a specific assessment's
--    `control_instances` row).

alter table evidence_objects add column if not exists title text;
alter table evidence_objects add column if not exists source_type text;
alter table evidence_objects add column if not exists retention_until timestamptz;

-- @append_only
create table if not exists evidence_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  evidence_id uuid not null references evidence_objects(id),
  evidence_version_no integer not null check (evidence_version_no > 0),
  object_uri text not null,
  sha256 text not null check (length(trim(sha256)) = 64),
  size_bytes bigint not null check (size_bytes >= 0),
  mime_type text not null,
  observed_at timestamptz not null,
  period_start date not null,
  period_end date not null check (period_end >= period_start),
  uploaded_by uuid not null,
  uploaded_at timestamptz not null default now(),
  classification cybernara_classification not null default 'restricted',
  created_by uuid generated always as (uploaded_by) stored,
  created_at timestamptz generated always as (uploaded_at) stored,
  unique (evidence_id, evidence_version_no)
);

create table if not exists evidence_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  evidence_version_id uuid not null references evidence_versions(id),
  target_type text not null check (target_type in ('control_instance', 'assessment_item', 'automated_test_run')),
  target_id uuid not null,
  purpose text not null check (length(trim(purpose)) > 0),
  scope_match boolean not null default false,
  period_match boolean not null default false,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (evidence_version_id, target_type, target_id, purpose)
);

create table if not exists evidence_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  assessment_id uuid not null references assessments(id),
  control_instance_id uuid not null references control_instances(id),
  requested_from text not null,
  due_at timestamptz not null,
  status text not null default 'requested' check (status in ('requested', 'submitted', 'accepted', 'rejected')),
  instructions text,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (assessment_id, control_instance_id, requested_from)
);

create table if not exists evidence_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  evidence_version_id uuid not null references evidence_versions(id),
  reviewer_id uuid not null,
  decision text not null check (decision in ('sufficient', 'insufficient', 'needs_more_context')),
  rationale text not null check (length(trim(rationale)) > 0),
  reviewed_at timestamptz not null default now(),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists automated_tests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  control_id uuid not null references harmonized_controls(id),
  connector_type text not null check (length(trim(connector_type)) > 0),
  query_template text not null,
  schedule text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, control_id, connector_type)
);

create table if not exists automated_test_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  automated_test_id uuid not null references automated_tests(id),
  connector_id uuid not null references connectors(id),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  result_json jsonb not null default '{}'::jsonb,
  source_watermark text,
  idempotency_key text not null,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);

create table if not exists evidence_samples (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  test_result_id uuid not null references automated_test_runs(id),
  population_ref text not null,
  method text not null check (method in ('random', 'stratified', 'judgmental', 'full_population')),
  sample_size integer not null check (sample_size >= 0),
  sample_json jsonb not null default '[]'::jsonb,
  seed text,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists malware_scan_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  evidence_version_id uuid not null references evidence_versions(id),
  engine text not null,
  signature_version text not null,
  status text not null check (status in ('clean', 'infected', 'error')),
  details_hash text,
  scanned_at timestamptz not null default now(),
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (evidence_version_id, engine)
);

-- @append_only
create table if not exists evidence_expiry_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  evidence_id uuid not null references evidence_objects(id),
  previous_state text not null,
  new_state text not null,
  reason text not null check (length(trim(reason)) > 0),
  actor_id uuid not null,
  occurred_at timestamptz not null default now(),
  classification cybernara_classification not null default 'confidential',
  created_by uuid generated always as (actor_id) stored,
  created_at timestamptz generated always as (occurred_at) stored
);

-- @append_only
create table if not exists evidence_custody_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  evidence_version_id uuid not null references evidence_versions(id),
  event_type text not null check (event_type in ('created', 'transferred', 'accessed', 'exported', 'disposed')),
  actor_id uuid not null,
  location_ref text not null,
  event_hash text not null,
  occurred_at timestamptz not null default now(),
  classification cybernara_classification not null default 'restricted',
  created_by uuid generated always as (actor_id) stored,
  created_at timestamptz generated always as (occurred_at) stored
);

create index if not exists idx_evidence_versions_evidence on evidence_versions(evidence_id);
create index if not exists idx_evidence_links_target on evidence_links(target_type, target_id);
create index if not exists idx_evidence_requests_assessment_status on evidence_requests(assessment_id, status, due_at);
create index if not exists idx_evidence_reviews_version_decision on evidence_reviews(evidence_version_id, decision);
create index if not exists idx_automated_tests_control on automated_tests(tenant_id, control_id, connector_type);
create index if not exists idx_automated_test_runs_test_status on automated_test_runs(automated_test_id, status);
create index if not exists idx_evidence_samples_test_result on evidence_samples(test_result_id);
create index if not exists idx_malware_scan_results_version_status on malware_scan_results(evidence_version_id, status);
create index if not exists idx_evidence_expiry_events_evidence on evidence_expiry_events(evidence_id, occurred_at);
create index if not exists idx_evidence_custody_events_version on evidence_custody_events(evidence_version_id, occurred_at);

alter table evidence_versions enable row level security;
alter table evidence_links enable row level security;
alter table evidence_requests enable row level security;
alter table evidence_reviews enable row level security;
alter table automated_tests enable row level security;
alter table automated_test_runs enable row level security;
alter table evidence_samples enable row level security;
alter table malware_scan_results enable row level security;
alter table evidence_expiry_events enable row level security;
alter table evidence_custody_events enable row level security;

create policy evidence_versions_tenant_isolation on evidence_versions
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy evidence_versions_app_context_isolation on evidence_versions
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert on evidence_versions to app_runtime;

create policy evidence_links_tenant_isolation on evidence_links
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy evidence_links_app_context_isolation on evidence_links
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on evidence_links to app_runtime;

create policy evidence_requests_tenant_isolation on evidence_requests
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy evidence_requests_app_context_isolation on evidence_requests
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on evidence_requests to app_runtime;

create policy evidence_reviews_tenant_isolation on evidence_reviews
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy evidence_reviews_app_context_isolation on evidence_reviews
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on evidence_reviews to app_runtime;

create policy automated_tests_tenant_isolation on automated_tests
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy automated_tests_app_context_isolation on automated_tests
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on automated_tests to app_runtime;

create policy automated_test_runs_tenant_isolation on automated_test_runs
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy automated_test_runs_app_context_isolation on automated_test_runs
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on automated_test_runs to app_runtime;

create policy evidence_samples_tenant_isolation on evidence_samples
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy evidence_samples_app_context_isolation on evidence_samples
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on evidence_samples to app_runtime;

create policy malware_scan_results_tenant_isolation on malware_scan_results
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy malware_scan_results_app_context_isolation on malware_scan_results
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on malware_scan_results to app_runtime;

create policy evidence_expiry_events_tenant_isolation on evidence_expiry_events
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy evidence_expiry_events_app_context_isolation on evidence_expiry_events
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert on evidence_expiry_events to app_runtime;

create policy evidence_custody_events_tenant_isolation on evidence_custody_events
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy evidence_custody_events_app_context_isolation on evidence_custody_events
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert on evidence_custody_events to app_runtime;

-- Append-only enforcement, shared across this migration's three immutable tables (matching the
-- existing `prevent_assessment_history_mutation()` precedent from migration 0013, which reuses one
-- function across several tables via tg_table_name).
create or replace function prevent_evidence_graph_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

drop trigger if exists trg_prevent_evidence_versions_mutation on evidence_versions;
create trigger trg_prevent_evidence_versions_mutation
  before update or delete on evidence_versions
  for each row execute function prevent_evidence_graph_mutation();

drop trigger if exists trg_prevent_evidence_expiry_events_mutation on evidence_expiry_events;
create trigger trg_prevent_evidence_expiry_events_mutation
  before update or delete on evidence_expiry_events
  for each row execute function prevent_evidence_graph_mutation();

drop trigger if exists trg_prevent_evidence_custody_events_mutation on evidence_custody_events;
create trigger trg_prevent_evidence_custody_events_mutation
  before update or delete on evidence_custody_events
  for each row execute function prevent_evidence_graph_mutation();

alter table evidence_versions force row level security;
alter table evidence_links force row level security;
alter table evidence_requests force row level security;
alter table evidence_reviews force row level security;
alter table automated_tests force row level security;
alter table automated_test_runs force row level security;
alter table evidence_samples force row level security;
alter table malware_scan_results force row level security;
alter table evidence_expiry_events force row level security;
alter table evidence_custody_events force row level security;
