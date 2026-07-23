# Post-Implementation Regression Fix Report

Date: 2026-07-11

## Executive Summary

This pass fixed the concrete browser/runtime regressions reported after the Question Repository, Framework Enablement, and Assessment Cutover implementation:

- Bug A: platform Question Repository runtime validation failed on nullable AI-origin fields.
- Bug B: tenant Platform Admin Assessment Workspace load failed due access/scope coverage gaps.
- Bug C: AI Review framework scope ignored tenant-enabled frameworks.
- Bug D: Harmonization ignored tenant-enabled frameworks.
- Bug E: Platform Super Admin lacked global content-governance navigation and read paths.
- Bug F: Assessment creation question selection could duplicate questions through multi-framework mapping paths and had poor option context.
- Additional audit fix: tenant Framework Updates now uses enabled-framework scope for diff selection and rejects manually posted non-enabled frameworks.

Tenant cleanup has not been executed. Per the prompt, deletion requires explicit confirmation of exact tenants to remove.

## Bug Reconciliation

| Item | Found | Changed | Verified by | Result |
|---|---|---|---|---|
| Bug A | `QuestionRepositoryEntry.sourceAiQuestionVersionId` was already nullable in OpenAPI 3.1 as `type: ["string","null"]`, but the frontend generator treated type arrays incorrectly, so generated Zod expected `string`. | Updated `cybernara-frontend/scripts/api-client-generator.mjs` to support OpenAPI 3.1 nullable type arrays; regenerated `cybernara-frontend/src/lib/api/generated.ts`. Audited adjacent nullable fields: `approvedBy`, `approvedAt` now generate `.nullable()`. | `npm run contract:generate`; `npm run contract:check`; `npx playwright test e2e/f11-question-repository-regressions.spec.ts --workers=1`. | Pass. `/platform/questions` renders in browser with no `Expected string, received null` panel. |
| Bug B | Assessment Workspace required repository/framework scopes on load; prior coverage did not positively test each intended role for the new endpoints. | Added `cybernara-backend/test/framework-content/question-options-access.test.ts`; reconciled `cybernara-backend/src/modules/identity-tenant/application/admin-role-catalog.ts` for touched framework/question/AI/read scopes. | `npx vitest run test/framework-content/question-options-access.test.ts test/assessment/question-repository-cutover.test.ts test/assessment/question-repository-platform-api.test.ts`. | Pass. 3 files, 13 tests passed. Browser spec confirms tenant Platform Admin opens `/assessments` and sees create scope. |
| Bug C | `/ai` rendered a hardcoded/global framework checklist, including frameworks outside the tenant-enabled set. | `app/ai/page.tsx` loads `listEnabledFrameworks`; `app/ai/composer-tabs.tsx` renders only enabled frameworks; `app/ai/actions/route.ts` filters posted framework keys against enabled frameworks and rejects empty scope. | Focused Playwright spec. | Pass. Tenant with `SOC2` and `ISO_27001` sees only those; `PCI_DSS`, `HITRUST`, and `GDPR` are absent. |
| Bug D | Harmonization queries/pages were global from a tenant session. | Backend harmonization service now filters tenant-facing controls/mappings by `tenant_catalog_subscriptions`; frontend uses enabled framework selector for tenant sessions; platform global routes remain separate. | Focused Playwright spec. | Pass. Tenant Harmonization shows enabled-framework selector only; platform route shows global-only note. |
| Bug E | Platform Super Admin navigation only showed onboarding and repository pages. | Added platform nav links for Framework Library, Framework Updates, Harmonization; added platform guarded read-only backend routes for global framework content, harmonization, and framework diffs. | Focused Playwright spec. | Pass. Super admin can open all three pages; platform views show global catalog/content notes and hide tenant impact/write actions. |
| Bug F | Question options could repeat when one approved question resolved through multiple enabled framework mapping paths. UI exposed a flat raw selector. | Backend `queryAssessmentQuestionOptions` now keys distinct rows by `question_versions.id` and aggregates `frameworkKeys`; frontend groups options by harmonized control and shows question text, response type, and framework labels. | Backend focused tests plus Playwright option uniqueness assertion. | Pass. Browser asserted unique `questionVersionId` values and readable option labels. |
| Section 10 audit | Framework Updates still used free text tenant framework selection. | Tenant Framework Updates now lists only enabled frameworks in a select; server action checks `listEnabledFrameworks` before calculating diffs. | Focused Playwright spec. | Pass. Tenant Framework Updates shows only `ISO_27001` and `SOC2` for the fixture tenant; `PCI_DSS` and `HITRUST` absent. |

## Verification Evidence

| Command | Output summary | Result |
|---|---|---|
| `npm run openapi:generate` in `cybernara-backend` | `Generated OpenAPI contract at openapi/cybernara.openapi.json` | Pass |
| `npm run contract:generate` in `cybernara-frontend` | `Generated API client from ...\cybernara-backend\openapi\cybernara.openapi.json` | Pass |
| `npm run typecheck` in `cybernara-backend` | `> tsc --noEmit` | Pass |
| `npm run lint` in `cybernara-backend` | `> eslint .` | Pass |
| `npx vitest run test/framework-content/question-options-access.test.ts test/assessment/question-repository-cutover.test.ts test/assessment/question-repository-platform-api.test.ts` in `cybernara-backend` | `Test Files 3 passed (3)`, `Tests 13 passed (13)` | Pass |
| `npm run typecheck` in `cybernara-frontend` | `> tsc --noEmit` | Pass |
| `npm run lint` in `cybernara-frontend` | `> eslint .` | Pass |
| `npm run contract:check` in `cybernara-frontend` | `Generated API client is current.` | Pass |
| `npx playwright test e2e/f11-question-repository-regressions.spec.ts --workers=1` in `cybernara-frontend` | `2 passed (28.9s)` | Pass |
| `npm run build` in `cybernara-frontend` | `Compiled successfully`; `Generating static pages (38/38)`; `Performance budget passed for 10 interactive routes.` | Pass |

Note: `npm run contract:check` does not exist in `cybernara-backend`; backend contract generation is covered by `npm run openapi:generate`.

## Access Matrix Notes

The authoritative tenant matrix was reconciled for the scopes and pages touched by these regressions:

- User management remains Platform Admin only.
- Framework enablement write is Platform Admin and Compliance Manager; read is granted to Auditor and Viewer.
- Framework Library read remains available to all tenant roles.
- Harmonization read is available to all tenant roles that should have read/review visibility.
- Assessment create/write is Platform Admin and Compliance Manager; Auditor/Viewer receive review/read behavior rather than create controls.
- AI review/read scopes were added for Auditor visibility; AI write/publish remains Platform Admin and Compliance Manager.
- Question Repository selection scope is readable by all tenant roles that can consume assessment question options.
- Privacy, Integrations, Enterprise GRC, and Reports role catalog entries were reconciled for read-only matrix cells touched by navigation visibility.

Focused endpoint tests were added for framework enablement/question-option endpoints. A truly exhaustive per-row, per-action browser suite for every matrix row still remains broader than this regression pass; backend remains the authority, with navigation treated as UX only.

## Tenant Inventory for Cleanup Confirmation

No tenant deletion has been run. Classifications below are best-effort based on tenant name, timestamp, and known test naming patterns.

| Tenant ID | Name | Created At | Created By | Classification | Cleanup recommendation |
|---|---|---:|---|---|---|
| `cd1b0783-8d40-4ff4-bc00-199598442394` | Test_Org | 2026-07-10T16:13:50.256Z | `cb612930-7f0a-41c3-84c7-3fc9e185aa27` | Active user/demo tenant from screenshots | Preserve unless you explicitly say otherwise |
| `00000000-0000-4000-8000-000000000001` | Cybernara E2E Tenant | 2026-07-10T20:10:50.475Z | `00000000-0000-4000-8000-0000000000aa` | Canonical/global catalog tenant used by fixtures/content | Preserve |
| `09eaa5c3-de60-4bf8-94d2-7b433ee303ff` | RLS matrix tenant 09eaa5c3-de60-4bf8-94d2-7b433ee303ff | 2026-07-11T01:27:01.869Z | `e5886be0-922a-464b-b170-afe9fce728e2` | Test data | Candidate remove |
| `f86d4284-caa5-43de-b414-2f05cee84e3b` | RLS matrix tenant f86d4284-caa5-43de-b414-2f05cee84e3b | 2026-07-11T01:27:01.975Z | `2f24de5d-ed08-4365-afb2-71517e1a4dbf` | Test data | Candidate remove |
| `97411007-01ef-43ff-aed7-85256cf9537a` | RLS matrix tenant 97411007-01ef-43ff-aed7-85256cf9537a | 2026-07-11T01:32:22.506Z | `a1d23cad-517f-4d3f-817a-8e66e9f81db3` | Test data | Candidate remove |
| `a1275ad3-bacb-44fc-a8f4-7d2b4893e646` | RLS matrix tenant a1275ad3-bacb-44fc-a8f4-7d2b4893e646 | 2026-07-11T01:32:22.588Z | `f0e4f3c7-cfcc-406f-ba36-d2aa4d81005f` | Test data | Candidate remove |
| `244a35cc-bc29-44ca-aa36-e7c832556990` | Admin Tenant A | 2026-07-11T01:37:14.105Z | `a5ed0d29-1b7c-414f-ba98-016c14e3d6a0` | Test data | Candidate remove |
| `a0a1238a-014e-4470-bd42-c7deb4809c28` | Admin Tenant B | 2026-07-11T01:37:14.708Z | `a5ed0d29-1b7c-414f-ba98-016c14e3d6a0` | Test data | Candidate remove |
| `539bceba-b2f9-4a81-8687-a0023e628dd3` | Evidence Upload API | 2026-07-11T01:37:54.807Z | `f147a3f8-4c37-44f3-8755-16af3e2b204b` | Test data | Candidate remove |
| `c3eb9372-76f5-40d8-b1e4-1af7d0238526` | Repository Real Tenant | 2026-07-11T01:38:06.040Z | `9a5eb6af-8b06-4a73-af5c-4d7624097176` | Test data | Candidate remove |
| `f044d96b-1eef-4e86-ab13-cc2ff5644fdd` | HTTP Real Tenant | 2026-07-11T01:38:07.166Z | `3ec46250-ce07-4e9f-8a27-3e3c44f905cf` | Test data | Candidate remove |
| `ed62ee55-d054-446a-93e7-fa823dfdc390` | RLS matrix tenant ed62ee55-d054-446a-93e7-fa823dfdc390 | 2026-07-11T01:48:45.441Z | `14cfc1e3-4718-4139-940b-7c0cdebf72e8` | Test data | Candidate remove |
| `36c190fc-d0cc-438d-ad4e-0e2dc1cc7e57` | RLS matrix tenant 36c190fc-d0cc-438d-ad4e-0e2dc1cc7e57 | 2026-07-11T01:48:45.522Z | `e55c8ce0-6dae-4275-9241-f58fa09c08a8` | Test data | Candidate remove |
| `877cc690-a410-42f2-9386-1ce57dcf1c17` | Admin Tenant A | 2026-07-11T01:56:35.031Z | `c103c4ee-2bee-4aec-9c21-a277acad389d` | Test data | Candidate remove |
| `3cdd01a5-626b-448a-8953-a9635f0bc5c2` | Admin Tenant B | 2026-07-11T01:56:35.594Z | `c103c4ee-2bee-4aec-9c21-a277acad389d` | Test data | Candidate remove |
| `a48a6a04-3d71-4dce-9036-b90a2e3e19a8` | Evidence Upload API | 2026-07-11T01:57:17.396Z | `6a13ef83-a558-4daf-830b-dcf1cdd44bed` | Test data | Candidate remove |
| `064b0955-35f8-4215-9be1-267c9f3ea69b` | Repository Real Tenant | 2026-07-11T01:57:45.238Z | `c88e68c1-b20c-488a-8dc8-1c41796a8c51` | Test data | Candidate remove |
| `9d73905d-47e1-4d4c-ab9a-3ca270084151` | HTTP Real Tenant | 2026-07-11T01:57:46.539Z | `63cd9db9-4733-42dc-9a93-a2b3f2af2949` | Test data | Candidate remove |
| `a02b0788-1979-4be6-98a2-3b0e6eee9178` | RLS matrix tenant a02b0788-1979-4be6-98a2-3b0e6eee9178 | 2026-07-11T02:02:44.745Z | `c1107346-d711-45d2-b9b5-ddff6dafc132` | Test data | Candidate remove |
| `cb3e30a7-3b51-40fa-9e51-2fb632b2fdc9` | RLS matrix tenant cb3e30a7-3b51-40fa-9e51-2fb632b2fdc9 | 2026-07-11T02:02:44.815Z | `7cf7a748-a3a4-42d7-bfe1-baa1a3dfee9f` | Test data | Candidate remove |
| `e7f3cf1d-a065-4ec0-ae9d-15476a83b2d8` | Admin Tenant A | 2026-07-11T02:10:32.399Z | `4d80d75f-8bd2-4ba1-b284-488b00abbbe7` | Test data | Candidate remove |
| `13c3e7ae-b696-4256-9581-11beda5ac33e` | Admin Tenant B | 2026-07-11T02:10:32.974Z | `4d80d75f-8bd2-4ba1-b284-488b00abbbe7` | Test data | Candidate remove |
| `c9842c1c-cc26-4f48-8f9f-a44a91092b00` | Evidence Upload API | 2026-07-11T02:11:14.665Z | `d2edcdc4-3dcb-46b8-95d2-9ab990e3e031` | Test data | Candidate remove |
| `660ee15e-0807-44a3-b87b-7516beb27f0a` | Repository Real Tenant | 2026-07-11T02:11:41.751Z | `f3b727cd-4854-429d-b769-08079864208b` | Test data | Candidate remove |
| `872d07e2-e1c9-4b77-a632-3b29c20a4e57` | HTTP Real Tenant | 2026-07-11T02:11:42.896Z | `7064e669-91b1-4b3a-a7b0-a10768a20776` | Test data | Candidate remove |
| `e86ae05c-dc7b-4c22-95bc-07a358f585ce` | Cybernara E2E Tenant e86ae05c | 2026-07-11T08:58:16.658Z | `00000000-0000-4000-8000-0000000000aa` | Failed Playwright fixture setup residue | Candidate remove |

## Final Verification Checklist

| Check | Status |
|---|---|
| Question Repository nullable AI-origin schema handled by generated client | Pass |
| Platform Super Admin repository browser load verified | Pass |
| Platform Super Admin global Framework Library, Harmonization, Framework Updates verified | Pass |
| Tenant Assessment Workspace positive Platform Admin load verified | Pass |
| Tenant enabled-framework scoping verified for AI Review | Pass |
| Tenant enabled-framework scoping verified for Harmonization | Pass |
| Tenant enabled-framework scoping verified for Framework Updates | Pass |
| Assessment question options distinct by question version | Pass |
| Assessment question selector grouped/readable | Pass |
| OpenAPI regenerated and frontend client current | Pass |
| Backend focused tests passed | Pass |
| Frontend lint/typecheck/build passed | Pass |
| Tenant cleanup executed | Pending explicit human confirmation |
