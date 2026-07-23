# A7 Checkpoint - PrivacyOperations API Exposure

## Module closed

PrivacyOperations is now API-exposed with repository, application service, controller, DTO validation, PlatformHardening policy guards, deterministic idempotency, audit events, outbox publication, and real Supabase persistence for inventory, RoPA processing activities, DPIA assessments, privacy rights requests, consent records, privacy incidents, and retention/legal-hold evaluation.

## Routes added

| Method | Path | Module |
| --- | --- | --- |
| POST | `/v1/privacy-operations/inventory-records` | PrivacyOperations |
| GET | `/v1/privacy-operations/inventory-records` | PrivacyOperations |
| GET | `/v1/privacy-operations/inventory-records/:recordId` | PrivacyOperations |
| POST | `/v1/privacy-operations/processing-activities` | PrivacyOperations |
| GET | `/v1/privacy-operations/processing-activities` | PrivacyOperations |
| GET | `/v1/privacy-operations/processing-activities/:activityId` | PrivacyOperations |
| POST | `/v1/privacy-operations/dpia-assessments` | PrivacyOperations |
| GET | `/v1/privacy-operations/dpia-assessments` | PrivacyOperations |
| GET | `/v1/privacy-operations/dpia-assessments/:dpiaId` | PrivacyOperations |
| POST | `/v1/privacy-operations/rights-requests` | PrivacyOperations |
| GET | `/v1/privacy-operations/rights-requests` | PrivacyOperations |
| GET | `/v1/privacy-operations/rights-requests/:requestId` | PrivacyOperations |
| POST | `/v1/privacy-operations/rights-requests/:requestId/verify-identity` | PrivacyOperations |
| POST | `/v1/privacy-operations/rights-requests/:requestId/search-tasks` | PrivacyOperations |
| POST | `/v1/privacy-operations/rights-requests/:requestId/complete` | PrivacyOperations |
| POST | `/v1/privacy-operations/consents` | PrivacyOperations |
| GET | `/v1/privacy-operations/consents` | PrivacyOperations |
| GET | `/v1/privacy-operations/consents/:consentId` | PrivacyOperations |
| POST | `/v1/privacy-operations/consents/:consentId/withdraw` | PrivacyOperations |
| POST | `/v1/privacy-operations/incidents` | PrivacyOperations |
| GET | `/v1/privacy-operations/incidents` | PrivacyOperations |
| GET | `/v1/privacy-operations/incidents/:incidentId` | PrivacyOperations |
| POST | `/v1/privacy-operations/retention-schedules` | PrivacyOperations |
| GET | `/v1/privacy-operations/retention-schedules` | PrivacyOperations |
| GET | `/v1/privacy-operations/retention-schedules/:scheduleId` | PrivacyOperations |
| GET | `/v1/privacy-operations/retention-schedules/:scheduleId/evaluation` | PrivacyOperations |

## Files changed

- `src/modules/privacy-operations/application/privacy-operations.service.ts`
- `src/modules/privacy-operations/application/privacy-operations.types.ts`
- `src/modules/privacy-operations/application/tokens.ts`
- `src/modules/privacy-operations/infrastructure/postgres-privacy-operations.repository.ts`
- `src/modules/privacy-operations/presentation/privacy-operations.controller.ts`
- `src/modules/privacy-operations/privacy-operations.module.ts`
- `src/modules/privacy-operations/public.ts`
- `scripts/openapi-spec.mjs`
- `openapi/cybernara.openapi.json`
- `dist/openapi/cybernara.openapi.json`
- `README.md`
- `docs/traceability-matrix.md`
- `test/privacy-operations/a7-privacy-api.test.ts`
- `../cybernara-frontend/src/lib/api/generated.ts`
- `../cybernara-frontend/test/api-contract.test.ts`

## Requirement status changes

`ENG-DOM-07`, `PRV-01`, `PRV-02`, `PRV-03`, `PRV-04`, `PRV-05`, `PRV-06`, and `PRV-07` are now `A7 API-exposed`.

## Verification

| Category | Result |
| --- | --- |
| Repository tests against real Supabase | `test/privacy-operations/a7-privacy-api.test.ts` repository test passing for all seven PrivacyOperations tables and rights/consent workflow updates |
| Application-service unit tests | service orchestration test passing for rights request idempotency, outbox publication, and audit side effects |
| Controller/DTO tests | missing context, missing scope, and missing idempotency key rejected |
| HTTP integration tests | processing activity -> inventory -> DPIA -> rights verify/search/complete -> consent withdraw -> incident -> retention evaluation flow passing |
| Authorization negative tests | missing context returns 401; missing `data_inventory_record:*` scope returns 403 |
| Idempotency tests | replayed inventory creation returns the same record and one outbox event |
| OpenAPI freshness | `npm run openapi:check` passing |
| Frontend client freshness | `npm run contract:check` passing in `../cybernara-frontend` |
| Backend full gate | `npm run test` passing: 19 files, 57 tests, plus lint/typecheck/boundary/migration/OpenAPI checks |
| Backend build | `npm run build` passing |
| Frontend full gate | `npm run test` passing: 2 files, 5 tests, plus lint/typecheck/boundary/contract checks |
| Frontend build | `npm run build` passing |
| Schema audit | `node scripts/schema-audit.mjs` passing: 58 tables, 21 indexes, 58 RLS policies, 1 trigger, 1 function, 0 unexpected diffs |

OpenAPI contract version stayed `0.1.0-m0`; the operation set expanded with 26 PrivacyOperations operations.

## Known gaps

PrivacyOperations exposes create/list/get plus the explicit workflows already modeled by the domain layer. Generic update/delete endpoints for inventory, RoPA, DPIA, incidents, and retention were not added because the domain layer does not define those mutations.

Processing activity and inventory references are persisted as schema-supported UUID arrays without enforcing cross-table foreign keys in the current migration. The API preserves that shape and does not invent additional relationship tables.

No new migrations were needed for A7.

## Recommendation

Go for A8.
