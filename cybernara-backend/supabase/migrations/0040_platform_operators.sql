-- Platform operators are Cybernara employees/accounts that sit outside all
-- client tenants. They can provision tenants, but are not tenant principals.
-- @platform_scope
create table if not exists platform_operators (
  id uuid primary key default gen_random_uuid(),
  version integer not null default 1,
  supabase_user_id uuid not null unique,
  email text not null unique,
  display_name text,
  platform_role text not null check (platform_role in ('super_admin')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  classification cybernara_classification not null default 'restricted',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create index if not exists idx_platform_operators_role_status
  on platform_operators (platform_role, status);

alter table platform_operators enable row level security;
alter table platform_operators force row level security;

