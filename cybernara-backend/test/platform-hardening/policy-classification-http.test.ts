import "dotenv/config";
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { DATABASE_POOL } from "../../src/platform/database/tokens.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";

/**
 * Regression coverage for the PolicyGuard classification bug: the guard used to hardcode
 * every guarded resource's classification to "restricted", so a subject with a lower
 * clearance was denied even with a fully matching scope grant. Every other HTTP integration
 * test in this repo hardcodes "x-user-clearance": "restricted", which is exactly the blind
 * spot that let the bug through undetected. This file deliberately varies clearance instead.
 */

const tenantId = randomUUID();
const userId = randomUUID();

let app: INestApplication;
let baseUrl: string;
let appPool: pg.Pool;

beforeAll(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidUnknownValues: true, transform: true }));
  await app.listen(0);
  appPool = app.get<pg.Pool>(DATABASE_POOL);
  const address = app.getHttpServer().address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
}, 120_000);

afterAll(async () => {
  await app.close();
  await appPool.end();
});

describe("PolicyGuard resource classification", () => {
  it("allows a correctly-scoped subject at 'confidential' clearance to reach a confidential-tier route (assessment)", async () => {
    const response = await fetch(`${baseUrl}/v1/assessments`, {
      headers: headers({ scopes: "assessment:read", clearance: "confidential" })
    });
    expect(response.status).toBe(200);
  });

  it("still denies a correctly-scoped subject at 'internal' clearance for a confidential-tier route (assessment)", async () => {
    const response = await fetch(`${baseUrl}/v1/assessments`, {
      headers: headers({ scopes: "assessment:read", clearance: "internal" })
    });
    expect(response.status).toBe(403);
  });

  it("allows a correctly-scoped subject at 'restricted' clearance for a confidential-tier route, unchanged from before", async () => {
    const response = await fetch(`${baseUrl}/v1/assessments`, {
      headers: headers({ scopes: "assessment:read", clearance: "restricted" })
    });
    expect(response.status).toBe(200);
  });

  it("denies a correctly-scoped subject at 'confidential' clearance for a genuinely restricted-tier route (framework-content)", async () => {
    const response = await fetch(`${baseUrl}/v1/framework-content/requirements`, {
      headers: headers({ scopes: "framework-content:read", clearance: "confidential" })
    });
    expect(response.status).toBe(403);
  });

  it("allows a correctly-scoped subject at 'restricted' clearance for the same restricted-tier route", async () => {
    const response = await fetch(`${baseUrl}/v1/framework-content/requirements`, {
      headers: headers({ scopes: "framework-content:read", clearance: "restricted" })
    });
    expect(response.status).toBe(200);
  });

  it("allows a correctly-scoped subject at 'confidential' clearance to reach a confidential-tier route (audit_event)", async () => {
    const response = await fetch(`${baseUrl}/v1/audit/events`, {
      headers: headers({ scopes: "audit_event:read", clearance: "confidential" })
    });
    expect(response.status).toBe(200);
  });
});

function headers(input: { scopes: string; clearance: string }): Record<string, string> {
  return {
    "x-tenant-id": tenantId,
    "x-user-id": userId,
    "x-user-clearance": input.clearance,
    "x-user-scopes": input.scopes
  };
}
