-- Gap remediation — G-12 (retention and deletion).
--
-- Gap report's exact sentence (both source PDFs re-read fresh before starting this gap): "Schedules
-- exist but no subject/object holds, deletion jobs, proof or cryptographic erasure workflow. Add
-- holds, retention assignments, deletion jobs/items and destruction attestations." Traceability
-- PRV-07, SEC-04. Spec §13 (second half, "Rights, Consent, Incidents, and Retention") names the 5
-- target tables directly: `retention_assignments`, `legal_holds`, `legal_hold_items`,
-- `deletion_jobs`, `deletion_items`. Spec §22 ("Encryption, Retention, and Privacy Lifecycle")
-- describes the intended workflow in full: "retention_rules -> assignments -> scheduled
-- deletion_jobs/items. Legal holds resolve to explicit protected objects before deletion." and
-- "Erasure: Delete or anonymize relational data where lawful; destroy per-object/tenant data keys
-- for cryptographic erasure; retain minimum audit proof" — confirming `deletion_items.key_destroyed`/
-- `proof_hash` are exactly the "destruction attestation" the gap sentence names.
--
-- These exact 5 tables were already identified and deliberately deferred out of G-08
-- (0022_g08_privacy_normalization.sql) for this reason — G-12's own gap sentence claims them
-- directly, and G-08's own migration header says so. `retention_rules` (G-08) already exists as the
-- parent `retention_assignments` references. No scope-fork AskUserQuestion was needed for this gap:
-- unlike G-06/G-07/G-08, both source documents already fully and unambiguously bound this gap to
-- exactly 5 tables with no larger surrounding section to phase.
--
-- Reconciliation and naming decisions (documented, not silently assumed):
-- 1. Spec's literal column name `trigger` (on `deletion_jobs`) is a reserved SQL keyword, the same
--    issue already hit and fixed for G-08's `retention_rules` — renamed to `deletion_trigger` here
--    for the same reason (avoiding the reserved word entirely rather than quoting it everywhere in
--    SQL and application code).
-- 2. `retention_assignments`/`legal_hold_items`/`deletion_items` all carry the same
--    `(target_type, target_id)` polymorphic-link shape. Rather than each inventing its own ad hoc
--    registry, all three share one `retention_target_type` CHECK-constraint enum covering the
--    concrete record types this schema's privacy/evidence modules already have real identity tables
--    for and that retention/holds/deletion would plausibly apply to: `data_inventory_record`
--    (G-08's `data_inventory_records`), `evidence_object`/`evidence_version` (G-07), `rights_request`
--    (`privacy_rights_requests`), and `consent_event` (G-08's `consent_events`) — the same
--    static-registry pattern already used for G-06/G-07/G-08/G-09's own polymorphic target-type
--    columns.
-- 3. `retention_assignments`'s "nonoverlap active assignment" critical constraint is enforced the
--    same way G-08's `processing_purposes`/`consent_purposes` enforce their own "nonoverlap active"
--    constraints: a partial unique index on `(target_type, target_id)` where `effective_to is null`
--    — one currently-open-ended assignment per target, not a full temporal-range exclusion
--    constraint (avoiding a new `btree_gist` extension dependency).
-- 4. `deletion_jobs`'s "status transition" critical constraint is a CHECK constraint over the valid
--    status value set, matching how every other "status transition"-labeled table in this schema
--    (e.g. G-08's `dpias`) is actually implemented — not a real state-machine-enforcing trigger.
-- 5. Every new table here is tenant-scoped (`tenant_id not null`, real per-tenant data), matching
--    this schema's dominant convention and the same reasoning already used for G-07's
--    `automated_tests`/G-08's taxonomy tables.

create table if not exists retention_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  retention_rule_id uuid not null references retention_rules(id),
  target_type text not null check (target_type in ('data_inventory_record', 'evidence_object', 'evidence_version', 'rights_request', 'consent_event')),
  target_id uuid not null,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_retention_assignments_active_unique
  on retention_assignments(target_type, target_id)
  where effective_to is null;

create table if not exists legal_holds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  hold_key text not null,
  reason text not null,
  issued_by uuid not null,
  issued_at timestamptz not null default now(),
  released_at timestamptz,
  scope_json jsonb not null default '{}'::jsonb,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, hold_key)
);

create table if not exists legal_hold_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  legal_hold_id uuid not null references legal_holds(id),
  target_type text not null check (target_type in ('data_inventory_record', 'evidence_object', 'evidence_version', 'rights_request', 'consent_event')),
  target_id uuid not null,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (legal_hold_id, target_type, target_id)
);

create table if not exists deletion_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  deletion_trigger text not null,
  requested_by uuid not null,
  status text not null default 'requested' check (status in ('requested', 'running', 'completed', 'failed')),
  started_at timestamptz,
  finished_at timestamptz,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists deletion_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  deletion_job_id uuid not null references deletion_jobs(id),
  target_type text not null check (target_type in ('data_inventory_record', 'evidence_object', 'evidence_version', 'rights_request', 'consent_event')),
  target_id uuid not null,
  disposition text not null check (disposition in ('deleted', 'anonymized', 'blocked_by_hold', 'not_found')),
  key_destroyed boolean not null default false,
  proof_hash text,
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (deletion_job_id, target_type, target_id)
);

create index if not exists idx_retention_assignments_rule on retention_assignments(retention_rule_id);
create index if not exists idx_legal_holds_tenant_released on legal_holds(tenant_id, released_at);
create index if not exists idx_legal_hold_items_target on legal_hold_items(target_type, target_id);
create index if not exists idx_deletion_jobs_tenant_status on deletion_jobs(tenant_id, status);
create index if not exists idx_deletion_items_job_status on deletion_items(deletion_job_id, disposition);

alter table retention_assignments enable row level security;
alter table legal_holds enable row level security;
alter table legal_hold_items enable row level security;
alter table deletion_jobs enable row level security;
alter table deletion_items enable row level security;

create policy retention_assignments_tenant_isolation on retention_assignments
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy retention_assignments_app_context_isolation on retention_assignments
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on retention_assignments to app_runtime;

create policy legal_holds_tenant_isolation on legal_holds
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy legal_holds_app_context_isolation on legal_holds
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on legal_holds to app_runtime;

create policy legal_hold_items_tenant_isolation on legal_hold_items
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy legal_hold_items_app_context_isolation on legal_hold_items
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on legal_hold_items to app_runtime;

create policy deletion_jobs_tenant_isolation on deletion_jobs
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy deletion_jobs_app_context_isolation on deletion_jobs
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on deletion_jobs to app_runtime;

create policy deletion_items_tenant_isolation on deletion_items
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy deletion_items_app_context_isolation on deletion_items
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on deletion_items to app_runtime;

alter table retention_assignments force row level security;
alter table legal_holds force row level security;
alter table legal_hold_items force row level security;
alter table deletion_jobs force row level security;
alter table deletion_items force row level security;
