import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createCustomFieldDefinition,
  createCustomObjectDefinition,
  createCustomRecord,
  createCustomValue
} from "../../src/modules/enterprise-grc/domain/grc.js";

// G-13 (custom platform, migration 0025_g13_custom_platform.sql): pure domain-function unit tests
// plus real-Supabase integrity tests proving the 3 new tables' own constraints actually reject bad
// data at the database layer. See the migration's own header comment for the full
// scoping/reconciliation record — `custom_object_definitions` already existed and is fully wired;
// this gap adds the normalized field/record/value tables underneath it.

describe("G-13 domain: custom field/record/value pure functions", () => {
  it("createCustomFieldDefinition rejects a blank fieldKey", () => {
    expect(() =>
      createCustomFieldDefinition({
        tenantId: randomUUID(),
        objectDefinitionId: randomUUID(),
        fieldKey: "  ",
        dataType: "text",
        required: false,
        validationJson: {}
      })
    ).toThrow(/fieldKey/i);
  });

  it("createCustomRecord rejects a blank recordKey", () => {
    expect(() =>
      createCustomRecord({ tenantId: randomUUID(), objectDefinitionId: randomUUID(), recordKey: "  " })
    ).toThrow(/recordKey/i);
  });

  it("createCustomRecord defaults status to 'active'", () => {
    const record = createCustomRecord({ tenantId: randomUUID(), objectDefinitionId: randomUUID(), recordKey: "record-1" });
    expect(record.status).toBe("active");
  });

  it("createCustomObjectDefinition defaults status to 'active'", () => {
    const definition = createCustomObjectDefinition({
      tenantId: randomUUID(),
      objectKey: "obj-1",
      fields: [{ key: "a", type: "text", required: false }],
      workflowStates: ["open"],
      permissionRoleIds: [randomUUID()],
      upgradeSafe: true,
      connectorSdkEnabled: false
    });
    expect(definition.status).toBe("active");
  });

  it("createCustomValue rejects a missing value when the field definition is required", () => {
    expect(() =>
      createCustomValue(
        { tenantId: randomUUID(), recordId: randomUUID(), fieldDefinitionId: randomUUID() },
        { required: true, dataType: "text" }
      )
    ).toThrow(/required/i);
  });

  it("createCustomValue rejects a value whose type does not match the field's dataType", () => {
    expect(() =>
      createCustomValue(
        { tenantId: randomUUID(), recordId: randomUUID(), fieldDefinitionId: randomUUID(), valueJson: "not-a-number" },
        { required: true, dataType: "number" }
      )
    ).toThrow(/dataType/i);
  });

  it("createCustomValue accepts a matching value", () => {
    const value = createCustomValue(
      { tenantId: randomUUID(), recordId: randomUUID(), fieldDefinitionId: randomUUID(), valueJson: 42 },
      { required: true, dataType: "number" }
    );
    expect(value.valueJson).toBe(42);
  });

  it("createCustomValue allows an absent value when the field is not required", () => {
    const value = createCustomValue(
      { tenantId: randomUUID(), recordId: randomUUID(), fieldDefinitionId: randomUUID() },
      { required: false, dataType: "text" }
    );
    expect(value.valueJson).toBeUndefined();
  });
});

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("SUPABASE_DB_URL is not set; G-13 integrity tests must run against a real database.");
}

let pool: pg.Pool;

beforeAll(() => {
  pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
});

afterAll(async () => {
  await pool.end();
});

async function seedCustomObjectDefinition(tenantId: string, actorId: string): Promise<string> {
  const result = await pool.query(
    `insert into custom_object_definitions (tenant_id, object_key, fields, workflow_states, permission_role_ids, upgrade_safe, connector_sdk_enabled, created_by, updated_by)
     values ($1, $2, '[]'::jsonb, '{open}', array[$3]::uuid[], true, false, $4, $4) returning id`,
    [tenantId, `g13-object-${randomUUID()}`, actorId, actorId]
  );
  return result.rows[0].id as string;
}

async function seedCustomFieldDefinition(tenantId: string, objectDefinitionId: string, actorId: string): Promise<string> {
  const result = await pool.query(
    `insert into custom_field_definitions (tenant_id, object_definition_id, field_key, data_type, required, created_by, updated_by)
     values ($1, $2, $3, 'text', false, $4, $4) returning id`,
    [tenantId, objectDefinitionId, `g13-field-${randomUUID()}`, actorId]
  );
  return result.rows[0].id as string;
}

async function seedCustomRecord(tenantId: string, objectDefinitionId: string, actorId: string): Promise<string> {
  const result = await pool.query(
    `insert into custom_records (tenant_id, object_definition_id, record_key, created_by, updated_by)
     values ($1, $2, $3, $4, $4) returning id`,
    [tenantId, objectDefinitionId, `g13-record-${randomUUID()}`, actorId]
  );
  return result.rows[0].id as string;
}

describe("G-13: custom_object_definitions additive columns (status, validation_schema)", () => {
  it("defaults status to 'active' and rejects an invalid status", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const id = await seedCustomObjectDefinition(tenantId, actorId);
    const row = await pool.query("select status from custom_object_definitions where id = $1", [id]);
    expect(row.rows[0].status).toBe("active");

    await expect(
      pool.query(
        `insert into custom_object_definitions (tenant_id, object_key, fields, workflow_states, permission_role_ids, upgrade_safe, connector_sdk_enabled, status, created_by, updated_by)
         values ($1, $2, '[]'::jsonb, '{open}', array[$3]::uuid[], true, false, 'not_a_real_status', $4, $4)`,
        [tenantId, `g13-object-${randomUUID()}`, actorId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});

describe("G-13: custom_field_definitions constraints", () => {
  it("rejects a duplicate (object_definition_id, field_key)", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const objectId = await seedCustomObjectDefinition(tenantId, actorId);
    const fieldKey = `g13-dup-field-${randomUUID()}`;
    await pool.query(
      `insert into custom_field_definitions (tenant_id, object_definition_id, field_key, data_type, required, created_by, updated_by)
       values ($1, $2, $3, 'text', false, $4, $4)`,
      [tenantId, objectId, fieldKey, actorId]
    );
    await expect(
      pool.query(
        `insert into custom_field_definitions (tenant_id, object_definition_id, field_key, data_type, required, created_by, updated_by)
         values ($1, $2, $3, 'number', true, $4, $4)`,
        [tenantId, objectId, fieldKey, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects an invalid data_type", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const objectId = await seedCustomObjectDefinition(tenantId, actorId);
    await expect(
      pool.query(
        `insert into custom_field_definitions (tenant_id, object_definition_id, field_key, data_type, required, created_by, updated_by)
         values ($1, $2, $3, 'not_a_real_type', false, $4, $4)`,
        [tenantId, objectId, `g13-field-${randomUUID()}`, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });

  it("rejects a field referencing a nonexistent object_definition_id", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    await expect(
      pool.query(
        `insert into custom_field_definitions (tenant_id, object_definition_id, field_key, data_type, required, created_by, updated_by)
         values ($1, $2, $3, 'text', false, $4, $4)`,
        [tenantId, randomUUID(), `g13-field-${randomUUID()}`, actorId]
      )
    ).rejects.toThrow(/foreign key/i);
  });
});

describe("G-13: custom_records constraints", () => {
  it("rejects a duplicate (object_definition_id, record_key)", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const objectId = await seedCustomObjectDefinition(tenantId, actorId);
    const recordKey = `g13-dup-record-${randomUUID()}`;
    await pool.query(
      `insert into custom_records (tenant_id, object_definition_id, record_key, created_by, updated_by)
       values ($1, $2, $3, $4, $4)`,
      [tenantId, objectId, recordKey, actorId]
    );
    await expect(
      pool.query(
        `insert into custom_records (tenant_id, object_definition_id, record_key, created_by, updated_by)
         values ($1, $2, $3, $4, $4)`,
        [tenantId, objectId, recordKey, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects an invalid status", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const objectId = await seedCustomObjectDefinition(tenantId, actorId);
    await expect(
      pool.query(
        `insert into custom_records (tenant_id, object_definition_id, record_key, status, created_by, updated_by)
         values ($1, $2, $3, 'not_a_real_status', $4, $4)`,
        [tenantId, objectId, `g13-record-${randomUUID()}`, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});

describe("G-13: custom_values constraints", () => {
  it("rejects a duplicate (record_id, field_definition_id)", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const objectId = await seedCustomObjectDefinition(tenantId, actorId);
    const fieldId = await seedCustomFieldDefinition(tenantId, objectId, actorId);
    const recordId = await seedCustomRecord(tenantId, objectId, actorId);
    await pool.query(
      `insert into custom_values (tenant_id, record_id, field_definition_id, value_json, created_by, updated_by)
       values ($1, $2, $3, '"first"'::jsonb, $4, $4)`,
      [tenantId, recordId, fieldId, actorId]
    );
    await expect(
      pool.query(
        `insert into custom_values (tenant_id, record_id, field_definition_id, value_json, created_by, updated_by)
         values ($1, $2, $3, '"second"'::jsonb, $4, $4)`,
        [tenantId, recordId, fieldId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects a value referencing a nonexistent record_id", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const objectId = await seedCustomObjectDefinition(tenantId, actorId);
    const fieldId = await seedCustomFieldDefinition(tenantId, objectId, actorId);
    await expect(
      pool.query(
        `insert into custom_values (tenant_id, record_id, field_definition_id, created_by, updated_by)
         values ($1, $2, $3, $4, $4)`,
        [tenantId, randomUUID(), fieldId, actorId]
      )
    ).rejects.toThrow(/foreign key/i);
  });

  it("allows a null value_json (a value can be absent unless the field requires it, enforced at the service layer)", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const objectId = await seedCustomObjectDefinition(tenantId, actorId);
    const fieldId = await seedCustomFieldDefinition(tenantId, objectId, actorId);
    const recordId = await seedCustomRecord(tenantId, objectId, actorId);
    const result = await pool.query(
      `insert into custom_values (tenant_id, record_id, field_definition_id, created_by, updated_by)
       values ($1, $2, $3, $4, $4) returning id`,
      [tenantId, recordId, fieldId, actorId]
    );
    expect(result.rows[0].id).toBeTruthy();
  });
});
