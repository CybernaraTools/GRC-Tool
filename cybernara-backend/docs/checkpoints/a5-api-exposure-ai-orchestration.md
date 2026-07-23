# A5 Checkpoint - AIOrchestration API Exposure

## Module closed

AIOrchestration is now API-exposed with repository, application service, controller, DTO validation, PlatformHardening policy guards, deterministic idempotency, audit events, outbox publication, provenance reads, explicit fallback generation, and the mandatory human-approval gate for AI-origin question publishing.

## Routes added

| Method | Path | Module |
| --- | --- | --- |
| POST | `/v1/ai-orchestration/question-generations` | AIOrchestration |
| POST | `/v1/ai-orchestration/question-generations/fallback` | AIOrchestration |
| GET | `/v1/ai-orchestration/questions/pending-review` | AIOrchestration |
| GET | `/v1/ai-orchestration/question-generations/:generationRunId/provenance` | AIOrchestration |
| POST | `/v1/ai-orchestration/question-generations/:generationRunId/reviews` | AIOrchestration |
| POST | `/v1/ai-orchestration/questions/:questionId/publish` | AIOrchestration |

## Files changed

- `src/modules/ai-orchestration/application/ai-orchestration.service.ts`
- `src/modules/ai-orchestration/application/ai-orchestration.types.ts`
- `src/modules/ai-orchestration/application/tokens.ts`
- `src/modules/ai-orchestration/infrastructure/postgres-ai-orchestration.repository.ts`
- `src/modules/ai-orchestration/presentation/ai-orchestration.controller.ts`
- `src/modules/ai-orchestration/ai-orchestration.module.ts`
- `src/modules/ai-orchestration/public.ts`
- `scripts/openapi-spec.mjs`
- `vitest.config.ts`
- `openapi/cybernara.openapi.json`
- `dist/openapi/cybernara.openapi.json`
- `README.md`
- `docs/traceability-matrix.md`
- `test/evidence-risk/a3-evidence-risk-api.test.ts`
- `test/ai-orchestration/a5-ai-api.test.ts`
- `../cybernara-frontend/src/lib/api/generated.ts`
- `../cybernara-frontend/test/api-contract.test.ts`

## Requirement status changes

`ENG-DOM-09`, `AI-01`, `AI-02`, `AI-03`, `AI-04`, `AI-07`, and `PRD-14` are now `A5 API-exposed`.

`AI-05` and `AI-06` remain future advisory/questionnaire workflow scope because A5 exposes the assessment-question generation path only. `AI-08` remains an M3 foundation row because prompt/model promotion gates are enforced in the domain and seed governance records, but no promotion-management API was added in this milestone.

## Verification

| Category | Result |
| --- | --- |
| Repository tests against real Supabase | `test/ai-orchestration/a5-ai-api.test.ts` repository test passing for governance records, generation runs, question versions, pending review, and human review |
| Application-service unit tests | service orchestration test passing for generation -> outbox/audit, idempotent replay, and pre-approval publish rejection |
| Controller/DTO tests | missing context, missing scope, missing idempotency key, and non-human review actor rejected |
| HTTP integration tests | generation -> publish rejection -> pending list -> provenance -> human review -> publish passing |
| Authorization negative tests | missing context returns 401; missing `ai_generation_run:*` scope returns 403 |
| Idempotency tests | replayed generation returns the same generation run and one outbox event |
| AI-advisory invariant | HTTP-level publish rejects an AI-origin question until a human approval review exists |
| OpenAPI freshness | `npm run openapi:check` passing |
| Frontend client freshness | `npm run contract:check` passing in `../cybernara-frontend` |
| Backend full gate | `npm run test` passing: 17 files, 49 tests, plus lint/typecheck/boundary/migration/OpenAPI checks |
| Backend build | `npm run build` passing |
| Frontend full gate | `npm run test` passing: 2 files, 5 tests, plus lint/typecheck/boundary/contract checks |
| Frontend build | `npm run build` passing |
| Schema audit | `node scripts/schema-audit.mjs` passing: 58 tables, 21 indexes, 58 RLS policies, 1 trigger, 1 function, 0 unexpected diffs |

OpenAPI contract version stayed `0.1.0-m0`; the operation set expanded with 6 AIOrchestration operations.

## Known gaps

The existing M3 schema stores retrieval provenance in `ai_retrieval_indexes.source_pack_versions`, not a dedicated citation-source table. The A5 repository preserves the deployed schema by storing the approved control citation bundle in that JSONB field and returning run/question provenance from generation and question-version records.

Prompt/model promotion management remains a domain/schema foundation and was not exposed as public API in A5 because the A5 scope only calls for governed question generation, pending approval, human review/rejection, provenance, fallback, and publish gating.

The full backend test gate originally exceeded the configured Supabase session pool limit because multiple real-Supabase integration files each created app and repository pools in parallel. `vitest.config.ts` now serializes backend test files with a single fork so the full suite remains compatible with the target project's 15-client session-pool cap.

No new migrations were needed for A5.

## Recommendation

Go for A6.
