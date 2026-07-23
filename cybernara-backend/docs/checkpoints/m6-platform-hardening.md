# M6 Enterprise Security and Platform Hardening Checkpoint

Date: 2026-07-02
API contract version: `0.1.0-m0` (unchanged; M6 added hardening domain internals, frontend shell helpers, and schema)
Frontend target contract: `cybernara-backend/openapi/cybernara.openapi.json`

## Requirement IDs Closed

- `BE-02`, `BE-03`, `BE-04`, `BE-06`, `BE-07`: Problem-response/correlation foundation, deny-by-default policy decision engine, optimistic concurrency, idempotency, signed export manifests, rate-limit policies, and workload timeout metadata.
- `FE-01`, `FE-02`, `FE-04`, `FE-05`: BFF/no-browser-secret posture, role-aware accessible navigation helpers, saved-view/bulk-action metadata, upload quarantine state, and browser-safe redaction helpers.
- `SEC-01` through `SEC-06`: Authorization, break-glass, encryption key records, SIEM export records, tenant/lifecycle evidence, assurance framework evidence, and secure SDLC release gates.
- `PRD-12`: Private-cloud hardening foundation for customer-controlled encryption references, observability/SIEM, backup/restore tests, and release assurance.
- `EVD-05`: Signed export manifest and evidence-integrity foundation now complements M2 hashes and M5 legal-hold retention decisions.

## Explicit Deferrals

- Live SAML/OIDC/SCIM/WebAuthn/KMS/SIEM/backup providers are represented by governed references and tests, not live adapters.
- Full endpoint-level authorization matrices will grow as the domain workflows are exposed through HTTP APIs.
- Full WCAG/browser automation, virtualized large data tables, resumable object-storage uploads, and customer private-cloud deployment manifests remain productization/infrastructure work.

## Built

- `PlatformHardening` module with pure domain functions for policy decisions, optimistic concurrency, idempotency keys, rate limits, signed export manifests, encryption key records, SIEM export records, backup restore tests, assurance evidence, SDLC release gates, and upload quarantine.
- M6 migration tables for authorization decisions, rate-limit policies, export manifests, encryption key records, SIEM export records, backup restore tests, product assurance evidence, release gates, and upload sessions with tenant isolation.
- Frontend operational shell helpers for role-aware navigation, saved-view/bulk-action metadata, upload access state, and sensitive error redaction.
- Frontend console updated from M0-only status to M0-M6 milestone status.

## Verification

- Backend `npm run lint`: passed.
- Backend `npm run typecheck`: passed.
- Backend `npm run build`: passed; OpenAPI contract regenerated and current.
- Backend `npm run test`: passed; 10 test files, 25 tests, architecture boundary check, migration convention check, OpenAPI freshness check.
- Frontend `npm run lint`: passed.
- Frontend `npm run typecheck`: passed.
- Frontend `npm run test`: passed; 2 test files, 5 tests, architecture boundary check, generated client freshness check.
- Frontend `npm run build`: passed.

## Known Gaps

- Local shell used Node `v22.11.0` during npm commands while repository engines target Node `>=24.0.0`; commands passed, but Node 24 remains the supported runtime.
- OpenAPI and generated frontend client are unchanged because most milestone work is still backend domain/schema foundation rather than public HTTP workflow exposure.
- No new dependency installation was required for M6.

## Recommendation

Use the checkpoint ledger to choose the next productization slice: API exposure, deeper frontend workflows, external adapters, or deployment infrastructure.
