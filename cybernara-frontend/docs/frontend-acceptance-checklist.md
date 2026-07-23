# Frontend Acceptance Checklist

Status: F7 final integration pass complete.

| Acceptance item | Evidence |
| --- | --- |
| Real login/logout journey works without cookie injection | `e2e/f0-auth.spec.ts`; Supabase email/password users are created through the Admin API and sign in through `/login`. |
| Browser never calls Supabase business tables directly | `npm run arch:test`; business data calls are through generated OpenAPI client in BFF/server code. |
| Generated client is current against the backend OpenAPI artifact | `npm run contract:check`; `test/api-contract.test.ts`. |
| Framework and harmonization browsing uses server pagination/filtering | `app/frameworks/page.tsx`, `app/harmonization/page.tsx`, `e2e/f1-framework-harmonization.spec.ts`. |
| End-to-end assessment workflow works through the UI | `e2e/f2-assessment-core.spec.ts`: create scope, evidence quarantine/commit/reuse, applicability, answer, review, close, findings/remediation/risk acceptance, report export. |
| AI-origin content requires human approval before publish | `e2e/f3-ai-governance.spec.ts`; publish button disabled until human review is recorded. |
| Connector, webhook, and continuous assurance telemetry work through real APIs | `e2e/f4-integrations.spec.ts`. |
| PrivacyOperations and EnterpriseGRC workflows work through real APIs | `e2e/f5-privacy-enterprise.spec.ts`. |
| Restricted roles/scopes do not see unavailable actions | `e2e/f6-hardening.spec.ts`; `test/navigation.test.ts`. |
| Accessibility scans have no serious/critical violations | Axe assertions in F0-F6 Playwright specs. |
| Production performance budget is enforced | `npm run build` runs `npm run performance:budget`; last pass checked 10 interactive routes. |
| Every implemented and intentionally deferred workflow is traceable | `docs/traceability-matrix.md`; `npm run traceability:check`. |
