# F4 Checkpoint - Continuous Assurance and Integrations

## Requirements and workflows closed

- Secret-by-reference connector registration and connector inventory.
- Connector sync status and connector object provenance recording.
- Webhook contract registration and delivery log recording.
- Automated control-test result recording and triaged assurance-alert display.

## Backend API target

- Version: `0.1.0-m0`
- Current contract: 92 paths, 120 operations
- Generated client current against `../cybernara-backend/openapi/cybernara.openapi.json`.
- Backend contract correction made during F4: IntegrationPlatform nullable operational fields such as `lastSeenAt`, `finishedAt`, `error`, `lastError`, and optional alert payloads now match real API responses. `npm run openapi:check` passes in the backend after regeneration.

## Built

- `app/integrations/page.tsx`: protected connector, webhook, control-test, and alert workspace.
- `app/integrations/actions/route.ts`: BFF route for connector registration, sync/object recording, webhook contract/delivery recording, and control-test recording.
- `src/lib/navigation.ts`: adds the manager/admin `Integrations` navigation entry.
- `e2e/f4-integrations.spec.ts`: real-login Playwright flow covering connector -> sync -> object -> webhook -> delivery -> failing control test -> alert.

## Verification

| Check | Result |
| --- | --- |
| Backend OpenAPI freshness | `npm run openapi:check` passed after contract regeneration |
| Frontend contract freshness | `npm run contract:check` passed |
| Static checks | `npm run lint` and `npm run typecheck` passed |
| Unit tests | 6 files, 13 tests passed |
| E2E/accessibility | 7 Chromium tests passed; F4 includes axe scan |
| Full frontend gate | `npm run test` passed |
| Production build | `npm run build` passed |

## Accessibility notes

- F4 forms use native labeled fields and disabled action states when a sync run or connector is not selected.
- Tables include captions and semantic headers.
- Automated axe scan in the targeted F4 flow found no serious or critical violations.

## Deviations and constraints

- The backend exposes connector registration by `secret://...` reference only. F4 does not build a fake OAuth/service-account connect flow because no such route exists in the published API.
- Standalone assurance-alert creation is not exposed; alerts are created by failed control tests or degraded syncs and listed through the alert endpoint.

## Known gaps carried forward

- PrivacyOperations and EnterpriseGRC workflow pages begin in F5.

## Recommendation

Go for F5.
