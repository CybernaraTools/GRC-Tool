create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'cybernara_classification') then
    create type cybernara_classification as enum ('public', 'internal', 'confidential', 'restricted');
  end if;

  if not exists (select 1 from pg_type where typname = 'outbox_status') then
    create type outbox_status as enum ('pending', 'processing', 'processed', 'dead_letter');
  end if;
end $$;

create table if not exists identity_tenants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  name text not null,
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  check (tenant_id = id)
);

create table if not exists identity_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references identity_tenants(id),
  version integer not null default 1,
  supabase_user_id uuid not null,
  email text not null,
  display_name text,
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, supabase_user_id),
  unique (tenant_id, email)
);

create table if not exists identity_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references identity_tenants(id),
  version integer not null default 1,
  role_key text not null,
  display_name text not null,
  description text,
  classification cybernara_classification not null default 'internal',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, role_key)
);

create table if not exists identity_role_grants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references identity_tenants(id),
  version integer not null default 1,
  user_id uuid not null references identity_users(id),
  role_id uuid not null references identity_roles(id),
  resource_type text not null,
  resource_id uuid,
  expires_at timestamptz,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id, role_id, resource_type, resource_id)
);

create table if not exists identity_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references identity_tenants(id),
  version integer not null default 1,
  user_id uuid not null references identity_users(id),
  supabase_session_id text not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, supabase_session_id)
);

create table if not exists identity_service_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references identity_tenants(id),
  version integer not null default 1,
  name text not null,
  scopes text[] not null default '{}',
  disabled_at timestamptz,
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists identity_workspace_delegations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references identity_tenants(id),
  version integer not null default 1,
  workspace_id uuid not null,
  principal_user_id uuid not null references identity_users(id),
  delegated_by uuid not null references identity_users(id),
  reason text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

-- @append_only
create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  sequence bigint generated always as identity,
  version integer not null default 1,
  event_type text not null,
  actor_id uuid not null,
  target_type text not null,
  target_id text not null,
  trace_id text not null,
  classification cybernara_classification not null default 'confidential',
  body jsonb not null,
  previous_hash text not null,
  event_hash text not null,
  occurred_at timestamptz not null default now(),
  created_by uuid generated always as (actor_id) stored,
  created_at timestamptz generated always as (occurred_at) stored,
  unique (tenant_id, sequence),
  unique (tenant_id, event_hash)
);

create table if not exists outbox_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id text not null,
  schema_version integer not null default 1,
  payload jsonb not null,
  idempotency_key text not null,
  status outbox_status not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  classification cybernara_classification not null default 'internal',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);

create index if not exists idx_identity_users_tenant on identity_users(tenant_id);
create index if not exists idx_identity_role_grants_tenant_user on identity_role_grants(tenant_id, user_id);
create index if not exists idx_audit_events_tenant_sequence on audit_events(tenant_id, sequence desc);
create index if not exists idx_outbox_events_pending on outbox_events(status, available_at, created_at);

alter table identity_tenants enable row level security;
alter table identity_users enable row level security;
alter table identity_roles enable row level security;
alter table identity_role_grants enable row level security;
alter table identity_sessions enable row level security;
alter table identity_service_accounts enable row level security;
alter table identity_workspace_delegations enable row level security;
alter table audit_events enable row level security;
alter table outbox_events enable row level security;

create policy identity_tenants_tenant_isolation on identity_tenants
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy identity_users_tenant_isolation on identity_users
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy identity_roles_tenant_isolation on identity_roles
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy identity_role_grants_tenant_isolation on identity_role_grants
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy identity_sessions_tenant_isolation on identity_sessions
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy identity_service_accounts_tenant_isolation on identity_service_accounts
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy identity_workspace_delegations_tenant_isolation on identity_workspace_delegations
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy audit_events_tenant_read on audit_events
  for select using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy outbox_events_tenant_isolation on outbox_events
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create or replace function prevent_audit_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_events is append-only';
end;
$$;

drop trigger if exists trg_prevent_audit_event_update on audit_events;
create trigger trg_prevent_audit_event_update
  before update or delete on audit_events
  for each row execute function prevent_audit_event_mutation();

