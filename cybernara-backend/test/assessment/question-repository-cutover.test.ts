import "dotenv/config";
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import type {
  OpenAiQuestionGenerationInput,
  OpenAiQuestionGeneratorService
} from "../../src/modules/ai-orchestration/application/openai-question-generator.service.js";
import { createAssessment, QuestionRepositoryService } from "../../src/modules/assessment/public.js";
import { PostgresAssessmentRepository } from "../../src/modules/assessment/infrastructure/postgres-assessment.repository.js";
import { CANONICAL_CONTENT_TENANT_ID } from "../../src/modules/framework-content/public.js";
import { TenantScopedDb } from "../../src/platform/database/tenant-scoped-db.js";

const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
const db = new TenantScopedDb(pool);
const createdGlobalQuestionVersionIds: string[] = [];
const createdAiQuestionVersionIds: string[] = [];
const createdAiGenerationRunIds: string[] = [];
const createdAiPromptVersionIds: string[] = [];
const createdAiModelDeploymentIds: string[] = [];
const createdAiRetrievalIndexIds: string[] = [];

afterAll(async () => {
  if (createdGlobalQuestionVersionIds.length > 0) {
    await pool.query(
      `delete from question_versions where tenant_id = $1 and id = any($2::uuid[])`,
      [CANONICAL_CONTENT_TENANT_ID, createdGlobalQuestionVersionIds]
    );
  }
  if (createdAiQuestionVersionIds.length > 0) {
    await pool.query(`delete from ai_question_versions where id = any($1::uuid[])`, [createdAiQuestionVersionIds]);
  }
  if (createdAiGenerationRunIds.length > 0) {
    await pool.query(`delete from ai_generation_runs where id = any($1::uuid[])`, [createdAiGenerationRunIds]);
  }
  if (createdAiPromptVersionIds.length > 0) {
    await pool.query(`delete from ai_prompt_versions where id = any($1::uuid[])`, [createdAiPromptVersionIds]);
  }
  if (createdAiModelDeploymentIds.length > 0) {
    await pool.query(`delete from ai_model_deployments where id = any($1::uuid[])`, [createdAiModelDeploymentIds]);
  }
  if (createdAiRetrievalIndexIds.length > 0) {
    await pool.query(`delete from ai_retrieval_indexes where id = any($1::uuid[])`, [createdAiRetrievalIndexIds]);
  }
  await pool.end();
});

describe("F-01/F-02/F-03/F-10 cutover: framework enablement and governed assessment questions", () => {
  it("enables a published framework, exposes approved question options, and persists an assessment without fabricating questions", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const ownerId = randomUUID();
    const frameworkVersion = await firstPublishedSoc2Version();
    const questionRepository = new QuestionRepositoryService(db, pool);
    const assessmentRepository = new PostgresAssessmentRepository(db);

    const beforeTenantQuestionCount = await countTenantQuestions(tenantId);
    const enabled = await questionRepository.enableFramework({
      tenantId,
      actorId,
      frameworkVersionId: frameworkVersion.id
    });
    expect(enabled.frameworkKey).toBe("SOC2");

    const options = await questionRepository.listAssessmentQuestionOptions(tenantId, { limit: 25, offset: 0 });
    expect(options.length).toBeGreaterThan(0);
    expect(options.every((option) => option.status === "approved")).toBe(true);
    expect(options.every((option) => option.frameworkKeys.length > 0)).toBe(true);
    expect(new Set(options.map((option) => option.questionVersionId)).size).toBe(options.length);

    const controls = await questionRepository.resolveAssessmentControls({
      tenantId,
      selections: [{ questionVersionId: options[0].questionVersionId }]
    });
    expect(controls[0]).toMatchObject({
      frameworkKey: options[0].frameworkKey,
      controlId: options[0].controlId,
      harmonizedControlId: options[0].harmonizedControlId,
      questionVersionId: options[0].questionVersionId
    });

    const assessment = createAssessment({
      tenantId,
      scopeName: "Question repository cutover",
      controls,
      createdBy: actorId,
      ownerId
    });
    const persisted = await assessmentRepository.createAssessment({
      assessment,
      periodStart: new Date("2026-01-01T00:00:00.000Z"),
      periodEnd: new Date("2026-12-31T00:00:00.000Z")
    });

    expect(persisted.items[0].controlRef.questionVersionId).toBe(options[0].questionVersionId);
    const itemRow = await pool.query(
      `select question_version_id from assessment_items where tenant_id = $1 and id = $2`,
      [tenantId, persisted.items[0].id]
    );
    expect(itemRow.rows[0].question_version_id).toBe(options[0].questionVersionId);

    const afterTenantQuestionCount = await countTenantQuestions(tenantId);
    expect(afterTenantQuestionCount).toBe(beforeTenantQuestionCount);
  }, 120_000);

  it("returns each approved question option once even when multiple enabled frameworks map to it", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const questionRepository = new QuestionRepositoryService(db, pool);
    const frameworkVersions = await firstPublishedFrameworkVersionsWithSharedControl();
    for (const frameworkVersion of frameworkVersions) {
      await questionRepository.enableFramework({
        tenantId,
        actorId,
        frameworkVersionId: frameworkVersion.id
      });
    }

    const options = await questionRepository.listAssessmentQuestionOptions(tenantId, { limit: 100, offset: 0 });
    expect(options.length).toBeGreaterThan(0);
    expect(new Set(options.map((option) => option.questionVersionId)).size).toBe(options.length);
    expect(options.every((option) => option.frameworkKeys.length > 0)).toBe(true);
  }, 120_000);

  it("collapses repeated approved catalog questions with the same control, text, and response type", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const questionRepository = new QuestionRepositoryService(db, pool);
    await questionRepository.enableFramework({
      tenantId,
      actorId,
      frameworkVersionId: (await firstPublishedSoc2Version()).id
    });
    const [control] = await questionRepository.listAssessmentQuestionOptions(tenantId, { limit: 25, offset: 0 });
    expect(control).toBeDefined();
    const duplicateText = `How does the team evidence duplicate prevention ${randomUUID()}?`;

    for (let index = 0; index < 2; index += 1) {
      const draft = await questionRepository.createManualDraft({
        actorId,
        harmonizedControlId: control.harmonizedControlId,
        questionText: duplicateText,
        responseType: "text",
        evidenceExpectationIds: ["EV-DUPLICATE-PREVENTION"],
        citations: [{ sourceType: "harmonized_control", sourceId: control.harmonizedControlId }],
        confidence: 0.88
      });
      createdGlobalQuestionVersionIds.push(draft.id);
      await questionRepository.approveGlobalQuestion({ actorId, questionVersionId: draft.id });
    }

    const options = await questionRepository.listAssessmentQuestionOptions(tenantId, { limit: 200, offset: 0 });
    expect(options.filter((option) => option.questionText === duplicateText)).toHaveLength(1);
  }, 120_000);

  it("exposes approved catalog questions for every supported response type", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const questionRepository = new QuestionRepositoryService(db, pool);
    await questionRepository.enableFramework({
      tenantId,
      actorId,
      frameworkVersionId: (await firstPublishedSoc2Version()).id
    });
    const baselineOptions = await questionRepository.listAssessmentQuestionOptions(tenantId, { limit: 25, offset: 0 });
    expect(baselineOptions.length).toBeGreaterThan(0);
    const control = baselineOptions[0];
    const expectedTypes = ["boolean", "text", "maturity", "multi_select"] as const;

    for (const responseType of expectedTypes) {
      const draft = await questionRepository.createManualDraft({
        actorId,
        harmonizedControlId: control.harmonizedControlId,
        questionText: `Catalog ${responseType} assessment question ${randomUUID()}`,
        responseType,
        evidenceExpectationIds: [`EV-${responseType.toUpperCase()}`],
        citations: [{ sourceType: "harmonized_control", sourceId: control.harmonizedControlId }],
        confidence: 0.9
      });
      createdGlobalQuestionVersionIds.push(draft.id);
      await questionRepository.approveGlobalQuestion({ actorId, questionVersionId: draft.id });
    }

    const options = await questionRepository.listAssessmentQuestionOptions(tenantId, { limit: 200, offset: 0 });
    const returnedTypes = new Set(
      options
        .filter((option) => option.harmonizedControlId === control.harmonizedControlId)
        .map((option) => option.responseType)
    );
    for (const responseType of expectedTypes) {
      expect(returnedTypes.has(responseType)).toBe(true);
    }
  }, 120_000);

  it("uses the selected response type when AI assists manual repository authoring", async () => {
    const generator = {
      async generateQuestions(input: OpenAiQuestionGenerationInput) {
        const control = input.controls[0];
        if (!control) {
          throw new Error("Control context is required.");
        }
        return input.responseTypes.map((responseType) => ({
          questionText: `AI assisted ${responseType} question for ${control.controlTitle}`,
          responseType,
          evidenceExpectationIds: [control.evidenceExpectationIds[0] ?? "EV-TEST"],
          citations: [control.citations[0] ?? { sourceId: control.harmonizedControlId, sourceType: "harmonized_control" as const }],
          confidence: 0.84
        }));
      }
    } as unknown as OpenAiQuestionGeneratorService;
    const questionRepository = new QuestionRepositoryService(db, pool, generator);
    const [control] = await questionRepository.listGlobalControlContexts({ pagination: { limit: 1, offset: 0 } });
    expect(control).toBeDefined();
    const responseTypes = ["boolean", "text", "maturity", "multi_select"] as const;

    for (const responseType of responseTypes) {
      const suggestion = await questionRepository.suggestQuestionDraft({
        harmonizedControlId: control.harmonizedControlId,
        questionText: `Create a ${responseType} test question.`,
        responseType
      });
      expect(suggestion.responseType).toBe(responseType);
      expect(suggestion.suggestedQuestionText).toContain(responseType);
      expect(suggestion.evidenceExpectationIds.length).toBeGreaterThan(0);
      expect(suggestion.citations.length).toBeGreaterThan(0);
    }
  }, 120_000);

  it("allows a draft revision to move to a different selected harmonized control", async () => {
    const actorId = randomUUID();
    const questionRepository = new QuestionRepositoryService(db, pool);
    const controls = await questionRepository.listGlobalControlContexts({ pagination: { limit: 10, offset: 0 } });
    expect(controls.length).toBeGreaterThanOrEqual(2);
    const sourceControl = controls[0];
    const targetControl = controls.find((control) => control.harmonizedControlId !== sourceControl.harmonizedControlId);
    expect(targetControl).toBeDefined();

    const draft = await questionRepository.createManualDraft({
      actorId,
      harmonizedControlId: sourceControl.harmonizedControlId,
      questionText: `Original revision move source question ${randomUUID()}`,
      responseType: "text",
      evidenceExpectationIds: [sourceControl.evidenceExpectationIds[0] ?? "EV-SOURCE"],
      citations: [{ sourceType: "harmonized_control", sourceId: sourceControl.harmonizedControlId }],
      confidence: 1
    });
    createdGlobalQuestionVersionIds.push(draft.id);

    const revision = await questionRepository.createRevisionDraft({
      actorId,
      baseQuestionVersionId: draft.id,
      harmonizedControlId: targetControl!.harmonizedControlId,
      questionText: `Revision moved to target HARM ${randomUUID()}`,
      responseType: "boolean",
      evidenceExpectationIds: [targetControl!.evidenceExpectationIds[0] ?? "EV-TARGET"],
      citations: [{ sourceType: "harmonized_control", sourceId: targetControl!.harmonizedControlId }],
      confidence: 0.95
    });
    createdGlobalQuestionVersionIds.push(revision.id);

    expect(revision.harmonizedControlId).toBe(targetControl!.harmonizedControlId);
    expect(revision.questionSetId).not.toBe(draft.questionSetId);
    const payload = await payloadForQuestionVersion(revision.id);
    expect(payload.previousHarmonizedControlId).toBe(sourceControl.harmonizedControlId);
    expect(payload.revisedFromQuestionVersionId).toBe(draft.id);
  }, 120_000);

  it("publishes approved AI questions into the assessment question catalog", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const questionRepository = new QuestionRepositoryService(db, pool);
    await questionRepository.enableFramework({
      tenantId,
      actorId,
      frameworkVersionId: (await firstPublishedSoc2Version()).id
    });
    const [control] = await questionRepository.listAssessmentQuestionOptions(tenantId, { limit: 25, offset: 0 });
    expect(control).toBeDefined();
    const sourceAiQuestionId = randomUUID();
    const generationRunId = randomUUID();
    const promptVersionId = randomUUID();
    const modelDeploymentId = randomUUID();
    const retrievalIndexId = randomUUID();
    await seedAiQuestionVersion({
      tenantId,
      actorId,
      questionId: sourceAiQuestionId,
      generationRunId,
      promptVersionId,
      modelDeploymentId,
      retrievalIndexId,
      harmonizedControlId: control.harmonizedControlId
    });
    const published = await questionRepository.publishAiQuestion({
      actorId,
      question: {
        id: sourceAiQuestionId,
        tenantId,
        generationRunId,
        generationStatus: "approved",
        versionNumber: 1,
        version: "1",
        questionText: `AI generated assessment question ${randomUUID()}`,
        responseType: "boolean",
        evidenceExpectationIds: ["EV-AI-ASSESSMENT-CATALOG"],
        citations: [{ sourceType: "harmonized_control", sourceId: control.harmonizedControlId }],
        confidence: 0.91,
        state: "approved",
        provenance: {
          promptVersionId: randomUUID(),
          modelDeploymentId: randomUUID(),
          retrievalIndexId: randomUUID(),
          retrievalIndexVersion: "1",
          generationParameters: { temperature: 0.2, maxOutputTokens: 600, retrievalTopK: 6 },
          inputFingerprint: "assessment-catalog-ai-test"
        },
        approvedBy: actorId,
        approvedAt: new Date(),
        classification: "confidential",
        createdBy: actorId,
        createdAt: new Date(),
        updatedBy: actorId,
        updatedAt: new Date()
      }
    });
    createdGlobalQuestionVersionIds.push(published.id);
    const duplicatePublish = await questionRepository.publishAiQuestion({
      actorId,
      question: {
        id: randomUUID(),
        tenantId,
        generationRunId: randomUUID(),
        generationStatus: "approved",
        versionNumber: 1,
        version: "1",
        questionText: published.questionText,
        responseType: "boolean",
        evidenceExpectationIds: ["EV-AI-ASSESSMENT-CATALOG"],
        citations: [{ sourceType: "harmonized_control", sourceId: control.harmonizedControlId }],
        confidence: 0.91,
        state: "approved",
        provenance: {
          promptVersionId: randomUUID(),
          modelDeploymentId: randomUUID(),
          retrievalIndexId: randomUUID(),
          retrievalIndexVersion: "1",
          generationParameters: { temperature: 0.2, maxOutputTokens: 600, retrievalTopK: 6 },
          inputFingerprint: "assessment-catalog-ai-test-duplicate"
        },
        approvedBy: actorId,
        approvedAt: new Date(),
        classification: "confidential",
        createdBy: actorId,
        createdAt: new Date(),
        updatedBy: actorId,
        updatedAt: new Date()
      }
    });
    expect(duplicatePublish.id).toBe(published.id);

    const options = await questionRepository.listAssessmentQuestionOptions(tenantId, { limit: 200, offset: 0 });
    const aiOption = options.find((option) => option.questionVersionId === published.id);
    expect(aiOption).toBeDefined();
    expect(aiOption).toMatchObject({
      sourceType: "ai_generated",
          sourceAiQuestionVersionId: sourceAiQuestionId,
          generationRunId,
          status: "approved",
          responseType: "boolean"
    });
  }, 120_000);
});

async function firstPublishedSoc2Version(): Promise<{ id: string }> {
  const result = await pool.query(
    `
      select fv.id
      from framework_versions fv
      join frameworks f on f.id = fv.framework_id and f.tenant_id = fv.tenant_id
      where fv.tenant_id = $1 and fv.status = 'published' and f.framework_key = 'SOC2'
      order by fv.published_at desc nulls last, fv.created_at desc
      limit 1
    `,
    [CANONICAL_CONTENT_TENANT_ID]
  );
  if (!result.rows[0]) {
    throw new Error("SOC2 published framework version fixture is required for the cutover integration test.");
  }
  return { id: String(result.rows[0].id) };
}

async function firstPublishedFrameworkVersionsWithSharedControl(): Promise<Array<{ id: string }>> {
  const result = await pool.query(
    `
      with shared as (
        select harmonized_control_id, array_agg(distinct framework_key order by framework_key) as framework_keys
        from control_mappings
        where tenant_id = $1 and status = 'published'
        group by harmonized_control_id
        having count(distinct framework_key) >= 2
        order by harmonized_control_id
        limit 1
      )
      select distinct on (f.framework_key) fv.id
      from shared s
      join unnest(s.framework_keys[1:2]) as selected(framework_key) on true
      join frameworks f on f.tenant_id = $1 and f.framework_key = selected.framework_key
      join framework_versions fv on fv.tenant_id = $1 and fv.framework_id = f.id and fv.status = 'published'
      order by f.framework_key, fv.published_at desc nulls last, fv.created_at desc
    `,
    [CANONICAL_CONTENT_TENANT_ID]
  );
  if (result.rows.length < 2) {
    throw new Error("Two published framework versions sharing a harmonized control are required for multi-framework option coverage.");
  }
  return result.rows.map((row) => ({ id: String(row.id) }));
}

async function countTenantQuestions(tenantId: string): Promise<number> {
  const result = await pool.query(`select count(*)::int as count from question_versions where tenant_id = $1`, [tenantId]);
  return Number(result.rows[0].count);
}

async function payloadForQuestionVersion(questionVersionId: string): Promise<Record<string, unknown>> {
  const result = await pool.query(
    `select payload_json from question_versions where tenant_id = $1 and id = $2`,
    [CANONICAL_CONTENT_TENANT_ID, questionVersionId]
  );
  return result.rows[0]?.payload_json as Record<string, unknown>;
}

async function seedAiQuestionVersion(input: {
  tenantId: string;
  actorId: string;
  questionId: string;
  generationRunId: string;
  promptVersionId: string;
  modelDeploymentId: string;
  retrievalIndexId: string;
  harmonizedControlId: string;
}): Promise<void> {
  const now = new Date();
  await pool.query(
    `
      insert into ai_prompt_versions (
        id, tenant_id, prompt_key, prompt_version, template_sha256, parameters_schema,
        status, approved_by, approved_at, created_by, created_at, updated_by, updated_at
      )
      values ($1, $2, 'assessment-catalog-test', 'v1', repeat('a', 64), '{}'::jsonb,
              'approved', $3, $4, $3, $4, $3, $4)
    `,
    [input.promptVersionId, input.tenantId, input.actorId, now]
  );
  createdAiPromptVersionIds.push(input.promptVersionId);
  await pool.query(
    `
      insert into ai_model_deployments (
        id, tenant_id, provider, model_name, deployment_version, region, risk_tier,
        no_training, egress_allow_list, status, approved_by, approved_at,
        created_by, created_at, updated_by, updated_at
      )
      values ($1, $2, 'openai', 'gpt-test', 'v1', 'us', 'high',
              true, array['api.openai.com'], 'approved', $3, $4,
              $3, $4, $3, $4)
    `,
    [input.modelDeploymentId, input.tenantId, input.actorId, now]
  );
  createdAiModelDeploymentIds.push(input.modelDeploymentId);
  await pool.query(
    `
      insert into ai_retrieval_indexes (
        id, tenant_id, index_key, index_version, source_pack_versions, acl_tenant_ids,
        status, approved_by, approved_at, created_by, created_at, updated_by, updated_at
      )
      values ($1, $2, 'assessment-catalog-test', 'v1', $3::jsonb, $4::uuid[],
              'approved', $5, $6, $5, $6, $5, $6)
    `,
    [
      input.retrievalIndexId,
      input.tenantId,
      JSON.stringify([{ sourceType: "harmonized_control", sourceId: input.harmonizedControlId }]),
      [input.tenantId],
      input.actorId,
      now
    ]
  );
  createdAiRetrievalIndexIds.push(input.retrievalIndexId);
  await pool.query(
    `
      insert into ai_generation_runs (
        id, tenant_id, use_case, status, actor_id, prompt_version_id, model_deployment_id,
        retrieval_index_id, generation_parameters, input_fingerprint, output_fingerprint,
        provenance, created_by, created_at, updated_by, updated_at
      )
      values ($1, $2, 'assessment_question', 'approved', $3, $4, $5,
              $6, $7::jsonb, 'assessment-catalog-ai-test', 'assessment-catalog-ai-test-output',
              $8::jsonb, $3, $9, $3, $9)
    `,
    [
      input.generationRunId,
      input.tenantId,
      input.actorId,
      input.promptVersionId,
      input.modelDeploymentId,
      input.retrievalIndexId,
      JSON.stringify({ temperature: 0.2, maxOutputTokens: 600, retrievalTopK: 6 }),
      JSON.stringify({ questionIds: [input.questionId] }),
      now
    ]
  );
  createdAiGenerationRunIds.push(input.generationRunId);
  await pool.query(
    `
      insert into ai_question_versions (
        id, tenant_id, generation_run_id, question_version, question_text, response_type,
        evidence_expectations, citations, confidence, state, approved_by, approved_at,
        created_by, created_at, updated_by, updated_at
      )
      values ($1, $2, $3, '1', 'AI generated catalog seed', 'boolean',
              $4::jsonb, $5::jsonb, 0.91, 'approved', $6, $7,
              $6, $7, $6, $7)
    `,
    [
      input.questionId,
      input.tenantId,
      input.generationRunId,
      JSON.stringify(["EV-AI-ASSESSMENT-CATALOG"]),
      JSON.stringify([{ sourceType: "harmonized_control", sourceId: input.harmonizedControlId }]),
      input.actorId,
      now
    ]
  );
  createdAiQuestionVersionIds.push(input.questionId);
}
