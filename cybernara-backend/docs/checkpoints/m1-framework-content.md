# M1 Framework Content Pipeline Checkpoint

Date: 2026-07-02
API contract version: `0.1.0-m0` (unchanged; M1 added backend ingestion internals and schema)
Frontend target contract: `cybernara-backend/openapi/cybernara.openapi.json`

## Requirement IDs Closed

- `ENG-DOM-02`: FrameworkContent ingestion adapters, canonical requirement normalization, content-pack signatures, rejected-record diagnostics, schema.
- `ENG-DOM-03`: Harmonized control library and mapping ingestion from both harmonization workbooks.
- `FRM-01`, `FRM-02`, `FRM-03`, `FRM-04`: Implemented foundation for real source import, lineage/checksum preservation, signed versioned packs, and mapped/partial/unique harmonization.
- `PRD-01`, `PRD-02`: Implemented foundation for content packs and harmonized controls.

## Explicit Deferrals

- `FRM-05`: Custom framework admin UI/API is scaffolded through adapter/schema extension points but not user-facing yet.
- `FRM-06` / `PRD-10`: Version diff and impact queues are scaffolded by version/checksum model; full routed impact workflow is later.
- SME/legal review UI and storage-object quarantine buckets are schema-supported but not yet a completed workflow.

## Built

- `FrameworkContent` module with ExcelJS schema adapters for all 13 single-framework workbooks.
- `Harmonization` module with adapters for both harmonization workbooks.
- M1 migration tables for source packages, framework packs, requirements, harmonized controls, mappings, and rejected records.
- `npm run content:validate` CLI over the real `/sources` directory.
- Integration tests that ingest all 15 real workbooks end to end.

## Verification

- Backend `npm run test`: passed; 5 test files, 10 tests, architecture boundary check, migration convention check, OpenAPI freshness check.
- Backend `npm run build`: passed.
- Backend `npm run content:validate`: passed; 13 content packs, 3,642 canonical requirements, 378 harmonized controls, 4,522 accepted mappings, 820 rejected/quarantined mapping diagnostics.
- Frontend `npm run test`: passed; contract unchanged/current.
- Frontend `npm run build`: passed.

## Known Gaps

- 820 harmonization rows are rejected because they reference summary rows, workbook-specific source-row IDs, or source IDs that do not reconcile to canonical control/sub-control IDs. They are not silently dropped; diagnostics are available for remediation.
- The M1 publisher currently produces signed pack summaries and schema-ready records; atomic database publication can be wired into admin workflows in a later content operations slice.
- The frontend has no M1 content operations UI yet.

## Recommendation

Go for M2 Assessment Core.

