-- Reverts the platform-wide report (0053_platform_reports.sql) back to a
-- per-assessment audit report: one report per closed assessment, describing
-- that assessment specifically (scope, period, closed date/by, frameworks,
-- compliance, evidence, findings, remediation, risk acceptances, reviewer
-- signoffs). Still fully deterministic - no AI, no narrative, no
-- groundedness score; that principle from 0053 is unchanged, only the
-- report's scope goes back to one assessment instead of the whole tenant.
--
-- platform_reports had zero real customer data (dev/test only, confirmed
-- when it was created), so it is dropped rather than migrated.
drop table if exists platform_reports;

create table if not exists audit_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  assessment_id uuid not null references assessments(id),
  report_type text not null default 'closure_audit' check (report_type in ('closure_audit')),
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

create index if not exists idx_audit_reports_assessment on audit_reports(tenant_id, assessment_id, generated_at desc);

alter table audit_reports enable row level security;

create policy audit_reports_tenant_isolation on audit_reports
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy audit_reports_app_context_isolation on audit_reports
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on audit_reports to app_runtime;

alter table audit_reports force row level security;
