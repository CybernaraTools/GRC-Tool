# M2 Assessment Core Checkpoint

Date: 2026-07-02
API contract version: `0.1.0-m0` (unchanged; M2 added backend domain internals and schema)
Frontend target contract: `cybernara-backend/openapi/cybernara.openapi.json`

## Requirement IDs Closed

- `ENG-DOM-04`: Assessment scope, immutable control snapshot, applicability, answer, review, and close-state domain foundation plus schema.
- `ENG-DOM-05`: Evidence metadata, quarantine, clean commit, hash, scope/period reuse checks, and schema foundation.
- `ENG-DOM-06`: Finding, remediation task, and risk-acceptance domain foundation plus schema.
- `ENG-DOM-10`: Frozen-snapshot PDF and Excel export artifact foundation with template version, idempotency key, and SHA-256 hash.
- `ASM-01`, `ASM-02`, `ASM-05`, `ASM-06`: Implemented P0 backend foundations for scope snapshots, applicability approvals, reviewer sign-off, findings, remediation, and risk acceptance.
- `EVD-01`, `EVD-02`: Implemented P0 backend foundations for evidence quarantine/commit and reuse checks.
- `PRD-03`, `PRD-04`, `PRD-06`, `PRD-13`: Implemented P0 backend foundations for assessment creation, applicability, evidence attachment, and PDF/Excel exports.

## Explicit Deferrals

- `ASM-03`, `ASM-04`, `PRD-05`, `PRD-07`, `PRD-08`, `RPT-01`: Backend foundations exist, but full saved views, comments, bulk assignment, configurable response/scoring models, escalation workflows, and branded report template catalog are not complete yet.
- `ASM-07`: Auditor portal and controlled external downloads remain a later P1 slice.
- `EVD-03`, `EVD-04`: Connector-backed automated tests, drift detection, and connector degradation alerts remain in the IntegrationPlatform milestone.
- `EVD-05`: Hashes and export integrity foundations exist; WORM retention, legal hold, and signed evidence manifests remain later.
- `EVD-06`, `RPT-02`, `RPT-03`, `PRD-09`: Campaigns, dashboards, subscriptions, and warehouse delivery remain later workflow/reporting slices.

## Built

- `Assessment` domain with pinned controls, deterministic snapshot versioning, applicability approval, evidence-backed answers, reviewer decisions, item reopen, and assessment close rules.
- `EvidenceAssurance` domain with pending/quarantined/committed/rejected states, malware-scan gate, SHA-256 content hash, and scope/period reuse validation.
- `RiskWorkflow` domain with findings, remediation tasks, and documented risk acceptance.
- `ReportingAnalytics` domain with PDF and Excel assessment snapshot exports using idempotency keys and SHA-256 hashes.
- M2 migration tables for assessments, assessment items, evidence objects, findings, remediation tasks, and report exports with tenant isolation and migration-convention fields.
- Public assessment module export to preserve module-boundary rules.
- M2 integration-style unit test covering assessment, evidence, risk, and report export sequence.

## Verification

- Backend `npm run lint`: passed.
- Backend `npm run typecheck`: passed.
- Backend `npm run build`: passed; OpenAPI contract regenerated and unchanged/current.
- Backend `npm run test`: passed; 6 test files, 12 tests, architecture boundary check, migration convention check, OpenAPI freshness check.
- Frontend `npm run lint`: passed.
- Frontend `npm run typecheck`: passed.
- Frontend `npm run test`: passed; 1 test file, 2 tests, architecture boundary check, generated client freshness check.
- Frontend `npm run build`: passed.

## Known Gaps

- M2 is a backend domain/schema foundation; no assessment workspace UI/API endpoints were added in this slice.
- Evidence storage integration, signed manifest export, retention/legal hold enforcement, and connector-driven continuous testing are not complete.
- Report output is reproducible and hashed, but not yet the full branded/template-managed report catalog described for later enterprise reporting.
- Local shell used Node `v22.11.0` during npm commands while repository engines target Node `>=24.0.0`; commands still passed, but Node 24 remains the supported runtime.

## Recommendation

Proceed to M3 Governed AI and Knowledge Automation.
