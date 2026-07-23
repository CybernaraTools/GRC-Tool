-- Gap remediation — G-01 Contract stage (spec §24: Design -> Expand -> Backfill -> Dual operate ->
-- Constrain -> Cut over -> Contract).
--
-- Cutover (this session, prior migration/commit) switched the application's read path
-- (`itemsSelectWithNormalizedFallback()` in postgres-assessment.repository.ts) to source
-- `answer_text`/`evidence_ids`/`applicability` from the normalized, append-only
-- `answer_revisions`/`applicability_decisions` tables as authoritative, falling back to these flat
-- columns only when no normalized record exists. Proven with two real-Supabase tests that force the
-- two paths to diverge and assert the normalized value wins (test/assessment/a2-assessment-api.test.ts,
-- "G-01 Cutover" describe block).
--
-- This migration is a deliberate, narrow Contract-stage action: it does NOT drop the three
-- now-superseded columns. Reasoning, stated plainly rather than glossed over: `insertItem`/
-- `updateItem` in the live repository still dual-write these columns on every mutation (unchanged
-- by Cutover — that was a read-path-only change), and the wider test suite still has raw-SQL
-- fixtures across multiple modules that insert `assessment_items` rows referencing them directly.
-- Dropping the columns now, in the same session Cutover was proven, would be an irreversible
-- data-destroying operation taken with zero elapsed real-world observability window confirming no
-- undiscovered consumer depends on them — exactly the kind of premature Contract step spec §24
-- exists to prevent. A real production rollout would run Cutover through at least one full
-- monitoring/alerting cycle before Contract; this sandboxed campaign has no such cycle to run.
--
-- What this migration DOES do, as real (if narrow) Contract-stage progress: formally mark the
-- columns deprecated in the schema itself, not just in application comments, so any future reader
-- (including a future Contract-stage column-drop migration) has an authoritative, in-schema record
-- of why they still exist and what supersedes them.
comment on column assessment_items.answer_text is
  'DEPRECATED (G-01 Cutover): superseded by answer_revisions (latest revision = current). Still '
  'dual-written by insertItem/updateItem for rollback safety; no longer read as primary — see '
  'itemsSelectWithNormalizedFallback() in postgres-assessment.repository.ts. Column removal '
  'deferred to a future Contract-stage migration once a real deployment has run Cutover through a '
  'monitoring window; not dropped here for lack of that window in this environment.';

comment on column assessment_items.applicability is
  'DEPRECATED (G-01 Cutover): superseded by applicability_decisions (latest decision by '
  'decided_at = current), scoped via control_instance_id. Still dual-written by insertItem/'
  'updateItem for rollback safety; no longer read as primary. Column removal deferred — see the '
  'comment on assessment_items.answer_text for the full reasoning, which applies identically here.';

comment on column assessment_items.evidence_ids is
  'DEPRECATED (G-01 Cutover): superseded by answer_revisions.response_json->''evidenceIds'' '
  '(latest revision = current). Still dual-written by insertItem/updateItem for rollback safety; '
  'no longer read as primary. Column removal deferred — see the comment on '
  'assessment_items.answer_text for the full reasoning, which applies identically here.';
