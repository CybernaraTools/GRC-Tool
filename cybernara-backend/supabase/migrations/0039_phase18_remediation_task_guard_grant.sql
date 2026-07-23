-- Migration: 0039_phase18_remediation_task_guard_grant
-- Lets the application role use the explicit legacy-write escape hatch for remediation_tasks.

grant insert, update on table remediation_tasks to app_runtime;
