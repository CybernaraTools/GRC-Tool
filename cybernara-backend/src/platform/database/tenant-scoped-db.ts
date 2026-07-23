import { Inject, Injectable } from "@nestjs/common";
import type pg from "pg";
import { DATABASE_POOL } from "./tokens.js";

/**
 * Minimal client surface repositories need inside a tenant-scoped unit of
 * work — deliberately narrower than pg.PoolClient so repositories cannot
 * accidentally manage the transaction themselves.
 */
export interface TenantScopedClient {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[]
  ): Promise<pg.QueryResult<T>>;
}

/**
 * Checks out a connection, sets the transaction-local `app.tenant_id` /
 * `app.principal_id` GUCs the schema's RLS policies key off (see
 * 0008_g10_rls_foundation.sql), runs the caller's queries inside that one
 * transaction, then commits/rolls back and releases the connection.
 *
 * This is deliberately the *only* place in the codebase that calls
 * `set_config('app.tenant_id', ...)` — every repository that wants RLS to
 * eventually mean something goes through here rather than setting context
 * itself, so there is exactly one place to audit for correctness.
 *
 * Using this today, while `DATABASE_POOL` still connects as the `postgres`
 * owner role, is a safe no-op with respect to access control (the owner
 * bypasses RLS regardless of what GUCs are set) — but it is the exact call
 * pattern that will matter once the connection is cut over to `app_runtime`
 * (see docs/schema-remediation-report.md for cutover status), and it is
 * exactly what the RLS test suite exercises against `app_runtime` directly.
 */
@Injectable()
export class TenantScopedDb {
  constructor(@Inject(DATABASE_POOL) private readonly pool: pg.Pool) {}

  async withTenant<T>(
    tenantId: string,
    principalId: string | undefined,
    fn: (client: TenantScopedClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    let clientError: Error | undefined;
    const onClientError = (error: Error) => {
      clientError = error;
      console.error("DATABASE_POOL checked-out client error", error.message);
    };
    client.on("error", onClientError);
    try {
      await client.query("begin");
      await client.query("select set_config('app.tenant_id', $1, true), set_config('app.principal_id', $2, true)", [
        tenantId,
        principalId ?? ""
      ]);
      const result = await fn(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.off("error", onClientError);
      client.release(clientError);
    }
  }
}
