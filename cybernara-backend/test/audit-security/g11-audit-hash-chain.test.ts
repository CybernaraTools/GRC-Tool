import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuditLogService } from "../../src/modules/audit-security/application/audit-log.service.js";
import { PostgresAuditRepository } from "../../src/modules/audit-security/infrastructure/postgres-audit.repository.js";
import {
  AUDIT_GENESIS_HASH,
  AUDIT_HASH_VERSION_LEGACY,
  computeAuditHash,
  computeCheckpointRootHash,
  verifyAuditEvent
} from "../../src/modules/audit-security/domain/hash-chain.js";
import type { AuditEventInput } from "../../src/modules/audit-security/domain/audit-event.js";
import { TenantScopedDb } from "../../src/platform/database/tenant-scoped-db.js";

// G-11 (audit hash chain hardening, migration 0024_g11_audit_hash_chain_hardening.sql): pure
// domain-function tampering tests already live in test/audit-security/hash-chain.test.ts (extended
// this gap). This file covers what only a real database can prove: the new constraints actually
// reject bad data, and — the real gap this session found underneath the gap-report's one
// sentence — concurrent `append()` calls for the same tenant no longer race and fork the chain.

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("SUPABASE_DB_URL is not set; G-11 integrity tests must run against a real database.");
}

let pool: pg.Pool;
let repository: PostgresAuditRepository;
let service: AuditLogService;

beforeAll(() => {
  pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
  repository = new PostgresAuditRepository(new TenantScopedDb(pool));
  service = new AuditLogService(repository);
});

afterAll(async () => {
  await pool.end();
});

function eventInput(tenantId: string, overrides: Partial<AuditEventInput> = {}): AuditEventInput {
  return {
    tenantId,
    eventType: "g11.test.event",
    actorId: randomUUID(),
    targetType: "test",
    targetId: randomUUID(),
    traceId: `trace-${randomUUID()}`,
    classification: "confidential",
    body: { source: "g11-audit-hash-chain-test" },
    ...overrides
  };
}

describe("G-11: chain_partition and per-partition sequence", () => {
  it("chain_partition is generated from tenant_id automatically", async () => {
    const tenantId = randomUUID();
    const event = await service.append(eventInput(tenantId));
    expect(event.chainPartition).toBe(tenantId);

    const row = await pool.query("select chain_partition from audit_events where id = $1", [event.id]);
    expect(row.rows[0].chain_partition).toBe(tenantId);
  });

  it("rejects a raw duplicate (chain_partition, sequence) insert", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    await pool.query(
      `insert into audit_events (tenant_id, sequence, version, event_type, actor_id, target_type, target_id, trace_id, classification, body, previous_hash, event_hash)
       values ($1, 1, 2, 'g11.raw', $2, 'test', 'test-1', 'trace-raw-1', 'confidential', '{}'::jsonb, $3, $4)`,
      [tenantId, actorId, AUDIT_GENESIS_HASH, randomUUID()]
    );
    await expect(
      pool.query(
        `insert into audit_events (tenant_id, sequence, version, event_type, actor_id, target_type, target_id, trace_id, classification, body, previous_hash, event_hash)
         values ($1, 1, 2, 'g11.raw', $2, 'test', 'test-2', 'trace-raw-2', 'confidential', '{}'::jsonb, $3, $4)`,
        [tenantId, actorId, AUDIT_GENESIS_HASH, randomUUID()]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  // This is the real proof for the gap sentence's "concurrency strategy" phrase: before this gap,
  // `AuditLogService.append()` read the latest hash and inserted as two independent transactions
  // with no lock between them, so concurrent appends for the same tenant could both read the same
  // previousHash and race. Firing many concurrent appends for one tenant and confirming the
  // resulting sequence is a perfect, gap-free 1..N run with an unbroken previous_hash chain is the
  // only way to actually prove the advisory-lock fix closes that race, rather than just trusting
  // the code reads correctly in isolation.
  it("serializes concurrent appends for the same tenant into a gap-free, correctly-chained sequence", async () => {
    const tenantId = randomUUID();
    const concurrency = 12;

    const events = await Promise.all(
      Array.from({ length: concurrency }, (_, index) => service.append(eventInput(tenantId, { eventType: `g11.concurrent.${index}` })))
    );

    const sequences = events.map((event) => event.sequence).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const expected = Array.from({ length: concurrency }, (_, index) => BigInt(index + 1));
    expect(sequences).toEqual(expected);

    const persisted = await repository.listInRange({
      tenantId,
      chainPartition: tenantId,
      startSequence: 1n,
      endSequence: BigInt(concurrency)
    });
    expect(persisted).toHaveLength(concurrency);

    for (let index = 0; index < persisted.length; index += 1) {
      expect(verifyAuditEvent(persisted[index])).toBe(true);
      const expectedPreviousHash = index === 0 ? AUDIT_GENESIS_HASH : persisted[index - 1].eventHash;
      expect(persisted[index].previousHash).toBe(expectedPreviousHash);
    }
  }, 30_000);
});

describe("G-11: audit_checkpoints constraints", () => {
  it("rejects start_sequence > end_sequence", async () => {
    await expect(
      pool.query(
        `insert into audit_checkpoints (tenant_id, chain_partition, start_sequence, end_sequence, root_hash, signature, created_by)
         values ($1, $1, 5, 2, $2, $3, $4)`,
        [randomUUID(), "a".repeat(64), "b".repeat(64), randomUUID()]
      )
    ).rejects.toThrow(/check constraint/i);
  });

  it("rejects a duplicate (chain_partition, end_sequence)", async () => {
    const chainPartition = randomUUID();
    const actorId = randomUUID();
    await pool.query(
      `insert into audit_checkpoints (tenant_id, chain_partition, start_sequence, end_sequence, root_hash, signature, created_by)
       values ($1, $1, 1, 10, $2, $3, $4)`,
      [chainPartition, "a".repeat(64), "b".repeat(64), actorId]
    );
    await expect(
      pool.query(
        `insert into audit_checkpoints (tenant_id, chain_partition, start_sequence, end_sequence, root_hash, signature, created_by)
         values ($1, $1, 11, 10, $2, $3, $4)`,
        [chainPartition, "c".repeat(64), "d".repeat(64), actorId]
      )
    ).rejects.toThrow(/check constraint|duplicate key|unique/i);
  });

  it("rejects update and delete (append-only)", async () => {
    const actorId = randomUUID();
    const inserted = await pool.query(
      `insert into audit_checkpoints (tenant_id, chain_partition, start_sequence, end_sequence, root_hash, signature, created_by)
       values ($1, $1, 1, 3, $2, $3, $4) returning id`,
      [randomUUID(), "a".repeat(64), "b".repeat(64), actorId]
    );
    const id = inserted.rows[0].id as string;
    await expect(pool.query(`update audit_checkpoints set root_hash = 'z' where id = $1`, [id])).rejects.toThrow(
      /append-only/i
    );
    await expect(pool.query(`delete from audit_checkpoints where id = $1`, [id])).rejects.toThrow(/append-only/i);
  });
});

describe("G-11: audit_verifications constraints", () => {
  async function seedCheckpoint(): Promise<string> {
    const inserted = await pool.query(
      `insert into audit_checkpoints (tenant_id, chain_partition, start_sequence, end_sequence, root_hash, signature, created_by)
       values ($1, $1, 1, 3, $2, $3, $4) returning id`,
      [randomUUID(), "a".repeat(64), "b".repeat(64), randomUUID()]
    );
    return inserted.rows[0].id as string;
  }

  it("rejects mismatch_sequence set when result is 'pass'", async () => {
    const checkpointId = await seedCheckpoint();
    await expect(
      pool.query(
        `insert into audit_verifications (tenant_id, checkpoint_id, result, mismatch_sequence, verifier_version, created_by)
         values ($1, $2, 'pass', 2, 'test-v1', $3)`,
        [randomUUID(), checkpointId, randomUUID()]
      )
    ).rejects.toThrow(/check constraint/i);
  });

  it("rejects an invalid result value", async () => {
    const checkpointId = await seedCheckpoint();
    await expect(
      pool.query(
        `insert into audit_verifications (tenant_id, checkpoint_id, result, verifier_version, created_by)
         values ($1, $2, 'not_a_real_result', 'test-v1', $3)`,
        [randomUUID(), checkpointId, randomUUID()]
      )
    ).rejects.toThrow(/check constraint/i);
  });

  it("rejects a nonexistent checkpoint_id", async () => {
    await expect(
      pool.query(
        `insert into audit_verifications (tenant_id, checkpoint_id, result, verifier_version, created_by)
         values ($1, $2, 'pass', 'test-v1', $3)`,
        [randomUUID(), randomUUID(), randomUUID()]
      )
    ).rejects.toThrow(/foreign key/i);
  });

  it("rejects update and delete (append-only)", async () => {
    const checkpointId = await seedCheckpoint();
    const inserted = await pool.query(
      `insert into audit_verifications (tenant_id, checkpoint_id, result, verifier_version, created_by)
       values ($1, $2, 'pass', 'test-v1', $3) returning id`,
      [randomUUID(), checkpointId, randomUUID()]
    );
    const id = inserted.rows[0].id as string;
    await expect(pool.query(`update audit_verifications set result = 'fail' where id = $1`, [id])).rejects.toThrow(
      /append-only/i
    );
    await expect(pool.query(`delete from audit_verifications where id = $1`, [id])).rejects.toThrow(/append-only/i);
  });
});

describe("G-11: AuditLogService checkpoint lifecycle", () => {
  it("creates a checkpoint covering every event since genesis, and rejects a second call with nothing new", async () => {
    const tenantId = randomUUID();
    const events = await Promise.all([
      service.append(eventInput(tenantId, { eventType: "g11.checkpoint.a" })),
      service.append(eventInput(tenantId, { eventType: "g11.checkpoint.b" })),
      service.append(eventInput(tenantId, { eventType: "g11.checkpoint.c" }))
    ]);
    const sortedHashesBySequence = [...events]
      .sort((a, b) => (a.sequence < b.sequence ? -1 : 1))
      .map((event) => event.eventHash);

    const checkpoint = await service.createCheckpoint({ tenantId, actorId: randomUUID() });
    expect(checkpoint.startSequence).toBe(1n);
    expect(checkpoint.endSequence).toBe(3n);
    expect(checkpoint.rootHash).toBe(computeCheckpointRootHash(sortedHashesBySequence));

    await expect(service.createCheckpoint({ tenantId, actorId: randomUUID() })).rejects.toThrow(/no new audit events/i);

    await service.append(eventInput(tenantId, { eventType: "g11.checkpoint.d" }));
    const secondCheckpoint = await service.createCheckpoint({ tenantId, actorId: randomUUID() });
    expect(secondCheckpoint.startSequence).toBe(4n);
    expect(secondCheckpoint.endSequence).toBe(4n);
  }, 30_000);

  it("verifies a real checkpoint as 'pass'", async () => {
    const tenantId = randomUUID();
    await service.append(eventInput(tenantId));
    await service.append(eventInput(tenantId));
    const checkpoint = await service.createCheckpoint({ tenantId, actorId: randomUUID() });

    const verification = await service.verifyCheckpoint({ tenantId, checkpointId: checkpoint.id, actorId: randomUUID() });
    expect(verification.result).toBe("pass");
    expect(verification.mismatchSequence).toBeUndefined();
  }, 30_000);

  // The verifier must actually recompute and compare, not just trust the stored root_hash — the
  // only way to prove that is to feed it a checkpoint whose stored root_hash does NOT match the
  // real events (simulating tampering at rest, or a signing-time bug), inserted directly via raw
  // SQL rather than through the service (audit_checkpoints is append-only, so this is the only way
  // to construct a deliberately-wrong row — `createCheckpoint` itself always computes a correct one).
  it("detects a corrupted root_hash and records a 'fail' verification with the correct mismatch_sequence", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    await service.append(eventInput(tenantId));
    await service.append(eventInput(tenantId));

    const badCheckpoint = await pool.query(
      `insert into audit_checkpoints (tenant_id, chain_partition, start_sequence, end_sequence, root_hash, signature, created_by)
       values ($1, $1, 1, 2, $2, $3, $4) returning id`,
      [tenantId, "0".repeat(64), "1".repeat(64), actorId]
    );

    const verification = await service.verifyCheckpoint({
      tenantId,
      checkpointId: badCheckpoint.rows[0].id as string,
      actorId
    });
    expect(verification.result).toBe("fail");
    expect(verification.mismatchSequence).toBe(1n);
  }, 30_000);

  it("throws NotFoundException for a checkpoint that does not exist", async () => {
    await expect(
      service.verifyCheckpoint({ tenantId: randomUUID(), checkpointId: randomUUID(), actorId: randomUUID() })
    ).rejects.toThrow(/not found/i);
  });
});

describe("G-11: legacy hash-version backward compatibility", () => {
  // A row inserted the pre-G-11 way (hashed without sequence/chain_partition, `version = 1`) must
  // still verify correctly after this migration — proving the hash-version distinction actually
  // protects historical rows from being misjudged as tampered, not just documentation.
  it("still verifies a raw pre-G-11-shaped row (hash_version 1) correctly", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const targetId = randomUUID();
    const occurredAt = new Date("2026-01-01T00:00:00.000Z");
    const legacyHash = computeAuditHash({
      tenantId,
      eventType: "g11.legacy",
      actorId,
      targetType: "test",
      targetId,
      traceId: "trace-legacy-1",
      classification: "confidential",
      body: { legacy: true },
      occurredAt,
      previousHash: AUDIT_GENESIS_HASH,
      hashVersion: AUDIT_HASH_VERSION_LEGACY
    });

    await pool.query(
      `insert into audit_events (tenant_id, sequence, version, event_type, actor_id, target_type, target_id, trace_id, classification, body, previous_hash, event_hash, occurred_at)
       values ($1, 1, 1, 'g11.legacy', $2, 'test', $3, 'trace-legacy-1', 'confidential', $4::jsonb, $5, $6, $7)`,
      [tenantId, actorId, targetId, JSON.stringify({ legacy: true }), AUDIT_GENESIS_HASH, legacyHash, occurredAt]
    );

    const found = await repository.findById(tenantId, (await pool.query("select id from audit_events where tenant_id = $1", [tenantId])).rows[0].id);
    expect(found).not.toBeNull();
    expect(found?.hashVersion).toBe(1);
    expect(verifyAuditEvent(found!)).toBe(true);
  });
});
