# F0 Checkpoint - Frontend Foundations

## Requirements and workflows closed

- `FE-01`: Supabase email/password login/logout, server-managed session cookies, and BFF policy headers derived from validated session context rather than browser-supplied request headers.
- `FE-02`: role-aware shell/navigation foundation plus the F0 audit log viewer.
- `FE-03`: generated client loop preserved and extended with query parameters and problem-details errors.
- `FE-05`: unauthorized BFF access rejects before forwarding tenant-scoped requests.

`FE-04` remains foundation-only in F0; the full evidence upload UI is sequenced into F2.

## Backend API target

- Version: `0.1.0-m0`
- Current contract: 92 paths, 120 operations
- F0 blocker closed by backend route: `GET /v1/audit/events`

## Built

- `app/page.tsx`: F0 operational shell landing screen.
- `app/login/page.tsx`: Supabase Auth email/password login screen.
- `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`: server-side session creation and sign-out, setting/clearing `sb-access-token` and `sb-refresh-token` httpOnly cookies.
- `app/audit/page.tsx`: protected, read-only, filterable audit event viewer.
- `app/api/backend/[...path]/route.ts`: session-derived BFF proxy context.
- `src/components/app-shell.tsx`, `src/components/providers.tsx`, `src/components/ui-states.tsx`: reusable shell/provider/state primitives.
- `src/lib/auth.ts`, `src/lib/session.ts`, `src/lib/api/server.ts`, `src/lib/audit.ts`: auth redirect/cookie, session, server API, and audit filter helpers.
- `playwright.config.ts`, `e2e/f0-auth.spec.ts`: Playwright + axe baseline, protected redirects, and real Supabase login/logout journey.
- `docs/traceability-matrix.md`: frontend traceability matrix seeded for F0.

## Accessibility spot check

- Automated axe checks cover `/login` and the authenticated `/` shell: 3 Playwright tests passed, including 2 axe scans with no serious or critical violations.
- Manual keyboard spot-check expectation: login fields, submit button, primary navigation, audit filters, reset link, and sign-out button are reachable with visible focus states.

## Verification

| Check | Result |
| --- | --- |
| Lint | `npm run lint` passed |
| Typecheck | `npm run typecheck` passed |
| Unit tests | `npm run unit` passed: 4 files, 9 tests |
| Boundary check | `npm run arch:test` passed |
| Contract freshness | `npm run contract:check` passed |
| E2E/accessibility/auth | `npm run e2e` passed: 3 Chromium tests, including real Supabase email/password login and sign-out |
| Full frontend gate | `npm run test` passed |
| Production build | `npm run build` passed |

## Known gaps carried forward

- The live Supabase project had no pre-existing auth users during this fix. The Playwright auth test provisions a temporary service-role user with Cybernara `app_metadata`, signs in through the UI, then deletes that user.
- Audit viewer requires an authenticated session with `audit_event:read`; empty/error states still depend on live tenant audit data and backend availability.
- Module workflow screens start in F1.

## Go/no-go

Go for F1. The F0 verification gate is green against backend API version `0.1.0-m0` with 92 paths and 120 operations.
