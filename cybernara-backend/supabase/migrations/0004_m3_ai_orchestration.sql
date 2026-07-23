do $$
begin
  if not exists (select 1 from pg_type where typname = 'ai_generation_status') then
    create type ai_generation_status as enum ('awaiting_review', 'fallback_used', 'approved', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'ai_review_state') then
    create type ai_review_state as enum ('pending_review', 'approved', 'rejected');
  end if;
end $$;

create table if not exists ai_retrieval_indexes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  index_key text not null,
  index_version text not null,
  source_pack_versions jsonb not null default '[]'::jsonb,
  acl_tenant_ids uuid[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  approved_by uuid,
  approved_at timestamptz,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, index_key, index_version)
);

create table if not exists ai_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  prompt_key text not null,
  prompt_version text not null,
  template_sha256 text not null,
  parameters_schema jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  evaluation_id uuid,
  approved_by uuid,
  approved_at timestamptz,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, prompt_key, prompt_version)
);

create table if not exists ai_model_deployments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  provider text not null,
  model_name text not null,
  deployment_version text not null,
  region text not null,
  risk_tier text not null check (risk_tier in ('low', 'medium', 'high', 'critical')),
  no_training boolean not null,
  egress_allow_list text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  kill_switch boolean not null default false,
  evaluation_id uuid,
  approved_by uuid,
  approved_at timestamptz,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider, model_name, deployment_version, region)
);

create table if not exists ai_evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  target_type text not null check (target_type in ('prompt', 'model', 'retrieval_policy')),
  target_id uuid not null,
  score numeric not null,
  passed boolean not null,
  adversarial_passed boolean not null,
  tenant_isolation_passed boolean not null,
  drift_within_threshold boolean not null,
  evaluation_report jsonb not null default '{}'::jsonb,
  approved_by uuid not null,
  approved_at timestamptz not null,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists ai_generation_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  use_case text not null,
  status ai_generation_status not null,
  actor_id uuid not null,
  prompt_version_id uuid not null references ai_prompt_versions(id),
  model_deployment_id uuid not null references ai_model_deployments(id),
  retrieval_index_id uuid not null references ai_retrieval_indexes(id),
  generation_parameters jsonb not null,
  input_fingerprint text not null,
  output_fingerprint text not null,
  failure_reason text,
  provenance jsonb not null default '{}'::jsonb,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists ai_question_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  generation_run_id uuid not null references ai_generation_runs(id),
  question_version text not null,
  question_text text not null,
  response_type text not null check (response_type in ('boolean', 'text', 'maturity', 'multi_select')),
  evidence_expectations jsonb not null default '[]'::jsonb,
  citations jsonb not null default '[]'::jsonb,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  state ai_review_state not null default 'pending_review',
  approved_by uuid,
  approved_at timestamptz,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, generation_run_id, question_version)
);

create table if not exists ai_output_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  generation_run_id uuid not null references ai_generation_runs(id),
  reviewer_id uuid not null,
  decision text not null check (decision in ('approved', 'rejected', 'needs_changes')),
  rationale text not null,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_generation_runs_tenant_status on ai_generation_runs(tenant_id, status);
create index if not exists idx_ai_question_versions_generation on ai_question_versions(tenant_id, generation_run_id);
create index if not exists idx_ai_output_reviews_generation on ai_output_reviews(tenant_id, generation_run_id);

alter table ai_retrieval_indexes enable row level security;
alter table ai_prompt_versions enable row level security;
alter table ai_model_deployments enable row level security;
alter table ai_evaluation_runs enable row level security;
alter table ai_generation_runs enable row level security;
alter table ai_question_versions enable row level security;
alter table ai_output_reviews enable row level security;

create policy ai_retrieval_indexes_tenant_isolation on ai_retrieval_indexes
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy ai_prompt_versions_tenant_isolation on ai_prompt_versions
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy ai_model_deployments_tenant_isolation on ai_model_deployments
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy ai_evaluation_runs_tenant_isolation on ai_evaluation_runs
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy ai_generation_runs_tenant_isolation on ai_generation_runs
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy ai_question_versions_tenant_isolation on ai_question_versions
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy ai_output_reviews_tenant_isolation on ai_output_reviews
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
