# F5 Checkpoint - Privacy Operations and Enterprise GRC

## Requirements and workflows closed

- Privacy inventory, RoPA processing activity, DPIA, rights-request, consent, incident, and retention/legal-hold workflows.
- Enterprise policy draft/publish/exception workflow.
- Enterprise access review, vendor, audit engagement, trust artifact/download, workspace, and custom object definition workflows.

## Backend API target

- Version: `0.1.0-m0`
- Current contract: 92 paths, 120 operations
- Generated client current against `../cybernara-backend/openapi/cybernara.openapi.json`.

## Built

- `app/privacy/page.tsx`: protected PrivacyOperations workspace with create/read and explicit workflow actions.
- `app/privacy/actions/route.ts`: BFF mutation route for inventory, RoPA, DPIA, rights, consent, incident, and retention actions.
- `app/enterprise/page.tsx`: protected EnterpriseGRC workspace with policy, vendor, audit, trust, workspace, and custom-object areas.
- `app/enterprise/actions/route.ts`: BFF mutation route for EnterpriseGRC create and modeled transition actions.
- `src/lib/navigation.ts`: replaces the placeholder Trust Center link with the real `/enterprise` surface.
- `e2e/f5-privacy-enterprise.spec.ts`: real-login Playwright flow covering both F5 domains.

## Verification

| Check | Result |
| --- | --- |
| Frontend contract freshness | `npm run contract:check` passed |
| Static checks | `npm run lint` and `npm run typecheck` passed |
| Unit tests | 6 files, 13 tests passed |
| Boundary checks | `npm run arch:test` passed |
| Targeted E2E/accessibility | `npx playwright test e2e/f5-privacy-enterprise.spec.ts` passed; F5 includes axe scans on `/privacy` and `/enterprise` |
| Full frontend gate | `npm run test` passed; 8 Chromium E2E tests passed |
| Production build | `npm run build` passed |

## Accessibility notes

- F5 forms are native POST forms with explicit button labels and disabled states when a required selected backend resource is missing.
- Tables include captions and semantic headers where tabular resource lists are shown.
- Automated axe scans in the F5 E2E found no serious or critical violations during the targeted pass.

## Deviations and constraints

- No generic edit/delete screens were added. PrivacyOperations and most EnterpriseGRC resources are create/read only in the backend contract.
- EnterpriseGRC questionnaire, contract, monitoring-finding, and remediation references are rendered as backend-shaped ID arrays/JSON-derived summaries, not invented sub-resource pages.
- Retention evaluation is requested from the real `GET /v1/privacy-operations/retention-schedules/:scheduleId/evaluation` endpoint at page render after a schedule is created.

## Known gaps carried forward

- F6 must add explicit RBAC/ABAC UI gating tests beyond backend rejection and complete the broader non-functional verification pass.
- Backend-deferred workflows remain deferred in the frontend traceability matrix.

## Recommendation

Go for F6.
