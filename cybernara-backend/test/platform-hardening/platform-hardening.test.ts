import { describe, expect, it } from "vitest";
import {
  assertOptimisticConcurrency,
  assertUploadAccessible,
  classificationForResourceType,
  createEncryptionKeyRecord,
  createRateLimitPolicy,
  createSdlcReleaseGate,
  createSiemExportRecord,
  createSignedExportManifest,
  createUploadSession,
  evaluatePolicyDecision,
  evaluateRateLimit,
  idempotencyKeyFor,
  markUploadClean,
  recordBackupRestoreTest,
  recordProductAssuranceEvidence
} from "../../src/modules/platform-hardening/domain/hardening.js";

const tenantId = "00000000-0000-4000-8000-000000000001";

describe("Platform hardening", () => {
  it("denies by default and allows only matching tenant, scope, resource, state, and classification", () => {
    const resource = {
      tenantId,
      resourceType: "assessment",
      resourceId: "assessment-1",
      classification: "confidential" as const,
      state: "submitted"
    };

    expect(
      evaluatePolicyDecision({
        subject: {
          tenantId: "00000000-0000-4000-8000-000000000099",
          userId: "user-1",
          roles: ["viewer"],
          scopes: ["assessment:read"],
          clearance: "restricted"
        },
        resource,
        action: "read",
        traceId: "trace-tenant"
      }).decision
    ).toBe("deny");

    expect(
      evaluatePolicyDecision({
        subject: {
          tenantId,
          userId: "user-1",
          roles: ["reviewer"],
          scopes: ["assessment:read"],
          clearance: "confidential"
        },
        resource,
        action: "read",
        traceId: "trace-allow"
      })
    ).toMatchObject({ decision: "allow", traceId: "trace-allow" });
  });

  it("enforces idempotency, optimistic concurrency, rate limits, and signed export manifests", () => {
    const firstKey = idempotencyKeyFor({ tenantId, operation: "close-assessment", payload: { assessmentId: "a1" } });
    const secondKey = idempotencyKeyFor({ tenantId, operation: "close-assessment", payload: { assessmentId: "a1" } });
    const policy = createRateLimitPolicy({ key: "api:tenant", limit: 100, windowSeconds: 60, timeoutMs: 1000 });
    const firstManifest = createSignedExportManifest({
      snapshotId: "snapshot-1",
      templateVersion: "template-1",
      artifactHashes: ["a".repeat(64), "b".repeat(64)],
      signingKeyRef: "secret://tenant/signing/export"
    });
    const secondManifest = createSignedExportManifest({
      snapshotId: "snapshot-1",
      templateVersion: "template-1",
      artifactHashes: ["b".repeat(64), "a".repeat(64)],
      signingKeyRef: "secret://tenant/signing/export"
    });

    expect(firstKey).toBe(secondKey);
    expect(() => assertOptimisticConcurrency(3, 2)).toThrow(/concurrency/);
    expect(evaluateRateLimit(policy, 100)).toEqual({ allowed: false, retryAfterSeconds: 60 });
    expect(firstManifest.manifestHash).toBe(secondManifest.manifestHash);
    expect(firstManifest.signature).toBe(secondManifest.signature);
  });

  it("records encryption, backup, SIEM, assurance, and secure SDLC release gates", () => {
    const key = createEncryptionKeyRecord({
      tenantId,
      kmsKeyRef: "secret://tenant/kms/customer-key",
      rotationDueAt: new Date("2026-10-01T00:00:00.000Z"),
      auditEventIds: ["audit-key-use"]
    });
    const siem = createSiemExportRecord({
      tenantId,
      actorId: "admin",
      target: "policy:acceptable-use",
      before: { status: "draft" },
      after: { status: "published" },
      traceId: "trace-siem",
      delivered: true
    });
    const restore = recordBackupRestoreTest({
      tenantId,
      rpoMinutes: 12,
      rtoHours: 3,
      backupCredentialRef: "secret://tenant/backups/restore",
      restoredAt: new Date("2026-07-02T00:00:00.000Z")
    });
    const assurance = recordProductAssuranceEvidence({
      tenantId,
      framework: "OWASP_ASVS",
      controlRef: "ASVS-1.2.1",
      evidenceId: "evidence-threat-model"
    });
    const release = createSdlcReleaseGate({
      tenantId,
      sbomHash: "c".repeat(64),
      signedBuildRef: "cosign://cybernara/api@sha256:abc",
      scanFindings: [{ tool: "sast", severity: "high", resolved: true }],
      penetrationTestEvidenceId: "evidence-pentest"
    });

    expect(key.algorithm).toBe("AES-256-GCM");
    expect(siem.beforeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(restore.passed).toBe(true);
    expect(assurance.framework).toBe("OWASP_ASVS");
    expect(release.releasable).toBe(true);
  });

  it("resolves each guarded resource type to its schema-defined baseline classification, not a single hardcoded tier", () => {
    // Genuinely restricted-tier resources (matches their table's `classification` default in supabase/migrations).
    expect(classificationForResourceType("framework-content")).toBe("restricted");
    expect(classificationForResourceType("harmonization")).toBe("restricted");
    expect(classificationForResourceType("evidence_object")).toBe("restricted");

    // Confidential-tier resources: PolicyGuard previously hardcoded these to "restricted" too,
    // wrongly denying any correctly-scoped subject whose clearance was below "restricted".
    expect(classificationForResourceType("assessment")).toBe("confidential");
    expect(classificationForResourceType("audit_event")).toBe("confidential");
    expect(classificationForResourceType("finding")).toBe("confidential");
    expect(classificationForResourceType("connector")).toBe("confidential");
    expect(classificationForResourceType("policy_version")).toBe("confidential");
    expect(classificationForResourceType("data_inventory_record")).toBe("confidential");

    // Unknown/future resource types fail closed at the highest tier rather than defaulting open.
    expect(classificationForResourceType("some_future_resource_type")).toBe("restricted");
  });

  it("keeps direct uploads quarantined until clean validation", () => {
    const upload = createUploadSession({ tenantId, fileName: "evidence.pdf", classification: "restricted" });

    expect(() => assertUploadAccessible(upload)).toThrow(/before clean validation/);
    const clean = markUploadClean(upload, Buffer.from("validated evidence"));

    expect(clean.status).toBe("clean");
    expect(clean.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(() => assertUploadAccessible(clean)).not.toThrow();
  });
});
