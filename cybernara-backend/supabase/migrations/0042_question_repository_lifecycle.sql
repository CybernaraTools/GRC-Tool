-- Complete governed question repository lifecycle support.
-- Existing question_versions are immutable once approved, but the platform still needs
-- lifecycle state changes (deactivate/retire/restore) that do not mutate the approved
-- question payload. This migration narrows the immutability trigger to payload and
-- provenance fields while allowing status-only lifecycle transitions.

alter table question_versions drop constraint if exists question_versions_status_check;
alter table question_versions
  add constraint question_versions_status_check
  check (status in ('draft', 'pending_review', 'approved', 'rejected', 'deprecated', 'inactive', 'retired'))
  not valid;
alter table question_versions validate constraint question_versions_status_check;

create or replace function prevent_approved_question_version_mutation()
returns trigger
language plpgsql
as $$
begin
  if old.approved_at is not null then
    if old.tenant_id is distinct from new.tenant_id
      or old.question_set_id is distinct from new.question_set_id
      or old.question_version is distinct from new.question_version
      or old.payload_json is distinct from new.payload_json
      or old.source_ai_question_version_id is distinct from new.source_ai_question_version_id
      or old.approved_by is distinct from new.approved_by
      or old.approved_at is distinct from new.approved_at
      or old.checksum is distinct from new.checksum
      or old.classification is distinct from new.classification
      or old.created_by is distinct from new.created_by
      or old.created_at is distinct from new.created_at then
      raise exception 'question_versions: an approved question version payload is immutable';
    end if;
  end if;
  return new;
end;
$$;

create index if not exists idx_question_versions_source_ai
  on question_versions(source_ai_question_version_id)
  where source_ai_question_version_id is not null;

create index if not exists idx_question_versions_status_lifecycle
  on question_versions(tenant_id, status, approved_at desc);

create unique index if not exists idx_tenant_catalog_subscriptions_active_version
  on tenant_catalog_subscriptions(tenant_id, framework_id, source_package_id)
  where status = 'active' and framework_id is not null and source_package_id is not null;
