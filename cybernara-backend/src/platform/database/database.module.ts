import { Module, type Provider } from "@nestjs/common";
import pg from "pg";
import { readEnv } from "../../config/env.js";
import { ADMIN_DATABASE_POOL, DATABASE_POOL } from "./tokens.js";
import { TenantScopedDb } from "./tenant-scoped-db.js";

// G-10 cutover: the application's default connection is now the non-owner
// `app_runtime` role (falls back to SUPABASE_DB_URL/postgres only for
// environments that haven't provisioned app_runtime yet, e.g. a fresh
// migration-only shell). Every repository reached through TenantScopedDb
// runs as app_runtime and is subject to RLS once FORCE ROW LEVEL SECURITY is
// enabled (see 0012_g10_force_rls.sql).
const databaseProvider: Provider = {
  provide: DATABASE_POOL,
  useFactory: () => {
    const env = readEnv();
    const pool = new pg.Pool({
      connectionString: env.SUPABASE_APP_RUNTIME_DB_URL ?? env.SUPABASE_DB_URL,
      max: databasePoolMax(),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000
    });
    pool.on("error", (err) => {
      console.error("DATABASE_POOL idle client error", err.message);
    });
    return pool;
  }
};

// Owner-privileged pool for the narrow set of call sites that must bypass
// per-tenant RLS scoping entirely (currently only the outbox worker's
// cross-tenant batch-claim methods). See tokens.ts for the usage contract.
const adminDatabaseProvider: Provider = {
  provide: ADMIN_DATABASE_POOL,
  useFactory: () => {
    const env = readEnv();
    const pool = new pg.Pool({
      connectionString: env.SUPABASE_DB_URL,
      max: databasePoolMax(),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000
    });
    pool.on("error", (err) => {
      console.error("ADMIN_DATABASE_POOL idle client error", err.message);
    });
    return pool;
  }
};

@Module({
  providers: [databaseProvider, adminDatabaseProvider, TenantScopedDb],
  exports: [DATABASE_POOL, ADMIN_DATABASE_POOL, TenantScopedDb]
})
export class DatabaseModule {}

function databasePoolMax(): number {
  const configured = Number.parseInt(process.env.SUPABASE_DB_POOL_MAX ?? "4", 10);
  return Number.isFinite(configured) && configured > 0 ? configured : 4;
}
