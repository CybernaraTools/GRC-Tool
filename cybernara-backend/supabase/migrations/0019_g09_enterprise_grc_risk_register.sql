-- Gap remediation — G-09 (Enterprise GRC depth), Phase 1 slice.
--
-- Gap report's exact sentence (re-read fresh from both source PDFs before starting this gap):
-- "No complete risk, treatment, access-review item, vendor assessment, audit request/test or
-- policy attestation model. Add full enterprise GRC aggregates and relationship tables."
-- Traceability GRC-01..08. Spec §12 (Risk, Findings, and Workflow) and §14 (Enterprise GRC)
-- together describe ~20 target tables; per a scope decision confirmed with the user via
-- AskUserQuestion (documented in docs/schema-remediation-report.md), Phase 1 builds every table
-- needed to make the 6 nouns the gap sentence literally names real and testable, deferring the
-- remaining normalization (policy_exceptions, access_remediations, vendor_services/contracts,
-- trust_access_requests/trust_activity_events, questionnaire_*, and custom_field_definitions/
-- custom_records/custom_values — the latter three are G-13's scope, not G-09's) to a later slice,
-- exactly the same phasing discipline used for G-01.
--
-- 1. Risk register (risk, treatment): `risk_models`, `risks`, `risk_links`, `risk_treatments` are
--    genuinely new — nothing like them exists today. `risks.workspace_id` references the
--    pre-existing `grc_workspaces` (migration 0006). `risk_models.tenant_id` is spec'd as
--    "nullable" (a platform-default scoring methodology shared across tenants) — rather than
--    introduce a first-of-its-kind nullable-tenant RLS carve-out (nothing else in this schema does
--    this, and spec §19 doesn't specify a null-tenant RLS predicate), this reuses G-05's already-
--    established canonical-tenant pattern: platform-default models live under
--    `CANONICAL_CONTENT_TENANT_ID`, tenant-specific custom models live under their own tenant_id.
--    `risk_links` is the generic "risk relates to a domain object" polymorphic table; spec §18's
--    "Polymorphic links ... registry trigger validates allowed target types" is implemented here as
--    a CHECK constraint over a fixed, small, well-known target-type set (a static registry is a
--    trigger's functional equivalent when the set doesn't change at runtime, and is simpler to
--    test).
-- 2. Policy attestation model: `policies` is new (the stable identity spec's ERD wants);
--    pre-existing `policy_versions` (migration 0006) already holds most of the "version" shape but
--    conflates policy identity into itself with no parent — gains an additive nullable `policy_id`
--    FK rather than a destructive rename, per additive-migration discipline (existing rows keep
--    working; new rows can populate the real parent). `policy_control_links` and
--    `policy_attestations` are new child tables. `policy_exceptions` is explicitly deferred (not
--    named in the gap sentence).
-- 3. Access-review item: `access_review_items`/`access_review_decisions` are new children of the
--    pre-existing `access_reviews` (migration 0006). Decisions are append-only (matching this
--    schema's established pattern for every other decision-log table — review_decisions,
--    risk_acceptance_reviews — rather than a mutable "current decision" row); "current" decision
--    for an item is simply its latest by `decided_at`. `access_remediations` is deferred (not
--    named).
-- 4. Vendor assessment: `vendor_assessments`/`vendor_findings` are new children of the pre-existing
--    `vendors` (migration 0006). `vendor_services`/`contracts` are deferred (not named).
-- 5. Audit request/test: `audit_requests`/`audit_tests` are new children of the pre-existing
--    `audit_engagements` (migration 0006); `audit_tests.control_instance_id` references G-01's
--    `control_instances` table, a real cross-gap linkage the spec's ERD calls for.
--
-- Additive extensions to existing tables, all nullable (dual-operate, nothing breaks): `findings`
-- gains nothing here (spec links findings to risks via `risk_links`, not a direct FK — no risk_id
-- column on findings in spec §12's own column list); `remediation_tasks` gains `treatment_id`
-- (nullable FK to the new `risk_treatments`), `priority`, `verified_at` per spec's column list;
-- `risk_acceptances` (G-03, migration 0010) gains `risk_id` (nullable FK to the new `risks`),
-- completing the linkage G-03's own migration comment flagged as blocked on this gap existing.
--
-- Enum/status values not given literal lists in the source spec tables (only column *names* and
-- abbreviated "critical constraints" are given, e.g. "score checks", "strategy/status checks") are
-- an engineering judgment call, documented here rather than silently invented: chosen to match the
-- taxonomy already established elsewhere in this same schema (findings.severity's
-- low/medium/high/critical; policy_versions.status's draft/in_review/approved/published/retired).

create table if not exists risk_models (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  model_key text not null,
  model_version text not null,
  scales_json jsonb not null default '{}'::jsonb,
  formula text not null,
  thresholds jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('draft', 'active', 'retired')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, model_key, model_version)
);

create table if not exists risks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  workspace_id uuid references grc_workspaces(id),
  risk_model_id uuid references risk_models(id),
  risk_key text not null,
  title text not null,
  category text not null,
  inherent_score numeric not null check (inherent_score >= 0 and inherent_score <= 100),
  residual_score numeric not null check (residual_score >= 0 and residual_score <= 100),
  owner_id uuid not null,
  status text not null default 'identified'
    check (status in ('identified', 'assessed', 'treatment_planned', 'monitoring', 'closed')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, risk_key)
);

create table if not exists risk_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  risk_id uuid not null references risks(id),
  target_type text not null
    check (target_type in ('finding', 'control_instance', 'vendor', 'evidence_object', 'assessment', 'requirement_instance')),
  target_id uuid not null,
  relationship text not null
    check (relationship in ('related_to', 'caused_by', 'mitigated_by', 'threatens')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (risk_id, target_type, target_id, relationship)
);

create table if not exists risk_treatments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  risk_id uuid not null references risks(id),
  strategy text not null check (strategy in ('accept', 'mitigate', 'transfer', 'avoid')),
  plan text not null,
  owner_id uuid not null,
  due_at timestamptz not null,
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'completed', 'cancelled')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  policy_key text not null,
  title text not null,
  owner_id uuid not null,
  category text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, policy_key)
);

alter table policy_versions add column if not exists policy_id uuid references policies(id);

create table if not exists policy_control_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  policy_version_id uuid not null references policy_versions(id),
  control_id text not null,
  coverage text not null default 'full' check (coverage in ('full', 'partial', 'not_covered')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (policy_version_id, control_id)
);

-- @append_only
create table if not exists policy_attestations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  policy_version_id uuid not null references policy_versions(id),
  user_id uuid not null,
  decision text not null check (decision in ('attested', 'declined')),
  attested_at timestamptz not null default now(),
  evidence_hash text not null,
  classification cybernara_classification not null default 'confidential',
  created_by uuid generated always as (user_id) stored,
  created_at timestamptz generated always as (attested_at) stored,
  unique (policy_version_id, user_id)
);

create table if not exists access_review_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  access_review_id uuid not null references access_reviews(id),
  principal_ref text not null,
  resource_ref text not null,
  entitlement_ref text not null,
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high', 'critical')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (access_review_id, principal_ref, resource_ref, entitlement_ref)
);

-- @append_only
create table if not exists access_review_decisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  review_item_id uuid not null references access_review_items(id),
  reviewer_id uuid not null,
  decision text not null check (decision in ('approved', 'revoked', 'flagged')),
  rationale text,
  decided_at timestamptz not null default now(),
  classification cybernara_classification not null default 'confidential',
  created_by uuid generated always as (reviewer_id) stored,
  created_at timestamptz generated always as (decided_at) stored
);

create table if not exists vendor_assessments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  vendor_id uuid not null references vendors(id),
  assessment_type text not null check (assessment_type in ('onboarding', 'renewal', 'ad_hoc')),
  period text not null,
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'completed')),
  reviewer_id uuid not null,
  score numeric check (score >= 0 and score <= 100),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (vendor_id, assessment_type, period)
);

create table if not exists vendor_findings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  vendor_assessment_id uuid not null references vendor_assessments(id),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  title text not null,
  status text not null default 'open' check (status in ('open', 'remediated', 'accepted')),
  due_at timestamptz,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists audit_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  audit_engagement_id uuid not null references audit_engagements(id),
  control_id text,
  requested_from text not null,
  due_at timestamptz not null,
  status text not null default 'requested'
    check (status in ('requested', 'submitted', 'accepted', 'rejected')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (audit_engagement_id, control_id, requested_from)
);

create table if not exists audit_tests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  audit_engagement_id uuid not null references audit_engagements(id),
  control_instance_id uuid references control_instances(id),
  procedure text not null,
  sample_ref text,
  conclusion text not null default 'not_tested'
    check (conclusion in ('effective', 'ineffective', 'not_tested')),
  reviewer_id uuid,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

alter table remediation_tasks add column if not exists treatment_id uuid references risk_treatments(id);
alter table remediation_tasks add column if not exists priority text
  check (priority in ('low', 'medium', 'high', 'critical'));
alter table remediation_tasks add column if not exists verified_at timestamptz;

alter table risk_acceptances add column if not exists risk_id uuid references risks(id);

create index if not exists idx_risk_models_status on risk_models(tenant_id, status);
create index if not exists idx_risks_status on risks(tenant_id, status, owner_id);
create index if not exists idx_risk_links_target on risk_links(target_type, target_id);
create index if not exists idx_risk_treatments_status on risk_treatments(risk_id, status);
create index if not exists idx_policies_status on policies(tenant_id, status);
create index if not exists idx_policy_control_links_control on policy_control_links(control_id);
create index if not exists idx_policy_attestations_user on policy_attestations(tenant_id, user_id);
create index if not exists idx_access_review_items_review on access_review_items(access_review_id);
create index if not exists idx_access_review_decisions_item on access_review_decisions(review_item_id, decision);
create index if not exists idx_vendor_assessments_status on vendor_assessments(tenant_id, status);
create index if not exists idx_vendor_findings_assessment on vendor_findings(vendor_assessment_id);
create index if not exists idx_audit_requests_engagement on audit_requests(audit_engagement_id, status);
create index if not exists idx_audit_tests_engagement on audit_tests(audit_engagement_id);

alter table risk_models enable row level security;
alter table risks enable row level security;
alter table risk_links enable row level security;
alter table risk_treatments enable row level security;
alter table policies enable row level security;
alter table policy_control_links enable row level security;
alter table policy_attestations enable row level security;
alter table access_review_items enable row level security;
alter table access_review_decisions enable row level security;
alter table vendor_assessments enable row level security;
alter table vendor_findings enable row level security;
alter table audit_requests enable row level security;
alter table audit_tests enable row level security;

create policy risk_models_tenant_isolation on risk_models
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy risk_models_app_context_isolation on risk_models
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on risk_models to app_runtime;

create policy risks_tenant_isolation on risks
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy risks_app_context_isolation on risks
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on risks to app_runtime;

create policy risk_links_tenant_isolation on risk_links
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy risk_links_app_context_isolation on risk_links
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on risk_links to app_runtime;

create policy risk_treatments_tenant_isolation on risk_treatments
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy risk_treatments_app_context_isolation on risk_treatments
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on risk_treatments to app_runtime;

create policy policies_tenant_isolation on policies
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy policies_app_context_isolation on policies
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on policies to app_runtime;

create policy policy_control_links_tenant_isolation on policy_control_links
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy policy_control_links_app_context_isolation on policy_control_links
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on policy_control_links to app_runtime;

create policy policy_attestations_tenant_isolation on policy_attestations
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy policy_attestations_app_context_isolation on policy_attestations
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert on policy_attestations to app_runtime;

create policy access_review_items_tenant_isolation on access_review_items
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy access_review_items_app_context_isolation on access_review_items
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on access_review_items to app_runtime;

create policy access_review_decisions_tenant_isolation on access_review_decisions
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy access_review_decisions_app_context_isolation on access_review_decisions
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert on access_review_decisions to app_runtime;

create policy vendor_assessments_tenant_isolation on vendor_assessments
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy vendor_assessments_app_context_isolation on vendor_assessments
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on vendor_assessments to app_runtime;

create policy vendor_findings_tenant_isolation on vendor_findings
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy vendor_findings_app_context_isolation on vendor_findings
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on vendor_findings to app_runtime;

create policy audit_requests_tenant_isolation on audit_requests
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy audit_requests_app_context_isolation on audit_requests
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on audit_requests to app_runtime;

create policy audit_tests_tenant_isolation on audit_tests
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy audit_tests_app_context_isolation on audit_tests
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on audit_tests to app_runtime;

-- Append-only enforcement for policy_attestations and access_review_decisions, matching this
-- schema's established convention for every other decision/attestation log (review_decisions,
-- risk_acceptance_reviews).
create or replace function prevent_policy_attestation_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'policy_attestations is append-only';
end;
$$;

drop trigger if exists trg_prevent_policy_attestation_mutation on policy_attestations;
create trigger trg_prevent_policy_attestation_mutation
  before update or delete on policy_attestations
  for each row execute function prevent_policy_attestation_mutation();

create or replace function prevent_access_review_decision_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'access_review_decisions is append-only';
end;
$$;

drop trigger if exists trg_prevent_access_review_decision_mutation on access_review_decisions;
create trigger trg_prevent_access_review_decision_mutation
  before update or delete on access_review_decisions
  for each row execute function prevent_access_review_decision_mutation();

alter table risk_models force row level security;
alter table risks force row level security;
alter table risk_links force row level security;
alter table risk_treatments force row level security;
alter table policies force row level security;
alter table policy_control_links force row level security;
alter table policy_attestations force row level security;
alter table access_review_items force row level security;
alter table access_review_decisions force row level security;
alter table vendor_assessments force row level security;
alter table vendor_findings force row level security;
alter table audit_requests force row level security;
alter table audit_tests force row level security;
