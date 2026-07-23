# Schema Remediation — Phase 1 (Guard Rails) Checkpoint

Date: 2026-07-05
Migrations added: `0008_g10_rls_foundation.sql`, `0009_g02_g05_integrity_and_catalog_scope.sql`
Source documents: `Cybernara_Production_Database_Schema_Specification.pdf`, `Cybernara_Database_Schema_Gap_Report.pdf`

## Gaps addressed

- **G-10 (RLS foundation):** every RLS policy in migrations 0001–0007 is keyed on `auth.jwt() ->> 'tenant_id'`, a Supabase/PostgREST helper that reads a GUC PostgREST sets from a verified JWT. This backend never talks to PostgREST for business data (ADR-0001: direct `pg` access) — `auth.jwt()` is always `NULL` on these connections. Independently, the app connects as `SUPABASE_DB_URL`'s `postgres` role, which owns every table these migrations create; PostgreSQL always lets a table owner bypass RLS unless `FORCE ROW LEVEL SECURITY` is also set. Together, these two facts mean RLS has never been an active enforcement layer for this application — isolation has rested entirely on every repository method filtering by `tenant_id` in application code.
- **G-02 (findings FK):** `findings.assessment_item_id` was a bare `uuid not null` column with no foreign key, so a finding could reference an assessment item that never existed or was later deleted.
- **G-05 (catalog scope, groundwork only):** the spec's global-vs-tenant framework-catalog visibility model has no representation at all yet in `framework_content_packs`/`harmonized_controls`/`control_mappings`.

## What was built

1. **`0008_g10_rls_foundation.sql`** — pure "Expand" stage, additive only:
   - `create role app_runtime` — `noinherit`, `login`, with `statement_timeout = 30s` and `idle_in_transaction_session_timeout = 15s`. Not a superuser, cannot bypass RLS, owns nothing.
   - `app_current_tenant()` / `app_current_principal()` — `stable` SQL functions reading `current_setting('app.tenant_id'/'app.principal_id', true)`, safely returning `NULL` (not raising) when unset.
   - One additive `<table>_app_context_isolation` policy per existing tenant table (57 tables, built via a `foreach` loop over a literal array — see the migration's own header comment for why), each `using (tenant_id = app_current_tenant()) with check (...)`, plus baseline `grant select, insert, update, delete on <table> to app_runtime`.
   - `audit_events` gets a read-only pair instead (`for select` / `for insert` policies, no update/delete grant), matching its append-only design.
   - **Deliberately not done:** `FORCE ROW LEVEL SECURITY` (a "Constrain" stage action — enabling it now, while the app still connects as `postgres`, would make every table deny-all immediately) and the connection cutover itself.
2. **`src/platform/database/tenant-scoped-db.ts` (`TenantScopedDb`)** — the mechanism a repository needs to actually benefit from the new policies: opens a transaction, calls `set_config('app.tenant_id', ..., true)` / `set_config('app.principal_id', ..., true)` (transaction-local, safe on pooled connections), runs the caller's queries, commits or rolls back. `PostgresRiskWorkflowRepository` is the first (and, as of this checkpoint, only) repository migrated to use it instead of the raw pool — a deliberate proof-of-mechanism rather than a full cutover.
3. **`0009_g02_g05_integrity_and_catalog_scope.sql`**:
   - A pre-flight `raise exception` check for orphaned `findings.assessment_item_id` rows, then `alter table findings add constraint ... not valid` followed by `validate constraint` (avoids a long table lock and forces explicit orphan handling before the constraint can even be attempted).
   - `owner_scope catalog_owner_scope not null default 'tenant'` (new enum `global`/`tenant`) added to the three catalog tables, as groundwork only.
4. **Extended `scripts/schema-audit.mjs`**: reports `FORCE ROW LEVEL SECURITY` status per table (expected 0 today — a nonzero value would mean a table now denies the owning application), reports `app_runtime` role health (exists, can log in, not a superuser, cannot bypass RLS, session timeout settings), and — critically — parses migration 0008's `tenant_tables` array literal to enumerate the ~57 dynamically-created policy names that a literal-`create policy` regex can never see, so their existence is actually checked against the live database instead of silently assumed.
5. **Extended `scripts/check-migration-conventions.mjs`**: a static, offline drift guard — for every table across all migrations that enables RLS, it must either appear in 0008's `tenant_tables` array or have its own dedicated `app_current_tenant()`-based policy; and everything in that array must correspond to a real, RLS-enabled table. Verified this actually fires by injecting a synthetic "rogue" tenant table into a scratch copy of the migrations directory and confirming the check failed with the expected message, then removing the scratch fixture.

## Data reconciliation (before G-02's FK could be added)

`findings_assessment_item_id_fkey` failed on first attempt: 24 orphaned `findings` rows, each referencing a nonexistent `assessment_items.id`. Investigation (direct queries, not guesswork) showed: one row per distinct synthetic tenant ID, each with exactly one dependent `remediation_tasks` row already in terminal `status = 'risk_accepted'`, all clustered in a narrow timestamp window matching this engagement's own automated Vitest/Playwright runs against live Supabase. Confirmed no further downstream dependents before removing both sets transactionally, and wrote a full audit-trail record (JSON: reconciled-at timestamp, reason, complete row dumps of both removed sets, counts) to the session scratchpad. This was scoped narrowly to provably-orphaned test-fixture pollution, not a general cleanup.

## Verification

- `test/platform-hardening/rls-matrix.test.ts` — 56 tests, all passing against real Supabase, connecting as `app_runtime` (never as the table owner): same-tenant read allowed, cross-tenant read denied, missing-context read denied, forged/unrelated-tenant-context read denied, and mismatched-tenant `WITH CHECK` insert rejected — for one representative table per each of the 7 original migrations plus `risk_acceptances` (migration 0010), plus an explicit test documenting that the table-owner connection still bypasses everything above (the known, deferred limitation, not a bug).
- `test/evidence-risk/a3-schema-integrity.test.ts` — G-02 FK accept/reject cases and G-05 column/enum presence, against real Supabase.
- `scripts/schema-audit.mjs` run against the live database: 60/60 expected tables found and RLS-enabled, 0/60 with `FORCE ROW LEVEL SECURITY` (expected), 121/121 expected policies found (64 literal + 57 previously-invisible dynamic ones, now tracked), `app_runtime` role present with every expected safety property (`canLogin: true`, `bypassRls: false`, `isSuperuser: false`, correct session timeouts), zero `appRuntimeRoleIssues`.
- `npm run migration:lint` passes on the real migrations, and was proven to correctly fail against a synthetic drift scenario.

## Known gaps / explicitly not done in Phase 1

- `FORCE ROW LEVEL SECURITY` is not enabled on any table — by design, per spec §24's staging discipline.
- Only `PostgresRiskWorkflowRepository` uses `TenantScopedDb`; every other repository still opens the raw pool directly. The application still connects to Supabase as `SUPABASE_DB_URL`'s `postgres` role for all of them.
- The `app_runtime` role's password (`change-me-before-production-cutover`, set directly in the migration) is a development placeholder and must be rotated to a secret-managed value before any production cutover — this is called out by name in the migration itself.
- G-05 is groundwork only: no read-path logic yet actually branches on `owner_scope`.

## Next

Phase 2 (a real, tested slice — G-03) is documented in `docs/checkpoints/gap-remediation-phase-2-slice-g03.md`. Full gap-by-gap status and the honest Production Acceptance Checklist walkthrough are in `docs/schema-remediation-report.md`.
