# A8 Checkpoint - EnterpriseGRC API Exposure

## Module closed

EnterpriseGRC is now API-exposed with repository, application service, controller, DTO validation, PlatformHardening policy guards, deterministic idempotency, audit events, outbox publication, and real Supabase persistence for policy versions, access reviews, vendors, audit engagements, trust-center artifacts, GRC workspaces, and custom object definitions.

## Routes added

| Method | Path | Module |
| --- | --- | --- |
| POST | `/v1/enterprise-grc/policies` | EnterpriseGRC |
| GET | `/v1/enterprise-grc/policies` | EnterpriseGRC |
| GET | `/v1/enterprise-grc/policies/:policyId` | EnterpriseGRC |
| POST | `/v1/enterprise-grc/policies/:policyId/publish` | EnterpriseGRC |
| POST | `/v1/enterprise-grc/policies/:policyId/exceptions` | EnterpriseGRC |
| POST | `/v1/enterprise-grc/access-reviews` | EnterpriseGRC |
| GET | `/v1/enterprise-grc/access-reviews` | EnterpriseGRC |
| GET | `/v1/enterprise-grc/access-reviews/:reviewId` | EnterpriseGRC |
| POST | `/v1/enterprise-grc/vendors` | EnterpriseGRC |
| GET | `/v1/enterprise-grc/vendors` | EnterpriseGRC |
| GET | `/v1/enterprise-grc/vendors/:vendorId` | EnterpriseGRC |
| POST | `/v1/enterprise-grc/audit-engagements` | EnterpriseGRC |
| GET | `/v1/enterprise-grc/audit-engagements` | EnterpriseGRC |
| GET | `/v1/enterprise-grc/audit-engagements/:engagementId` | EnterpriseGRC |
| POST | `/v1/enterprise-grc/trust-center-artifacts` | EnterpriseGRC |
| GET | `/v1/enterprise-grc/trust-center-artifacts` | EnterpriseGRC |
| GET | `/v1/enterprise-grc/trust-center-artifacts/:artifactId` | EnterpriseGRC |
| POST | `/v1/enterprise-grc/trust-center-artifacts/:artifactId/downloads` | EnterpriseGRC |
| POST | `/v1/enterprise-grc/workspaces` | EnterpriseGRC |
| GET | `/v1/enterprise-grc/workspaces` | EnterpriseGRC |
| GET | `/v1/enterprise-grc/workspaces/:workspaceId` | EnterpriseGRC |
| POST | `/v1/enterprise-grc/custom-object-definitions` | EnterpriseGRC |
| GET | `/v1/enterprise-grc/custom-object-definitions` | EnterpriseGRC |
| GET | `/v1/enterprise-grc/custom-object-definitions/:definitionId` | EnterpriseGRC |

## Files changed

- `src/modules/enterprise-grc/application/enterprise-grc.service.ts`
- `src/modules/enterprise-grc/application/enterprise-grc.types.ts`
- `src/modules/enterprise-grc/application/tokens.ts`
- `src/modules/enterprise-grc/infrastructure/postgres-enterprise-grc.repository.ts`
- `src/modules/enterprise-grc/presentation/enterprise-grc.controller.ts`
- `src/modules/enterprise-grc/enterprise-grc.module.ts`
- `src/modules/enterprise-grc/public.ts`
- `scripts/openapi-spec.mjs`
- `openapi/cybernara.openapi.json`
- `dist/openapi/cybernara.openapi.json`
- `README.md`
- `docs/traceability-matrix.md`
- `test/enterprise-grc/a8-enterprise-api.test.ts`
- `../cybernara-frontend/src/lib/api/generated.ts`
- `../cybernara-frontend/test/api-contract.test.ts`

## Requirement status changes

`ENG-DOM-08`, `GRC-02`, `GRC-03`, `GRC-04`, `GRC-05`, `GRC-06`, `GRC-07`, `GRC-08`, and `PRD-15` are now `A8 API-exposed`.

## Verification

| Category | Result |
| --- | --- |
| Repository tests against real Supabase | `test/enterprise-grc/a8-enterprise-api.test.ts` repository test passing for all seven EnterpriseGRC tables and policy/trust artifact workflow updates |
| Application-service unit tests | service orchestration test passing for policy draft idempotency, policy publication, outbox publication, and audit side effects |
| Controller/DTO tests | missing context, missing scope, and missing idempotency key rejected |
| HTTP integration tests | policy draft/publish/exception -> access review -> vendor -> audit engagement -> trust artifact/download -> workspace -> custom object flow passing |
| Authorization negative tests | missing context returns 401; missing `policy_version:*` scope returns 403 |
| Idempotency tests | replayed policy draft returns the same policy and one outbox event |
| OpenAPI freshness | `npm run openapi:check` passing |
| Frontend client freshness | `npm run contract:check` passing in `../cybernara-frontend` |
| Backend full gate | `npm run test` passing: 20 files, 61 tests, plus lint/typecheck/boundary/migration/OpenAPI checks |
| Backend build | `npm run build` passing |
| Frontend full gate | `npm run test` passing: 2 files, 5 tests, plus lint/typecheck/boundary/contract checks |
| Frontend build | `npm run build` passing |
| Schema audit | `node scripts/schema-audit.mjs` passing: 58 tables, 21 indexes, 58 RLS policies, 1 trigger, 1 function, 0 unexpected diffs |

OpenAPI contract version stayed `0.1.0-m0`; the operation set expanded with 24 EnterpriseGRC operations.

## Known gaps

EnterpriseGRC exposes create/list/get plus the explicit workflows already modeled by the domain layer. Generic update/delete endpoints were not added because the domain layer does not define those mutations.

Questionnaires, monitoring findings, contracts, request lists, and remediation task references remain ID arrays/JSON records in the current schema rather than separate EnterpriseGRC sub-resource tables. The API preserves that shape and does not invent additional tables.

No new migrations were needed for A8.

## Recommendation

Go for A9.
