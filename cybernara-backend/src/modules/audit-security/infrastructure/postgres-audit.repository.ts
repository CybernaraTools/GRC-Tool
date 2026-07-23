import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { TenantScopedDb } from "../../../platform/database/tenant-scoped-db.js";
import type { AuditRepository } from "../application/audit-log.service.js";
import type { AuditCheckpoint, AuditEvent, AuditVerification } from "../domain/audit-event.js";
import {
  AUDIT_GENESIS_HASH,
  AUDIT_HASH_VERSION_CURRENT,
  computeCheckpointRootHash,
  computeCheckpointSignature
} from "../domain/hash-chain.js";

@Injectable()
export class PostgresAuditRepository implements AuditRepository {
  constructor(@Inject(TenantScopedDb) private readonly db: TenantScopedDb) {}

  // G-11: the advisory lock is taken on `chain_partition` (today always equal to `tenant_id`)
  // BEFORE reading the latest hash/sequence, and held for the rest of this transaction — the read
  // and the insert that depends on it can no longer be interleaved with another concurrent append
  // for the same partition, closing the TOCTOU race the pre-G-11 two-transaction `getLatestHash()` +
  // `append()` pattern had.
  async appendWithLock(input: Parameters<AuditRepository["appendWithLock"]>[0]): Promise<AuditEvent> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const chainPartition = input.tenantId;
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [chainPartition]);

      const latest = await client.query<{ sequence: string; event_hash: string }>(
        `
          select sequence, event_hash
          from audit_events
          where chain_partition = $1::uuid
          order by sequence desc
          limit 1
        `,
        [chainPartition]
      );

      const previousHash = latest.rows[0]?.event_hash ?? AUDIT_GENESIS_HASH;
      const nextSequence = latest.rows[0]?.sequence ? BigInt(latest.rows[0].sequence) + 1n : 1n;

      const event = input.buildEvent({ previousHash, nextSequence, chainPartition });

      const result = await client.query<{ sequence: string; chain_partition: string }>(
        `
          insert into audit_events (
            id, tenant_id, sequence, version, event_type, actor_id, target_type, target_id,
            trace_id, classification, body, previous_hash, event_hash, occurred_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14)
          returning sequence, chain_partition
        `,
        [
          event.id,
          event.tenantId,
          event.sequence.toString(),
          event.hashVersion,
          event.eventType,
          event.actorId,
          event.targetType,
          event.targetId,
          event.traceId,
          event.classification,
          JSON.stringify(event.body),
          event.previousHash,
          event.eventHash,
          event.occurredAt
        ]
      );

      return {
        ...event,
        sequence: BigInt(result.rows[0].sequence),
        chainPartition: String(result.rows[0].chain_partition)
      };
    });
  }

  async findById(tenantId: string, eventId: string): Promise<AuditEvent | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${auditEventColumns()}
          from audit_events
          where tenant_id = $1 and id = $2
        `,
        [tenantId, eventId]
      );
      const row = result.rows[0];

      if (!row) {
        return null;
      }

      return mapAuditEvent(row);
    });
  }

  async list(input: Parameters<AuditRepository["list"]>[0]): Promise<AuditEvent[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const values: unknown[] = [input.tenantId, input.pagination.limit, input.pagination.offset];
      const predicates = ["tenant_id = $1"];
      addPredicate(predicates, values, "event_type", input.filters.eventType);
      addPredicate(predicates, values, "target_type", input.filters.targetType);
      addPredicate(predicates, values, "target_id", input.filters.targetId);
      addPredicate(predicates, values, "actor_id", input.filters.actorId);
      addPredicate(predicates, values, "classification", input.filters.classification);
      addRangePredicate(predicates, values, "occurred_at", ">=", input.filters.occurredAtFrom);
      addRangePredicate(predicates, values, "occurred_at", "<=", input.filters.occurredAtTo);

      const result = await client.query(
        `
          select ${auditEventColumns()}
          from audit_events
          where ${predicates.join("\n          and ")}
          order by occurred_at desc, sequence desc
          limit $2 offset $3
        `,
        values
      );
      return result.rows.map(mapAuditEvent);
    });
  }

  async listInRange(input: Parameters<AuditRepository["listInRange"]>[0]): Promise<AuditEvent[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${auditEventColumns()}
          from audit_events
          where tenant_id = $1 and chain_partition = $2::uuid and sequence >= $3 and sequence <= $4
          order by sequence asc
        `,
        [input.tenantId, input.chainPartition, input.startSequence.toString(), input.endSequence.toString()]
      );
      return result.rows.map(mapAuditEvent);
    });
  }

  // Locked for the same reason `appendWithLock` is: determining "everything since the last
  // checkpoint" and persisting the new checkpoint must be one atomic operation under the
  // per-partition advisory lock, or a concurrent checkpoint creation could compute an overlapping
  // range. Root hash/signature are pure functions of the fetched range, computed here (inside the
  // same locked transaction) rather than round-tripped back through the service, since splitting
  // "read range" and "persist checkpoint" across two transactions would reopen the exact race this
  // lock exists to close.
  async createCheckpoint(input: Parameters<AuditRepository["createCheckpoint"]>[0]): Promise<AuditCheckpoint> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const chainPartition = input.tenantId;
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [chainPartition]);

      const lastCheckpoint = await client.query<{ end_sequence: string }>(
        `
          select end_sequence
          from audit_checkpoints
          where tenant_id = $1 and chain_partition = $2::uuid
          order by end_sequence desc
          limit 1
        `,
        [input.tenantId, chainPartition]
      );
      const startSequence = lastCheckpoint.rows[0]?.end_sequence
        ? BigInt(lastCheckpoint.rows[0].end_sequence) + 1n
        : 1n;

      const latestEvent = await client.query<{ sequence: string }>(
        `
          select sequence
          from audit_events
          where tenant_id = $1 and chain_partition = $2::uuid
          order by sequence desc
          limit 1
        `,
        [input.tenantId, chainPartition]
      );
      const endSequence = latestEvent.rows[0]?.sequence ? BigInt(latestEvent.rows[0].sequence) : 0n;

      if (startSequence > endSequence) {
        throw new ConflictException("No new audit events to checkpoint since the last checkpoint.");
      }

      const rangeResult = await client.query(
        `
          select event_hash
          from audit_events
          where tenant_id = $1 and chain_partition = $2::uuid and sequence >= $3 and sequence <= $4
          order by sequence asc
        `,
        [input.tenantId, chainPartition, startSequence.toString(), endSequence.toString()]
      );
      const rootHash = computeCheckpointRootHash(rangeResult.rows.map((row) => String(row.event_hash)));
      const signedAt = new Date();
      const signature = computeCheckpointSignature({ chainPartition, startSequence, endSequence, rootHash, signedAt });

      const inserted = await client.query<{ id: string }>(
        `
          insert into audit_checkpoints (
            tenant_id, chain_partition, start_sequence, end_sequence, root_hash, signature, signed_at, created_by
          )
          values ($1, $2::uuid, $3, $4, $5, $6, $7, $8)
          returning id
        `,
        [
          input.tenantId,
          chainPartition,
          startSequence.toString(),
          endSequence.toString(),
          rootHash,
          signature,
          signedAt,
          input.actorId
        ]
      );

      return {
        id: inserted.rows[0].id,
        tenantId: input.tenantId,
        chainPartition,
        startSequence,
        endSequence,
        rootHash,
        signature,
        signedAt
      };
    });
  }

  async findCheckpoint(tenantId: string, checkpointId: string): Promise<AuditCheckpoint | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${auditCheckpointColumns()}
          from audit_checkpoints
          where tenant_id = $1 and id = $2
        `,
        [tenantId, checkpointId]
      );
      const row = result.rows[0];
      return row ? mapAuditCheckpoint(row) : null;
    });
  }

  async listCheckpoints(input: Parameters<AuditRepository["listCheckpoints"]>[0]): Promise<AuditCheckpoint[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${auditCheckpointColumns()}
          from audit_checkpoints
          where tenant_id = $1
          order by end_sequence desc
          limit $2 offset $3
        `,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapAuditCheckpoint);
    });
  }

  async createVerification(input: Parameters<AuditRepository["createVerification"]>[0]): Promise<AuditVerification> {
    return this.db.withTenant(input.verification.tenantId, input.actorId, async (client) => {
      const result = await client.query<{ id: string }>(
        `
          insert into audit_verifications (
            tenant_id, checkpoint_id, verified_at, result, mismatch_sequence, verifier_version, created_by
          )
          values ($1, $2, $3, $4, $5, $6, $7)
          returning id
        `,
        [
          input.verification.tenantId,
          input.verification.checkpointId,
          input.verification.verifiedAt,
          input.verification.result,
          input.verification.mismatchSequence?.toString() ?? null,
          input.verification.verifierVersion,
          input.actorId
        ]
      );

      return { ...input.verification, id: result.rows[0].id };
    });
  }

  async listVerifications(input: Parameters<AuditRepository["listVerifications"]>[0]): Promise<AuditVerification[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const values: unknown[] = [input.tenantId, input.pagination.limit, input.pagination.offset];
      const predicates = ["tenant_id = $1"];
      if (input.checkpointId) {
        values.push(input.checkpointId);
        predicates.push(`checkpoint_id = $${values.length}`);
      }

      const result = await client.query(
        `
          select ${auditVerificationColumns()}
          from audit_verifications
          where ${predicates.join(" and ")}
          order by verified_at desc
          limit $2 offset $3
        `,
        values
      );
      return result.rows.map(mapAuditVerification);
    });
  }
}

function addPredicate(predicates: string[], values: unknown[], column: string, value: unknown): void {
  if (value === undefined) {
    return;
  }
  values.push(value);
  predicates.push(`${column} = $${values.length}`);
}

function addRangePredicate(
  predicates: string[],
  values: unknown[],
  column: string,
  operator: ">=" | "<=",
  value: Date | undefined
): void {
  if (!value) {
    return;
  }
  values.push(value);
  predicates.push(`${column} ${operator} $${values.length}`);
}

function auditEventColumns(): string {
  return `
    id, tenant_id, sequence, chain_partition, version, event_type, actor_id, target_type, target_id,
    trace_id, classification, body, previous_hash, event_hash, occurred_at
  `;
}

function mapAuditEvent(row: Record<string, unknown>): AuditEvent {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    sequence: BigInt(String(row.sequence)),
    chainPartition: String(row.chain_partition),
    hashVersion: Number(row.version ?? AUDIT_HASH_VERSION_CURRENT),
    eventType: String(row.event_type),
    actorId: String(row.actor_id),
    targetType: String(row.target_type),
    targetId: String(row.target_id),
    traceId: String(row.trace_id),
    classification: row.classification as AuditEvent["classification"],
    body: row.body as Record<string, unknown>,
    previousHash: String(row.previous_hash),
    eventHash: String(row.event_hash),
    occurredAt: row.occurred_at as Date
  };
}

function auditCheckpointColumns(): string {
  return `id, tenant_id, chain_partition, start_sequence, end_sequence, root_hash, signature, signed_at`;
}

function mapAuditCheckpoint(row: Record<string, unknown>): AuditCheckpoint {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    chainPartition: String(row.chain_partition),
    startSequence: BigInt(String(row.start_sequence)),
    endSequence: BigInt(String(row.end_sequence)),
    rootHash: String(row.root_hash),
    signature: String(row.signature),
    signedAt: row.signed_at as Date
  };
}

function auditVerificationColumns(): string {
  return `id, tenant_id, checkpoint_id, verified_at, result, mismatch_sequence, verifier_version`;
}

function mapAuditVerification(row: Record<string, unknown>): AuditVerification {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    checkpointId: String(row.checkpoint_id),
    verifiedAt: row.verified_at as Date,
    result: row.result as AuditVerification["result"],
    mismatchSequence: row.mismatch_sequence !== null ? BigInt(String(row.mismatch_sequence)) : undefined,
    verifierVersion: String(row.verifier_version)
  };
}
