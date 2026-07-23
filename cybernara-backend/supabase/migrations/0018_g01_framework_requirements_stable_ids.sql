-- G-01 completion follow-up fix (same-session bug, caught by a real regression in
-- test/framework-content/a1-http.integration.test.ts, not by inspection).
--
-- 0017 added `requirement_instances.requirement_id references framework_requirements(id)`,
-- a deliberate cross-tenant FK to the canonical shared catalog (see 0017's header comment).
-- What 0017 did not account for: postgres-framework-content.repository.ts's publishIngestion
-- republishes a content pack's requirements by `delete from framework_requirements where
-- tenant_id = ... and framework_pack_id = ...` followed by a full re-insert with fresh
-- gen_random_uuid() ids on every publish. G-05's fix made republishing the same canonical
-- content idempotent and safe to run repeatedly (see docs/schema-remediation-report.md's G-05
-- incident write-up) — but "idempotent" there meant "does not grow storage", not "preserves row
-- identity". Once any assessment creates a requirement_instances row (as G-01 completion's own
-- dual-write does), a later republish's delete now fails with a foreign key violation, because
-- the delete-and-recreate pattern assumed nothing outside framework-content referenced these
-- rows by id — an assumption 0017 broke.
--
-- The correct fix is to make requirement identity stable across republishes of the same source
-- data, not to relax the FK (which would let requirement_instances point at rows that can
-- vanish under it) and not to cascade the delete (which would silently destroy real assessment
-- execution history — forbidden by this campaign's standing rules). `(tenant_id,
-- source_workbook, source_sheet, source_row_number)` is the natural key already present on every
-- row: it identifies the exact physical spreadsheet cell a requirement came from, and is stable
-- across re-ingestions of the same workbook files. Verified against the live canonical tenant's
-- 3642 existing rows before adding this constraint: zero duplicate groups.
alter table framework_requirements
  add constraint framework_requirements_source_row_key
  unique (tenant_id, source_workbook, source_sheet, source_row_number);

-- Scope note: this migration only adds the constraint. The repository change from
-- delete-then-insert to upsert-on-this-key (preserving `id` and `created_at`, refreshing every
-- other column) is an application-code change, not a schema change — see
-- postgres-framework-content.repository.ts's insertRequirements/publishIngestion. A workbook
-- whose row count genuinely shrinks between publishes (a row disappearing entirely, not just
-- changing) is out of scope here: the current 13 bundled workbooks are fixed fixtures, not
-- user-editable input, so that scenario does not occur in this codebase today. If it ever does,
-- the correct behavior is for that delete to fail loudly (exactly as this constraint now makes
-- it do) rather than silently cascade into deleting real assessment history.
