# M0 Foundations Checkpoint

Date: 2026-07-02
API contract version: `0.1.0-m0`
Frontend target contract: `cybernara-backend/openapi/cybernara.openapi.json`

## Requirement IDs Closed

- `ENG-DOM-01`: IdentityTenant schema and service foundation.
- `ENG-DOM-12`: AuditSecurity append-only hash-chain foundation.
- `BE-01`: OpenAPI 3.1 contract generation and freshness check.
- `BE-02`: RFC-style problem response and validation foundation.
- `BE-04`: Idempotent outbox event foundation.
- `BE-05`: Transactional outbox table, service, worker example, and replay-safe tests.
- `FE-01`: BFF route foundation for backend-only business access.
- `FE-03`: Generated typed API client and contract freshness check.
- `SEC-01`, `SEC-03`, `SEC-04`: Baseline tenant/RLS/audit foundations; advanced controls remain scheduled for M6.

## Explicit Deferrals

- Kubernetes, Helm, Terraform/OpenTofu, Prometheus/Grafana, and SIEM export are deferred per the Supabase phase override and recorded in ADR-0002.
- Full authorization matrix, SSO/SCIM/MFA, customer KMS, performance, and accessibility gates remain M6.
- FrameworkContent and Harmonization ingestion remain M1.

## Built

- Backend: NestJS modular monolith foundation, Supabase env validation, `pg` data access ADR, migrations, IdentityTenant, AuditSecurity, Outbox, OpenAPI generation, architecture/migration/source-manifest checks.
- Frontend: Next.js BFF shell, generated Zod API client from backend OpenAPI, contract boundary check, npm-based CI/Docker setup.
- Docs: ADRs, source-data manifest, traceability matrix, M0 checkpoint.

## Verification

- Backend `npm run test`: passed; 4 test files, 8 unit/domain tests, architecture boundary check, migration convention check, OpenAPI freshness check.
- Backend `npm run build`: passed; OpenAPI regenerated.
- Backend `npm run sources:manifest`: passed; all 15 source workbooks present with expected SHA-256 hashes.
- Backend `npm run supabase:smoke`: passed; Postgres ok, Storage ok.
- Frontend `npm run test`: passed; 1 test file, 2 contract tests, architecture boundary check, contract freshness check.
- Frontend `npm run build`: passed; Next.js production build succeeded.

## Known Gaps

- Supabase Storage buckets/policies for evidence/content/report artifacts are not created until the owning modules are implemented.
- Outbox worker dispatch is an M0 example handler; schema-versioned routing expands with M1+ events.
- Source workbook content is inventoried but not ingested; M1 owns parsing, validation, publication, and harmonization.

## Recommendation

Go for M1 Framework Content Pipeline.

