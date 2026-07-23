# Platform Super-Admin Bootstrap Report - 2026-07-10

This report corrects the prior tenant-scoped bootstrap. It intentionally omits the platform super-admin password.

## Ground Truth Findings

| Check | Evidence | Result |
| --- | --- | --- |
| Backup before destructive work | `pg_dump --format=custom` produced `pre_platform_superadmin_backup_20260710_204401.dump` (`3,633,698` bytes); schema snapshot `pre_platform_superadmin_schema_20260710_204401.sql` (`745,200` bytes). | Backup complete before deletes/migration/reset. |
| Existing identity model | Live schema showed `identity_users.tenant_id`, `identity_roles.tenant_id`, and `identity_role_grants.tenant_id` are `NOT NULL`; `identity_tenants` has `tenant_id = id`. | Tenant users cannot represent a tenantless platform operator. |
| Existing authorization model | `policy.guard.ts` reads `x-tenant-id` through `readRequestContext`; `readRequestContext` rejects missing tenant/user headers. | Existing policy guard is tenant-scoped. |
| Existing tenant creation | Existing `POST /v1/identity/tenants`/`GET /v1/identity/tenants/:tenantId` were present in `IdentityTenantController`. | Tenant creation existed, but not as a protected platform onboarding surface. |
| Pre-correction state | `identity_counts_before { identity_tenants: 1, identity_users: 1, identity_roles: 1, identity_role_grants: 1, platform_operators: 0 }`; `identity_tenants_before` showed `Primary Tenant`; Auth user list showed `bootstrap.admin@cybernara.com`. | Prior bootstrap was tenant-scoped and incorrect for Cybernara operator onboarding. |

## Design And Changes

| Area | Changed | Evidence |
| --- | --- | --- |
| Schema | Added `supabase/migrations/0040_platform_operators.sql` with `platform_operators`, `platform_role = 'super_admin'`, `status`, metadata columns, RLS enabled, FORCE RLS enabled. | `node scripts/migrate.mjs` output: `Applying 0040_platform_operators.sql... Applied 0040_platform_operators.sql.` |
| Migration hygiene | Added `@platform_scope` handling to `scripts/check-migration-conventions.mjs` so tenant-table rules remain strict while platform tables are explicit exceptions. | `npm run migration:lint` output: `Migration convention check passed.` |
| Backend API | Added platform onboarding repository/service/guard/controller and endpoints: `GET /v1/platform/tenants`, `POST /v1/platform/tenants`, `POST /v1/platform/tenants/{tenantId}/admin-invite`. | `npm run openapi:check` output: `OpenAPI contract is current.` |
| Authorization | Added `PlatformOperatorGuard`, which checks `x-user-id` and `x-platform-role` against active rows in `platform_operators` before platform actions. | `test/identity-tenant/platform-onboarding.test.ts` passed: tenant-scoped admins rejected from every platform endpoint, even with spoofed platform headers. |
| Contract/client | Bumped OpenAPI generator version to `0.1.0-m5`; regenerated backend OpenAPI and frontend generated client. | Frontend `npm run contract:check` output: `Generated API client is current.` |
| Frontend session model | Split sessions into `kind: "tenant"` and `kind: "platform"`; platform sessions send only `x-user-id`, `x-platform-role`, and optional `x-user-email`; BFF strips browser-supplied platform headers. | `npx vitest run test/session.test.ts test/api-server.test.ts`: 2 files, 5 tests passed. |
| Frontend UI | Added separate `/platform/tenants` Client Onboarding page and BFF action route. It is not part of `/admin/users`. | `npm run build` included routes `/platform/tenants` and `/platform/tenants/actions`; performance budget passed. |
| Manual guide | Updated `MANUAL_TESTING_GUIDE.md` Getting Started and Smoke Test to show platform super-admin creates client tenant and first client admin, then client admin onboards tenant users. | `rg "bootstrap admin|Primary Tenant|bootstrap\\.admin" MANUAL_TESTING_GUIDE.md` returned no matches. |

## Reset And Bootstrap Evidence

| Step | Command / Output | Result |
| --- | --- | --- |
| Remove flawed bootstrap | Output: `db_counts_before_delete { identity_tenants: 1, identity_users: 1, identity_roles: 1, identity_role_grants: 1, platform_operators: 0 }`; `auth_users_before_delete` contained `bootstrap.admin@cybernara.com`; after delete all four identity counts were `0` and `auth_users_after_delete []`. | `Primary Tenant` and tenant-scoped `bootstrap.admin@cybernara.com` removed. |
| Create true platform operator | Output: `bootstrap_platform_operator { email: 'platform.superadmin@cybernara.com', supabase_user_id: 'cb612930-7f0a-41c3-84c7-3fc9e185aa27', app_metadata: { platform_role: 'super_admin', provider: 'email', providers: [ 'email' ], status: 'active' } }`; counts after bootstrap: tenants/users/roles/grants `0`, platform operators `1`. | Exactly one platform operator created, not tenant-scoped. |
| Browser onboarding proof | Output: `browser_onboarding_proof { platformLoginReached: '/platform/tenants', platformBlockedFromTenantAdmin: true, tenantName: 'Acme Test Co 1783698308337-itiuxa228ym', firstTenantAdminEmail: 'cybernara-platform-ui-first-1783698308337-itiuxa228ym@example.com', firstTenantAdminReached: '/admin/users', tenantAdminBlockedFromPlatform: true, secondTenantUserEmail: 'cybernara-platform-ui-second-1783698308337-itiuxa228ym@example.com', passwordsRenderedButRedacted: true }`. | Real platform onboarding flow works through browser UI. |
| Proof cleanup | Output: `proof_cleanup { deleted_auth_users: 2, deleted_tenants: 1 }`; final proof counts: identity tenants/users/roles/grants `0`, platform operators `1`. | Disposable proof tenant and users removed. |
| Post-full-suite cleanup | Deleted test Auth users and tenant data; final reference/catalog counts restored to baseline: frameworks `13`, framework_versions `13`, control_sets `13`, controls `2482`, control_subcontrols `1418`, mapping_versions `3`, mapping_reviews `4520`, question_sets `105`, question_versions `105`, report_templates `1`, test_procedures `18`. | Clean production-like state restored after full verification suites. |
| Final state | Output: `final_bootstrap_verification { counts: { tenants: 0, tenant_users: 0, platform_operators: 1 }, platform_rls: [{ relrowsecurity: true, relforcerowsecurity: true }], auth_users: [{ email: 'platform.superadmin@cybernara.com', app_metadata: { platform_role: 'super_admin', provider: 'email', providers: [Array], status: 'active' } }] }`. | Zero client tenants, one platform operator, one Auth user. |

## Verification Commands

| Command | Result |
| --- | --- |
| `npm run typecheck` in backend | Passed. |
| `npx vitest run test/identity-tenant/platform-onboarding.test.ts` in backend | 1 file, 2 tests passed. |
| `npm run migration:lint` in backend | Passed. |
| `npm run openapi:check` in backend | Passed. |
| `npm run contract:generate` in frontend | Generated client from backend OpenAPI. |
| `npm run contract:check` in frontend | Passed. |
| `npm run typecheck` in frontend | Passed. |
| `npx vitest run test/session.test.ts test/api-server.test.ts` in frontend | 2 files, 5 tests passed. |
| `npm run build` in frontend | Build passed; performance budget passed. |
| `npm run test` in backend | 48 test files, 580 tests passed; architecture, migration lint, OpenAPI check passed. |
| `npm run e2e` in frontend | 26 Playwright tests passed. |
| `node scripts/schema-audit.mjs` in backend | Schema audit completed; transactional row counts are zero, reference/catalog rows preserved, `platform_operators` row count is 1. |

