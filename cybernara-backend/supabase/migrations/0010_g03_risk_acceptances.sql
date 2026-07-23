-- Gap remediation Phase 2 slice — G-03 risk acceptance.
--
-- Root cause: today `acceptRisk` (risk-workflow domain) only ever flips
-- remediation_tasks.status to 'risk_accepted'; the actual rationale is passed
-- into the outbox/audit event body as a side channel and never queried back.
-- There is no expiry, no approver-of-record beyond the audit trail, no
-- compensating-controls field, and nothing stops a "risk_accepted" task from
-- being treated as permanently resolved with no periodic re-justification.
--
-- Scoping decision (documented per the standing instruction to make the
-- smallest correct decision when the two source documents don't fully
-- settle something): the schema spec's risk_acceptances table links to a
-- top-level `risks` enterprise risk-register entity (spec §12), which does
-- not exist yet in this schema — building it is the full G-09 enterprise-GRC
-- risk register, out of scope for this pass. Rather than inventing a
-- synthetic risk-per-finding record just to satisfy a FK, this migration
-- scopes risk_acceptances to what the current domain model actually accepts
-- risk against today: a remediation_task (and, transitively, the finding it
-- remediates). When G-09 introduces a real `risks` table, risk_acceptances
-- should gain a proper risk_id FK alongside this one — tracked in
-- docs/schema-remediation-report.md.

create table if not exists risk_acceptances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  remediation_task_id uuid not null references remediation_tasks(id),
  finding_id uuid not null references findings(id),
  rationale text not null check (length(trim(rationale)) > 0),
  approver_id uuid not null,
  approved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  next_review_due_at timestamptz not null,
  compensating_controls text,
  superseded_at timestamptz,
  superseded_by_id uuid references risk_acceptances(id),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  check (expires_at > approved_at),
  check (next_review_due_at > approved_at)
);

-- @append_only
create table if not exists risk_acceptance_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  risk_acceptance_id uuid not null references risk_acceptances(id),
  reviewer_id uuid not null,
  decision text not null check (decision in ('reaffirmed', 'revoked', 'escalated')),
  reason text not null check (length(trim(reason)) > 0),
  reviewed_at timestamptz not null default now(),
  classification cybernara_classification not null default 'confidential',
  created_by uuid generated always as (reviewer_id) stored,
  created_at timestamptz generated always as (reviewed_at) stored
);

create index if not exists idx_risk_acceptances_task on risk_acceptances(tenant_id, remediation_task_id);
create index if not exists idx_risk_acceptances_finding on risk_acceptances(tenant_id, finding_id);
create index if not exists idx_risk_acceptances_expiry on risk_acceptances(tenant_id, expires_at);
create index if not exists idx_risk_acceptance_reviews_acceptance on risk_acceptance_reviews(tenant_id, risk_acceptance_id);

alter table risk_acceptances enable row level security;
alter table risk_acceptance_reviews enable row level security;

-- Keep the same two-policy pattern (legacy auth.jwt() policy for parity with
-- every other table in this repo, plus the new app-context policy from
-- 0008_g10_rls_foundation.sql) so this table behaves identically to every
-- other tenant table with respect to the ongoing RLS role cutover.
create policy risk_acceptances_tenant_isolation on risk_acceptances
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy risk_acceptances_app_context_isolation on risk_acceptances
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on risk_acceptances to app_runtime;

create policy risk_acceptance_reviews_tenant_isolation on risk_acceptance_reviews
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy risk_acceptance_reviews_app_context_isolation on risk_acceptance_reviews
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert on risk_acceptance_reviews to app_runtime;

-- Append-only enforcement, matching the existing audit_events convention.
create or replace function prevent_risk_acceptance_review_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'risk_acceptance_reviews is append-only';
end;
$$;

drop trigger if exists trg_prevent_risk_acceptance_review_update on risk_acceptance_reviews;
create trigger trg_prevent_risk_acceptance_review_update
  before update or delete on risk_acceptance_reviews
  for each row execute function prevent_risk_acceptance_review_mutation();
