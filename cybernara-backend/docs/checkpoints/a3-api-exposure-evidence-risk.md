# A3 Checkpoint - EvidenceAssurance and RiskWorkflow API Exposure

## Modules closed

EvidenceAssurance and RiskWorkflow are now API-exposed with repository, application service, controller, DTO validation, PlatformHardening policy guards, idempotency replay handling, audit events, and outbox publication.

## Routes added

| Method | Path | Module |
| --- | --- | --- |
| POST | `/v1/evidence/objects` | EvidenceAssurance |
| GET | `/v1/evidence/objects` | EvidenceAssurance |
| GET | `/v1/evidence/objects/:evidenceId` | EvidenceAssurance |
| GET | `/v1/evidence/objects/:evidenceId/scan-status` | EvidenceAssurance |
| POST | `/v1/evidence/objects/:evidenceId/quarantine` | EvidenceAssurance |
| POST | `/v1/evidence/objects/:evidenceId/commit` | EvidenceAssurance |
| POST | `/v1/evidence/objects/:evidenceId/reuse-check` | EvidenceAssurance |
| POST | `/v1/risk-workflow/findings` | RiskWorkflow |
| GET | `/v1/risk-workflow/findings` | RiskWorkflow |
| GET | `/v1/risk-workflow/findings/:findingId` | RiskWorkflow |
| PATCH | `/v1/risk-workflow/findings/:findingId` | RiskWorkflow |
| POST | `/v1/risk-workflow/remediation-tasks` | RiskWorkflow |
| GET | `/v1/risk-workflow/remediation-tasks` | RiskWorkflow |
| GET | `/v1/risk-workflow/remediation-tasks/:taskId` | RiskWorkflow |
| PATCH | `/v1/risk-workflow/remediation-tasks/:taskId` | RiskWorkflow |
| POST | `/v1/risk-workflow/remediation-tasks/:taskId/risk-acceptance` | RiskWorkflow |

## Files changed

- `src/modules/evidence-assurance/application/evidence-assurance.service.ts`
- `src/modules/evidence-assurance/application/evidence-assurance.types.ts`
- `src/modules/evidence-assurance/application/tokens.ts`
- `src/modules/evidence-assurance/infrastructure/postgres-evidence-assurance.repository.ts`
- `src/modules/evidence-assurance/presentation/evidence-assurance.controller.ts`
- `src/modules/evidence-assurance/evidence-assurance.module.ts`
- `src/modules/evidence-assurance/public.ts`
- `src/modules/risk-workflow/application/risk-workflow.service.ts`
- `src/modules/risk-workflow/application/risk-workflow.types.ts`
- `src/modules/risk-workflow/application/tokens.ts`
- `src/modules/risk-workflow/infrastructure/postgres-risk-workflow.repository.ts`
- `src/modules/risk-workflow/presentation/risk-workflow.controller.ts`
- `src/modules/risk-workflow/risk-workflow.module.ts`
- `src/modules/risk-workflow/public.ts`
- `scripts/openapi-spec.mjs`
- `openapi/cybernara.openapi.json`
- `README.md`
- `docs/traceability-matrix.md`
- `test/evidence-risk/a3-evidence-risk-api.test.ts`
- `test/evidence-risk/a3-service-orchestration.test.ts`
- `../cybernara-frontend/src/lib/api/generated.ts`
- `../cybernara-frontend/test/api-contract.test.ts`

## Requirement status changes

`ENG-DOM-05`, `ENG-DOM-06`, `EVD-01`, `EVD-02`, `ASM-06`, `PRD-05`, and `PRD-06` are now `A3 API-exposed`.

`GRC-01` and `PRD-07` are now `A3 partial API-exposed`: the schema-backed finding/remediation/risk-acceptance APIs are exposed; full enterprise risk-register and scoring views remain later reporting/workflow scope.

## Verification

| Category | Result |
| --- | --- |
| Repository tests against real Supabase | 2 tests passing for `evidence_objects`, `findings`, and `remediation_tasks` |
| Application-service unit tests | 2 tests passing with repository doubles for evidence idempotency/outbox/audit and risk acceptance orchestration |
| Controller/DTO tests | evidence and risk tests reject missing idempotency keys with 400 |
| HTTP integration tests | evidence upload -> quarantine -> scan status -> commit -> reuse check passing; assessment item -> finding -> task -> update -> risk acceptance passing |
| Authorization negative tests | EvidenceAssurance and RiskWorkflow each reject missing/wrong scopes through PlatformHardening with 401/403 |
| Idempotency tests | evidence upload replay and risk finding replay each produce one outbox event |
| OpenAPI freshness | `npm run openapi:check` passing |
| Frontend client freshness | `npm run contract:check` passing in `../cybernara-frontend` |
| Backend full gate | `npm run test` passing: 15 files, 40 tests, plus lint/typecheck/boundary/migration/OpenAPI checks |
| Backend build | `npm run build` passing |
| Frontend full gate | `npm run test` passing: 2 files, 5 tests, plus lint/typecheck/boundary/contract checks |
| Frontend build | `npm run build` passing |
| Schema audit | `node scripts/schema-audit.mjs` passing: 58 tables, 21 indexes, 58 RLS policies, 1 trigger, 1 function, 0 unexpected diffs |

OpenAPI contract version stayed `0.1.0-m0`; the operation set expanded with 16 EvidenceAssurance/RiskWorkflow operations.

## Known gaps

The existing M2 schema represents risk acceptance as `remediation_tasks.status = 'risk_accepted'`. It has no standalone risk-acceptance or exception table and no columns for acceptance reason/actor. The API preserves the domain invariant by requiring a reason and persists that reason in audit/outbox payloads without inventing columns.

No new migrations were needed for A3.

## Recommendation

Go for A4.

