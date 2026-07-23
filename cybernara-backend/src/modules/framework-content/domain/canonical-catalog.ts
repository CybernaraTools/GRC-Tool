// G-05: standard framework/harmonization content (ISO 27001, SOC 2, GDPR, HIPAA, PCI DSS, etc.)
// is shared catalog content, not per-tenant data. Every ingestion of that standard content -
// whether via `npm run content:validate` or a test exercising the same pipeline - must publish
// to this one identity so the existing tenant-scoped upsert/conflict keys in
// postgres-framework-content.repository.ts correctly treat re-ingestion as an update, not a new
// tenant's copy. Publishing standard content under any other tenant_id is what caused the G-05
// duplication incident (see docs/schema-remediation-report.md).
export const CANONICAL_CONTENT_TENANT_ID = "00000000-0000-4000-8000-000000000001";
export const CANONICAL_CONTENT_ACTOR_ID = "00000000-0000-4000-8000-000000000002";
