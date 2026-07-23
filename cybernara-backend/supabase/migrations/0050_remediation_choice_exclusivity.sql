-- Migration: 0050_remediation_choice_exclusivity
-- Purpose: enforce that a remediation task attempt cannot mix remediation
-- evidence submission with residual-risk acceptance. The UI presents these as
-- mutually exclusive choices; this trigger keeps direct API/database writes
-- from bypassing that rule.

create or replace function prevent_mixed_remediation_choice_from_evidence()
returns trigger
language plpgsql
as $$
begin
  if new.target_type = 'remediation_task' and exists (
    select 1
    from risk_acceptances ra
    where ra.tenant_id = new.tenant_id
      and ra.remediation_task_id = new.target_id
      and ra.superseded_at is null
  ) then
    raise exception 'remediation evidence cannot be linked after risk acceptance is recorded for the same remediation task';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_mixed_remediation_choice_from_evidence on evidence_links;
create trigger trg_prevent_mixed_remediation_choice_from_evidence
  before insert or update on evidence_links
  for each row execute function prevent_mixed_remediation_choice_from_evidence();

create or replace function prevent_mixed_remediation_choice_from_acceptance()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from evidence_links el
    where el.tenant_id = new.tenant_id
      and el.target_type = 'remediation_task'
      and el.target_id = new.remediation_task_id
  ) then
    raise exception 'risk acceptance cannot be recorded after remediation evidence is linked for the same remediation task';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_mixed_remediation_choice_from_acceptance on risk_acceptances;
create trigger trg_prevent_mixed_remediation_choice_from_acceptance
  before insert or update on risk_acceptances
  for each row execute function prevent_mixed_remediation_choice_from_acceptance();
