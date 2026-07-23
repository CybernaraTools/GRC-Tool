# F0 Audit List Backend Unblock

## Scope

Small backend addition to unblock frontend F0's read-only, filterable audit log viewer. This is not a new A-series milestone.

## Route Added

| Method | Path | Module | Policy scope |
| --- | --- | --- | --- |
| `GET` | `/v1/audit/events` | AuditSecurity | `audit_event:read` |

## Behavior

- Lists `audit_events` for the request tenant.
- Supports offset pagination with `limit` and `offset`.
- Supports filters backed by real columns only: `eventType`, `targetType`, `targetId`, `actorId`, `classification`, `from`, and `to`.
- Rejects invalid date ranges with the existing problem-details error shape.
- Serializes `sequence` as a string to match the OpenAPI contract.

## Files Changed

- `README.md`
- `docs/traceability-matrix.md`
- `docs/checkpoints/f0-audit-list-backend-unblock.md`
- `openapi/cybernara.openapi.json`
- `dist/openapi/cybernara.openapi.json`
- `scripts/openapi-spec.mjs`
- `src/modules/audit-security/application/audit-log.service.ts`
- `src/modules/audit-security/infrastructure/postgres-audit.repository.ts`
- `src/modules/audit-security/presentation/audit-security.controller.ts`
- `test/audit-security/audit-list.test.ts`

## Verification

| Check | Result |
| --- | --- |
| Targeted audit list test | `npm run unit -- test/audit-security/audit-list.test.ts` passed: 1 file, 3 tests |
| Backend full gate | `npm run test` passed: 22 files, 65 tests |
| Backend build | `npm run build` passed |
| OpenAPI freshness | `npm run openapi:check` passed |
| Schema audit | `node scripts/schema-audit.mjs` clean: 58 tables, 21 indexes, 58 RLS policies, 1 trigger, 1 function, 0 diffs |
| Frontend client handoff | `npm run contract:generate` completed in `cybernara-frontend`; `test/api-contract.test.ts` updated with `listAuditEvents`; frontend `npm run test` and `npm run build` passed after F0 resumed |

## Handoff

The frontend F0 audit log viewer now has a real filtered list endpoint in the published OpenAPI contract. Go to resume F0.
