-- Migration: 0049_remediation_review_evidence_workflow
-- Purpose: make Phase 11 remediation review auditable and allow clean evidence
-- files to be linked directly to remediation tasks, not only assessment items.

alter table evidence_links drop constraint if exists evidence_links_target_type_check;
alter table evidence_links
  add constraint evidence_links_target_type_check
  check (target_type in ('control_instance', 'assessment_item', 'automated_test_run', 'remediation_task')) not valid;
alter table evidence_links validate constraint evidence_links_target_type_check;

-- @append_only
create table if not exists remediation_task_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  remediation_task_id uuid not null references remediation_tasks(id),
  reviewer_id uuid not null,
  decision text not null check (decision in ('approved', 'rejected')),
  rationale text not null check (length(trim(rationale)) > 0),
  evidence_version_ids uuid[] not null default '{}'::uuid[],
  reviewed_at timestamptz not null default now()
);

create index if not exists idx_remediation_task_reviews_task
  on remediation_task_reviews(tenant_id, remediation_task_id, reviewed_at desc);

alter table remediation_task_reviews enable row level security;

create policy remediation_task_reviews_tenant_isolation on remediation_task_reviews
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));

create policy remediation_task_reviews_app_context_isolation on remediation_task_reviews
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());

grant select, insert on remediation_task_reviews to app_runtime;

create or replace function prevent_remediation_task_review_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'remediation_task_reviews is append-only';
end;
$$;

drop trigger if exists trg_prevent_remediation_task_review_update on remediation_task_reviews;
create trigger trg_prevent_remediation_task_review_update
  before update or delete on remediation_task_reviews
  for each row execute function prevent_remediation_task_review_mutation();

alter table remediation_task_reviews force row level security;
