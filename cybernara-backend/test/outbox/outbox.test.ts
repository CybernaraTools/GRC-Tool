import "dotenv/config";
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import type { OutboxRepository } from "../../src/modules/outbox/application/outbox.service.js";
import { OutboxService } from "../../src/modules/outbox/application/outbox.service.js";
import { createOutboxEvent } from "../../src/modules/outbox/domain/outbox-event.js";
import type { OutboxEvent } from "../../src/modules/outbox/domain/outbox-event.js";
import { PostgresOutboxRepository } from "../../src/modules/outbox/infrastructure/postgres-outbox.repository.js";
import { TenantScopedDb } from "../../src/platform/database/tenant-scoped-db.js";
import { DATABASE_POOL } from "../../src/platform/database/tokens.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";

class InMemoryOutboxRepository implements OutboxRepository {
  private readonly events = new Map<string, OutboxEvent>();
  private readonly idempotency = new Map<string, string>();

  async enqueue(event: OutboxEvent): Promise<OutboxEvent> {
    const key = `${event.tenantId}:${event.idempotencyKey}`;
    const existingId = this.idempotency.get(key);
    if (existingId) {
      return this.events.get(existingId)!;
    }

    this.idempotency.set(key, event.id);
    this.events.set(event.id, event);
    return event;
  }

  async findByIdempotencyKey(tenantId: string, idempotencyKey: string): Promise<OutboxEvent | null> {
    const existingId = this.idempotency.get(`${tenantId}:${idempotencyKey}`);
    return existingId ? this.events.get(existingId) ?? null : null;
  }

  async claimBatch(limit: number): Promise<OutboxEvent[]> {
    const claimed = [...this.events.values()]
      .filter((event) => event.status === "pending")
      .slice(0, limit)
      .map((event) => ({ ...event, status: "processing" as const, attempts: event.attempts + 1 }));

    for (const event of claimed) {
      this.events.set(event.id, event);
    }

    return claimed;
  }

  async markProcessed(eventId: string): Promise<void> {
    const event = this.events.get(eventId);
    if (event) {
      this.events.set(eventId, { ...event, status: "processed" });
    }
  }

  async markFailed(eventId: string): Promise<void> {
    const event = this.events.get(eventId);
    if (event) {
      this.events.set(eventId, { ...event, status: "pending" });
    }
  }
}

describe("OutboxService", () => {
  it("deduplicates by tenant idempotency key", async () => {
    const service = new OutboxService(new InMemoryOutboxRepository());
    const input = {
      tenantId: "00000000-0000-4000-8000-000000000001",
      eventType: "identity.tenant.created",
      aggregateType: "tenant",
      aggregateId: "00000000-0000-4000-8000-000000000001",
      payload: { name: "Acme Corp" },
      idempotencyKey: "tenant-create-1",
      createdBy: "00000000-0000-4000-8000-000000000002"
    };

    const first = await service.publish(input);
    const second = await service.publish(input);

    expect(second.id).toBe(first.id);
  });

  it("processes claimed events exactly once per successful dispatch", async () => {
    const repository = new InMemoryOutboxRepository();
    const service = new OutboxService(repository);
    await service.publish({
      tenantId: "00000000-0000-4000-8000-000000000001",
      eventType: "audit.event.created",
      aggregateType: "audit_event",
      aggregateId: "evt-1",
      payload: { ok: true },
      idempotencyKey: "evt-1",
      createdBy: "00000000-0000-4000-8000-000000000002"
    });

    const seen: string[] = [];
    const firstRun = await service.dispatchBatch(async (event) => {
      seen.push(event.id);
    });
    const secondRun = await service.dispatchBatch(async (event) => {
      seen.push(event.id);
    });

    expect(firstRun).toEqual({ processed: 1, failed: 0 });
    expect(secondRun).toEqual({ processed: 0, failed: 0 });
    expect(seen).toHaveLength(1);
  });
});

// G-10: PostgresOutboxRepository.enqueue/findByIdempotencyKey were migrated
// to TenantScopedDb; claimBatch/markProcessed/markFailed deliberately were
// not (they're called by the cross-tenant background worker — see the
// repository's own header comment). This suite proves the tenant-scoped half
// of the migration against real Supabase; the worker methods' real-Supabase
// coverage is unchanged from before this migration (still exercised only
// indirectly through other modules' HTTP tests, which already publish
// outbox events as a side effect).
describe("PostgresOutboxRepository against real Supabase", () => {
  const repositoryPool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
  const repositoryDb = new TenantScopedDb(repositoryPool);
  const repository = new PostgresOutboxRepository(repositoryDb, repositoryPool);

  afterAll(async () => {
    await repositoryPool.end();
  });

  it("enqueues an event and deduplicates a repeated idempotency key for the same tenant", async () => {
    const tenantId = randomUUID();
    const event = createOutboxEvent({
      tenantId,
      eventType: "outbox.repository.real",
      aggregateType: "test_aggregate",
      aggregateId: randomUUID(),
      payload: { source: "outbox-repository-real-test" },
      idempotencyKey: `outbox-real-${randomUUID()}`,
      createdBy: randomUUID()
    });

    const first = await repository.enqueue(event);
    const second = await repository.enqueue(event);
    expect(second.id).toBe(first.id);

    const found = await repository.findByIdempotencyKey(tenantId, event.idempotencyKey);
    expect(found?.id).toBe(first.id);
    expect(found?.eventType).toBe("outbox.repository.real");
  }, 30_000);

  it("does not find an event under a different tenant's idempotency-key namespace", async () => {
    const tenantId = randomUUID();
    const otherTenantId = randomUUID();
    const event = createOutboxEvent({
      tenantId,
      eventType: "outbox.repository.cross-tenant",
      aggregateType: "test_aggregate",
      aggregateId: randomUUID(),
      payload: {},
      idempotencyKey: `outbox-cross-tenant-${randomUUID()}`,
      createdBy: randomUUID()
    });

    await repository.enqueue(event);
    const foundUnderOtherTenant = await repository.findByIdempotencyKey(otherTenantId, event.idempotencyKey);
    expect(foundUnderOtherTenant).toBeNull();
  });
});

// G-10 follow-up: POST /v1/outbox/events had zero HTTP-level test coverage
// anywhere before this migration — the exact same blind spot that let the
// identity-tenant controller's bare-constructor-injection bug go undetected.
// This controller had the identical bug (fixed alongside it, see
// outbox.controller.ts:18) and likewise had never been exercised over real
// HTTP, so this proves the fix rather than assuming it from the repository
// tests alone.
describe("Outbox HTTP exposure", () => {
  let app: INestApplication;
  let appPool: pg.Pool;
  let baseUrl: string;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalFilters(new ProblemDetailsFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidUnknownValues: true,
        transform: true
      })
    );
    await app.listen(0);
    appPool = app.get<pg.Pool>(DATABASE_POOL);
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await appPool.end();
  });

  it("publishes an outbox event through the real HTTP surface and deduplicates by idempotency key", async () => {
    const tenantId = randomUUID();
    const body = {
      tenantId,
      eventType: "outbox.http.published",
      aggregateType: "test_aggregate",
      aggregateId: randomUUID(),
      payload: { source: "outbox-http-test" },
      idempotencyKey: `outbox-http-${randomUUID()}`,
      createdBy: randomUUID()
    };

    const first = await fetch(`${baseUrl}/v1/outbox/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    expect(first.status).toBe(201);
    const firstEvent = (await first.json()) as OutboxEvent;

    const second = await fetch(`${baseUrl}/v1/outbox/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    expect(second.status).toBe(201);
    const secondEvent = (await second.json()) as OutboxEvent;

    expect(secondEvent.id).toBe(firstEvent.id);
  });
});
