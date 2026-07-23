import { createHash, randomUUID } from "node:crypto";
import type {
  AuditCheckpoint,
  AuditCheckpointInput,
  AuditEvent,
  AuditEventInput,
  AuditVerification,
  AuditVerificationInput
} from "./audit-event.js";

export const AUDIT_GENESIS_HASH = "0".repeat(64);

// G-11: event_hash now covers `sequence` and `chainPartition` (spec §21: "event_hash covers
// canonical event bytes, previous_hash, sequence and partition"), which the pre-G-11 hash did not.
// `hashVersion` (persisted in audit_events.version, the pre-existing cross-cutting-contract column,
// repurposed for this table — see 0024_g11_audit_hash_chain_hardening.sql's header) distinguishes
// rows hashed under the old scheme (1) from rows hashed under this one (2), so verification never
// silently misjudges a legitimately-old row as tampered.
export const AUDIT_HASH_VERSION_LEGACY = 1;
export const AUDIT_HASH_VERSION_CURRENT = 2;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${canonicalJson(nested)}`);
    return `{${entries.join(",")}}`;
  }

  return JSON.stringify(value);
}

export function computeAuditHash(input: {
  tenantId: string;
  eventType: string;
  actorId: string;
  targetType: string;
  targetId: string;
  traceId: string;
  classification: string;
  body: Record<string, unknown>;
  occurredAt: Date;
  previousHash: string;
  sequence?: bigint;
  chainPartition?: string;
  hashVersion?: number;
}): string {
  const hashVersion = input.hashVersion ?? AUDIT_HASH_VERSION_CURRENT;
  const basePayload: Record<string, unknown> = {
    actorId: input.actorId,
    body: input.body,
    classification: input.classification,
    eventType: input.eventType,
    occurredAt: input.occurredAt.toISOString(),
    targetId: input.targetId,
    targetType: input.targetType,
    tenantId: input.tenantId,
    traceId: input.traceId,
    previousHash: input.previousHash
  };

  // Legacy (pre-G-11) rows were hashed without sequence/chain_partition — recomputing their hash
  // must reproduce that exact shape, or every historical row would appear tampered.
  if (hashVersion === AUDIT_HASH_VERSION_LEGACY) {
    return createHash("sha256").update(canonicalJson(basePayload)).digest("hex");
  }

  const payload = canonicalJson({
    ...basePayload,
    sequence: input.sequence?.toString() ?? null,
    chainPartition: input.chainPartition ?? null
  });

  return createHash("sha256").update(payload).digest("hex");
}

export function createAuditEvent(
  input: AuditEventInput,
  previousHash: string,
  sequence: bigint,
  chainPartition: string
): AuditEvent {
  const occurredAt = input.occurredAt ?? new Date();
  const hashVersion = AUDIT_HASH_VERSION_CURRENT;
  return {
    ...input,
    id: randomUUID(),
    sequence,
    chainPartition,
    hashVersion,
    occurredAt,
    previousHash,
    eventHash: computeAuditHash({ ...input, occurredAt, previousHash, sequence, chainPartition, hashVersion })
  };
}

export function verifyAuditEvent(event: AuditEvent): boolean {
  return (
    computeAuditHash({
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
    }) === event.eventHash
  );
}

// G-11: checkpoint root hash = SHA-256 over the ordered event_hash values in [startSequence,
// endSequence] for a chain_partition. A verifier that recomputes this independently and compares to
// the persisted `root_hash` detects any deletion, reordering, or mutation within the range.
export function computeCheckpointRootHash(orderedEventHashes: string[]): string {
  return createHash("sha256").update(orderedEventHashes.join(":")).digest("hex");
}

// No real KMS/HSM integration exists anywhere in this codebase (confirmed by inspection before
// writing this gap's migration) — matching the exact, already-documented precedent for
// `report_exports.signature` in reporting-analytics.service.ts: a local SHA-256-based placeholder
// proving the checkpoint wasn't tampered with after being signed, not a real asymmetric signature.
// Named honestly, not presented as more than it is.
export function computeCheckpointSignature(input: {
  chainPartition: string;
  startSequence: bigint;
  endSequence: bigint;
  rootHash: string;
  signedAt: Date;
}): string {
  return createHash("sha256")
    .update(
      `${input.chainPartition}:${input.startSequence}:${input.endSequence}:${input.rootHash}:${input.signedAt.toISOString()}`
    )
    .digest("hex");
}

export function createAuditCheckpoint(input: AuditCheckpointInput): AuditCheckpoint {
  const signedAt = input.signedAt ?? new Date();
  return {
    ...input,
    id: randomUUID(),
    signedAt
  };
}

export function createAuditVerification(input: AuditVerificationInput): AuditVerification {
  return {
    ...input,
    id: randomUUID(),
    verifiedAt: input.verifiedAt ?? new Date()
  };
}

