-- Questions Page / Compliance Dashboard feature — tenant-owned custom questions.
--
-- Purely additive: no existing table is altered. The existing question
-- catalog (harmonized_controls, control_mappings, question_sets,
-- question_versions) is canonical/shared content, hard-scoped to
-- CANONICAL_CONTENT_TENANT_ID by every read path that resolves a question
-- into a PinnedControlRef (QuestionRepositoryService.queryAssessmentQuestionOptions
-- filters every join to tenant_id = CANONICAL_CONTENT_TENANT_ID) — a tenant
-- cannot author new rows there and have them resolve through that path, and
-- this migration does not attempt to make it do so.
--
-- Instead: a tenant's own custom questions live here, in
-- `tenant_questions` (the source of truth for the question's text/type and
-- for its per-tenant identity) with a small many-to-many tag table
-- `tenant_question_frameworks` (mirrors the "QuestionFramework" join table
-- shape from the feature request, deliberately simple since custom
-- questions have no real control-mapping backing to derive frameworks
-- from). When a tenant creates a custom question, the application layer
-- (src/modules/tenant-questions) additionally creates ONE tenant-scoped
-- harmonized_controls + question_sets + question_versions row purely to
-- satisfy assessment_items.question_version_id's existing NOT NULL FK
-- constraint — that backing row is never queried through the canonical-only
-- resolution path; assessments for custom questions are created via a new,
-- additive AssessmentService.createFromPinnedControls() method that
-- constructs the PinnedControlRef directly and skips resolution entirely.
-- `backing_question_version_id` records that link so "has an assessment
-- been created for this question" can use the exact same
-- `assessment_items.question_version_id` existence check for both canonical
-- and custom questions.

create table if not exists tenant_questions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  question_text text not null check (length(trim(question_text)) > 0),
  response_type text not null default 'text' check (response_type in ('boolean', 'text', 'maturity', 'multi_select')),
  description text,
  backing_question_version_id uuid references question_versions(id),
  status text not null default 'active' check (status in ('active', 'archived')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists tenant_question_frameworks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  tenant_question_id uuid not null references tenant_questions(id),
  framework_key text not null check (length(trim(framework_key)) > 0),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, tenant_question_id, framework_key)
);

create index if not exists idx_tenant_questions_tenant_status on tenant_questions(tenant_id, status);
create index if not exists idx_tenant_question_frameworks_question on tenant_question_frameworks(tenant_id, tenant_question_id);
create index if not exists idx_tenant_question_frameworks_framework on tenant_question_frameworks(tenant_id, framework_key);

alter table tenant_questions enable row level security;
alter table tenant_question_frameworks enable row level security;

create policy tenant_questions_tenant_isolation on tenant_questions
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy tenant_questions_app_context_isolation on tenant_questions
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on tenant_questions to app_runtime;

create policy tenant_question_frameworks_tenant_isolation on tenant_question_frameworks
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy tenant_question_frameworks_app_context_isolation on tenant_question_frameworks
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on tenant_question_frameworks to app_runtime;

alter table tenant_questions force row level security;
alter table tenant_question_frameworks force row level security;
