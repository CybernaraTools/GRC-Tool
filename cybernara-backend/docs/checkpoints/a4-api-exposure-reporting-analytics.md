# A4 Checkpoint - ReportingAnalytics API Exposure

## Module closed

ReportingAnalytics is now API-exposed with repository, application service, controller, DTO validation, PlatformHardening policy guards, deterministic idempotency, audit events, outbox publication, and PDF/XLSX artifact download.

## Routes added

| Method | Path | Module |
| --- | --- | --- |
| POST | `/v1/report-exports` | ReportingAnalytics |
| GET | `/v1/report-exports` | ReportingAnalytics |
| GET | `/v1/report-exports/:exportId` | ReportingAnalytics |
| GET | `/v1/report-exports/:exportId/download` | ReportingAnalytics |

## Files changed

- `src/modules/reporting-analytics/application/reporting-analytics.service.ts`
- `src/modules/reporting-analytics/application/reporting-analytics.types.ts`
- `src/modules/reporting-analytics/application/tokens.ts`
- `src/modules/reporting-analytics/domain/reporting.ts`
- `src/modules/reporting-analytics/infrastructure/postgres-reporting-analytics.repository.ts`
- `src/modules/reporting-analytics/presentation/reporting-analytics.controller.ts`
- `src/modules/reporting-analytics/reporting-analytics.module.ts`
- `src/modules/reporting-analytics/public.ts`
- `scripts/openapi-spec.mjs`
- `openapi/cybernara.openapi.json`
- `dist/openapi/cybernara.openapi.json`
- `README.md`
- `docs/traceability-matrix.md`
- `test/reporting-analytics/a4-reporting-api.test.ts`
- `../cybernara-frontend/src/lib/api/generated.ts`
- `../cybernara-frontend/test/api-contract.test.ts`

## Requirement status changes

`ENG-DOM-10`, `RPT-01`, `PRD-08`, and `PRD-13` are now `A4 API-exposed`.

## Verification

| Category | Result |
| --- | --- |
| Repository tests against real Supabase | `test/reporting-analytics/a4-reporting-api.test.ts` repository test passing for `report_exports` |
| Application-service unit tests | service orchestration test passing for render -> persist -> outbox/audit -> idempotent replay |
| Controller/DTO tests | missing idempotency key rejected with 400 |
| HTTP integration tests | request -> poll -> download PDF and XLSX exports passing |
| Authorization negative tests | missing context returns 401; missing `report_export:*` scope returns 403 |
| Idempotency tests | replayed PDF export request returns same export and one outbox event |
| OpenAPI freshness | `npm run openapi:check` passing |
| Frontend client freshness | `npm run contract:check` passing in `../cybernara-frontend` |
| Backend full gate | `npm run test` passing: 16 files, 44 tests, plus lint/typecheck/boundary/migration/OpenAPI checks |
| Backend build | `npm run build` passing |
| Frontend full gate | `npm run test` passing: 2 files, 5 tests, plus lint/typecheck/boundary/contract checks |
| Frontend build | `npm run build` passing |
| Schema audit | `node scripts/schema-audit.mjs` passing: 58 tables, 21 indexes, 58 RLS policies, 1 trigger, 1 function, 0 unexpected diffs |

OpenAPI contract version stayed `0.1.0-m0`; the operation set expanded with 4 ReportingAnalytics operations.

## Known gaps

The existing M2 schema stores report export metadata, SHA-256 hash, and URI in `report_exports`, but does not store binary artifact bytes. The API preserves the existing schema by deterministically re-rendering artifacts from the pinned assessment snapshot on download and verifying the rendered SHA-256 against the stored hash before streaming the artifact.

No new migrations were needed for A4.

## Recommendation

Go for A5.
