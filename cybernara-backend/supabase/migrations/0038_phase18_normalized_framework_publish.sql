-- Migration: 0038_phase18_normalized_framework_publish
-- Completes the publish cutover away from framework_content_packs/framework_requirements.

alter table framework_versions add column if not exists source_package_id uuid references content_source_packages(id);
alter table framework_versions add column if not exists source_sha256 text;
alter table framework_versions add column if not exists signature text;

alter table controls add column if not exists source_sha256 text;
alter table controls add column if not exists raw_record jsonb not null default '{}'::jsonb;

alter table control_subcontrols add column if not exists source_sha256 text;
alter table control_subcontrols add column if not exists raw_record jsonb not null default '{}'::jsonb;

create or replace function fn_block_legacy_writes()
returns trigger as $$
begin
  if current_setting('app.allow_legacy_write', true) = '1' then
    return NEW;
  end if;

  raise exception 'Writes to legacy table % are blocked. Use the new normalized paths instead.', TG_TABLE_NAME;
end;
$$ language plpgsql;

alter table remediation_tasks enable trigger trg_block_remediation_tasks;
