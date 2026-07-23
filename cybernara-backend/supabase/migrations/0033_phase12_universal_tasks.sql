-- Migration: 0033_phase12_universal_tasks
-- Creates the universal task layer table, configures RLS, and sets up trigger-based synchronization with legacy tables.

create table if not exists universal_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  title text not null check (length(trim(title)) > 0),
  description text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  due_at timestamptz,
  owner_id uuid not null,
  target_type text not null check (target_type in ('remediation_task', 'rights_request_task')),
  target_id uuid not null,
  completed_at timestamptz,
  completed_by uuid,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, target_type, target_id)
);

-- Enable RLS and force it
alter table universal_tasks enable row level security;
alter table universal_tasks force row level security;

-- RLS policies matching current tenant scope
create policy universal_tasks_select on universal_tasks
  for select using (tenant_id = app_current_tenant());

create policy universal_tasks_insert on universal_tasks
  for insert with check (tenant_id = app_current_tenant());

create policy universal_tasks_update on universal_tasks
  for update using (tenant_id = app_current_tenant());

create policy universal_tasks_delete on universal_tasks
  for delete using (tenant_id = app_current_tenant());

-- Trigger to automatically set completed_at and completed_by on status transition to 'completed'
create or replace function handle_universal_task_completion()
returns trigger as $$
begin
  if new.status = 'completed' and (old.status is null or old.status <> 'completed') then
    new.completed_at := now();
    new.completed_by := new.updated_by;
  elsif new.status <> 'completed' then
    new.completed_at := null;
    new.completed_by := null;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger handle_universal_task_completion_trigger
before insert or update on universal_tasks
for each row execute function handle_universal_task_completion();

-- Synchronization Triggers: sync updates from remediation_tasks
create or replace function sync_remediation_task_to_universal()
returns trigger as $$
begin
  insert into universal_tasks (
    tenant_id, title, description, status, priority, due_at, owner_id, target_type, target_id, classification, created_by, updated_by
  )
  values (
    new.tenant_id,
    'Remediation: Finding ' || new.finding_id,
    'Remediate finding ' || new.finding_id,
    case new.status
      when 'open' then 'pending'
      when 'in_progress' then 'in_progress'
      when 'verified' then 'completed'
      when 'risk_accepted' then 'completed'
      else 'pending'
    end,
    'medium',
    new.due_at,
    new.owner_id,
    'remediation_task',
    new.id,
    new.classification,
    new.created_by,
    new.updated_by
  )
  on conflict (tenant_id, target_type, target_id) do update set
    status = excluded.status,
    due_at = excluded.due_at,
    owner_id = excluded.owner_id,
    updated_by = excluded.updated_by,
    updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger sync_remediation_task_trigger
after insert or update on remediation_tasks
for each row execute function sync_remediation_task_to_universal();

-- Synchronization Triggers: sync updates from rights_request_tasks
create or replace function sync_rights_request_task_to_universal()
returns trigger as $$
begin
  insert into universal_tasks (
    tenant_id, title, description, status, priority, due_at, owner_id, target_type, target_id, classification, created_by, updated_by
  )
  values (
    new.tenant_id,
    'Privacy Request: ' || new.task_type || ' for ' || new.system_id,
    'Fulfill rights request ' || new.rights_request_id,
    case new.status
      when 'pending' then 'pending'
      when 'in_progress' then 'in_progress'
      when 'completed' then 'completed'
      when 'blocked' then 'pending'
      else 'pending'
    end,
    'high',
    new.created_at + interval '30 days',
    new.owner_id,
    'rights_request_task',
    new.id,
    new.classification,
    new.created_by,
    new.updated_by
  )
  on conflict (tenant_id, target_type, target_id) do update set
    status = excluded.status,
    owner_id = excluded.owner_id,
    updated_by = excluded.updated_by,
    updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger sync_rights_request_task_trigger
after insert or update on rights_request_tasks
for each row execute function sync_rights_request_task_to_universal();

-- Delete synchronization trigger: remove universal task if the legacy task is deleted
create or replace function delete_universal_task_on_legacy_delete()
returns trigger as $$
begin
  delete from universal_tasks
  where target_id = old.id;
  return old;
end;
$$ language plpgsql;

create trigger delete_remediation_task_trigger
after delete on remediation_tasks
for each row execute function delete_universal_task_on_legacy_delete();

create trigger delete_rights_request_task_trigger
after delete on rights_request_tasks
for each row execute function delete_universal_task_on_legacy_delete();

-- Backfill pre-existing legacy tasks
insert into universal_tasks (
  id, tenant_id, version, title, description, status, priority, due_at, owner_id, target_type, target_id, classification, created_by, created_at, updated_by, updated_at
)
select
  gen_random_uuid(),
  tenant_id,
  version,
  'Remediation: Finding ' || finding_id,
  'Remediate finding ' || finding_id,
  case status
    when 'open' then 'pending'
    when 'in_progress' then 'in_progress'
    when 'verified' then 'completed'
    when 'risk_accepted' then 'completed'
    else 'pending'
  end,
  'medium',
  due_at,
  owner_id,
  'remediation_task',
  id,
  classification,
  created_by,
  created_at,
  updated_by,
  updated_at
from remediation_tasks
on conflict (tenant_id, target_type, target_id) do nothing;

insert into universal_tasks (
  id, tenant_id, version, title, description, status, priority, due_at, owner_id, target_type, target_id, classification, created_by, created_at, updated_by, updated_at
)
select
  gen_random_uuid(),
  tenant_id,
  version,
  'Privacy Request: ' || task_type || ' for ' || system_id,
  'Fulfill rights request ' || rights_request_id,
  case status
    when 'pending' then 'pending'
    when 'in_progress' then 'in_progress'
    when 'completed' then 'completed'
    when 'blocked' then 'pending'
    else 'pending'
  end,
  'high',
  created_at + interval '30 days',
  owner_id,
  'rights_request_task',
  id,
  classification,
  created_by,
  created_at,
  updated_by,
  updated_at
from rights_request_tasks
on conflict (tenant_id, target_type, target_id) do nothing;

-- Grant permissions to connection role
grant select, insert, update, delete on universal_tasks to app_runtime;
