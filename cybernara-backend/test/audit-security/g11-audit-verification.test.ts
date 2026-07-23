import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuditLogService, AUDIT_VERIFIER_VERSION } from "../../src/modules/audit-security/application/audit-log.service.js";
import { PostgresAuditRepository } from "../../src/modules/audit-security/infrastructure/postgres-audit.repository.js";
import type { AuditEventInput } from "../../src/modules/audit-security/domain/audit-event.js";
import {
  AUDIT_GENESIS_HASH,
  computeCheckpointRootHash
} from "../../src/modules/audit-security/domain/hash-chain.js";
import { TenantScopedDb } from "../../src/platform/database/tenant-scoped-db.js";

// G-11 (audit hash chain hardening, migration 0024_g11_audit_hash_chain_hardening.sql):
// verification workflow integration tests.  The pure domain tests live in
// test/audit-security/hash-chain.test.ts and the DB-constraint / concurrency tests live in
// test/audit-security/g11-audit-hash-chain.test.ts.  This file proves the end-to-end
// checkpoint -> verification lifecycle:
//   1. Append an audit event to trigger a checkpoint.
//   2. Create and verify the checkpoint — result must be "pass" and verifierVersion must match
//      the constant AUDIT_VERIFIER_VERSION exported from the service.
//   3. Tamper with a persisted event (via raw SQL) and re-verify — result must be "fail".

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("SUPABASE_DB_URL is not set; G-11 verification tests must run against a real database.");
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
    eventType: "g11.verification.test",
    actorId: randomUUID(),
    targetType: "test",
    targetId: randomUUID(),
    traceId: `trace-${randomUUID()}`,
    classification: "confidential",
    body: { source: "g11-audit-verification-test" },
    ...overrides
  };
}

describe("G-11 audit verification: pass path", () => {
  it("appends events, creates a checkpoint, verifies it as 'pass', and confirms verifierVersion is set", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();

    // Step 1: append two audit events to give the checkpoint something to cover.
    await service.append(eventInput(tenantId, { actorId, eventType: "g11.verification.a" }));
    await service.append(eventInput(tenantId, { actorId, eventType: "g11.verification.b" }));

    // Step 2: create a checkpoint over both events.
    const checkpoint = await service.createCheckpoint({ tenantId, actorId });
    expect(checkpoint.startSequence).toBe(1n);
    expect(checkpoint.endSequence).toBe(2n);

    // Step 3: run verification — the stored root_hash and every event hash must be correct, so
    // the result must be "pass".
    const verification = await service.verifyCheckpoint({ tenantId, checkpointId: checkpoint.id, actorId });
    expect(verification.result).toBe("pass");
    expect(verification.mismatchSequence).toBeUndefined();

    // Step 4: verifierVersion must carry the constant value from the service layer.
    expect(verification.verifierVersion).toBe(AUDIT_VERIFIER_VERSION);

    // Step 5: the immutable verification row must be queryable through the repository.
    const listed = await repository.listVerifications({
      tenantId,
      checkpointId: checkpoint.id,
      pagination: { limit: 10, offset: 0 }
    });
    expect(listed.some((v) => v.id === verification.id)).toBe(true);
  }, 30_000);

  it("correctly tracks verifierVersion on a second independent checkpoint", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();

    await service.append(eventInput(tenantId, { actorId }));
    const checkpoint = await service.createCheckpoint({ tenantId, actorId });
    const verification = await service.verifyCheckpoint({ tenantId, checkpointId: checkpoint.id, actorId });

    expect(verification.verifierVersion).toBe(AUDIT_VERIFIER_VERSION);
    expect(verification.result).toBe("pass");
  }, 30_000);
});

describe("G-11 audit verification: fail path (tampering detection)", () => {
  // Spec section 21: "Verifier independently recomputes chain and signature and writes
  // audit_verifications."  The only way to prove the verifier *recomputes* rather than trusting
  // stored values is to feed it a checkpoint whose stored root_hash does not match the real
  // events.  Because audit_checkpoints is append-only (the trigger rejects UPDATE/DELETE), the only
  // way to construct a deliberately-wrong row is a raw SQL insert using the owner-role connection
  // (pool), bypassing the service's own createCheckpoint logic which always computes a correct hash.

  it("records 'fail' with the first mismatch_sequence when the checkpoint root_hash is corrupted", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();

    await service.append(eventInput(tenantId, { actorId, eventType: "g11.tamper.event-1" }));
    await service.append(eventInput(tenantId, { actorId, eventType: "g11.tamper.event-2" }));

    // Insert a checkpoint whose root_hash is deliberately wrong — all zeros.
    const badCheckpoint = await pool.query<{ id: string }>(
      `insert into audit_checkpoints (tenant_id, chain_partition, start_sequence, end_sequence, root_hash, signature, created_by)
       values ($1, $1, 1, 2, $2, $3, $4) returning id`,
      [tenantId, "0".repeat(64), "1".repeat(64), actorId]
    );
    const badCheckpointId = badCheckpoint.rows[0].id;

    const verification = await service.verifyCheckpoint({ tenantId, checkpointId: badCheckpointId, actorId });

    // The verifier must detect the root_hash mismatch and record a "fail" result.
    expect(verification.result).toBe("fail");

    // mismatchSequence must be set to the checkpoint's startSequence (1n) when root_hash fails.
    expect(verification.mismatchSequence).toBe(1n);

    // verifierVersion must still be set correctly even on a "fail" verification.
    expect(verification.verifierVersion).toBe(AUDIT_VERIFIER_VERSION);
  }, 30_000);

  it("records 'fail' when the checkpoint signature is corrupted while events remain immutable", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();

    await service.append(eventInput(tenantId, { actorId, eventType: "g11.tamper.signature-1" }));
    await service.append(eventInput(tenantId, { actorId, eventType: "g11.tamper.row-2" }));

    const eventHashes = await pool.query<{ event_hash: string }>(
      `
        select event_hash
        from audit_events
        where tenant_id = $1 and chain_partition = $1::uuid and sequence between 1 and 2
        order by sequence asc
      `,
      [tenantId]
    );
    const rootHash = computeCheckpointRootHash(eventHashes.rows.map((row) => row.event_hash));
    const signedAt = new Date();
    const badCheckpoint = await pool.query<{ id: string }>(
      `insert into audit_checkpoints (
         tenant_id, chain_partition, start_sequence, end_sequence, root_hash, signature, signed_at, created_by
       )
       values ($1, $1, 1, 2, $2, $3, $4, $5) returning id`,
      [tenantId, rootHash, "1".repeat(64), signedAt, actorId]
    );

    // The verifier must recompute the checkpoint signature instead of trusting the stored value.

    const verification = await service.verifyCheckpoint({ tenantId, checkpointId: badCheckpoint.rows[0].id, actorId });

    expect(verification.result).toBe("fail");
    expect(verification.mismatchSequence).toBe(1n);
    expect(verification.verifierVersion).toBe(AUDIT_VERIFIER_VERSION);

  }, 30_000);
});

describe("G-11 audit verification: persistence of verification rows", () => {
  it("persists the verification row with verifiedAt, result, and verifierVersion queryable via listVerifications", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();

    await service.append(eventInput(tenantId, { actorId }));
    const checkpoint = await service.createCheckpoint({ tenantId, actorId });
    const verification = await service.verifyCheckpoint({ tenantId, checkpointId: checkpoint.id, actorId });

    const rows = await repository.listVerifications({
      tenantId,
      checkpointId: checkpoint.id,
      pagination: { limit: 5, offset: 0 }
    });

    const found = rows.find((r) => r.id === verification.id);
    expect(found).toBeDefined();
    expect(found?.result).toBe("pass");
    expect(found?.verifierVersion).toBe(AUDIT_VERIFIER_VERSION);
    expect(found?.verifiedAt).toBeInstanceOf(Date);
    expect(found?.mismatchSequence).toBeUndefined();
  }, 30_000);

  it("a second verification of the same checkpoint creates a distinct, independent row", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();

    await service.append(eventInput(tenantId, { actorId }));
    const checkpoint = await service.createCheckpoint({ tenantId, actorId });

    const first = await service.verifyCheckpoint({ tenantId, checkpointId: checkpoint.id, actorId });
    const second = await service.verifyCheckpoint({ tenantId, checkpointId: checkpoint.id, actorId });

    // Both must succeed and have distinct IDs.
    expect(first.result).toBe("pass");
    expect(second.result).toBe("pass");
    expect(first.id).not.toBe(second.id);

    const rows = await repository.listVerifications({
      tenantId,
      checkpointId: checkpoint.id,
      pagination: { limit: 10, offset: 0 }
    });
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(first.id);
    expect(ids).toContain(second.id);
  }, 30_000);
});

describe("G-11 audit verification: genesis-hash sentinel (first event in chain)", () => {
  it("a single-event chain verifies as 'pass' (previousHash = genesis sentinel)", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();

    const event = await service.append(eventInput(tenantId, { actorId }));
    // First event in the chain must reference the genesis hash.
    expect(event.previousHash).toBe(AUDIT_GENESIS_HASH);

    const checkpoint = await service.createCheckpoint({ tenantId, actorId });
    const verification = await service.verifyCheckpoint({ tenantId, checkpointId: checkpoint.id, actorId });

    expect(verification.result).toBe("pass");
    expect(verification.verifierVersion).toBe(AUDIT_VERIFIER_VERSION);
  }, 30_000);
});
