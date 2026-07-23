# Cybernara Frontend↔Backend Integration Fix Report

Fix pass against `cybernara-frontend/docs/integration-audit-report.md` §7 (7 defects) and §8 (real
coverage gaps). Every fix below shipped with a freshly-run, currently-passing automated test
against the live Supabase project and live backend. No existing passing test was weakened,
skipped, or deleted to make anything look green.

## 1. Defect fixes

### 1.1 PolicyGuard hardcoded resource classification (Major)

**What was wrong, in my own words:** `PolicyGuard` built a `PolicyResource` for every
`@RequirePolicy`-guarded route with `classification: "restricted"` hardcoded as a literal string,
regardless of what kind of data the route actually served. `evaluatePolicyDecision` denies a
request if the subject's clearance ranks below the resource's classification *before* it even
checks scopes. Since every resource was pinned at the highest tier, any session whose clearance
was `"public"`, `"internal"`, or `"confidential"` — all valid values — was denied on every guarded
route no matter what role or scope it held. The frontend's own authorization logic
(`src/lib/authorization.ts`, `src/lib/navigation.ts`) never reads `session.clearance` at all, so
it would happily render an action as available and then have the backend silently reject it.
Digging into the schema, I found this wasn't actually undecided: every one of the 58 tables in
`supabase/migrations/*.sql` already has a real `classification cybernara_classification` column
with a deliberate per-table default — framework-content, harmonization, and evidence tables
default to `restricted`; almost everything else defaults to `confidential`. The guard just never
consulted any of that; it was a stub.

**Files changed:**
- `cybernara-backend/src/modules/platform-hardening/domain/hardening.ts` — added a
  `resourceTypeClassification` map (one entry per guarded `resourceType`, taken directly from each
  resource's own table's schema default) and a `classificationForResourceType()` lookup function
  that defaults to `"restricted"` for anything not listed.
- `cybernara-backend/src/modules/platform-hardening/application/policy.guard.ts` — replaced the
  hardcoded literal with `classificationForResourceType(metadata.resourceType)`.

**The fix I chose, and why:** I considered three options. (a) Fetch each resource's real row and
read its live `classification` column — the most precise option, but it would require the guard
(in `platform-hardening`) to import every other module's repository, which is exactly the
cross-module coupling `check-boundaries.mjs` and ADR-0001 exist to prevent. (b) Default the
resource classification to something low (e.g. `"public"`) — rejected outright, since that's
"fixing" an authorization bug by making the check permissive, which the task explicitly forbids.
(c) A static `resourceType → classification` map mirroring each table's own schema-defined
default. I chose (c): it's grounded in a decision the schema author already made (not something I
invented), it doesn't cross module boundaries, and unknown/future resource types still fail closed
at `"restricted"`. **Known limitation, stated plainly:** this floor doesn't reflect a specific
row's classification if it was created below its table's default (e.g. an evidence object
explicitly uploaded as `"internal"` instead of the default `"restricted"`) — that would need the
per-row lookup from option (a), which is a larger architectural change than this fix pass's scope.
I'm disclosing this rather than papering over it.

**Tests added, and their actual output:**
- `cybernara-backend/test/platform-hardening/platform-hardening.test.ts` — one new test case,
  `"resolves each guarded resource type to its schema-defined baseline classification, not a
  single hardcoded tier"`, asserting the restricted-tier resources, confidential-tier resources,
  and the fail-closed default for an unknown resource type.
- `cybernara-backend/test/platform-hardening/policy-classification-http.test.ts` (new file, 6
  tests) — real HTTP integration tests against a live-Supabase-backed Nest app, deliberately
  varying `x-user-clearance` (the exact blind spot every other HTTP integration test in this repo
  shares by hardcoding `"restricted"`): confirms a `confidential`-clearance subject with a matching
  scope now succeeds on `GET /v1/assessments` (previously would 403 — this is the actual
  regression test for the bug), confirms `internal` clearance is still correctly denied there,
  confirms `restricted` clearance still works (no behavior change for the previously-passing
  case), and confirms a `confidential`-clearance subject is still denied on the genuinely
  restricted-tier `GET /v1/framework-content/requirements` and `GET /v1/audit/events` — proving
  the fix didn't just remove enforcement.

  Actual output from this session:
  ```
  ✓ test/platform-hardening/platform-hardening.test.ts (5 tests)
  ✓ test/platform-hardening/policy-classification-http.test.ts (6 tests)
  ```
  Both included in the final full-suite run: 23 files, 72 tests passed.

### 1.2 No correlation-ID propagation (Major)

**What was wrong:** `readRequestContext` on the backend reads `x-correlation-id`/`x-request-id`
and defaults to the literal string `"missing-correlation-id"` if neither is present. Neither the
BFF proxy (`app/api/backend/[...path]/route.ts`) nor the direct server-to-backend client
(`src/lib/api/server.ts`, used by every Server Component page) ever set this header on an outgoing
request. Every backend response, audit record, and problem-details error for anything the frontend
did carried that same placeholder string, which defeats the entire point of a correlation ID.

**Files changed:**
- `cybernara-frontend/app/api/backend/[...path]/route.ts` — the proxy now computes a
  `correlationId` once per request (`request.headers.get("x-correlation-id") || randomUUID()`),
  sets it on the outgoing `x-correlation-id` header to the backend, and uses the same value
  consistently in the 401 problem-details body instead of re-reading a header that was almost
  never actually present.
- `cybernara-frontend/src/lib/api/server.ts` — `createServerApiClient` now generates one
  `randomUUID()` correlation ID per client instance and stamps it on every request made through
  that client.

**The fix I chose, and why:** For the BFF proxy, I reuse a caller-supplied ID if one exists
(future clients that want to propagate their own trace ID can), else generate one — this is the
one place in the app that already has a real incoming `NextRequest` to read from. For
`server.ts`, there's no meaningful "incoming request" concept to reuse (Server Components don't
receive one per data call), so I generate one ID per `createServerApiClient()` call and let every
API call made through that one client instance share it — since each page render or server action
calls `createServerApiClient` once and then fires multiple backend calls through it, this means
all the backend calls triggered by rendering a single page now correlate together in backend
audit logs, which is a more useful guarantee than a fresh ID per call would have been.

**Tests added, and their actual output:**
- `cybernara-frontend/test/bff-route.test.ts` — 4 new tests: the 401 body gets a real generated
  UUID when the caller sent none; the 401 body reuses a caller-supplied ID; an authenticated
  proxied request (mocked session + mocked `fetch`) forwards a real generated UUID to the backend;
  an authenticated proxied request forwards the browser's own `x-correlation-id` unchanged.
- `cybernara-frontend/test/api-server.test.ts` (new file, 3 tests) — `createServerApiClient` sets
  a real UUID header on every outgoing request; two calls through the *same* client instance share
  the same correlation ID; two calls through *separate* client instances (simulating separate page
  renders) get different IDs.

  Actual output:
  ```
  ✓ test/bff-route.test.ts (5 tests)
  ✓ test/api-server.test.ts (3 tests)
  ```

### 1.3 Dangling navigation links (Major)

**What was wrong:** `src/lib/navigation.ts` declared two `NavItem`s — "Evidence Vault"
(`/evidence`, visible to `platform_admin`/`compliance_manager`/`auditor`) and "Administration"
(`/admin`, visible to any `platform_admin`, since its `requiredScopes` was `[]`) — with no
`app/evidence/page.tsx` or `app/admin/page.tsx` anywhere in the repo. Clicking either link 404s.

**Files changed:**
- `cybernara-frontend/src/lib/navigation.ts` — removed both `NavItem` entries.
- `cybernara-frontend/test/navigation.test.ts` — updated two existing assertions and added one new
  regression test.

**The fix I chose, and why — this was the genuinely open-ended one:** I checked whether either
route had any backing requirement before deciding to remove rather than build. Evidence has real,
fully-implemented backend capability, but the frontend's own traceability matrix (`FE-04` row)
documents the entire evidence workflow as living inside `/assessments`, not a separate page — no
F0–F7 checkpoint ever describes a standalone Evidence Vault. "Administration" has no backend admin
API surface at all in the OpenAPI contract (`POST /v1/identity/tenants` is the closest thing, and
that's explicitly deferred scope), and no checkpoint or traceability row references it either. Both
were aspirational nav entries that were never actually built out in any milestone. Building fake
pages for them would have been inventing scope the repo's own evidence doesn't support, so I
removed them — the same conclusion the audit report itself suggested as one of the two valid
options.

**Why I changed two existing test expectations, not just added a new one:**
`test/navigation.test.ts` had `expect(adminItems).toContain("Administration")` and an exact-array
assertion `.toEqual(["Audit Log", "Framework Library", "Administration"])`. Both encoded the
dangling link as correct, expected behavior — the second one specifically because
`"Administration"`'s `requiredScopes: []` meant it showed up for *any* `platform_admin` session
regardless of what scopes were actually granted, which is exactly the "no backing capability, no
real gate" pattern is defect. I changed the first to check for `"Enterprise GRC"` (a real item)
and the second to the corrected 2-item array. I also added
`"never declares a nav item whose href has no backing page route"`, which cross-checks every
`operationalNavItems[].href` against the actual list of implemented routes — this is the
regression test that would have caught the original defect and will catch it again if it recurs.

  Actual output:
  ```
  ✓ test/navigation.test.ts (6 tests)
  ```

### 1.4–1.6 Missing F2 UI: reopen item, evidence scan-status, update finding (Minor ×3)

**What was wrong:** Three real, tested, in-scope backend operations —
`POST .../items/{itemId}/reopen`, `GET .../evidence/objects/{evidenceId}/scan-status`, and
`PATCH /v1/risk-workflow/findings/{findingId}` — had zero frontend consumer. Unlike the nav links,
these are genuinely in scope: `ASM-05` in the backend traceability matrix explicitly covers reopen
as a tested reviewer-workflow transition, evidence scan-status is part of the documented `FE-04`
evidence lifecycle, and finding updates are part of the `GRC-01`/`ASM-06` risk workflow. This was a
frontend delivery gap, not a scope mismatch, so I built the missing UI rather than removing
anything.

**Files changed:**
- `cybernara-frontend/app/assessments/actions/route.ts` — added `reopenItem` and `updateFinding`
  intents, following the exact pattern every other intent in this file already uses (idempotency
  key resolution, redirect back to the selected assessment).
- `cybernara-frontend/app/assessments/page.tsx` — fetches `getEvidenceScanStatus` for the selected
  evidence object and renders it as a new "Live scan status" field in `EvidenceDetail`; added a
  "Reopen item" form to `ItemWorkflow`; added an "Update finding" form to `RiskWorkflow`
  (pre-filled with the selected finding's current severity/description, matching how
  `updateRemediationTask`'s form is already pre-filled elsewhere in the same file).

**Fix chosen and why (open-ended part):** for the update-finding form, the backend's
`updateRiskFinding` takes `{ severity, description }` — I placed the form directly above "Create
remediation task" in the same panel, matching the existing layout convention where mutating forms
for the currently-selected record sit next to the record's summary. For reopen, since the backend
domain function (`reopenItem` in `assessment.ts`) only accepts an item already in `approved` or
`closed` state and transitions it to `needs_changes`, I placed the form right after "Approve item"
in the same `workflowGrid`, mirroring the real state-machine adjacency rather than putting it
somewhere arbitrary.

**Tests added, and their actual output:** rather than a narrow unit test, I extended
`cybernara-frontend/e2e/f2-assessment-core.spec.ts` — the existing full-workflow spec — with a
genuine reopen→resubmit→reapprove cycle and an update-finding step, run against the live backend.
I first read the backend's actual state-machine guards
(`cybernara-backend/src/modules/assessment/domain/assessment.ts`) to make sure the sequence I
scripted was legal: approve item → **reopen (approved→needs_changes)** → submit answer again
(needs_changes→submitted, `submitAnswer` has no status guard) → approve again (submitted→approved,
`reviewItem` requires exactly `"submitted"`) → close assessment. For the finding, the test selects
"critical" severity and a new description, submits, and asserts the new description is now visible
in the findings summary (proving the PATCH round-tripped through the real backend, not just that
the form submitted).

  Actual output:
  ```
  ✓ e2e/f2-assessment-core.spec.ts (56.2s)
  ```

### 1.7 OpenAPI operation-count documentation drift (Minor)

**What was wrong:** `cybernara-backend/docs/ARCHITECTURE.md` stated "92 paths, 119 operations" in
two places, while the live, currently-generated `openapi/cybernara.openapi.json` — verified by
direct extraction and corroborated by `npm run openapi:check` passing and
`cybernara-frontend/test/api-contract.test.ts`'s 120-entry `operationId` list — is actually 92
paths, 120 operations. A third number (91/118) exists in
`docs/checkpoints/a9-final-api-exposure-handoff.md`, and `ARCHITECTURE.md` referenced that
checkpoint file by the wrong filename (`a9-final-api-exposure.md` instead of
`a9-final-api-exposure-handoff.md`).

**Files changed:** `cybernara-backend/docs/ARCHITECTURE.md` — corrected both operation-count
mentions to 120, fixed the checkpoint filename reference, and rewrote the "Documentation Review
Notes" paragraph to explain *why* the numbers differ (the checkpoint predates the F0 addition of
`GET /v1/audit/events`) rather than just restating a second wrong number.

**Fix chosen and why:** I corrected the living reference doc (`ARCHITECTURE.md`) to match the
current generated artifact, and deliberately left the historical checkpoint
(`a9-final-api-exposure-handoff.md`, which says 91/118) untouched — it's a point-in-time record of
what was true when A9 shipped, not a living document, and editing it would misrepresent history.
I said so explicitly in `ARCHITECTURE.md` itself so a future reader isn't confused by the two
different numbers.

No test applies to a documentation-only change; verification is the direct extraction (92
paths/120 operations) already cross-checked against `test/api-contract.test.ts`, which passed in
this session's full frontend run.

## 2. §8 coverage gaps closed

### 2.1 Idempotency retry-through-BFF (previously verified only on the backend's own tests)

The original audit could only cite `cybernara-backend/test/assessment/a2-assessment-api.test.ts`'s
dedup assertion — no test exercised a real double-submit through the actual frontend path a
browser retry or double-click would take.

**File added:** `cybernara-frontend/e2e/f2-idempotency.spec.ts`. It submits the real
create-assessment form once through the UI, captures the exact rendered form body — including the
real `Idempotency-Key` hidden input value, not a synthetic one — then replays that identical body a
second time via an in-browser `fetch()` (so it uses the same cookies/session a genuine retry
would), and asserts both requests resolve to the exact same `assessmentId`. A secondary check
queries the assessment list directly and confirms exactly one record with this run's unique scope
name exists.

**A debugging note worth being honest about:** my first two attempts at this test hung for 90
seconds and failed. The root cause wasn't the retry logic at all — it was that the e2e fixture
tenant (`seededTenantId` in `e2e/support/auth.ts`) is shared across every spec file that has ever
run in this session, so `/assessments` was picking up a pre-existing assessment (with items) left
over from other tests, and eagerly fetching its evidence, report exports, and risk findings on
page load. My first test user was scoped too narrowly for those calls, so the page silently
swapped the create form for an `ErrorState` — a real instance of the exact "shared test fixture
blind spot" pattern called out in this fix pass's own instructions, just in a test I was writing
rather than one I inherited. Fixed by granting the full realistic F2 read-scope set.

  Actual output:
  ```
  ✓ e2e/f2-idempotency.spec.ts (14.0s)
  ```

### 2.2 Live pagination network verification (previously verified only by code inspection)

The original audit verified server-side pagination by reading `listing.ts` and
`pagination-controls.tsx`, corroborated by the existing (non-specific) F1 e2e test — it never
watched an actual page fetch a genuinely different second page.

**Files changed:** `cybernara-frontend/e2e/f1-framework-harmonization.spec.ts` — 2 new tests, one
for `/frameworks` requirement pagination, one for `/harmonization` control pagination.

**An architecture nuance worth stating plainly:** `/frameworks` and `/harmonization` are Next.js
Server Components. `createServerApiClient` calls the backend directly from the Next.js server
process — not through the browser-visible `/api/backend/...` proxy — so Playwright genuinely
cannot observe that specific backend-facing fetch from the browser's network tab; it doesn't
happen in the browser at all. What *is* browser-observable is the page's own navigation request
when "Next" is clicked. Each new test captures that navigation request and asserts it carries the
incremented offset (`requirementsOffset=25` / `controlsOffset=25`), and separately asserts the
first row of the resulting table is genuinely different from the first page's first row — a
combination that only a real server-side re-query with a new offset could produce; client-side
slicing of one pre-fetched array couldn't pass both assertions.

  Actual output:
  ```
  ✓ e2e/f1-framework-harmonization.spec.ts (3 tests: original F1 workflow + 2 new pagination tests)
  ```

## 3. Found and fixed beyond the original audit's list

While setting up git for the first time (see §4), I found `cybernara-frontend/.gitignore` didn't
exclude Playwright's `test-results/`, `playwright-report/`, or `blob-report/` output directories —
running the suite even once would have left trace ZIPs and screenshots staged for commit. Added
the standard entries before the initial commit. This wasn't in the original audit's defect list,
but it's the same class of gap (repo hygiene affecting future reproducibility) the audit's own §8
flagged for `generated.ts`, so I closed it at the same time.

## 4. Methodology gap: no VCS to diff `generated.ts` regeneration

The original audit noted this workspace had no git repository, so there was no way to confirm
`node scripts/generate-api-client.mjs` (run as part of contract verification) didn't silently
change `src/lib/api/generated.ts`. Per ADR-0003, `cybernara-backend` and `cybernara-frontend` are
required to be **two independent repositories** — no shared monorepo packages — so I ran
`git init` separately inside each one (not at the shared `GRC_tool/` workspace root, which would
have contradicted that architecture decision), added a real user identity for the commits, and
made one initial commit in each repo capturing this fix pass's final state. `.env` files were
confirmed excluded via each repo's existing `.gitignore` before staging (verified with
`git status --short | grep -E "^\S+ \.env$"`, which matched nothing in either repo).

## 5. Full gate results (this session, real output)

**Backend** (`cybernara-backend/`, canonical gate per `.github/workflows/ci.yml`: `npm run test` →
`npm run sources:manifest` → `npm run build`):

| Command | Result |
| --- | --- |
| `npm run test` (lint + typecheck + unit + arch:test + migration:lint + openapi:check) | **PASS** — 23 test files, 72 tests, 0 failures, ~132s |
| `npm run build` | **PASS** |
| `node scripts/schema-audit.mjs` | **PASS** — 0 diffs across all 6 diff categories; 58 expected tables present |
| `node scripts/check-source-manifest.mjs` | **PASS** — 15/15 source workbooks present with matching SHA-256 |

**Frontend** (`cybernara-frontend/`, canonical gate per `.github/workflows/ci.yml`:
`npm run contract:generate` → `npm run test` → `npm run build`):

| Command | Result |
| --- | --- |
| `node scripts/generate-api-client.mjs` then `node scripts/check-api-client-current.mjs` | **PASS** — "Generated API client is current." |
| `npm run lint` | **PASS** |
| `npm run typecheck` | **PASS** (after fixing two type errors introduced by my own new test files — an `import type` lint rule violation and a tuple-array type mismatch — both caught and fixed before this final run) |
| `npm run unit` | **PASS** — 7 test files, 23 tests, 0 failures |
| `node scripts/check-boundaries.mjs` | **PASS** |
| `node scripts/check-traceability.mjs` | **PASS** — 25 requirement/workflow rows |
| `npm run build` (includes `npm run performance:budget`) | **PASS** — 20 routes generated; performance budget passed for 10 interactive routes |
| Full Playwright suite (`npx playwright test`) | **PASS — 14/14, 4.4 minutes**, against the live Supabase project and live backend dev server |

**An infrastructure obstacle I hit and worked around, without touching any repo file:** running
two `npx playwright test` invocations concurrently (while I was fixing the idempotency test and
the pagination tests in parallel) caused real contention — both processes tried to manage the same
`webServer` ports 3000/3100 defined in `playwright.config.ts`, one process's dev server died mid
test-run, and I saw both `ENOENT` trace-artifact copy errors and `ERR_CONNECTION_REFUSED` as a
direct result. I killed the orphaned backend process and reran everything sequentially from then
on — this fully explains those two failed intermediate attempts, and both suites pass cleanly when
run one at a time, as the final full-suite run above confirms. I also reused the Playwright
Chromium binary already installed to `C:\Users\Srinjoy Roy\pw-browsers` from the original audit
(worked around the same full `D:` drive that blocked it there) — no repo file was touched for
either of these.

## 6. Regression check

Every test that passed in the original audit report still passes now. No test was weakened,
skipped, or deleted.

| Suite | Before (original audit) | After (this fix pass) | Delta explained |
| --- | --- | --- | --- |
| Backend (`npm run unit`) | 22 files / 65 tests | 23 files / 72 tests | +1 new test case in `platform-hardening.test.ts`, +1 new file `policy-classification-http.test.ts` (6 tests) — all for defect 1.1 |
| Frontend unit (`npm run unit`) | 6 files / 15 tests | 7 files / 23 tests | `bff-route.test.ts` +4 (defect 1.2), `navigation.test.ts` +1 (defect 1.3), new file `api-server.test.ts` +3 (defect 1.2) |
| Frontend Playwright (`npx playwright test`) | 11/11 | 14/14 | `f1-framework-harmonization.spec.ts` +2 (§8.2), new file `f2-idempotency.spec.ts` +1 (§8.1); `f2-assessment-core.spec.ts` gained 3 new steps inside its existing single test (defects 1.4–1.6) rather than a new test count |

## 7. Verdict

The system is now fully resolved against everything the original audit report and its own §8
flagged as a real, fixable gap: all 7 §7 defects have a real fix backed by a freshly-run passing
test, both closeable §8 coverage gaps now have real automated tests exercising the actual frontend
path rather than relying on code inspection or backend-only coverage, and the two §8 items the
audit itself marked unfixable (recovering pre-overwrite git history, and live production RLS-bypass
testing) remain correctly out of scope and untouched. Every test that was green in the original
audit is still green, plus 7 new backend tests, 8 new frontend unit tests, and 3 new/extended
Playwright tests that didn't exist before. The one intentionally-disclosed limitation is the
classification fix's floor-not-per-row-value scope boundary in §1.1 — a deliberate, explained
architectural decision rather than an unresolved defect, and it doesn't weaken enforcement relative
to what existed before this fix pass anywhere it matters.
