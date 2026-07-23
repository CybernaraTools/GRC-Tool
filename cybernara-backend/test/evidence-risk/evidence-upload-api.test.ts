import "dotenv/config";
import "reflect-metadata";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";

const evidenceScopes = [
  "evidence_object:read",
  "evidence_object:write",
  "evidence_version:read",
  "evidence_link:read",
  "evidence_link:write"
].join(",");

const previousUploadMaxBytes = process.env.EVIDENCE_UPLOAD_MAX_BYTES;

describe("Evidence browser upload API", () => {
  let app: INestApplication;
  let baseUrl: string;
  const tenantId = randomUUID();
  const actorId = randomUUID();

  beforeAll(async () => {
    process.env.EVIDENCE_UPLOAD_MAX_BYTES = "512";
    app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalFilters(new ProblemDetailsFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidUnknownValues: true, transform: true }));
    await app.listen(0);
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;

    const tenant = await fetch(`${baseUrl}/v1/identity/tenants`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: tenantId, name: "Evidence Upload API", createdBy: actorId })
    });
    expect(tenant.status).toBe(201);
  }, 120_000);

  afterAll(async () => {
    if (previousUploadMaxBytes === undefined) {
      delete process.env.EVIDENCE_UPLOAD_MAX_BYTES;
    } else {
      process.env.EVIDENCE_UPLOAD_MAX_BYTES = previousUploadMaxBytes;
    }
    await app.close();
  });

  it("uploads a real byte payload through quarantine, scan, commit, and evidence versioning", async () => {
    const evidence = await initiateEvidence("browser-upload.txt");
    const upload = await fetch(`${baseUrl}/v1/evidence/objects/${evidence.id}/upload`, {
      method: "POST",
      headers: {
        ...requestHeaders(),
        "content-type": "application/json",
        "Idempotency-Key": `upload-${evidence.id}`
      },
      body: JSON.stringify({
        bytesBase64: Buffer.from("quarterly access review evidence").toString("base64"),
        mimeType: "text/plain",
        storageUri: `cybernara://test/${evidence.id}/browser-upload.txt`
      })
    });
    expect(upload.status).toBe(200);
    const uploaded = (await upload.json()) as { id: string; state: string; sha256?: string };
    expect(uploaded.state).toBe("committed");
    expect(uploaded.sha256).toMatch(/^[a-f0-9]{64}$/);

    const versions = await fetch(`${baseUrl}/v1/evidence/objects/${evidence.id}/versions`, {
      headers: requestHeaders()
    });
    expect(versions.status).toBe(200);
    const versionRows = (await versions.json()) as Array<{ mimeType: string; sizeBytes: number }>;
    expect(versionRows[0]?.mimeType).toBe("text/plain");
    expect(versionRows[0]?.sizeBytes).toBe(Buffer.byteLength("quarterly access review evidence"));
  }, 60_000);

  it("rejects oversized uploads with problem-details", async () => {
    const policy = await uploadPolicy();
    const evidence = await initiateEvidence("oversized.txt");
    const upload = await fetch(`${baseUrl}/v1/evidence/objects/${evidence.id}/upload`, {
      method: "POST",
      headers: {
        ...requestHeaders(),
        "content-type": "application/json",
        "Idempotency-Key": `oversized-${evidence.id}`
      },
      body: JSON.stringify({
        bytesBase64: Buffer.alloc(policy.maxBytes + 1, "x").toString("base64"),
        mimeType: "text/plain"
      })
    });
    expect(upload.status).toBe(400);
    const problem = (await upload.json()) as { detail: string };
    expect(problem.detail).toContain("byte limit");
  }, 60_000);

  it("rejects disallowed MIME types with problem-details", async () => {
    const evidence = await initiateEvidence("malware.exe");
    const upload = await fetch(`${baseUrl}/v1/evidence/objects/${evidence.id}/upload`, {
      method: "POST",
      headers: {
        ...requestHeaders(),
        "content-type": "application/json",
        "Idempotency-Key": `mime-${evidence.id}`
      },
      body: JSON.stringify({
        bytesBase64: Buffer.from("not actually executable").toString("base64"),
        mimeType: "application/x-msdownload"
      })
    });
    expect(upload.status).toBe(400);
    const problem = (await upload.json()) as { detail: string };
    expect(problem.detail).toContain("not allowed");
  }, 60_000);

  async function uploadPolicy(): Promise<{ maxBytes: number; allowedMimeTypes: string[] }> {
    const response = await fetch(`${baseUrl}/v1/evidence/objects/upload-policy`, { headers: requestHeaders() });
    expect(response.status).toBe(200);
    return (await response.json()) as { maxBytes: number; allowedMimeTypes: string[] };
  }

  async function initiateEvidence(fileName: string): Promise<{ id: string }> {
    const response = await fetch(`${baseUrl}/v1/evidence/objects`, {
      method: "POST",
      headers: {
        ...requestHeaders(),
        "content-type": "application/json",
        "Idempotency-Key": `initiate-${fileName}-${randomUUID()}`
      },
      body: JSON.stringify({
        ownerId: actorId,
        fileName,
        classification: "restricted",
        periodStart: "2026-01-01",
        periodEnd: "2026-12-31",
        scopeTags: ["soc2", "access"]
      })
    });
    expect(response.status).toBe(201);
    return (await response.json()) as { id: string };
  }

  function requestHeaders(): Record<string, string> {
    return {
      "x-tenant-id": tenantId,
      "x-user-id": actorId,
      "x-user-clearance": "restricted",
      "x-user-scopes": evidenceScopes
    };
  }
});
