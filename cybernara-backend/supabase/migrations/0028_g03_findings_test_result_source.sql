-- Gap remediation — G-03 remaining shape gap (spec §11/§12): findings must be able to originate
-- from either a manual assessment item OR an automated/manual control test result, not
-- exclusively the former. `assessment_item_id` was `not null` with no alternative source since
-- migration 0003; `control_test_results` (the alternative source's owning table) only came into
-- existence under this session's G-01 Constrain/Cutover work, unblocking this shape fix.
--
-- Backward-compatible and additive: every existing row already has a non-null
-- `assessment_item_id` (that was the only path to create one), so relaxing it to nullable and
-- adding the "at least one source" check is a no-op for existing data — verified by the CHECK
-- constraint's own NOT VALID -> VALIDATE two-step scanning all 1,297 live rows without rejecting
-- any of them.
alter table findings alter column assessment_item_id drop not null;

alter table findings add column test_result_id uuid references control_test_results(id);

alter table findings
  add constraint findings_has_source
  check (assessment_item_id is not null or test_result_id is not null)
  not valid;

alter table findings
  validate constraint findings_has_source;

create index if not exists idx_findings_test_result on findings (tenant_id, test_result_id);
