# Schema Remediation — Phase 2 Slice (G-03 Risk Acceptance) Checkpoint

Date: 2026-07-05
Migration added: `0010_g03_risk_acceptances.sql`
Source documents: `Cybernara_Production_Database_Schema_Specification.pdf` (§12, §18), `Cybernara_Database_Schema_Gap_Report.pdf`

This is explicitly a **slice** of Phase 2, not the whole phase — see `docs/schema-remediation-report.md` for why the other 13 gaps were not attempted in this pass.

## Gap addressed

**G-03:** `RiskWorkflowService.acceptRisk` only ever flipped `remediation_tasks.status` to `'risk_accepted'`. The actual rationale, approver, and any compensating controls existed solely as a side channel inside the outbox/audit event payload — never queryable back, never validated for completeness, with no expiry, no scheduled re-review, and nothing stopping a `risk_accepted` task from being treated as permanently resolved.

## Scoping decision (made explicit per the standing instruction to document the reasoning when the source documents don't fully settle something)

The schema spec's `risk_acceptances` table links to a `risks` enterprise risk-register entity (§12). That table does not exist in this schema — building it is the full G-09 enterprise risk register, which is out of scope for this pass. Rather than inventing a synthetic risk-per-finding record purely to satisfy a foreign key the rest of the domain doesn't use, `risk_acceptances` in this pass is scoped to what the current domain model actually operates on: `remediation_task_id` (and, transitively, `finding_id`). When G-09 introduces a real `risks` table, `risk_acceptances` should gain a proper `risk_id` foreign key alongside this one — tracked in `docs/schema-remediation-report.md`.

## What was built

1. **`risk_acceptances`** — `remediation_task_id`/`finding_id` foreign keys, `rationale` (non-blank, checked), `approver_id`, `approved_at`, `expires_at`/`next_review_due_at` (both checked `> approved_at`), optional `compensating_controls`, and `superseded_at`/`superseded_by_id` for the eventual replace-on-review path. RLS: both the legacy `auth.jwt()` policy (for parity with every other table) and the new `app_current_tenant()` policy from migration 0008.
2. **`risk_acceptance_reviews`** (`@append_only`, matching the `audit_events` convention) — `risk_acceptance_id`, `reviewer_id`, `decision` (`reaffirmed`/`revoked`/`escalated`), `reason`, `reviewed_at`. A `before update or delete` trigger (`prevent_risk_acceptance_review_mutation`) raises on any attempted mutation.
3. **Domain (`src/modules/risk-workflow/domain/risk.ts`)**: `createRiskAcceptance` (validates approver, non-blank rationale, `expiresAt`/`nextReviewDueAt` both strictly after approval), `isRiskAcceptanceActive` (false if superseded, expired, or past its next-review date — a stale, never-reviewed acceptance is not treated as still valid), `reviewRiskAcceptance` (validates reviewer and non-blank reason).
4. **Repository (`PostgresRiskWorkflowRepository`)** rewritten to route every query through `TenantScopedDb.withTenant(...)` instead of the raw pool — this is the proof-of-mechanism referenced in the Phase 1 checkpoint. Added `createRiskAcceptance`, `findActiveRiskAcceptanceForTask` (excludes superseded rows, orders by `approved_at desc`), `findRiskAcceptance`, `createRiskAcceptanceReview`.
5. **Service (`RiskWorkflowService`)**: `acceptRisk` now requires `expiresAt`/`nextReviewDueAt` (and accepts optional `compensatingControls`), creates the domain `RiskAcceptance` and persists it in the same call as the task-status update, and includes `riskAcceptanceId` in the outbox/audit payload (in addition to, not instead of, the existing audit trail). New `getRiskAcceptanceForTask` (404s if none exists; computes `active` via `isRiskAcceptanceActive`) and `reviewRiskAcceptance` (full idempotency-replay handling via the outbox, 409s if no active acceptance exists for the task).
6. **Controller**: `RiskAcceptanceDto` extended with required `expiresAt`/`nextReviewDueAt` and optional `compensatingControls`; two new endpoints — `GET /v1/risk-workflow/remediation-tasks/:taskId/risk-acceptance` and `POST /v1/risk-workflow/remediation-tasks/:taskId/risk-acceptance/reviews`.
7. **OpenAPI + frontend client**: `scripts/openapi-spec.mjs` updated with the new request/response schemas and the two new paths; `npm run openapi:generate` regenerated `openapi/cybernara.openapi.json`; the frontend's `npm run contract:generate` regenerated `src/lib/api/generated.ts` from it (new `RiskAcceptance`/`RiskAcceptanceReview` types, three client methods). The frontend's `app/assessments/page.tsx` "Accept remediation risk" form and its `acceptRisk` BFF action were updated to collect and forward the two new required fields plus the optional one.

## Why two existing tests' expectations were changed (not just made to pass)

- `test/evidence-risk/a3-service-orchestration.test.ts`: the prior test was literally titled "...records the reason in audit/outbox side effects" — asserting that the side-channel audit payload *was* the complete acceptance record, which is exactly the gap G-03 closes. Renamed and rewritten to assert the real `risk_acceptances` row is what backs the status transition, with the audit/outbox trail as a secondary record.
- `test/evidence-risk/a3-evidence-risk-api.test.ts`: two repository-level tests constructed findings with a random, unrelated `assessmentItemId` — valid before G-02's foreign key existed, a guaranteed FK violation after. Fixed by seeding a real `assessments`/`assessment_items` chain first, not by relaxing the FK or the test's assertions.

## Verification

- `test/evidence-risk/a3-risk-acceptance-domain.test.ts` — 13 pure-function unit tests: approver/rationale/expiry/review-date validation, boundary conditions (`isRiskAcceptanceActive` treats `expiresAt`/`nextReviewDueAt` as exclusive upper bounds), supersession always wins regardless of dates, and all three review decisions.
- `test/evidence-risk/a3-schema-integrity.test.ts` — G-03 portion: real-Supabase rejection of bad `expires_at`/`next_review_due_at`/blank-rationale rows, and append-only enforcement (`UPDATE`/`DELETE` both rejected) against `risk_acceptance_reviews`. Also documents a genuine, currently-open limitation as its own test (not silently assumed): the FK on `remediation_task_id` doesn't itself guarantee the referenced task shares the same `tenant_id` as the acceptance row — today's application code always derives `remediation_task_id` from a tenant-scoped lookup first, so this can't happen through the API, but the schema alone doesn't enforce it.
- `test/evidence-risk/a3-evidence-risk-api.test.ts` — real-Supabase repository test creates an acceptance + review end to end and asserts FK rejection for a fabricated `remediation_task_id`; HTTP-level test runs finding → task → accept-risk → `GET` risk-acceptance → `POST` review through the full NestJS app.
- Manual browser verification (Preview tools, `qa-platform-admin` persona): walked the full assessment → finding → remediation task → accept-risk UI flow end to end; confirmed the new form fields render with sane defaults, submit successfully, and produce a real `risk_acceptances` row in Supabase (queried directly and printed: correct `remediation_task_id`, `finding_id`, `rationale`, `expires_at`, `next_review_due_at`).
- Full backend gate (`npm run test`, `npm run build`) and full frontend gate minus `e2e` (`lint`, `typecheck`, `unit`, `arch:test`, `contract:check`, `traceability:check`) both green — see `docs/schema-remediation-report.md` for the complete, honest gate output and the one environment-level e2e caveat.

## Known gaps / explicitly not done in this slice

- `risk_acceptances.risk_id` (linking to the enterprise risk register) does not exist — deferred to G-09, as documented above.
- No scheduled job proactively flags acceptances whose `next_review_due_at` has lapsed; `isRiskAcceptanceActive` is correct but only evaluated on read, not pushed as an alert.
- The frontend does not yet surface acceptance review history or a "review overdue" indicator — only the accept-risk submission form was updated (the minimum needed to keep the build green after the contract change); building full review-history UI was judged out of scope for this pass.

## Next

Full gap-by-gap status (including the 13 gaps not attempted) and the honest Production Acceptance Checklist / Approval Gates walkthrough are in `docs/schema-remediation-report.md`.
