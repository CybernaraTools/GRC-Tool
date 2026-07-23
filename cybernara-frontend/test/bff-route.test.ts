import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../app/api/backend/[...path]/route";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

vi.mock("../src/lib/session", () => ({
  readSessionContext: vi.fn(async () => null),
  sessionBackendHeaders: vi.fn(() => ({}))
}));

describe("backend BFF route", () => {
  it("rejects requests without server-side session context", async () => {
    const request = new NextRequest("http://localhost/api/backend/v1/audit/events", {
      headers: {
        "x-tenant-id": "00000000-0000-4000-8000-000000000001",
        "x-user-scopes": "audit_event:read"
      }
    });

    const response = await GET(request, { params: Promise.resolve({ path: ["v1", "audit", "events"] }) });
    expect(response.status).toBe(401);
    expect(response.headers.get("x-correlation-id")).toMatch(uuidPattern);
    await expect(response.json()).resolves.toMatchObject({
      status: 401,
      detail: "A valid Cybernara session is required."
    });
  });

  it("stamps a generated correlation ID on the unauthenticated 401 problem-details body when the caller sent none", async () => {
    const request = new NextRequest("http://localhost/api/backend/v1/audit/events");

    const response = await GET(request, { params: Promise.resolve({ path: ["v1", "audit", "events"] }) });
    const body = await response.json();
    expect(body.correlationId).not.toBe("missing-correlation-id");
    expect(body.correlationId).toMatch(uuidPattern);
  });

  it("reuses a caller-supplied x-correlation-id on the 401 problem-details body instead of generating a new one", async () => {
    const request = new NextRequest("http://localhost/api/backend/v1/audit/events", {
      headers: { "x-correlation-id": "caller-supplied-trace-id" }
    });

    const response = await GET(request, { params: Promise.resolve({ path: ["v1", "audit", "events"] }) });
    expect(response.headers.get("x-correlation-id")).toBe("caller-supplied-trace-id");
    const body = await response.json();
    expect(body.correlationId).toBe("caller-supplied-trace-id");
  });
});

describe("backend BFF route — authenticated proxy forwarding", () => {
  afterEach(() => {
    vi.doUnmock("../src/lib/session");
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("always forwards a real x-correlation-id header to the backend, generating one when the browser sent none", async () => {
    vi.resetModules();
    vi.doMock("../src/lib/session", () => ({
      accessTokenCookieName: "sb-access-token",
      readSessionContext: vi.fn(async () => ({
        tenantId: "00000000-0000-4000-8000-000000000001",
        userId: "00000000-0000-4000-8000-000000000002",
        roles: ["platform_admin"],
        scopes: ["audit_event:read"],
        clearance: "restricted"
      })),
      sessionBackendHeaders: vi.fn(() => ({
        "x-tenant-id": "00000000-0000-4000-8000-000000000001",
        "x-user-id": "00000000-0000-4000-8000-000000000002",
        "x-user-roles": "platform_admin",
        "x-user-scopes": "audit_event:read",
        "x-user-clearance": "restricted"
      }))
    }));

    let capturedHeaders: Headers | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: unknown, init?: RequestInit) => {
        capturedHeaders = new Headers(init?.headers);
        return new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } });
      })
    );

    const { GET: authenticatedGet } = await import("../app/api/backend/[...path]/route");
    const request = new NextRequest("http://localhost/api/backend/v1/audit/events");
    const response = await authenticatedGet(request, { params: Promise.resolve({ path: ["v1", "audit", "events"] }) });
 
    expect(capturedHeaders?.get("x-correlation-id")).toBeTruthy();
    expect(capturedHeaders?.get("x-correlation-id")).toMatch(uuidPattern);
    expect(response.headers.get("x-correlation-id")).toMatch(uuidPattern);
  });

  it("forwards the browser's own x-correlation-id to the backend unchanged when one was supplied", async () => {
    vi.resetModules();
    vi.doMock("../src/lib/session", () => ({
      accessTokenCookieName: "sb-access-token",
      readSessionContext: vi.fn(async () => ({
        tenantId: "00000000-0000-4000-8000-000000000001",
        userId: "00000000-0000-4000-8000-000000000002",
        roles: ["platform_admin"],
        scopes: ["audit_event:read"],
        clearance: "restricted"
      })),
      sessionBackendHeaders: vi.fn(() => ({
        "x-tenant-id": "00000000-0000-4000-8000-000000000001",
        "x-user-id": "00000000-0000-4000-8000-000000000002",
        "x-user-roles": "platform_admin",
        "x-user-scopes": "audit_event:read",
        "x-user-clearance": "restricted"
      }))
    }));

    let capturedHeaders: Headers | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: unknown, init?: RequestInit) => {
        capturedHeaders = new Headers(init?.headers);
        return new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } });
      })
    );

    const { GET: authenticatedGet } = await import("../app/api/backend/[...path]/route");
    const request = new NextRequest("http://localhost/api/backend/v1/audit/events", {
      headers: { "x-correlation-id": "browser-trace-42" }
    });
    const response = await authenticatedGet(request, { params: Promise.resolve({ path: ["v1", "audit", "events"] }) });
 
    expect(capturedHeaders?.get("x-correlation-id")).toBe("browser-trace-42");
    expect(response.headers.get("x-correlation-id")).toBe("browser-trace-42");
  });
});
