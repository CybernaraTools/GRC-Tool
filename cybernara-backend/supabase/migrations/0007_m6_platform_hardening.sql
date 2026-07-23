create table if not exists authorization_decision_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  actor_id uuid not null,
  resource_type text not null,
  resource_id text not null,
  action text not null,
  decision text not null check (decision in ('allow', 'deny')),
  reason text not null,
  trace_id text not null,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists rate_limit_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  policy_key text not null,
  limit_count integer not null check (limit_count > 0),
  window_seconds integer not null check (window_seconds > 0),
  timeout_ms integer not null check (timeout_ms > 0),
  classification cybernara_classification not null default 'internal',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, policy_key)
);

create table if not exists export_manifests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  snapshot_id text not null,
  template_version text not null,
  artifact_hashes text[] not null,
  manifest_hash text not null,
  signing_key_ref text not null,
  signature text not null,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, snapshot_id, template_version, manifest_hash)
);

create table if not exists encryption_key_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  kms_key_ref text not null,
  algorithm text not null,
  rotation_due_at timestamptz not null,
  revoked_at timestamptz,
  audit_event_ids uuid[] not null default '{}',
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists siem_export_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  actor_id uuid not null,
  target text not null,
  before_hash text not null,
  after_hash text not null,
  trace_id text not null,
  delivered boolean not null default false,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists backup_restore_tests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  rpo_minutes integer not null,
  rto_hours numeric not null,
  backup_credential_ref text not null,
  restored_at timestamptz not null,
  passed boolean not null,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists product_assurance_evidence (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  framework text not null,
  control_ref text not null,
  evidence_id uuid not null,
  exception_reason text,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists sdlc_release_gates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  sbom_hash text not null,
  signed_build_ref text not null,
  scan_findings jsonb not null default '[]'::jsonb,
  penetration_test_evidence_id uuid not null,
  releasable boolean not null default false,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists upload_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  file_name text not null,
  scan_status text not null check (scan_status in ('quarantined', 'clean', 'malicious')),
  sha256 text,
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

alter table authorization_decision_logs enable row level security;
alter table rate_limit_policies enable row level security;
alter table export_manifests enable row level security;
alter table encryption_key_records enable row level security;
alter table siem_export_records enable row level security;
alter table backup_restore_tests enable row level security;
alter table product_assurance_evidence enable row level security;
alter table sdlc_release_gates enable row level security;
alter table upload_sessions enable row level security;

create policy authorization_decision_logs_tenant_isolation on authorization_decision_logs
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy rate_limit_policies_tenant_isolation on rate_limit_policies
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy export_manifests_tenant_isolation on export_manifests
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy encryption_key_records_tenant_isolation on encryption_key_records
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy siem_export_records_tenant_isolation on siem_export_records
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy backup_restore_tests_tenant_isolation on backup_restore_tests
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy product_assurance_evidence_tenant_isolation on product_assurance_evidence
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy sdlc_release_gates_tenant_isolation on sdlc_release_gates
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy upload_sessions_tenant_isolation on upload_sessions
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
