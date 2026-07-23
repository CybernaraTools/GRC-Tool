# A2 Checkpoint — Assessment API Exposure

## Module closed

Assessment is now API-exposed with repository, application service, controller, DTO validation, policy guard enforcement, idempotency replay handling, audit events, and outbox publication.

## Routes added

| Method | Path | Module |
| --- | --- | --- |
| POST | `/v1/assessments` | Assessment |
| GET | `/v1/assessments` | Assessment |
| GET | `/v1/assessments/:assessmentId` | Assessment |
| GET | `/v1/assessments/:assessmentId/items` | Assessment |
| GET | `/v1/assessments/:assessmentId/items/:itemId` | Assessment |
| POST | `/v1/assessments/:assessmentId/items/:itemId/applicability` | Assessment |
| POST | `/v1/assessments/:assessmentId/items/:itemId/answers` | Assessment |
| POST | `/v1/assessments/:assessmentId/items/:itemId/reviews` | Assessment |
| POST | `/v1/assessments/:assessmentId/items/:itemId/reopen` | Assessment |
| POST | `/v1/assessments/:assessmentId/close` | Assessment |

## Files changed

- `src/modules/assessment/application/assessment.service.ts`
- `src/modules/assessment/application/assessment.types.ts`
- `src/modules/assessment/application/tokens.ts`
- `src/modules/assessment/infrastructure/postgres-assessment.repository.ts`
- `src/modules/assessment/presentation/assessment.controller.ts`
- `src/modules/assessment/assessment.module.ts`
- `src/modules/assessment/public.ts`
- `src/modules/outbox/application/outbox.service.ts`
- `src/modules/outbox/infrastructure/postgres-outbox.repository.ts`
- `scripts/openapi-spec.mjs`
- `openapi/cybernara.openapi.json`
- `README.md`
- `docs/traceability-matrix.md`
- `test/assessment/a2-assessment-api.test.ts`
- `test/outbox/outbox.test.ts`
- `../cybernara-frontend/src/lib/api/generated.ts`
- `../cybernara-frontend/test/api-contract.test.ts`

## Requirement status changes

`ENG-DOM-04`, `ASM-01`, `ASM-02`, `ASM-03`, `ASM-04`, `ASM-05`, `PRD-03`, and `PRD-04` are now `A2 API-exposed`.

`PRD-05` and `PRD-06` are `A2 partial API-exposed`: Assessment item ownership/status/answers/evidence IDs are exposed; remediation task APIs and EvidenceAssurance object lifecycle continue in A3.

## Verification

| Category | Result |
| --- | --- |
| Repository tests against real Supabase | `test/assessment/a2-assessment-api.test.ts` repository test passing |
| Application-service orchestration | covered through HTTP lifecycle and outbox/audit idempotency path |
| Controller/DTO tests | missing idempotency key rejected with 400 |
| HTTP integration tests | create → applicability → answer → review → reopen → answer → review → close passing |
| Authorization negative tests | missing context returns 401; missing `assessment:*` scope returns 403 |
| Idempotency tests | replayed create request returns same assessment and one outbox event |
| OpenAPI freshness | `npm run openapi:check` passing |
| Frontend client freshness | `npm run contract:check` passing in `../cybernara-frontend` |
| Backend full gate | `npm run test` passing: 13 files, 32 tests, plus lint/typecheck/boundary/migration/OpenAPI checks |
| Backend build | `npm run build` passing |
| Frontend full gate | `npm run test` passing: 2 files, 5 tests, plus lint/typecheck/boundary/contract checks |
| Frontend build | `npm run build` passing |
| Schema audit | `node scripts/schema-audit.mjs` passing: 58 tables, 21 indexes, 58 RLS policies, 1 trigger, 1 function, 0 unexpected diffs |

OpenAPI contract version stayed `0.1.0-m0`; the operation set expanded with 10 Assessment operations.

## Known gaps

No A2 blocker remains. A3 should expose EvidenceAssurance and RiskWorkflow using the existing M2 schema tables.

## Recommendation

Go for A3.
