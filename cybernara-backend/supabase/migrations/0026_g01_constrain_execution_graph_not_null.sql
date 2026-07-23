-- Gap remediation — G-01 Constrain stage (spec §24: Design -> Expand -> Backfill -> Dual
-- operate -> Constrain -> Cut over -> Contract).
--
-- Expand (migrations 0013/0017) added `assessment_items.control_instance_id`/`question_version_id`
-- as nullable FKs, dual-written by the application for every assessment created since. Backfill
-- (this session, via `scripts/backfill-g01-execution-graph.mjs`) populated both columns for every
-- pre-existing null row — reconciled to zero remaining nulls, verified directly against the live
-- database both by the script's own reconciliation query and by an independent follow-up query
-- before this migration was written.
--
-- This migration is the Constrain stage: now that every row has both values, make that guarantee
-- durable at the schema level. `assessment_items` has ~1,874 live rows (checked before writing this
-- migration) — small enough that a direct `alter column ... set not null` (which requires one full
-- table scan under an ACCESS EXCLUSIVE lock, held only for the scan's duration) is safe and
-- effectively instant; the `NOT VALID` CHECK-constraint two-step this campaign uses for
-- large/hot tables (e.g. G-02's `findings.assessment_item_id` FK) is unnecessary overhead at this
-- scale, not the default to reach for regardless of table size.
alter table assessment_items alter column control_instance_id set not null;
alter table assessment_items alter column question_version_id set not null;
