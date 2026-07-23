import { randomUUID } from "node:crypto";

export type OutboxStatus = "pending" | "processing" | "processed" | "dead_letter";

export interface OutboxEvent {
  id: string;
  tenantId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  schemaVersion: number;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  status: OutboxStatus;
  attempts: number;
  availableAt: Date;
  createdBy: string;
  createdAt: Date;
}

export function createOutboxEvent(input: {
  tenantId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  createdBy: string;
  now?: Date;
  schemaVersion?: number;
}): OutboxEvent {
  const now = input.now ?? new Date();

  if (!input.idempotencyKey.trim()) {
    throw new Error("Outbox idempotency key is required.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    eventType: input.eventType,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    schemaVersion: input.schemaVersion ?? 1,
    payload: input.payload,
    idempotencyKey: input.idempotencyKey,
    status: "pending",
    attempts: 0,
    availableAt: now,
    createdBy: input.createdBy,
    createdAt: now
  };
}

