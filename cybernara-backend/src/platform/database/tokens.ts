export const DATABASE_POOL = Symbol("DATABASE_POOL");

// G-10 cutover: DATABASE_POOL connects as the non-owner `app_runtime` role and
// is subject to RLS (see tenant-scoped-db.ts). ADMIN_DATABASE_POOL keeps the
// `postgres` owner connection alive for the small set of call sites that
// legitimately need to bypass per-tenant scoping entirely — currently only
// the outbox worker's cross-tenant batch-claim methods (see
// postgres-outbox.repository.ts). Do not use this for anything that could
// instead go through TenantScopedDb.
export const ADMIN_DATABASE_POOL = Symbol("ADMIN_DATABASE_POOL");

