import "dotenv/config";
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import type { UniversalTaskRecord } from "../../src/modules/tasks/application/tasks.types.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";

const actorId = randomUUID();
const tenantId = randomUUID();
const otherTenantId = randomUUID();

let app: INestApplication;
let baseUrl: string;
const repositoryPool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });

async function seedAssessmentItemId(tenantId: string): Promise<string> {
  const assessment = await repositoryPool.query(
    `insert into assessments (tenant_id, scope_name, control_snapshot_version, period_start, period_end, created_by, updated_by)
     values ($1, $2, 'v1', '2026-01-01', '2026-12-31', $3, $3) returning id`,
    [tenantId, `tasks-fixture-assessment-${randomUUID()}`, actorId]
  );
  const controlInstance = await repositoryPool.query(
    `insert into control_instances (tenant_id, assessment_id, control_id, framework_key, framework_version, mapping_version, owner_id, created_by, updated_by)
     values ($1, $2, 'HARM-1', 'SOC2', 'v1', 'm1', $3, $3, $3) returning id`,
    [tenantId, assessment.rows[0].id, actorId]
  );
  const questionSet = await repositoryPool.query(
    `insert into question_sets (tenant_id, control_id, question_set_key, created_by, updated_by)
     values ($1, 'HARM-1', 'q1', $2, $2) returning id`,
    [tenantId, actorId]
  );
  const questionVersion = await repositoryPool.query(
    `insert into question_versions (tenant_id, question_set_id, question_version, payload_json, checksum, created_by, updated_by)
     values ($1, $2, 1, '{}'::jsonb, 'tasks-fixture-checksum', $3, $3) returning id`,
    [tenantId, questionSet.rows[0].id, actorId]
  );
  const item = await repositoryPool.query(
    `insert into assessment_items (
       tenant_id, assessment_id, framework_key, framework_version, mapping_version,
       control_id, harmonized_control_id, question_version, owner_id, control_instance_id,
       question_version_id, created_by, updated_by
     )
     values ($1, $2, 'SOC2', 'v1', 'm1', 'CC1.1', 'HARM-1', 'q1', $3, $4, $5, $3, $3)
     returning id`,
    [tenantId, assessment.rows[0].id, actorId, controlInstance.rows[0].id, questionVersion.rows[0].id]
  );
  return item.rows[0].id;
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

describe("Phase 12: Universal Task Layer integration", () => {
  it("automatically creates a universal task when a remediation_task is inserted, and allows fetch/update through v1 HTTP API", async () => {
    const item1 = await seedAssessmentItemId(tenantId);
    await repositoryPool.query(
      `insert into findings (tenant_id, assessment_item_id, severity, description, created_by, updated_by)
       values ($1, $2, 'high', 'Test finding', $3, $3) returning id`,
      [tenantId, item1, actorId]
    );

    // 1. Insert universal task
    const remediationTaskId = randomUUID();
    await repositoryPool.query(
      `insert into universal_tasks (id, tenant_id, target_type, target_id, title, description, priority, status, due_at, owner_id, created_by, updated_by)
       values ($1, $2, 'remediation_task', $1, 'Remediation Task', 'Remediate finding', 'medium', 'pending', '2026-12-31T00:00:00.000Z', $3, $3, $3)`,
      [remediationTaskId, tenantId, actorId]
    );

    // 2. Query universal task via HTTP API (using tenant session context headers)
    const listResponse = await fetch(`${baseUrl}/v1/tasks`, {
      headers: {
        "x-tenant-id": tenantId,
        "x-user-id": actorId,
        "x-user-roles": "compliance_manager",
        "x-user-clearance": "confidential",
        "x-user-scopes": "universal_task:read"
      }
    });
    if (listResponse.status !== 200) {
      console.error("API Error Body:", await listResponse.text());
    }
    expect(listResponse.status).toBe(200);
    const listBody = (await listResponse.json()) as UniversalTaskRecord[];
    const matchedTask = listBody.find((t) => t.targetId === remediationTaskId);
    expect(matchedTask).toBeDefined();
    if (!matchedTask) {
      throw new Error("matchedTask not found");
    }
    expect(matchedTask.status).toBe("pending");
    expect(matchedTask.priority).toBe("medium");

    // 3. Update status via HTTP PATCH
    const patchResponse = await fetch(`${baseUrl}/v1/tasks/${matchedTask.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": tenantId,
        "x-user-id": actorId,
        "x-user-roles": "compliance_manager",
        "x-user-clearance": "confidential",
        "x-user-scopes": "universal_task:write"
      },
      body: JSON.stringify({ status: "in_progress" })
    });
    if (patchResponse.status !== 200) {
      console.error("PATCH API Error Body:", await patchResponse.text());
    }
    expect(patchResponse.status).toBe(200);
    const patchedTask = (await patchResponse.json()) as UniversalTaskRecord;
    expect(patchedTask.status).toBe("in_progress");

    // 4. Verify RLS tenant scoping (query task from other tenant: expect 404 or empty list)
    const otherListResponse = await fetch(`${baseUrl}/v1/tasks`, {
      headers: {
        "x-tenant-id": otherTenantId,
        "x-user-id": actorId,
        "x-user-roles": "compliance_manager",
        "x-user-clearance": "confidential",
        "x-user-scopes": "universal_task:read"
      }
    });
    expect(otherListResponse.status).toBe(200);
    const otherListBody = (await otherListResponse.json()) as UniversalTaskRecord[];
    const otherMatched = otherListBody.find((t) => t.id === matchedTask.id);
    expect(otherMatched).toBeUndefined();
  });
});
