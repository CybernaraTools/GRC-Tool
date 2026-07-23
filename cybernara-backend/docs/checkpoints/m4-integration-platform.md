# M4 Integration Platform and Continuous Assurance Checkpoint

Date: 2026-07-02
API contract version: `0.1.0-m0` (unchanged; M4 added backend domain internals and schema)
Frontend target contract: `cybernara-backend/openapi/cybernara.openapi.json`

## Requirement IDs Closed

- `ENG-DOM-11`: IntegrationPlatform connector lifecycle, secrets-by-reference, sync cursors, webhooks, object provenance, delivery status, and private connector contract foundations.
- `INT-01`: Least-privilege connector registration, health state, incremental sync cursor, and reconciliation foundations for cloud, identity, endpoint, code, ticketing, document, SIEM, vulnerability, and data platforms.
- `INT-02`: CRM/CLM/e-signature/auditor/trust/notification/vendor platform categories are represented; inbound/outbound objects retain provenance and delivery status.
- `INT-03`: Versioned webhook contracts, idempotency keys, rate limits, payload hashes, and observable delivery attempts are implemented as domain/schema foundations.
- `EVD-03`: Automated control test records preserve query, population, sample, result, evidence IDs, source timestamp, and connector provenance.
- `EVD-04`: Connector degradation and failed control tests create triaged assurance alerts with owner, severity, and SLA.
- `PRD-11`: Backend foundation for APIs/webhooks and connector integrations across ticketing, identity, cloud, storage/documents, SIEM, and related systems.

## Explicit Deferrals

- Live third-party connector adapters, API clients, SDK packaging, and webhook HTTP endpoints are not wired yet.
- Evidence expiration detection is represented by alert source type; freshness schedulers and dashboards remain later.
- Full connector secret rotation, reconciliation repair workflows, customer-managed private connector deployment, and connector health monitors remain later enterprise/infrastructure slices.
- Reporting dashboards for test health, trends, and drill-down lineage remain later ReportingAnalytics work.

## Built

- `IntegrationPlatform` module with pure domain functions for connector registration, sync runs, connector object reconciliation, webhook contracts, webhook deliveries, automated control tests, and assurance alerts.
- M4 migration tables for connectors, connector sync runs, connector objects, webhook contracts, webhook deliveries, automated control tests, and assurance alerts with tenant isolation.
- Least-privilege scope validation rejecting wildcard/admin scopes and unjustified write scopes.
- Secret references enforced through `secret://...` indirection for connectors and webhooks.
- Webhook contract validation for semantic contract versions, positive rate limits, idempotency keys, payload hashes, attempt counts, and failure errors.
- Unit tests covering connector lifecycle/provenance, automated control testing, drift/degradation alerts, and webhook safety.

## Verification

- Backend `npm run lint`: passed.
- Backend `npm run typecheck`: passed.
- Backend `npm run build`: passed; OpenAPI contract regenerated and current.
- Backend `npm run test`: passed; 8 test files, 19 tests, architecture boundary check, migration convention check, OpenAPI freshness check.
- Frontend `npm run lint`: passed.
- Frontend `npm run typecheck`: passed.
- Frontend `npm run test`: passed; 1 test file, 2 tests, architecture boundary check, generated client freshness check.
- Frontend `npm run build`: passed.

## Known Gaps

- Local shell used Node `v22.11.0` during npm commands while repository engines target Node `>=24.0.0`; commands passed, but Node 24 remains the supported runtime.
- No new connector SDK/provider dependencies were added; this slice is the durable domain/schema foundation.
- OpenAPI and generated frontend client are unchanged because integration workflows are not exposed through HTTP endpoints yet.

## Recommendation

Proceed to M5 Privacy Operations and Enterprise GRC.
