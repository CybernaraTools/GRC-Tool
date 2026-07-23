import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAccessReviewDecision,
  createAccessReviewItem,
  createAuditRequest,
  createAuditTest,
  createPolicyAttestation,
  createPolicyControlLink,
  createPolicyRecord,
  createVendorAssessment,
  createVendorFinding
} from "../../src/modules/enterprise-grc/domain/grc.js";

// G-09 Phase 1 (enterprise GRC depth, migration
// 0019_g09_enterprise_grc_risk_register.sql): pure domain-function unit
// tests plus real-Supabase integrity tests for the policy attestation model,
// access-review item, vendor assessment, and audit request/test tables the
// gap report names directly.

describe("G-09 domain: policy/access-review/vendor/audit pure functions", () => {
  it("createPolicyRecord rejects a blank policy key", () => {
    expect(() =>
      createPolicyRecord({ tenantId: randomUUID(), policyKey: "  ", title: "x", ownerId: randomUUID(), category: "security" })
    ).toThrow(/policy key/i);
  });

  it("createPolicyControlLink defaults coverage to full", () => {
    const link = createPolicyControlLink({ tenantId: randomUUID(), policyVersionId: randomUUID(), controlId: "CC1.1" });
    expect(link.coverage).toBe("full");
  });

  it("createPolicyAttestation rejects a missing user", () => {
    expect(() =>
      createPolicyAttestation({
        tenantId: randomUUID(),
        policyVersionId: randomUUID(),
        userId: "",
        decision: "attested",
        evidenceHash: "hash"
      })
    ).toThrow(/user/i);
  });

  it("createAccessReviewItem rejects blank references", () => {
    expect(() =>
      createAccessReviewItem({
        tenantId: randomUUID(),
        accessReviewId: randomUUID(),
        principalRef: "  ",
        resourceRef: "res",
        entitlementRef: "ent"
      })
    ).toThrow(/references/i);
  });

  it("createAccessReviewDecision rejects a missing reviewer", () => {
    expect(() =>
      createAccessReviewDecision({ tenantId: randomUUID(), reviewItemId: randomUUID(), reviewerId: "", decision: "approved" })
    ).toThrow(/reviewer/i);
  });

  it("createVendorAssessment rejects a score outside 0-100", () => {
    expect(() =>
      createVendorAssessment({
        tenantId: randomUUID(),
        vendorId: randomUUID(),
        assessmentType: "onboarding",
        period: "2027-Q1",
        reviewerId: randomUUID(),
        score: 150
      })
    ).toThrow(/score must be between 0 and 100/i);
  });

  it("createVendorFinding rejects a blank title", () => {
    expect(() =>
      createVendorFinding({ tenantId: randomUUID(), vendorAssessmentId: randomUUID(), severity: "high", title: "  " })
    ).toThrow(/title/i);
  });

  it("createAuditRequest rejects a blank requestedFrom", () => {
    expect(() =>
      createAuditRequest({
        tenantId: randomUUID(),
        auditEngagementId: randomUUID(),
        requestedFrom: "  ",
        dueAt: new Date("2027-01-01")
      })
    ).toThrow(/requested from/i);
  });

  it("createAuditTest starts with a not_tested conclusion", () => {
    const test = createAuditTest({ tenantId: randomUUID(), auditEngagementId: randomUUID(), procedure: "Sample 25 access logs" });
    expect(test.conclusion).toBe("not_tested");
  });
});

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("SUPABASE_DB_URL is not set; G-09 integrity tests must run against a real database.");
}

let pool: pg.Pool;

beforeAll(() => {
  pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
});

afterAll(async () => {
  await pool.end();
});

async function seedPolicyVersion(): Promise<{ tenantId: string; policyVersionId: string; actorId: string }> {
  const tenantId = randomUUID();
  const actorId = randomUUID();
  const version = await pool.query(
    `insert into policy_versions (tenant_id, template_key, title, policy_version, status, content_hash, created_by, updated_by)
     values ($1, 'acceptable-use', 'Acceptable Use Policy', 'v1', 'draft', 'hash', $2, $2) returning id`,
    [tenantId, actorId]
  );
  return { tenantId, policyVersionId: version.rows[0].id as string, actorId };
}

async function seedAccessReview(): Promise<{ tenantId: string; accessReviewId: string; actorId: string }> {
  const tenantId = randomUUID();
  const actorId = randomUUID();
  const review = await pool.query(
    `insert into access_reviews (tenant_id, population_source, certifier_id, created_by, updated_by)
     values ($1, 'okta-export', $2, $2, $2) returning id`,
    [tenantId, actorId]
  );
  return { tenantId, accessReviewId: review.rows[0].id as string, actorId };
}

async function seedVendor(): Promise<{ tenantId: string; vendorId: string; actorId: string }> {
  const tenantId = randomUUID();
  const actorId = randomUUID();
  const vendor = await pool.query(
    `insert into vendors (
       tenant_id, name, tier, systems, contract_ids, control_ids, incident_ids,
       questionnaire_ids, monitoring_findings, renewal_at, created_by, updated_by
     )
     values ($1, 'Acme Cloud', 'high', array['prod-db'], array['c-1'], array[]::text[], array[]::text[],
             array[]::text[], array[]::text[], '2027-01-01', $2, $2)
     returning id`,
    [tenantId, actorId]
  );
  return { tenantId, vendorId: vendor.rows[0].id as string, actorId };
}

async function seedAuditEngagement(): Promise<{ tenantId: string; auditEngagementId: string; actorId: string }> {
  const tenantId = randomUUID();
  const actorId = randomUUID();
  const engagement = await pool.query(
    `insert into audit_engagements (tenant_id, name, status, request_list_ids, evidence_ids, created_by, updated_by)
     values ($1, 'SOC 2 Type II', 'planned', array['req-1'], array[]::uuid[], $2, $2) returning id`,
    [tenantId, actorId]
  );
  return { tenantId, auditEngagementId: engagement.rows[0].id as string, actorId };
}

describe("G-09: policies (stable identity) constraints", () => {
  it("rejects a duplicate (tenant_id, policy_key)", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    await pool.query(
      `insert into policies (tenant_id, policy_key, title, owner_id, category, created_by, updated_by)
       values ($1, 'acceptable-use', 'Acceptable Use Policy', $2, 'security', $2, $2)`,
      [tenantId, actorId]
    );
    await expect(
      pool.query(
        `insert into policies (tenant_id, policy_key, title, owner_id, category, created_by, updated_by)
         values ($1, 'acceptable-use', 'Duplicate', $2, 'security', $2, $2)`,
        [tenantId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });
});

describe("G-09: policy_control_links constraints", () => {
  it("rejects a duplicate (policy_version_id, control_id)", async () => {
    const { tenantId, policyVersionId, actorId } = await seedPolicyVersion();
    await pool.query(
      `insert into policy_control_links (tenant_id, policy_version_id, control_id, created_by, updated_by)
       values ($1, $2, 'CC1.1', $3, $3)`,
      [tenantId, policyVersionId, actorId]
    );
    await expect(
      pool.query(
        `insert into policy_control_links (tenant_id, policy_version_id, control_id, created_by, updated_by)
         values ($1, $2, 'CC1.1', $3, $3)`,
        [tenantId, policyVersionId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects an invalid coverage value", async () => {
    const { tenantId, policyVersionId, actorId } = await seedPolicyVersion();
    await expect(
      pool.query(
        `insert into policy_control_links (tenant_id, policy_version_id, control_id, coverage, created_by, updated_by)
         values ($1, $2, 'CC1.2', 'mostly', $3, $3)`,
        [tenantId, policyVersionId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});

describe("G-09: policy_attestations append-only + uniqueness", () => {
  it("rejects a duplicate (policy_version_id, user_id) and rejects mutation", async () => {
    const { tenantId, policyVersionId, actorId } = await seedPolicyVersion();
    const attestation = await pool.query(
      `insert into policy_attestations (tenant_id, policy_version_id, user_id, decision, evidence_hash)
       values ($1, $2, $3, 'attested', 'hash-1') returning id`,
      [tenantId, policyVersionId, actorId]
    );
    await expect(
      pool.query(
        `insert into policy_attestations (tenant_id, policy_version_id, user_id, decision, evidence_hash)
         values ($1, $2, $3, 'attested', 'hash-2')`,
        [tenantId, policyVersionId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
    await expect(
      pool.query(`update policy_attestations set decision = 'declined' where id = $1`, [attestation.rows[0].id])
    ).rejects.toThrow(/append-only/i);
  });
});

describe("G-09: access_review_items constraints", () => {
  it("rejects a duplicate (access_review_id, principal_ref, resource_ref, entitlement_ref)", async () => {
    const { tenantId, accessReviewId, actorId } = await seedAccessReview();
    await pool.query(
      `insert into access_review_items (tenant_id, access_review_id, principal_ref, resource_ref, entitlement_ref, created_by, updated_by)
       values ($1, $2, 'user:alice', 'db:prod', 'role:admin', $3, $3)`,
      [tenantId, accessReviewId, actorId]
    );
    await expect(
      pool.query(
        `insert into access_review_items (tenant_id, access_review_id, principal_ref, resource_ref, entitlement_ref, created_by, updated_by)
         values ($1, $2, 'user:alice', 'db:prod', 'role:admin', $3, $3)`,
        [tenantId, accessReviewId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });
});

describe("G-09: access_review_decisions append-only", () => {
  it("rejects a mutation to an existing decision", async () => {
    const { tenantId, accessReviewId, actorId } = await seedAccessReview();
    const item = await pool.query(
      `insert into access_review_items (tenant_id, access_review_id, principal_ref, resource_ref, entitlement_ref, created_by, updated_by)
       values ($1, $2, 'user:bob', 'db:prod', 'role:read', $3, $3) returning id`,
      [tenantId, accessReviewId, actorId]
    );
    const decision = await pool.query(
      `insert into access_review_decisions (tenant_id, review_item_id, reviewer_id, decision)
       values ($1, $2, $3, 'approved') returning id`,
      [tenantId, item.rows[0].id, actorId]
    );
    await expect(
      pool.query(`update access_review_decisions set decision = 'revoked' where id = $1`, [decision.rows[0].id])
    ).rejects.toThrow(/append-only/i);
  });

  it("rejects an invalid decision value", async () => {
    const { tenantId, accessReviewId, actorId } = await seedAccessReview();
    const item = await pool.query(
      `insert into access_review_items (tenant_id, access_review_id, principal_ref, resource_ref, entitlement_ref, created_by, updated_by)
       values ($1, $2, 'user:carol', 'db:prod', 'role:read', $3, $3) returning id`,
      [tenantId, accessReviewId, actorId]
    );
    await expect(
      pool.query(
        `insert into access_review_decisions (tenant_id, review_item_id, reviewer_id, decision)
         values ($1, $2, $3, 'maybe')`,
        [tenantId, item.rows[0].id, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});

describe("G-09: vendor_assessments constraints", () => {
  it("rejects a duplicate (vendor_id, assessment_type, period)", async () => {
    const { tenantId, vendorId, actorId } = await seedVendor();
    await pool.query(
      `insert into vendor_assessments (tenant_id, vendor_id, assessment_type, period, reviewer_id, created_by, updated_by)
       values ($1, $2, 'onboarding', '2027-Q1', $3, $3, $3)`,
      [tenantId, vendorId, actorId]
    );
    await expect(
      pool.query(
        `insert into vendor_assessments (tenant_id, vendor_id, assessment_type, period, reviewer_id, created_by, updated_by)
         values ($1, $2, 'onboarding', '2027-Q1', $3, $3, $3)`,
        [tenantId, vendorId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });
});

describe("G-09: vendor_findings constraints", () => {
  it("rejects an invalid severity", async () => {
    const { tenantId, vendorId, actorId } = await seedVendor();
    const assessment = await pool.query(
      `insert into vendor_assessments (tenant_id, vendor_id, assessment_type, period, reviewer_id, created_by, updated_by)
       values ($1, $2, 'renewal', '2027-Q2', $3, $3, $3) returning id`,
      [tenantId, vendorId, actorId]
    );
    await expect(
      pool.query(
        `insert into vendor_findings (tenant_id, vendor_assessment_id, severity, title, created_by, updated_by)
         values ($1, $2, 'extreme', 'title', $3, $3)`,
        [tenantId, assessment.rows[0].id, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});

describe("G-09: audit_requests constraints", () => {
  it("rejects a duplicate (audit_engagement_id, control_id, requested_from)", async () => {
    const { tenantId, auditEngagementId, actorId } = await seedAuditEngagement();
    await pool.query(
      `insert into audit_requests (tenant_id, audit_engagement_id, control_id, requested_from, due_at, created_by, updated_by)
       values ($1, $2, 'CC1.1', 'it-team@acme.test', '2027-06-01', $3, $3)`,
      [tenantId, auditEngagementId, actorId]
    );
    await expect(
      pool.query(
        `insert into audit_requests (tenant_id, audit_engagement_id, control_id, requested_from, due_at, created_by, updated_by)
         values ($1, $2, 'CC1.1', 'it-team@acme.test', '2027-07-01', $3, $3)`,
        [tenantId, auditEngagementId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });
});

describe("G-09: audit_tests constraints", () => {
  it("accepts a test linked to a real control_instance and rejects an invalid conclusion", async () => {
    const { tenantId, auditEngagementId, actorId } = await seedAuditEngagement();
    const assessment = await pool.query(
      `insert into assessments (tenant_id, scope_name, control_snapshot_version, period_start, period_end, created_by, updated_by)
       values ($1, $2, 'v1', '2026-01-01', '2026-12-31', $3, $3) returning id`,
      [tenantId, `g09-audit-test-assessment-${randomUUID()}`, actorId]
    );
    const controlInstance = await pool.query(
      `insert into control_instances (tenant_id, assessment_id, control_id, framework_key, framework_version, mapping_version, owner_id, created_by, updated_by)
       values ($1, $2, 'CC1.1', 'SOC2', 'v1', 'm1', $3, $3, $3) returning id`,
      [tenantId, assessment.rows[0].id, actorId]
    );
    const test = await pool.query(
      `insert into audit_tests (tenant_id, audit_engagement_id, control_instance_id, procedure, created_by, updated_by)
       values ($1, $2, $3, 'Sample 25 access logs', $4, $4) returning id`,
      [tenantId, auditEngagementId, controlInstance.rows[0].id, actorId]
    );
    expect(test.rows[0].id).toBeTruthy();

    await expect(
      pool.query(
        `insert into audit_tests (tenant_id, audit_engagement_id, control_instance_id, procedure, conclusion, created_by, updated_by)
         values ($1, $2, $3, 'Second procedure', 'inconclusive', $4, $4)`,
        [tenantId, auditEngagementId, controlInstance.rows[0].id, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});
