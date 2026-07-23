# Schema Remediation Campaign — Progress Ledger

**Read this file first, before anything else, at the start of every session.** It is the only
thing that makes "continue" a sufficient instruction across many sessions. Update it before
ending every session — see the campaign directive
(`cybernara-backend/docs/schema-remediation-report.md` §1 for the first-pass account, this file
for live status).

Source documents (both fully re-read in full on 2026-07-06, not worked from memory/summary):
`Cybernara_Database_Schema_Gap_Report.pdf`, `Cybernara_Production_Database_Schema_Specification.pdf`
(both at `C:\Users\Srinjoy Roy\Downloads\`).

## Environment blocker status (Section 4 of the campaign directive)

**RESOLVED on 2026-07-06.** Full detail below is kept for the record (the actual root cause
differed from the campaign directive's disk-space hypothesis, and future sessions should not
waste time re-diagnosing this if it somehow looks like it's recurring — check the "operational
notes" subsection first).

**The canonical working directory for this entire campaign is now
`C:\dev\GRC_Tool` (not the OneDrive path).** The OneDrive copy at
`C:\Users\Srinjoy Roy\OneDrive\Desktop\GRC_tool\GRC_Tool` still exists untouched (not deleted —
no destructive action was taken on it) but is no longer where work happens. **Every future
session must `cd` into `C:\dev\GRC_Tool\cybernara-backend` or `...\cybernara-frontend`
explicitly at the start of every single shell command** — this sandbox's Bash tool resets its
persistent working directory back to the OneDrive path between tool calls for reasons outside
this repo's control (observed repeatedly during this session), so relying on a `cd` from a
previous command carrying forward will silently put you back in the broken OneDrive copy.

Also set persistently for the Windows user profile (survives new terminal sessions/reboots):
`PLAYWRIGHT_BROWSERS_PATH=C:\dev\playwright-browsers`. The old `D:\playwright_browsers` is
untouched but irrelevant now — `D:` is still at 100% full (0 bytes free) and should not be used
for anything.

### What the campaign directive got right vs. wrong, and the actual root cause

- Right: OneDrive was indeed involved, and disk space was indeed a real, separate problem
  (`D:` drive at 100% full, 0 bytes available, and `PLAYWRIGHT_BROWSERS_PATH` did point there).
- Wrong: disk space was **not** the cause of the "0 tests found" symptom. Proved this by
  redirecting `PLAYWRIGHT_BROWSERS_PATH` to a fresh `C:` path and re-running
  `npx playwright test --list` from the *original* OneDrive location — still `0 tests in 0
  files`. Browser binaries are only needed at test-execution time, not file-discovery time, so a
  missing/corrupt browser install could never explain a discovery-phase failure.
- Actual cause, confirmed by temporarily instrumenting Playwright's own installed loader
  (`node_modules/playwright/lib/runner/projectUtils.js` — patched, reproduced, then reverted and
  `diff`-confirmed clean) and by direct Node reproduction: every file under the OneDrive-synced
  folder carries the NTFS `ReparsePoint` attribute (OneDrive Files-On-Demand's placeholder
  mechanism — present even for fully-downloaded/hydrated files, not just cloud-only ones,
  confirmed since file content read instantly with no download delay). On Windows, Node's
  `fs.readdir(dir, { withFileTypes: true })` misreports these reparse-point entries as symbolic
  links (`Dirent.isSymbolicLink() === true`, `Dirent.isFile() === false`) rather than regular
  files. Playwright's own file collector only pushes entries where `isFile()` is true, so it
  silently found zero test files from any directory under OneDrive sync on this machine,
  regardless of `testDir`/`testMatch`/`.gitignore`/Playwright version — none of those were the
  bug. This also explains the earlier, separately-observed `.next/build-manifest.json`
  `EINVAL: invalid argument, readlink` error (same reparse-point-vs-Node interaction, different
  code path hitting it).

### Fix applied

Presented three options to the user (move the repo out of OneDrive; disable OneDrive
Files-On-Demand account-wide via Windows Settings; a git-worktree side-location stopgap). User
chose **relocate out of OneDrive**. Executed:
1. `robocopy` (with `/E` and excluding `node_modules`, `.next`, `out`, `dist`, `coverage`,
   `playwright-report`, `test-results`, `blob-report`, `*.tsbuildinfo`) from the OneDrive path to
   `C:\dev\GRC_Tool`. Confirmed via `Get-Item -Force ... | Select Attributes` that copied files
   show only `Archive` (no `ReparsePoint`) at the new location.
2. Confirmed via direct Node repro that `Dirent.isFile()` now correctly returns `true` for every
   e2e spec file at the new location.
3. `npm install` in both `cybernara-backend` and `cybernara-frontend` at the new location (fresh
   `node_modules`, not copied). `.env` files for both were included in the robocopy (not
   excluded) and confirmed present at the new location — no secrets needed to be re-entered.
4. Confirmed both git repos (`cybernara-backend/.git`, `cybernara-frontend/.git`) came across
   intact — `git status --short` at the new location shows the exact same working-tree diff as
   before the move, nothing lost.
5. `npx playwright test --list` from the new location: **14 tests in 8 files** — real discovery
   confirmed, versus `0 tests in 0 files` before.
6. Installed Chromium fresh to `C:\dev\playwright-browsers` (`npx playwright install chromium`;
   the default Azure CDN mirror timed out once, the Akamai fallback mirror succeeded
   automatically — no action needed if this happens again, Playwright retries mirrors on its
   own).
7. Ran the full e2e suite once from the new location to establish a real baseline (see below).

### Real e2e baseline established 2026-07-06 (before any campaign gap work touches the frontend)

`npx playwright test` (all 8 spec files, 14 tests): **6 passed, 8 failed.** Every one of the 8
failures is the *same* axe-core `color-contrast` violation, detected on authenticated app-shell
screens. This is a real, confirmed pre-existing issue relative to this campaign (it was already
true before any G-01–G-14 work started, and is not caused by anything this campaign has done) —
**but it is not an old/pre-existing issue in an absolute sense, and I initially described it too
loosely as "pre-existing" before checking. Checked properly on request and corrected:**

- `cybernara-frontend/docs/integration-audit-report.md` (written before this campaign, against
  the git-committed baseline) explicitly records these same axe scans as clean:
  `"Axe accessibility assertions (including /login) | PASS — ... axe scans embedded in F2/F5/F6
  specs also passed (no serious/critical violations reported in any run)"`. So the violation is
  not something that has always been there.
- `git log --oneline --all` on `cybernara-frontend` shows exactly one commit
  (`a1135a7 Initial commit: fix pass baseline`). `git diff --stat app/styles.css` against that
  commit shows a large uncommitted rewrite (599 insertions / 225 deletions) — this is the
  monochrome "Audit-Grade Precision" design-system redesign done in an earlier work session
  *after* that clean audit baseline, and it has never been committed.
- Root-caused precisely by running axe standalone against the authenticated dashboard: `<code>`
  elements render `color: var(--ink-muted)` (`#5d5f5f`) on a `#111111` background wherever a
  `<code>` chip sits inside a dark-background card (e.g. the assessment "SNAPSHOT" identifier
  chip) — measured contrast ratio 2.93, needs 4.5:1. `app/styles.css:170-175` is the rule; it's
  shared by `p`, `.label`, `.sectionHeader span`, `small` too, but those apparently sit on
  lighter backgrounds elsewhere and don't trip the same failure — `<code>` on a dark card is the
  specific combination that fails.

**Conclusion: this is a real regression, introduced by the uncommitted monochrome redesign work,
not part of any of this campaign's 14 gaps, and not something this campaign is responsible for
having caused.** It correctly does not block or count against this campaign's own "no
regressions" gate (nothing in G-01–G-14 work created it or makes it worse), but it is a genuine
defect and should not be silently absorbed into "expected failures" without this note. It is
**out of scope for this campaign** per the "do not touch anything outside what a specific gap's
remediation requires" rule — flagged here for the user's awareness and left as a separate,
already-known issue for them to decide whether to fix outside this campaign (the fix is
localized: change `code`'s color rule in `app/styles.css` to something that meets 4.5:1 against
`#111111`, e.g. a lighter tint of `--ink-muted`, and re-run the same standalone axe check to
confirm). The honest e2e baseline to compare future campaign runs against is **6 passed / 8
failed with all 8 failures being this identical, already-explained `color-contrast` finding**,
not 14/14.

### Operational notes for future sessions

- Always `cd "C:\dev\GRC_Tool\cybernara-backend"` or `cd "C:\dev\GRC_Tool\cybernara-frontend"`
  explicitly at the start of every shell command in this campaign (see above — cwd does not
  persist as expected in this sandbox).
- When running Playwright directly (not through `npm run e2e`), you may still need to pass
  `PLAYWRIGHT_BROWSERS_PATH=C:\dev\playwright-browsers` inline if the persisted user env var
  hasn't propagated to a given shell (observed: PowerShell `SetEnvironmentVariable(...,"User")`
  takes effect in *new* processes, not the current one) — check with
  `echo $PLAYWRIGHT_BROWSERS_PATH` first; set inline if empty/wrong.
- `D:` drive is still 100% full. Do not write anything there. This was not fixed and is not part
  of this campaign's scope — flag it to the user separately if it becomes a blocker for something
  else.
- **Any test that publishes real framework/harmonization content to the live Supabase project
  must target `CANONICAL_CONTENT_TENANT_ID` (`src/modules/framework-content/domain/
  canonical-catalog.ts`), never a fresh `randomUUID()` per run** — every ingestion conflict key in
  `postgres-framework-content.repository.ts` is scoped by `tenant_id`, so a fresh tenant id per run
  always creates a brand new full copy instead of deduping. This is exactly what filled the
  project's free-tier storage on 2026-07-06 (see the G-05 row in the gap table above and the
  incident write-up in `schema-remediation-report.md`). If a *new* test genuinely needs an
  isolated, disposable tenant (e.g. to test repository mechanics with synthetic fixture data, like
  `a1-persistence-and-service.test.ts` does), it must clean up its own rows in `afterAll` — don't
  add a third pattern without one or the other of these two safeguards.
- If Supabase storage usage looks unexpectedly high again in the future, the fastest diagnostic is
  `select count(*), count(distinct tenant_id) from <table>` on `framework_requirements`,
  `control_mappings`, `content_rejected_records`, `harmonized_controls`,
  `framework_content_packs`, `content_source_packages` — a `distinct_tenants` count greater than 1
  on any of these six tables means the duplication bug has recurred (it should always be exactly
  1: the canonical tenant).

## Gap status summary

| Gap | Severity | Status | Notes |
|---|---|---|---|
| G-01 | Critical | in progress — **all 15 target tables now built 2026-07-06** (Expand+Dual-operate complete; Backfill/Constrain/Cutover/Contract not started; legacy shape still primary read path) | Assessment execution normalization — the largest gap. Phase 1 (`0013_g01_assessment_execution_normalization.sql`) built 9 tables: `assessment_scopes`, `assessment_frameworks`, `assessment_snapshots`, `control_instances`, `applicability_decisions`, `answer_revisions`, `review_decisions`, `test_procedures`, `control_test_results`; plus additive columns on `assessment_items` (`control_instance_id`, `sequence_no`, `required`). Completion (`0017_g01_completion_remaining_tables.sql`) built the 4 explicitly-deferred tables: `requirement_instances` (deliberate cross-tenant FK to canonical `framework_requirements`), `question_sets`/`question_versions` (tenant-scoped governed catalog, reconciled with pre-existing `ai_question_versions` via a new nullable `source_ai_question_version_id` link), `assessment_signoffs` (wired into `AssessmentService.close()`); plus `assessment_items.question_version_id`. A same-session regression was found and fixed: `requirement_instances`' new FK broke framework-content's delete-then-reinsert republish pattern once any assessment referenced a requirement — fixed via `0018_g01_framework_requirements_stable_ids.sql` (adds a natural-key unique constraint) plus an application-code change from delete+insert to upsert-on-that-key, preserving row identity across republishes. All 15 tables have dual-write, real Supabase integrity tests (34 tests in `test/assessment/g01-execution-graph.test.ts`), and RLS coverage. **Confirmed NOT closed**: 963 of 1071 live `assessment_items` rows still have `control_instance_id is null` (pre-dual-write rows never backfilled) and 1051 of 1071 have `question_version_id is null` — Backfill has not been run. Constrain/Cutover/Contract (making new tables authoritative, switching reads, dropping legacy flat columns) are untouched. |
| G-02 | Critical | **closed** (first pass) | `findings.assessment_item_id` FK. See `schema-remediation-report.md`. |
| G-03 | Critical | in progress (`risk_id` linkage now wired 2026-07-06; two remaining shape gaps still open) | `risk_acceptances`/`risk_acceptance_reviews` built and tested against the *current* domain model. **2026-07-06: `risk_acceptances.risk_id` (nullable FK to G-09's new `risks` table) added via migration `0019`, threaded through `createRiskAcceptance`/`acceptRisk`/the HTTP `risk-acceptance` endpoint's optional `riskId` field, and proven end-to-end by a real HTTP test (see G-09 write-up).** This was the specific linkage G-03's own migration comment (`0010`) flagged as blocked on G-09 not existing — now unblocked. Still open, unrelated to G-09: spec shows `findings.assessment_item_id FK nullable, test_result_id FK nullable` with "at least one source" check, and current build doesn't yet match this exact shape (built before this session's full re-read) — revisit once `test_result_id`'s owning table exists. |
| G-04 | Critical | **closed (2026-07-06)** | Report immutability. Root cause: `download()` re-rendered the PDF/XLSX from live assessment state on every call (defensively checking the hash still matched) instead of serving a frozen artifact — exactly the gap report's RPT-01 finding. Fixed: `report_exports` persists the actual rendered bytes (`artifact_bytes bytea`) plus real FK links to `assessment_snapshots` (G-01, reused rather than building a duplicate `report_snapshots` table — see report for reasoning) and a new `report_templates` table; `download()` now serves the persisted bytes directly, falling back to the legacy re-render path only for pre-migration exports. Also discovered and fixed: `export_manifests` already existed (migration 0007, unused groundwork, same pattern as G-05's `owner_scope`) — extended rather than duplicated. Migrations `0014`/`0015`/`0016` (the latter two are same-session fixes for columns referenced by application code but never actually added by 0014 — caught via real HTTP requests, not assumed). Real KMS-backed signing is not built (no KMS integration exists anywhere in this codebase); `signature` is a local SHA-256-based placeholder, named honestly as weaker than spec's target. Decisive test: creates an assessment, requests an export, directly mutates the live `assessment_items` row out-of-band, downloads again, and asserts byte-identical output — proving re-render doesn't happen. 202/202 backend tests passing (+13 new). Playwright e2e blocked by the same pre-existing, already-flagged hang (`task_5d0eacf4`) before reaching the report-request step in 3 attempts; real HTTP-level integration test (same NestJS app, controllers, guards) is the practical substitute evidence. |
| G-05 | High | in progress — **duplication/storage incident resolved 2026-07-06; target-state restructuring still queued** | `owner_scope` enum/column added to 3 catalog tables (first pass), still completely unread/unwritten by any query. **2026-07-06 incident:** the live Supabase project hit its free-tier storage limit (558 MB) because `test/framework-content/a1-http.integration.test.ts` published the entire real framework/harmonization corpus (~9,213 rows) under a fresh `randomUUID()` tenant on every test run, with every ingestion conflict/idempotency key scoped by `tenant_id` — so re-ingesting standard content under a new tenant always created a full new copy rather than deduping. Forensics found 106 distinct orphan tenant IDs (52 full-corpus copies + 54 minimal-fixture copies), none registered in `identity_tenants`, with a clean bimodal row-count signature and timestamps spanning 2026-07-02 to 2026-07-05 — decisive proof of the mechanism, not a guess. Root cause fixed: a new `CANONICAL_CONTENT_TENANT_ID` constant (`src/modules/framework-content/domain/canonical-catalog.ts`, formalizing what `src/modules/framework-content/cli/validate-source-content.ts` already used as an undocumented literal) is now used by `a1-http.integration.test.ts` instead of a fresh UUID, so repeated runs upsert in place (zero growth, proven via two consecutive re-runs and one full 27-file suite run — row/tenant counts identical every time); `a1-persistence-and-service.test.ts`'s minimal-fixture test now cleans up its own disposable tenant in `afterAll`. Cleanup executed via stage-canonical/truncate/reinsert (recorded in full in `schema-remediation-report.md`): DB size **558 MB → 48 MB**. **This closes the operational incident, not G-05 itself** — spec §9 still wants a much bigger structure: `source_packages`, `frameworks`, `framework_versions` (separate from current single `framework_content_packs`), `control_sets`, `controls`, `control_subcontrols`, `mapping_versions`, `control_mappings` (restructured), `mapping_reviews`, `mapping_conflicts`, `tenant_catalog_subscriptions`, plus the actual global-vs-tenant visibility model (RLS policies distinguishing "my tenant's rows" from "global rows visible to everyone" — `owner_scope` still isn't read anywhere). None of that target-state work happened here; G-05 remains `in progress`, not `closed`, until it does. |
| G-06 | High | in progress — **Phase 1 slice built and tested 2026-07-06** (the 5 nouns the gap sentence names; `model_providers` and the `prompt_templates`/`prompt_versions` identity split deferred with named reasons) | AI provenance. Gap sentence: "No explicit retrieved chunks, citations, safety checks, evaluation suites/cases/results or publication approval." Migration `0020_g06_ai_provenance_lineage.sql` builds 9 new tables: `knowledge_chunks`, `retrieval_runs`, `retrieved_chunks` (retrieved chunks); `generation_citations` (citations); `safety_checks` (safety checks); `evaluation_suites`, `evaluation_cases`, `evaluation_results` (evaluation suites/cases/results — reusing the pre-existing `ai_evaluation_runs` as the run identity via an additive `suite_id` FK, not a second "evaluation_runs" concept); `ai_publication_events` (publication approval — `AiOrchestrationService.publishQuestion` now persists a real row here instead of only emitting an outbox event). See `schema-remediation-report.md` for full build/test detail. |
| G-07 | High | **built and tested 2026-07-06 — full spec §11 in one pass** (user-confirmed via AskUserQuestion, not phased) | Evidence graph. Gap sentence: "Evidence objects are not fully linked to control instances, questions, tests, periods, requests or reviews. Add evidence_links, evidence_versions, requests, reviews, samples and retention actions." Migration `0021_g07_evidence_graph.sql` builds all 10 spec §11 tables: `evidence_versions` (split from `evidence_objects`, which additively gains nullable `title`/`source_type`/`retention_until`), `evidence_links`, `evidence_requests`, `evidence_reviews`, `automated_tests`, `automated_test_runs`, `evidence_samples`, `malware_scan_results`, `evidence_expiry_events`, `evidence_custody_events`. See `schema-remediation-report.md` for full build/test detail. |
| G-08 | High | **built and tested 2026-07-06 — absolute full spec §13 in one pass** (user-confirmed via AskUserQuestion, minus the 5 tables G-12 explicitly claims as its own) | Privacy normalization. Gap sentence: "Processing, purposes, lawful bases, recipients, transfers and retention relationships are compressed into arrays/JSON. Create typed entities and join tables with effective dating and deletion workflow." Migration `0022_g08_privacy_normalization.sql` builds 22 new tables (`systems_assets`, `data_categories`, `data_subject_categories`, `data_discovery_scans`, `data_discovery_findings`, `privacy_notices`, `privacy_notice_versions`, `processing_inventory_links`, `purposes`, `lawful_bases`, `processing_purposes`, `recipients`, `processing_recipients`, `transfers`, `dpias`, `dpia_risks`, `rights_request_tasks`, `consent_purposes`, `consent_events`, `incident_assessments`, `incident_notifications`, `retention_rules`) plus additive columns on `data_inventory_records`/`processing_activities`, deferring `retention_assignments`/`legal_holds`/`legal_hold_items`/`deletion_jobs`/`deletion_items` to G-12 (which explicitly claims them in its own gap sentence). See `schema-remediation-report.md` for full build/test detail. |
| G-09 | High | in progress — **Phase 1 slice built and tested 2026-07-06** (the 6 nouns the gap sentence names; broader normalization deferred with named reasons) | Enterprise GRC depth. Gap sentence: "No complete risk, treatment, access-review item, vendor assessment, audit request/test or policy attestation model." Spec §12/§14 back this with ~20 target tables across two sections; Phase 1 (migration `0019_g09_enterprise_grc_risk_register.sql`) builds the 13 genuinely new tables needed to make all 6 named nouns real: `risk_models`, `risks`, `risk_links`, `risk_treatments` (the risk register); `policies` (new stable identity) + `policy_control_links` + `policy_attestations` (extending pre-existing `policy_versions`); `access_review_items` + `access_review_decisions` (extending pre-existing `access_reviews`); `vendor_assessments` + `vendor_findings` (extending pre-existing `vendors`); `audit_requests` + `audit_tests` (extending pre-existing `audit_engagements`, the latter linked to G-01's `control_instances`). Also completes G-03's deferred `risk_acceptances.risk_id` linkage. Deferred with named reasons (not in the gap sentence): `policy_exceptions`, `access_remediations`, `vendor_services`/`contracts`, `trust_access_requests`/`trust_activity_events`, `questionnaire_engagements`/`items`/`responses`, and `custom_field_definitions`/`custom_records`/`custom_values` (the last three are G-13's scope, not G-09's). See `schema-remediation-report.md` for full build/test/bug detail. |
| G-10 | High | **closed** (2026-07-06) | Full Design→Expand→Backfill→Dual operation→Constrain→Cut over→Contract cycle complete: all 13 repositories on `TenantScopedDb`, app connects as `app_runtime` via `SUPABASE_APP_RUNTIME_DB_URL`, `FORCE ROW LEVEL SECURITY` enabled on all 58 tenant tables, defense-in-depth cross-tenant tests pass through the real app wiring, backend gate 162/162, e2e verified. See `schema-remediation-report.md` for full closure detail. |
| G-11 | Medium | **built and tested 2026-07-06** | Audit hash chain hardening. Gap sentence: "Previous-hash model lacks documented per-tenant ordering and concurrency strategy. Add monotonic sequence, chain partition, unique constraints, signing checkpoints and verifier results." Migration `0024_g11_audit_hash_chain_hardening.sql` adds `chain_partition` (generated from `tenant_id`) + a new `unique(chain_partition, sequence)` index to the existing `audit_events`, and 2 new tables: `audit_checkpoints`, `audit_verifications`. The real gap underneath the gap sentence — a genuine TOCTOU race in `AuditLogService.append()` (read-latest-hash and insert were two independent transactions with no lock) — is fixed with a `pg_advisory_xact_lock` per `chain_partition`, proven by a real concurrency test firing 12 simultaneous appends for one tenant and confirming a gap-free, correctly-chained 1..12 sequence. See `schema-remediation-report.md` for full build/test/bug detail. |
| G-12 | Medium | **built and tested 2026-07-06** | Retention and deletion lifecycle. Gap sentence: "Schedules exist but no subject/object holds, deletion jobs, proof or cryptographic erasure workflow. Add holds, retention assignments, deletion jobs/items and destruction attestations." Migration `0023_g12_retention_deletion.sql` builds the exact 5 tables deferred out of G-08 for this reason: `retention_assignments`, `legal_holds`, `legal_hold_items`, `deletion_jobs`, `deletion_items`. Real workflow behavior implemented per spec §22 ("Legal holds resolve to explicit protected objects before deletion"): `createDeletionItem` overrides the requested disposition to `blocked_by_hold` (and refuses key destruction) whenever an active, unreleased legal hold covers the exact target — proven end-to-end via a real HTTP test. See `schema-remediation-report.md` for full build/test detail. |
| G-13 | Medium | **built and tested 2026-07-06 — the 14th and final gap** | Custom platform metadata. Gap sentence: "Definitions exist without fields, records, values, validation, permissions or workflow binding." Migration `0025_g13_custom_platform.sql` adds 2 additive columns (`status`, `validation_schema`) to the pre-existing `custom_object_definitions` (migration 0006) plus 3 new tables: `custom_field_definitions`, `custom_records`, `custom_values`. Real "validation" business logic (not just a schema column): `EnterpriseGrcService.createCustomValue` rejects a missing value when the field is `required`, and rejects a value whose JSON type doesn't match the field's `dataType` — proven end-to-end via real HTTP 400s. See `schema-remediation-report.md` for full build/test detail. |
| G-14 | Medium | in progress (one dynamic-policy tooling blind spot closed in first pass; full breadth per spec §20 — query plans, partition health, physical design, restore verification — not assessed) | `schema-audit.mjs`/`check-migration-conventions.mjs` extended for RLS-policy drift only so far. |

## G-10 — detailed working state (current priority)

**Status:** in progress. Phase 1 ("Expand" stage) fully closed and tested in the first pass.
Constrain/Cut over stages not started.

**Done:**
- Migration `0008_g10_rls_foundation.sql`: `app_runtime` role, `app_current_tenant()`/
  `app_current_principal()` functions, additive RLS policy per tenant table (57 tables via the
  `tenant_tables` array + `audit_events`'s dedicated pair).
- `src/platform/database/tenant-scoped-db.ts` (`TenantScopedDb`): the mechanism.
- `PostgresRiskWorkflowRepository` migrated to use `TenantScopedDb` — the only one so far.
- `test/platform-hardening/rls-matrix.test.ts`: 56 tests proving the policies work correctly when
  connecting as `app_runtime`.

**Not done — this is the next concrete action, in this order:**
1. Enumerate every other repository in `src/modules/*/infrastructure/*.repository.ts` that still
   takes `@Inject(DATABASE_POOL) pool: pg.Pool` directly (grep for this pattern — as of the first
   pass this is every repository except risk-workflow's). List them in this ledger before
   starting, so the migration can be tracked module-by-module across sessions.
2. For each one: change its constructor to `@Inject(TenantScopedDb) private readonly db:
   TenantScopedDb`, wrap every query method body in `this.db.withTenant(tenantId, actorId, async
   (client) => { ... })` (read methods pass `undefined` for actorId, matching the pattern already
   used in `PostgresRiskWorkflowRepository`), update every call site/test that constructs the
   repository directly with a raw pool (the same fix already applied once in
   `test/evidence-risk/a3-evidence-risk-api.test.ts` for risk-workflow — expect to repeat this
   fix in every module's real-Supabase integration test file).
3. Once **every** repository is migrated: change `src/platform/database/database.module.ts`'s
   `databaseProvider` to build its connection string using the `app_runtime` role instead of
   `postgres` (needs a new env var, e.g. `SUPABASE_APP_RUNTIME_DB_URL`, or construct it from
   `SUPABASE_DB_URL` by swapping the username the way the RLS matrix test does — decide and
   document whichever is chosen). Rotate `app_runtime`'s password out of the migration's literal
   `'change-me-before-production-cutover'` into whatever secret mechanism `.env`/`.env.example`
   already uses for other secrets, via a new migration (`ALTER ROLE app_runtime WITH PASSWORD
   ...`) — do **not** leave the placeholder in place at cutover.
4. Add a new migration enabling `FORCE ROW LEVEL SECURITY` on every tenant table (only after step
   3 is verified working end-to-end, per the spec's own Constrain-stage ordering — enabling
   FORCE before the app actually connects as `app_runtime` would deny-all immediately).
5. Re-run the *entire* backend test suite (not just `rls-matrix.test.ts`) after each of steps 2/3/4
   — every real-Supabase integration test in every module now runs through the actual `app_runtime`
   connection path, which is the real proof `G-10` asked for ("proven through the real application
   code path, not a side-channel test role").
6. Add/update a test that specifically proves cross-tenant access is blocked *through the running
   application's own repositories* post-cutover (not just the separate `rls-matrix.test.ts` harness
   connecting directly as `app_runtime`) — e.g. instantiate two tenants' worth of data through the
   real service layer and assert a service call scoped to tenant A cannot read tenant B's rows
   even if a caller supplied tenant B's ID by mistake at a lower layer (defense-in-depth proof,
   not just "the app filters correctly," since that's the exact assumption RLS is supposed to
   backstop).
7. Playwright e2e proving the cutover didn't break any real user-facing flow (blocked on the
   environment decision above).

**Repository migration checklist — verified 2026-07-06 via
`grep -rl "DATABASE_POOL" src/modules/*/infrastructure/*.ts` (this is the authoritative list;
`platform-hardening` has no repository using `DATABASE_POOL` directly, so it is not in this list
— verify that's still true rather than assuming, if platform-hardening ever grows a repository):**
- [x] `risk-workflow` — done (first pass, proof of mechanism)
- [x] `evidence-assurance` — done 2026-07-06. `PostgresEvidenceAssuranceRepository` now takes
      `@Inject(TenantScopedDb)`; every method wraps its query in `this.db.withTenant(...)`.
      Fixed the one real-Supabase test construction site
      (`test/evidence-risk/a3-evidence-risk-api.test.ts:79`,
      `new PostgresEvidenceAssuranceRepository(repositoryPool)` →
      `...(repositoryDb)` — `repositoryDb` already existed in that file from the risk-workflow
      fix). Verified: `npx tsc --noEmit` clean, `test/evidence-risk/*` (4 files, 32 tests) all
      pass against real Supabase, full backend gate re-run clean (152/152, unchanged from
      before this repository's migration — no regressions).
- [x] `assessment` — done 2026-07-06. `PostgresAssessmentRepository` migrated. More involved than
      evidence-assurance: `createAssessment` previously managed its own manual
      `begin`/insert-loop/`commit` transaction and then called `this.findAssessment(...)` *after*
      commit on a separate connection to re-read what it just wrote — restructured so the whole
      thing (insert + item loop + read-back) runs inside one `withTenant` transaction, reading
      back via the same `client` before commit (read-your-own-writes within the transaction,
      which is fine). The private `recordWithItems` method (previously used `this.pool` directly)
      became a plain module-level function `recordWithItems(client, row)`; added
      `findAssessmentWithClient(client, tenantId, assessmentId)` so `createAssessment` and
      `findAssessment` share the read-back logic instead of one calling the other across
      connections. `insertItem`'s parameter type changed from `pg.PoolClient` to
      `TenantScopedClient`. Fixed 2 real-Supabase test construction sites:
      `test/assessment/a2-assessment-api.test.ts:49` and
      `test/reporting-analytics/a4-reporting-api.test.ts:64` (both needed a new
      `const repositoryDb = new TenantScopedDb(repositoryPool);` added to the file — neither had
      one yet). Note: `a4-reporting-api.test.ts` also constructs
      `PostgresReportingAnalyticsRepository(repositoryPool)` on the same line block — left
      untouched, that repository is not migrated yet, still expects a raw pool; a comment was
      added in that test file noting the split state so it isn't mistaken for an oversight later.
      Verified: `npx tsc --noEmit` clean, `test/assessment/*` + `test/reporting-analytics/*` (3
      files, 9 tests) pass against real Supabase, full backend gate re-run clean (152/152,
      unchanged).
- [x] `framework-content` — done 2026-07-06. `PostgresFrameworkContentRepository` migrated —
      largest one so far (~700 lines, 6 public methods + 5 private upsert/insert helper
      functions, all retyped from `pg.PoolClient` to `TenantScopedClient`). `publishIngestion`
      previously managed its own `pool.connect()`/`begin`/`commit`/`rollback`/`release` block
      directly; restructured into a single `withTenant` call, same as `assessment`'s
      `createAssessment` before it. Fixed 2 real construction sites (not just tests this time):
      `test/framework-content/a1-persistence-and-service.test.ts:29` (added
      `const repositoryDb = new TenantScopedDb(pool);`) and, notably,
      `src/modules/framework-content/cli/validate-source-content.ts:28` — a real CLI script
      (`npm run content:validate`), not a test, that also constructed this repository directly
      with a raw pool; wrapped it in `new TenantScopedDb(pool)` the same way.
      **One legitimate timeout adjustment, not a correctness change:** the persistence test
      (`a1-persistence-and-service.test.ts`'s first `it`) started timing out at the default 5000ms
      vitest limit — confirmed by running it in isolation (passed in 4.59s, right at the edge) that
      this is genuine added latency from `withTenant`'s per-call connect/begin/commit/release
      overhead across the test's 6 sequential repository calls (2× `publishIngestion`,
      `countRows`, `listContentPacks`, `listRequirements`, `listRejectedRecords`), not a bug.
      Added an explicit `}, 30_000);` timeout to that one `it()` — no assertion, expectation, or
      test logic was touched. Expect this same timeout-margin issue to recur on other
      multi-call-per-test real-Supabase tests as more repositories are migrated; the fix each time
      is the same explicit per-test timeout bump, not touching what's being asserted.
      Verified: `npx tsc --noEmit` clean, `test/framework-content/*` (3 files, 6 tests) pass, full
      backend gate re-run clean (152/152, unchanged).
- [x] `harmonization` — confirmed independent of `framework-content` 2026-07-06 (checked on
      request before starting either migration, not assumed): separate repository file
      (`src/modules/harmonization/infrastructure/postgres-harmonization.repository.ts`, 5.3KB vs.
      framework-content's 24KB), separate `harmonization.module.ts` with its own
      `HARMONIZATION_REPOSITORY` DI token, no cross-import. Migrated 2026-07-06 — the simplest one
      yet: all 4 methods (`listControls`, `findControl`, `listMappingsByControl`,
      `listMappingsByFramework`, `listUniqueControlsByFramework`) are read-only, no manual
      transaction management to restructure. `grep -rln "new PostgresHarmonizationRepository" src/
      test/` found **zero** direct construction sites — this repository is only ever built
      through NestJS DI (`useClass` in `harmonization.module.ts`), so no test/CLI fixes were
      needed at all. Verified: `npx tsc --noEmit` clean,
      `test/framework-content/a1-http.integration.test.ts` (which exercises harmonization's HTTP
      endpoints through the real DI-wired repository) passes, full backend gate re-run clean
      (152/152, unchanged).
- [x] `ai-orchestration` — done 2026-07-06. `PostgresAiOrchestrationRepository` migrated (~560
      lines, 6 public methods, 3 with manual transaction management restructured into
      `withTenant`). Same `recordWithClient`-style refactor as `assessment`/`framework-content`:
      extracted `findGenerationRunWithClient(client, tenantId, generationRunId)` and
      `recordWithQuestions(client, row)` as module-level functions so `createGenerationRun` and
      `recordReview` can read back within the same transaction instead of calling `this.` methods
      across connections. One new failure mode not seen in prior migrations: 4 `npx tsc --noEmit`
      errors (`Type 'unknown' is not assignable to ...`) appeared at `upsertPrompt`/`upsertModel`/
      `upsertRetrieval`'s return-object construction — these functions were doing
      `status: row.status` with no cast, which silently worked when `client.query()` returned
      `pg.QueryResult<any>` (the old raw-pool typing) but now genuinely fails because
      `TenantScopedClient.query<T>` defaults `T` to `Record<string, unknown>`. **This is a real,
      correct type error the migration surfaced, not a regression to work around** — fixed by
      adding explicit `as PromptVersion["status"]` / `as ModelDeployment["riskTier"]` /
      `as ModelDeployment["status"]` / `as RetrievalIndex["status"]` casts, matching the casting
      style already used elsewhere in the same file (`mapGeneration`/`mapQuestion`). Only one
      construction site to fix: `test/ai-orchestration/a5-ai-api.test.ts:67`. No timeout issues
      this time. Verified: `npx tsc --noEmit` clean, `test/ai-orchestration/*` (2 files, 9 tests)
      pass, full backend gate re-run clean (152/152, unchanged).
      **Watch for this same "unknown is not assignable" pattern in every remaining repository** —
      any `row.someField` assigned directly to a typed field without a cast will surface the same
      way once migrated; it's a real type-safety improvement from the migration, not a nuisance to
      suppress.
- [x] `integration-platform` — done 2026-07-06. `PostgresIntegrationPlatformRepository` migrated
      (~660 lines, 13 public methods, 1 with manual transaction management — `createSyncRun`,
      restructured into `withTenant`). This file already cast every `row.field` with an explicit
      `as SomeType["field"]` everywhere (unlike `ai-orchestration`), so no "unknown is not
      assignable" errors appeared this time — confirms that failure mode is specific to files
      that were relying on implicit typing, not universal. Fixed 1 test construction site
      (`test/integration-platform/a6-integration-api.test.ts:77`, added
      `const repositoryDb = new TenantScopedDb(repositoryPool);`); zero non-test construction
      sites. No timeout issues. Verified: `npx tsc --noEmit` clean,
      `test/integration-platform/*` (2 files, 7 tests) pass, full backend gate re-run clean
      (152/152, unchanged).
- [x] `privacy-operations` — done 2026-07-06. `PostgresPrivacyOperationsRepository` migrated
      (~580 lines, 18 public methods, none with manual transaction management — every method was
      already a single `pool.query()` call, so this was the most mechanical migration yet, purely
      wrapping each in `withTenant`). Already cast `row.field` properly everywhere via a shared
      `metadata(row)` helper, so no "unknown is not assignable" errors. Fixed 1 test construction
      site (`test/privacy-operations/a7-privacy-api.test.ts:83`); zero non-test sites; no timeout
      issues. Verified: `npx tsc --noEmit` clean, `test/privacy-operations/*` +
      `test/privacy-enterprise/*` (2 files, 6 tests) pass, full backend gate re-run clean
      (152/152, unchanged).
- [x] `enterprise-grc` — done 2026-07-06. `PostgresEnterpriseGrcRepository` migrated (~560 lines,
      14 public methods, none with manual transaction management — same fully-mechanical pattern
      as `privacy-operations`). Already cast every `row.field` properly via a shared `metadata()`
      helper. Fixed 1 test construction site (`test/enterprise-grc/a8-enterprise-api.test.ts:82`);
      zero non-test sites; no timeout issues. Verified: `npx tsc --noEmit` clean,
      `test/enterprise-grc/*` (1 file, 4 tests) pass.
      **One transient full-gate flake worth recording so it isn't mistaken for a real regression
      later:** the first `npm run test` run after this migration showed 4 failures in
      `test/evidence-risk/a3-evidence-risk-api.test.ts` with `TypeError: fetch failed` (a
      network-level error, not an assertion failure) — that file has nothing to do with
      `enterprise-grc`. Re-ran that file alone: 7/7 passed. Re-ran the full gate again: 152/152
      clean. Concluded this was transient resource contention from the full 26-file real-Supabase
      suite running sequentially (each file boots a real NestJS app + HTTP server), not a code
      regression — but recorded here explicitly rather than silently dismissed, per the
      campaign's own "verify, don't assume" standard. If a future session sees a similar isolated
      `fetch failed` failure unrelated to the module just touched, re-running that one file alone
      before concluding it's a regression is the right first step, not immediately investigating
      the code.
- [x] `reporting-analytics` — done 2026-07-06. `PostgresReportingAnalyticsRepository` migrated —
      smallest one yet (~130 lines, 4 methods, all single-query, already properly cast). Fixed
      the construction site that had been explicitly left as a known TODO during the `assessment`
      migration earlier this session (`test/reporting-analytics/a4-reporting-api.test.ts:69`,
      `new PostgresReportingAnalyticsRepository(repositoryPool)` →
      `...(repositoryDb)`, reusing the `repositoryDb` that already existed in the file from
      `PostgresAssessmentRepository`'s fix) — also removed the now-stale explanatory comment
      that said this repository "has not been migrated yet." Zero non-test sites, no timeout
      issues. Verified: `npx tsc --noEmit` clean, `test/reporting-analytics/*` (1 file, 4 tests)
      pass, full backend gate re-run clean (152/152, unchanged).
- [x] `audit-security` — done 2026-07-06. `PostgresAuditRepository` migrated (~145 lines, 4
      methods). **This one surfaced a real, pre-existing security gap, not just a mechanical
      migration** — `findById(eventId)` took no `tenantId` at all (queried `where id = $1`
      globally, across every tenant), and its HTTP route
      (`GET /v1/audit/events/:eventId`) had **no `@UseGuards(PolicyGuard)`/`@RequirePolicy` at
      all** — unlike every other route in this controller. `withTenant` cannot be called without
      a real tenantId, so migrating this method correctly was impossible without first fixing
      the gap that made it impossible — not something to route around. Fixed by:
      1. Adding `tenantId` as a required first parameter to `AuditRepository.findById` /
         `AuditLogService.findById` / `PostgresAuditRepository.findById`, and scoping the query to
         `where tenant_id = $1 and id = $2`.
      2. Adding the missing `@UseGuards(PolicyGuard)` +
         `@RequirePolicy({ resourceType: "audit_event", action: "read", resourceIdParam: "eventId" })`
         to the controller route, threading `context.tenantId` from `readRequestContext(request)`
         (the same pattern every other route in this controller already uses) through to the
         service call.
      3. Wrote 2 new real tests for behavior that had **zero prior test coverage**: a repository
         test proving same-tenant lookup succeeds and cross-tenant lookup returns `null`
         (`test/audit-security/audit-list.test.ts`, new `"AuditSecurity repository findById"`
         describe block), and an HTTP test proving the route now correctly 403s without the
         `audit_event:read` scope and 200s with it (new test in the existing
         `"AuditSecurity HTTP list"` describe block).
      Confirmed no frontend consumer exists for this specific single-event route
      (`grep -rn "audit/events/" cybernara-frontend/src cybernara-frontend/app` — no hits outside
      the generated client), so this fix doesn't break any UI flow.
      Verified: `npx tsc --noEmit` clean, `test/audit-security/*` (2 files, 7 tests, up from 5)
      pass, full backend gate re-run clean (**154/154**, up from 152 — the 2 new tests are the
      only change in count, zero regressions elsewhere).
- [x] `identity-tenant` — done 2026-07-06. `PostgresIdentityTenantRepository` migrated (~70
      lines, 2 methods). `identity_tenants` has `check (tenant_id = id)` — a tenant's own row is
      its own tenant scope, so `tenant.id` doubles as the `withTenant` tenantId. Checked the
      controller for the same missing-guard pattern found in `audit-security`: both
      `IdentityTenantController` routes (`POST /v1/identity/tenants`,
      `GET /v1/identity/tenants/:tenantId`) have no `@RequirePolicy` guard — but concluded
      (unlike `audit-security`, where every sibling route *did* have a guard, making the one
      missing one clearly an oversight) this is consistent across the *entire* controller and is
      very likely deliberate: tenant registration is a bootstrap operation with no tenant context
      to check against yet. Left as-is — did not invent an authorization requirement the design
      doesn't call for.
      **Found and fixed a second, unrelated, genuinely pre-existing bug while writing this
      migration's required real-Supabase test coverage** (this repository had *zero* real-Supabase
      test coverage anywhere before today — only the pure `createTenant` domain-function tests
      existed). Writing the first real HTTP test for
      `POST /v1/identity/tenants` hit `TypeError: Cannot read properties of undefined (reading
      'registerTenant')` — `this.service` was `undefined` inside
      `IdentityTenantController.registerTenant` at request time, despite NestJS reporting clean
      module bootstrap. Confirmed via `git stash` that this reproduces identically on the
      untouched, pre-campaign committed baseline — **not caused by this migration**, simply never
      caught because no test ever exercised this route over real HTTP. Root cause: this was the
      *only* controller in the whole codebase using bare type-based constructor injection
      (`constructor(private readonly service: IdentityTenantService) {}`, no `@Inject(...)`
      token) — every other controller already uses explicit `@Inject(Token)`. This codebase's
      test/dev toolchain (`tsx`/`vitest`, both esbuild-based) doesn't reliably emit/honor
      TypeScript's `design:paramtypes` decorator metadata the way `tsc` proper does, so
      NestJS's type-based-only DI resolution silently failed in that one path. Fixed by adding
      `@Inject(IdentityTenantService)` to match every other controller's established pattern —
      confirmed this alone (nothing else) resolves it via a throwaway repro script, then removed
      the script. **This same bare-constructor-injection pattern is worth a quick grep across any
      remaining controllers in future sessions** (`grep -rL "@Inject" src/modules/*/presentation/*.controller.ts`
      as a starting point) since it's silent until a route actually gets exercised over real HTTP.
      Added 4 new real tests (2 repository-level: same-tenant fetch succeeds, unregistered
      tenant returns null; 2 HTTP-level: full register→fetch round trip, 404 for a nonexistent
      tenant) in `test/identity-tenant/identity-tenant.test.ts`, all against real Supabase.
      Verified: `npx tsc --noEmit` clean, `test/identity-tenant/*` (1 file, 6 tests, up from 2)
      pass, full backend gate re-run clean (**158/158**, up from 154 — the 4 new tests are the
      only change in count). OpenAPI spec needed a `npm run openapi:generate` refresh after the
      `audit-security` controller's new `@Api*Response` decorators earlier in this session —
      done, `openapi:check` and the frontend's `contract:check` both confirmed current afterward.
- [x] `outbox` — done 2026-07-06, **last, as planned, with the extra care flagged in advance.**
      Investigated first (as the earlier note said to): `enqueue()` never shared a transaction
      with its caller even before this migration — every service already calls
      `outbox.publish()` as its own separate `pool.query()`, so there was no existing
      one-transaction-per-mutation guarantee to preserve or break here; that's a pre-existing
      property of the codebase, not something this migration touched.
      **Real architectural finding, not just a mechanical migration:** `claimBatch`/
      `markProcessed`/`markFailed` are called only by the background outbox worker
      (`worker/outbox-worker.ts`), which by design claims pending events *across all tenants* in
      one query (`for update skip locked`) — there is no single tenant to scope those calls to,
      and forcing `withTenant` onto them would break cross-tenant batch claiming entirely. Per
      spec §19 ("separate migration, background worker, audit writer... roles — no shared
      application superuser"), the worker's own dedicated role is a distinct, future piece of
      work, not something this repository migration should paper over. Resolution: `enqueue`/
      `findByIdempotencyKey` (per-request, per-tenant calls) migrated to `TenantScopedDb`;
      `claimBatch`/`markProcessed`/`markFailed` (cross-tenant worker calls) deliberately kept on
      the raw pool — the repository now takes both `TenantScopedDb` and `DATABASE_POOL` injected
      side by side, permanently, not as a "finish later" placeholder. Documented this reasoning
      directly in the repository file's header comment so it isn't mistaken for an incomplete
      migration in a future session.
      **Found and fixed the exact same bare-constructor-injection DI bug as `identity-tenant`,
      proactively** — before starting this migration, ran
      `grep -rL "@Inject" src/modules/*/presentation/*.controller.ts` across the whole codebase
      (per the note left during the `identity-tenant` entry) and found exactly one more instance:
      `OutboxController` (`POST /v1/outbox/events`), the *only other* controller with zero real
      HTTP test coverage — same pattern, same cause. Fixed with the same
      `@Inject(OutboxService)` addition; confirmed via `grep -L "@Inject" .../*.controller.ts`
      afterward that zero controllers remain with this issue anywhere in the codebase.
      Added 3 new real tests (2 repository-level against real Supabase: same-tenant
      idempotency dedup, cross-tenant idempotency-key isolation; 1 HTTP-level: full publish +
      dedup round trip through the real route) to `test/outbox/outbox.test.ts` — this repository
      and controller had zero real-Supabase/HTTP coverage before today, same gap as
      `identity-tenant`.
      Verified: `npx tsc --noEmit` clean, `test/outbox/*` (1 file, 5 tests, up from 2) pass, full
      backend gate re-run clean (**161/161**, up from 158 — the 3 new tests are the only change
      in count).

## All 13 repositories now migrated to `TenantScopedDb` (2026-07-06)

`risk-workflow`, `evidence-assurance`, `assessment`, `framework-content`, `harmonization`,
`ai-orchestration`, `integration-platform`, `privacy-operations`, `enterprise-grc`,
`reporting-analytics`, `audit-security`, `identity-tenant`, `outbox` — every repository in
`src/modules/*/infrastructure/*.repository.ts` now goes through `TenantScopedDb.withTenant(...)`
for its tenant-scoped methods (`outbox`'s three cross-tenant worker methods are the one
deliberate, permanent, documented exception). Full backend gate: **161/161 tests, zero
regressions across all 13 migrations.** This closes G-10 repository migration checklist step 2 in
full. Two real, previously-undiscovered bugs were found and fixed along the way (not part of the
original G-10 plan, but necessary and in-scope once discovered):
- `audit-security`'s `findById` had no tenant scoping and its route had no authorization guard.
- `identity-tenant` and `outbox` controllers both had a silent DI-injection bug (bare
  type-based constructor injection failing under this project's esbuild-based `tsx`/`vitest`
  toolchain) that had gone undetected because neither route had ever been exercised via a real
  HTTP test before this campaign wrote the first one.

**G-10 steps 3-7 (2026-07-06) — ALL COMPLETE. G-10 is now CLOSED.**

3. **Connection cutover — DONE.** Rotated `app_runtime`'s password out of migration 0008's
   literal placeholder via `supabase/migrations/0011_g10_app_runtime_password_rotation.sql`
   (uses a `%%APP_RUNTIME_DB_PASSWORD%%` placeholder token substituted from the
   `APP_RUNTIME_DB_PASSWORD` env var by a new `substituteSecrets()` function in
   `scripts/migrate.mjs` — the real password is never committed). Added
   `SUPABASE_APP_RUNTIME_DB_URL` to `.env`/`.env.example` and as an optional field in
   `src/config/env.ts`. Split `src/platform/database/tokens.ts`'s single `DATABASE_POOL` into
   two tokens: `DATABASE_POOL` (now connects via `SUPABASE_APP_RUNTIME_DB_URL`, falling back to
   `SUPABASE_DB_URL` if unset — this is what `TenantScopedDb` and every migrated repository use)
   and a new `ADMIN_DATABASE_POOL` (always connects via `SUPABASE_DB_URL`/`postgres` — used only
   by `outbox`'s three cross-tenant worker methods, which by design scan across all tenants and
   cannot be RLS-scoped to one tenant context). Updated
   `postgres-outbox.repository.ts` to inject `ADMIN_DATABASE_POOL` instead of `DATABASE_POOL` for
   `claimBatch`/`markProcessed`/`markFailed`.

   **Real, non-obvious blocker hit and resolved during rotation:** after rotating the password,
   connections through the Supavisor pooler (`REDACTED.pooler.supabase.com`, both
   port 5432 and 6543) rejected every password — old and new — for `app_runtime`, while a
   *direct* (non-pooler) connection to `db.REDACTED.supabase.co` with the same
   credentials succeeded immediately. Root cause: Supavisor maintains its own per-role credential
   cache separate from Postgres itself, and it resyncs on a short but nonzero delay after a
   password change (confirmed empirically: failed on the first retry, succeeded within one 10s
   retry cycle afterward — not a permanent block, just needs a short wait/retry immediately after
   any future rotation of a pooler-routed role's password). This is now recorded here so a future
   session doesn't waste time re-diagnosing it: **if a freshly-rotated pooler-routed role's
   password is rejected immediately after rotation, wait ~10-20 seconds and retry before assuming
   the rotation failed.**

   Verification: full backend gate re-run after the cutover — **161/161 passing** with zero
   regressions. 8 test files needed a one-line fix: they queried `outbox_events` directly via
   `appPool`/`pool` (bound to `app.get(DATABASE_POOL)`, now the RLS-scoped `app_runtime` pool)
   with no tenant context set, for pure test-assertion purposes (checking an outbox row got
   created) — under RLS this correctly returns zero rows with no context set, so each was
   switched to use the file's existing owner-role `repositoryPool`/a new `ADMIN_DATABASE_POOL`
   pool instead (not a weakened assertion — the same check, just querying with the right
   privileges for a pure verification query). Affected: `a2-assessment-api`,
   `a3-evidence-risk-api` (x2), `a4-reporting-api`, `a6-integration-api`, `a7-privacy-api`,
   `a8-enterprise-api`, `a1-http.integration`.

4. **`FORCE ROW LEVEL SECURITY` — DONE.** `supabase/migrations/0012_g10_force_rls.sql` enables
   FORCE on all 58 tenant tables (the 55 from migration 0008's array, plus `audit_events`,
   `risk_acceptances`, `risk_acceptance_reviews` added in migration 0010). Applied cleanly; full
   backend gate re-run afterward — **still 161/161**, zero regressions.

   **Important, honest finding recorded here rather than glossed over:** FORCE ROW LEVEL SECURITY
   only changes behavior for a table's *owner* role, and only if that owner does not have the
   `rolbypassrls` attribute. Directly queried `pg_roles` and confirmed Supabase's `postgres` role
   has `rolbypassrls = true` set at the platform level (not something any migration in this repo
   sets or can safely unset — `postgres` is Supabase's own managed admin role, used by its
   dashboard SQL editor, backups/PITR, and this repo's own `scripts/migrate.mjs`, all of which
   need unrestricted access). **This means FORCE ROW LEVEL SECURITY has zero practical effect on
   `postgres` connections in this specific Supabase project** — bypassrls is checked before FORCE
   is even consulted, by Postgres's own design. It was still correct to enable it (it is real
   defense-in-depth against any *other*, non-bypassrls owner that might exist in the future, and
   matches spec §24's Constrain-stage requirement literally), but the load-bearing security
   boundary for production is, and remains, that the *application's actual runtime connection*
   (`app_runtime`, non-owner, non-bypassrls) is correctly subject to every RLS policy — not that
   `postgres` is somehow also restricted (it never will be, in this project, without touching
   Supabase's own platform-managed role). `test/platform-hardening/rls-matrix.test.ts` was
   rewritten to document and directly assert both facts (a new test queries `pg_class.
   relforcerowsecurity` to prove FORCE is actually set; the renamed bypassrls-documentation test
   asserts `pg_roles.rolbypassrls = true` for `postgres` directly, rather than just inferring it
   behaviorally) — the previous version of this test asserted the *opposite*, stale conclusion
   ("owner bypasses until FORCE lands"), which would have been factually wrong the moment this
   migration landed if left unfixed.

5. **Full regression re-run through the real `app_runtime` connection — DONE.** 161/161 passing
   after the cutover (step 3), 161/161 again after FORCE RLS (step 4) — see step 3/4 detail above.
   Every real-Supabase test in all 26 backend test files now runs through the actual `app_runtime`
   connection path, not just `rls-matrix.test.ts`'s separate direct-`app_runtime` harness.

6. **Defense-in-depth cross-tenant test through the real app wiring — DONE.** New file
   `test/platform-hardening/rls-defense-in-depth.test.ts` boots the real app via
   `NestFactory.create(AppModule)` (exactly like every other HTTP integration test), pulls the
   actual `TenantScopedDb` instance the running application uses (`app.get(TenantScopedDb)`,
   backed by the real `app_runtime`-connected `DATABASE_POOL`), and proves two things through it
   directly rather than through a separately-constructed pool: (a) the real production
   `PostgresAssessmentRepository.findAssessment` returns `null` for another tenant's exact
   assessment ID; (b) a deliberately tenant-unscoped raw query (`select id from assessments where
   id = $1`, no `tenant_id` filter at all — simulating a hypothetical missing-filter bug in
   application code) still returns nothing under another tenant's context or no context at all,
   proving Postgres itself — not application-level filtering — is the actual enforcement
   boundary post-cutover. 2/2 new tests passing; backend gate now **162/162**.

7. **Playwright e2e proving the cutover didn't break real user-facing flows — DONE, with an
   honestly-investigated caveat recorded below (not silently absorbed).** Full e2e suite result
   post-cutover: **6 passed, 8 failed** — the *exact same* pass/fail count and the same 8 test
   names as the pre-campaign e2e baseline recorded earlier in this file (see "Real e2e baseline
   established 2026-07-06" above), which strongly suggested no new regression. Investigated
   further rather than assuming, per this campaign's own standing rule about not letting things
   get silently absorbed into "expected failures":
   - **5 of the 8 failures are the already-documented pre-existing `color-contrast` axe violation**
     (`f0-auth:19`, `f1-framework-harmonization:8`, `f3-ai-governance:14`, `f6-hardening:42`,
     `f6-hardening:58`) — confirmed identical to the established baseline, out of scope for this
     campaign (see the baseline section above for the full root cause: an uncommitted
     `app/styles.css` redesign predating this campaign).
   - **3 of the 8 failures are a different, non-color-contrast issue**
     (`f2-assessment-core:23`, `f4-integrations:22`, `f5-privacy-enterprise:39`) that each hang
     indefinitely partway through a long sequence of sequential HTML-form-POST actions (each form
     posts to a Next.js BFF route, which server-side calls the NestJS backend), eventually
     exhausting the test's timeout (even generous per-test overrides already in place — 120s for
     f2, 60s for f5 — were fully exhausted, not just the global 30s default, ruling out "just a
     bit slow"). **Investigated properly rather than assumed to be a cutover regression:**
     - Extracted the Playwright trace network log for the hung request: it shows `status: -1,
       time: -1` (never received any response), immediately after 14 prior sequential form-posts
       in the same test each succeeded normally in 0.5-6.7s.
     - Concurrently polled `pg_stat_activity` for `app_runtime` connections during a live
       reproduction: found only pre-existing *idle* (already-committed) connections from earlier
       successful steps — **no new query ever reached Postgres for the hung request at all.**
       This means the hang happens before the request reaches the database.
     - **Decisive isolation test:** temporarily reverted `.env` to remove
       `SUPABASE_APP_RUNTIME_DB_URL` (falling back to the pre-cutover `postgres`/`SUPABASE_DB_URL`
       owner connection, no RLS in effect) and re-ran the identical `f2-assessment-core` test.
       **The exact same hang reproduced**, this time failing at a *different* step ("Update
       finding" instead of "Create remediation task") — proving both that (a) this is NOT caused
       by G-10's cutover, RLS, or `app_runtime` (it reproduces identically on the old owner
       connection), and (b) it's timing-dependent flakiness rather than a deterministic bug tied
       to one specific action. Restored `.env` immediately after the test.
     - Separately traced and fixed an unrelated environmental confound found along the way: a
       Next.js dev server on port 3100 had been running unattended for many hours (since 01:03),
       reused by every e2e run via Playwright's `reuseExistingServer` setting, alongside a large
       pile of orphaned Chrome processes from the same period — the system was down to ~1.3GB
       free of 16GB at one point. Killed both and confirmed the hang **still reproduces
       identically on a fully clean process slate**, ruling out simple resource-exhaustion-from-
       stale-processes as the sole explanation too.
     - **Conclusion: this is a genuine, real, currently-unexplained issue in the frontend's
       BFF/Next.js layer (or Node event-loop behavior under this sandbox's conditions) — but
       proven independent of G-10's database work.** Flagged as a separate follow-up task
       (`task_5d0eacf4`, "Investigate e2e hang in F2/F4/F5 multi-step form flows") rather than
       silently folded into "known baseline" or left uninvestigated. Not a G-10 blocker: G-10's
       own required e2e proof is that the *cutover* doesn't break user flows, and 6 tests that do
       exercise real backend/tenant-scoped interaction (`f0-auth`'s login/redirect/session flow,
       `f1-framework-harmonization`'s two paginated-fetch tests, `f2-idempotency`'s BFF-idempotent-
       retry flow, `f6-hardening`'s viewer-role screen-visibility test) pass cleanly through the
       real `app_runtime` cutover connection, which is exactly that proof.

**Per-repository migration recipe (proven twice now, risk-workflow then evidence-assurance —
follow exactly, don't improvise a variant):**
1. Read the target `postgres-*.repository.ts` file in full.
2. Replace `import type pg from "pg"; import { DATABASE_POOL } from ".../tokens.js";` with
   `import { TenantScopedDb } from ".../tenant-scoped-db.js";`.
3. Replace the constructor's `@Inject(DATABASE_POOL) private readonly pool: pg.Pool` with
   `@Inject(TenantScopedDb) private readonly db: TenantScopedDb`.
4. Wrap every method body in `return this.db.withTenant(tenantId, actorIdOrUndefinedForReads,
   async (client) => { ...same body, using `client.query` instead of `this.pool.query`... });`.
5. `grep -rln "PostgresXRepository" src/ test/` to find every real-Supabase integration test that
   constructs the repository directly with a raw pool (not through NestJS DI) — fix each one to
   pass a `TenantScopedDb` instance instead (usually there's already a module-level
   `repositoryDb = new TenantScopedDb(repositoryPool)` in the test file from an earlier fix; reuse
   it, don't create a second one).
6. `npx tsc --noEmit` — must be clean before running anything.
7. `npx vitest run test/<relevant-directory>/` — must show the same or more passing tests than
   before, zero new failures.
8. `npm run test` (full backend gate) — must still show the same total pass count as the last
   known-good baseline (221/221 as of 2026-07-06, after G-01 completion; update this number here
   every time it changes so the "no regressions" check stays meaningful).
9. Update this checklist's checkbox and add a one-line note (file changed, test count, date) —
   do this in the same session as the migration, not deferred.

## Next concrete action (single most important line in this file)

**G-10 is fully CLOSED as of 2026-07-06** (see the gap status table and the detailed steps 3-7
write-up above; full closure detail also written into `schema-remediation-report.md`).

**Priority interrupt handled, same day:** the live Supabase project hit its free-tier storage
limit (558 MB) due to a real, now-fixed G-05-adjacent bug — see the G-05 row in the gap table
above for the full account. This was fixed (root cause + live cleanup, 558 MB → 48 MB, fully
verified with no-recurrence proof) before resuming the working order below. It did not change the
campaign's priority order — G-05's own full target-state restructuring is still queued for later,
same as before this incident.

**G-01 Phase 1 slice built and verified 2026-07-06** — see the gap status table above and the full
write-up in `schema-remediation-report.md`. Migration `0013_g01_assessment_execution_normalization.sql`
adds 9 new tables (`assessment_scopes`, `assessment_frameworks`, `assessment_snapshots`,
`control_instances`, `applicability_decisions`, `answer_revisions`, `review_decisions`,
`test_procedures`, `control_test_results`) plus additive nullable columns on `assessment_items`
(`control_instance_id`, `sequence_no`, `required`). `PostgresAssessmentRepository`/
`AssessmentService` dual-write into these alongside the legacy flat tables — the HTTP API contract
is completely unchanged, verified by the full existing assessment test suite passing unmodified
(164→189 tests, zero regressions) plus 20 new domain/integrity tests plus 5 new RLS-matrix tests
for `control_instances`.

**G-01 completion (the 4 previously-deferred tables) built and verified 2026-07-06** — migration
`0017_g01_completion_remaining_tables.sql` adds `requirement_instances`, `question_sets`,
`question_versions`, `assessment_signoffs`, plus `assessment_items.question_version_id`. A
same-session regression was caught by the full test gate (not by inspection): the new
`requirement_instances.requirement_id → framework_requirements(id)` FK broke
framework-content's publish flow, which deletes and reinserts a content pack's requirement rows
with fresh ids on every republish — once any assessment held a `requirement_instances` row, that
delete started failing with a foreign-key violation. Root-caused, fixed via
`0018_g01_framework_requirements_stable_ids.sql` (adds `unique (tenant_id, source_workbook,
source_sheet, source_row_number)`, verified zero pre-existing duplicates on the live 3642-row
canonical table before adding it) plus changing
`postgres-framework-content.repository.ts`'s `insertRequirements` from delete+insert to
upsert-on-that-key, so `framework_requirements.id` now stays stable across republishes of the same
source data — required once anything holds a real FK to it. Re-verified after the fix: canonical
`framework_requirements` still exactly 3642 rows under 1 tenant (no G-05 regrowth), and
`test/framework-content/a1-http.integration.test.ts` passes again. Test evidence for the 4
completion tables: 14 new unit/integrity tests added to
`test/assessment/g01-execution-graph.test.ts` (uniqueness, FK rejection against a real canonical
requirement, the `question_versions` immutable-once-approved trigger, `assessment_signoffs` check
constraints) — file total now 34/34 passing; 1 new RLS-matrix fixture (`question_sets`) added to
`test/platform-hardening/rls-matrix.test.ts` — file total now 72/72 passing. Full backend gate:
**221/221 passing**, lint/typecheck/arch-boundaries/migration-lint/openapi-check all clean,
`schema-audit.mjs` clean (all 4 new tables show `rlsEnabled: true, forceRlsEnabled: true`).

**Next concrete action for G-01 specifically** (when it's picked back up, whether next in the
working order or later): all 15 spec §10 tables now exist (Expand+Dual-operate complete across
both migrations), but **G-01 is still `in progress`, not `closed`** — do not let a future session
assume "all tables built" means done. Confirmed by direct query 2026-07-06: of 1071 live
`assessment_items` rows, 963 still have `control_instance_id is null` and 1051 still have
`question_version_id is null` (every row created before its respective dual-write went live).
Remaining stages, in order:
1. Backfill: populate `control_instance_id`/`sequence_no`/`question_version_id` (and the
   corresponding `requirement_instances`/`assessment_signoffs` rows) for every pre-existing
   `assessment_items`/`assessments` row — a real data migration, not just a schema change.
2. Constrain: make the now-backfilled columns NOT NULL; add whatever read-path tests prove the
   new tables are the source of truth, not just a shadow copy.
3. Cut over: switch actual reads (not just writes) to the normalized tables; only after that,
   Contract: drop the legacy flat columns (`framework_key`, `control_id`, `harmonized_control_id`,
   `answer_text`, `applicability`, `evidence_ids` on `assessment_items`).

None of steps 1-3 above are done. This is an honest, deliberate non-closure, not an oversight.

**G-04 (report immutability) is CLOSED as of 2026-07-06** — see the gap status table above and
the full write-up in `schema-remediation-report.md`. Two real bugs were found and fixed in the
same session they were introduced (application code referencing `export_manifests` columns that
the migration adding them never actually created — `manifest_payload` then `signed_at`), each
caught via a real HTTP request against the live database, not assumed away; each got its own
small follow-up migration (`0015`, `0016`) rather than editing the already-applied `0014`.
202/202 backend tests passing.

**G-09 Phase 1 (enterprise GRC depth) built and verified 2026-07-06** — see the gap status table
above and the full write-up in `schema-remediation-report.md`. Before writing any migration, both
source PDFs were re-read fresh for this gap; the actual gap sentence ("No complete risk, treatment,
access-review item, vendor assessment, audit request/test or policy attestation model") turned out
to be far larger than "just the risk register" — spec §12/§14 back it with ~20 target tables. A
phasing plan (build the 6 named nouns first, defer the rest with named reasons) was confirmed with
the user via AskUserQuestion before any code was written, the same discipline used for G-01's
phasing. Migration `0019_g09_enterprise_grc_risk_register.sql` adds 13 new tables: `risk_models`,
`risks`, `risk_links`, `risk_treatments` (the risk register, in `risk-workflow` module); `policies`
+ `policy_control_links` + `policy_attestations` (extending pre-existing `policy_versions`);
`access_review_items` + `access_review_decisions` (extending pre-existing `access_reviews`);
`vendor_assessments` + `vendor_findings` (extending pre-existing `vendors`); `audit_requests` +
`audit_tests` (extending pre-existing `audit_engagements`, `audit_tests.control_instance_id` links
to G-01's `control_instances`) — plus additive columns (`remediation_tasks.treatment_id`/
`priority`/`verified_at`, `risk_acceptances.risk_id`, `policy_versions.policy_id`). Full domain/
repository/service/controller wiring built for all 13 tables with real new HTTP routes (not just
schema), completing G-03's deferred `risk_acceptances.risk_id` linkage in the same pass. A real
bug was found and fixed by the test gate, not by inspection: `policy_attestations` and
`access_review_decisions` are append-only tables with no `updated_by`/`updated_at` columns at all
(matching the pre-existing `risk_acceptance_reviews` precedent) — the repository's SELECT column
lists and mapping functions wrongly assumed the standard mutable-row shape, causing a real 500 on
first HTTP exercise; fixed with a narrower `EnterpriseGrcAppendOnlyMetadata`/
`enterpriseAppendOnlyMetadataProperties()` shape used only for those two tables. The OpenAPI
contract (`scripts/openapi-spec.mjs`, hand-maintained, not decorator-derived) was updated with all
~20 new operations and ~35 new schemas and regenerated — the first gap this campaign that added
genuinely new HTTP routes rather than dual-writing into existing ones, so this was a real,
first-of-its-kind completeness item for this gap, not a repeat of prior gaps' pattern.

**Final confirmed full-gate result: 264/264 tests passing, 31/31 test files, exit code 0** (a clean
run, not assumed from a partial pass — see `docs/schema-remediation-report.md`'s G-09 write-up for
the four unrelated pre-existing near-the-boundary timeout fixes and two confirmed transient flakes
found and resolved along the way to that clean state).

**Anything not fully closed — stated plainly:** G-09 is `in progress`, not `closed`. Deferred with
named reasons, matching the phasing the user approved: `policy_exceptions`, `access_remediations`,
`vendor_services`/`contracts`, `trust_access_requests`/`trust_activity_events`,
`questionnaire_engagements`/`items`/`responses` (not named in the gap sentence), and
`custom_field_definitions`/`custom_records`/`custom_values` (G-13's scope, not G-09's). When G-09
is picked back up, the next concrete step is deciding whether any of the deferred tables belong in
a Phase 2 slice or can be folded into their respective named gaps (G-07 evidence graph for
evidence-related linkage, G-13 for the custom-object tables) instead of staying under G-09.

**G-06 Phase 1 (AI provenance lineage) built and verified 2026-07-06** — see the gap status table
above and the full write-up in `schema-remediation-report.md`. Both source PDFs were re-read fresh
before starting (spec §7's AI Provenance ERD is diagram-only; the real column-level detail is in
§15, "AI Orchestration and Evaluation"). Migration `0020_g06_ai_provenance_lineage.sql` adds 9 new
tables — `knowledge_chunks`, `retrieval_runs`, `retrieved_chunks`, `generation_citations`,
`safety_checks`, `evaluation_suites`, `evaluation_cases`, `evaluation_results`,
`ai_publication_events` — plus an additive `ai_evaluation_runs.suite_id` FK. Full domain/
repository/service/controller wiring built, with ~16 new HTTP routes in the `ai-orchestration`
module. `AiOrchestrationService.publishQuestion` now persists a real `ai_publication_events` row
(previously: outbox event only — exactly the gap sentence's "no ... publication approval"
finding). Test evidence: `test/ai-orchestration/g06-ai-provenance.test.ts` (new, 9 domain unit
tests + 12 real-Supabase integrity tests, 21/21 passing); `test/ai-orchestration/a5-ai-api.test.ts`
extended with a new HTTP-level describe block exercising the full chain of new routes end-to-end
(6/6 passing, up from 5); `test/platform-hardening/rls-matrix.test.ts` extended with an
`evaluation_suites` fixture (82/82 passing, up from 77). OpenAPI contract
(`scripts/openapi-spec.mjs`) updated with the new routes/schemas and regenerated (118 paths, 206
schemas, 0 dangling refs) — the second gap in this campaign (after G-09) needing a real contract
update since it added genuinely new HTTP routes.

**Final confirmed full-gate result: 291/291 tests passing, 32/32 test files, exit code 0** (up from
264/264 and 31/31 before this gap — the +27 delta is the 21 new g06-ai-provenance tests + 1 net new
a5-ai-api HTTP test + 5 new rls-matrix tests), zero regressions. `npm run lint`, `npm run
typecheck`, `npm run unit`, `npm run arch:test`, `npm run migration:lint`, `npm run openapi:check`
all clean on this same run — no new timeout bumps or transient flakes needed this time, unlike
G-01/G-09's closing gate runs.

**Anything not fully closed — stated plainly:** G-06 is `in progress`, not `closed`. Deferred with
named reasons, per the phasing confirmed with the user via AskUserQuestion: `model_providers` (a
provider registry normalizing the free-text `ai_model_deployments.provider` column) and splitting
`prompt_templates` (stable identity) from `ai_prompt_versions` — the same "compressed
identity+version" pattern already fixed for G-09's `policies`/`policy_versions` and G-01's
`assessment_scopes`, but not named in G-06's own gap sentence.

**G-07 (evidence graph) built and verified 2026-07-06.** Both source PDFs were re-read fresh before
starting (gap sentence: "Evidence objects are not fully linked to control instances, questions,
tests, periods, requests or reviews. Add evidence_links, evidence_versions, requests, reviews,
samples and retention actions." — traceability EVD-01..06; spec §11 lists 10 target tables).
Today's schema had exactly one flat, mutable `evidence_objects` table (261 live rows) combining
identity with content (file_name/storage_uri/sha256/period/scope_tags all on one row) — no
versioning, no typed links, no request/review/sample workflow, no malware-scan persistence (the
existing `commitCleanEvidence` domain function took a `scannerVerdict` parameter and discarded it),
no expiry/custody history. Unlike G-06/G-09's phased approach, the user chose **"Full §11 in one
pass"** via AskUserQuestion, including `automated_tests`/`automated_test_runs` even though those
describe connector-driven control testing (a different sub-domain, not named in G-07's own gap
sentence) — built here per that explicit choice since `evidence_samples.test_result_id` needs a
real test-execution identity to reference.

Migration `0021_g07_evidence_graph.sql` adds all 10 tables: `evidence_versions` (immutable,
append-only, split from `evidence_objects` the same way G-09 split `policies`/`policy_versions` —
`evidence_objects` keeps its existing flat columns untouched and additively gains nullable
`title`/`source_type`/`retention_until`; backfilling the 261 pre-existing rows into
`evidence_versions` and eventually contracting the redundant legacy columns are explicitly deferred,
matching G-01's own precedent for a normalization this size), `evidence_links` (typed polymorphic
link — `target_type` CHECK-constraint registry covering `control_instance`/`assessment_item`/
`automated_test_run`, the three nouns G-07's gap sentence names), `evidence_requests`,
`evidence_reviews` (app-layer-enforced "reviewer separation" — a reviewer cannot review evidence
they own; this cannot be a single-table CHECK constraint since it compares against a different
table's `owner_id`), `automated_tests`/`automated_test_runs` (`automated_test_runs` gains a real
`idempotency_key` + `unique(tenant_id, idempotency_key)`, reusing this codebase's own established
idempotency convention rather than inventing a new watermark-based dedupe rule), `evidence_samples`,
`malware_scan_results` (`unique(evidence_version_id, engine)` — "one final result per version/
engine" read literally), `evidence_expiry_events` and `evidence_custody_events` (both append-only,
sharing one new `prevent_evidence_graph_mutation()` trigger function reused across both tables via
`tg_table_name`, matching the existing `prevent_assessment_history_mutation()` precedent from
migration 0013). `EvidenceAssuranceService.commit()` was extended so a clean commit now persists a
real `evidence_versions` row, a real `malware_scan_results` row (previously thrown away), and the
opening `evidence_custody_events` entry — closing the gap sentence's malware-scan and chain-of-
custody findings directly, not just adding unused tables. Full domain/repository/service/controller
wiring built, with ~20 new HTTP routes across the existing `EvidenceAssuranceController` (versions,
expiry-events) and a new `EvidenceGraphController` (links, requests, reviews, malware-scan/custody
reads, automated-tests/runs, samples).

Test evidence: `test/evidence-risk/g07-evidence-graph.test.ts` (new — 12 domain unit tests + 13
real-Supabase integrity tests, 25/25 passing, including proving the append-only triggers on
`evidence_versions`/`evidence_expiry_events`/`evidence_custody_events` and the
`automated_test_runs` idempotency-key uniqueness); `test/platform-hardening/rls-matrix.test.ts`
extended with an `evidence_versions` fixture (87/87 passing, up from 82); `test/evidence-risk/
a3-evidence-risk-api.test.ts` extended with a new "G-07 EvidenceGraph HTTP exposure" describe block
exercising the full chain end-to-end (evidence upload → quarantine → commit → versions →
malware-scans/custody-events → links → requests → reviews → automated-tests → runs → samples),
9/9 passing in that file. One genuine test-writing bug was caught and fixed during this pass (not a
product bug): the new HTTP test initially asserted `commit()` returns 200, but every POST route in
this codebase defaults to NestJS's 201 Created (the pre-existing A3 commit test never asserted on
status at all) — fixed by correcting the assertion to 201. One pre-existing, unrelated test
(`A3 EvidenceAssurance repository > persists quarantine, clean commit...`) tipped over the default
5000ms vitest timeout once under full-suite load and passed cleanly in isolation — confirmed as the
same transient near-the-boundary latency pattern already documented for other files this session,
fixed with the same established `30_000ms` timeout-bump precedent (not a regression). OpenAPI
contract (`scripts/openapi-spec.mjs`) updated with all ~20 new operations and ~29 new/updated
schemas, regenerated and verified: **129 paths, 231 schemas, 0 dangling refs** (up from 118/206
after G-06).

**Final confirmed full-gate result: 322/322 tests passing, 33/33 test files, exit code 0** (up from
291/291 and 32/32 before this gap — the +31 delta is the 25 new g07-evidence-graph tests + 1 net new
a3-evidence-risk-api HTTP describe block + 5 new rls-matrix tests), zero regressions. `npm run
lint`, `npm run typecheck`, `npm run unit`, `npm run arch:test`, `npm run migration:lint`, `npm run
openapi:check` all clean on this same run.

**Real, diagnosed infrastructure incident encountered while confirming this gate, recorded here for
honesty and for whoever hits it next:** getting to that one clean run took 9 full-gate attempts over
roughly 90 minutes. Attempts 2-8 failed with a worsening, non-deterministic pattern of `Test timed
out in 5000ms`/`30000ms` failures scattered across many unrelated, pre-existing test files
(`identity-tenant`, `enterprise-grc`, `framework-content`, `platform-hardening`,
`outbox`, `assessment`, `rls-matrix`) — never the same file twice, never a real assertion failure,
and at one point a test whose timeout was *already* bumped to 30s also timed out, which rules out
"needs another timeout bump" as the explanation. A direct connection to `SUPABASE_DB_URL` (bypassing
the app's pooled connection) during the worst of it showed the underlying Postgres database itself
was completely healthy — 13 connections, none stuck, no lock waits — which rules out this gap's own
migration/schema work as the cause and points specifically at the Supavisor connection-pooler layer.
This is the same class of transient instability already noted earlier in this campaign (a run once
took 50+ minutes for `tail`-buffered output to even appear, attributed at the time to the same
cause). Every individual failing test, re-run in isolation immediately after a failed full-gate run,
passed cleanly with no code change — confirming these were never real regressions. Attempt 9 (after
waiting ~30 minutes) came back fully clean.

**Anything not fully closed — stated plainly:** even with "full §11 in one pass" chosen, G-07 is
`in progress`, not `closed`, for the same reason G-01's own normalization wasn't: `evidence_objects`
still carries its pre-existing flat content columns untouched (Expand-only), the 261 live rows have
not been backfilled into `evidence_versions`, and no read path has been cut over to the new
normalized tables yet. Backfill/Constrain/Cutover/Contract for this specific split remain open,
exactly mirroring G-01's own still-open remaining stages.

**G-08 (privacy normalization) built and verified 2026-07-06.** Both source PDFs were re-read fresh
before starting (gap sentence: "Processing, purposes, lawful bases, recipients, transfers and
retention relationships are compressed into arrays/JSON. Create typed entities and join tables with
effective dating and deletion workflow." — traceability PRV-01..07; spec §5 Privacy ERD names ~16
entities plus 5 join tables; spec §13, split across "Processing and Data Map" and "Rights, Consent,
Incidents, and Retention," gives the real column-level detail across ~30 tables — by far the
largest single gap in this campaign). Today's schema had exactly the 7 flat tables the gap report
calls "Seven high-level records" (`data_inventory_records`, `processing_activities`,
`dpia_assessments`, `privacy_rights_requests`, `consent_records`, `privacy_incidents`,
`retention_schedules`) — confirmed by direct inspection: `processing_activities.purpose`/
`lawful_basis` are plain `text` columns, `recipients`/`transfers` are plain `text[]` arrays, no
typed FKs, no effective-dating anywhere.

Two real boundary questions were resolved before any migration was written: (1) `retention_
assignments`/`legal_holds`/`legal_hold_items`/`deletion_jobs`/`deletion_items` are explicitly
claimed by **G-12's own gap sentence** ("Add holds, retention assignments, deletion jobs/items and
destruction attestations") — deferred to G-12 regardless of phasing, to avoid duplicating/colliding
with that future work; (2) `systems_assets`/`data_discovery_scans`/`data_discovery_findings`
describe a DSPM-style automated data-discovery feature never mentioned in G-08's own gap sentence —
a genuinely different feature area, not just deeper normalization of what's named. The user was
asked via `AskUserQuestion` how to scope the rest and chose **"Absolute full spec §13, including
data-discovery"** — the most aggressive option offered, building everything except G-12's 5 tables.

Migration `0022_g08_privacy_normalization.sql` adds 22 new tables plus additive nullable columns on
`data_inventory_records` (`system_id`/`data_category_id`/`location`/`format`/`source`/`steward_id`)
and `processing_activities` (`workspace_id`/`name`/`controller_processor_role`/`status`) — the 2
existing tables whose spec-target shape changed the most. None of the 7 existing tables were
renamed, restructured, or had data migrated (Expand only, non-destructive); where spec's target
concept is the same aggregate as an existing table but named/shaped differently (`dpias` vs
`dpia_assessments`, `consent_purposes`/`consent_events` vs `consent_records`,
`incident_assessments`/`incident_notifications` vs `privacy_incidents`'s embedded `timeline`/
`actions` jsonb, `retention_rules` vs `retention_schedules`), the new tables are genuinely new
siblings/children referencing the *existing* table's real id, not duplicate parents — the same
"new normalized child/sibling, legacy identity row untouched" pattern used for every prior gap this
size. `privacy_notice_versions` and `consent_events` are append-only (immutable notice version /
consent ledger), sharing one new `prevent_privacy_ledger_mutation()` trigger function reused across
both via `tg_table_name`, matching the established precedent from migrations 0013/0021.
`lawful_bases.framework_version_id` (spec's literal column) was simplified to
`(tenant_id, jurisdiction, basis_key)` since this schema has no `framework_versions` identity table
a *regulatory* framework version could FK against (a documented, necessary deviation). Full domain/
repository/service/controller wiring built, with ~40 new HTTP routes across the existing
`PrivacyOperationsController` (unchanged) and a new `PrivacyGraphController`.

Test evidence: `test/privacy-operations/g08-privacy-normalization.test.ts` (new — 9 domain unit
tests + 16 real-Supabase integrity tests, 25/25 passing after fixing one test-writing bug caught by
a genuine schema edge case: Postgres treats each NULL `workspace_id` as distinct for
`unique(tenant_id, workspace_id, name)` purposes, so two no-workspace `systems_assets` rows sharing
a name never collide — a real, now-documented limitation of that constraint, not a bug; the test
was corrected to exercise the constraint's main case, a shared real workspace); `test/platform-
hardening/rls-matrix.test.ts` extended with a `data_categories` fixture (92/92 passing, up from 87);
`test/privacy-operations/a7-privacy-api.test.ts` extended with a new "G-08 PrivacyGraph HTTP
exposure" describe block exercising the full processing-graph/consent/incident/retention chain
end-to-end, 5/5 passing in that file (up from 3), with zero bugs found on first run. OpenAPI
contract (`scripts/openapi-spec.mjs`) updated with ~40 new operations and ~44 new/updated schemas,
regenerated and verified: **153 paths, 277 schemas, 0 dangling refs** (up from 129/231 after G-07).

**Final confirmed full-gate result: 353/353 tests passing, 34/34 test files, exit code 0** (up from
322/322 and 33/33 before this gap), zero regressions. `npm run lint`, `npm run typecheck`, `npm run
unit`, `npm run arch:test`, `npm run migration:lint`, `npm run openapi:check` all clean. Getting
there took 2 attempts: the first full-gate run showed the entire `rls-matrix.test.ts` file failing
across nearly every fixture simultaneously (a much broader signature than any single-test flake) —
confirmed as the same transient Supabase/Supavisor connection instability documented in G-07's own
closing incident by re-running both `rls-matrix.test.ts` and the other affected file
(`a1-persistence-and-service.test.ts`) in isolation immediately after, with both passing cleanly and
no code change. The second full-gate attempt came back completely clean.

**Anything not fully closed — stated plainly:** even with "absolute full spec §13" chosen, G-08 is
`in progress`, not `closed`, for the same reason G-01/G-07's own normalizations weren't: the 7
existing flat tables still carry their pre-existing columns untouched (Expand-only), no historical
data has been backfilled into the new typed tables, and no read path has been cut over. Backfill/
Constrain/Cutover/Contract for this normalization remain open. `retention_assignments`/
`legal_holds`/`legal_hold_items`/`deletion_jobs`/`deletion_items` are deliberately deferred to G-12,
not built here.

**G-12 (retention and deletion) built and verified 2026-07-06.** Both source PDFs were re-read fresh
before starting (gap sentence: "Schedules exist but no subject/object holds, deletion jobs, proof or
cryptographic erasure workflow. Add holds, retention assignments, deletion jobs/items and
destruction attestations." — traceability PRV-07, SEC-04; spec §13's second half names the 5 target
tables directly, and spec §22 "Encryption, Retention, and Privacy Lifecycle" spells out the intended
workflow: "retention_rules -> assignments -> scheduled deletion_jobs/items. Legal holds resolve to
explicit protected objects before deletion." and "destroy per-object/tenant data keys for
cryptographic erasure; retain minimum audit proof" — confirming `deletion_items.key_destroyed`/
`proof_hash` are exactly the gap sentence's "destruction attestations"). This was already the exact
set of tables identified and deliberately deferred out of G-08 for this reason, so no
scope-fork `AskUserQuestion` was needed — both documents fully and unambiguously bound this gap to 5
tables with no larger surrounding section to phase, unlike G-06/G-07/G-08.

Migration `0023_g12_retention_deletion.sql` adds `retention_assignments`, `legal_holds`,
`legal_hold_items`, `deletion_jobs`, `deletion_items`. Spec's literal `deletion_jobs.trigger` column
name collides with the same reserved-keyword issue already hit and fixed for G-08's
`retention_rules` — renamed to `deletion_trigger` for the same reason. All three polymorphic
`(target_type, target_id)` columns (`retention_assignments`, `legal_hold_items`, `deletion_items`)
share one `target_type` registry (`data_inventory_record`, `evidence_object`, `evidence_version`,
`rights_request`, `consent_event`) rather than each inventing its own. Critically, this gap's own
workflow was made real, not just schema: `PrivacyOperationsService.createDeletionItem` now checks
`findActiveLegalHoldForTarget` before persisting — if an active (unreleased) legal hold covers the
exact target, the disposition is forced to `blocked_by_hold` and key destruction is refused
regardless of what the caller requested, implementing spec §22's own "Legal holds resolve to
explicit protected objects before deletion" rule as enforced behavior rather than an unused table.

A real bug was found and fixed by the test gate, not by inspection: `findActiveLegalHoldForTarget`'s
repository query joins `legal_hold_items`/`legal_holds` and selected unqualified column names
(`id`, `tenant_id`, `version`, `classification`, `created_by`/`_at`, `updated_by`/`_at`) that exist
on both tables, causing a real HTTP 500 (`column reference "id" is ambiguous`) on first exercise —
caught by the new HTTP test attempting the actual "hold blocks deletion" flow, not by a narrower
unit test. Fixed by giving `legalHoldItemColumns()` an optional `alias` parameter (matching the
`evaluationResultColumns(alias?)` precedent from G-06) and qualifying the joined query's column list
with the `legal_hold_items` alias.

Test evidence: `test/privacy-operations/g12-retention-deletion.test.ts` (new — 7 domain unit tests +
9 real-Supabase integrity tests, 16/16 passing, including proving the "nonoverlap active assignment"
partial-unique-index constraint both rejects a duplicate active assignment and correctly allows a
new one once the prior is closed out via `effective_to`); `test/platform-hardening/rls-matrix.test.ts`
extended with a `legal_holds` fixture (97/97 passing, up from 92); `test/privacy-operations/
a7-privacy-api.test.ts` extended with a new "G-12 RetentionDeletion HTTP exposure" describe block
that proves the full held-vs-unheld deletion behavior end-to-end (assign retention → issue a legal
hold → resolve it to a target → attempt deletion of the held target, confirming `blocked_by_hold`
and no key destruction → delete an unrelated unheld target normally, confirming real
`deleted`/`keyDestroyed: true`/`proofHash` → release the hold → re-attempt deletion of the
previously-held target, confirming it now succeeds normally), 6/6 passing in that file (up from 5).
OpenAPI contract updated with ~12 new operations and ~14 new/updated schemas, regenerated and
verified: **161 paths, 289 schemas, 0 dangling refs** (up from 153/277 after G-08).

**Final confirmed full-gate result: 375/375 tests passing, 35/35 test files, exit code 0** (up from
353/353 and 34/34 before this gap), zero regressions. `npm run lint`, `npm run typecheck`,
`npm run unit`, `npm run arch:test`, `npm run migration:lint`, `npm run openapi:check` all clean on
the confirmed run.

Getting there took 3 attempts and one legitimate test fix, both worth recording precisely. **Attempt
1** failed with only 6 tests across 5 unrelated files (`a1-persistence-and-service`, `identity-tenant`,
`outbox`, `rls-defense-in-depth`, `g04-report-immutability`) — none in `privacy-operations` — plus 2
"Connection terminated unexpectedly" uncaught exceptions; a direct `SUPABASE_DB_URL` health check
showed Postgres itself completely healthy (11 active connections, 0 ungranted locks). Re-running
those same 5 files in isolation immediately after showed 4 pass cleanly with no code change, but
`test/outbox/outbox.test.ts` failed again — this time on a *different* specific test
("enqueues an event and deduplicates a repeated idempotency key for the same tenant") than the one
that failed in the full run, timing out consistently at the default 5000ms even alone. Reading the
test showed it makes 3 real sequential Supabase round-trips with no timeout override — the same
class of near-the-boundary-latency issue already fixed once this session for
`a3-evidence-risk-api.test.ts`. Fixed with the identical precedent: bumped this one test to an
explicit `30_000` timeout (test-only, unrelated to G-12's own code, matching the already-established
fix pattern, not a new one invented for this incident).

**Attempt 2** (immediately after that fix) came back dramatically worse: **20 failed test files, 134
failed tests, 5 "Connection terminated unexpectedly" uncaught exceptions**, spanning nearly the
entire suite — `ai-orchestration`, `assessment`, `audit-security`, `enterprise-grc`, `evidence-risk`,
`framework-content`, `identity-tenant`, `integration-platform`, `outbox`, `platform-hardening`,
`privacy-operations` (both `g08` and `g12` test files), `reporting-analytics`. A second direct
`SUPABASE_DB_URL` health check again showed Postgres itself completely healthy (14 active
connections, 0 ungranted locks) throughout. Given the one-line outbox timeout bump cannot explain
failures in `ai-orchestration`/`assessment`/`audit-security`/etc. — modules G-12 never touched — this
was conclusively a Supavisor connection-pooler outage under full-suite concurrent load, more severe
than either of the two similar incidents already documented for G-07's and G-08's closing gates this
session, not a code regression. Waited 20 minutes (escalating-delay protocol, matching G-07's
precedent) before retrying.

**Attempt 3** came back completely clean: 375/375, 35/35, exit code 0, all six gate scripts green.

**Anything not fully closed — stated plainly:** G-12 has no Backfill/Constrain/Cutover/Contract
concerns of its own (all 5 tables are genuinely new, nothing pre-existing to migrate), so unlike
every other gap this campaign built this session, G-12 has no deliberately-deferred stage of its
own — the only honest caveat is that `deletion_jobs`/`deletion_items` model the *record* of an
erasure/anonymization action, not the actual data-plane execution (e.g. this migration does not
itself delete rows from `evidence_objects` or anonymize `data_inventory_records`); a real erasure
worker consuming `deletion_jobs` and performing the underlying mutations is out of scope for a
schema-remediation pass and was never implied by any of the 14 gaps.

## G-11 — audit hash chain hardening (2026-07-06 — built and tested)

**What was wrong, confirmed by re-reading both source PDFs fresh before touching this gap:** the
exact gap sentence is "Previous-hash model lacks documented per-tenant ordering and concurrency
strategy. Add monotonic sequence, chain partition, unique constraints, signing checkpoints and
verifier results." (traceability SEC-03). Spec §17 names the target tables: `audit_events` (already
exists, migration 0001), `audit_checkpoints` (new), `audit_verifications` (new). Spec §21 ("Audit
Chain and Tamper Evidence") spells out the required behavior: allocate sequence under an
advisory/row lock per `chain_partition`; `event_hash` must cover canonical event bytes,
`previous_hash`, sequence, and partition; periodically sign checkpoint root hashes; a verifier
independently recomputes the chain and signature and writes `audit_verifications`.

**Inspection before any design work** (via a dedicated research pass) found `audit_events` already
had a `sequence bigint generated always as identity` column with `unique(tenant_id, sequence)` —
more than the gap sentence's own text implied. Two real, more specific gaps existed underneath that
one sentence:
1. **A genuine TOCTOU race, not just a documentation gap.** `AuditLogService.append()` called
   `repository.getLatestHash(tenantId)` and `repository.append(event)` as two *independent*
   `TenantScopedDb.withTenant()` transactions with no lock between them. Two concurrent `append()`
   calls for the same tenant could both read the same `previousHash` and both insert — a real fork
   risk, and exactly what "concurrency strategy" in the gap sentence names.
2. `computeAuditHash()` did not include `sequence` at all in its hashed payload, so a value swapped
   at rest (e.g. two rows' sequence values exchanged) would not be caught by recomputing the hash —
   contradicting spec §21's explicit requirement that `event_hash` cover sequence and partition.

**What was built** — migration `0024_g11_audit_hash_chain_hardening.sql`:
- `audit_events` gains `chain_partition uuid generated always as (tenant_id) stored` (an additive,
  automatically-backfilled generated column — nothing in this codebase does finer-grained
  partitioning, so `chain_partition` is, today, always equal to `tenant_id`, matching this
  campaign's "no opportunistic scope creep" precedent) plus a new
  `unique(chain_partition, sequence)` index (kept alongside the pre-existing
  `unique(tenant_id, sequence)` from migration 0001 rather than dropping it — logically redundant
  today, but never edit an already-applied migration).
- `sequence` had its `generated always as identity` property dropped (`alter column sequence drop
  identity` — a metadata-only change; existing row values are untouched). Per-partition sequence
  allocation moved into the application layer: `PostgresAuditRepository.appendWithLock()` takes
  `pg_advisory_xact_lock(hashtext(chainPartition))` and reads the latest hash/sequence for that
  partition **inside the same transaction** as the insert, closing the TOCTOU race.
- `computeAuditHash()` now covers `sequence` and `chainPartition` for newly-hashed events. The
  pre-existing `version integer not null default 1` column on `audit_events` (already part of the
  standard cross-cutting contract) is repurposed, from this migration forward, to also mean
  "hash/canonical-serialization algorithm version" — bumped to `2` for new rows; pre-migration rows
  stay at `1` and are verified against the old (narrower) hash shape, never rewritten. This is an
  honest, stated limitation, not a bug — proven by a dedicated backward-compatibility test that
  inserts a raw `version = 1` row hashed the legacy way and confirms `verifyAuditEvent` still passes.
- New tables `audit_checkpoints` (`chain_partition`, `start_sequence`, `end_sequence`, `root_hash`,
  `signature`, `signed_at`) and `audit_verifications` (`checkpoint_id` FK, `result` check
  `pass`/`fail`, `mismatch_sequence`, `verifier_version`). Both append-only, sharing a new
  `prevent_audit_chain_mutation()` trigger function (matching the
  `prevent_assessment_history_mutation()`/`prevent_evidence_graph_mutation()`/
  `prevent_privacy_ledger_mutation()` precedent from migrations 0013/0021/0022).
- `AuditLogService.createCheckpoint()` is fully repository-owned (the read-range/compute-root-hash/
  persist sequence must be one atomic, lock-held operation, or a concurrent checkpoint creation
  could compute an overlapping range) — it determines `startSequence` as the prior checkpoint's
  `endSequence + 1` (or `1` for the first checkpoint), throws `ConflictException` if there's nothing
  new since the last checkpoint, and otherwise computes `root_hash` (SHA-256 over the ordered
  `event_hash` values in range) and `signature`.
- `signature` (on checkpoints) is **not** backed by a real KMS/HSM — none exists anywhere in this
  codebase (confirmed by inspection before writing the migration). This matches the exact,
  already-honestly-documented precedent for `report_exports.signature` in G-04's own migration/
  service ("a local SHA-256-based placeholder... not a real asymmetric signature. Named honestly,
  not presented as more than it is.") — the same framing applies here, not a new pattern.
- `AuditLogService.verifyCheckpoint()` recomputes every event's own hash, the `previous_hash`
  linkage between consecutive events, and the checkpoint's `root_hash`/`signature`, then persists an
  immutable `audit_verifications` row with `result` and, on failure, the exact `mismatchSequence`.
- New routes live on a **separate** `AuditChainController` (`v1/audit/checkpoints`,
  `v1/audit/verifications`), not bolted onto the pre-existing `AuditSecurityController`
  (`v1/audit/events`) — that controller's `:eventId` catch-all route would otherwise swallow
  `GET /v1/audit/events/checkpoints` before it ever reached a literal route, since NestJS/Express
  match routes in registration order. This mirrors the same "new sibling controller" decision
  already made for G-08/G-12's `PrivacyGraphController`.

**Two real bugs were found and fixed by the test gate, not by inspection:**
1. Dropping `sequence`'s identity default broke the pre-existing `audit_events` RLS-matrix fixture
   (`test/platform-hardening/rls-matrix.test.ts`), which relied on the identity default and supplied
   no `sequence` value — caught immediately by a NOT NULL violation on the very first RLS-matrix
   run after the migration, fixed by supplying an explicit value.
2. The new `audit_checkpoints`/`audit_verifications` RLS fixtures used a **fixed**
   `start_sequence`/`end_sequence` (`1`), which collided with `unique(chain_partition,
   start_sequence/end_sequence)` the second time the generic RLS suite's `buildInsert` was called
   for the same tenant (it legitimately calls `buildInsert` more than once per tenant — once to seed
   the row, again to build a cross-tenant insert payload for the "rejects an insert" test). Fixed by
   giving each fixture call its own random sequence range (`randomSequence()` helper), applied
   defensively to all three G-11 fixtures.

**Tests, real output:**
- `test/audit-security/hash-chain.test.ts` — extended with 2 new pure-function tampering tests
  (sequence tampering, chain_partition tampering) proving `event_hash` now actually covers those
  fields. 4/4 passing.
- `test/audit-security/g11-audit-hash-chain.test.ts` (new) — 15 tests: `chain_partition` generated
  correctly; raw duplicate `(chain_partition, sequence)` rejected; **the concurrency race test**
  (fires 12 simultaneous `append()` calls for one tenant, confirms a perfect gap-free 1..12 sequence
  with an unbroken `previous_hash` chain — the real proof the TOCTOU fix works, not just that the
  code reads correctly in isolation); `audit_checkpoints`/`audit_verifications` constraint tests
  (range check, uniqueness, FK, append-only trigger rejects update/delete); checkpoint lifecycle
  tests (creates covering every event since genesis, rejects a second call with nothing new, creates
  a second contiguous checkpoint after new events); verifier tests (`pass` on a real checkpoint,
  `fail` with the correct `mismatchSequence` against a deliberately corrupted raw-inserted
  checkpoint — `audit_checkpoints` is append-only, so a raw insert is the only way to construct a
  wrong one, since `createCheckpoint` itself always computes a correct root hash); legacy
  hash-version backward-compatibility test. 15/15 passing.
- `test/platform-hardening/rls-matrix.test.ts` — extended with `audit_checkpoints` (no prerequisite
  chain) and `audit_verifications` (seeds its own `audit_checkpoints` prerequisite, matching the
  `evidence_versions`/`findings` prerequisite pattern) fixtures, plus the `audit_events` fixture fix
  above. 107/107 passing (up from 97).
- `test/audit-security/audit-list.test.ts` — extended with a new "G-11 AuditChain HTTP exposure"
  describe block: creates/lists/fetches/verifies a real checkpoint through HTTP end-to-end, confirms
  a duplicate checkpoint call is rejected with 409, confirms the checkpoint scope is enforced (403
  without it), and confirms the `fail` path is reachable through real HTTP (a raw-inserted bad
  checkpoint verified via `POST /v1/audit/checkpoints/{id}/verify` comes back `result: "fail"` with
  the correct `mismatchSequence`). 8/8 passing (up from 4).
- `scripts/openapi-spec.mjs` updated with 5 new operations and 3 new schemas
  (`AuditCheckpoint`, `AuditVerificationResult`, `AuditVerification`), regenerated, and verified with
  a no-dangling-`$ref` check: **165 paths, 292 schemas, 0 missing refs** (up from 161/289 after
  G-12).
- Full backend regression gate: **405/405 tests passing, 36/36 test files, exit code 0** (up from
  375/375 and 35/35 before this gap), zero regressions. `npm run lint`, `npm run typecheck`,
  `npm run unit`, `npm run arch:test`, `npm run migration:lint`, `npm run openapi:check` all clean.
  Came back completely clean on the first attempt — no transient Supavisor instability this time,
  unlike the closing gates for G-07/G-08/G-12.

**Anything not fully closed — stated plainly:** the historical `audit_events` rows inserted before
this migration keep their pre-G-11 hash shape (`version = 1`, hash not covering sequence/partition)
permanently — they are not rehashed/migrated, matching this campaign's standing additive-only
discipline (Backfill was never attempted for a hash column, since rehashing would change the
recorded historical hash value itself, which is the one thing an append-only audit table must never
do). No real KMS/HSM integration exists for checkpoint signing (matching G-04's own already-honest
precedent). Checkpoint creation and verification are both synchronous, on-demand HTTP operations —
no scheduler automatically creates checkpoints "periodically" as spec §21 suggests, and no
alerting pipeline consumes a `result: 'fail'` verification to raise a "critical security alert";
both are real operational/SIEM-integration concerns outside a schema-remediation pass, and neither
was implied by any of the 14 gaps.

## G-13 — Custom platform (2026-07-06 — built and tested — the 14th and final gap)

**What was wrong, confirmed by re-reading both source PDFs fresh before touching this gap:** the
exact gap sentence is "Definitions exist without fields, records, values, validation, permissions or
workflow binding." (traceability GRC-08). Spec §14/§16 ("Enterprise GRC - Trust, Questionnaires, and
Extensions") name the target shape: `custom_object_definitions` (`tenant_id`, `object_key`,
`version`, `status`, `validation_schema`; unique tenant/object/version), `custom_field_definitions`
(`object_definition_id`, `field_key`, `data_type`, `required`, `validation_json`; unique
object/field_key), `custom_records` (`object_definition_id`, `tenant_id`, `record_key`, `status`;
unique definition/record_key), `custom_values` (`record_id`, `field_definition_id`, `value_json`,
`search_text`; unique record/field).

**Scoping:** no `AskUserQuestion` scope-fork was needed — spec §14/§16 fully and unambiguously bound
this gap to exactly these 4 tables (1 existing + additive columns, 3 new).

`custom_object_definitions` already existed (migration 0006) and was already fully wired end-to-end
(domain/repository/service/HTTP routes at `v1/enterprise-grc/custom-object-definitions`), but exactly
matched the gap sentence's complaint: `fields jsonb`/`workflow_states text[]`/
`permission_role_ids uuid[]` are all inline JSON/array blobs, with nothing underneath for records or
values at all.

**Reconciliation decisions:**
1. Spec's target `custom_object_definitions` is `unique(tenant_id, object_key, version)` — a
   separate immutable row per version. The table that actually exists is `unique(tenant_id,
   object_key)` with `version` as the standard optimistic-row-version counter from this schema's own
   cross-cutting contract, not a separate-row-per-version history. Converting it to spec's
   versioned-history model would be a real, destructive restructuring far beyond this gap's own
   sentence — matching this campaign's standing precedent (G-01/G-07/G-08/G-11) of leaving a
   pre-existing table's own shape/constraint untouched (Expand-only) rather than restructuring it.
   Only 2 additive columns (`status`, `validation_schema`) were added, matching spec's own literal
   column list.
2. `custom_records.object_definition_id` is a plain FK, not a polymorphic `target_type`/`target_id`
   pair — unlike this campaign's genuinely multi-target polymorphic tables (`risk_links`,
   `evidence_links`, `retention_assignments`), a custom record only ever belongs to exactly one kind
   of parent.
3. `custom_field_definitions.data_type` is a CHECK-constraint closed set (`text`/`number`/
   `boolean`/`date`/`datetime`/`uuid`/`json`/`enum`) — spec names the column but not its values; a
   documented design decision, matching the closed-set-of-basic-types pattern used elsewhere.
4. "Workflow binding" (the gap sentence's own phrase) is satisfied by the pre-existing
   `workflow_states` array already on `custom_object_definitions` — spec's own 4-table target list
   does not name a separate workflow-binding table, so none was invented.
5. "Validation" (the gap sentence's own word) is implemented as real service-layer business logic,
   not just a schema column: `EnterpriseGrcService.createCustomValue` rejects a missing value when
   the owning field definition is `required`, and rejects a value whose JSON type does not match the
   field's declared `dataType` — matching the "real business-logic implementation, not just schema"
   precedent already established for G-12's legal-hold-blocks-deletion.

**What was built:** `supabase/migrations/0025_g13_custom_platform.sql` adds `status`/
`validation_schema` to `custom_object_definitions`, plus 3 new tables (`custom_field_definitions`,
`custom_records`, `custom_values`), all RLS-enabled with immediate FORCE RLS (safe, all-new or
additive-only). New routes were added directly onto the existing `EnterpriseGrcController`
(`v1/enterprise-grc/custom-object-definitions/{id}/status|fields|records`,
`v1/enterprise-grc/custom-records/{id}` and `.../values`) rather than a new sibling controller — a
routing-collision check confirmed `EnterpriseGrcController` has no catch-all `:id` route at its root
(unlike `AuditSecurityController`'s `:eventId`, which forced G-11's `AuditChainController` into
existence), so no collision risk existed here.

**Tests, real output:**
- `test/enterprise-grc/g13-custom-platform.test.ts` (new) — 8 pure domain-function unit tests
  (blank-key rejections, required-field rejection, dataType-mismatch rejection, defaults) plus 9
  real-Supabase integrity tests (`custom_object_definitions` status default/CHECK, `custom_field_
  definitions` uniqueness/CHECK/FK, `custom_records` uniqueness/CHECK, `custom_values` uniqueness/FK/
  nullable-value). 17/17 passing. One genuine test-writing bug was caught and fixed during this
  pass: a seed helper reused the same bind parameter (`$3`) both cast to `uuid[]` and bare for
  `created_by`, causing Postgres to unify the inferred parameter type across all its uses in the
  statement and reject the bare usage — fixed by using a separate parameter for each.
- `test/enterprise-grc/a8-enterprise-api.test.ts` — extended the existing real-Supabase repository
  test with the new field/record/value chain, and added a new "G-13 CustomPlatform HTTP exposure"
  describe block proving the full definitions -> status update -> fields -> records -> values chain
  through real HTTP, including two real validation-rejection cases (missing required value -> 400,
  dataType mismatch -> 400). File total: 6/6 passing (up from 5), with zero bugs found on this file's
  first run.
- `test/platform-hardening/rls-matrix.test.ts` — extended with 4 fixtures: `custom_object_definitions`
  itself (which, despite existing since migration 0006, had **no RLS-matrix fixture at all** until
  now — a real, pre-existing coverage gap surfaced and closed while building its children, not
  something this gap broke), `custom_field_definitions`, `custom_records` (each seeding their own
  `custom_object_definitions` prerequisite), and `custom_values` (seeding both a field definition and
  a record). 127/127 passing (up from 107).
- `scripts/openapi-spec.mjs` updated with 8 new operations and 10 new/updated schemas, regenerated,
  and verified with a no-dangling-`$ref` check: **170 paths, 302 schemas, 0 missing refs** (up from
  165/292 after G-11).
- Full backend regression gate: **443/443 tests passing, 37/37 test files, exit code 0** (up from
  405/405 and 36/36 before this gap), zero regressions. `npm run lint`, `npm run typecheck`,
  `npm run unit`, `npm run arch:test`, `npm run migration:lint`, `npm run openapi:check` all clean on
  the confirmed run. Took 2 attempts: the first failed with a `TypeError: fetch failed` / "bad port"
  error in `test/assessment/a2-assessment-api.test.ts` — a module G-13 never touched (only
  `enterprise-grc`/`platform-hardening`/the RLS matrix/OpenAPI spec were touched by this gap).
  Re-running that file in isolation immediately after passed cleanly (3/3, no code change),
  confirming a transient ephemeral-port-binding race under concurrent full-suite load rather than a
  regression. The second attempt came back completely clean.

**Anything not fully closed — stated plainly:** the pre-existing `custom_object_definitions` table's
`unique(tenant_id, object_key)` constraint (row-per-object, not spec's row-per-version) remains
unchanged — Backfill/Constrain/Cutover/Contract for converting it to a true versioned-history model
are untouched, exactly like G-01/G-07/G-08/G-11's own still-open normalization stages. No "workflow
engine" enforces transitions between `workflow_states` — that array remains a declared vocabulary,
not an enforced state machine, matching what actually existed before this gap and what the gap
sentence's own words ask for (a records/values/validation layer, not a new workflow engine).

---

## Campaign status: all 14 gaps addressed (2026-07-06)

Every gap in the original 14-gap register (`G-01` through `G-14`) has now been touched in this
campaign, with an honest status for each — several `closed`, several `in progress` with named,
deliberate reasons (documented in each gap's own section above and in
`schema-remediation-report.md`), none silently downgraded, reframed, or left unaddressed. This is
the first point in the campaign where "one remaining unstarted gap" is no longer true. Whoever picks
this up next should treat the still-open items (G-01/G-05/G-07/G-08/G-09's own deferred
Backfill/Constrain/Cutover/Contract stages, G-03's remaining shape gap, G-13's versioned-history
mismatch) as the real remaining work — re-reading each gap's own section above and the source PDFs
fresh, not assuming anything from this summary line.

Two patterns confirmed real across the 13 repository migrations completed this session — still
worth checking for if any further schema/repository work touches these areas: (1) any test
chaining several real-Supabase calls in one `it()` may need its default 5000ms vitest timeout
bumped — expected latency from `withTenant`'s per-call connect/begin/commit/release under
concurrent-test-file load, not a bug (also true of the 30_000ms bumps applied to
`test/privacy-operations/a7-privacy-api.test.ts` and
`test/evidence-risk/a3-evidence-risk-api.test.ts` this session); (2) any repository code doing
`someField: row.some_column` with no cast may need an explicit `as SomeType["someField"]` cast
once running through `TenantScopedClient` (`Record<string, unknown>` typing is stricter than the
old raw-pool `any`) — a real type-safety improvement, not a regression to suppress.

**Separately flagged, not a G-10 blocker:** a real, currently-unexplained e2e hang affecting
`f2-assessment-core.spec.ts`, `f4-integrations.spec.ts`, and `f5-privacy-enterprise.spec.ts` in
the frontend (proven independent of G-10's database work via direct isolation testing — see step 7
write-up above) was flagged as follow-up task `task_5d0eacf4`. If picking this back up in a future
session and that task hasn't been actioned, it remains open and worth investigating on its own
track — it affects real user-facing reliability even though it isn't one of the 14 named schema
gaps.

Remember: this ledger file now lives at `C:\dev\GRC_Tool\cybernara-backend\docs\...` — the
OneDrive copy of this same path is stale from this point forward and should not be edited or
trusted.

---

## FINAL COMPLETION PASS (started 2026-07-06) — closing the bar for every "in progress" gap

**This is a new, explicit phase of the campaign, not a continuation of the "campaign status" note
above.** The prior phase closed all 14 gaps against the bar of "real backend tests + RLS coverage,"
deliberately leaving the frontend UI gap open wherever "no UI exists yet" was cited as the reason
no Playwright e2e ran. **That exception is retired.** The new, non-negotiable closure bar for every
gap: real backend unit/domain tests, real Supabase integration tests, real RLS coverage, **real
frontend UI**, **real Playwright e2e against that UI**, and a full regression re-run (backend +
frontend + Playwright) with real counts — before any gap's status changes to `closed`.

**Full scope, tracked via TaskCreate #108-#125** (mirrors the user's own ordering):
1. G-01 Backfill → Constrain → Cutover → Contract, plus frontend UI for applicability/answer-
   history/reviewer/test-procedures/sign-offs.
2. G-03: fix the `findings` nullable-FK "at least one source" shape now that `control_test_results`
   exists.
3. G-05: build the actual target-state catalog structure (spec §9) plus a real global/tenant RLS
   visibility model plus frontend labeling.
4. G-06/G-07/G-08/G-09/G-11/G-12/G-13: build the missing frontend UI for each (backend already
   solid), wire OpenAPI/generated client, add Playwright e2e, then mark each `closed`. (G-07/G-08
   also still owe their own Backfill/Constrain/Cutover/Contract stages.)
5. G-14: full breadth per spec §20 (query plans, partition health, physical design, restore
   verification) with real evidence, not documentation-only.
6. Final: a comprehensive closing report appended to `schema-remediation-report.md` — all 14 gaps
   `closed`, full final gate output, honest Production Acceptance Checklist/Approval Gates
   walkthrough naming what's structurally out of reach in this sandbox.

**Standing authorization confirmed for this phase:** full authority to make implementation/
architecture/UI decisions without checking in, using the same "smallest correct decision, documented"
discipline used throughout (G-03's `risk_id` scoping, G-08's "full spec in one pass" choice). Only
stop for genuinely irreversible, high-stakes, no-reasonable-default decisions — not for ordinary
implementation judgment calls.

**Next concrete action, as of this note:** starting with G-01's Backfill stage (task #108) — the
first item in the user's own stated ordering, and the foundational one, since G-01's later frontend
work (task #112) depends on the assessment execution domain being stable. Re-verify every count/detail
in this ledger against the live database before writing any backfill logic — this ledger is a
snapshot, not a substitute for a fresh check.

### G-01 Backfill (task #108) — closed

Wrote `scripts/backfill-g01-execution-graph.mjs`: pure derivation functions (mirroring
`PostgresAssessmentRepository.createAssessment`'s exact mapping — `harmonized_control_id` as
`control_instances.control_id`, not the raw `control_id`; `question_sets` keyed
`(tenant_id, control_id, question_set_key=<legacy questionVersion string>)`; `question_versions`
always version 1 with `payload_json={legacyQuestionVersion}` and a deterministic sha256 checksum)
plus an exported `backfillItem(client, itemId, summary)` and a CLI entrypoint
(`npm run g01:backfill`, supports `--dry-run`/`--batch-size=N`). Every insert uses
`on conflict ... do update ... returning id` (never `do nothing`) for safe re-runnability.
Historical reconstruction beyond the bare FK link: non-null legacy `applicability` becomes a real
`applicability_decisions` row (`approved_by` left null — the legacy shape never tracked a second
approver, not fabricated); non-null `answer_text` becomes a real `answer_revisions` row (revision 1,
`submitted_by`/`submitted_at` approximated from the item's own `updated_by`/`updated_at`, documented
as an approximation); a blank/whitespace-only legacy `rationale` is skipped and counted
(`applicabilitySkippedBlankRationale`), not fabricated.

Real run against live Supabase: 1,622 rows needing backfill at run time (grown from the ledger's
stale 1,051 snapshot because repeated test-suite runs across G-06–G-13 kept inserting more
null-shaped `assessment_items` rows via raw-SQL fixtures — confirmed synthetic test data, not real
production rows). Result: 1,446 `control_instances` linked, 1,622 `question_versions` linked, 125
`applicability_decisions` backfilled, 75 `answer_revisions` backfilled, 0 skipped-blank-rationale,
reconciled to 0 remaining nulls — both by the script's own reconciliation query and an independent
follow-up query run separately.

Refactored the script into an importable module for testability (fixed two real bugs found along
the way: the Windows CLI-guard `import.meta.url === \`file://${process.argv[1]}\`` string
comparison silently failed on Windows path formatting — fixed via `pathToFileURL`; and a `.d.ts`
sibling was not picked up for a `.mjs` import under `NodeNext` resolution — needed `.d.mts`).
14 pure-function unit tests (`test/assessment/g01-backfill-derivation.test.ts`, no DB) plus 2
real-Supabase integration tests proving `backfillItem`'s actual INSERT/UPSERT sequence (including an
explicit idempotent-rerun assertion) — both since replaced by a single post-Constrain safety test,
see below.

### G-01 Constrain (task #109) — closed

Migration `0026_g01_constrain_execution_graph_not_null.sql`: `alter table assessment_items alter
column control_instance_id set not null` / same for `question_version_id`. Used the direct
`ALTER COLUMN SET NOT NULL` form (full-table-scan, ACCESS EXCLUSIVE lock, safe at this table's
~1,880-row scale) rather than the `NOT VALID` CHECK-constraint two-step this campaign uses for
larger/hotter tables (e.g. G-02's `findings.assessment_item_id` FK) — documented in the migration's
own header comment as a deliberate scale-based judgment call, not the default.

**First apply attempt failed** (`23502` NOT NULL violation on `question_version_id`) — root-caused,
not assumed, via `grep -rln "insert into assessment_items" test/ src/`: 5 test-fixture files across
3 modules had raw SQL inserts into `assessment_items` that predated the columns and never set them
(these are synthetic RLS-matrix/API-fixture rows, not real data — the same drift noted in the
Backfill section above). Fixed all 5 by seeding a real `control_instances` → `question_sets` →
`question_versions` chain first and referencing the real returned ids, matching the live dual-write
pattern: `test/platform-hardening/rls-matrix.test.ts` (`seedAssessmentItemChain` — also needed the
`question_sets`/`question_versions` inserts converted to `on conflict ... do update ... returning
id`, since this file reuses one `tenantB` across two `it()` blocks and a plain insert collided on
the second call), `test/evidence-risk/a3-evidence-risk-api.test.ts` (`seedAssessmentItemId`),
`test/evidence-risk/a3-schema-integrity.test.ts` (`seedAssessmentItem`),
`test/evidence-risk/g09-risk-register.test.ts` (inline fixture in the risk_acceptances describe
block), and `test/assessment/g01-execution-graph.test.ts`'s own `seedAssessmentItem` helper (needed
only `question_version_id` added — `control_instance_id` was already wired).

Second apply attempt also failed (still `23502` on `question_version_id`) — 4 more rows had gone
null in the live table between the Backfill run and the retry (created by test runs executed against
the pre-fix fixtures in between). Re-ran `npm run g01:backfill` (idempotent, safe) to catch them —
processed exactly those 4 rows, reconciled to 0 remaining nulls again. Migration then applied
cleanly on the third attempt.

**Real production-code bug found and fixed by this constraint**, not just a test-fixture problem:
`PostgresAssessmentRepository.createAssessment` (the live application write path) inserted each
`assessment_items` row via `insertItem` *before* creating that item's `question_sets`/
`question_versions` rows, then set `question_version_id` via a separate follow-up `UPDATE` once the
question-version id was known. That ordering silently relied on the column being nullable at insert
time — with the column now `NOT NULL`, every real HTTP-level assessment creation started failing
with a 500 (`null value in column "question_version_id"`), caught by
`test/evidence-risk/a3-evidence-risk-api.test.ts`'s HTTP-level assessment-creation tests during the
post-migration regression run. Fixed by reordering `createAssessment`'s per-item loop: build
`question_sets`/`question_versions` first, then pass `questionVersionId` into `insertItem` so it's
set in the initial `INSERT` alongside `control_instance_id`, and removed the now-unnecessary
follow-up `UPDATE`. `insertItem`'s signature gained a `questionVersionId: string` parameter.

Also had to retire the two DB-level "backfillItem against a real legacy-shaped row" integration
tests written during the Backfill stage: their premise (insert a synthetic row with
`control_instance_id`/`question_version_id` left null, then prove `backfillItem` fixes it) is no
longer constructible against the live schema — no insert, including this project's own admin-pool
raw SQL, can produce a null-shaped row anymore, which is exactly the guarantee Constrain exists to
provide. This is not a coverage loss: the value-mapping logic they exercised is fully covered by the
14 derivation-function unit tests (schema-independent), and the fact that the mapping was correctly
applied to every real historical row is documented above with real, independently-reconciled counts.
Replaced both tests with one that's still real and valuable post-Constrain: calling `backfillItem`
against an already-linked row (with `applicability`/`answer_text` populated) asserts a safe no-op —
protection against ever accidentally double-processing a row if the script were mistakenly re-run.

Verification: `npm run typecheck` and `npm run lint` clean after every fixture/repository edit. All
6 directly affected test files re-run together: 211/211 passing, 0 failures
(`g01-execution-graph.test.ts` 35, `g01-backfill-derivation.test.ts` 14, `a3-evidence-risk-api.test.ts`,
`a3-schema-integrity.test.ts` 10, `g09-risk-register.test.ts` 16, `rls-matrix.test.ts`). Full
backend gate (`npm run test` + `arch:test` + `migration:lint` + `openapi:check`) then re-run clean:
**458/458 tests passing across 38 test files, 0 failures**, architecture-boundary check passed,
migration-convention check passed, OpenAPI contract confirmed current. Migration 0026 applied and
holding. **Task #109 (G-01 Constrain) is complete.**

**Next concrete action:** task #110 (Cutover stage — switch `AssessmentService`/
`PostgresAssessmentRepository` read paths to the normalized tables as authoritative, legacy flat
columns becoming fallback, not primary).

### G-01 Cutover (task #110) — closed

Scoped precisely: the fields that actually have a normalized replacement are `answer_text`/
`evidence_ids` (superseded by `answer_revisions`, append-only, "latest revision" = current) and
`applicability` (superseded by `applicability_decisions`, append-only, "latest decision" =
current). `assessment_items.status` (the item's own workflow-state enum) has no normalized
replacement — `control_instances.status` is a separate, currently-unmaintained field (set once at
creation, never updated by the live mutation path) and is not a substitute; left untouched,
correctly, rather than wired to a field that would silently go stale.

Added `itemsSelectWithNormalizedFallback()` in `postgres-assessment.repository.ts`: a shared SQL
fragment used by `findItem`, `findAssessment` (via `recordWithItems`), and `listAssessments` (via
the same helper). It `LEFT JOIN LATERAL`s the latest `answer_revisions` row (by `revision desc`)
and latest `applicability_decisions` row (by `decided_at desc`, scoped by `control_instance_id`),
and `coalesce()`s the normalized value over the legacy flat column — so a row with no normalized
record yet (defensive fallback; should not occur post-Backfill+Constrain, but kept per the
campaign's additive/reversible discipline) still reads correctly. `evidence_ids` needed an explicit
`::text[]` cast on the legacy `uuid[]` column so `coalesce` against the `jsonb_array_elements_text`-
derived array type-checks. `insertItem`/`updateItem` still write the legacy flat columns on every
mutation (unchanged) — this is a **read**-path cutover; removing the write is Contract's job (task
#111), not this one.

`updateItem`'s own `RETURNING` clause was deliberately left on the raw `itemColumns()` (flat-column)
query, not switched to the normalized-fallback one: its return value is never consumed by
`AssessmentService` today (every caller does `await this.repository.updateItem(...)` and discards
the result, dual-writing the normalized record in a *separate* follow-up call), so cutting it over
would have shown a transiently stale read (the flat write lands before the normalized insert in the
same request) — not a real bug today given nothing reads it, but a foot-gun for later. Documented
inline rather than silently left ambiguous.

**Real proof, not just "existing tests still pass":** existing tests passing after this change only
proves the cutover didn't *break* anything, since the live dual-write keeps both paths in sync by
construction. Added two new tests to `test/assessment/a2-assessment-api.test.ts` under "G-01
Cutover: assessment reads source from normalized tables, not legacy flat columns" that actually
force the two paths to diverge: (1) write a real `answer_revisions`/`applicability_decisions` row
via the repository, then directly `UPDATE assessment_items` with different, conflicting flat-column
values out-of-band, then assert `findItem`/`findAssessment` return the **normalized** value, not the
stale flat one; (2) write only the flat columns (no normalized row at all) and assert the fallback
path still surfaces that data correctly. Both pass.

Verification: `npm run typecheck`/`npm run lint` clean. `test/assessment/a2-assessment-api.test.ts`
(5/5, including the 2 new cutover tests) plus the other directly-touched assessment/evidence-risk
test files re-run clean (49/49) before the full gate. Full backend gate re-run clean:
**460/460 tests passing across 38 files** (458 from the Constrain-stage baseline + 2 new cutover
tests), architecture-boundary/migration-convention/OpenAPI-currency checks all passed. **Task #110
(G-01 Cutover) is complete** — the application's real read path is now the normalized execution-graph
tables, not the legacy flat columns, satisfying that specific line of the campaign's definition of
done.

**Next concrete action:** task #111 (Contract stage — remove the legacy flat columns
`answer_text`/`evidence_ids`/`applicability` now that Cutover is proven, or document a clearly-named
narrow deferral reason if removal isn't safe yet — not a general punt).

### G-01 Contract (task #111) — closed, as a deliberate narrow deferral

Checked blast radius before deciding: `grep`-searched all of `src/` for the three columns —
only `postgres-assessment.repository.ts` reads/writes them (already cut over for reads);
`enterprise-grc`/`privacy-operations` hits were unrelated `evidence_ids` columns on different
tables. `scripts/backfill-g01-execution-graph.mjs` is the only other real reader, and its job
(historical, one-time) is already done and reconciled.

**Decision: defer the literal `DROP COLUMN`, with a named narrow reason — not a general punt.**
`insertItem`/`updateItem` still dual-write these three columns on every mutation (Cutover only
changed the *read* path, by design), and a wide swath of the test suite has raw-SQL fixtures across
multiple modules that insert `assessment_items` rows referencing them directly (the same 5+ files
touched during the Constrain-stage fixture repair). Physically dropping the columns now — in the
same session Cutover was proven, with zero elapsed real-world observability window — would be an
irreversible, data-destroying operation taken without the monitoring cycle a real production
Contract stage is supposed to wait for (spec §24 exists precisely to prevent this kind of premature
step). This sandboxed campaign has no real deployed environment to run that cycle against; that is
an honest, structural limitation of the environment, not a reason to skip documenting it, and not
a reason to take the irreversible step anyway.

What Contract *does* deliver here, concretely, not just as prose: migration
`0027_g01_contract_annotate_legacy_columns.sql` adds `comment on column` to all three columns,
marking them deprecated in the schema itself — naming what supersedes each one
(`answer_revisions`/`applicability_decisions`), confirming they're still dual-written for rollback
safety, and stating explicitly that removal is deferred to a future Contract-stage migration once a
real deployment has run Cutover through a monitoring window. Applied cleanly; verified directly by
querying `pg_catalog`/`col_description` against the live table and confirming all three comments
are present. This is a real, additive, fully reversible piece of Contract-stage work — the honest
alternative to either silently doing nothing (a general punt) or taking an unjustified irreversible
risk.

**Task #111 (G-01 Contract) is complete** under this narrow-deferral framing. G-01's full
Backfill → Constrain → Cutover → Contract lifecycle (tasks #108–#111) is now done; only the frontend
UI (task #112) remains before G-01 itself can be marked `closed` in the gap ledger per the campaign's
closure bar.

**Next concrete action:** task #112 (G-01 frontend UI — applicability decisions, answer revisions/
history, reviewer decisions, test procedures/results, assessment sign-offs — extending
`app/assessments/page.tsx` and its actions, then a real Playwright e2e against it).

### G-01 Frontend UI (task #112) — closed. G-01 (Backfill/Constrain/Cutover/Contract/Frontend) is
### now fully complete under the Section 1 closure bar.

**Backend surface added** (previously entirely missing — the normalized execution-graph tables had
no read/write surface beyond the dual-write mutation flows themselves):
- `GET /v1/assessments/:assessmentId/items/:itemId/answers/history` — full `answer_revisions`
  history for an item (previously only a "latest" internal read existed).
- `GET /v1/assessments/:assessmentId/items/:itemId/applicability/history` — full
  `applicability_decisions` history for an item's control instance.
- `GET /v1/assessments/:assessmentId/items/:itemId/reviews/history` — full `review_decisions`
  history for an item.
- `GET /v1/assessments/:assessmentId/signoffs` — every `assessment_signoffs` row for an assessment.
- `POST`/`GET /v1/assessments/:assessmentId/items/:itemId/test-procedures` — define and list manual
  `test_procedures` for an item's control (spec §10 table existed since migration 0013, never wired
  past the schema until now).
- `POST`/`GET /v1/assessments/:assessmentId/items/:itemId/test-results` — record and list
  `control_test_results` against an item's control instance.
Domain additions in `execution-graph.ts`: `TestProcedure`/`createTestProcedure` (rejects blank
procedure key/method/expected result), `ControlTestResult`/`createControlTestResult` (fresh `runId`
per call, defaults `population` to null and `sampleJson` to `{}`). Repository/service/controller
wiring follows the exact established pattern (RBAC via existing `assessment:read`/`assessment:write`
scopes — no new scopes invented, matching "smallest correct decision" precedent). OpenAPI spec and
frontend generated client both updated and verified current (`openapi:check`/`contract:check`).

**Frontend surface added** in `app/assessments/page.tsx`: three new sections —
`ExecutionHistory` (answer/applicability/review history, three-column detail grid, empty-state text
per column), `TestProcedureWorkflow` (test-procedure/test-result tables plus define/record forms,
following the existing `miniForm`/`AssessmentHidden`/`HiddenIdempotency` conventions exactly),
`SignoffSummary` (sign-off table, `EmptyState` before close). New intents `createTestProcedure`/
`recordControlTestResult` added to `app/assessments/actions/route.ts` following the established
intent-dispatch/idempotency-key/redirect pattern.

**Real backend tests**: 6 new pure-function unit tests for `createTestProcedure`/
`createControlTestResult` in `g01-execution-graph.test.ts`; one new HTTP-level integration test in
`a2-assessment-api.test.ts` ("G-01 Final Completion Pass...") exercising the full new surface against
real Supabase — two answer revisions, one applicability decision, a real cross-actor review decision
(distinct reviewer, proving the domain's reviewer-!=-submitter rule is enforced), a defined test
procedure, a recorded result, and sign-offs empty-before/populated-after a real `close()` call.

**Real Playwright e2e**: extended `e2e/f2-assessment-core.spec.ts`'s existing full-lifecycle test
with assertions for every new section (answer history "Rev 1"/"Rev 2", applicability rationale,
the "No review decision recorded yet" honest-empty-state message, a defined test procedure and its
recorded "pass" result, sign-offs empty-before/populated-after close) — not a separate token spec,
extending the real user flow the way the campaign's closure bar requires. **Final confirmed run:
1/1 passing, 5.2 minutes wall clock**, including the axe-core accessibility check.

**Four real bugs found and fixed along the way, none glossed over:**

1. **`CustomObjectDefinition` OpenAPI schema-declaration-ordering bug** (pre-existing, G-13,
   unrelated to G-01 itself) — `scripts/openapi-spec.mjs` declared `CustomObjectDefinition` (which
   `$ref`s `CustomObjectDefinitionStatus`) *before* `CustomObjectDefinitionStatus` itself. The
   frontend codegen emits one `const` per schema in object-key order and evaluates them
   top-to-bottom, so this produced a real `ReferenceError`-class TS error
   (`used before declaration`) the moment the frontend client was regenerated for the first time
   since G-13 landed — never caught earlier because nothing had triggered a full client
   regeneration in this session until G-01's own new schemas needed one. Fixed by reordering the
   two schema declarations; documented inline why order matters for this codegen.
2. **`test/api-contract.test.ts` staleness** (pre-existing, unrelated to G-01) — this frontend test
   hardcodes the full expected `operationId` list and was last updated partway through G-13,
   silently missing every route added since (~130 operation ids across G-06 through G-13, plus
   G-01's new 6). Fixed by regenerating the full, accurate list programmatically from the live
   generated client rather than hand-maintaining it further out of sync.
3. **Nullable-field OpenAPI-to-Zod codegen bug** (introduced this session, caught before merge) —
   `AnswerRevision.supersedesId`, `ApplicabilityDecision.approvedBy`, `ReviewDecision.rationale`,
   and `ManualControlTestResult.population` were declared `type: ["string","null"]` (optionally with
   `format: "uuid"`). The frontend generator (`scripts/api-client-generator.mjs`) checks
   `schema.format === "uuid"` *before* ever inspecting an array-valued `type`, so any nullable UUID
   field silently became `z.string().uuid().optional()` — which rejects a literal `null`, which the
   backend legitimately returns (e.g. `approvedBy: null` for the legacy single-actor applicability
   model, `supersedesId: null` for a first-ever answer revision). This caused a real Zod parse
   failure on every real page load once real (non-empty) history data was involved — surfaced as
   "Assessment workspace could not be loaded" in the Playwright run, root-caused via direct `curl`
   against every new route (all correct) plus reading the actual generated Zod schemas side by
   side with the OpenAPI source, not guessed. Fixed by switching all four fields to the generator's
   correctly-supported `nullable: true` idiom (already used correctly elsewhere in the spec).
4. **Pre-existing sidebar color-contrast accessibility defect** — `code { color: var(--ink-muted) }`
   (a global rule intended for light-background contexts) was never overridden for the `<code>`
   build-hash element inside the dark sidebar footer's `.contract` block, giving a 2.93:1 contrast
   ratio against the required 4.5:1 (WCAG 2 AA). Never caught before because
   `f2-assessment-core.spec.ts`'s axe-core check had never previously run to completion in this
   campaign's history — every earlier run failed on something else first. Root-caused via a
   temporary debug `console.log` of the full axe violation payload (node target, exact fg/bg
   colors) rather than guessing from the "color-contrast" rule id alone. Fixed with a two-line
   `.sidebarFooter .contract code { color: var(--sidebar-muted); }` override, reusing the exact
   color already proven adequate on the sibling `span`/`strong` elements in that same block —
   unrelated to G-01's own markup, fixed anyway per the campaign's standing rule to fix real
   accessibility defects on sight rather than defer them because they weren't "yours."

**One real, non-bug finding, documented rather than worked around**: every mutating form submission
in the assessment lifecycle takes ~9-12 seconds of genuine round-trip latency (server action → BFF
proxy → NestJS → Supabase → full SSR page reload, several `TenantScopedDb.withTenant` calls per
reload) — confirmed via direct trace inspection of `before`/`after` action timestamps, not assumed.
Across the ~13 sequential mutating actions this one test chains (create, 4 evidence-lifecycle
actions, applicability, 2 answers, 2 reviews, reopen, 2 test-procedure actions, close, 2 more), this
comfortably exceeded the previous 120s `test.setTimeout`, especially once G-01's new sections added
their own read calls to every page load. `test.setTimeout` bumped to 300_000ms with the reasoning
documented inline in the spec — the same "legitimately slow real I/O, not a bug" pattern already
established elsewhere in this campaign (`a3-evidence-risk-api.test.ts`, `a7-privacy-api.test.ts`,
and this session's framework-content workbook-parsing tests).

**Also fixed in passing**: two framework-content tests
(`test/framework-content/a1-persistence-and-service.test.ts`,
`test/framework-content/source-ingestion.test.ts`) that parse real Excel workbooks with no explicit
timeout were landing at 5-6.5s against the default 5000ms vitest timeout — surfaced as false
failures in the full backend gate's concurrent-file run, confirmed via isolated re-runs (both alone
and in a small group) landing consistently near/over the boundary, i.e. real latency, not
concurrency-driven flakiness. Bumped both to `30_000`ms, matching established precedent.

**Verification, cleanly, in this order**: backend `npm run typecheck`/`lint` clean after every edit;
full backend gate (`npm run test` + `arch:test` + `migration:lint` + `openapi:check`) — **466/466
tests passing across 38 files**, all checks green; frontend `npm run typecheck`/`lint` clean; frontend
`npm run unit` — **23/23 passing** (including the corrected `api-contract.test.ts`); frontend
`npm run build` — clean, performance budget passed for all 10 interactive routes; Playwright
`e2e/f2-assessment-core.spec.ts` — **1/1 passing**, 5.2 minutes, axe-clean.

**G-01 is now closed** in every sense the campaign's Section 1 bar requires: real backend
unit/domain tests, real Supabase integration tests, real RLS coverage (from earlier stages), a real
Backfill→Constrain→Cutover→Contract migration lifecycle completed and verified, real frontend UI
extending the existing assessment workspace (no dangling nav links — this extends an existing,
already-linked page), and a real passing Playwright e2e against the live backend. Full detail for
every prior stage lives above in this same "### G-01" section family; this entry closes the loop.

**Next concrete action:** task #113 (G-03 — fix `findings.assessment_item_id`/`test_result_id`'s
"at least one source" nullable-FK shape per spec §11/§12, now that `control_test_results` exists as
a real, wired table). Re-read the gap report and the relevant spec sections fresh before starting —
this ledger entry is a snapshot of intent, not a substitute for re-verifying the current live shape
of the `findings` table and its constraints.

### G-03 remaining shape gap (task #113) — closed. G-03 is now fully closed (the `risk_id` linkage
### closed 2026-07-06; this was the one remaining piece).

**What was wrong:** `findings.assessment_item_id` was `uuid not null` (with a validated FK, added
under G-02) — a manual assessment item was the *only* possible source for a finding. Spec §11/§12
describes `assessment_item_id`/`test_result_id` as both nullable FKs with an "at least one source"
constraint, allowing findings to originate from an automated/manual control test result instead of
(or in addition to) a manual assessment item. This was blocked until `control_test_results` (the
alternative source's owning table) existed as a real, wired table — which G-01's Final Completion
Pass work this session provided.

**What was built:** migration `0028_g03_findings_test_result_source.sql` — `assessment_item_id`
relaxed to nullable, `test_result_id` added as a nullable FK to `control_test_results(id)`, and a
`findings_has_source` CHECK constraint (`assessment_item_id is not null or test_result_id is not
null`) added via the `NOT VALID` → `VALIDATE CONSTRAINT` two-step (matching G-02's own precedent for
this exact table). Verified backward-compatible: all 1,297 live rows already had a non-null
`assessment_item_id` (the only path that existed before), so the validation scan rejected zero rows
— confirmed by the migration applying cleanly with no manual reconciliation needed.

Domain (`risk.ts`): `Finding.assessmentItemId`/`testResultId` are now both `string | null`;
`createFinding` throws if neither is provided, mirroring the DB constraint at the application layer
(the same "constraint duplicated in domain and DB" pattern used throughout this campaign). Service
layer: `createFinding`'s domain-factory call now goes through the pre-existing `fromDomain()` helper
(already used by `createRiskModel`/`createRisk`/`createRiskLink`/`createRiskTreatment`), so the
domain's thrown Error surfaces as a real `400 Bad Request`, not an uncaught `500`. Repository:
`findingColumns()`/`mapFinding()`/insert/list updated for the new column and an optional
`testResultId` list filter, following the same `and column = $N` predicate-array pattern already
used for `assessmentItemId`. Controller: `CreateFindingDto.assessmentItemId` changed from required
to optional, `testResultId` added optional, `FindingListQueryDto` gained an optional `testResultId`
filter. OpenAPI: `CreateFindingRequest`/`Finding` schemas updated (`assessmentItemId`/`testResultId`
both nullable on the response type; only `severity`/`description` remain in `CreateFindingRequest`'s
`required` list, with an inline comment explaining why "required" can't express an at-least-one-of-
two constraint), the `listRiskFindings` query gained a `testResultId` parameter. Both
`openapi:check`/`contract:check` confirmed current after regeneration.

**No frontend change needed** — the existing `RiskWorkflow` finding-creation form on
`app/assessments/page.tsx` already only ever sets `assessmentItemId` (never `testResultId`), which
remains one of the two valid "at least one source" paths, completely unchanged by this fix. This is
a backend schema-shape correction, not a new user-facing capability, so it does not fall under the
campaign's "no dangling nav without working UI" rule — there is no new nav surface here to gate.

**Real tests, all passing:** 4 new pure-function domain unit tests in
`test/evidence-risk/a3-risk-acceptance-domain.test.ts` ("createFinding: at-least-one-source rule")
covering all four combinations (neither → rejected, item-only, result-only, both). 3 new real-
Supabase integration tests in `test/evidence-risk/a3-schema-integrity.test.ts`
("G-03: findings_has_source constraint") proving the DB itself — not just the domain layer — rejects
a sourceless insert, accepts a test-result-only insert (seeding a real `test_procedures`/
`control_test_results` chain via a new `seedControlTestResult` helper), and rejects a `test_result_id`
referencing a non-existent row. All pre-existing G-02/G-03/G-09 findings-adjacent tests (10 more,
unaffected) re-run clean alongside them.

**Verification:** `npm run typecheck`/`npm run lint` clean. The 6 directly-affected test files
(`a3-risk-acceptance-domain.test.ts`, `a3-schema-integrity.test.ts`, `a3-evidence-risk-api.test.ts`,
`m2-assessment-sequence.test.ts`, `a3-service-orchestration.test.ts`, `g09-risk-register.test.ts`)
re-run together — **59/59 passing**. Full backend gate re-run clean — **473/473 tests passing
across 38 files** (up from 466 at G-01's close, +7 new G-03 tests), architecture-boundary/migration-
convention/OpenAPI-currency checks all green.

**G-03 is now fully closed** — both the `risk_id` enterprise-risk-register linkage (closed
2026-07-06, under G-09) and this "at least one source" shape gap are done, tested, and verified
against the live schema.

**Next concrete action:** task #114 (G-05 — build the actual target-state catalog structure per
spec §9: `source_packages`, `frameworks`, `framework_versions` separated from
`framework_content_packs`, `control_sets`, `controls`, `control_subcontrols`, `mapping_versions`,
`control_mappings` restructured, `mapping_reviews`, `mapping_conflicts`,
`tenant_catalog_subscriptions`). This is the largest remaining gap in scope — re-read the gap
report's G-05 section and spec §9 fresh before designing anything; the "groundwork only, not
closed" note and the 2026-07-06 storage-incident writeup earlier in this ledger are prior-session
context, not a substitute for that fresh read. Design the migration plan (Design → Expand →
Backfill → Dual operate → Constrain → Cutover → Contract) before writing code, and document the
scope decision the same way G-01/G-08/G-09 did before implementation began.

### G-05 target-state catalog (task #114) — Expand stage complete. G-05 is NOT closed — stated
### plainly: schema exists, nothing reads or is populated into it yet.

**Live data profile checked fresh before designing anything** (not assumed from the earlier
groundwork/incident notes above): 14 `content_source_packages`, 14 `framework_content_packs` (one
per distinct framework, 14 distinct `framework_key` values: CCPA, CMMI, DPDP, E8, GDPR, HIPAA,
HITRUST, ISO_27001, ISO_9001, NIST_SP800, PCI_DSS, PDPL, SOC2, TEST), 3,643 `framework_requirements`,
289 `harmonized_controls`, 4,523 `control_mappings`. `select owner_scope, count(*) from
framework_content_packs group by owner_scope` → all 14 rows still `'tenant'`-scoped under the
canonical content tenant — confirming the "global vs tenant visibility" gap is real and current,
not hypothetical: no tenant other than the canonical one can see any framework/harmonization
content through the standard RLS-scoped read path today. The only reason the app works at all is
`AssessmentService.resolveRequirementIds`'s own workaround — a second connection opened scoped
*as* the canonical tenant specifically to read canonical content, not a real RLS policy. This is
exactly the gap task #115 needs to close.

**Design decisions** (full reasoning also in migration `0029_g05_target_catalog_expand.sql`'s own
header comment, not just here):
1. **`source_packages` is not a new table.** It already exists functionally as
   `content_source_packages` (same identity, same shape, migration 0002). Renaming a live table
   touched by real application code for a naming difference alone is a needless risk; spec intent
   is already satisfied. Noted explicitly so a future reader doesn't go looking for a table that
   was deliberately never created.
2. **`frameworks`/`framework_versions` are new**, splitting `framework_content_packs`'
   conflated "this is SOC2" + "this is pack_version X of SOC2" into a real framework identity
   (one row per `framework_key`) and a real version identity (one row per framework+version).
3. **`control_sets`/`controls`/`control_subcontrols` are new**, replacing
   `framework_requirements`' free-text `control_id`/`control_title`/`sub_control_id`/
   `sub_control_title` columns with real rows a mapping or an assessment's pinned control ref can
   point to relationally. `controls` carries requirement text directly for the common case (most
   controls have no sub-control breakdown); `control_subcontrols` is the optional child table for
   rows that do, carrying its own requirement text (a sub-control's guidance is often materially
   different from its parent's).
4. **`mapping_versions` is new**, giving a re-harmonization pass a shared identity to be grouped
   under — today `control_mappings.version` is a per-row integer with no shared pass identity.
5. **`mapping_reviews`/`mapping_conflicts` are genuinely new tables**, not restructured existing
   ones — today `control_mappings.reviewer`/`rationale` are flat, overwritable text columns with
   no history, and `mapping_classification`'s `'conflicting'` enum value has no actual
   resolution workflow attached to it.
6. **`tenant_catalog_subscriptions` is new and is the real global-content opt-in mechanism** — but
   the RLS policy rewrite that actually makes `owner_scope = 'global'` rows visible through it is
   **deliberately deferred to its own migration (task #115)**, not bundled into this one. Reasoning:
   schema changes and RLS policy changes that touch read paths this many existing tests already
   exercise (every framework-content/harmonization test in the suite) should not land in the same
   migration — if something regresses, isolating whether it was the new tables or the new policies
   is much harder when they're one change.

**What was built** (migration `0029_g05_target_catalog_expand.sql`): the 9 new tables above, each
with the standard tenant-isolation shape (`tenant_id`, `version`, `owner_scope`, `classification`,
audit columns) and `FORCE ROW LEVEL SECURITY` plus the established two-policy-plus-grant pattern
(Supabase Auth JWT policy + `app_runtime` session-context policy + explicit grant — matching
`0025_g13_custom_platform.sql`'s pattern verbatim, corrected after an initial draft used an
invented `current_setting('app.tenant_id')` pattern that doesn't match this codebase's real
convention). Plus 4 additive nullable link columns on the existing flat tables
(`framework_content_packs.framework_version_id`, `framework_requirements.control_id_ref`,
`framework_requirements.control_subcontrol_id`, `control_mappings.mapping_version_id`) for a later
Backfill-stage migration to populate — deliberately left unpopulated by this migration, which is
schema-only.

**Real tests, all passing:** 9 new fixtures added to `test/platform-hardening/rls-matrix.test.ts`
(one per new table, with real dependency-chain seeding — e.g. `control_subcontrols`' fixture
seeds a real `frameworks` → `framework_versions` → `control_sets` → `controls` chain first, and
`mapping_reviews`/`mapping_conflicts` reference a real existing `control_mappings` row, matching
the cross-tenant-reference pattern already established for canonical shared-catalog content) — full
file re-run **172/172 passing** (up from 163), proving real tenant isolation via the actual
`app_runtime` role against live Supabase, not just that the tables exist. 5 new tests in
`test/evidence-risk/a3-schema-integrity.test.ts` ("G-05: target-state catalog constraints") proving
the `frameworks` unique constraint, the `control_subcontrols` → `controls` FK, the
`mapping_conflicts` CHECK constraint (`resolved` status requires `resolved_by`/`resolved_at`), the
`tenant_catalog_subscriptions` CHECK constraint (`framework_id` or `source_package_id` required),
and the `controls` unique constraint all actually reject bad data against the live database.

**Verification:** `npm run typecheck`/`npm run lint` clean. Both directly-affected test files
re-run individually clean before the full gate. Full backend gate re-run clean — **523/523 tests
passing across 38 files** (up from 473 before this stage, +50: 45 from the new RLS fixtures, 5
from the new schema-integrity tests), architecture-boundary/migration-convention/OpenAPI-currency
checks all green. `openapi:check` passed trivially since this stage is schema-only — no route or
DTO changes yet.

**G-05 is explicitly NOT closed.** Stated as plainly as the campaign's closure bar demands: schema
exists and is proven correct at the constraint level, but nothing backfills data into it, nothing
in the application reads from it, no RLS policy yet makes `owner_scope = 'global'` content visible
across tenants, and there is no frontend surface for any of this. Three concrete stages remain,
tracked as their own tasks:
- **Task #114's remainder — Backfill**: populate `frameworks`/`framework_versions`/`control_sets`/
  `controls`/`control_subcontrols`/`mapping_versions` from the existing 14 `framework_content_packs`
  + 3,643 `framework_requirements` + 4,523 `control_mappings` rows, then populate the 4 new link
  columns on the existing flat tables, then Cutover the application's read paths (framework-content
  listing, harmonization mapping display, `AssessmentService.resolveRequirementIds`'s own
  workaround) to the normalized tables as authoritative.
- **Task #115 — the real global/tenant RLS visibility model**: the actual policy rewrite letting
  every tenant read `owner_scope = 'global'` rows (with or without a `tenant_catalog_subscriptions`
  row — that mechanism's exact semantics are still an open design question for that task, not
  settled here) while still only ever reading their own `'tenant'`-scoped overlay rows, plus a full
  RLS test matrix proving it (positive: global content visible to every tenant; negative: one
  tenant's `'tenant'`-scoped rows stay invisible to every other tenant).
- **Task #116 — frontend labeling**: `app/frameworks/page.tsx`/`app/harmonization/page.tsx` visibly
  distinguishing global vs tenant-specific content, with real Playwright coverage.

**Given the real remaining size here** (Backfill + a full RLS visibility model + its own test
matrix + frontend labeling is comparable in scope to G-01's entire multi-stage effort), this is a
deliberate stopping point within task #114 for this session's continuous run, not a sign anything
is blocked — the next concrete action is task #114's Backfill stage, re-verifying these exact row
counts fresh (they will have grown from ongoing test-suite runs, matching the pattern already seen
with G-01's own Backfill count drift) before writing the population logic.
