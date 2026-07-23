-- Migration: 0035_phase14_performance_indexes
-- Closes physical design blind spots (G-14) by adding performant composite indexes.

-- Universal tasks query indexes
create index if not exists universal_tasks_owner_idx on universal_tasks (tenant_id, owner_id);
create index if not exists universal_tasks_status_idx on universal_tasks (tenant_id, status);
create index if not exists universal_tasks_due_at_idx on universal_tasks (tenant_id, due_at);

-- Framework update diff items lookup index
create index if not exists framework_diff_items_diff_id_idx on framework_diff_items (tenant_id, diff_id);

-- Framework update impacts query indexes
create index if not exists framework_update_impacts_assessment_idx on framework_update_impacts (tenant_id, assessment_id);
create index if not exists framework_update_impacts_status_idx on framework_update_impacts (tenant_id, status);
