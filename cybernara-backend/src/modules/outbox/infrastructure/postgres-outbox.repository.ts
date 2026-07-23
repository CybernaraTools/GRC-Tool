import { Inject, Injectable } from "@nestjs/common";
import type pg from "pg";
import { TenantScopedDb } from "../../../platform/database/tenant-scoped-db.js";
import { ADMIN_DATABASE_POOL } from "../../../platform/database/tokens.js";
import type { OutboxRepository } from "../application/outbox.service.js";
import type { OutboxEvent } from "../domain/outbox-event.js";

// G-10 scoping decision: `enqueue`/`findByIdempotencyKey` run within a specific
// tenant's request and go through `TenantScopedDb` like every other migrated
// repository. `claimBatch`/`markProcessed`/`markFailed` are called by the
// background outbox worker (`worker/outbox-worker.ts`), which by design scans
// and claims pending events *across all tenants* in a single query
// (`for update skip locked`) — there is no single tenant context to set for
// those calls, and forcing one would break cross-tenant batch claiming
// entirely. Now that `DATABASE_POOL` connects as the RLS-scoped `app_runtime`
// role (see database.module.ts), these three methods deliberately use
// `ADMIN_DATABASE_POOL` (the owner-role pool) instead — this is a permanent,
// documented split, not a partial-migration placeholder to "finish later."
@Injectable()
export class PostgresOutboxRepository implements OutboxRepository {
  constructor(
    @Inject(TenantScopedDb) private readonly db: TenantScopedDb,
    @Inject(ADMIN_DATABASE_POOL) private readonly pool: pg.Pool
  ) {}

  async enqueue(event: OutboxEvent): Promise<OutboxEvent> {
    return this.db.withTenant(event.tenantId, event.createdBy, async (client) => {
      const result = await client.query(
        `
          insert into outbox_events (
            id, tenant_id, event_type, aggregate_type, aggregate_id, schema_version,
            payload, idempotency_key, status, attempts, available_at, classification,
            created_by, created_at, updated_by, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, 'internal', $12, $13, $12, $13)
          on conflict (tenant_id, idempotency_key) do update
            set updated_at = outbox_events.updated_at
          returning id, tenant_id, event_type, aggregate_type, aggregate_id, schema_version,
                    payload, idempotency_key, status, attempts, available_at, created_by, created_at
        `,
        [
          event.id,
          event.tenantId,
          event.eventType,
          event.aggregateType,
          event.aggregateId,
          event.schemaVersion,
          JSON.stringify(event.payload),
          event.idempotencyKey,
          event.status,
          event.attempts,
          event.availableAt,
          event.createdBy,
          event.createdAt
        ]
      );

      return mapRow(result.rows[0]);
    });
  }

  async findByIdempotencyKey(tenantId: string, idempotencyKey: string): Promise<OutboxEvent | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select id, tenant_id, event_type, aggregate_type, aggregate_id, schema_version,
                 payload, idempotency_key, status, attempts, available_at, created_by, created_at
          from outbox_events
          where tenant_id = $1 and idempotency_key = $2
        `,
        [tenantId, idempotencyKey]
      );

      return result.rows[0] ? mapRow(result.rows[0]) : null;
    });
  }

  async claimBatch(limit: number): Promise<OutboxEvent[]> {
    const result = await this.pool.query(
      `
        update outbox_events
        set status = 'processing',
            attempts = attempts + 1,
            updated_at = now()
        where id in (
          select id
          from outbox_events
          where status = 'pending'
            and available_at <= now()
          order by created_at
          limit $1
          for update skip locked
        )
        returning id, tenant_id, event_type, aggregate_type, aggregate_id, schema_version,
                  payload, idempotency_key, status, attempts, available_at, created_by, created_at
      `,
      [limit]
    );

    return result.rows.map(mapRow);
  }

  async markProcessed(eventId: string): Promise<void> {
    await this.pool.query(
      `
        update outbox_events
        set status = 'processed',
            processed_at = now(),
            updated_at = now()
        where id = $1
      `,
      [eventId]
    );
  }

  async markFailed(eventId: string, error: string): Promise<void> {
    await this.pool.query(
      `
        update outbox_events
        set status = case when attempts >= 5 then 'dead_letter' else 'pending' end,
            last_error = $2,
            available_at = now() + interval '30 seconds',
            updated_at = now()
        where id = $1
      `,
      [eventId, error]
    );
  }
}

function mapRow(row: Record<string, unknown>): OutboxEvent {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    eventType: String(row.event_type),
    aggregateType: String(row.aggregate_type),
    aggregateId: String(row.aggregate_id),
    schemaVersion: Number(row.schema_version),
    payload: row.payload as Record<string, unknown>,
    idempotencyKey: String(row.idempotency_key),
    status: row.status as OutboxEvent["status"],
    attempts: Number(row.attempts),
    availableAt: row.available_at as Date,
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date
  };
}
