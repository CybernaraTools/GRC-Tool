create table if not exists connectors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  connector_key text not null,
  provider text not null,
  kind text not null,
  scopes jsonb not null default '[]'::jsonb,
  secret_ref text not null,
  status text not null default 'active' check (status in ('draft', 'active', 'disabled')),
  health text not null default 'healthy' check (health in ('healthy', 'degraded', 'failing')),
  sync_cursor text,
  last_seen_at timestamptz,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, connector_key)
);

create table if not exists connector_sync_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  connector_id uuid not null references connectors(id),
  status text not null check (status in ('started', 'succeeded', 'failed')),
  cursor_before text,
  cursor_after text,
  started_at timestamptz not null,
  finished_at timestamptz,
  object_counts jsonb not null default '{}'::jsonb,
  error text,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists connector_objects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  connector_id uuid not null references connectors(id),
  object_type text not null,
  external_id text not null,
  source_hash text not null,
  provenance jsonb not null,
  delivery_status text not null check (delivery_status in ('pending', 'delivered', 'failed', 'dead_lettered')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, connector_id, object_type, external_id)
);

create table if not exists webhook_contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  webhook_key text not null,
  contract_version text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  signing_secret_ref text not null,
  rate_limit_per_minute integer not null check (rate_limit_per_minute > 0),
  status text not null default 'active' check (status in ('active', 'disabled')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, webhook_key, contract_version)
);

create table if not exists webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  webhook_id uuid not null references webhook_contracts(id),
  idempotency_key text not null,
  payload_hash text not null,
  delivery_status text not null check (delivery_status in ('pending', 'delivered', 'failed', 'dead_lettered')),
  attempts integer not null check (attempts > 0),
  last_error text,
  observed_at timestamptz not null,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, webhook_id, idempotency_key)
);

create table if not exists automated_control_tests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  connector_id uuid not null references connectors(id),
  control_ref text not null,
  query text not null,
  population jsonb not null,
  sample jsonb not null,
  result jsonb not null,
  source_timestamp timestamptz not null,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists assurance_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  source_type text not null check (source_type in ('control_test', 'connector_health', 'evidence_freshness')),
  source_id uuid not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  owner_id uuid not null,
  sla_due_at timestamptz not null,
  status text not null default 'triaged' check (status in ('open', 'triaged', 'resolved')),
  reason text not null,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_connectors_tenant_status on connectors(tenant_id, status, health);
create index if not exists idx_connector_sync_runs_connector on connector_sync_runs(tenant_id, connector_id, started_at);
create index if not exists idx_connector_objects_external on connector_objects(tenant_id, connector_id, object_type, external_id);
create index if not exists idx_webhook_deliveries_status on webhook_deliveries(tenant_id, webhook_id, delivery_status);
create index if not exists idx_automated_control_tests_control on automated_control_tests(tenant_id, control_ref, source_timestamp);
create index if not exists idx_assurance_alerts_triage on assurance_alerts(tenant_id, status, severity, sla_due_at);

alter table connectors enable row level security;
alter table connector_sync_runs enable row level security;
alter table connector_objects enable row level security;
alter table webhook_contracts enable row level security;
alter table webhook_deliveries enable row level security;
alter table automated_control_tests enable row level security;
alter table assurance_alerts enable row level security;

create policy connectors_tenant_isolation on connectors
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy connector_sync_runs_tenant_isolation on connector_sync_runs
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy connector_objects_tenant_isolation on connector_objects
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy webhook_contracts_tenant_isolation on webhook_contracts
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy webhook_deliveries_tenant_isolation on webhook_deliveries
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy automated_control_tests_tenant_isolation on automated_control_tests
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy assurance_alerts_tenant_isolation on assurance_alerts
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
