# A6 Checkpoint - IntegrationPlatform API Exposure

## Module closed

IntegrationPlatform is now API-exposed with repository, application service, controller, DTO validation, PlatformHardening policy guards, deterministic idempotency, audit events, outbox publication, connector health/sync status, connector object provenance, webhook contracts, webhook delivery logs, automated control-test results, and assurance alert listing.

## Routes added

| Method | Path | Module |
| --- | --- | --- |
| POST | `/v1/integration-platform/connectors` | IntegrationPlatform |
| GET | `/v1/integration-platform/connectors` | IntegrationPlatform |
| GET | `/v1/integration-platform/connectors/:connectorId` | IntegrationPlatform |
| POST | `/v1/integration-platform/connectors/:connectorId/sync-runs` | IntegrationPlatform |
| GET | `/v1/integration-platform/connectors/:connectorId/sync-runs` | IntegrationPlatform |
| POST | `/v1/integration-platform/connectors/:connectorId/objects` | IntegrationPlatform |
| GET | `/v1/integration-platform/connectors/:connectorId/objects` | IntegrationPlatform |
| POST | `/v1/integration-platform/webhook-contracts` | IntegrationPlatform |
| GET | `/v1/integration-platform/webhook-contracts` | IntegrationPlatform |
| POST | `/v1/integration-platform/webhook-contracts/:webhookId/deliveries` | IntegrationPlatform |
| GET | `/v1/integration-platform/webhook-contracts/:webhookId/deliveries` | IntegrationPlatform |
| POST | `/v1/integration-platform/control-tests` | IntegrationPlatform |
| GET | `/v1/integration-platform/control-tests` | IntegrationPlatform |
| GET | `/v1/integration-platform/assurance-alerts` | IntegrationPlatform |

## Files changed

- `src/modules/integration-platform/application/integration-platform.service.ts`
- `src/modules/integration-platform/application/integration-platform.types.ts`
- `src/modules/integration-platform/application/tokens.ts`
- `src/modules/integration-platform/infrastructure/postgres-integration-platform.repository.ts`
- `src/modules/integration-platform/presentation/integration-platform.controller.ts`
- `src/modules/integration-platform/integration-platform.module.ts`
- `src/modules/integration-platform/public.ts`
- `scripts/openapi-spec.mjs`
- `openapi/cybernara.openapi.json`
- `dist/openapi/cybernara.openapi.json`
- `README.md`
- `docs/traceability-matrix.md`
- `test/integration-platform/a6-integration-api.test.ts`
- `../cybernara-frontend/src/lib/api/generated.ts`
- `../cybernara-frontend/test/api-contract.test.ts`

## Requirement status changes

`ENG-DOM-11`, `INT-01`, `INT-02`, `INT-03`, `EVD-03`, `EVD-04`, and `PRD-11` are now `A6 API-exposed`.

## Verification

| Category | Result |
| --- | --- |
| Repository tests against real Supabase | `test/integration-platform/a6-integration-api.test.ts` repository test passing for connectors, sync runs, connector objects, webhooks, delivery logs, control tests, and alerts |
| Application-service unit tests | service orchestration test passing for connector registration idempotency, outbox/audit side effects, failed control-test alert creation |
| Controller/DTO tests | missing context, missing scope, missing idempotency key, and raw secret values rejected |
| HTTP integration tests | connector -> sync -> object -> webhook contract -> delivery -> control test -> alert list passing |
| Authorization negative tests | missing context returns 401; missing `connector:*` scope returns 403 |
| Idempotency tests | replayed connector registration returns the same connector and one outbox event |
| OpenAPI freshness | `npm run openapi:check` passing |
| Frontend client freshness | `npm run contract:check` passing in `../cybernara-frontend` |
| Backend full gate | `npm run test` passing: 18 files, 53 tests, plus lint/typecheck/boundary/migration/OpenAPI checks |
| Backend build | `npm run build` passing |
| Frontend full gate | `npm run test` passing: 2 files, 5 tests, plus lint/typecheck/boundary/contract checks |
| Frontend build | `npm run build` passing |
| Schema audit | `node scripts/schema-audit.mjs` passing: 58 tables, 21 indexes, 58 RLS policies, 1 trigger, 1 function, 0 unexpected diffs |

OpenAPI contract version stayed `0.1.0-m0`; the operation set expanded with 14 IntegrationPlatform operations.

## Known gaps

Connector and webhook credentials remain secret-by-reference only. The API validates `secret://...` references and never accepts or returns raw secret material.

Standalone assurance-alert creation was not exposed because A6 only requires alert listing; alerts are created from failed automated control tests and degraded connector syncs when an owner is supplied.

No new migrations were needed for A6.

## Recommendation

Go for A7.
