import { describe, expect, it } from "vitest";
import {
  createWebhookContract,
  detectConnectorDegradation,
  detectControlTestFailure,
  reconcileConnectorObject,
  recordAutomatedControlTest,
  recordSyncRun,
  recordWebhookDelivery,
  registerConnector
} from "../../src/modules/integration-platform/domain/integration.js";

const tenantId = "00000000-0000-4000-8000-000000000001";
const ownerId = "00000000-0000-4000-8000-000000000003";

describe("IntegrationPlatform connector lifecycle", () => {
  it("registers least-privilege connectors, advances sync cursors, and preserves object provenance", () => {
    const connector = registerConnector({
      tenantId,
      key: "okta-prod",
      provider: "Okta",
      kind: "identity",
      secretRef: "secret://tenant/okta-prod",
      scopes: [
        {
          name: "users.read",
          access: "read",
          reason: "Collect identity population for access-review tests."
        },
        {
          name: "groups.read",
          access: "read",
          reason: "Collect entitlement group membership for control tests."
        }
      ]
    });

    const { connector: syncedConnector, syncRun } = recordSyncRun(connector, {
      status: "succeeded",
      cursorAfter: "cursor-2026-07-02T00:00:00Z",
      objectCounts: { read: 125, created: 120, updated: 5, deleted: 0 },
      startedAt: new Date("2026-07-02T00:00:00.000Z"),
      finishedAt: new Date("2026-07-02T00:01:00.000Z")
    });
    const object = reconcileConnectorObject({
      connector: syncedConnector,
      syncRun,
      objectType: "user",
      externalId: "00u-alice",
      sourcePayload: { id: "00u-alice", mfa: true, status: "ACTIVE" },
      deliveryStatus: "delivered",
      sourceTimestamp: new Date("2026-07-02T00:00:30.000Z")
    });

    expect(syncedConnector.syncCursor).toBe("cursor-2026-07-02T00:00:00Z");
    expect(syncRun.cursorBefore).toBeNull();
    expect(object.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(object.provenance.provider).toBe("Okta");
    expect(object.provenance.syncRunId).toBe(syncRun.id);
  });

  it("records automated control tests and triages failures or connector degradation with SLA", () => {
    const connector = {
      ...registerConnector({
        tenantId,
        key: "aws-prod",
        provider: "AWS",
        kind: "cloud",
        secretRef: "secret://tenant/aws-prod",
        scopes: [
          {
            name: "iam:GetAccountPasswordPolicy",
            access: "read",
            reason: "Read IAM policy for password and authentication control tests."
          }
        ]
      }),
      health: "degraded" as const
    };

    const test = recordAutomatedControlTest({
      connector,
      controlRef: "SOC2:CC6.1",
      query: "iam:GetAccountPasswordPolicy",
      population: { accountIds: ["123456789012"] },
      sample: { accountIds: ["123456789012"], method: "full-population" },
      result: {
        status: "fail",
        summary: "Root account MFA is not enforced for the sampled account.",
        evidenceObjectIds: ["00000000-0000-4000-8000-000000000020"]
      },
      sourceTimestamp: new Date("2026-07-02T00:00:00.000Z")
    });
    const testAlert = detectControlTestFailure({
      tenantId,
      test,
      ownerId,
      now: new Date("2026-07-02T00:00:00.000Z")
    });
    const healthAlert = detectConnectorDegradation({
      tenantId,
      connector,
      ownerId,
      now: new Date("2026-07-02T00:00:00.000Z")
    });

    expect(test.query).toBe("iam:GetAccountPasswordPolicy");
    expect(test.population).toEqual({ accountIds: ["123456789012"] });
    expect(test.sample).toEqual({ accountIds: ["123456789012"], method: "full-population" });
    expect(testAlert?.severity).toBe("high");
    expect(testAlert?.slaDueAt.toISOString()).toBe("2026-07-04T00:00:00.000Z");
    expect(healthAlert?.sourceType).toBe("connector_health");
  });

  it("enforces private connector and webhook contract safety", () => {
    expect(() =>
      registerConnector({
        tenantId,
        key: "overbroad",
        provider: "AWS",
        kind: "cloud",
        secretRef: "secret://tenant/aws",
        scopes: [{ name: "*", access: "read", reason: "too broad" }]
      })
    ).toThrow(/wildcard/);

    expect(() =>
      createWebhookContract({
        tenantId,
        key: "ticket-created",
        version: "1",
        direction: "outbound",
        signingSecretRef: "plain-secret",
        rateLimitPerMinute: 0
      })
    ).toThrow(/stored by reference/);

    const webhook = createWebhookContract({
      tenantId,
      key: "ticket-created",
      version: "v1.0.0",
      direction: "outbound",
      signingSecretRef: "secret://tenant/webhooks/ticket-created",
      rateLimitPerMinute: 120
    });
    const delivery = recordWebhookDelivery(webhook, {
      idempotencyKey: "ticket-created:remediation-123",
      payload: { ticketId: "remediation-123", status: "open" },
      deliveryStatus: "delivered",
      attempts: 1,
      observedAt: new Date("2026-07-02T00:00:00.000Z")
    });

    expect(webhook.version).toBe("v1.0.0");
    expect(delivery.payloadHash).toMatch(/^[a-f0-9]{64}$/);
    expect(delivery.idempotencyKey).toBe("ticket-created:remediation-123");
  });
});
