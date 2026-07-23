# A1 Checkpoint — FrameworkContent + Harmonization API Exposure

## Git hygiene

`git rev-parse --show-toplevel` and `git status --short` both report `fatal: not a git repository (or any of the parent directories): .git` from `cybernara-backend/` and `cybernara-frontend/`. The workspace has a `.git` directory entry, but no valid `.git/HEAD`; VCS status is unavailable. Project files remained readable/buildable, so A1 proceeded.

## Schema and seed status

A0 schema verification remains clean: 58/58 expected tables, 58 RLS policies, 21 required indexes, 1 trigger, and 1 function are present with 0 diffs.

`npm run content:validate` now persists the source content. Default seed tenant row counts:

| Table | Rows |
| --- | ---: |
| `content_source_packages` | 13 |
| `framework_content_packs` | 13 |
| `framework_requirements` | 3642 |
| `harmonized_controls` | 200 |
| `control_mappings` | 4522 |
| `content_rejected_records` | 820 |

The parser sees 378 harmonized-control rows across workbooks; persistence stores 200 unique `harmonized_id` rows, matching the table constraint.

## Routes added

| Method | Path | Module |
| --- | --- | --- |
| POST | `/v1/framework-content/ingestion-runs` | FrameworkContent |
| GET | `/v1/framework-content/source-packages` | FrameworkContent |
| GET | `/v1/framework-content/content-packs` | FrameworkContent |
| GET | `/v1/framework-content/content-packs/:packId` | FrameworkContent |
| GET | `/v1/framework-content/content-packs/:packId/requirements` | FrameworkContent |
| GET | `/v1/framework-content/requirements` | FrameworkContent |
| GET | `/v1/framework-content/rejected-records` | FrameworkContent |
| GET | `/v1/harmonization/controls` | Harmonization |
| GET | `/v1/harmonization/controls/:harmonizedId` | Harmonization |
| GET | `/v1/harmonization/controls/:harmonizedId/mappings` | Harmonization |
| GET | `/v1/harmonization/frameworks/:frameworkKey/mappings` | Harmonization |
| GET | `/v1/harmonization/frameworks/:frameworkKey/unique-controls` | Harmonization |

## Files added

- `src/modules/framework-content/application/framework-content.types.ts`
- `src/modules/framework-content/application/tokens.ts`
- `src/modules/framework-content/infrastructure/postgres-framework-content.repository.ts`
- `src/modules/framework-content/presentation/framework-content.controller.ts`
- `src/modules/harmonization/application/harmonization.service.ts`
- `src/modules/harmonization/application/harmonization.types.ts`
- `src/modules/harmonization/application/tokens.ts`
- `src/modules/harmonization/infrastructure/postgres-harmonization.repository.ts`
- `src/modules/harmonization/presentation/harmonization.controller.ts`
- `src/modules/platform-hardening/application/policy.decorator.ts`
- `src/modules/platform-hardening/application/policy.guard.ts`
- `src/shared/pagination.dto.ts`
- `src/shared/pagination.ts`
- `src/shared/request-context.ts`
- `test/framework-content/a1-persistence-and-service.test.ts`
- `test/framework-content/a1-http.integration.test.ts`

## Requirement status changes

`ENG-DOM-02`, `ENG-DOM-03`, `FRM-01`, `FRM-02`, `FRM-03`, `FRM-04`, `PRD-01`, and `PRD-02` are now marked `A1 API-exposed` in `docs/traceability-matrix.md`.

## Verification

| Category | Result |
| --- | --- |
| Repository tests against real Supabase | 1 passing test |
| Application-service orchestration tests | 1 passing test |
| Controller/DTO tests | covered by HTTP missing idempotency-key check |
| HTTP integration tests | full publish/read flow passing |
| Authorization negative tests | missing context returns 401; missing Harmonization scope returns 403 |
| Idempotency tests | replayed ingestion request keeps one outbox event |
| OpenAPI freshness | `npm run openapi:check` passing |
| Backend full gate | `npm run test` passing: 12 test files, 29 tests |
| Backend build | `npm run build` passing |
| Frontend build | `npm run build` passing in `../cybernara-frontend` |
| Frontend full gate | `npm run test` passing in `../cybernara-frontend`: 2 test files, 5 tests |
| Frontend client freshness | `npm run contract:check` passing in `../cybernara-frontend` |

OpenAPI contract version stayed `0.1.0-m0`; the operation set expanded from the M0 routes to include the 12 A1 FrameworkContent/Harmonization routes.

## Known gaps

No A1 blocker remains. A2 should start with Assessment repository/application/controller exposure.

## Recommendation

Go for A2.
