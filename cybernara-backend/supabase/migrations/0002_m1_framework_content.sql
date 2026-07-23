do $$
begin
  if not exists (select 1 from pg_type where typname = 'content_pack_status') then
    create type content_pack_status as enum ('quarantined', 'staged', 'validated', 'review_pending', 'published', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'mapping_classification') then
    create type mapping_classification as enum ('mapped', 'partial', 'conflicting', 'unique');
  end if;
end $$;

create table if not exists content_source_packages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  source_file_name text not null,
  source_sha256 text not null,
  storage_uri text,
  status content_pack_status not null default 'quarantined',
  diagnostic_summary jsonb not null default '{}'::jsonb,
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, source_file_name, source_sha256)
);

create table if not exists framework_content_packs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  framework_key text not null,
  pack_version text not null,
  source_package_id uuid not null references content_source_packages(id),
  source_sha256 text not null,
  signature text not null,
  status content_pack_status not null default 'staged',
  published_at timestamptz,
  supersedes_pack_id uuid references framework_content_packs(id),
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, framework_key, pack_version)
);

create table if not exists framework_requirements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  framework_pack_id uuid not null references framework_content_packs(id),
  framework_key text not null,
  control_id text not null,
  control_title text not null,
  sub_control_id text,
  sub_control_title text,
  requirement_text text not null,
  citation text,
  category text,
  source_workbook text not null,
  source_sheet text not null,
  source_row_number integer not null,
  source_sha256 text not null,
  raw_record jsonb not null,
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, framework_pack_id, control_id, sub_control_id, source_sheet, source_row_number)
);

create table if not exists harmonized_controls (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  harmonized_id text not null,
  domain text not null,
  control_name text not null,
  control_description text not null,
  source_workbook text not null,
  source_sheet text not null,
  source_row_number integer not null,
  status content_pack_status not null default 'staged',
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, harmonized_id)
);

create table if not exists control_mappings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  framework_key text not null,
  source_control_id text not null,
  harmonized_control_id text not null,
  mapping_classification mapping_classification not null,
  coverage text,
  confidence text,
  rationale text,
  reviewer text,
  source_workbook text not null,
  source_sheet text not null,
  source_row_number integer not null,
  status content_pack_status not null default 'staged',
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, framework_key, source_control_id, harmonized_control_id, source_workbook, source_row_number)
);

create table if not exists content_rejected_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  source_workbook text not null,
  source_sheet text not null,
  source_row_number integer not null,
  reason text not null,
  remediation_status text not null default 'open',
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_framework_requirements_pack on framework_requirements(tenant_id, framework_pack_id);
create index if not exists idx_framework_requirements_lookup on framework_requirements(tenant_id, framework_key, control_id, sub_control_id);
create index if not exists idx_control_mappings_source on control_mappings(tenant_id, framework_key, source_control_id);
create index if not exists idx_control_mappings_target on control_mappings(tenant_id, harmonized_control_id);

alter table content_source_packages enable row level security;
alter table framework_content_packs enable row level security;
alter table framework_requirements enable row level security;
alter table harmonized_controls enable row level security;
alter table control_mappings enable row level security;
alter table content_rejected_records enable row level security;

create policy content_source_packages_tenant_isolation on content_source_packages
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy framework_content_packs_tenant_isolation on framework_content_packs
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy framework_requirements_tenant_isolation on framework_requirements
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy harmonized_controls_tenant_isolation on harmonized_controls
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy control_mappings_tenant_isolation on control_mappings
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy content_rejected_records_tenant_isolation on content_rejected_records
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

