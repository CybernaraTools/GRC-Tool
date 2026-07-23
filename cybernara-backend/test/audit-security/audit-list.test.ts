import "dotenv/config";
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { AuditLogService } from "../../src/modules/audit-security/public.js";
import { PostgresAuditRepository } from "../../src/modules/audit-security/infrastructure/postgres-audit.repository.js";
import type { AuditEventInput } from "../../src/modules/audit-security/public.js";
import { TenantScopedDb } from "../../src/platform/database/tenant-scoped-db.js";
import { DATABASE_POOL } from "../../src/platform/database/tokens.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";

interface AuditEventResponse extends Omit<AuditEventInput, "occurredAt"> {
  id: string;
  sequence: string;
  previousHash: string;
  eventHash: string;
  occurredAt: string;
}

const repositoryPool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
const repositoryDb = new TenantScopedDb(repositoryPool);
const httpTenantId = randomUUID();
const httpActorId = randomUUID();
const httpTargetId = randomUUID();

let app: INestApplication;
let appPool: pg.Pool;
let auditLog: AuditLogService;
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
  auditLog = app.get(AuditLogService);
  const address = app.getHttpServer().address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
}, 120_000);

afterAll(async () => {
  await app?.close();
  await appPool?.end();
  await repositoryPool.end();
});

describe("AuditSecurity repository list", () => {
  it("filters audit events by persisted columns and paginates by offset", async () => {
    const repository = new PostgresAuditRepository(repositoryDb);
    const tenantId = randomUUID();
    const actorA = randomUUID();
    const actorB = randomUUID();
    const targetA = randomUUID();
    const targetB = randomUUID();
    const service = new AuditLogService(repository);

    const first = await service.append(
      eventInput({
        tenantId,
        actorId: actorA,
        eventType: "audit.list.alpha",
        targetType: "assessment",
        targetId: targetA,
        classification: "internal",
        occurredAt: new Date("2026-02-01T00:00:00.000Z")
      })
    );
    const second = await service.append(
      eventInput({
        tenantId,
        actorId: actorB,
        eventType: "audit.list.beta",
        targetType: "evidence_object",
        targetId: targetB,
        classification: "restricted",
        occurredAt: new Date("2026-02-02T00:00:00.000Z")
      })
    );
    const third = await service.append(
      eventInput({
        tenantId,
        actorId: actorA,
        eventType: "audit.list.alpha",
        targetType: "assessment",
        targetId: targetA,
        classification: "confidential",
        occurredAt: new Date("2026-02-03T00:00:00.000Z")
      })
    );

    await expectIds(repository, { tenantId, filters: {}, pagination: { limit: 2, offset: 0 } }, [third.id, second.id]);
    await expectIds(repository, { tenantId, filters: {}, pagination: { limit: 2, offset: 1 } }, [second.id, first.id]);
    await expectIds(repository, { tenantId, filters: { eventType: "audit.list.beta" }, pagination: page() }, [second.id]);
    await expectIds(repository, { tenantId, filters: { targetType: "evidence_object" }, pagination: page() }, [second.id]);
    await expectIds(repository, { tenantId, filters: { targetId: targetA }, pagination: page() }, [third.id, first.id]);
    await expectIds(repository, { tenantId, filters: { actorId: actorB }, pagination: page() }, [second.id]);
    await expectIds(repository, { tenantId, filters: { classification: "internal" }, pagination: page() }, [first.id]);
    await expectIds(
      repository,
      {
        tenantId,
        filters: {
          occurredAtFrom: new Date("2026-02-02T00:00:00.000Z"),
          occurredAtTo: new Date("2026-02-03T00:00:00.000Z")
        },
        pagination: page()
      },
      [third.id, second.id]
    );
  }, 120_000);
});

describe("AuditSecurity repository findById", () => {
  // G-10 follow-up: findById previously took no tenantId at all (queried
  // `where id = $1` globally) and its HTTP route had no @RequirePolicy guard
  // — a real gap this migration surfaced and fixed, not a pre-existing
  // behavior to preserve. These tests prove the fix, since no test
  // previously covered this method at all.
  it("finds an event scoped to its own tenant, and returns null for a cross-tenant lookup", async () => {
    const repository = new PostgresAuditRepository(repositoryDb);
    const service = new AuditLogService(repository);
    const ownerTenantId = randomUUID();
    const otherTenantId = randomUUID();

    const event = await service.append(
      eventInput({
        tenantId: ownerTenantId,
        actorId: randomUUID(),
        eventType: "audit.findById.owned",
        targetType: "assessment",
        targetId: randomUUID(),
        classification: "internal",
        occurredAt: new Date("2026-04-01T00:00:00.000Z")
      })
    );

    const found = await service.findById(ownerTenantId, event.id);
    expect(found?.id).toBe(event.id);

    const crossTenant = await service.findById(otherTenantId, event.id);
    expect(crossTenant).toBeNull();
    // Caught by the full-gate run 2026-07-06: two sequential real-Supabase
    // append+findById round trips regularly land right at the default
    // 5000ms vitest timeout under general suite latency (observed 4.7-5.0s)
    // — unrelated to this session's G-01/G-09 work (audit-security is
    // untouched by either). Same fix already applied elsewhere in this
    // suite (a2/a4/a6).
  }, 30_000);
});

describe("AuditSecurity HTTP list", () => {
  it("returns a filtered audit event list through the policy guard", async () => {
    await auditLog.append(
      eventInput({
        tenantId: httpTenantId,
        actorId: httpActorId,
        eventType: "audit.http.filtered",
        targetType: "assessment",
        targetId: httpTargetId,
        classification: "confidential",
        occurredAt: new Date("2026-03-01T00:00:00.000Z")
      })
    );

    const response = await fetch(
      `${baseUrl}/v1/audit/events?eventType=audit.http.filtered&targetId=${httpTargetId}&limit=10&offset=0`,
      { headers: headers("audit_event:read") }
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as AuditEventResponse[];
    expect(body.length).toBe(1);
    expect(body[0]).toMatchObject({
      tenantId: httpTenantId,
      actorId: httpActorId,
      eventType: "audit.http.filtered",
      targetType: "assessment",
      targetId: httpTargetId,
      classification: "confidential"
    });
    expect(body[0].sequence).toMatch(/^\d+$/);
  });

  it("rejects missing audit scope and invalid date ranges", async () => {
    const unauthorized = await fetch(`${baseUrl}/v1/audit/events`, {
      headers: headers("assessment:read")
    });
    expect(unauthorized.status).toBe(403);

    const invalidRange = await fetch(
      `${baseUrl}/v1/audit/events?from=2026-03-02T00:00:00.000Z&to=2026-03-01T00:00:00.000Z`,
      { headers: headers("audit_event:read") }
    );
    expect(invalidRange.status).toBe(400);
    await expect(invalidRange.json()).resolves.toMatchObject({
      type: "about:blank",
      title: "Request Error",
      status: 400,
      detail: "from must be before or equal to to."
    });
  });

  // G-10 follow-up: GET /v1/audit/events/:eventId previously had no
  // @UseGuards(PolicyGuard)/@RequirePolicy at all — any request, with or
  // without valid scopes, could reach it. Proves that gap is now closed and
  // that a correctly-scoped request still resolves the event it created.
  it("requires the audit_event:read scope to fetch a single event by ID, and resolves it when authorized", async () => {
    const created = await auditLog.append(
      eventInput({
        tenantId: httpTenantId,
        actorId: httpActorId,
        eventType: "audit.http.findById",
        targetType: "assessment",
        targetId: httpTargetId,
        classification: "confidential",
        occurredAt: new Date("2026-03-05T00:00:00.000Z")
      })
    );

    const unauthorized = await fetch(`${baseUrl}/v1/audit/events/${created.id}`, {
      headers: headers("assessment:read")
    });
    expect(unauthorized.status).toBe(403);

    const authorized = await fetch(`${baseUrl}/v1/audit/events/${created.id}`, {
      headers: headers("audit_event:read")
    });
    expect(authorized.status).toBe(200);
    const body = (await authorized.json()) as AuditEventResponse;
    expect(body.id).toBe(created.id);
    expect(body.eventType).toBe("audit.http.findById");
  });
});

interface AuditCheckpointResponse {
  id: string;
  tenantId: string;
  chainPartition: string;
  startSequence: string;
  endSequence: string;
  rootHash: string;
  signature: string;
  signedAt: string;
}

interface AuditVerificationResponse {
  id: string;
  tenantId: string;
  checkpointId: string;
  verifiedAt: string;
  result: "pass" | "fail";
  mismatchSequence?: string;
  verifierVersion: string;
}

describe("G-11 AuditChain HTTP exposure", () => {
  it("creates, lists, fetches, and verifies a real checkpoint through HTTP, and rejects a duplicate with nothing new", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    await auditLog.append(
      eventInput({ tenantId, actorId, eventType: "g11.http.a", targetType: "test", targetId: randomUUID(), classification: "confidential" })
    );
    await auditLog.append(
      eventInput({ tenantId, actorId, eventType: "g11.http.b", targetType: "test", targetId: randomUUID(), classification: "confidential" })
    );

    const created = await fetch(`${baseUrl}/v1/audit/checkpoints`, {
      method: "POST",
      headers: headersFor(tenantId, actorId, "audit_checkpoint:write")
    });
    expect(created.status).toBe(201);
    const checkpoint = (await created.json()) as AuditCheckpointResponse;
    expect(checkpoint.startSequence).toBe("1");
    expect(checkpoint.endSequence).toBe("2");
    expect(checkpoint.chainPartition).toBe(tenantId);

    const listed = await fetch(`${baseUrl}/v1/audit/checkpoints`, {
      headers: headersFor(tenantId, actorId, "audit_checkpoint:read")
    });
    expect(listed.status).toBe(200);
    const checkpoints = (await listed.json()) as AuditCheckpointResponse[];
    expect(checkpoints.map((row) => row.id)).toContain(checkpoint.id);

    const fetched = await fetch(`${baseUrl}/v1/audit/checkpoints/${checkpoint.id}`, {
      headers: headersFor(tenantId, actorId, "audit_checkpoint:read")
    });
    expect(fetched.status).toBe(200);

    const duplicate = await fetch(`${baseUrl}/v1/audit/checkpoints`, {
      method: "POST",
      headers: headersFor(tenantId, actorId, "audit_checkpoint:write")
    });
    expect(duplicate.status).toBe(409);

    const verified = await fetch(`${baseUrl}/v1/audit/checkpoints/${checkpoint.id}/verify`, {
      method: "POST",
      headers: headersFor(tenantId, actorId, "audit_checkpoint:write")
    });
    expect(verified.status).toBe(201);
    const verification = (await verified.json()) as AuditVerificationResponse;
    expect(verification.result).toBe("pass");
    expect(verification.mismatchSequence).toBeUndefined();

    const verifications = await fetch(`${baseUrl}/v1/audit/verifications?checkpointId=${checkpoint.id}`, {
      headers: headersFor(tenantId, actorId, "audit_checkpoint:read")
    });
    expect(verifications.status).toBe(200);
    const verificationList = (await verifications.json()) as AuditVerificationResponse[];
    expect(verificationList.map((row) => row.id)).toContain(verification.id);
  }, 60_000);

  it("rejects checkpoint routes without the audit_checkpoint scope", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const unauthorized = await fetch(`${baseUrl}/v1/audit/checkpoints`, {
      method: "POST",
      headers: headersFor(tenantId, actorId, "assessment:read")
    });
    expect(unauthorized.status).toBe(403);
  });

  // Proves the "fail" path is reachable through the real HTTP surface, not just the service unit
  // test: a checkpoint whose stored root_hash does not match its own events (constructed via a raw
  // insert, since audit_checkpoints is append-only and `createCheckpoint` itself always computes a
  // correct root_hash) must come back as `result: "fail"` with the correct `mismatchSequence` when
  // verified through `POST /v1/audit/checkpoints/{id}/verify`.
  it("reports a corrupted checkpoint as 'fail' with the correct mismatchSequence through HTTP", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    await auditLog.append(
      eventInput({ tenantId, actorId, eventType: "g11.http.bad", targetType: "test", targetId: randomUUID(), classification: "confidential" })
    );

    const badCheckpoint = await repositoryPool.query<{ id: string }>(
      `insert into audit_checkpoints (tenant_id, chain_partition, start_sequence, end_sequence, root_hash, signature, created_by)
       values ($1, $1, 1, 1, $2, $3, $4) returning id`,
      [tenantId, "0".repeat(64), "1".repeat(64), actorId]
    );

    const verified = await fetch(`${baseUrl}/v1/audit/checkpoints/${badCheckpoint.rows[0].id}/verify`, {
      method: "POST",
      headers: headersFor(tenantId, actorId, "audit_checkpoint:write")
    });
    expect(verified.status).toBe(201);
    const verification = (await verified.json()) as AuditVerificationResponse;
    expect(verification.result).toBe("fail");
    expect(verification.mismatchSequence).toBe("1");
  }, 30_000);
});

function headersFor(tenantId: string, actorId: string, scopes: string): Record<string, string> {
  return {
    "x-tenant-id": tenantId,
    "x-user-id": actorId,
    "x-user-clearance": "restricted",
    "x-user-scopes": scopes
  };
}

function eventInput(input: Omit<AuditEventInput, "traceId" | "body">): AuditEventInput {
  return {
    ...input,
    traceId: `trace-${randomUUID()}`,
    body: { source: "audit-list-test" }
  };
}

function page() {
  return { limit: 20, offset: 0 };
}

async function expectIds(
  repository: PostgresAuditRepository,
  input: Parameters<PostgresAuditRepository["list"]>[0],
  expectedIds: string[]
): Promise<void> {
  const records = await repository.list(input);
  expect(records.map((record) => record.id)).toEqual(expectedIds);
}

function headers(scopes: string): Record<string, string> {
  return {
    "x-tenant-id": httpTenantId,
    "x-user-id": httpActorId,
    "x-user-clearance": "restricted",
    "x-user-scopes": scopes
  };
}
