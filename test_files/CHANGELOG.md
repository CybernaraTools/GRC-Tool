# CHANGELOG

All notable changes to the Cybernara GRC Platform backend.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.1.0-m3] - 2026-07-09

### Changed

- OpenAPI spec version is now `0.1.0-m3`.
- `publishFrameworkContentIngestion` now writes published content to normalized G-05 tables (`framework_versions`, `control_sets`, `controls`, `control_subcontrols`) instead of the frozen legacy content tables.
- Framework-update responses now include contract-required `tenantId` on `FrameworkDiff` and `version` on `FrameworkDiffItem`.

### Added

- Runtime OpenAPI response-conformance integration test for live `/v1/tasks`, `/v1/frameworks/diffs`, `/v1/frameworks/diffs/{id}/items`, and `/v1/frameworks/updates/impacts` JSON responses.
- Backend CI has explicit schema-audit, typecheck, lint, unit, architecture, migration-lint, OpenAPI currency, source-manifest, and build steps.
- Frontend CI has explicit typecheck, lint, unit, architecture, contract, traceability, build/performance-budget, Playwright browser install, and e2e steps.

### Security

- Sanitized credential-shaped examples in tracked env examples and repository guidance files; local `.env` values remain ignored and are treated as rotated per human confirmation.

---

## [0.1.0-m2] — 2026-07-08

### Added

#### Universal Task Layer (`/v1/tasks`)
- New `universal_tasks` table and `tasks` module (migration `0033_phase12_universal_tasks.sql`)
- `GET /v1/tasks` — paginated task inbox with filtering by `status`, `priority`, `targetType`
- `GET /v1/tasks/:id` — single task retrieval
- `PATCH /v1/tasks/:id` — update task status and add resolution notes
- `target_type` enum covers: `assessment_item`, `risk`, `finding`, `evidence_review`, `framework_update_impact`, `rights_request`
- Tasks are created automatically by service layer when corresponding domain events occur

#### Framework Update / Diff & Impact (`/v1/frameworks/diffs`, `/v1/frameworks/updates/impacts`)
- New framework diff computation pipeline (migration `0034_phase16_framework_update_impact.sql`)
- `POST /v1/frameworks/diffs` — compute diff between two framework versions
- `GET /v1/frameworks/diffs` — list diffs for tenant
- `GET /v1/frameworks/diffs/:id/items` — paginated diff items
- `GET /v1/frameworks/updates/impacts` — list impacts on active assessments
- `PATCH /v1/frameworks/updates/impacts/:id` — resolve an impact (accept/ignore/reassess)
- When a diff generates impacts, corresponding `universal_tasks` rows are created automatically

#### Legacy Table Write Guards (migration `0036_phase17_freeze_legacy_tables.sql`)
- All writes to `framework_content_packs`, `framework_requirements`, `control_mappings`, `remediation_tasks`, `rights_request_tasks` now blocked by database trigger
- Error message: `Writes to legacy table <name> are blocked. Use the new normalized paths instead.`
- Bypass allowed for authorized backfill ops via `SET LOCAL app.allow_legacy_write = '1'` in a transaction

#### Performance Indexes (migration `0035_phase14_performance_indexes.sql`)
- Added covering indexes on `universal_tasks (tenant_id, status, priority, created_at)`
- Added index on `framework_diff_items (diff_id, control_key)`
- Added index on `framework_update_impacts (tenant_id, assessment_id, status)`

#### Frontend Wiring
- `reopenItem` form wired to `POST .../reopen` endpoint with required `reason` textarea
- Scan-status refresh button wired to `GET .../scan-status` via `refreshScanStatus` action
- `PATCH /v1/findings/:id` edit form wired via `updateFinding` and `updateRiskFinding` actions
- Removed all "Coming soon" placeholder strings from navigation

### Changed

- **OpenAPI spec version**: `0.1.0-m1` → `0.1.0-m2`
- `FrameworkUpdateImpact.status` enum now includes `"reassessed"` (previously only `pending`, `accepted`, `ignored`)
- `framework-update.service.ts` creates `universal_tasks` rows when impact records are generated
- `postgres-framework-update.repository.ts`: removed incorrect `JSON.parse()` on already-deserialized JSONB columns (fixed `[object Object]` serialization error in diff creation)

### Fixed

- G-08 PrivacyGraph HTTP exposure: `SET LOCAL app.allow_legacy_write = '1'` now correctly applied in transaction context
- G-09 risk-acceptance legacy write fixed via explicit transaction + legacy-write bypass
- `g17-legacy-freeze.test.ts` regex updated to match both trigger error message variants
- `framework-update.test.ts` Phase 16 integration test now passes end-to-end

### Security

- `.env.example` sanitized — previously contained real Supabase credentials (DB password, service role JWT, anon key, OpenAI key)
- `docs/schema-remediation-progress.md` and `docs/schema-remediation-report.md` redacted of Supabase project ref and host strings
- `scratch/README.md` added with mandatory no-hardcoded-credentials rule
- `.gitignore` confirms `.env` excluded; `.env.example` now contains only placeholder values

---

## [0.1.0-m1] — 2026-07-06

### Added
- G-01 Assessment execution normalization (migrations 0013, 0017, 0018, 0026, 0027)
- G-02 Finding integrity FK
- G-03 Risk acceptance completeness
- G-04 Report immutability
- G-05 Target catalog expand + backfill scripts
- G-06 AI provenance/lineage
- G-07 Evidence graph
- G-08 Privacy normalization
- G-09 Enterprise GRC depth + Risk Register
- G-10 RLS foundation + force-RLS + password rotation
- G-11 Audit hash-chain hardening
- G-12 Retention/deletion
- G-13 Custom platform
- G-14 Performance indexes + schema audit tooling
- RLS cross-tenant negative tests for all new tables
