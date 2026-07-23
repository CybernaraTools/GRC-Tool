-- Migration: 0037_phase17_universal_tasks_framework_update_impact
-- Expands universal_tasks.target_type to accept 'framework_update_impact'.

alter table universal_tasks drop constraint if exists universal_tasks_target_type_check;

alter table universal_tasks add constraint universal_tasks_target_type_check 
  check (target_type in ('remediation_task', 'rights_request_task', 'framework_update_impact'));

drop trigger if exists sync_framework_update_impact_trigger on framework_update_impacts;
drop function if exists sync_framework_update_impact_to_universal();
