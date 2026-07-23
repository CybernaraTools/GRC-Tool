import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createDataCategory,
  createDataDiscoveryFinding,
  createDpiaRisk,
  createIncidentAssessment,
  createPrivacyNoticeVersion,
  createProcessingPurposeAssignment,
  createRetentionRule,
  createSystemAsset,
  createTransfer
} from "../../src/modules/privacy-operations/domain/privacy.js";

// G-08 (privacy normalization, migration 0022_g08_privacy_normalization.sql): pure domain-function
// unit tests plus real-Supabase integrity tests proving the new tables' own constraints actually
// reject bad data at the database layer. See the migration's own header comment for the full
// scoping/reconciliation record (Absolute full spec §13, minus G-12's holds/deletion tables,
// confirmed via AskUserQuestion).

describe("G-08 domain: privacy graph pure functions", () => {
  it("createSystemAsset rejects a blank name", () => {
    expect(() =>
      createSystemAsset({ tenantId: randomUUID(), name: "  ", assetType: "database", ownerId: randomUUID() })
    ).toThrow(/name/i);
  });

  it("createDataCategory rejects a blank categoryKey", () => {
    expect(() =>
      createDataCategory({ tenantId: randomUUID(), categoryKey: "  ", name: "PII", sensitivity: "high" })
    ).toThrow(/categoryKey/i);
  });

  it("createPrivacyNoticeVersion rejects a sha256 that is not 64 characters", () => {
    expect(() =>
      createPrivacyNoticeVersion({
        tenantId: randomUUID(),
        privacyNoticeId: randomUUID(),
        noticeVersionNo: 1,
        contentUri: "s3://bucket/notice.html",
        sha256: "too-short",
        jurisdictions: ["EU"],
        effectiveFrom: new Date(),
        approvedBy: randomUUID()
      })
    ).toThrow(/64-character hex digest/i);
  });

  it("createTransfer rejects a blank fromCountry/toCountry", () => {
    expect(() =>
      createTransfer({
        tenantId: randomUUID(),
        processingActivityId: randomUUID(),
        fromCountry: "  ",
        toCountry: "US",
        mechanism: "sccs"
      })
    ).toThrow(/fromCountry/i);
  });

  it("createDpiaRisk rejects a residualScore outside 0-100", () => {
    expect(() =>
      createDpiaRisk({
        tenantId: randomUUID(),
        dpiaId: randomUUID(),
        description: "Excessive retention",
        likelihood: "high",
        impact: "high",
        residualScore: 150
      })
    ).toThrow(/residualScore/i);
  });

  it("createIncidentAssessment rejects a blank rationale", () => {
    expect(() =>
      createIncidentAssessment({
        tenantId: randomUUID(),
        incidentId: randomUUID(),
        jurisdiction: "EU",
        reportable: true,
        rationale: "  ",
        assessorId: randomUUID()
      })
    ).toThrow(/rationale/i);
  });

  it("createRetentionRule rejects a non-positive durationDays", () => {
    expect(() =>
      createRetentionRule({
        tenantId: randomUUID(),
        dataCategoryId: randomUUID(),
        jurisdiction: "EU",
        retentionTrigger: "contract_end",
        durationDays: 0,
        disposition: "delete"
      })
    ).toThrow(/durationDays/i);
  });

  it("createDataDiscoveryFinding rejects a confidence outside 0-1", () => {
    expect(() =>
      createDataDiscoveryFinding({
        tenantId: randomUUID(),
        scanId: randomUUID(),
        locatorHash: "hash-1",
        dataCategoryId: randomUUID(),
        confidence: 1.5
      })
    ).toThrow(/confidence/i);
  });

  it("createProcessingPurposeAssignment defaults effectiveFrom to now when not given", () => {
    const assignment = createProcessingPurposeAssignment({
      tenantId: randomUUID(),
      processingActivityId: randomUUID(),
      purposeId: randomUUID(),
      lawfulBasisId: randomUUID()
    });
    expect(assignment.effectiveFrom).toBeInstanceOf(Date);
    expect(assignment.effectiveTo).toBeUndefined();
  });
});

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("SUPABASE_DB_URL is not set; G-08 integrity tests must run against a real database.");
}

let pool: pg.Pool;

beforeAll(() => {
  pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
});

afterAll(async () => {
  await pool.end();
});

async function seedSystemAsset(tenantId: string, actorId: string): Promise<string> {
  const asset = await pool.query(
    `insert into systems_assets (tenant_id, name, asset_type, owner_id, created_by, updated_by)
     values ($1, $2, 'database', $3, $3, $3) returning id`,
    [tenantId, `g08-system-${randomUUID()}`, actorId]
  );
  return asset.rows[0].id as string;
}

async function seedDataCategory(tenantId: string, actorId: string): Promise<string> {
  const category = await pool.query(
    `insert into data_categories (tenant_id, category_key, name, sensitivity, created_by, updated_by)
     values ($1, $2, 'PII', 'high', $3, $3) returning id`,
    [tenantId, `g08-category-${randomUUID()}`, actorId]
  );
  return category.rows[0].id as string;
}

async function seedProcessingActivity(tenantId: string, actorId: string): Promise<string> {
  const activity = await pool.query(
    `insert into processing_activities (
       tenant_id, purpose, lawful_basis, retention_months, jurisdiction, report_version, created_by, updated_by
     )
     values ($1, 'marketing', 'consent', 12, 'EU', 'v1', $2, $2) returning id`,
    [tenantId, actorId]
  );
  return activity.rows[0].id as string;
}

async function seedPurpose(tenantId: string, actorId: string): Promise<string> {
  const purpose = await pool.query(
    `insert into purposes (tenant_id, purpose_key, name, created_by, updated_by)
     values ($1, $2, 'Marketing', $3, $3) returning id`,
    [tenantId, `g08-purpose-${randomUUID()}`, actorId]
  );
  return purpose.rows[0].id as string;
}

async function seedLawfulBasis(tenantId: string, actorId: string): Promise<string> {
  const basis = await pool.query(
    `insert into lawful_bases (tenant_id, jurisdiction, basis_key, name, created_by, updated_by)
     values ($1, 'EU', $2, 'Consent', $3, $3) returning id`,
    [tenantId, `g08-basis-${randomUUID()}`, actorId]
  );
  return basis.rows[0].id as string;
}

async function seedPrivacyNotice(tenantId: string, actorId: string): Promise<string> {
  const notice = await pool.query(
    `insert into privacy_notices (tenant_id, notice_key, audience, owner_id, created_by, updated_by)
     values ($1, $2, 'customers', $3, $3, $3) returning id`,
    [tenantId, `g08-notice-${randomUUID()}`, actorId]
  );
  return notice.rows[0].id as string;
}

async function seedPrivacyNoticeVersion(tenantId: string, noticeId: string, actorId: string, versionNo = 1): Promise<string> {
  const version = await pool.query(
    `insert into privacy_notice_versions (
       tenant_id, privacy_notice_id, notice_version_no, content_uri, sha256, jurisdictions,
       effective_from, approved_by
     )
     values ($1, $2, $3, 's3://bucket/notice', $4, array['EU'], now(), $5)
     returning id`,
    [tenantId, noticeId, versionNo, "a".repeat(64), actorId]
  );
  return version.rows[0].id as string;
}

async function seedConnector(tenantId: string, actorId: string): Promise<string> {
  const connector = await pool.query(
    `insert into connectors (tenant_id, connector_key, provider, kind, secret_ref, created_by, updated_by)
     values ($1, $2, 'aws', 'iam', 'secret-ref', $3, $3) returning id`,
    [tenantId, `g08-connector-${randomUUID()}`, actorId]
  );
  return connector.rows[0].id as string;
}

async function seedDpia(tenantId: string, processingActivityId: string, actorId: string): Promise<string> {
  const dpia = await pool.query(
    `insert into dpias (tenant_id, processing_activity_id, trigger_reason, owner_id, created_by, updated_by)
     values ($1, $2, 'new-processing', $3, $3, $3) returning id`,
    [tenantId, processingActivityId, actorId]
  );
  return dpia.rows[0].id as string;
}

async function seedPrivacyIncident(tenantId: string, actorId: string): Promise<string> {
  const incident = await pool.query(
    `insert into privacy_incidents (
       tenant_id, severity, discovered_at, regulator_notification_due_at, data_subject_notification_due_at, created_by, updated_by
     )
     values ($1, 'high', now(), now() + interval '3 days', now() + interval '3 days', $2, $2)
     returning id`,
    [tenantId, actorId]
  );
  return incident.rows[0].id as string;
}

describe("G-08: systems_assets/data_categories/data_subject_categories constraints", () => {
  // Postgres treats each NULL as distinct for unique-constraint purposes, so two systems_assets
  // rows sharing a tenant/name but both leaving workspace_id null do NOT collide (a real,
  // already-documented limitation of "unique tenant/workspace/name" when workspace is optional —
  // see the migration's own header comment). This test proves the constraint does work for its
  // main case: two rows sharing the *same real* workspace_id.
  it("rejects a duplicate (tenant_id, workspace_id, name) on systems_assets when workspace_id is set", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const name = `g08-dup-system-${randomUUID()}`;
    const workspace = await pool.query(
      `insert into grc_workspaces (tenant_id, business_unit, created_by, updated_by) values ($1, 'Finance', $2, $2) returning id`,
      [tenantId, actorId]
    );
    await pool.query(
      `insert into systems_assets (tenant_id, workspace_id, name, asset_type, owner_id, created_by, updated_by) values ($1, $2, $3, 'database', $4, $4, $4)`,
      [tenantId, workspace.rows[0].id, name, actorId]
    );
    await expect(
      pool.query(
        `insert into systems_assets (tenant_id, workspace_id, name, asset_type, owner_id, created_by, updated_by) values ($1, $2, $3, 'database', $4, $4, $4)`,
        [tenantId, workspace.rows[0].id, name, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects a duplicate (tenant_id, category_key) on data_categories", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const key = `g08-dup-category-${randomUUID()}`;
    await pool.query(
      `insert into data_categories (tenant_id, category_key, name, sensitivity, created_by, updated_by) values ($1, $2, 'PII', 'high', $3, $3)`,
      [tenantId, key, actorId]
    );
    await expect(
      pool.query(
        `insert into data_categories (tenant_id, category_key, name, sensitivity, created_by, updated_by) values ($1, $2, 'PII again', 'high', $3, $3)`,
        [tenantId, key, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects an invalid sensitivity on data_categories", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    await expect(
      pool.query(
        `insert into data_categories (tenant_id, category_key, name, sensitivity, created_by, updated_by) values ($1, $2, 'PII', 'not_a_real_sensitivity', $3, $3)`,
        [tenantId, `g08-category-${randomUUID()}`, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});

describe("G-08: data_discovery_scans/findings constraints", () => {
  it("rejects a duplicate (tenant_id, idempotency_key) on data_discovery_scans", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const systemId = await seedSystemAsset(tenantId, actorId);
    const connectorId = await seedConnector(tenantId, actorId);
    const idempotencyKey = `g08-scan-${randomUUID()}`;
    await pool.query(
      `insert into data_discovery_scans (tenant_id, system_id, connector_id, classifier_version, idempotency_key, created_by, updated_by)
       values ($1, $2, $3, 'v1', $4, $5, $5)`,
      [tenantId, systemId, connectorId, idempotencyKey, actorId]
    );
    await expect(
      pool.query(
        `insert into data_discovery_scans (tenant_id, system_id, connector_id, classifier_version, idempotency_key, created_by, updated_by)
         values ($1, $2, $3, 'v2', $4, $5, $5)`,
        [tenantId, systemId, connectorId, idempotencyKey, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects a duplicate (scan_id, locator_hash, data_category_id) on data_discovery_findings", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const systemId = await seedSystemAsset(tenantId, actorId);
    const connectorId = await seedConnector(tenantId, actorId);
    const categoryId = await seedDataCategory(tenantId, actorId);
    const scan = await pool.query(
      `insert into data_discovery_scans (tenant_id, system_id, connector_id, classifier_version, idempotency_key, created_by, updated_by)
       values ($1, $2, $3, 'v1', $4, $5, $5) returning id`,
      [tenantId, systemId, connectorId, `g08-scan-${randomUUID()}`, actorId]
    );
    await pool.query(
      `insert into data_discovery_findings (tenant_id, scan_id, locator_hash, data_category_id, confidence, created_by, updated_by)
       values ($1, $2, 'hash-1', $3, 0.9, $4, $4)`,
      [tenantId, scan.rows[0].id, categoryId, actorId]
    );
    await expect(
      pool.query(
        `insert into data_discovery_findings (tenant_id, scan_id, locator_hash, data_category_id, confidence, created_by, updated_by)
         values ($1, $2, 'hash-1', $3, 0.5, $4, $4)`,
        [tenantId, scan.rows[0].id, categoryId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });
});

describe("G-08: privacy_notices/privacy_notice_versions constraints", () => {
  it("rejects a duplicate (privacy_notice_id, notice_version_no), and is append-only", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const noticeId = await seedPrivacyNotice(tenantId, actorId);
    const versionId = await seedPrivacyNoticeVersion(tenantId, noticeId, actorId, 1);

    await expect(seedPrivacyNoticeVersion(tenantId, noticeId, actorId, 1)).rejects.toThrow(/duplicate key|unique/i);

    await expect(
      pool.query(`update privacy_notice_versions set content_uri = 's3://bucket/changed' where id = $1`, [versionId])
    ).rejects.toThrow(/append-only/i);
  });
});

describe("G-08: processing_purposes/processing_recipients/transfers constraints", () => {
  it("rejects a second active (processing_activity_id, purpose_id) row in processing_purposes", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const activityId = await seedProcessingActivity(tenantId, actorId);
    const purposeId = await seedPurpose(tenantId, actorId);
    const basisId = await seedLawfulBasis(tenantId, actorId);
    await pool.query(
      `insert into processing_purposes (tenant_id, processing_activity_id, purpose_id, lawful_basis_id, created_by, updated_by)
       values ($1, $2, $3, $4, $5, $5)`,
      [tenantId, activityId, purposeId, basisId, actorId]
    );
    await expect(
      pool.query(
        `insert into processing_purposes (tenant_id, processing_activity_id, purpose_id, lawful_basis_id, created_by, updated_by)
         values ($1, $2, $3, $4, $5, $5)`,
        [tenantId, activityId, purposeId, basisId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects an invalid transfer mechanism", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const activityId = await seedProcessingActivity(tenantId, actorId);
    await expect(
      pool.query(
        `insert into transfers (tenant_id, processing_activity_id, from_country, to_country, mechanism, created_by, updated_by)
         values ($1, $2, 'US', 'DE', 'not_a_real_mechanism', $3, $3)`,
        [tenantId, activityId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});

describe("G-08: dpias/dpia_risks constraints", () => {
  it("rejects an invalid dpia status", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const activityId = await seedProcessingActivity(tenantId, actorId);
    await expect(
      pool.query(
        `insert into dpias (tenant_id, processing_activity_id, trigger_reason, status, owner_id, created_by, updated_by)
         values ($1, $2, 'new-processing', 'not_a_real_status', $3, $3, $3)`,
        [tenantId, activityId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });

  it("rejects a residual_score outside 0-100 on dpia_risks", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const activityId = await seedProcessingActivity(tenantId, actorId);
    const dpiaId = await seedDpia(tenantId, activityId, actorId);
    await expect(
      pool.query(
        `insert into dpia_risks (tenant_id, dpia_id, description, likelihood, impact, residual_score, created_by, updated_by)
         values ($1, $2, 'x', 'high', 'high', 150, $3, $3)`,
        [tenantId, dpiaId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});

describe("G-08: consent_purposes/consent_events constraints", () => {
  it("rejects a second active (tenant_id, purpose_id, channel, region) row in consent_purposes", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const purposeId = await seedPurpose(tenantId, actorId);
    const noticeId = await seedPrivacyNotice(tenantId, actorId);
    const noticeVersionId = await seedPrivacyNoticeVersion(tenantId, noticeId, actorId, 1);
    await pool.query(
      `insert into consent_purposes (tenant_id, purpose_id, notice_version_id, channel, region, created_by, updated_by)
       values ($1, $2, $3, 'web', 'EU', $4, $4)`,
      [tenantId, purposeId, noticeVersionId, actorId]
    );
    await expect(
      pool.query(
        `insert into consent_purposes (tenant_id, purpose_id, notice_version_id, channel, region, created_by, updated_by)
         values ($1, $2, $3, 'web', 'EU', $4, $4)`,
        [tenantId, purposeId, noticeVersionId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("consent_events is append-only and rejects a duplicate (tenant_id, idempotency_key)", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const purposeId = await seedPurpose(tenantId, actorId);
    const noticeId = await seedPrivacyNotice(tenantId, actorId);
    const noticeVersionId = await seedPrivacyNoticeVersion(tenantId, noticeId, actorId, 1);
    const consentPurpose = await pool.query(
      `insert into consent_purposes (tenant_id, purpose_id, notice_version_id, channel, region, created_by, updated_by)
       values ($1, $2, $3, 'web', 'EU', $4, $4) returning id`,
      [tenantId, purposeId, noticeVersionId, actorId]
    );
    const idempotencyKey = `g08-consent-event-${randomUUID()}`;
    const event = await pool.query(
      `insert into consent_events (tenant_id, subject_token, consent_purpose_id, event_type, source, proof_hash, idempotency_key, recorded_by)
       values ($1, $2, $3, 'granted', 'web-form', 'hash-1', $4, $5) returning id`,
      [tenantId, `subject-${randomUUID()}`, consentPurpose.rows[0].id, idempotencyKey, actorId]
    );

    await expect(
      pool.query(
        `insert into consent_events (tenant_id, subject_token, consent_purpose_id, event_type, source, proof_hash, idempotency_key, recorded_by)
         values ($1, $2, $3, 'withdrawn', 'web-form', 'hash-2', $4, $5)`,
        [tenantId, `subject-${randomUUID()}`, consentPurpose.rows[0].id, idempotencyKey, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);

    await expect(
      pool.query(`update consent_events set event_type = 'updated' where id = $1`, [event.rows[0].id])
    ).rejects.toThrow(/append-only/i);
  });
});

describe("G-08: incident_assessments/incident_notifications/retention_rules constraints", () => {
  it("rejects a duplicate (incident_id, jurisdiction, assessment_version_no)", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const incidentId = await seedPrivacyIncident(tenantId, actorId);
    await pool.query(
      `insert into incident_assessments (tenant_id, incident_id, jurisdiction, reportable, rationale, assessor_id, created_by, updated_by)
       values ($1, $2, 'EU', true, 'Meets breach threshold', $3, $3, $3)`,
      [tenantId, incidentId, actorId]
    );
    await expect(
      pool.query(
        `insert into incident_assessments (tenant_id, incident_id, jurisdiction, reportable, rationale, assessor_id, created_by, updated_by)
         values ($1, $2, 'EU', false, 'Reassessed', $3, $3, $3)`,
        [tenantId, incidentId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects an invalid incident_notifications recipient_type", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const incidentId = await seedPrivacyIncident(tenantId, actorId);
    await expect(
      pool.query(
        `insert into incident_notifications (tenant_id, incident_id, recipient_type, jurisdiction, due_at, created_by, updated_by)
         values ($1, $2, 'not_a_real_recipient', 'EU', now() + interval '3 days', $3, $3)`,
        [tenantId, incidentId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });

  it("rejects a non-positive duration_days on retention_rules", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const categoryId = await seedDataCategory(tenantId, actorId);
    await expect(
      pool.query(
        `insert into retention_rules (tenant_id, data_category_id, jurisdiction, retention_trigger, duration_days, disposition, created_by, updated_by)
         values ($1, $2, 'EU', 'contract_end', 0, 'delete', $3, $3)`,
        [tenantId, categoryId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });

  it("rejects an invalid retention_rules disposition", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const categoryId = await seedDataCategory(tenantId, actorId);
    await expect(
      pool.query(
        `insert into retention_rules (tenant_id, data_category_id, jurisdiction, retention_trigger, duration_days, disposition, created_by, updated_by)
         values ($1, $2, 'EU', 'contract_end', 365, 'not_a_real_disposition', $3, $3)`,
        [tenantId, categoryId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});
