import { describe, expect, it } from "vitest";
import { sessionBackendHeaders, sessionContextFromSupabaseUser } from "../src/lib/session";

describe("session backend headers", () => {
  it("serializes roles and scopes with commas for the backend request-context parser", () => {
    const headers = sessionBackendHeaders({
      kind: "tenant",
      tenantId: "00000000-0000-4000-8000-000000000001",
      userId: "00000000-0000-4000-8000-000000000002",
      email: "admin@example.com",
      roles: ["platform_admin", "auditor"],
      scopes: ["audit_event:read", "framework-content:read", "harmonization:read"],
      clearance: "restricted"
    });

    expect(headers["x-user-roles"]).toBe("platform_admin,auditor");
    expect(headers["x-user-scopes"]).toContain("audit_event:read");
    expect(headers["x-user-scopes"]).toContain("framework-content:read");
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

  it("rejects disabled tenant users and users from suspended tenants", () => {
    const tenantMetadata = {
      tenant_id: "00000000-0000-4000-8000-000000000001",
      roles: ["auditor"],
      scopes: ["assessment:read"],
      clearance: "internal"
    };

    expect(
      sessionContextFromSupabaseUser({
        id: "00000000-0000-4000-8000-000000000004",
        email: "disabled@example.com",
        app_metadata: { ...tenantMetadata, status: "disabled", tenant_status: "active" }
      })
    ).toBeNull();

    expect(
      sessionContextFromSupabaseUser({
        id: "00000000-0000-4000-8000-000000000005",
        email: "suspended@example.com",
        app_metadata: { ...tenantMetadata, status: "active", tenant_status: "suspended" }
      })
    ).toBeNull();
  });
});
