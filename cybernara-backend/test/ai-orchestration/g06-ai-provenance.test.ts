import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAiPublicationEvent,
  createEvaluationCase,
  createEvaluationResult,
  createEvaluationSuite,
  createGenerationCitation,
  createKnowledgeChunk,
  createRetrievalRun,
  createRetrievedChunk,
  createSafetyCheck
} from "../../src/modules/ai-orchestration/domain/governance.js";

// G-06 Phase 1 (AI provenance lineage, migration 0020_g06_ai_provenance_lineage.sql): pure
// domain-function unit tests plus real-Supabase integrity tests proving the 9 new tables'
// constraints actually reject bad data at the database layer.

describe("G-06 domain: AI provenance pure functions", () => {
  it("createKnowledgeChunk rejects a blank source id", () => {
    expect(() =>
      createKnowledgeChunk({
        tenantId: randomUUID(),
        retrievalIndexId: randomUUID(),
        sourceType: "framework_requirement",
        sourceId: "  ",
        sourceVersion: "v1",
        contentHash: "hash",
        textUri: "s3://x"
      })
    ).toThrow(/source id/i);
  });

  it("createRetrievalRun rejects a top_k outside 1-50", () => {
    expect(() =>
      createRetrievalRun({
        tenantId: randomUUID(),
        queryHash: "hash",
        retrievalIndexId: randomUUID(),
        topK: 100
      })
    ).toThrow(/top_k/i);
  });

  it("createRetrievedChunk rejects a rank below 1", () => {
    expect(() =>
      createRetrievedChunk({
        tenantId: randomUUID(),
        retrievalRunId: randomUUID(),
        knowledgeChunkId: randomUUID(),
        rank: 0,
        score: 0.5,
        aclDecision: "allowed"
      })
    ).toThrow(/rank/i);
  });

  it("createGenerationCitation rejects an entailment score outside [0,1]", () => {
    expect(() =>
      createGenerationCitation({
        tenantId: randomUUID(),
        generationRunId: randomUUID(),
        outputPath: "questions[0].text",
        knowledgeChunkId: randomUUID(),
        entailmentScore: 1.5
      })
    ).toThrow(/entailment score/i);
  });

  it("createSafetyCheck rejects a blank policy version", () => {
    expect(() =>
      createSafetyCheck({
        tenantId: randomUUID(),
        generationRunId: randomUUID(),
        checkType: "prompt_injection",
        policyVersion: "  ",
        result: "pass"
      })
    ).toThrow(/policy version/i);
  });

  it("createEvaluationSuite starts in draft status", () => {
    const suite = createEvaluationSuite({
      tenantId: randomUUID(),
      useCase: "assessment_question",
      suiteKey: "golden-set",
      suiteVersion: "v1"
    });
    expect(suite.status).toBe("draft");
  });

  it("createEvaluationCase rejects a blank input fixture URI", () => {
    expect(() =>
      createEvaluationCase({
        tenantId: randomUUID(),
        suiteId: randomUUID(),
        caseKey: "case-1",
        inputFixtureUri: "  "
      })
    ).toThrow(/input fixture/i);
  });

  it("createEvaluationResult derives passed from score >= threshold", () => {
    const passing = createEvaluationResult({
      tenantId: randomUUID(),
      evaluationRunId: randomUUID(),
      caseId: randomUUID(),
      metric: "citation_accuracy",
      score: 0.9,
      threshold: 0.8
    });
    expect(passing.passed).toBe(true);

    const failing = createEvaluationResult({
      tenantId: randomUUID(),
      evaluationRunId: randomUUID(),
      caseId: randomUUID(),
      metric: "citation_accuracy",
      score: 0.5,
      threshold: 0.8
    });
    expect(failing.passed).toBe(false);
  });

  it("createAiPublicationEvent rejects a missing approver", () => {
    expect(() =>
      createAiPublicationEvent({
        tenantId: randomUUID(),
        targetType: "ai_question_version",
        targetId: randomUUID(),
        approvedVersionId: randomUUID(),
        approverId: ""
      })
    ).toThrow(/approver/i);
  });
});

if (!process.env.SUPABASE_DB_URL) {
  throw new Error("SUPABASE_DB_URL is not set; G-06 integrity tests must run against a real database.");
}

let pool: pg.Pool;

beforeAll(() => {
  pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
});

afterAll(async () => {
  await pool.end();
});

async function seedRetrievalIndex(): Promise<{ tenantId: string; retrievalIndexId: string; actorId: string }> {
  const tenantId = randomUUID();
  const actorId = randomUUID();
  const index = await pool.query(
    `insert into ai_retrieval_indexes (tenant_id, index_key, index_version, created_by, updated_by)
     values ($1, 'tenant-control-index', $2, $3, $3) returning id`,
    [tenantId, `g06-${randomUUID()}`, actorId]
  );
  return { tenantId, retrievalIndexId: index.rows[0].id as string, actorId };
}

async function seedKnowledgeChunk(): Promise<{ tenantId: string; knowledgeChunkId: string; retrievalIndexId: string; actorId: string }> {
  const { tenantId, retrievalIndexId, actorId } = await seedRetrievalIndex();
  const chunk = await pool.query(
    `insert into knowledge_chunks (tenant_id, retrieval_index_id, source_type, source_id, source_version, content_hash, text_uri, created_by, updated_by)
     values ($1, $2, 'framework_requirement', $3, 'v1', $4, 's3://chunk', $5, $5) returning id`,
    [tenantId, retrievalIndexId, `req-${randomUUID()}`, `hash-${randomUUID()}`, actorId]
  );
  return { tenantId, knowledgeChunkId: chunk.rows[0].id as string, retrievalIndexId, actorId };
}

async function seedGenerationRun(): Promise<{ tenantId: string; generationRunId: string; actorId: string }> {
  const { tenantId, retrievalIndexId, actorId } = await seedRetrievalIndex();
  const prompt = await pool.query(
    `insert into ai_prompt_versions (tenant_id, prompt_key, prompt_version, template_sha256, status, created_by, updated_by)
     values ($1, 'question-generator', $2, 'sha', 'approved', $3, $3) returning id`,
    [tenantId, `v-${randomUUID()}`, actorId]
  );
  const model = await pool.query(
    `insert into ai_model_deployments (
       tenant_id, provider, model_name, deployment_version, region, risk_tier, no_training, status, created_by, updated_by
     )
     values ($1, 'openai', 'gateway-model', $2, 'us', 'high', true, 'approved', $3, $3)
     returning id`,
    [tenantId, `v-${randomUUID()}`, actorId]
  );
  const run = await pool.query(
    `insert into ai_generation_runs (
       tenant_id, use_case, status, actor_id, prompt_version_id, model_deployment_id, retrieval_index_id,
       generation_parameters, input_fingerprint, output_fingerprint, created_by, updated_by
     )
     values ($1, 'assessment_question', 'awaiting_review', $2, $3, $4, $5, '{}'::jsonb, 'in', 'out', $2, $2)
     returning id`,
    [tenantId, actorId, prompt.rows[0].id, model.rows[0].id, retrievalIndexId]
  );
  return { tenantId, generationRunId: run.rows[0].id as string, actorId };
}

describe("G-06: knowledge_chunks constraints", () => {
  it("rejects a duplicate (retrieval_index_id, source_id, content_hash)", async () => {
    const { tenantId, retrievalIndexId, actorId } = await seedRetrievalIndex();
    const sourceId = `req-${randomUUID()}`;
    const contentHash = `hash-${randomUUID()}`;
    await pool.query(
      `insert into knowledge_chunks (tenant_id, retrieval_index_id, source_type, source_id, source_version, content_hash, text_uri, created_by, updated_by)
       values ($1, $2, 'framework_requirement', $3, 'v1', $4, 's3://chunk', $5, $5)`,
      [tenantId, retrievalIndexId, sourceId, contentHash, actorId]
    );
    await expect(
      pool.query(
        `insert into knowledge_chunks (tenant_id, retrieval_index_id, source_type, source_id, source_version, content_hash, text_uri, created_by, updated_by)
         values ($1, $2, 'framework_requirement', $3, 'v2', $4, 's3://chunk2', $5, $5)`,
        [tenantId, retrievalIndexId, sourceId, contentHash, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });
});

describe("G-06: retrieval_runs constraints", () => {
  it("rejects a top_k outside 1-50", async () => {
    const { tenantId, retrievalIndexId, actorId } = await seedRetrievalIndex();
    await expect(
      pool.query(
        `insert into retrieval_runs (tenant_id, query_hash, retrieval_index_id, top_k, created_by, updated_by)
         values ($1, 'hash', $2, 100, $3, $3)`,
        [tenantId, retrievalIndexId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});

describe("G-06: retrieved_chunks constraints", () => {
  it("rejects a duplicate rank and a duplicate chunk within the same run", async () => {
    const { tenantId, knowledgeChunkId, retrievalIndexId, actorId } = await seedKnowledgeChunk();
    const run = await pool.query(
      `insert into retrieval_runs (tenant_id, query_hash, retrieval_index_id, top_k, created_by, updated_by)
       values ($1, 'hash', $2, 10, $3, $3) returning id`,
      [tenantId, retrievalIndexId, actorId]
    );
    await pool.query(
      `insert into retrieved_chunks (tenant_id, retrieval_run_id, knowledge_chunk_id, rank, score, acl_decision, created_by, updated_by)
       values ($1, $2, $3, 1, 0.9, 'allowed', $4, $4)`,
      [tenantId, run.rows[0].id, knowledgeChunkId, actorId]
    );
    await expect(
      pool.query(
        `insert into retrieved_chunks (tenant_id, retrieval_run_id, knowledge_chunk_id, rank, score, acl_decision, created_by, updated_by)
         values ($1, $2, $3, 1, 0.5, 'allowed', $4, $4)`,
        [tenantId, run.rows[0].id, randomUUID(), actorId]
      )
    ).rejects.toThrow(/duplicate key|unique|foreign key/i);
  });

  it("rejects an invalid acl_decision", async () => {
    const { tenantId, knowledgeChunkId, retrievalIndexId, actorId } = await seedKnowledgeChunk();
    const run = await pool.query(
      `insert into retrieval_runs (tenant_id, query_hash, retrieval_index_id, top_k, created_by, updated_by)
       values ($1, 'hash', $2, 10, $3, $3) returning id`,
      [tenantId, retrievalIndexId, actorId]
    );
    await expect(
      pool.query(
        `insert into retrieved_chunks (tenant_id, retrieval_run_id, knowledge_chunk_id, rank, score, acl_decision, created_by, updated_by)
         values ($1, $2, $3, 1, 0.5, 'maybe', $4, $4)`,
        [tenantId, run.rows[0].id, knowledgeChunkId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});

describe("G-06: generation_citations constraints", () => {
  it("rejects a duplicate (generation_run_id, output_path, knowledge_chunk_id)", async () => {
    const { tenantId, generationRunId, actorId } = await seedGenerationRun();
    const chunk = await seedKnowledgeChunk();
    await pool.query(
      `insert into generation_citations (tenant_id, generation_run_id, output_path, knowledge_chunk_id, created_by, updated_by)
       values ($1, $2, 'questions[0].text', $3, $4, $4)`,
      [tenantId, generationRunId, chunk.knowledgeChunkId, actorId]
    );
    await expect(
      pool.query(
        `insert into generation_citations (tenant_id, generation_run_id, output_path, knowledge_chunk_id, created_by, updated_by)
         values ($1, $2, 'questions[0].text', $3, $4, $4)`,
        [tenantId, generationRunId, chunk.knowledgeChunkId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });
});

describe("G-06: safety_checks constraints", () => {
  it("rejects a duplicate (generation_run_id, check_type, policy_version)", async () => {
    const { tenantId, generationRunId, actorId } = await seedGenerationRun();
    await pool.query(
      `insert into safety_checks (tenant_id, generation_run_id, check_type, policy_version, result, created_by, updated_by)
       values ($1, $2, 'prompt_injection', 'v1', 'pass', $3, $3)`,
      [tenantId, generationRunId, actorId]
    );
    await expect(
      pool.query(
        `insert into safety_checks (tenant_id, generation_run_id, check_type, policy_version, result, created_by, updated_by)
         values ($1, $2, 'prompt_injection', 'v1', 'fail', $3, $3)`,
        [tenantId, generationRunId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects an invalid result", async () => {
    const { tenantId, generationRunId, actorId } = await seedGenerationRun();
    await expect(
      pool.query(
        `insert into safety_checks (tenant_id, generation_run_id, check_type, policy_version, result, created_by, updated_by)
         values ($1, $2, 'toxicity', 'v1', 'maybe', $3, $3)`,
        [tenantId, generationRunId, actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});

describe("G-06: evaluation_suites/cases/results", () => {
  it("rejects a duplicate suite (tenant_id, use_case, suite_key, suite_version)", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    await pool.query(
      `insert into evaluation_suites (tenant_id, use_case, suite_key, suite_version, created_by, updated_by)
       values ($1, 'assessment_question', 'golden-set', 'v1', $2, $2)`,
      [tenantId, actorId]
    );
    await expect(
      pool.query(
        `insert into evaluation_suites (tenant_id, use_case, suite_key, suite_version, created_by, updated_by)
         values ($1, 'assessment_question', 'golden-set', 'v1', $2, $2)`,
        [tenantId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("rejects a duplicate case (suite_id, case_key), and a duplicate result (evaluation_run_id, case_id, metric)", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const suite = await pool.query(
      `insert into evaluation_suites (tenant_id, use_case, suite_key, suite_version, created_by, updated_by)
       values ($1, 'assessment_question', 'golden-set', $2, $3, $3) returning id`,
      [tenantId, `v-${randomUUID()}`, actorId]
    );
    const evaluationCase = await pool.query(
      `insert into evaluation_cases (tenant_id, suite_id, case_key, input_fixture_uri, created_by, updated_by)
       values ($1, $2, 'case-1', 's3://fixture', $3, $3) returning id`,
      [tenantId, suite.rows[0].id, actorId]
    );
    await expect(
      pool.query(
        `insert into evaluation_cases (tenant_id, suite_id, case_key, input_fixture_uri, created_by, updated_by)
         values ($1, $2, 'case-1', 's3://fixture2', $3, $3)`,
        [tenantId, suite.rows[0].id, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);

    const evaluationRun = await pool.query(
      `insert into ai_evaluation_runs (
         tenant_id, target_type, target_id, score, passed, adversarial_passed, tenant_isolation_passed,
         drift_within_threshold, approved_by, approved_at, created_by, updated_by
       )
       values ($1, 'prompt', $2, 0.9, true, true, true, true, $3, now(), $3, $3)
       returning id`,
      [tenantId, randomUUID(), actorId]
    );
    await pool.query(
      `insert into evaluation_results (tenant_id, evaluation_run_id, case_id, metric, score, threshold, passed, created_by, updated_by)
       values ($1, $2, $3, 'citation_accuracy', 0.9, 0.8, true, $4, $4)`,
      [tenantId, evaluationRun.rows[0].id, evaluationCase.rows[0].id, actorId]
    );
    await expect(
      pool.query(
        `insert into evaluation_results (tenant_id, evaluation_run_id, case_id, metric, score, threshold, passed, created_by, updated_by)
         values ($1, $2, $3, 'citation_accuracy', 0.5, 0.8, false, $4, $4)`,
        [tenantId, evaluationRun.rows[0].id, evaluationCase.rows[0].id, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("accepts an ai_evaluation_runs row linked to a real evaluation_suites row via the additive suite_id column", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const suite = await pool.query(
      `insert into evaluation_suites (tenant_id, use_case, suite_key, suite_version, created_by, updated_by)
       values ($1, 'assessment_question', 'golden-set', $2, $3, $3) returning id`,
      [tenantId, `v-${randomUUID()}`, actorId]
    );
    const evaluationRun = await pool.query(
      `insert into ai_evaluation_runs (
         tenant_id, target_type, target_id, suite_id, score, passed, adversarial_passed, tenant_isolation_passed,
         drift_within_threshold, approved_by, approved_at, created_by, updated_by
       )
       values ($1, 'prompt', $2, $3, 0.9, true, true, true, true, $4, now(), $4, $4)
       returning suite_id`,
      [tenantId, randomUUID(), suite.rows[0].id, actorId]
    );
    expect(evaluationRun.rows[0].suite_id).toBe(suite.rows[0].id);
  });
});

describe("G-06: ai_publication_events append-only + uniqueness", () => {
  it("rejects a duplicate (target_type, target_id, approved_version_id) and rejects mutation", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const targetId = randomUUID();
    const approvedVersionId = randomUUID();
    const event = await pool.query(
      `insert into ai_publication_events (tenant_id, target_type, target_id, approved_version_id, approver_id)
       values ($1, 'ai_question_version', $2, $3, $4) returning id`,
      [tenantId, targetId, approvedVersionId, actorId]
    );
    await expect(
      pool.query(
        `insert into ai_publication_events (tenant_id, target_type, target_id, approved_version_id, approver_id)
         values ($1, 'ai_question_version', $2, $3, $4)`,
        [tenantId, targetId, approvedVersionId, actorId]
      )
    ).rejects.toThrow(/duplicate key|unique/i);
    await expect(
      pool.query(`update ai_publication_events set approver_id = $1 where id = $2`, [randomUUID(), event.rows[0].id])
    ).rejects.toThrow(/append-only/i);
  });

  it("rejects an invalid target_type", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    await expect(
      pool.query(
        `insert into ai_publication_events (tenant_id, target_type, target_id, approved_version_id, approver_id)
         values ($1, 'not_a_real_target', $2, $3, $4)`,
        [tenantId, randomUUID(), randomUUID(), actorId]
      )
    ).rejects.toThrow(/check constraint/i);
  });
});
