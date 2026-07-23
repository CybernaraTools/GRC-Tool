/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";

const actorId = randomUUID();
const tenantId = randomUUID();

let app: INestApplication;
let baseUrl: string;
const repositoryPool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });

async function seedFrameworkUpdateFixture(tenantId: string) {
  const fwKey = `FW-${randomUUID().slice(0, 8)}`;
  // 1. Insert framework
  const fw = await repositoryPool.query(
    `insert into frameworks (tenant_id, framework_key, name, created_by, updated_by)
     values ($1, $2, $3, $4, $4) returning id`,
    [tenantId, fwKey, "Test Framework", actorId]
  );
  const frameworkId = fw.rows[0].id;

  // 2. Insert from_version (v1)
  const fv1 = await repositoryPool.query(
    `insert into framework_versions (tenant_id, framework_id, version_key, status, created_by, updated_by)
     values ($1, $2, 'v1', 'published', $3, $3) returning id`,
    [tenantId, frameworkId, actorId]
  );
  const fromVersionId = fv1.rows[0].id;

  // 3. Insert to_version (v2)
  const fv2 = await repositoryPool.query(
    `insert into framework_versions (tenant_id, framework_id, version_key, status, created_by, updated_by)
     values ($1, $2, 'v2', 'staged', $3, $3) returning id`,
    [tenantId, frameworkId, actorId]
  );
  const toVersionId = fv2.rows[0].id;

  // 4. Control sets for v1 & v2
  const cs1 = await repositoryPool.query(
    `insert into control_sets (tenant_id, framework_version_id, set_key, name, created_by, updated_by)
     values ($1, $2, 'set1', 'Set 1', $3, $3) returning id`,
    [tenantId, fromVersionId, actorId]
  );
  const cs2 = await repositoryPool.query(
    `insert into control_sets (tenant_id, framework_version_id, set_key, name, created_by, updated_by)
     values ($1, $2, 'set1', 'Set 1', $3, $3) returning id`,
    [tenantId, toVersionId, actorId]
  );

  // 5. Controls for v1 (to test modified and removed)
  // Control A: key='C1', requirement='Req A' (will be modified in v2)
  // Control B: key='C2', requirement='Req B' (will be removed in v2)
  await repositoryPool.query(
    `insert into controls (tenant_id, control_set_id, control_key, title, requirement_text, created_by, updated_by)
     values ($1, $2, 'C1', 'Control 1', 'Req A', $3, $3),
            ($1, $2, 'C2', 'Control 2', 'Req B', $3, $3)`,
    [tenantId, cs1.rows[0].id, actorId]
  );

  // 6. Controls for v2 (to test added and modified)
  // Control A: key='C1', requirement='Req A modified'
  // Control C: key='C3', requirement='Req C added'
  await repositoryPool.query(
    `insert into controls (tenant_id, control_set_id, control_key, title, requirement_text, created_by, updated_by)
     values ($1, $2, 'C1', 'Control 1', 'Req A modified', $3, $3),
            ($1, $2, 'C3', 'Control 3', 'Req C', $3, $3)`,
    [tenantId, cs2.rows[0].id, actorId]
  );

  // 7. Active Assessment using v1
  const assessment = await repositoryPool.query(
    `insert into assessments (tenant_id, scope_name, control_snapshot_version, period_start, period_end, status, created_by, updated_by)
     values ($1, $2, 'v1', '2026-01-01', '2026-12-31', 'in_progress', $3, $3) returning id`,
    [tenantId, `updates-fixture-assessment-${randomUUID()}`, actorId]
  );
  const assessmentId = assessment.rows[0].id;

  // 8. Control instance for assessment using C1 on v1
  const controlInstance = await repositoryPool.query(
    `insert into control_instances (tenant_id, assessment_id, control_id, framework_key, framework_version, mapping_version, owner_id, created_by, updated_by)
     values ($1, $2, 'C1', $4, 'v1', 'm1', $3, $3, $3) returning id`,
    [tenantId, assessmentId, actorId, fwKey]
  );
  const controlInstanceId = controlInstance.rows[0].id;

  return {
    frameworkId,
    fromVersionId,
    toVersionId,
    frameworkKey: fwKey,
    fromVersionKey: "v1",
    toVersionKey: "v2",
    assessmentId,
    controlInstanceId
  };
}

beforeAll(async () => {
  app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new ProblemDetailsFilter());
  await app.listen(0);
  const address = app.getHttpServer().address() as AddressInfo;
  baseUrl = `http://localhost:${address.port}`;
});

afterAll(async () => {
  await app.close();
  await repositoryPool.end();
});

describe("Phase 16: Framework Update Impact Analysis integration", () => {
  it("calculates diffs, maps changes, registers impact on active assessments, and resolves impact items", async () => {
    const fixture = await seedFrameworkUpdateFixture(tenantId);

    // 1. POST /v1/frameworks/diffs
    const diffResponse = await fetch(`${baseUrl}/v1/frameworks/diffs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": tenantId,
        "x-user-id": actorId,
        "x-user-roles": "compliance_manager",
        "x-user-clearance": "restricted",
        "x-user-scopes": "framework_diff:write"
      },
      body: JSON.stringify({
        frameworkKey: fixture.frameworkKey,
        fromVersionKey: fixture.fromVersionKey,
        toVersionKey: fixture.toVersionKey
      })
    });
    if (diffResponse.status !== 201) {
      console.error("Diff creation failed:", await diffResponse.text());
    }
    expect(diffResponse.status).toBe(201);
    const diffBody = (await diffResponse.json()) as any;
    expect(diffBody.id).toBeDefined();

    // 2. GET /v1/frameworks/diffs/:id/items
    const itemsResponse = await fetch(`${baseUrl}/v1/frameworks/diffs/${diffBody.id}/items`, {
      headers: {
        "x-tenant-id": tenantId,
        "x-user-id": actorId,
        "x-user-roles": "compliance_manager",
        "x-user-clearance": "restricted",
        "x-user-scopes": "framework_diff:read"
      }
    });
    expect(itemsResponse.status).toBe(200);
    const items = (await itemsResponse.json()) as any[];
    expect(items.length).toBe(3); // C1 (modified), C2 (removed), C3 (added)

    const c1Item = items.find(i => i.controlKey === "C1");
    expect(c1Item).toBeDefined();
    expect(c1Item.changeType).toBe("modified");
    expect(c1Item.newValue.requirementText).toBe("Req A modified");

    // 3. GET /v1/frameworks/updates/impacts
    const impactsResponse = await fetch(`${baseUrl}/v1/frameworks/updates/impacts`, {
      headers: {
        "x-tenant-id": tenantId,
        "x-user-id": actorId,
        "x-user-roles": "compliance_manager",
        "x-user-clearance": "restricted",
        "x-user-scopes": "framework_update_impact:read"
      }
    });
    expect(impactsResponse.status).toBe(200);
    const impacts = (await impactsResponse.json()) as any[];
    // C1 is the only control instance we seeded under assessment using v1, and C1 was modified.
    expect(impacts.length).toBe(1);
    expect(impacts[0].controlInstanceId).toBe(fixture.controlInstanceId);
    expect(impacts[0].status).toBe("pending");

    // A5: Assert corresponding universal task was created
    const taskRes = await repositoryPool.query(`select * from universal_tasks where target_id = $1`, [impacts[0].id]);
    expect(taskRes.rows.length).toBe(1);
    const task = taskRes.rows[0];
    expect(task.target_type).toBe("framework_update_impact");
    expect(task.owner_id).toBe(actorId); // actorId is the owner of the control instance in our fixture
    expect(task.priority).toBe("high");

    // 4. PATCH /v1/frameworks/updates/impacts/:id
    const resolveResponse = await fetch(`${baseUrl}/v1/frameworks/updates/impacts/${impacts[0].id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": tenantId,
        "x-user-id": actorId,
        "x-user-roles": "compliance_manager",
        "x-user-clearance": "restricted",
        "x-user-scopes": "framework_update_impact:write"
      },
      body: JSON.stringify({
        status: "accepted",
        resolutionRationale: "We accept the minor modification to requirements."
      })
    });
    expect(resolveResponse.status).toBe(200);
    const resolved = (await resolveResponse.json()) as any;
    expect(resolved.status).toBe("accepted");
    expect(resolved.resolutionRationale).toBe("We accept the minor modification to requirements.");
  }, 30000);
});
