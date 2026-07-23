-- Add PRD finding metadata without rewriting existing finding history.
--
-- Existing findings keep nullable metadata until a reviewer enriches them from
-- the dedicated Findings workspace.
alter table findings add column if not exists impact text;
alter table findings add column if not exists likelihood text;
alter table findings add column if not exists owner_id uuid;
alter table findings add column if not exists due_at timestamptz;
