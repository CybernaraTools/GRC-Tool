import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });

describe("Legacy Table Write Guard", () => {
  let tenantId: string;
  let actorId: string;

  beforeAll(() => {
    tenantId = randomUUID();
    actorId = randomUUID();
  });

  afterAll(async () => {
    await pool.end();
  });

  const expectWriteRejected = async (query: string, params: unknown[]) => {
    await expect(pool.query(query, params)).rejects.toThrow(/Direct INSERTs to legacy table .* are deprecated|Writes to legacy table .* are blocked/);
  };

  it("rejects direct inserts into framework_content_packs", async () => {
    await expectWriteRejected(
      `insert into framework_content_packs (tenant_id, framework_key, pack_version, source_package_id, source_sha256, signature, status, created_by, updated_by)
       values ($1, $2, 'v1', $3, $4, $5, 'published', $6, $6)`,
      [tenantId, `TEST_${randomUUID().slice(0, 8)}`, randomUUID(), randomUUID(), randomUUID(), actorId]
    );
  });

  it("rejects direct inserts into framework_requirements", async () => {
    await expectWriteRejected(
      `insert into framework_requirements (
         tenant_id, framework_pack_id, framework_key, control_id, control_title,
         requirement_text, citation, source_workbook, source_sheet, source_row_number, source_sha256, raw_record,
         created_by, updated_by
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $13)`,
      [tenantId, randomUUID(), `TEST_${randomUUID().slice(0, 8)}`, "CC1.1", "Title", "Req", "Cite", "wb", "sh", 1, randomUUID(), "{}", actorId]
    );
  });

  it("rejects direct inserts into control_mappings", async () => {
    await expectWriteRejected(
      `insert into control_mappings (
         tenant_id, framework_key, source_control_id, harmonized_control_id, mapping_classification,
         source_workbook, source_sheet, source_row_number, status, created_by, updated_by
       )
       values ($1, $2, $3, $4, 'mapped', $5, $6, $7, 'published', $8, $8)`,
      [tenantId, `TEST_${randomUUID().slice(0, 8)}`, "CC1.1", `HARM-${randomUUID().slice(0, 8)}`, "wb", "sh", 1, actorId]
    );
  });

  it("rejects direct inserts into remediation_tasks", async () => {
    await expectWriteRejected(
      `insert into remediation_tasks (
         tenant_id, finding_id, status, priority, due_at, owner_id, classification, created_by, updated_by
       )
       values ($1, $2, 'open', 'medium', now(), $3, 'confidential', $3, $3)`,
      [tenantId, randomUUID(), actorId]
    );
  });

  it("rejects direct inserts into rights_request_tasks", async () => {
    await expectWriteRejected(
      `insert into rights_request_tasks (
         tenant_id, rights_request_id, task_type, system_id, status, owner_id, classification, created_by, updated_by
       )
       values ($1, $2, 'erasure', $4, 'pending', $3, 'confidential', $3, $3)`,
      [tenantId, randomUUID(), actorId, randomUUID()]
    );
  });
});
