# F2 Checkpoint - Assessment Core

## Requirements and workflows closed

- Assessment scope creation, pinned control selection, applicability approval, answer submission, reviewer approval, and close workflow.
- Evidence lifecycle UI for pending, quarantined, committed/rejected states plus reuse checks.
- Findings, remediation task creation/update, and risk acceptance within the assessment workspace.
- Frozen snapshot report export request and download link, with the A4 re-render-on-download constraint surfaced in the UI.

Deferred by backend traceability: `ASM-07` auditor portal, `EVD-06` evidence campaigns, `RPT-02` dashboards, and `RPT-03` subscriptions/warehouse delivery.

## Backend API target

- Version: `0.1.0-m0`
- Current contract: 92 paths, 120 operations
- Generated client current against `../cybernara-backend/openapi/cybernara.openapi.json`.
- Backend contract correction made during F2: `AssessmentItem.applicability` is nullable until an applicability decision exists, matching the real domain/API response. `npm run openapi:check` passes in the backend after regeneration.

## Built

- `app/assessments/page.tsx`: protected assessment workspace with create-scope form, item state-machine actions, evidence lifecycle, risk/remediation actions, and report export table.
- `app/assessments/actions/route.ts`: BFF form-action route using the generated backend client, session-derived backend headers, and idempotency keys.
- `src/lib/session.ts`: token-based session reader for request-scoped BFF route handlers.
- `scripts/api-client-generator.mjs`: OpenAPI `nullable` support so generated Zod schemas match runtime responses.
- `e2e/f2-assessment-core.spec.ts`: real-login Playwright flow covering create scope through report export.

## Verification

| Check | Result |
| --- | --- |
| Backend OpenAPI freshness | `npm run openapi:check` passed after contract regeneration |
| Frontend contract freshness | `npm run contract:check` passed |
| Static checks | `npm run lint` and `npm run typecheck` passed |
| Unit tests | 6 files, 13 tests passed |
| E2E/accessibility | 5 Chromium tests passed; F2 includes axe scan after the workflow completes |
| Full frontend gate | `npm run test` passed |
| Production build | `npm run build` passed |

## Accessibility notes

- Forms use explicit labels, native inputs/selects/textareas, and real buttons.
- Tables include captions and header cells.
- The F2 Playwright flow runs axe after authenticated data-backed workflow completion; no serious or critical violations in the targeted run.

## Deviations and constraints

- Report downloads are not represented as stored binary files. The UI links to the BFF download route and states that exports re-render from the pinned snapshot and are verified against the stored SHA-256 integrity signature.
- Report export idempotency follows the backend-required deterministic key `snapshotId:templateVersion:format`; the UI does not send a random idempotency key for that operation.
- Risk acceptance reasons are not displayed from the remediation task record because the backend stores them in outbox/audit payloads, not a task column.
- Assessment mutations use a route-handler BFF endpoint instead of Next server actions because server actions lost request cookie scope under the local Next.js dev runtime. The BFF boundary remains intact: browser posts only to the frontend, and backend calls still use the generated client plus session-derived headers.

## Known gaps carried forward

- Full free-text assessment search and saved views are not offered; the backend exposes list/detail/workflow routes, not saved-view APIs.
- F3 begins governed AI question generation, pending review, approval/rejection, provenance, and fallback against the real A5 API surface.

## Recommendation

Go for F3.
