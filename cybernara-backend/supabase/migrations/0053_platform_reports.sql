-- Replaces the AI-narrative-based "Closed Assessment AI Audit Reports"
-- feature (0051_g15_ai_audit_reports.sql) with a purely deterministic,
-- no-AI "Platform Compliance Summary Report": one report per generation,
-- assembled directly from live platform data across every assessment, risk,
-- finding, remediation task, risk acceptance, evidence object, and task —
-- no OpenAI call anywhere in this path, no narrative, no groundedness score.
--
-- ai_audit_reports is dropped: nothing in the application reads or writes
-- it anymore, and its rows (all from feature development/regression
-- testing, no real customer data) carry no value to keep around.
drop table if exists ai_audit_reports;

create table if not exists platform_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  report_type text not null default 'platform_summary' check (report_type in ('platform_summary')),
  generated_by uuid not null,
  generated_at timestamptz not null default now(),
  report_hash text not null,
  artifact_bytes bytea,
  artifact_mime_type text not null default 'application/pdf',
  structured_report_json jsonb not null,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_platform_reports_tenant on platform_reports(tenant_id, generated_at desc);

alter table platform_reports enable row level security;

create policy platform_reports_tenant_isolation on platform_reports
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy platform_reports_app_context_isolation on platform_reports
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on platform_reports to app_runtime;

alter table platform_reports force row level security;
