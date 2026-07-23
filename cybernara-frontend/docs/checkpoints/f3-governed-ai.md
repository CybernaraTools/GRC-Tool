# F3 Checkpoint - Governed AI Surfaces

## Requirements and workflows closed

- Governed assessment-question generation with citations and confidence surfaced as AI-origin advisory content.
- Pending-review list for AI-origin question versions.
- Provenance viewer for prompt version, model deployment, retrieval index, fingerprints, status, and question lineage.
- Mandatory human approval before publish; the publish affordance is disabled until the selected AI question is approved.
- Explicit fallback generation path with a visible fallback-state note.

Deferred by backend traceability: `AI-05` broader mapping/evidence/summary/policy/impact advisory assistants, `AI-06` security-questionnaire automation, and `AI-08` standalone prompt/model promotion administration APIs.

## Backend API target

- Version: `0.1.0-m0`
- Current contract: 92 paths, 120 operations
- Generated client current against `../cybernara-backend/openapi/cybernara.openapi.json`.
- Backend contract correction made during F3: AI question `approvedBy`/`approvedAt` are nullable before human approval, matching the real API response. `npm run openapi:check` passes in the backend after regeneration.

## Built

- `app/ai/page.tsx`: protected governed AI review workspace.
- `app/ai/actions/route.ts`: BFF route for generation, fallback, human review, and publish actions.
- `src/lib/navigation.ts`: adds the manager/admin `AI Review` navigation entry.
- `e2e/f3-ai-governance.spec.ts`: real-login Playwright flow proving publish is disabled before human review, then succeeds after review, and fallback is visible.

## Verification

| Check | Result |
| --- | --- |
| Backend OpenAPI freshness | `npm run openapi:check` passed after contract regeneration |
| Frontend contract freshness | `npm run contract:check` passed |
| Static checks | `npm run lint` and `npm run typecheck` passed |
| Unit tests | 6 files, 13 tests passed |
| E2E/accessibility | 6 Chromium tests passed; F3 includes axe scan |
| Full frontend gate | `npm run test` passed |
| Production build | `npm run build` passed |

## Accessibility notes

- F3 uses native form controls, labeled textareas, real disabled state on publish-before-approval, table captions, and semantic headings.
- Automated axe scan in the F3 flow found no serious or critical violations in the targeted run.

## Deviations and constraints

- F3 exposes only the A5-built assessment-question API surface. No general-purpose AI drafting UI is present.
- The selected question can be reconstructed from provenance after approval because the pending-review endpoint intentionally no longer lists approved questions.
- Playwright E2E now runs with one worker to avoid shared real-Supabase tenant/session-pool interference across mutating F0-F3 workflows.

## Known gaps carried forward

- Integration connector management and continuous assurance alerting begin in F4.

## Recommendation

Go for F4.
