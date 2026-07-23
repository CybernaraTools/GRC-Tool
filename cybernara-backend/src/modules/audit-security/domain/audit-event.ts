export interface AuditEventInput {
  tenantId: string;
  eventType: string;
  actorId: string;
  targetType: string;
  targetId: string;
  traceId: string;
  classification: "internal" | "confidential" | "restricted";
  body: Record<string, unknown>;
  occurredAt?: Date;
}

export interface AuditEvent extends AuditEventInput {
  id: string;
  sequence: bigint;
  chainPartition: string;
  hashVersion: number;
  previousHash: string;
  eventHash: string;
  occurredAt: Date;
}

export type AuditCheckpointResult = "pass" | "fail";

export interface AuditCheckpointInput {
  tenantId: string;
  chainPartition: string;
  startSequence: bigint;
  endSequence: bigint;
  rootHash: string;
  signature: string;
  signedAt?: Date;
}

export interface AuditCheckpoint extends AuditCheckpointInput {
  id: string;
  signedAt: Date;
}

export interface AuditVerificationInput {
  tenantId: string;
  checkpointId: string;
  result: AuditCheckpointResult;
  mismatchSequence?: bigint;
  verifierVersion: string;
  verifiedAt?: Date;
}

export interface AuditVerification extends AuditVerificationInput {
  id: string;
  verifiedAt: Date;
}

