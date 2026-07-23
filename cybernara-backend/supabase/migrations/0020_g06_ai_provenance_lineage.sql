-- Gap remediation — G-06 (AI provenance), Phase 1 slice.
--
-- Gap report's exact sentence (both source PDFs re-read fresh before starting this gap): "No
-- explicit retrieved chunks, citations, safety checks, evaluation suites/cases/results or
-- publication approval. Add complete generation, retrieval, safety, evaluation and approval
-- lineage." Traceability AI-01..08. Spec §7 (AI Provenance ERD) / §15 (AI Orchestration and
-- Evaluation) describe ~18 target tables; today's schema (migration 0004) has 7:
-- `ai_retrieval_indexes`, `ai_prompt_versions`, `ai_model_deployments`, `ai_evaluation_runs`,
-- `ai_generation_runs`, `ai_question_versions`, `ai_output_reviews`. Confirmed by direct inspection:
-- `ai_generation_runs.retrieval_index_id` references an index but nothing records what was
-- actually retrieved for that run; citations live only as an embedded `jsonb` array on
-- `ai_question_versions.citations` (not a normalized, queryable table); `ai_evaluation_runs` is a
-- single flat row with ad-hoc boolean flags, not suites/cases/results; there is no safety-check
-- table at all; "publish" (`AiOrchestrationService.publishQuestion`) today only emits an outbox
-- event, with no real persisted approval-to-publish record.
--
-- Scoping decision, confirmed with the user via AskUserQuestion before writing any code (same
-- discipline as G-01/G-09's phasing): Phase 1 builds every table needed to make the 5 nouns the
-- gap sentence names real and testable. Deferred, each for a stated reason:
-- - `model_providers` (provider registry, normalizing the free-text `ai_model_deployments.provider`
--   column) — not named in the gap sentence.
-- - Splitting `prompt_templates` (stable identity) from `ai_prompt_versions` (the same "compressed
--   identity+version" pattern already flagged and fixed for G-09's `policies`/`policy_versions`
--   and G-01's `assessment_scopes`) — not named in the gap sentence either.
--
-- Reconciliation decisions (documented, not silently assumed):
-- 1. `knowledge_chunks`/`retrieval_runs`/`retrieved_chunks` are genuinely new — nothing like them
--    exists. `retrieved_chunks` needs real chunks to reference, so `knowledge_chunks` is built even
--    though the gap sentence only literally says "retrieved chunks" — there is no way to have a
--    retrieved chunk without the chunk existing first.
-- 2. `evaluation_suites`/`evaluation_cases`/`evaluation_results` are new, but reuse the pre-existing
--    `ai_evaluation_runs` as the "run" identity rather than inventing a second, colliding
--    "evaluation_runs" concept — `ai_evaluation_runs` gains an additive nullable `suite_id` FK, and
--    `evaluation_results.evaluation_run_id` references it directly.
-- 3. `ai_publication_events` is new; `target_type` is scoped to what this codebase actually
--    publishes today (`ai_question_version`) plus the two governance artifacts spec's ERD implies
--    can also be "published" (`prompt_version`, `model_deployment`), guarded by a CHECK constraint
--    per spec §18's polymorphic-link rule (a static registry, the functional equivalent of a
--    trigger for a fixed target-type set — same pattern used for G-09's `risk_links`).
-- 4. `safety_checks`/`generation_citations` are new children of `ai_generation_runs`.
--
-- All 9 new tables follow this schema's established tenant-scoped convention (matching every
-- pre-existing table in this module) rather than introducing spec's "tenant_id nullable" platform-
-- default pattern, consistent with how G-06 was scoped.

create table if not exists knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  retrieval_index_id uuid not null references ai_retrieval_indexes(id),
  source_type text not null,
  source_id text not null,
  source_version text not null,
  content_hash text not null,
  acl_json jsonb not null default '{}'::jsonb,
  text_uri text not null,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (retrieval_index_id, source_id, content_hash)
);

create table if not exists retrieval_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  query_hash text not null,
  filters_json jsonb not null default '{}'::jsonb,
  retrieval_index_id uuid not null references ai_retrieval_indexes(id),
  top_k integer not null check (top_k > 0 and top_k <= 50),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists retrieved_chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  retrieval_run_id uuid not null references retrieval_runs(id),
  knowledge_chunk_id uuid not null references knowledge_chunks(id),
  rank integer not null check (rank > 0),
  score numeric not null,
  acl_decision text not null check (acl_decision in ('allowed', 'denied')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (retrieval_run_id, rank),
  unique (retrieval_run_id, knowledge_chunk_id)
);

create table if not exists generation_citations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  generation_run_id uuid not null references ai_generation_runs(id),
  output_path text not null,
  knowledge_chunk_id uuid not null references knowledge_chunks(id),
  locator text,
  entailment_score numeric check (entailment_score >= 0 and entailment_score <= 1),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (generation_run_id, output_path, knowledge_chunk_id)
);

create table if not exists safety_checks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  generation_run_id uuid not null references ai_generation_runs(id),
  check_type text not null
    check (check_type in ('prompt_injection', 'pii_exposure', 'toxicity', 'policy_bypass', 'jailbreak')),
  policy_version text not null,
  result text not null check (result in ('pass', 'fail', 'warn')),
  score numeric,
  redaction_summary jsonb not null default '{}'::jsonb,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (generation_run_id, check_type, policy_version)
);

create table if not exists evaluation_suites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  use_case text not null,
  suite_key text not null,
  suite_version text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  threshold_policy jsonb not null default '{}'::jsonb,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, use_case, suite_key, suite_version)
);

create table if not exists evaluation_cases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  suite_id uuid not null references evaluation_suites(id),
  case_key text not null,
  input_fixture_uri text not null,
  expected_json jsonb not null default '{}'::jsonb,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (suite_id, case_key)
);

create table if not exists evaluation_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  evaluation_run_id uuid not null references ai_evaluation_runs(id),
  case_id uuid not null references evaluation_cases(id),
  metric text not null,
  score numeric not null,
  threshold numeric not null,
  passed boolean not null,
  artifact_uri text,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (evaluation_run_id, case_id, metric)
);

alter table ai_evaluation_runs add column if not exists suite_id uuid references evaluation_suites(id);

-- @append_only
create table if not exists ai_publication_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  target_type text not null check (target_type in ('ai_question_version', 'prompt_version', 'model_deployment')),
  target_id uuid not null,
  generation_run_id uuid references ai_generation_runs(id),
  approved_version_id uuid not null,
  approver_id uuid not null,
  published_at timestamptz not null default now(),
  classification cybernara_classification not null default 'confidential',
  created_by uuid generated always as (approver_id) stored,
  created_at timestamptz generated always as (published_at) stored,
  unique (target_type, target_id, approved_version_id)
);

create index if not exists idx_knowledge_chunks_index on knowledge_chunks(tenant_id, retrieval_index_id);
create index if not exists idx_retrieval_runs_tenant_started on retrieval_runs(tenant_id, started_at);
create index if not exists idx_retrieved_chunks_run on retrieved_chunks(retrieval_run_id);
create index if not exists idx_generation_citations_run on generation_citations(generation_run_id);
create index if not exists idx_safety_checks_run_result on safety_checks(generation_run_id, result);
create index if not exists idx_evaluation_suites_status on evaluation_suites(tenant_id, status);
create index if not exists idx_evaluation_cases_suite on evaluation_cases(suite_id);
create index if not exists idx_evaluation_results_run on evaluation_results(evaluation_run_id, passed);
create index if not exists idx_ai_publication_events_target on ai_publication_events(target_type, target_id);

alter table knowledge_chunks enable row level security;
alter table retrieval_runs enable row level security;
alter table retrieved_chunks enable row level security;
alter table generation_citations enable row level security;
alter table safety_checks enable row level security;
alter table evaluation_suites enable row level security;
alter table evaluation_cases enable row level security;
alter table evaluation_results enable row level security;
alter table ai_publication_events enable row level security;

create policy knowledge_chunks_tenant_isolation on knowledge_chunks
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy knowledge_chunks_app_context_isolation on knowledge_chunks
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on knowledge_chunks to app_runtime;

create policy retrieval_runs_tenant_isolation on retrieval_runs
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy retrieval_runs_app_context_isolation on retrieval_runs
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on retrieval_runs to app_runtime;

create policy retrieved_chunks_tenant_isolation on retrieved_chunks
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy retrieved_chunks_app_context_isolation on retrieved_chunks
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on retrieved_chunks to app_runtime;

create policy generation_citations_tenant_isolation on generation_citations
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy generation_citations_app_context_isolation on generation_citations
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on generation_citations to app_runtime;

create policy safety_checks_tenant_isolation on safety_checks
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy safety_checks_app_context_isolation on safety_checks
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on safety_checks to app_runtime;

create policy evaluation_suites_tenant_isolation on evaluation_suites
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy evaluation_suites_app_context_isolation on evaluation_suites
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on evaluation_suites to app_runtime;

create policy evaluation_cases_tenant_isolation on evaluation_cases
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy evaluation_cases_app_context_isolation on evaluation_cases
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on evaluation_cases to app_runtime;

create policy evaluation_results_tenant_isolation on evaluation_results
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy evaluation_results_app_context_isolation on evaluation_results
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on evaluation_results to app_runtime;

create policy ai_publication_events_tenant_isolation on ai_publication_events
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy ai_publication_events_app_context_isolation on ai_publication_events
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert on ai_publication_events to app_runtime;

-- Append-only enforcement for ai_publication_events, matching this schema's established pattern
-- for every other approval/decision event log (review_decisions, risk_acceptance_reviews,
-- policy_attestations, access_review_decisions).
create or replace function prevent_ai_publication_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'ai_publication_events is append-only';
end;
$$;

drop trigger if exists trg_prevent_ai_publication_event_mutation on ai_publication_events;
create trigger trg_prevent_ai_publication_event_mutation
  before update or delete on ai_publication_events
  for each row execute function prevent_ai_publication_event_mutation();

alter table knowledge_chunks force row level security;
alter table retrieval_runs force row level security;
alter table retrieved_chunks force row level security;
alter table generation_citations force row level security;
alter table safety_checks force row level security;
alter table evaluation_suites force row level security;
alter table evaluation_cases force row level security;
alter table evaluation_results force row level security;
alter table ai_publication_events force row level security;
