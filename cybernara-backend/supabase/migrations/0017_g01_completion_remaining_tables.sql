-- Gap remediation — G-01 completion: the 4 tables explicitly deferred in the Phase 1 slice
-- (0013_g01_assessment_execution_normalization.sql). Brings the spec §10 target from 9/15 new
-- tables to all 15 (the other 2 — `assessments`, `assessment_items` — predate this campaign and
-- were extended additively rather than rebuilt).
--
-- 1. requirement_instances — parallel requirement-level tracking alongside control_instances.
--    `requirement_id` references `framework_requirements(id)`, which lives under the canonical
--    shared-catalog tenant (G-05's `CANONICAL_CONTENT_TENANT_ID`), not the assessment's own
--    tenant — this is a deliberate cross-tenant reference, not an oversight. Spec §18's "Tenant
--    FK safety" rule (composite tenant-aware FKs where cross-tenant mismatch is *unintended*)
--    does not apply here: the mismatch is the whole point — standard framework requirements are
--    global content referenced by many tenants' assessments, exactly like G-05's target ownership
--    model describes. No FK correctness issue results from this: Postgres FKs do not enforce
--    tenant equality themselves, and RLS (scoped to each table independently) governs visibility
--    correctly regardless of which tenant a referenced row belongs to.
--
-- 2. question_sets / question_versions — the governed catalog entities spec's Assessment
--    Execution ERD and AI Provenance ERD share as one "Question Version" node.
--    `ai_question_versions` (migration 0004_m3_ai_orchestration.sql, predates this campaign)
--    already exists but is scoped by `generation_run_id` — it is the raw AI *generation
--    candidate*, not the governed catalog entry a control cites. `question_versions` here is the
--    real catalog entry (scoped by `question_set_id`, itself scoped by `control_id`); its new
--    nullable `source_ai_question_version_id` links to the specific `ai_question_versions` row
--    it was promoted from, for AI-sourced questions. Curated (non-AI) questions leave that column
--    null. This is the reconciliation flagged as needing its own design pass when G-01 Phase 1
--    deferred these tables — done here rather than left unresolved.
--
-- 3. assessment_signoffs — section/final sign-off. No "section" concept exists in the current
--    domain (assessments only close as a whole), so `scope_id` is populated with the
--    assessment's own id for `scope_type = 'final'` for now; a real section concept can use a
--    different `scope_id` later without a schema change.
--
-- assessment_items gains one more additive nullable column, `question_version_id`, linking to
-- the new `question_versions` table — completing the "assessment_items redefined" column set
-- Phase 1 left partially done (`control_instance_id`/`sequence_no`/`required` were added then;
-- this is the fourth and final new column spec's redefinition calls for). Still additive, still
-- dual-operate: the legacy `question_version` text column is untouched.

create table if not exists requirement_instances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  assessment_id uuid not null references assessments(id),
  requirement_id uuid not null references framework_requirements(id),
  applicability_status text not null default 'pending'
    check (applicability_status in ('pending', 'applicable', 'not_applicable')),
  coverage_status text not null default 'uncovered'
    check (coverage_status in ('uncovered', 'partially_covered', 'covered')),
  owner_id uuid not null,
  status assessment_status not null default 'not_started',
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, assessment_id, requirement_id)
);

create table if not exists question_sets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  control_id text not null,
  question_set_key text not null,
  status text not null default 'active' check (status in ('active', 'deprecated')),
  source_type text not null default 'curated' check (source_type in ('curated', 'ai_generated')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, control_id, question_set_key)
);

create table if not exists question_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  question_set_id uuid not null references question_sets(id),
  question_version integer not null,
  payload_json jsonb not null,
  source_ai_question_version_id uuid references ai_question_versions(id),
  approved_by uuid,
  approved_at timestamptz,
  checksum text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'deprecated')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, question_set_id, question_version)
);

create table if not exists assessment_signoffs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  assessment_id uuid not null references assessments(id),
  scope_type text not null check (scope_type in ('section', 'final')),
  scope_id uuid not null,
  signer_id uuid not null,
  decision text not null check (decision in ('approved', 'rejected')),
  signed_at timestamptz not null default now(),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, assessment_id, scope_type, scope_id)
);

alter table assessment_items add column if not exists question_version_id uuid references question_versions(id);

-- Immutability once approved (spec §10: "Immutable approved question payload"). Draft/deprecated
-- rows remain freely editable; the moment approved_at is set, no further changes are allowed —
-- supersession requires a new version row, matching every other "approved content" table in this
-- schema (framework_content_packs, policy_versions, etc.).
create or replace function prevent_approved_question_version_mutation()
returns trigger
language plpgsql
as $$
begin
  if old.approved_at is not null then
    raise exception 'question_versions: an approved question version is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_approved_question_version_mutation on question_versions;
create trigger trg_prevent_approved_question_version_mutation
  before update on question_versions
  for each row execute function prevent_approved_question_version_mutation();

create index if not exists idx_requirement_instances_assessment on requirement_instances(tenant_id, assessment_id, status);
create index if not exists idx_requirement_instances_requirement on requirement_instances(requirement_id);
create index if not exists idx_question_sets_control on question_sets(tenant_id, control_id, status);
create index if not exists idx_question_versions_set on question_versions(tenant_id, question_set_id, status);
create index if not exists idx_assessment_signoffs_assessment on assessment_signoffs(tenant_id, assessment_id, decision);
create index if not exists idx_assessment_items_question_version on assessment_items(tenant_id, question_version_id);

alter table requirement_instances enable row level security;
alter table question_sets enable row level security;
alter table question_versions enable row level security;
alter table assessment_signoffs enable row level security;

create policy requirement_instances_tenant_isolation on requirement_instances
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy requirement_instances_app_context_isolation on requirement_instances
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on requirement_instances to app_runtime;

create policy question_sets_tenant_isolation on question_sets
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy question_sets_app_context_isolation on question_sets
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on question_sets to app_runtime;

create policy question_versions_tenant_isolation on question_versions
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy question_versions_app_context_isolation on question_versions
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on question_versions to app_runtime;

create policy assessment_signoffs_tenant_isolation on assessment_signoffs
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy assessment_signoffs_app_context_isolation on assessment_signoffs
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on assessment_signoffs to app_runtime;

alter table requirement_instances force row level security;
alter table question_sets force row level security;
alter table question_versions force row level security;
alter table assessment_signoffs force row level security;
