import "dotenv/config";
import "reflect-metadata";
import type { AddressInfo } from "node:net";
import { readFile } from "node:fs/promises";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { DiscoveryService } from "@nestjs/core";
import { NestFactory } from "@nestjs/core";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";
import {
  buildRegisteredRouteSummary,
  type RootStatusResponse
} from "../src/root-status.service.js";
import { DATABASE_POOL } from "../src/platform/database/tokens.js";
import { ProblemDetailsFilter } from "../src/shared/problem-details.filter.js";

let app: INestApplication;
let baseUrl: string;
let appPool: pg.Pool;
let expectedRouteSummary: ReturnType<typeof buildRegisteredRouteSummary>;
let expectedApiVersion: string;

beforeAll(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidUnknownValues: true,
      transform: true
    })
  );
  await app.listen(0);
  appPool = app.get<pg.Pool>(DATABASE_POOL);
  const address = app.getHttpServer().address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
  expectedRouteSummary = buildRegisteredRouteSummary(app.get(DiscoveryService).getControllers());

  const spec = JSON.parse(await readFile("openapi/cybernara.openapi.json", "utf8")) as {
    info?: { version?: unknown };
  };
  if (typeof spec.info?.version !== "string") {
    throw new Error("OpenAPI spec did not expose info.version.");
  }
  expectedApiVersion = spec.info.version;
}, 120_000);

afterAll(async () => {
  await app?.close();
  await appPool?.end();
});

describe("root status endpoint", () => {
  it("returns an unauthenticated backend landing status derived from registered routes", async () => {
    const response = await fetch(`${baseUrl}/`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as RootStatusResponse;
    expect(body).toMatchObject({
      service: "cybernara-backend",
      status: "ok",
      apiVersion: expectedApiVersion,
      openapiSpecPath: null,
      documentation: "README.md#current-api-routes"
    });
    expect(body.routeCount).toBeGreaterThan(0);
    expect(body.modules.length).toBeGreaterThan(0);
    expect(body.routeCount).toBe(expectedRouteSummary.routeCount);
    expect(body.modules).toEqual(expectedRouteSummary.modules);
  });
});
