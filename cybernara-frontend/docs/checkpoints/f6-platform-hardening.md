# F6 Checkpoint - Platform Hardening and Non-Functionals

## Requirements and workflows closed

- RBAC/scope-aware navigation and UI action gating for protected feature areas.
- Negative role/scope tests proving restricted actions are not visible for viewer, read-only privacy, and auditor read-only enterprise sessions.
- Automated accessibility pass across F6 role-gating screens plus the existing F0-F5 page scans.
- Production performance budget wired into `npm run build`.

## Backend API target

- Version: `0.1.0-m0`
- Current contract: 92 paths, 120 operations
- Generated client current against `../cybernara-backend/openapi/cybernara.openapi.json`.
- Backend support change: `cybernara-backend/src/platform/database/database.module.ts` now defaults the Postgres pool to 4 clients, overridable by `SUPABASE_DB_POOL_MAX`, to avoid Supabase session-pool exhaustion during serialized real-backend E2E.

## Built

- `src/lib/authorization.ts`: shared role/scope helpers and feature policies for UI gating.
- `src/lib/navigation.ts`: scope-aware navigation filtering in addition to existing role filtering.
- `src/components/app-shell.tsx`: shell now renders navigation from full session claims.
- `app/privacy/page.tsx` and `app/enterprise/page.tsx`: mutation buttons render only when the session has the matching backend write scope; direct access without the feature role/read scopes renders a problem-style error state.
- `e2e/support/auth.ts`: Playwright test users can now be provisioned with explicit roles.
- `e2e/f6-hardening.spec.ts`: negative role/scope E2E coverage.
- `scripts/check-performance-budget.mjs` and `package.json`: build-time bundle budget check for interactive routes.

## Verification

| Check | Result |
| --- | --- |
| Frontend contract freshness | `npm run contract:check` passed |
| Frontend static checks | `npm run lint` and `npm run typecheck` passed |
| Frontend unit tests | 6 files, 15 tests passed |
| Frontend boundary checks | `npm run arch:test` passed |
| Frontend E2E/accessibility | 11 Chromium tests passed; F6 adds 3 role/scope-negative tests with axe scans |
| Full frontend gate | `npm run test` passed |
| Production build and performance | `npm run build` passed; performance budget passed for 10 interactive routes |
| Backend regression for pool change | `npm run test` passed; 22 files, 65 tests; `npm run build` passed |

## Accessibility notes

- Restricted users receive a semantic `role="alert"` error state instead of hidden partial data.
- Read-only pages remove unavailable action controls rather than rendering disabled controls with no explanatory backend path.
- Automated axe checks in F6 found no serious or critical violations.

## Deviations and constraints

- The backend OpenAPI contract does not expose a policy-decision endpoint. F6 therefore mirrors the actual backend policy inputs already present in the Supabase session (`roles` and `scopes`) instead of inventing a new authorization API.
- Backend policy guards and RLS remain authoritative; the UI gates are a usability and disclosure-control layer.

## Known gaps carried forward

- F7 must perform the final traceability sweep and acceptance checklist consolidation.

## Recommendation

Go for F7.
