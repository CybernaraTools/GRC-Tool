-- Closed Assessment AI Audit Reports feature.
--
-- Purely additive: no existing table is altered. `assessment_snapshots`
-- (0013_g01_assessment_execution_normalization.sql) already provides the
-- immutable-reproducibility-root mechanism the feature spec asks for;
-- closure/legacy-reconstruction snapshots reuse it via new snapshot_type
-- values written by src/modules/closure-snapshot (application code only —
-- that table's schema, RLS, and append-only trigger are untouched here).
--
-- `ai_audit_reports` is the one new table: each report generation (including
-- every regeneration) inserts its own row — historical reports are never
-- overwritten. This is intentionally a normal mutable table (standard
-- tenant_id/version/created_by/created_at/updated_by/updated_at/
-- classification columns, not @append_only) rather than a bespoke
-- semi-immutable trigger, because the one field that legitimately changes
-- after insert is `lifecycle_status` (draft -> published). Immutability of
-- everything else is enforced at the application layer: the repository this
-- feature ships exposes exactly two write paths — `insert` (full row,
-- lifecycle_status='draft') and `publish` (an UPDATE that touches only
-- lifecycle_status/updated_by/updated_at/version, gated by the CHECK
-- constraint below) — there is no generic "update report" method for any
-- other column to go through, in application code or otherwise exposed by
-- this migration.
create table if not exists ai_audit_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  assessment_id uuid not null references assessments(id),
  snapshot_id uuid not null references assessment_snapshots(id),
  report_type text not null default 'closure_audit' check (report_type in ('closure_audit')),
  lifecycle_status text not null default 'draft' check (lifecycle_status in ('draft', 'published')),
  report_schema_version text not null,
  compliance_methodology_version text not null,
  ai_prompt_version text not null,
  ai_model_metadata jsonb not null default '{}'::jsonb,
  generated_by uuid not null,
  generated_at timestamptz not null default now(),
  report_hash text not null,
  snapshot_hash text not null,
  artifact_bytes bytea,
  artifact_mime_type text not null default 'application/pdf',
  structured_report_json jsonb not null,
  provenance jsonb not null default '{}'::jsonb,
  citation_manifest jsonb not null default '{}'::jsonb,
  groundedness_score numeric not null check (groundedness_score >= 0 and groundedness_score <= 100),
  groundedness_validation_log jsonb not null default '[]'::jsonb,
  narrative_available boolean not null default true,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  -- The Rule #2 gate, restated as a DB constraint independent of application
  -- logic: a report cannot reach lifecycle_status='published' unless its own
  -- groundedness_score is exactly 100, full stop.
  check (lifecycle_status <> 'published' or groundedness_score = 100)
);

create index if not exists idx_ai_audit_reports_assessment on ai_audit_reports(tenant_id, assessment_id, generated_at desc);
create index if not exists idx_ai_audit_reports_lifecycle on ai_audit_reports(tenant_id, lifecycle_status);

alter table ai_audit_reports enable row level security;

create policy ai_audit_reports_tenant_isolation on ai_audit_reports
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy ai_audit_reports_app_context_isolation on ai_audit_reports
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on ai_audit_reports to app_runtime;

alter table ai_audit_reports force row level security;
