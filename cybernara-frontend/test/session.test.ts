import { describe, expect, it } from "vitest";
import { sessionBackendHeaders } from "../src/lib/session";

describe("session backend headers", () => {
  it("serializes roles and scopes with commas for the backend request-context parser", () => {
    expect(
      sessionBackendHeaders({
        kind: "tenant",
        tenantId: "00000000-0000-4000-8000-000000000001",
        userId: "00000000-0000-4000-8000-000000000002",
        email: "admin@example.com",
        roles: ["platform_admin", "auditor"],
        scopes: ["audit_event:read", "framework-content:read", "harmonization:read"],
        clearance: "restricted"
      })
    ).toMatchObject({
      "x-user-roles": "platform_admin,auditor",
      "x-user-scopes": "audit_event:read,framework-content:read,harmonization:read"
    });
  });

  it("serializes platform operators without tenant headers", () => {
    expect(
      sessionBackendHeaders({
        kind: "platform",
        userId: "00000000-0000-4000-8000-000000000003",
        email: "operator@example.com",
        platformRole: "super_admin"
      })
    ).toEqual({
      "x-user-id": "00000000-0000-4000-8000-000000000003",
      "x-platform-role": "super_admin",
      "x-user-email": "operator@example.com"
    });
  });
});
