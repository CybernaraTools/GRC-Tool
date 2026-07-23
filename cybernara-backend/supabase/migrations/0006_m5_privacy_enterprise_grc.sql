create table if not exists data_inventory_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  system_name text not null,
  data_elements jsonb not null default '[]'::jsonb,
  owner_id uuid not null,
  locations text[] not null default '{}',
  lineage jsonb not null default '[]'::jsonb,
  processing_activity_ids uuid[] not null default '{}',
  control_ids text[] not null default '{}',
  vendor_ids uuid[] not null default '{}',
  evidence_ids uuid[] not null default '{}',
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists processing_activities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  purpose text not null,
  lawful_basis text not null,
  data_subject_categories text[] not null default '{}',
  recipients text[] not null default '{}',
  transfers text[] not null default '{}',
  retention_months integer not null check (retention_months > 0),
  jurisdiction text not null,
  inventory_record_ids uuid[] not null default '{}',
  report_version text not null,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists dpia_assessments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  processing_activity_id uuid not null,
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  residual_risk_score integer not null check (residual_risk_score >= 0 and residual_risk_score <= 100),
  approvals jsonb not null default '[]'::jsonb,
  findings text[] not null default '{}',
  review_obligation_ids text[] not null default '{}',
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists privacy_rights_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  subject_id text not null,
  request_type text not null check (request_type in ('access', 'delete', 'correct', 'export', 'restrict')),
  status text not null check (status in ('open', 'verified', 'searching', 'exception_applied', 'completed')),
  identity_verified boolean not null default false,
  opened_at timestamptz not null,
  deadline_at timestamptz not null,
  search_tasks jsonb not null default '[]'::jsonb,
  exceptions jsonb not null default '[]'::jsonb,
  communications jsonb not null default '[]'::jsonb,
  completion_evidence_ids uuid[] not null default '{}',
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists consent_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  subject_id text not null,
  purpose text not null,
  notice_version text not null,
  region text not null,
  status text not null check (status in ('active', 'withdrawn')),
  history jsonb not null default '[]'::jsonb,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists privacy_incidents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  impacted_processing_activity_ids uuid[] not null default '{}',
  evidence_ids uuid[] not null default '{}',
  report_ids uuid[] not null default '{}',
  discovered_at timestamptz not null,
  regulator_notification_due_at timestamptz not null,
  data_subject_notification_due_at timestamptz not null,
  timeline jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists retention_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  data_category text not null,
  jurisdiction text not null,
  residency text not null,
  transfer_mechanism text not null,
  retention_months integer not null check (retention_months > 0),
  legal_hold boolean not null default false,
  disposal_evidence_ids uuid[] not null default '{}',
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists policy_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  template_key text not null,
  title text not null,
  policy_version text not null,
  status text not null check (status in ('draft', 'in_review', 'approved', 'published', 'retired')),
  approver_id uuid,
  published_at timestamptz,
  attestation_evidence_ids uuid[] not null default '{}',
  exceptions jsonb not null default '[]'::jsonb,
  content_hash text not null,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, template_key, policy_version)
);

create table if not exists access_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  population_source text not null,
  certifier_id uuid not null,
  decisions jsonb not null default '[]'::jsonb,
  remediation_task_ids text[] not null default '{}',
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  name text not null,
  tier text not null check (tier in ('low', 'medium', 'high', 'critical')),
  systems text[] not null default '{}',
  contract_ids text[] not null default '{}',
  control_ids text[] not null default '{}',
  incident_ids text[] not null default '{}',
  questionnaire_ids text[] not null default '{}',
  monitoring_findings text[] not null default '{}',
  renewal_at timestamptz not null,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists audit_engagements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  name text not null,
  status text not null check (status in ('planned', 'fieldwork', 'management_response', 'closed')),
  request_list_ids text[] not null default '{}',
  evidence_ids uuid[] not null default '{}',
  finding_ids text[] not null default '{}',
  management_responses jsonb not null default '[]'::jsonb,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists trust_center_artifacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  title text not null,
  artifact_version text not null,
  approved boolean not null default false,
  visibility text not null check (visibility in ('public', 'private')),
  artifact_evidence_id uuid not null,
  nda_required boolean not null default false,
  crm_account_id text,
  download_events jsonb not null default '[]'::jsonb,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists grc_workspaces (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  business_unit text not null,
  parent_workspace_id uuid,
  inherited_control_ids text[] not null default '{}',
  delegated_admin_ids uuid[] not null default '{}',
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists custom_object_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  object_key text not null,
  fields jsonb not null default '[]'::jsonb,
  workflow_states text[] not null default '{}',
  permission_role_ids uuid[] not null default '{}',
  upgrade_safe boolean not null default true,
  connector_sdk_enabled boolean not null default false,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, object_key)
);

alter table data_inventory_records enable row level security;
alter table processing_activities enable row level security;
alter table dpia_assessments enable row level security;
alter table privacy_rights_requests enable row level security;
alter table consent_records enable row level security;
alter table privacy_incidents enable row level security;
alter table retention_schedules enable row level security;
alter table policy_versions enable row level security;
alter table access_reviews enable row level security;
alter table vendors enable row level security;
alter table audit_engagements enable row level security;
alter table trust_center_artifacts enable row level security;
alter table grc_workspaces enable row level security;
alter table custom_object_definitions enable row level security;

create policy data_inventory_records_tenant_isolation on data_inventory_records
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy processing_activities_tenant_isolation on processing_activities
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy dpia_assessments_tenant_isolation on dpia_assessments
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy privacy_rights_requests_tenant_isolation on privacy_rights_requests
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy consent_records_tenant_isolation on consent_records
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy privacy_incidents_tenant_isolation on privacy_incidents
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy retention_schedules_tenant_isolation on retention_schedules
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy policy_versions_tenant_isolation on policy_versions
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy access_reviews_tenant_isolation on access_reviews
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy vendors_tenant_isolation on vendors
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy audit_engagements_tenant_isolation on audit_engagements
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy trust_center_artifacts_tenant_isolation on trust_center_artifacts
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy grc_workspaces_tenant_isolation on grc_workspaces
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy custom_object_definitions_tenant_isolation on custom_object_definitions
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
