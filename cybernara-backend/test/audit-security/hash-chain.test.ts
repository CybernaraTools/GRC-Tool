import { describe, expect, it } from "vitest";
import {
  AUDIT_GENESIS_HASH,
  createAuditEvent,
  verifyAuditEvent
} from "../../src/modules/audit-security/domain/hash-chain.js";

const baseInput = {
  tenantId: "00000000-0000-4000-8000-000000000001",
  eventType: "identity.tenant.created",
  actorId: "00000000-0000-4000-8000-000000000002",
  targetType: "tenant",
  targetId: "00000000-0000-4000-8000-000000000001",
  traceId: "trace-1",
  classification: "confidential" as const,
  body: { name: "Acme Corp" },
  occurredAt: new Date("2026-07-02T00:00:00.000Z")
};

describe("audit hash chain", () => {
  it("creates verifiable append-only events", () => {
    const event = createAuditEvent(baseInput, AUDIT_GENESIS_HASH, 1n, baseInput.tenantId);
    expect(event.previousHash).toBe(AUDIT_GENESIS_HASH);
    expect(event.eventHash).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyAuditEvent(event)).toBe(true);
  });

  it("detects body tampering", () => {
    const event = createAuditEvent(baseInput, AUDIT_GENESIS_HASH, 1n, baseInput.tenantId);
    const tampered = { ...event, body: { name: "Other Corp" } };
    expect(verifyAuditEvent(tampered)).toBe(false);
  });

  it("detects sequence tampering (G-11: event_hash now covers sequence + chain_partition)", () => {
    const event = createAuditEvent(baseInput, AUDIT_GENESIS_HASH, 1n, baseInput.tenantId);
    const tampered = { ...event, sequence: 2n };
    expect(verifyAuditEvent(tampered)).toBe(false);
  });

  it("detects chain_partition tampering", () => {
    const event = createAuditEvent(baseInput, AUDIT_GENESIS_HASH, 1n, baseInput.tenantId);
    const tampered = { ...event, chainPartition: "00000000-0000-4000-8000-000000000099" };
    expect(verifyAuditEvent(tampered)).toBe(false);
  });
});

