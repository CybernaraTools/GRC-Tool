do $$
begin
  if not exists (select 1 from pg_type where typname = 'assessment_status') then
    create type assessment_status as enum ('not_started', 'in_progress', 'submitted', 'needs_changes', 'approved', 'closed');
  end if;

  if not exists (select 1 from pg_type where typname = 'evidence_state') then
    create type evidence_state as enum ('pending', 'quarantined', 'committed', 'rejected');
  end if;
end $$;

create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  scope_name text not null,
  status assessment_status not null default 'not_started',
  control_snapshot_version text not null,
  period_start date not null,
  period_end date not null,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists assessment_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  assessment_id uuid not null references assessments(id),
  framework_key text not null,
  framework_version text not null,
  mapping_version text not null,
  control_id text not null,
  harmonized_control_id text not null,
  question_version text not null,
  status assessment_status not null default 'not_started',
  owner_id uuid not null,
  answer_text text,
  applicability jsonb,
  evidence_ids uuid[] not null default '{}',
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists evidence_objects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  owner_id uuid not null,
  file_name text not null,
  storage_uri text,
  state evidence_state not null default 'pending',
  sha256 text,
  period_start date not null,
  period_end date not null,
  scope_tags text[] not null default '{}',
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists findings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  assessment_item_id uuid not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  description text not null,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists remediation_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  finding_id uuid not null references findings(id),
  owner_id uuid not null,
  due_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'verified', 'risk_accepted')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists report_exports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  assessment_id uuid not null references assessments(id),
  snapshot_id text not null,
  template_version text not null,
  format text not null check (format in ('pdf', 'xlsx')),
  idempotency_key text not null,
  sha256 text not null,
  storage_uri text,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);

create index if not exists idx_assessment_items_assessment on assessment_items(tenant_id, assessment_id);
create index if not exists idx_evidence_objects_tenant_state on evidence_objects(tenant_id, state);
create index if not exists idx_findings_assessment_item on findings(tenant_id, assessment_item_id);
create index if not exists idx_report_exports_idempotency on report_exports(tenant_id, idempotency_key);

alter table assessments enable row level security;
alter table assessment_items enable row level security;
alter table evidence_objects enable row level security;
alter table findings enable row level security;
alter table remediation_tasks enable row level security;
alter table report_exports enable row level security;

create policy assessments_tenant_isolation on assessments
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy assessment_items_tenant_isolation on assessment_items
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy evidence_objects_tenant_isolation on evidence_objects
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy findings_tenant_isolation on findings
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy remediation_tasks_tenant_isolation on remediation_tasks
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy report_exports_tenant_isolation on report_exports
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

