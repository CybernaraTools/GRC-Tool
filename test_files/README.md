# Cybernara GRC Platform Onboarding

This workspace contains two sibling projects:

- `cybernara-backend`: NestJS modular monolith, Supabase/Postgres migrations, OpenAPI source of truth.
- `cybernara-frontend`: Next.js operational console and BFF, generated API client, Playwright E2E suite.

## Non-Negotiable Safety Rules

- Never commit real credentials. `.env` is local only and must remain gitignored.
- `.env.example` files must contain placeholders only.
- Never hardcode database URLs, API keys, JWTs, passwords, or project credentials in source, tests, migrations, docs, or scratch files. Read them from environment variables.
- Never insert rows directly into `supabase_migrations.schema_migrations` to make migrations appear applied. Fix the migration file, migration runner, or live schema mismatch instead.
- Delete throwaway scripts before handoff. `fix-*`, `patch*`, `check.js`, `check.cjs`, and `check.mjs` files do not belong in the final tree unless they are intentional maintained source files.
- If a migration adds a constraint with `NOT VALID`, first prove zero violations, then run `VALIDATE CONSTRAINT`, and keep both outputs as evidence.

## Required Environment

Use Node.js `>=24.0.0` and npm `10.9.x`.

Backend `.env` keys:

```dotenv
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_DB_URL=YOUR_SUPABASE_DB_URL
SUPABASE_APP_RUNTIME_DB_URL=YOUR_APP_RUNTIME_DB_URL
APP_RUNTIME_DB_PASSWORD=your-app-runtime-db-password-here
SUPABASE_DB_POOL_MAX=4
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_MODEL=gpt-4.1-mini
```

Frontend `.env` keys:

```dotenv
BACKEND_API_BASE_URL=http://localhost:3000
BACKEND_OPENAPI_PATH=../cybernara-backend/openapi/cybernara.openapi.json
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Production deployments should set `SUPABASE_APP_RUNTIME_DB_URL` to the non-owner `app_runtime` database role. `SUPABASE_DB_POOL_MAX` defaults to `4`; adjust only after measuring workload and database connection limits.

## Install

```powershell
cd cybernara-backend
npm install

cd ..\cybernara-frontend
npm install
```

## Database Migrations

Run migrations from the backend project:

```powershell
cd cybernara-backend
npm run db:migrate
```

Audit the live schema:

```powershell
node scripts/schema-audit.mjs
```

Migration hygiene checks:

```powershell
npm run migration:lint
```

## OpenAPI And Frontend Client

The backend OpenAPI document is the contract source of truth:

- Spec: `cybernara-backend/openapi/cybernara.openapi.json`
- Generator: `cybernara-backend/scripts/openapi-spec.mjs`
- Frontend generated client: `cybernara-frontend/src/lib/api/generated.ts`

When changing an endpoint:

1. Update backend implementation and OpenAPI generation.
2. Run backend contract generation/checks.
3. Regenerate the frontend client.
4. Wire UI after the generated types match the spec.

Commands:

```powershell
cd cybernara-backend
npm run openapi:generate
npm run openapi:check

cd ..\cybernara-frontend
npm run contract:generate
npm run contract:check
```

## Test And Build

Backend full gate:

```powershell
cd cybernara-backend
cmd /c "npm run typecheck && npm run lint && npm run test"
```

Backend `npm run test` includes lint, typecheck, Vitest, architecture boundaries, migration convention lint, and OpenAPI currency.

Frontend full gate:

```powershell
cd cybernara-frontend
npm run typecheck
npm run lint
npm run build
npm run e2e
```

Frontend `npm run build` includes the performance-budget check. The E2E suite includes auth, framework/harmonization browsing, assessment/evidence/reporting, AI provenance, integrations, privacy/enterprise flows, role hardening, nav crawl, task inbox, audit/retention, and custom-object round trip.

## Local Development

Run backend:

```powershell
cd cybernara-backend
npm run dev
```

Run frontend:

```powershell
cd cybernara-frontend
npm run dev
```

The frontend BFF proxies backend calls through `app/api/backend/[...path]/route.ts` and injects tenant, user, role, scope, clearance, and correlation headers from the Supabase session metadata.

## Operational Notes

- RLS enforcement must be verified with the `app_runtime` role, not only the owner/admin role.
- `postgres` has `rolbypassrls` in Supabase; tests document this and must not use that role as evidence of tenant isolation.
- Backend errors are returned as problem details with a correlation ID.
- Report downloads serve persisted frozen artifacts and verify the stored SHA-256 hash before returning bytes.
- Branch protection cannot be inferred from this local workspace. Require backend CI and frontend CI checks in GitHub before merging.
