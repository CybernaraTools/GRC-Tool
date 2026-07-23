# A9 Checkpoint - Final API Exposure Handoff

## Module closed

A9 is complete. The API Exposure stage now has schema-verified, tested backend endpoints for every A1-A8 module in scope, with OpenAPI and the frontend generated client current.

The final published API surface contains 91 paths and 118 operations across Health, IdentityTenant, AuditSecurity, Outbox, FrameworkContent, Harmonization, Assessment, EvidenceAssurance, RiskWorkflow, ReportingAnalytics, AIOrchestration, IntegrationPlatform, PrivacyOperations, and EnterpriseGRC.

## Route inventory status

`README.md` now carries the consolidated route inventory for all exposed modules.

| Module | Operations |
| --- | ---: |
| Health | 1 |
| IdentityTenant | 2 |
| AuditSecurity | 2 |
| Outbox | 1 |
| FrameworkContent | 7 |
| Harmonization | 5 |
| Assessment | 10 |
| EvidenceAssurance | 7 |
| RiskWorkflow | 9 |
| ReportingAnalytics | 4 |
| AIOrchestration | 6 |
| IntegrationPlatform | 14 |
| PrivacyOperations | 26 |
| EnterpriseGRC | 24 |

## Files changed

- `README.md`
- `docs/traceability-matrix.md`
- `docs/checkpoints/a7-api-exposure-privacy-operations.md`
- `docs/checkpoints/a8-api-exposure-enterprise-grc.md`
- `docs/checkpoints/a9-final-api-exposure-handoff.md`
- `openapi/cybernara.openapi.json`
- `dist/openapi/cybernara.openapi.json`
- `scripts/openapi-spec.mjs`
- `src/modules/privacy-operations/application/privacy-operations.service.ts`
- `src/modules/privacy-operations/application/privacy-operations.types.ts`
- `src/modules/privacy-operations/application/tokens.ts`
- `src/modules/privacy-operations/infrastructure/postgres-privacy-operations.repository.ts`
- `src/modules/privacy-operations/presentation/privacy-operations.controller.ts`
- `src/modules/privacy-operations/privacy-operations.module.ts`
- `src/modules/privacy-operations/public.ts`
- `src/modules/enterprise-grc/application/enterprise-grc.service.ts`
- `src/modules/enterprise-grc/application/enterprise-grc.types.ts`
- `src/modules/enterprise-grc/application/tokens.ts`
- `src/modules/enterprise-grc/infrastructure/postgres-enterprise-grc.repository.ts`
- `src/modules/enterprise-grc/presentation/enterprise-grc.controller.ts`
- `src/modules/enterprise-grc/enterprise-grc.module.ts`
- `src/modules/enterprise-grc/public.ts`
- `src/modules/reporting-analytics/domain/reporting.ts`
- `test/privacy-operations/a7-privacy-api.test.ts`
- `test/enterprise-grc/a8-enterprise-api.test.ts`
- `../cybernara-frontend/src/lib/api/generated.ts`
- `../cybernara-frontend/test/api-contract.test.ts`

## Requirement status changes

The traceability matrix has been swept for A9. No stale `not yet API-exposed` statuses remain.

Rows in the A1-A8 API Exposure scope are marked `API-exposed` with route/test evidence. Cross-cutting platform rows that do not map to standalone product workflow routes are marked `A9 platform verified` or `A9 frontend foundation verified`. Rows deliberately outside this API Exposure prompt are explicitly marked deferred with reasons and future test expectations.

Key A9-normalized deferred areas:

- Frontend workflow screens remain deferred to the follow-on frontend prompt.
- Custom framework authoring and regulatory-change impact queues remain deferred beyond A1.
- Broader AI advisory assistants and prompt/model promotion administration APIs remain deferred beyond A5.
- Full enterprise risk analytics, scoring dashboards, subscriptions, and warehouse-style reporting views remain deferred beyond A3/A4.
- Standalone hardening administration APIs for rate limits, keys, backup tests, SIEM export records, and release gates remain platform foundation scope unless a later admin API prompt requests them.

## Schema status

No new migrations were needed in A9. The existing migration workflow remains `npm run db:migrate`.

`node scripts/schema-audit.mjs` is clean against the configured Supabase target:

| Object type | Expected | Found | Missing |
| --- | ---: | ---: | ---: |
| Tables | 58 | 58 | 0 |
| RLS-enabled tables | 58 | 58 | 0 |
| Indexes | 21 | 21 | 0 |
| RLS policies | 58 | 58 | 0 |
| Triggers | 1 | 1 | 0 |
| Functions | 1 | 1 | 0 |
| Unexpected diffs | 0 | 0 | 0 |

Seed/reference data is present for FrameworkContent/Harmonization: 253 source packages, 253 content packs, 65,575 requirements, 3,619 harmonized controls, 81,415 mappings, and 14,779 rejected records.

## Verification

| Category | Result |
| --- | --- |
| OpenAPI regeneration | `npm run openapi:generate` completed; `openapi/cybernara.openapi.json` and `dist/openapi/cybernara.openapi.json` are valid regenerated JSON |
| OpenAPI freshness | `npm run openapi:check` passing |
| Frontend client regeneration | `npm run contract:generate` completed; generated client is current |
| Frontend client freshness | `npm run contract:check` passing in `../cybernara-frontend` |
| Backend full gate | `npm run test` passing: 20 files, 61 tests, plus lint/typecheck/boundary/migration/OpenAPI checks |
| Backend build | `npm run build` passing |
| Frontend full gate | `npm run test` passing: 2 files, 5 tests, plus lint/typecheck/boundary/contract checks |
| Frontend build | `npm run build` passing |
| Schema audit | `node scripts/schema-audit.mjs` passing: 58 tables, 21 indexes, 58 RLS policies, 1 trigger, 1 function, 0 unexpected diffs |

OpenAPI contract version remains `0.1.0-m0`.

## Known gaps

The ReportingAnalytics schema intentionally stores report metadata, SHA-256 hash, and URI rather than artifact bytes. The A4 download path preserves that design by deterministically re-rendering artifacts from the pinned snapshot and verifying the hash before streaming. A9 additionally normalized XLSX ZIP timestamps before hashing so XLSX downloads stay deterministic.

PrivacyOperations and EnterpriseGRC expose create/list/get plus the explicit workflows modeled by the existing domain layer. Generic update/delete endpoints were not invented because those mutations are not defined by the current domain model.

The traceability matrix carries every deliberate deferral explicitly. None of those deferred rows were silently worked around with mock routes, invented tables, or schema changes.

## Handoff statement

Every documented PRD workflow in the A1-A8 API Exposure scope now has a backing, schema-verified, tested endpoint. Requirements outside that scope are explicitly marked as deferred in `docs/traceability-matrix.md` with the reason and expected future verification path.

This is the handoff signal for the follow-on frontend workflow prompt.

## Recommendation

Go for frontend workflow implementation.
