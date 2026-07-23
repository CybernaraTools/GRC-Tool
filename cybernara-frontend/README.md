# Cybernara Frontend

Next.js/React frontend for Cybernara. This repository is independent from `cybernara-backend`; it integrates through the backend OpenAPI 3.1 artifact only.

Current targeted backend API version: `0.1.0-m0` with 92 paths and 120 operations after the AuditSecurity list endpoint added for F0.

## Contract Boundary

The frontend pins a backend contract artifact and regenerates its typed client:

```bash
npm run contract:generate
```

By default the generator reads:

```text
../cybernara-backend/openapi/cybernara.openapi.json
```

Override with `BACKEND_OPENAPI_PATH` when consuming a CI artifact from another backend release. The generated client stores the contract hash, and `npm run contract:check` fails if the checked-in client is stale.

Browser components must not import backend source code or read Supabase tables directly. Supabase is limited to session handling inside BFF/server code; business data access goes through the NestJS API.

## Authentication

The F0 shell uses Supabase Auth email/password through `/login`. Successful sign-in sets httpOnly `sb-access-token` and `sb-refresh-token` cookies via the BFF; protected pages redirect to `/login?next=...` when the session is missing or expired. Supabase users must be provisioned with Cybernara `app_metadata` containing `tenant_id`, `roles`, `scopes`, and `clearance`.

## Implemented Screens

- `/`: protected operations shell.
- `/audit`: read-only, filterable audit log viewer.
- `/frameworks`: FrameworkContent browser for published content packs, pinned versions, canonical requirements, source packages, and rejected diagnostics.
- `/harmonization`: harmonized control and mapping explorer.
- `/assessments`: assessment scope, applicability, evidence lifecycle, findings/remediation, risk acceptance, and deterministic report export workflow.
- `/ai`: governed AI assessment-question generation, provenance, human approval, publish gating, and explicit fallback.
- `/integrations`: secret-referenced connector registration, sync/object telemetry, webhook delivery logs, automated control tests, and assurance alerts.
- `/privacy`: data inventory, RoPA, DPIA, rights requests, consent, incidents, and retention/legal-hold workflows.
- `/enterprise`: policy lifecycle, access reviews, vendors, audit engagements, trust artifacts, workspaces, and custom object definitions.

## Local Commands

```bash
npm install
npm run contract:generate
npm run test
npm run e2e
npm run dev
```

`npm run e2e` starts or reuses both the backend on `http://127.0.0.1:3000/v1/health` and the frontend on `http://127.0.0.1:3100`.

`npm run build` also runs the production performance budget check across the interactive routes.
