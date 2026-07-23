import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AUDIT_REPOSITORY } from "./tokens.js";
import {
  computeAuditHash,
  computeCheckpointRootHash,
  computeCheckpointSignature,
  createAuditEvent,
  createAuditVerification
} from "../domain/hash-chain.js";
import type {
  AuditCheckpoint,
  AuditEvent,
  AuditEventInput,
  AuditVerification
} from "../domain/audit-event.js";
import type { Pagination } from "../../../shared/pagination.js";

export interface AuditEventListFilters {
  eventType?: string;
  targetType?: string;
  targetId?: string;
  actorId?: string;
  classification?: AuditEvent["classification"];
  occurredAtFrom?: Date;
  occurredAtTo?: Date;
}

// G-11: `append` no longer does a bare read-then-insert. `appendWithLock` takes
// `pg_advisory_xact_lock(hashtext(chainPartition))` and reads the latest hash/sequence for that
// partition INSIDE the same transaction as the insert, so concurrent appends for the same tenant can
// no longer race and fork the chain (the real TOCTOU gap this session found in the pre-G-11
// `getLatestHash()` + `append()` two-transaction pattern). `createCheckpoint` follows the same
// discipline: it determines the next range and persists the checkpoint under one lock-held
// transaction, so a concurrent append or a concurrent checkpoint creation cannot land in the gap
// between "read latest sequence" and "persist checkpoint".
export interface AuditRepository {
  appendWithLock(input: {
    tenantId: string;
    actorId: string;
    buildEvent: (context: { previousHash: string; nextSequence: bigint; chainPartition: string }) => AuditEvent;
  }): Promise<AuditEvent>;
  findById(tenantId: string, eventId: string): Promise<AuditEvent | null>;
  list(input: { tenantId: string; filters: AuditEventListFilters; pagination: Pagination }): Promise<AuditEvent[]>;
  listInRange(input: {
    tenantId: string;
    chainPartition: string;
    startSequence: bigint;
    endSequence: bigint;
  }): Promise<AuditEvent[]>;
  createCheckpoint(input: { tenantId: string; actorId: string }): Promise<AuditCheckpoint>;
  findCheckpoint(tenantId: string, checkpointId: string): Promise<AuditCheckpoint | null>;
  listCheckpoints(input: { tenantId: string; pagination: Pagination }): Promise<AuditCheckpoint[]>;
  createVerification(input: { verification: AuditVerification; actorId: string }): Promise<AuditVerification>;
  listVerifications(input: {
    tenantId: string;
    checkpointId?: string;
    pagination: Pagination;
  }): Promise<AuditVerification[]>;
}

export const AUDIT_VERIFIER_VERSION = "g11-verifier-v1";

@Injectable()
export class AuditLogService {
  constructor(@Inject(AUDIT_REPOSITORY) private readonly repository: AuditRepository) {}

  async append(input: AuditEventInput): Promise<AuditEvent> {
    return this.repository.appendWithLock({
      tenantId: input.tenantId,
      actorId: input.actorId,
      buildEvent: ({ previousHash, nextSequence, chainPartition }) =>
        createAuditEvent(input, previousHash, nextSequence, chainPartition)
    });
  }

  async findById(tenantId: string, eventId: string): Promise<AuditEvent | null> {
    return this.repository.findById(tenantId, eventId);
  }

  async list(input: {
    tenantId: string;
    filters: AuditEventListFilters;
    pagination: Pagination;
  }): Promise<AuditEvent[]> {
    return this.repository.list(input);
  }

  // Spec §21: "Periodically sign checkpoint root hashes... Business transactions write audit intent
  // and outbox atomically; only the dedicated audit writer appends the final chain." The repository
  // owns the full lock-held read-range/compute/persist sequence (root hash and signature are pure
  // functions of the fetched event range, computed inside that same locked transaction), so this is
  // a thin delegate, not because the operation is trivial but because its atomicity requirement means
  // it cannot be split across a repository call and a separate service-side computation step.
  async createCheckpoint(input: { tenantId: string; actorId: string }): Promise<AuditCheckpoint> {
    return this.repository.createCheckpoint(input);
  }

  // Spec §21: "Verifier independently recomputes chain and signature and writes
  // audit_verifications. Verification failure raises a critical security alert." This recomputes,
  // from the persisted events themselves (not from any cached value), every event's own hash, the
  // previous_hash linkage between consecutive events, and the checkpoint's root_hash/signature — and
  // persists the outcome as an immutable `audit_verifications` row. Raising the "critical security
  // alert" itself is a SIEM/alerting-pipeline concern outside a schema-remediation pass; the
  // persisted `result: 'fail'` row is the durable, queryable fact an alerting system would key off.
  async verifyCheckpoint(input: { tenantId: string; checkpointId: string; actorId: string }): Promise<AuditVerification> {
    const checkpoint = await this.repository.findCheckpoint(input.tenantId, input.checkpointId);
    if (!checkpoint) {
      throw new NotFoundException("Audit checkpoint not found.");
    }

    const events = await this.repository.listInRange({
      tenantId: input.tenantId,
      chainPartition: checkpoint.chainPartition,
      startSequence: checkpoint.startSequence,
      endSequence: checkpoint.endSequence
    });

    let mismatchSequence: bigint | undefined;

    for (let index = 0; index < events.length && mismatchSequence === undefined; index += 1) {
      const event = events[index];
      const recomputed = computeAuditHash({
        tenantId: event.tenantId,
        eventType: event.eventType,
        actorId: event.actorId,
        targetType: event.targetType,
        targetId: event.targetId,
        traceId: event.traceId,
        classification: event.classification,
        body: event.body,
        occurredAt: event.occurredAt,
        previousHash: event.previousHash,
        sequence: event.sequence,
        chainPartition: event.chainPartition,
        hashVersion: event.hashVersion
      });
      if (recomputed !== event.eventHash) {
        mismatchSequence = event.sequence;
        continue;
      }
      if (index > 0 && event.previousHash !== events[index - 1].eventHash) {
        mismatchSequence = event.sequence;
      }
    }

    if (mismatchSequence === undefined) {
      const rootHash = computeCheckpointRootHash(events.map((event) => event.eventHash));
      if (rootHash !== checkpoint.rootHash) {
        mismatchSequence = checkpoint.startSequence;
      } else {
        const signature = computeCheckpointSignature({
          chainPartition: checkpoint.chainPartition,
          startSequence: checkpoint.startSequence,
          endSequence: checkpoint.endSequence,
          rootHash: checkpoint.rootHash,
          signedAt: checkpoint.signedAt
        });
        if (signature !== checkpoint.signature) {
          mismatchSequence = checkpoint.startSequence;
        }
      }
    }

    const verification = createAuditVerification({
      tenantId: input.tenantId,
      checkpointId: checkpoint.id,
      result: mismatchSequence === undefined ? "pass" : "fail",
      mismatchSequence,
      verifierVersion: AUDIT_VERIFIER_VERSION
    });

    return this.repository.createVerification({ verification, actorId: input.actorId });
  }

  async findCheckpoint(tenantId: string, checkpointId: string): Promise<AuditCheckpoint | null> {
    return this.repository.findCheckpoint(tenantId, checkpointId);
  }

  async listCheckpoints(input: { tenantId: string; pagination: Pagination }): Promise<AuditCheckpoint[]> {
    return this.repository.listCheckpoints(input);
  }

  async listVerifications(input: {
    tenantId: string;
    checkpointId?: string;
    pagination: Pagination;
  }): Promise<AuditVerification[]> {
    return this.repository.listVerifications(input);
  }
}
