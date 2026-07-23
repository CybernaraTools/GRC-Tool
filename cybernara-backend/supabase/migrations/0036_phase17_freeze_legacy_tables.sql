-- Migration: 0036_phase17_freeze_legacy_tables
-- Freezes legacy tables to prevent new writes, enforcing usage of the normalized paths.

create or replace function fn_block_legacy_writes()
returns trigger as $$
begin
  raise exception 'Writes to legacy table % are blocked. Use the new normalized paths instead.', TG_TABLE_NAME;
end;
$$ language plpgsql;

-- 1. framework_content_packs
drop trigger if exists trg_block_framework_content_packs on framework_content_packs;
create trigger trg_block_framework_content_packs
  before insert or update on framework_content_packs
  for each row execute function fn_block_legacy_writes();

-- 2. framework_requirements
drop trigger if exists trg_block_framework_requirements on framework_requirements;
create trigger trg_block_framework_requirements
  before insert or update on framework_requirements
  for each row execute function fn_block_legacy_writes();

-- 3. control_mappings
drop trigger if exists trg_block_control_mappings on control_mappings;
create trigger trg_block_control_mappings
  before insert or update on control_mappings
  for each row execute function fn_block_legacy_writes();

-- 4. remediation_tasks
drop trigger if exists trg_block_remediation_tasks on remediation_tasks;
create trigger trg_block_remediation_tasks
  before insert or update on remediation_tasks
  for each row execute function fn_block_legacy_writes();

-- 5. rights_request_tasks
drop trigger if exists trg_block_rights_request_tasks on rights_request_tasks;
create trigger trg_block_rights_request_tasks
  before insert or update on rights_request_tasks
  for each row execute function fn_block_legacy_writes();

-- Optional: Revoke insert and update from app_runtime just to be safe
revoke insert, update on table framework_content_packs from app_runtime;
revoke insert, update on table framework_requirements from app_runtime;
revoke insert, update on table control_mappings from app_runtime;
revoke insert, update on table remediation_tasks from app_runtime;
revoke insert, update on table rights_request_tasks from app_runtime;
