import { afterEach, describe, expect, it, vi } from "vitest";
import { createServerApiClient } from "../src/lib/api/server";
import type { SessionContext } from "../src/lib/session";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const session: SessionContext = {
  kind: "tenant",
  tenantId: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-000000000002",
  roles: ["platform_admin"],
  scopes: ["audit_event:read"],
  clearance: "restricted"
};

describe("createServerApiClient correlation ID propagation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets a real x-correlation-id header on every outgoing request", async () => {
    const capturedHeaders: Headers[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: unknown, init?: RequestInit) => {
        capturedHeaders.push(new Headers(init?.headers));
        return new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } });
      })
    );

    const api = createServerApiClient(session);
    await api.listAuditEvents({ limit: 10, offset: 0 });

    expect(capturedHeaders).toHaveLength(1);
    const correlationId = capturedHeaders[0].get("x-correlation-id");
    expect(correlationId).toBeTruthy();
    expect(correlationId).toMatch(uuidPattern);
  });

  it("reuses the same correlation ID across multiple calls made through one client instance", async () => {
    const capturedHeaders: Headers[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: unknown, init?: RequestInit) => {
        capturedHeaders.push(new Headers(init?.headers));
        return new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } });
      })
    );

    const api = createServerApiClient(session);
    await api.listAuditEvents({ limit: 10, offset: 0 });
    await api.listAuditEvents({ limit: 10, offset: 10 });

    expect(capturedHeaders).toHaveLength(2);
    const [first, second] = capturedHeaders;
    expect(first.get("x-correlation-id")).toBe(second.get("x-correlation-id"));
  });

  it("assigns a different correlation ID to a separate client instance (a separate page render)", async () => {
    const capturedHeaders: Headers[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: unknown, init?: RequestInit) => {
        capturedHeaders.push(new Headers(init?.headers));
        return new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } });
      })
    );

    await createServerApiClient(session).listAuditEvents({ limit: 10, offset: 0 });
    await createServerApiClient(session).listAuditEvents({ limit: 10, offset: 0 });

    expect(capturedHeaders).toHaveLength(2);
    const [first, second] = capturedHeaders;
    expect(first.get("x-correlation-id")).not.toBe(second.get("x-correlation-id"));
  });
});
