# F0 Auth Gap Closure

## Scope

Closed the post-checkpoint F0 gap where the BFF could validate an existing `sb-access-token` cookie but the frontend had no way to create or clear a real Supabase session.

## Auth Method Implemented

- Supabase Auth email/password sign-in, verified against the configured project with the anon client.
- Cybernara authorization context remains sourced from Supabase `app_metadata`: `tenant_id`, `roles`, `scopes`, and `clearance`.
- `/api/auth/login` sets httpOnly `sb-access-token` and `sb-refresh-token` cookies after validating the user metadata contract.
- `/api/auth/logout` calls Supabase sign-out and clears both cookies.
- `/` and `/audit` now redirect unauthenticated or expired sessions to `/login?next=...`.

## Files Added or Updated

- `app/login/page.tsx`
- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/page.tsx`
- `app/audit/page.tsx`
- `app/api/backend/[...path]/route.ts`
- `app/styles.css`
- `src/components/app-shell.tsx`
- `src/lib/auth.ts`
- `src/lib/session.ts`
- `e2e/f0-auth.spec.ts`
- `docs/checkpoints/f0-foundations.md`
- `docs/traceability-matrix.md`
- `README.md`

## Verification

| Check | Result |
| --- | --- |
| Full frontend gate | `npm run test` passed |
| Unit tests | 4 files, 9 tests passed |
| Boundary check | `npm run arch:test` passed; Supabase remains isolated to session/auth server code |
| Contract freshness | `npm run contract:check` passed |
| E2E/auth/accessibility | 3 Chromium tests passed: login axe, protected redirect, real Supabase login -> protected shell -> sign-out -> protected redirect |
| Production build | `npm run build` passed |

## Known Notes

- The live Supabase project had no pre-existing auth users, so the E2E test creates a temporary email/password user with service role metadata and deletes it after the UI login journey.
- The F0 auth flow no longer depends on manual cookie injection.

## Recommendation

Go for F1.
