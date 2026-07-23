# Cybernara Backend

NestJS/TypeScript modular monolith for Cybernara. This repository is independent from `cybernara-frontend`; integration happens only through the versioned OpenAPI contract in `openapi/cybernara.openapi.json`.

## M0 Scope

- Environment validation for Supabase and OpenAI configuration.
- Supabase Postgres migration foundation with tenant/RLS conventions.
- IdentityTenant domain shell on top of Supabase Auth identity.
- AuditSecurity append-only hash-chain core.
- Transactional outbox table, service, and worker example.
- Architecture boundary, migration lint, unit, and OpenAPI freshness checks.
- Source workbook manifest check for the 15 canonical framework/harmonization workbooks.

## Current Milestones

- M1/A1 content pipeline parses and persists the 15 real framework/harmonization workbooks through `npm run content:validate`, then exposes FrameworkContent and Harmonization APIs.
- M2/A2/A3 assessment, evidence, and risk workflow expose assessment lifecycles, evidence quarantine/commit/reuse, findings, remediation tasks, and risk acceptance APIs.
- M3 AI governance adds backend domain/schema foundations for governed question generation, fallback, prompt/model promotion, retrieval ACLs, and human approval.
- M4/A6 integration platform exposes connectors, sync cursors, object provenance, webhooks, automated control tests, and assurance alerts.
- M5/A7/A8 privacy and enterprise GRC expose privacy operations plus policy, access review, vendor, audit, trust center, workspace, and custom object APIs.
- M6 platform hardening adds backend/frontend foundations for authorization, idempotency, signed manifests, rate limits, upload quarantine, encryption, SIEM, backup/restore, assurance evidence, release gates, and browser-safe operations.
- Milestone checkpoints live in `docs/checkpoints/`.

## Contract Boundary

The backend owns the OpenAPI 3.1 contract. Run:

```bash
npm run openapi:generate
```

CI publishes `dist/openapi/cybernara.openapi.json` as an artifact. The frontend pins an artifact copy and regenerates its typed client from that spec; it must not import backend source code or shared workspace packages.

## Environment

Required variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `OPENAI_API_KEY`

`OPENAI_MODEL` is optional and defaults in configuration to a generic `gpt-4.1-mini` class model for gateway routing. Product code must not hardcode model snapshot IDs.

Startup and `npm run supabase:smoke` fail fast when required variables are missing.

## Local Commands

```bash
npm install
npm run db:migrate
npm run test
npm run supabase:smoke
npm run sources:manifest
npm run content:validate
```

`npm run db:migrate` applies pending SQL files from `supabase/migrations/` to the configured `SUPABASE_DB_URL` target and records them in `supabase_migrations.schema_migrations`. Use `npm run db:migrate -- --dry-run` to preview pending migrations.

`npm run supabase:smoke` requires a real Supabase project and does not use mocks.

`npm run content:validate` parses the 15 real `/sources` workbooks through the M1 ExcelJS adapters, publishes accepted content packs, requirements, harmonized controls, mappings, and rejected diagnostics to Supabase, and reports persisted row counts. Override the seed tenant or actor with `CONTENT_INGESTION_TENANT_ID` and `CONTENT_INGESTION_ACTOR_ID`.

## Current API Routes

Use `GET /` as the quick unauthenticated "is this thing running?" backend landing check; `GET /v1/health` remains the versioned health endpoint.

```text
GET  /                                               Root
GET  /v1/health                                      Health
POST /v1/identity/tenants                            IdentityTenant
GET  /v1/identity/tenants/:tenantId                  IdentityTenant
POST /v1/audit/events                                AuditSecurity
GET  /v1/audit/events                                AuditSecurity
GET  /v1/audit/events/:eventId                       AuditSecurity
POST /v1/outbox/events                               Outbox
POST /v1/framework-content/ingestion-runs            FrameworkContent
GET  /v1/framework-content/source-packages           FrameworkContent
GET  /v1/framework-content/content-packs             FrameworkContent
GET  /v1/framework-content/content-packs/:packId     FrameworkContent
GET  /v1/framework-content/content-packs/:packId/requirements FrameworkContent
GET  /v1/framework-content/requirements              FrameworkContent
GET  /v1/framework-content/rejected-records          FrameworkContent
GET  /v1/harmonization/controls                      Harmonization
GET  /v1/harmonization/controls/:harmonizedId        Harmonization
GET  /v1/harmonization/controls/:harmonizedId/mappings Harmonization
GET  /v1/harmonization/frameworks/:frameworkKey/mappings Harmonization
GET  /v1/harmonization/frameworks/:frameworkKey/unique-controls Harmonization
POST /v1/assessments                               Assessment
GET  /v1/assessments                               Assessment
GET  /v1/assessments/:assessmentId                 Assessment
GET  /v1/assessments/:assessmentId/items           Assessment
GET  /v1/assessments/:assessmentId/items/:itemId   Assessment
POST /v1/assessments/:assessmentId/items/:itemId/applicability Assessment
POST /v1/assessments/:assessmentId/items/:itemId/answers Assessment
POST /v1/assessments/:assessmentId/items/:itemId/reviews Assessment
POST /v1/assessments/:assessmentId/items/:itemId/reopen Assessment
POST /v1/assessments/:assessmentId/close           Assessment
POST /v1/evidence/objects                          EvidenceAssurance
GET  /v1/evidence/objects                          EvidenceAssurance
GET  /v1/evidence/objects/:evidenceId              EvidenceAssurance
GET  /v1/evidence/objects/:evidenceId/scan-status  EvidenceAssurance
POST /v1/evidence/objects/:evidenceId/quarantine   EvidenceAssurance
POST /v1/evidence/objects/:evidenceId/commit       EvidenceAssurance
POST /v1/evidence/objects/:evidenceId/reuse-check  EvidenceAssurance
POST /v1/risk-workflow/findings                    RiskWorkflow
GET  /v1/risk-workflow/findings                    RiskWorkflow
GET  /v1/risk-workflow/findings/:findingId         RiskWorkflow
PATCH /v1/risk-workflow/findings/:findingId        RiskWorkflow
POST /v1/risk-workflow/remediation-tasks           RiskWorkflow
GET  /v1/risk-workflow/remediation-tasks           RiskWorkflow
GET  /v1/risk-workflow/remediation-tasks/:taskId   RiskWorkflow
PATCH /v1/risk-workflow/remediation-tasks/:taskId  RiskWorkflow
POST /v1/risk-workflow/remediation-tasks/:taskId/risk-acceptance RiskWorkflow
POST /v1/report-exports                            ReportingAnalytics
GET  /v1/report-exports                            ReportingAnalytics
GET  /v1/report-exports/:exportId                  ReportingAnalytics
GET  /v1/report-exports/:exportId/download         ReportingAnalytics
POST /v1/ai-orchestration/question-generations     AIOrchestration
POST /v1/ai-orchestration/question-generations/fallback AIOrchestration
GET  /v1/ai-orchestration/questions/pending-review AIOrchestration
GET  /v1/ai-orchestration/question-generations/:generationRunId/provenance AIOrchestration
POST /v1/ai-orchestration/question-generations/:generationRunId/reviews AIOrchestration
POST /v1/ai-orchestration/questions/:questionId/publish AIOrchestration
POST /v1/integration-platform/connectors       IntegrationPlatform
GET  /v1/integration-platform/connectors       IntegrationPlatform
GET  /v1/integration-platform/connectors/:connectorId IntegrationPlatform
POST /v1/integration-platform/connectors/:connectorId/sync-runs IntegrationPlatform
GET  /v1/integration-platform/connectors/:connectorId/sync-runs IntegrationPlatform
POST /v1/integration-platform/connectors/:connectorId/objects IntegrationPlatform
GET  /v1/integration-platform/connectors/:connectorId/objects IntegrationPlatform
POST /v1/integration-platform/webhook-contracts IntegrationPlatform
GET  /v1/integration-platform/webhook-contracts IntegrationPlatform
POST /v1/integration-platform/webhook-contracts/:webhookId/deliveries IntegrationPlatform
GET  /v1/integration-platform/webhook-contracts/:webhookId/deliveries IntegrationPlatform
POST /v1/integration-platform/control-tests    IntegrationPlatform
GET  /v1/integration-platform/control-tests    IntegrationPlatform
GET  /v1/integration-platform/assurance-alerts IntegrationPlatform
POST /v1/privacy-operations/inventory-records  PrivacyOperations
GET  /v1/privacy-operations/inventory-records  PrivacyOperations
GET  /v1/privacy-operations/inventory-records/:recordId PrivacyOperations
POST /v1/privacy-operations/processing-activities PrivacyOperations
GET  /v1/privacy-operations/processing-activities PrivacyOperations
GET  /v1/privacy-operations/processing-activities/:activityId PrivacyOperations
POST /v1/privacy-operations/dpia-assessments   PrivacyOperations
GET  /v1/privacy-operations/dpia-assessments   PrivacyOperations
GET  /v1/privacy-operations/dpia-assessments/:dpiaId PrivacyOperations
POST /v1/privacy-operations/rights-requests    PrivacyOperations
GET  /v1/privacy-operations/rights-requests    PrivacyOperations
GET  /v1/privacy-operations/rights-requests/:requestId PrivacyOperations
POST /v1/privacy-operations/rights-requests/:requestId/verify-identity PrivacyOperations
POST /v1/privacy-operations/rights-requests/:requestId/search-tasks PrivacyOperations
POST /v1/privacy-operations/rights-requests/:requestId/complete PrivacyOperations
POST /v1/privacy-operations/consents           PrivacyOperations
GET  /v1/privacy-operations/consents           PrivacyOperations
GET  /v1/privacy-operations/consents/:consentId PrivacyOperations
POST /v1/privacy-operations/consents/:consentId/withdraw PrivacyOperations
POST /v1/privacy-operations/incidents          PrivacyOperations
GET  /v1/privacy-operations/incidents          PrivacyOperations
GET  /v1/privacy-operations/incidents/:incidentId PrivacyOperations
POST /v1/privacy-operations/retention-schedules PrivacyOperations
GET  /v1/privacy-operations/retention-schedules PrivacyOperations
GET  /v1/privacy-operations/retention-schedules/:scheduleId PrivacyOperations
GET  /v1/privacy-operations/retention-schedules/:scheduleId/evaluation PrivacyOperations
POST /v1/enterprise-grc/policies                 EnterpriseGRC
GET  /v1/enterprise-grc/policies                 EnterpriseGRC
GET  /v1/enterprise-grc/policies/:policyId       EnterpriseGRC
POST /v1/enterprise-grc/policies/:policyId/publish EnterpriseGRC
POST /v1/enterprise-grc/policies/:policyId/exceptions EnterpriseGRC
POST /v1/enterprise-grc/access-reviews           EnterpriseGRC
GET  /v1/enterprise-grc/access-reviews           EnterpriseGRC
GET  /v1/enterprise-grc/access-reviews/:reviewId EnterpriseGRC
POST /v1/enterprise-grc/vendors                  EnterpriseGRC
GET  /v1/enterprise-grc/vendors                  EnterpriseGRC
GET  /v1/enterprise-grc/vendors/:vendorId        EnterpriseGRC
POST /v1/enterprise-grc/audit-engagements        EnterpriseGRC
GET  /v1/enterprise-grc/audit-engagements        EnterpriseGRC
GET  /v1/enterprise-grc/audit-engagements/:engagementId EnterpriseGRC
POST /v1/enterprise-grc/trust-center-artifacts   EnterpriseGRC
GET  /v1/enterprise-grc/trust-center-artifacts   EnterpriseGRC
GET  /v1/enterprise-grc/trust-center-artifacts/:artifactId EnterpriseGRC
POST /v1/enterprise-grc/trust-center-artifacts/:artifactId/downloads EnterpriseGRC
POST /v1/enterprise-grc/workspaces               EnterpriseGRC
GET  /v1/enterprise-grc/workspaces               EnterpriseGRC
GET  /v1/enterprise-grc/workspaces/:workspaceId  EnterpriseGRC
POST /v1/enterprise-grc/custom-object-definitions EnterpriseGRC
GET  /v1/enterprise-grc/custom-object-definitions EnterpriseGRC
GET  /v1/enterprise-grc/custom-object-definitions/:definitionId EnterpriseGRC
```
