-- Gap remediation — G-01 assessment execution normalization (Phase 1 slice).
--
-- Root cause, confirmed by direct code read of the pre-existing
-- domain/repository (src/modules/assessment/domain/assessment.ts,
-- infrastructure/postgres-assessment.repository.ts) against spec §10: a
-- single `assessment_items` row today conflates control identity
-- (framework_key/control_id/harmonized_control_id), a single inline
-- applicability decision (jsonb, overwritten in place, no history), a single
-- overwritable answer (answer_text, no revision history), and no persisted
-- reviewer decision at all (review outcomes only ever changed `status`,
-- never recorded who decided what or why). This is exactly what the gap
-- report's G-01 finding names: "No control_instances, answer revisions,
-- applicability decisions, reviewer decisions, tests, scopes or snapshots."
--
-- Scoping decision (documented per the standing instruction to make the
-- smallest correct decision when the full 15-table spec §10 target can't be
-- built in one pass): this migration builds the 9 new tables covering every
-- noun the gap report's G-01 sentence names, plus `assessment_frameworks`
-- (connective tissue: pinning framework/mapping version at the assessment
-- level instead of duplicating it per item, per spec's ERD). Explicitly
-- deferred to a later pass, each for a distinct, named reason:
--   - requirement_instances: parallel requirement-level tracking alongside
--     control-level tracking. Not named in the gap report's G-01 sentence;
--     the current domain has no concept of "requirement" distinct from
--     "control" at all, so this is a real, separate expansion, not an
--     afterthought.
--   - question_sets / question_versions as governed catalog entities: spec's
--     "Question Version" node is shared between the Assessment Execution ERD
--     and the AI Provenance ERD. `ai_question_versions` (migration
--     0004_m3_ai_orchestration.sql) already exists but is scoped by
--     generation_run_id, not by control_id/question_set_key the way spec
--     wants — reconciling those two shapes is its own architectural decision,
--     not a hasty bolt-on alongside eight other new tables. assessment_items
--     keeps referencing question content by version string for now
--     (unchanged from today), not a new FK.
--   - assessment_signoffs: a section/final approval-workflow layer on top of
--     the execution graph, conceptually closer to G-09-adjacent
--     approval-workflow infrastructure than to the core execution tables the
--     gap report names.
--
-- Migration discipline (spec §24: Design->Expand->Backfill->Dual
-- operate->Constrain->Cut over->Contract): this migration is pure "Expand".
-- Every new table is additive. `assessment_items` gains new nullable
-- columns (control_instance_id, sequence, required) alongside every existing
-- column, completely unchanged — the running application's read/write
-- behavior does not change as a result of this migration alone. Application
-- code changes (built in this same remediation pass, tracked separately in
-- docs/schema-remediation-report.md) dual-write to both the legacy flat
-- columns and the new normalized tables. Making the new columns NOT NULL,
-- dropping the legacy columns, and cutting reads over exclusively to the new
-- shape are later "Constrain"/"Cut over"/"Contract" stage work, not done
-- here.

-- 1. assessment_scopes — approved structured scope (spec §10). No standalone
--    `workspaces` table exists yet in this schema (workspace_id appears only
--    as a bare uuid column on a couple of unrelated tables) — building
--    identity/tenant workspace hierarchy is out of scope for G-01, so
--    workspace_id is nullable here rather than inventing that subsystem.
create table if not exists assessment_scopes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  workspace_id uuid,
  name text not null check (length(trim(name)) > 0),
  period_start date not null,
  period_end date not null,
  scope_json jsonb not null default '{}'::jsonb,
  approved_by uuid not null,
  approved_at timestamptz not null default now(),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  check (period_end >= period_start)
);

-- assessments gains an optional link to its approved scope. Nullable and
-- additive: existing assessments (created before this migration) have no
-- scope row yet, and the application is not required to set it until the
-- service layer is updated to create one per assessment.
alter table assessments add column if not exists scope_id uuid references assessment_scopes(id);

-- 2. assessment_frameworks — pinned framework/mapping selection per
--    assessment (spec §10). The current catalog schema does not yet have
--    normalized frameworks/framework_versions tables (that restructuring is
--    G-05's still-open target-state work), so this pins by
--    framework_key + framework_version text pair — the same identifiers
--    framework_content_packs already uses — rather than a FK to a table that
--    doesn't exist yet.
create table if not exists assessment_frameworks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  assessment_id uuid not null references assessments(id),
  framework_key text not null,
  framework_version text not null,
  mapping_version text not null,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, assessment_id, framework_key)
);

-- 3. assessment_snapshots — immutable reproducibility root (spec §10).
-- @append_only
create table if not exists assessment_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  assessment_id uuid not null references assessments(id),
  snapshot_type text not null check (length(trim(snapshot_type)) > 0),
  sequence integer not null check (sequence > 0),
  content_hash text not null,
  snapshot_payload jsonb not null default '{}'::jsonb,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, assessment_id, sequence)
);

-- 4. control_instances — the real per-control execution unit (spec §10),
--    replacing what today is smashed into assessment_items rows.
create table if not exists control_instances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  assessment_id uuid not null references assessments(id),
  control_id text not null,
  framework_key text not null,
  framework_version text not null,
  mapping_version text not null,
  owner_id uuid not null,
  applicability_status text not null default 'pending'
    check (applicability_status in ('pending', 'applicable', 'not_applicable')),
  status assessment_status not null default 'not_started',
  score numeric,
  maturity text,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, assessment_id, control_id)
);

-- 5. applicability_decisions — append-only applicability history per control
--    instance (spec §10), replacing the single inline jsonb field.
--    requirement_id is intentionally omitted (not just nulled) — it would
--    reference the deferred requirement_instances table; add it when that
--    table is built rather than carry a permanently-empty nullable column.
-- @append_only
create table if not exists applicability_decisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  control_instance_id uuid not null references control_instances(id),
  decision text not null check (decision in ('applicable', 'not_applicable')),
  rationale text not null check (length(trim(rationale)) > 0),
  decided_by uuid not null,
  approved_by uuid,
  decided_at timestamptz not null default now(),
  created_by uuid generated always as (decided_by) stored,
  created_at timestamptz generated always as (decided_at) stored,
  check (approved_by is null or approved_by != decided_by)
);

-- 6. assessment_items, REDEFINED (spec §10: "instantiated question"). Every
--    existing column stays exactly as-is (dual-operate discipline); these
--    three are new and nullable until the service layer populates them.
alter table assessment_items add column if not exists control_instance_id uuid references control_instances(id);
alter table assessment_items add column if not exists sequence_no integer;
alter table assessment_items add column if not exists required boolean not null default true;

-- 7. answer_revisions — append-only response revision (spec §10), replacing
--    the single overwritable answer_text/applicability/evidence_ids on
--    assessment_items.
-- @append_only
create table if not exists answer_revisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  assessment_item_id uuid not null references assessment_items(id),
  revision integer not null check (revision > 0),
  response_json jsonb not null,
  submitted_by uuid not null,
  submitted_at timestamptz not null default now(),
  supersedes_id uuid references answer_revisions(id),
  created_by uuid generated always as (submitted_by) stored,
  created_at timestamptz generated always as (submitted_at) stored,
  unique (tenant_id, assessment_item_id, revision)
);

-- 8. review_decisions — reviewer conclusion (spec §10), replacing the
--    transient, non-persisted review outcome. reviewer != submitter is
--    enforced by a trigger (needs a cross-table lookup against the
--    referenced answer_revision, not expressible as a plain check).
-- @append_only
create table if not exists review_decisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  assessment_item_id uuid not null references assessment_items(id),
  answer_revision_id uuid not null references answer_revisions(id),
  reviewer_id uuid not null,
  decision text not null check (decision in ('approved', 'needs_changes')),
  rationale text,
  decided_at timestamptz not null default now(),
  created_by uuid generated always as (reviewer_id) stored,
  created_at timestamptz generated always as (decided_at) stored
);

create or replace function prevent_review_decision_self_review()
returns trigger
language plpgsql
as $$
declare
  submitter uuid;
begin
  select submitted_by into submitter from answer_revisions where id = new.answer_revision_id;
  if submitter = new.reviewer_id then
    raise exception 'review_decisions: reviewer must not be the same principal as the answer submitter';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_review_decision_self_review on review_decisions;
create trigger trg_prevent_review_decision_self_review
  before insert on review_decisions
  for each row execute function prevent_review_decision_self_review();

-- 9. test_procedures — versioned control test method (spec §10). Kept
--    tenant_id NOT NULL, diverging from the spec's literal "tenant_id
--    nullable" wording, to match this codebase's own established and
--    consistent convention (every other table in this schema — including
--    ones spec also describes as "tenant_id nullable", e.g. prompt_templates,
--    retrieval_indexes — is tenant_id NOT NULL here; RLS policies throughout
--    are built around tenant_id equality and have no NULL-tenant carve-out
--    anywhere). A "global standard test procedure" catalog is a G-05-adjacent
--    concern for later, not introduced here.
create table if not exists test_procedures (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  control_id text not null,
  procedure_key text not null,
  method text not null,
  expected_result text not null,
  status text not null default 'active' check (status in ('active', 'deprecated')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, control_id, procedure_key, version)
);

-- 10. control_test_results — manual/automated test result (spec §10).
create table if not exists control_test_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  control_instance_id uuid not null references control_instances(id),
  test_procedure_id uuid not null references test_procedures(id),
  run_id uuid not null default gen_random_uuid(),
  population text,
  sample_json jsonb not null default '{}'::jsonb,
  result text not null check (result in ('pass', 'fail', 'not_tested')),
  tested_by uuid not null,
  tested_at timestamptz not null default now(),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

-- Indexes, matching spec §20's assessment-scale guidance and this repo's
-- existing (tenant_id, ...) leading-column convention.
create index if not exists idx_assessment_scopes_tenant_workspace on assessment_scopes(tenant_id, workspace_id);
create index if not exists idx_assessment_frameworks_assessment on assessment_frameworks(tenant_id, assessment_id);
create index if not exists idx_assessment_snapshots_assessment on assessment_snapshots(tenant_id, assessment_id, sequence);
create index if not exists idx_control_instances_assessment on control_instances(tenant_id, assessment_id, status, owner_id);
create index if not exists idx_applicability_decisions_control_instance on applicability_decisions(tenant_id, control_instance_id);
create index if not exists idx_assessment_items_control_instance on assessment_items(tenant_id, control_instance_id);
create index if not exists idx_answer_revisions_item on answer_revisions(tenant_id, assessment_item_id, revision);
create index if not exists idx_review_decisions_item on review_decisions(tenant_id, assessment_item_id, decision);
create index if not exists idx_test_procedures_control on test_procedures(tenant_id, control_id, status);
create index if not exists idx_control_test_results_instance on control_test_results(tenant_id, control_instance_id, result);

-- RLS: enable on every new table, following the exact same two-policy
-- pattern (legacy auth.jwt() + app-context) as every table introduced since
-- migration 0008, and grant app_runtime the same privileges FORCE RLS
-- expects it to actually use (see 0012_g10_force_rls.sql). Written as
-- literal per-table statements (not a dynamic execute-format loop like
-- 0008's, which covers 55+ tables) — with only 9 tables here, literal
-- statements are simpler, more readable, and directly recognized by
-- scripts/check-migration-conventions.mjs's static regex checks.
alter table assessment_scopes enable row level security;
alter table assessment_frameworks enable row level security;
alter table assessment_snapshots enable row level security;
alter table control_instances enable row level security;
alter table applicability_decisions enable row level security;
alter table answer_revisions enable row level security;
alter table review_decisions enable row level security;
alter table test_procedures enable row level security;
alter table control_test_results enable row level security;

create policy assessment_scopes_tenant_isolation on assessment_scopes
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy assessment_scopes_app_context_isolation on assessment_scopes
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on assessment_scopes to app_runtime;

create policy assessment_frameworks_tenant_isolation on assessment_frameworks
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy assessment_frameworks_app_context_isolation on assessment_frameworks
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on assessment_frameworks to app_runtime;

create policy assessment_snapshots_tenant_isolation on assessment_snapshots
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy assessment_snapshots_app_context_isolation on assessment_snapshots
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert on assessment_snapshots to app_runtime;

create policy control_instances_tenant_isolation on control_instances
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy control_instances_app_context_isolation on control_instances
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on control_instances to app_runtime;

create policy applicability_decisions_tenant_isolation on applicability_decisions
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy applicability_decisions_app_context_isolation on applicability_decisions
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert on applicability_decisions to app_runtime;

create policy answer_revisions_tenant_isolation on answer_revisions
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy answer_revisions_app_context_isolation on answer_revisions
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert on answer_revisions to app_runtime;

create policy review_decisions_tenant_isolation on review_decisions
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy review_decisions_app_context_isolation on review_decisions
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert on review_decisions to app_runtime;

create policy test_procedures_tenant_isolation on test_procedures
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy test_procedures_app_context_isolation on test_procedures
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on test_procedures to app_runtime;

create policy control_test_results_tenant_isolation on control_test_results
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy control_test_results_app_context_isolation on control_test_results
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on control_test_results to app_runtime;

-- Append-only enforcement, matching the existing risk_acceptance_reviews
-- convention (migration 0010).
create or replace function prevent_assessment_history_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

drop trigger if exists trg_prevent_assessment_snapshots_mutation on assessment_snapshots;
create trigger trg_prevent_assessment_snapshots_mutation
  before update or delete on assessment_snapshots
  for each row execute function prevent_assessment_history_mutation();

drop trigger if exists trg_prevent_applicability_decisions_mutation on applicability_decisions;
create trigger trg_prevent_applicability_decisions_mutation
  before update or delete on applicability_decisions
  for each row execute function prevent_assessment_history_mutation();

drop trigger if exists trg_prevent_answer_revisions_mutation on answer_revisions;
create trigger trg_prevent_answer_revisions_mutation
  before update or delete on answer_revisions
  for each row execute function prevent_assessment_history_mutation();

drop trigger if exists trg_prevent_review_decisions_mutation on review_decisions;
create trigger trg_prevent_review_decisions_mutation
  before update or delete on review_decisions
  for each row execute function prevent_assessment_history_mutation();

-- FORCE ROW LEVEL SECURITY applied immediately at creation time, not
-- deferred as a later "Constrain" stage migration like 0012 was for
-- pre-existing tables: these tables are brand new with zero rows and zero
-- existing owner-connection traffic to break, and G-10's connection cutover
-- (app_runtime as the live application role) is already fully complete, so
-- there is no ordering hazard in doing this now.
alter table assessment_scopes force row level security;
alter table assessment_frameworks force row level security;
alter table assessment_snapshots force row level security;
alter table control_instances force row level security;
alter table applicability_decisions force row level security;
alter table answer_revisions force row level security;
alter table review_decisions force row level security;
alter table test_procedures force row level security;
alter table control_test_results force row level security;
