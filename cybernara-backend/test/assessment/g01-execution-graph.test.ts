import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAnswerRevision,
  createApplicabilityDecision,
  createAssessmentScope,
  createAssessmentSignoff,
  createAssessmentSnapshot,
  createControlInstance,
  createControlTestResult,
  createQuestionSet,
  createQuestionVersion,
  createRequirementInstance,
  createReviewDecision,
  createTestProcedure
} from "../../src/modules/assessment/domain/execution-graph.js";
import { CANONICAL_CONTENT_TENANT_ID } from "../../src/modules/framework-content/public.js";

// G-01 Phase 1 (assessment execution normalization, 0013_g01_assessment_execution_normalization.sql):
// pure domain-function unit tests (no DB), plus real-Supabase integrity
// tests proving the new tables' constraints and append-only triggers
// actually reject bad data at the database layer, not just superficial
// "table exists" checks.

describe("G-01 domain: execution-graph pure functions", () => {
  it("createControlInstance starts pending/not_started with no score or maturity", () => {
    const instance = createControlInstance({
      tenantId: randomUUID(),
      assessmentId: randomUUID(),
      controlId: "HARM-1",
      frameworkKey: "SOC2",
      frameworkVersion: "v1",
      mappingVersion: "m1",
      ownerId: randomUUID()
    });
    expect(instance.applicabilityStatus).toBe("pending");
    expect(instance.status).toBe("not_started");
    expect(instance.score).toBeNull();
    expect(instance.maturity).toBeNull();
  });

  it("createApplicabilityDecision rejects a blank rationale", () => {
    expect(() =>
      createApplicabilityDecision({
        controlInstanceId: randomUUID(),
        applicable: true,
        rationale: "   ",
        decidedBy: randomUUID()
      })
    ).toThrow(/rationale/i);
  });

  it("createApplicabilityDecision rejects an approver who is the same principal as the decider", () => {
    const principal = randomUUID();
    expect(() =>
      createApplicabilityDecision({
        controlInstanceId: randomUUID(),
        applicable: true,
        rationale: "Applies to scoped systems.",
        decidedBy: principal,
        approvedBy: principal
      })
    ).toThrow(/different principal/i);
  });

  it("createAnswerRevision rejects a revision number below 1", () => {
    expect(() =>
      createAnswerRevision({
        assessmentItemId: randomUUID(),
        revision: 0,
        responseJson: { answerText: "x" },
        submittedBy: randomUUID()
      })
    ).toThrow(/revision/i);
  });

  it("createReviewDecision rejects a reviewer who is the same principal as the answer submitter", () => {
    const principal = randomUUID();
    expect(() =>
      createReviewDecision({
        assessmentItemId: randomUUID(),
        answerRevisionId: randomUUID(),
        reviewerId: principal,
        answerSubmittedBy: principal,
        approved: true
      })
    ).toThrow(/reviewer/i);
  });

  it("createReviewDecision requires a reason for a needs-changes decision", () => {
    expect(() =>
      createReviewDecision({
        assessmentItemId: randomUUID(),
        answerRevisionId: randomUUID(),
        reviewerId: randomUUID(),
        answerSubmittedBy: randomUUID(),
        approved: false
      })
    ).toThrow(/reason/i);
  });

  it("createAssessmentScope rejects period_end before period_start", () => {
    expect(() =>
      createAssessmentScope({
        tenantId: randomUUID(),
        name: "Q1 scope",
        periodStart: new Date("2026-06-01"),
        periodEnd: new Date("2026-01-01"),
        approvedBy: randomUUID()
      })
    ).toThrow(/period_end/i);
  });

  it("createAssessmentSnapshot rejects a sequence below 1", () => {
    expect(() =>
      createAssessmentSnapshot({
        assessmentId: randomUUID(),
        snapshotType: "created",
        sequence: 0,
        contentHash: "hash",
        snapshotPayload: {},
        createdBy: randomUUID()
      })
    ).toThrow(/sequence/i);
  });

  it("createRequirementInstance starts pending/uncovered/not_started", () => {
    const instance = createRequirementInstance({
      tenantId: randomUUID(),
      assessmentId: randomUUID(),
      requirementId: randomUUID(),
      ownerId: randomUUID()
    });
    expect(instance.applicabilityStatus).toBe("pending");
    expect(instance.coverageStatus).toBe("uncovered");
    expect(instance.status).toBe("not_started");
  });

  it("createQuestionSet rejects a blank question_set_key", () => {
    expect(() =>
      createQuestionSet({
        tenantId: randomUUID(),
        controlId: "HARM-1",
        questionSetKey: "   "
      })
    ).toThrow(/blank key/i);
  });

  it("createQuestionSet defaults source_type to curated", () => {
    const set = createQuestionSet({
      tenantId: randomUUID(),
      controlId: "HARM-1",
      questionSetKey: "q1"
    });
    expect(set.sourceType).toBe("curated");
  });

  it("createQuestionVersion rejects a version number below 1", () => {
    expect(() =>
      createQuestionVersion({
        tenantId: randomUUID(),
        questionSetId: randomUUID(),
        questionVersion: 0,
        payloadJson: {},
        checksum: "abc"
      })
    ).toThrow(/version/i);
  });

  it("createQuestionVersion defaults sourceAiQuestionVersionId to null", () => {
    const version = createQuestionVersion({
      tenantId: randomUUID(),
      questionSetId: randomUUID(),
      questionVersion: 1,
      payloadJson: {},
      checksum: "abc"
    });
    expect(version.sourceAiQuestionVersionId).toBeNull();
  });

  it("createAssessmentSignoff maps approved=false to a rejected decision", () => {
    const signoff = createAssessmentSignoff({
      assessmentId: randomUUID(),
      scopeType: "final",
      scopeId: randomUUID(),
      signerId: randomUUID(),
      approved: false
    });
    expect(signoff.decision).toBe("rejected");
  });

  it("createTestProcedure rejects a blank procedure key", () => {
    expect(() =>
      createTestProcedure({
        tenantId: randomUUID(),
        controlId: "HARM-1",
        procedureKey: "   ",
        method: "Inspect access review log for the period.",
        expectedResult: "Every access grant has a documented approver."
      })
    ).toThrow(/procedure key/i);
  });

  it("createTestProcedure rejects a blank method or expected result", () => {
    expect(() =>
      createTestProcedure({
        tenantId: randomUUID(),
        controlId: "HARM-1",
        procedureKey: "tp-1",
        method: "   ",
        expectedResult: "Every access grant has a documented approver."
      })
    ).toThrow(/method and an expected result/i);
  });

  it("createTestProcedure defaults status to active", () => {
    const procedure = createTestProcedure({
      tenantId: randomUUID(),
      controlId: "HARM-1",
      procedureKey: "tp-1",
      method: "Inspect access review log for the period.",
      expectedResult: "Every access grant has a documented approver."
    });
    expect(procedure.status).toBe("active");
  });

  it("createControlTestResult defaults population to null and sampleJson to an empty object", () => {
    const result = createControlTestResult({
      tenantId: randomUUID(),
      controlInstanceId: randomUUID(),
      testProcedureId: randomUUID(),
      result: "pass",
      testedBy: randomUUID()
    });
    expect(result.population).toBeNull();
    expect(result.sampleJson).toEqual({});
    expect(result.runId).toBeTruthy();
  });

  it("createControlTestResult generates a fresh runId on every call", () => {
    const shared = {
      tenantId: randomUUID(),
      controlInstanceId: randomUUID(),
      testProcedureId: randomUUID(),
      result: "fail" as const,
      testedBy: randomUUID()
    };
    const first = createControlTestResult(shared);
    const second = createControlTestResult(shared);
    expect(first.runId).not.toBe(second.runId);
  });
});

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("SUPABASE_DB_URL is not set; G-01 integrity tests must run against a real database.");
}

let pool: pg.Pool;

beforeAll(() => {
  pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
});

afterAll(async () => {
  await pool.end();
});

async function seedAssessment(): Promise<{ tenantId: string; assessmentId: string; actorId: string }> {
  const tenantId = randomUUID();
  const actorId = randomUUID();
  const assessment = await pool.query(
    `insert into assessments (tenant_id, scope_name, control_snapshot_version, period_start, period_end, created_by, updated_by)
     values ($1, $2, 'v1', '2026-01-01', '2026-12-31', $3, $3) returning id`,
    [tenantId, `g01-integrity-assessment-${randomUUID()}`, actorId]
  );
  return { tenantId, assessmentId: assessment.rows[0].id as string, actorId };
}

async function seedControlInstance(): Promise<{ tenantId: string; controlInstanceId: string; actorId: string }> {
  const { tenantId, assessmentId, actorId } = await seedAssessment();
  const instance = await pool.query(
    `insert into control_instances (
       tenant_id, assessment_id, control_id, framework_key, framework_version, mapping_version,
       owner_id, created_by, updated_by
     )
     values ($1, $2, 'HARM-1', 'SOC2', 'v1', 'm1', $3, $3, $3)
     returning id`,
    [tenantId, assessmentId, actorId]
  );
  return { tenantId, controlInstanceId: instance.rows[0].id as string, actorId };
}

async function seedAssessmentItem(): Promise<{ tenantId: string; itemId: string; actorId: string }> {
  const { tenantId, controlInstanceId, actorId } = await seedControlInstance();
  const instanceRow = await pool.query(`select assessment_id from control_instances where id = $1`, [
    controlInstanceId
  ]);
  // G-01 Constrain (0026): assessment_items.question_version_id is now NOT NULL — seed a real
  // question_sets/question_versions row too, matching what the live dual-write path does.
  const questionSet = await pool.query(
    `insert into question_sets (tenant_id, control_id, question_set_key, created_by, updated_by)
     values ($1, 'HARM-1', 'q1', $2, $2) returning id`,
    [tenantId, actorId]
  );
  const questionVersion = await pool.query(
    `insert into question_versions (tenant_id, question_set_id, question_version, payload_json, checksum, created_by, updated_by)
     values ($1, $2, 1, '{}'::jsonb, 'g01-execution-graph-checksum', $3, $3) returning id`,
    [tenantId, questionSet.rows[0].id, actorId]
  );
  const item = await pool.query(
    `insert into assessment_items (
       tenant_id, assessment_id, framework_key, framework_version, mapping_version,
       control_id, harmonized_control_id, question_version, owner_id, control_instance_id,
       question_version_id, created_by, updated_by
     )
     values ($1, $2, 'SOC2', 'v1', 'm1', 'CC1.1', 'HARM-1', 'q1', $3, $4, $5, $3, $3)
     returning id`,
    [tenantId, instanceRow.rows[0].assessment_id, actorId, controlInstanceId, questionVersion.rows[0].id]
  );
  return { tenantId, itemId: item.rows[0].id as string, actorId };
}

describe("G-01: control_instances constraints", () => {
  it("rejects a second control_instance for the same control on the same assessment", async () => {
    const { tenantId, assessmentId, actorId } = await seedAssessment();
    await pool.query(
      `insert into control_instances (tenant_id, assessment_id, control_id, framework_key, framework_version, mapping_version, owner_id, created_by, updated_by)
       values ($1, $2, 'HARM-1', 'SOC2', 'v1', 'm1', $3, $3, $3)`,
      [tenantId, assessmentId, actorId]
    );
    await expect(
      pool.query(
        `insert into control_instances (tenant_id, assessment_id, control_id, framework_key, framework_version, mapping_version, owner_id, created_by, updated_by)
         values ($1, $2, 'HARM-1', 'SOC2', 'v1', 'm1', $3, $3, $3)`,
        [tenantId, assessmentId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects an invalid applicability_status", async () => {
    const { tenantId, assessmentId, actorId } = await seedAssessment();
    await expect(
      pool.query(
        `insert into control_instances (tenant_id, assessment_id, control_id, framework_key, framework_version, mapping_version, owner_id, applicability_status, created_by, updated_by)
         values ($1, $2, 'HARM-1', 'SOC2', 'v1', 'm1', $3, 'not_a_real_status', $3, $3)`,
        [tenantId, assessmentId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});

describe("G-01: assessment_scopes constraints", () => {
  it("rejects a period_end before period_start", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    await expect(
      pool.query(
        `insert into assessment_scopes (tenant_id, name, period_start, period_end, approved_by, created_by, updated_by)
         values ($1, 'bad scope', '2026-06-01', '2026-01-01', $2, $2, $2)`,
        [tenantId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});

describe("G-01: applicability_decisions append-only + approver separation", () => {
  it("rejects an approver equal to the decider", async () => {
    const { tenantId, controlInstanceId, actorId } = await seedControlInstance();
    await expect(
      pool.query(
        `insert into applicability_decisions (tenant_id, control_instance_id, decision, rationale, decided_by, approved_by)
         values ($1, $2, 'applicable', 'self-approval attempt', $3, $3)`,
        [tenantId, controlInstanceId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });

  it("rejects an update to an existing applicability decision", async () => {
    const { tenantId, controlInstanceId, actorId } = await seedControlInstance();
    const decision = await pool.query(
      `insert into applicability_decisions (tenant_id, control_instance_id, decision, rationale, decided_by)
       values ($1, $2, 'applicable', 'applies to scoped systems', $3)
       returning id`,
      [tenantId, controlInstanceId, actorId]
    );
    await expect(
      pool.query(`update applicability_decisions set rationale = 'edited' where id = $1`, [decision.rows[0].id])
    ).rejects.toThrow(/append-only/i);
  });

  it("rejects a delete of an existing applicability decision", async () => {
    const { tenantId, controlInstanceId, actorId } = await seedControlInstance();
    const decision = await pool.query(
      `insert into applicability_decisions (tenant_id, control_instance_id, decision, rationale, decided_by)
       values ($1, $2, 'not_applicable', 'out of scope', $3)
       returning id`,
      [tenantId, controlInstanceId, actorId]
    );
    await expect(pool.query(`delete from applicability_decisions where id = $1`, [decision.rows[0].id])).rejects.toThrow(
      /append-only/i
    );
  });
});

describe("G-01: answer_revisions append-only + uniqueness", () => {
  it("rejects a second revision with the same revision number for the same item", async () => {
    const { tenantId, itemId, actorId } = await seedAssessmentItem();
    await pool.query(
      `insert into answer_revisions (tenant_id, assessment_item_id, revision, response_json, submitted_by)
       values ($1, $2, 1, $3::jsonb, $4)`,
      [tenantId, itemId, JSON.stringify({ answerText: "first" }), actorId]
    );
    await expect(
      pool.query(
        `insert into answer_revisions (tenant_id, assessment_item_id, revision, response_json, submitted_by)
         values ($1, $2, 1, $3::jsonb, $4)`,
        [tenantId, itemId, JSON.stringify({ answerText: "duplicate" }), actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects an update to an existing answer revision", async () => {
    const { tenantId, itemId, actorId } = await seedAssessmentItem();
    const revision = await pool.query(
      `insert into answer_revisions (tenant_id, assessment_item_id, revision, response_json, submitted_by)
       values ($1, $2, 1, $3::jsonb, $4) returning id`,
      [tenantId, itemId, JSON.stringify({ answerText: "original" }), actorId]
    );
    await expect(
      pool.query(`update answer_revisions set response_json = '{}'::jsonb where id = $1`, [revision.rows[0].id])
    ).rejects.toThrow(/append-only/i);
  });
});

describe("G-01: review_decisions reviewer separation + append-only", () => {
  it("rejects a review decision whose reviewer is the same principal as the answer submitter", async () => {
    const { tenantId, itemId, actorId } = await seedAssessmentItem();
    const revision = await pool.query(
      `insert into answer_revisions (tenant_id, assessment_item_id, revision, response_json, submitted_by)
       values ($1, $2, 1, $3::jsonb, $4) returning id`,
      [tenantId, itemId, JSON.stringify({ answerText: "answer" }), actorId]
    );
    await expect(
      pool.query(
        `insert into review_decisions (tenant_id, assessment_item_id, answer_revision_id, reviewer_id, decision)
         values ($1, $2, $3, $4, 'approved')`,
        [tenantId, itemId, revision.rows[0].id, actorId]
      )
    ).rejects.toThrow(/reviewer/i);
  });

  it("accepts a review decision from a distinct reviewer, and rejects any update to it", async () => {
    const { tenantId, itemId, actorId } = await seedAssessmentItem();
    const reviewerId = randomUUID();
    const revision = await pool.query(
      `insert into answer_revisions (tenant_id, assessment_item_id, revision, response_json, submitted_by)
       values ($1, $2, 1, $3::jsonb, $4) returning id`,
      [tenantId, itemId, JSON.stringify({ answerText: "answer" }), actorId]
    );
    const decision = await pool.query(
      `insert into review_decisions (tenant_id, assessment_item_id, answer_revision_id, reviewer_id, decision)
       values ($1, $2, $3, $4, 'approved') returning id`,
      [tenantId, itemId, revision.rows[0].id, reviewerId]
    );
    expect(decision.rows[0].id).toBeTruthy();
    await expect(
      pool.query(`update review_decisions set decision = 'needs_changes' where id = $1`, [decision.rows[0].id])
    ).rejects.toThrow(/append-only/i);
  });
});

describe("G-01: assessment_snapshots append-only + uniqueness", () => {
  it("rejects a second snapshot with the same sequence number for the same assessment", async () => {
    const { tenantId, assessmentId, actorId } = await seedAssessment();
    await pool.query(
      `insert into assessment_snapshots (tenant_id, assessment_id, snapshot_type, sequence, content_hash, created_by)
       values ($1, $2, 'created', 1, 'hash-1', $3)`,
      [tenantId, assessmentId, actorId]
    );
    await expect(
      pool.query(
        `insert into assessment_snapshots (tenant_id, assessment_id, snapshot_type, sequence, content_hash, created_by)
         values ($1, $2, 'reopened', 1, 'hash-2', $3)`,
        [tenantId, assessmentId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects a delete of an existing snapshot", async () => {
    const { tenantId, assessmentId, actorId } = await seedAssessment();
    const snapshot = await pool.query(
      `insert into assessment_snapshots (tenant_id, assessment_id, snapshot_type, sequence, content_hash, created_by)
       values ($1, $2, 'created', 1, 'hash-1', $3) returning id`,
      [tenantId, assessmentId, actorId]
    );
    await expect(pool.query(`delete from assessment_snapshots where id = $1`, [snapshot.rows[0].id])).rejects.toThrow(
      /append-only/i
    );
  });
});

describe("G-01 completion: requirement_instances constraints", () => {
  it("resolves against a real canonical-tenant framework_requirements row and rejects a duplicate", async () => {
    const { tenantId, assessmentId, actorId } = await seedAssessment();
    const requirement = await pool.query(
      `select id from framework_requirements where tenant_id = $1 limit 1`,
      [CANONICAL_CONTENT_TENANT_ID]
    );
    expect(requirement.rows.length).toBe(1);
    const requirementId = requirement.rows[0].id as string;

    await pool.query(
      `insert into requirement_instances (tenant_id, assessment_id, requirement_id, owner_id, created_by, updated_by)
       values ($1, $2, $3, $4, $4, $4)`,
      [tenantId, assessmentId, requirementId, actorId]
    );
    await expect(
      pool.query(
        `insert into requirement_instances (tenant_id, assessment_id, requirement_id, owner_id, created_by, updated_by)
         values ($1, $2, $3, $4, $4, $4)`,
        [tenantId, assessmentId, requirementId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects a requirement_id that does not exist in framework_requirements", async () => {
    const { tenantId, assessmentId, actorId } = await seedAssessment();
    await expect(
      pool.query(
        `insert into requirement_instances (tenant_id, assessment_id, requirement_id, owner_id, created_by, updated_by)
         values ($1, $2, $3, $4, $4, $4)`,
        [tenantId, assessmentId, randomUUID(), actorId]
      )
    ).rejects.toThrow(/foreign key|violates/i);
  });
});

describe("G-01 completion: question_sets uniqueness", () => {
  it("rejects a second question set with the same control_id + question_set_key for the same tenant", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    await pool.query(
      `insert into question_sets (tenant_id, control_id, question_set_key, created_by, updated_by)
       values ($1, 'HARM-1', 'q1', $2, $2)`,
      [tenantId, actorId]
    );
    await expect(
      pool.query(
        `insert into question_sets (tenant_id, control_id, question_set_key, created_by, updated_by)
         values ($1, 'HARM-1', 'q1', $2, $2)`,
        [tenantId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });
});

describe("G-01 completion: question_versions uniqueness + immutable-once-approved", () => {
  async function seedQuestionSet(): Promise<{ tenantId: string; questionSetId: string; actorId: string }> {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const set = await pool.query(
      `insert into question_sets (tenant_id, control_id, question_set_key, created_by, updated_by)
       values ($1, 'HARM-1', 'q1', $2, $2) returning id`,
      [tenantId, actorId]
    );
    return { tenantId, questionSetId: set.rows[0].id as string, actorId };
  }

  it("rejects a second version with the same question_version number for the same question set", async () => {
    const { tenantId, questionSetId, actorId } = await seedQuestionSet();
    await pool.query(
      `insert into question_versions (tenant_id, question_set_id, question_version, payload_json, checksum, created_by, updated_by)
       values ($1, $2, 1, '{}'::jsonb, 'sum1', $3, $3)`,
      [tenantId, questionSetId, actorId]
    );
    await expect(
      pool.query(
        `insert into question_versions (tenant_id, question_set_id, question_version, payload_json, checksum, created_by, updated_by)
         values ($1, $2, 1, '{}'::jsonb, 'sum2', $3, $3)`,
        [tenantId, questionSetId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("allows editing a draft version, but rejects any update once approved_at is set", async () => {
    const { tenantId, questionSetId, actorId } = await seedQuestionSet();
    const version = await pool.query(
      `insert into question_versions (tenant_id, question_set_id, question_version, payload_json, checksum, created_by, updated_by)
       values ($1, $2, 1, '{}'::jsonb, 'sum1', $3, $3) returning id`,
      [tenantId, questionSetId, actorId]
    );
    const versionId = version.rows[0].id as string;

    await pool.query(`update question_versions set checksum = 'sum1-edited' where id = $1`, [versionId]);

    await pool.query(
      `update question_versions set approved_by = $2, approved_at = now(), status = 'approved' where id = $1`,
      [versionId, actorId]
    );
    await expect(
      pool.query(`update question_versions set checksum = 'sum1-after-approval' where id = $1`, [versionId])
    ).rejects.toThrow(/immutable/i);
  });
});

describe("G-01 completion: assessment_signoffs constraints", () => {
  it("rejects a second signoff for the same assessment + scope_type + scope_id", async () => {
    const { tenantId, assessmentId, actorId } = await seedAssessment();
    await pool.query(
      `insert into assessment_signoffs (tenant_id, assessment_id, scope_type, scope_id, signer_id, decision, created_by, updated_by)
       values ($1, $2, 'final', $2, $3, 'approved', $3, $3)`,
      [tenantId, assessmentId, actorId]
    );
    await expect(
      pool.query(
        `insert into assessment_signoffs (tenant_id, assessment_id, scope_type, scope_id, signer_id, decision, created_by, updated_by)
         values ($1, $2, 'final', $2, $3, 'rejected', $3, $3)`,
        [tenantId, assessmentId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects an invalid scope_type", async () => {
    const { tenantId, assessmentId, actorId } = await seedAssessment();
    await expect(
      pool.query(
        `insert into assessment_signoffs (tenant_id, assessment_id, scope_type, scope_id, signer_id, decision, created_by, updated_by)
         values ($1, $2, 'bogus', $2, $3, 'approved', $3, $3)`,
        [tenantId, assessmentId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });

  it("rejects an invalid decision", async () => {
    const { tenantId, assessmentId, actorId } = await seedAssessment();
    await expect(
      pool.query(
        `insert into assessment_signoffs (tenant_id, assessment_id, scope_type, scope_id, signer_id, decision, created_by, updated_by)
         values ($1, $2, 'final', $2, $3, 'bogus', $3, $3)`,
        [tenantId, assessmentId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});

// G-01 Backfill stage: scripts/backfill-g01-execution-graph.mjs's value-mapping/reconstruction
// logic (harmonized_control_id -> control_instances.control_id, legacy applicability/answer_text
// -> real applicability_decisions/answer_revisions rows, blank-rationale skip, etc.) is proven by
// the pure derivation-function unit tests in test/assessment/g01-backfill-derivation.test.ts.
//
// The "seed a literal legacy-null row, then run backfillItem against it" DB-integration scenario
// that used to live here is no longer constructible against the live schema: migration 0026 (G-01
// Constrain) made assessment_items.control_instance_id/question_version_id NOT NULL, so no insert —
// not even this admin pool's own raw SQL — can produce a row in that state anymore. That is the
// intended, durable guarantee Constrain exists to provide, not a gap in coverage: the one-time
// production backfill run that actually fixed every pre-existing null row is documented in
// docs/schema-remediation-progress.md with real before/after counts, independently reconciled to
// zero remaining nulls both by the script's own check and a separate follow-up query.
//
// What's still real and worth testing against the live database post-Constrain: that re-running
// backfillItem against a row which already has both columns set is a safe no-op (protects against
// ever accidentally double-processing a row if the script were mistakenly re-run in the future).
describe("G-01 Backfill: backfillItem safety against an already-linked row (the only reachable state post-Constrain)", () => {
  it("is a no-op when control_instance_id/question_version_id are already set, even though applicability/answer_text are populated", async () => {
    const { backfillItem } = await import("../../scripts/backfill-g01-execution-graph.mjs");
    const { tenantId, itemId, actorId } = await seedAssessmentItem();
    const applicability = {
      applicable: true,
      rationale: "In scope for this control period.",
      approvedBy: actorId,
      approvedAt: new Date("2026-03-01T00:00:00.000Z")
    };
    await pool.query(
      `update assessment_items set answer_text = $1, applicability = $2::jsonb where tenant_id = $3 and id = $4`,
      ["We enforce MFA for all admin accounts.", JSON.stringify(applicability), tenantId, itemId]
    );

    const summary = {
      rowsExamined: 0,
      controlInstancesLinked: 0,
      questionVersionsLinked: 0,
      applicabilityDecisionsBackfilled: 0,
      answerRevisionsBackfilled: 0,
      applicabilitySkippedBlankRationale: 0
    };
    await backfillItem(pool, itemId, summary);

    expect(summary.controlInstancesLinked).toBe(0);
    expect(summary.questionVersionsLinked).toBe(0);
    expect(summary.applicabilityDecisionsBackfilled).toBe(0);
    expect(summary.answerRevisionsBackfilled).toBe(0);

    const decision = await pool.query(`select id from applicability_decisions where control_instance_id in (
      select control_instance_id from assessment_items where tenant_id = $1 and id = $2
    )`, [tenantId, itemId]);
    expect(decision.rows).toHaveLength(0);
  });
});
