import { createHash, randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { readEnv } from "../../../config/env.js";
import { TenantScopedDb, type TenantScopedClient } from "../../../platform/database/tenant-scoped-db.js";
import type {
  AiGenerationRun,
  AiGenerationStatus,
  AiPublicationEvent,
  AiReviewState,
  ApprovedControlContext,
  CitationSource,
  EvaluationCase,
  EvaluationResult,
  EvaluationSuite,
  GenerationCitation,
  GoldenSetEvaluation,
  KnowledgeChunk,
  ModelDeployment,
  PromptVersion,
  QuestionVersion,
  RetrievalIndex,
  RetrievalRun,
  RetrievedChunk,
  SafetyCheck
} from "../domain/governance.js";
import {
  approveModelDeployment,
  approvePromptVersion,
  approveRetrievalIndex,
  createModelDeployment,
  createPromptVersion
} from "../domain/governance.js";
import type {
  AiGenerationRunRecord,
  AiGovernanceBundle,
  AiOrchestrationRepository,
  AiPublicationEventRow,
  AiQuestionVersionRecord,
  EvaluationCaseRow,
  EvaluationResultRow,
  EvaluationSuiteRow,
  GenerationCitationRow,
  KnowledgeChunkRow,
  RetrievalRunRow,
  RetrievedChunkRow,
  SafetyCheckRow
} from "../application/ai-orchestration.types.js";

const referenceCatalogTenantId = "00000000-0000-4000-8000-000000000001";

@Injectable()
export class PostgresAiOrchestrationRepository implements AiOrchestrationRepository {
  constructor(@Inject(TenantScopedDb) private readonly db: TenantScopedDb) {}

  async resolveControlContexts(input: {
    tenantId: string;
    actorId: string;
    query: string;
    limit: number;
    frameworkKeys?: string[];
  }): Promise<ApprovedControlContext[]> {
    const query = input.query.trim();
    if (!query) {
      return [];
    }
    const frameworkKeys = normalizedFrameworkKeys(input.frameworkKeys);
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          with mapping_terms as (
            select
              harmonized_control_id,
              string_agg(framework_key || ' ' || source_control_id || ' ' || coalesce(rationale, ''), ' ') as mapping_text,
              count(*)::int as mapping_count
            from control_mappings
            where (tenant_id = $1 or owner_scope = 'global' or tenant_id = $2)
              and ($3::text[] is null or framework_key = any($3::text[]))
            group by harmonized_control_id
          )
          select
            hc.harmonized_id,
            hc.domain,
            hc.control_name,
            hc.control_description,
            coalesce(mt.mapping_text, '') as mapping_text,
            coalesce(mt.mapping_count, 0)::int as mapping_count
          from harmonized_controls hc
          left join mapping_terms mt on mt.harmonized_control_id = hc.harmonized_id
          where (hc.tenant_id = $1 or hc.owner_scope = 'global' or hc.tenant_id = $2)
            and hc.status = 'published'
            and coalesce(hc.domain, '') <> 'Framework-Specific Requirement'
          order by hc.harmonized_id
        `,
        [input.tenantId, referenceCatalogTenantId, frameworkKeys]
      );
      const terms = expandedControlSearchTerms(query);
      const scored = result.rows
        .map((row) => ({ row, score: scoreControlContext(row, query, terms) }))
        .filter((candidate) => candidate.score > 0)
        .sort((left, right) => right.score - left.score || String(left.row.harmonized_id).localeCompare(String(right.row.harmonized_id)))
        .slice(0, Math.max(1, input.limit));

      const contexts: ApprovedControlContext[] = [];
      for (const candidate of scored) {
        contexts.push(await buildResolvedControlContext(client, input.tenantId, candidate.row, frameworkKeys));
      }
      return contexts;
    });
  }

  async ensureGovernance(input: {
    tenantId: string;
    actorId: string;
    controls: ApprovedControlContext[];
  }): Promise<AiGovernanceBundle> {
    const env = readEnv();
    const evaluation = approvedEvaluation(input.actorId);
    const prompt = approvePromptVersion(
      createPromptVersion({
        key: "assessment-question-generator",
        version: "2026.07.02",
        template: "Generate cited assessment questions from approved controls only."
      }),
      evaluation
    );
    const model = approveModelDeployment(
      createModelDeployment({
        provider: "openai",
        modelName: env.OPENAI_MODEL,
        deploymentVersion: "runtime-env",
        region: "us",
        riskTier: "high",
        noTraining: true,
        egressAllowList: ["api.openai.com"]
      }),
      evaluation
    );
    const retrieval = approveRetrievalIndex(
      {
        tenantId: input.tenantId,
        key: "tenant-control-index",
        version: "runtime-controls-v1",
        allowedTenantIds: [input.tenantId],
        sources: uniqueSources(input.controls.flatMap((control) => control.citations))
      },
      { approvedBy: input.actorId, approvedAt: evaluation.approvedAt }
    );

    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const persistedPrompt = await upsertPrompt(client, input.tenantId, prompt, input.actorId);
      const persistedModel = await upsertModel(client, input.tenantId, model, input.actorId);
      const persistedRetrieval = await upsertRetrieval(client, retrieval, input.actorId);
      return {
        promptVersion: persistedPrompt,
        modelDeployment: persistedModel,
        retrievalIndex: persistedRetrieval
      };
    });
  }

  async createGenerationRun(run: AiGenerationRun): Promise<AiGenerationRunRecord> {
    return this.db.withTenant(run.tenantId, run.actorId, async (client) => {
      await client.query(
        `
          insert into ai_generation_runs (
            id, tenant_id, use_case, status, actor_id, prompt_version_id, model_deployment_id,
            retrieval_index_id, generation_parameters, input_fingerprint, output_fingerprint,
            failure_reason, provenance, classification, created_by, created_at, updated_by, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12,
                  $13::jsonb, 'confidential', $5, $14, $5, $14)
        `,
        [
          run.id,
          run.tenantId,
          run.useCase,
          run.status,
          run.actorId,
          run.promptVersionId,
          run.modelDeploymentId,
          run.retrievalIndexId,
          JSON.stringify(run.generationParameters),
          run.inputFingerprint,
          run.outputFingerprint,
          run.failureReason ?? null,
          JSON.stringify({ questionIds: run.questions.map((question) => question.id) }),
          run.createdAt
        ]
      );
      for (const question of run.questions) {
        await insertQuestion(client, run, question);
      }
      const persisted = await findGenerationRunWithClient(client, run.tenantId, run.id);
      if (!persisted) {
        throw new Error("AI generation run was not persisted.");
      }
      return persisted;
    });
  }

  async listPendingQuestions(
    tenantId: string,
    pagination: { limit: number; offset: number }
  ): Promise<AiQuestionVersionRecord[]> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${questionColumns()}, g.status as generation_status
          from ai_question_versions q
          join ai_generation_runs g on g.id = q.generation_run_id and g.tenant_id = q.tenant_id
          where q.tenant_id = $1 and q.state = 'pending_review'
          order by q.created_at desc
          limit $2 offset $3
        `,
        [tenantId, pagination.limit, pagination.offset]
      );
      return result.rows.map(mapQuestion);
    });
  }

  async listApprovedQuestions(
    tenantId: string,
    pagination: { limit: number; offset: number }
  ): Promise<AiQuestionVersionRecord[]> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${questionColumns()}, g.status as generation_status
          from ai_question_versions q
          join ai_generation_runs g on g.id = q.generation_run_id and g.tenant_id = q.tenant_id
          where q.tenant_id = $1 and q.state = 'approved'
          order by q.approved_at desc nulls last, q.created_at desc
          limit $2 offset $3
        `,
        [tenantId, pagination.limit, pagination.offset]
      );
      return result.rows.map(mapQuestion);
    });
  }

  async findGenerationRun(tenantId: string, generationRunId: string): Promise<AiGenerationRunRecord | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      return findGenerationRunWithClient(client, tenantId, generationRunId);
    });
  }

  async findQuestion(tenantId: string, questionId: string): Promise<AiQuestionVersionRecord | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${questionColumns()}, g.status as generation_status
          from ai_question_versions q
          join ai_generation_runs g on g.id = q.generation_run_id and g.tenant_id = q.tenant_id
          where q.tenant_id = $1 and q.id = $2
        `,
        [tenantId, questionId]
      );
      return result.rows[0] ? mapQuestion(result.rows[0]) : null;
    });
  }

  async recordReview(input: {
    tenantId: string;
    generationRunId: string;
    reviewerId: string;
    decision: "approved" | "rejected";
    rationale: string;
    questions: QuestionVersion[];
  }): Promise<AiGenerationRunRecord> {
    const now = new Date();
    return this.db.withTenant(input.tenantId, input.reviewerId, async (client) => {
      await client.query(
        `
          insert into ai_output_reviews (
            id, tenant_id, generation_run_id, reviewer_id, decision, rationale,
            classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, 'confidential', $4, $4)
        `,
        [randomUUID(), input.tenantId, input.generationRunId, input.reviewerId, input.decision, input.rationale]
      );
      await client.query(
        `
          update ai_generation_runs
          set status = $3,
              output_fingerprint = $4,
              updated_by = $5,
              updated_at = $6,
              version = version + 1
          where tenant_id = $1 and id = $2
        `,
        [
          input.tenantId,
          input.generationRunId,
          input.decision,
          hashObject({
            decision: input.decision,
            questions: input.questions.map((question) => question.id),
            reviewerId: input.reviewerId
          }),
          input.reviewerId,
          now
        ]
      );
      await client.query(
        `
          update ai_question_versions
          set state = $3::ai_review_state,
              approved_by = case when $3::text = 'approved' then $4::uuid else approved_by end,
              approved_at = case when $3::text = 'approved' then $5::timestamptz else approved_at end,
              updated_by = $4,
              updated_at = $5,
              version = version + 1
          where tenant_id = $1 and generation_run_id = $2
        `,
        [input.tenantId, input.generationRunId, input.decision, input.reviewerId, now]
      );
      const updated = await findGenerationRunWithClient(client, input.tenantId, input.generationRunId);
      if (!updated) {
        throw new Error("AI generation run was not found after review.");
      }
      return updated;
    });
  }

  async createKnowledgeChunk(input: { chunk: KnowledgeChunk; actorId: string }): Promise<KnowledgeChunkRow> {
    return this.db.withTenant(input.chunk.tenantId, input.actorId, async (client) => {
      const chunk = input.chunk;
      const result = await client.query(
        `
          insert into knowledge_chunks (
            id, tenant_id, retrieval_index_id, source_type, source_id, source_version,
            content_hash, acl_json, text_uri, classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, 'confidential', $10, $10)
          returning ${knowledgeChunkColumns()}
        `,
        [
          chunk.id,
          chunk.tenantId,
          chunk.retrievalIndexId,
          chunk.sourceType,
          chunk.sourceId,
          chunk.sourceVersion,
          chunk.contentHash,
          JSON.stringify(chunk.aclJson),
          chunk.textUri,
          input.actorId
        ]
      );
      return mapKnowledgeChunk(result.rows[0]);
    });
  }

  async listKnowledgeChunks(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<KnowledgeChunkRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${knowledgeChunkColumns()} from knowledge_chunks where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapKnowledgeChunk);
    });
  }

  async createRetrievalRun(input: { run: RetrievalRun; actorId: string }): Promise<RetrievalRunRow> {
    return this.db.withTenant(input.run.tenantId, input.actorId, async (client) => {
      const run = input.run;
      const result = await client.query(
        `
          insert into retrieval_runs (
            id, tenant_id, query_hash, filters_json, retrieval_index_id, top_k, started_at,
            finished_at, classification, created_by, updated_by
          )
          values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, 'confidential', $9, $9)
          returning ${retrievalRunColumns()}
        `,
        [
          run.id,
          run.tenantId,
          run.queryHash,
          JSON.stringify(run.filtersJson),
          run.retrievalIndexId,
          run.topK,
          run.startedAt,
          run.finishedAt ?? null,
          input.actorId
        ]
      );
      return mapRetrievalRun(result.rows[0]);
    });
  }

  async listRetrievalRuns(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<RetrievalRunRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${retrievalRunColumns()} from retrieval_runs where tenant_id = $1 order by started_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapRetrievalRun);
    });
  }

  async createRetrievedChunk(input: { chunk: RetrievedChunk; actorId: string }): Promise<RetrievedChunkRow> {
    return this.db.withTenant(input.chunk.tenantId, input.actorId, async (client) => {
      const chunk = input.chunk;
      const result = await client.query(
        `
          insert into retrieved_chunks (
            id, tenant_id, retrieval_run_id, knowledge_chunk_id, rank, score, acl_decision,
            classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, 'confidential', $8, $8)
          returning ${retrievedChunkColumns()}
        `,
        [chunk.id, chunk.tenantId, chunk.retrievalRunId, chunk.knowledgeChunkId, chunk.rank, chunk.score, chunk.aclDecision, input.actorId]
      );
      return mapRetrievedChunk(result.rows[0]);
    });
  }

  async listRetrievedChunks(input: {
    tenantId: string;
    retrievalRunId: string;
    pagination: { limit: number; offset: number };
  }): Promise<RetrievedChunkRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${retrievedChunkColumns()} from retrieved_chunks where tenant_id = $1 and retrieval_run_id = $2 order by rank asc limit $3 offset $4`,
        [input.tenantId, input.retrievalRunId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapRetrievedChunk);
    });
  }

  async createGenerationCitation(input: { citation: GenerationCitation; actorId: string }): Promise<GenerationCitationRow> {
    return this.db.withTenant(input.citation.tenantId, input.actorId, async (client) => {
      const citation = input.citation;
      const result = await client.query(
        `
          insert into generation_citations (
            id, tenant_id, generation_run_id, output_path, knowledge_chunk_id, locator,
            entailment_score, classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, 'confidential', $8, $8)
          returning ${generationCitationColumns()}
        `,
        [
          citation.id,
          citation.tenantId,
          citation.generationRunId,
          citation.outputPath,
          citation.knowledgeChunkId,
          citation.locator ?? null,
          citation.entailmentScore ?? null,
          input.actorId
        ]
      );
      return mapGenerationCitation(result.rows[0]);
    });
  }

  async listGenerationCitations(input: {
    tenantId: string;
    generationRunId: string;
    pagination: { limit: number; offset: number };
  }): Promise<GenerationCitationRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${generationCitationColumns()} from generation_citations where tenant_id = $1 and generation_run_id = $2 order by created_at desc limit $3 offset $4`,
        [input.tenantId, input.generationRunId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapGenerationCitation);
    });
  }

  async createSafetyCheck(input: { check: SafetyCheck; actorId: string }): Promise<SafetyCheckRow> {
    return this.db.withTenant(input.check.tenantId, input.actorId, async (client) => {
      const check = input.check;
      const result = await client.query(
        `
          insert into safety_checks (
            id, tenant_id, generation_run_id, check_type, policy_version, result, score,
            redaction_summary, classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, 'confidential', $9, $9)
          returning ${safetyCheckColumns()}
        `,
        [
          check.id,
          check.tenantId,
          check.generationRunId,
          check.checkType,
          check.policyVersion,
          check.result,
          check.score ?? null,
          JSON.stringify(check.redactionSummary),
          input.actorId
        ]
      );
      return mapSafetyCheck(result.rows[0]);
    });
  }

  async listSafetyChecks(input: {
    tenantId: string;
    generationRunId: string;
    pagination: { limit: number; offset: number };
  }): Promise<SafetyCheckRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${safetyCheckColumns()} from safety_checks where tenant_id = $1 and generation_run_id = $2 order by created_at desc limit $3 offset $4`,
        [input.tenantId, input.generationRunId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapSafetyCheck);
    });
  }

  async createEvaluationSuite(input: { suite: EvaluationSuite; actorId: string }): Promise<EvaluationSuiteRow> {
    return this.db.withTenant(input.suite.tenantId, input.actorId, async (client) => {
      const suite = input.suite;
      const result = await client.query(
        `
          insert into evaluation_suites (
            id, tenant_id, use_case, suite_key, suite_version, status, threshold_policy,
            classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7::jsonb, 'confidential', $8, $8)
          returning ${evaluationSuiteColumns()}
        `,
        [suite.id, suite.tenantId, suite.useCase, suite.suiteKey, suite.suiteVersion, suite.status, JSON.stringify(suite.thresholdPolicy), input.actorId]
      );
      return mapEvaluationSuite(result.rows[0]);
    });
  }

  async listEvaluationSuites(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<EvaluationSuiteRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${evaluationSuiteColumns()} from evaluation_suites where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapEvaluationSuite);
    });
  }

  async findEvaluationSuite(tenantId: string, suiteId: string): Promise<EvaluationSuiteRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(`select ${evaluationSuiteColumns()} from evaluation_suites where tenant_id = $1 and id = $2`, [
        tenantId,
        suiteId
      ]);
      return result.rows[0] ? mapEvaluationSuite(result.rows[0]) : null;
    });
  }

  async createEvaluationCase(input: { evaluationCase: EvaluationCase; actorId: string }): Promise<EvaluationCaseRow> {
    return this.db.withTenant(input.evaluationCase.tenantId, input.actorId, async (client) => {
      const evaluationCase = input.evaluationCase;
      const result = await client.query(
        `
          insert into evaluation_cases (
            id, tenant_id, suite_id, case_key, input_fixture_uri, expected_json,
            classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6::jsonb, 'confidential', $7, $7)
          returning ${evaluationCaseColumns()}
        `,
        [
          evaluationCase.id,
          evaluationCase.tenantId,
          evaluationCase.suiteId,
          evaluationCase.caseKey,
          evaluationCase.inputFixtureUri,
          JSON.stringify(evaluationCase.expectedJson),
          input.actorId
        ]
      );
      return mapEvaluationCase(result.rows[0]);
    });
  }

  async listEvaluationCases(input: {
    tenantId: string;
    suiteId: string;
    pagination: { limit: number; offset: number };
  }): Promise<EvaluationCaseRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${evaluationCaseColumns()} from evaluation_cases where tenant_id = $1 and suite_id = $2 order by created_at desc limit $3 offset $4`,
        [input.tenantId, input.suiteId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapEvaluationCase);
    });
  }

  async findEvaluationCase(tenantId: string, caseId: string): Promise<EvaluationCaseRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(`select ${evaluationCaseColumns()} from evaluation_cases where tenant_id = $1 and id = $2`, [
        tenantId,
        caseId
      ]);
      return result.rows[0] ? mapEvaluationCase(result.rows[0]) : null;
    });
  }

  async createEvaluationResult(input: { result: EvaluationResult; actorId: string }): Promise<EvaluationResultRow> {
    return this.db.withTenant(input.result.tenantId, input.actorId, async (client) => {
      const evaluationResult = input.result;
      const result = await client.query(
        `
          insert into evaluation_results (
            id, tenant_id, evaluation_run_id, case_id, metric, score, threshold, passed,
            artifact_uri, classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'confidential', $10, $10)
          returning ${evaluationResultColumns()}
        `,
        [
          evaluationResult.id,
          evaluationResult.tenantId,
          evaluationResult.evaluationRunId,
          evaluationResult.caseId,
          evaluationResult.metric,
          evaluationResult.score,
          evaluationResult.threshold,
          evaluationResult.passed,
          evaluationResult.artifactUri ?? null,
          input.actorId
        ]
      );
      return mapEvaluationResult(result.rows[0]);
    });
  }

  async listEvaluationResults(input: {
    tenantId: string;
    suiteId: string;
    pagination: { limit: number; offset: number };
  }): Promise<EvaluationResultRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${evaluationResultColumns("r")}
          from evaluation_results r
          join evaluation_cases c on c.id = r.case_id and c.tenant_id = r.tenant_id
          where r.tenant_id = $1 and c.suite_id = $2
          order by r.created_at desc
          limit $3 offset $4
        `,
        [input.tenantId, input.suiteId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapEvaluationResult);
    });
  }

  async createPublicationEvent(input: { event: AiPublicationEvent; actorId: string }): Promise<AiPublicationEventRow> {
    return this.db.withTenant(input.event.tenantId, input.actorId, async (client) => {
      const event = input.event;
      const result = await client.query(
        `
          insert into ai_publication_events (
            id, tenant_id, target_type, target_id, generation_run_id, approved_version_id,
            approver_id, published_at, classification
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, 'confidential')
          returning ${publicationEventColumns()}
        `,
        [
          event.id,
          event.tenantId,
          event.targetType,
          event.targetId,
          event.generationRunId ?? null,
          event.approvedVersionId,
          event.approverId,
          event.publishedAt
        ]
      );
      return mapPublicationEvent(result.rows[0]);
    });
  }

  async listPublicationEvents(input: {
    tenantId: string;
    targetType: string;
    targetId: string;
    pagination: { limit: number; offset: number };
  }): Promise<AiPublicationEventRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${publicationEventColumns()} from ai_publication_events where tenant_id = $1 and target_type = $2 and target_id = $3 order by published_at desc limit $4 offset $5`,
        [input.tenantId, input.targetType, input.targetId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapPublicationEvent);
    });
  }
}

async function buildResolvedControlContext(
  client: TenantScopedClient,
  tenantId: string,
  control: Record<string, unknown>,
  frameworkKeys: string[] | null
): Promise<ApprovedControlContext> {
  const mappings = await client.query(
    `
      with ranked as (
        select
          framework_key,
          source_control_id,
          mapping_classification,
          confidence,
          row_number() over (
            partition by framework_key
            order by
              case mapping_classification
                when 'mapped' then 0
                when 'partial' then 1
                when 'unique' then 2
                else 3
              end,
              source_control_id
          ) as framework_rank
        from control_mappings
        where (tenant_id = $1 or owner_scope = 'global' or tenant_id = $3)
          and harmonized_control_id = $2
          and status = 'published'
          and ($4::text[] is null or framework_key = any($4::text[]))
      )
      select framework_key, source_control_id, mapping_classification, confidence
      from ranked
      where framework_rank <= 3
      order by framework_key, framework_rank, source_control_id
    `,
    [tenantId, String(control.harmonized_id), referenceCatalogTenantId, frameworkKeys]
  );
  const mappedClauseIds = uniqueStrings(
    mappings.rows.map((row) => `${String(row.framework_key)}:${String(row.source_control_id)}`)
  );
  const title = String(control.control_name || control.domain || control.harmonized_id);
  const domain = String(control.domain || title);
  const description = String(control.control_description || title);
  const searchText = normalizeSearchText(`${domain} ${title} ${description} ${mappedClauseIds.join(" ")}`);
  const harmonizedId = String(control.harmonized_id);
  const citations: CitationSource[] = [
    ...mappings.rows.map((row) => {
      const sourceId = `${String(row.framework_key)}:${String(row.source_control_id)}`;
      return {
        sourceId,
        sourceType: "framework_requirement" as const,
        checksum: shortChecksum(sourceId)
      };
    }),
    {
      sourceId: harmonizedId,
      sourceType: "harmonized_control" as const,
      checksum: shortChecksum(`${harmonizedId}:${title}:${description}`)
    }
  ];

  return {
    harmonizedControlId: harmonizedId,
    controlTitle: title,
    controlDescription: `${domain}: ${description}`,
    mappedClauseIds: mappedClauseIds.length > 0 ? mappedClauseIds : [`${harmonizedId}:catalog`],
    evidenceExpectationIds: evidenceExpectationsForControl(title, searchText),
    tenantScopeTags: tenantScopeTagsForControl(domain, title),
    citations: uniqueSources(citations)
  };
}

function expandedControlSearchTerms(query: string): string[] {
  const normalized = normalizeSearchText(query);
  const terms = new Set(normalized.split(" ").filter((term) => term.length > 2));
  const expansions: Array<[RegExp, string[]]> = [
    [/\bmfa\b|multi factor|two factor|authentication|privileged|remote access|high risk/, ["identity", "access", "authentication", "privileged"]],
    [/secure coding|software|sdlc|code review|application/, ["application", "security", "software", "development", "testing", "code"]],
    [/vulnerability|patch|scan|remediation/, ["vulnerability", "patch", "scanning", "remediation"]],
    [/vendor|supplier|third party|processor/, ["third", "party", "vendor", "supplier", "processor"]],
    [/incident|breach|escalation/, ["incident", "response", "breach", "escalation"]],
    [/retention|deletion|disposal|minimization|storage limitation/, ["data", "retention", "disposal", "deletion", "minimization"]],
    [/business continuity|continuity|resilience/, ["business", "continuity", "resilience"]],
    [/disaster recovery|backup|restore/, ["disaster", "recovery", "backup", "restore"]],
    [/asset|inventory|ownership|lifecycle/, ["asset", "inventory", "ownership", "lifecycle"]]
  ];
  for (const [pattern, values] of expansions) {
    if (pattern.test(normalized)) {
      for (const value of values) {
        terms.add(value);
      }
    }
  }
  return [...terms];
}

function scoreControlContext(row: Record<string, unknown>, query: string, terms: string[]): number {
  const normalizedQuery = normalizeSearchText(query);
  const domain = normalizeSearchText(String(row.domain ?? ""));
  const name = normalizeSearchText(String(row.control_name ?? ""));
  const description = normalizeSearchText(String(row.control_description ?? ""));
  const mappings = normalizeSearchText(String(row.mapping_text ?? ""));
  let score = 0;
  for (const term of terms) {
    if (domain.includes(term)) score += 10;
    if (name.includes(term)) score += 8;
    if (description.includes(term)) score += 5;
    if (mappings.includes(term)) score += 1;
  }
  if (normalizedQuery && `${domain} ${name} ${description}`.includes(normalizedQuery)) {
    score += 25;
  }
  score += Math.min(Number(row.mapping_count ?? 0), 30) / 10;
  return score;
}

function evidenceExpectationsForControl(title: string, normalizedControlText: string): string[] {
  const base = slugForEvidence(title);
  const specific: string[] = [];
  addWhen(specific, normalizedControlText, /application|software|code|development|testing/, [
    "SECURE-CODING-STANDARD",
    "CODE-REVIEW-RECORDS",
    "SAST-DAST-REPORTS",
    "DEPENDENCY-SCAN-REPORTS",
    "CI-CD-SECURITY-CHECKS"
  ]);
  addWhen(specific, normalizedControlText, /vulnerability|patch|scan|remediation/, [
    "VULNERABILITY-SCAN-REPORTS",
    "REMEDIATION-SLA-TRACKING",
    "PATCH-DEPLOYMENT-RECORDS"
  ]);
  addWhen(specific, normalizedControlText, /vendor|supplier|third|processor|associate/, [
    "VENDOR-DUE-DILIGENCE",
    "SECURITY-QUESTIONNAIRES",
    "CONTRACT-DPA",
    "SOC-REPORTS"
  ]);
  addWhen(specific, normalizedControlText, /incident|breach|escalation/, [
    "INCIDENT-RESPONSE-PLAN",
    "INCIDENT-TICKETS",
    "POST-INCIDENT-REVIEWS"
  ]);
  addWhen(specific, normalizedControlText, /retention|minimization|storage|disposal|deletion/, [
    "RETENTION-SCHEDULE",
    "DELETION-JOB-LOGS",
    "LEGAL-HOLD-REGISTER"
  ]);
  addWhen(specific, normalizedControlText, /continuity|resilience/, [
    "BUSINESS-CONTINUITY-PLAN",
    "BCP-EXERCISE-RESULTS",
    "RECOVERY-OWNER-APPROVALS"
  ]);
  addWhen(specific, normalizedControlText, /disaster|backup|restore|restoration/, [
    "DISASTER-RECOVERY-PLAN",
    "BACKUP-RESTORE-LOGS",
    "DR-TEST-RESULTS"
  ]);
  addWhen(specific, normalizedControlText, /asset|inventory|ownership|lifecycle/, [
    "ASSET-INVENTORY-EXPORT",
    "ASSET-OWNER-REVIEW",
    "ASSET-LIFECYCLE-RECORDS"
  ]);
  addWhen(specific, normalizedControlText, /authentication|access|privileged|permission|identity/, [
    "ACCESS-CONTROL-POLICY",
    "MFA-ENROLLMENT-REPORT",
    "PRIVILEGED-ACCESS-REVIEW",
    "ACCESS-EXCEPTION-LOG"
  ]);
  return uniqueStrings([
    ...specific.map((suffix) => `EV-${base}-${suffix}`),
    `EV-${base}-POLICY`,
    `EV-${base}-PROCEDURE`,
    `EV-${base}-REVIEW-RECORDS`,
    `EV-${base}-OPERATING-EVIDENCE`
  ]).slice(0, 8);
}

function addWhen(target: string[], text: string, pattern: RegExp, values: string[]): void {
  if (pattern.test(text)) {
    target.push(...values);
  }
}

function tenantScopeTagsForControl(domain: string, title: string): string[] {
  return uniqueStrings(
    normalizeSearchText(`${domain} ${title}`)
      .split(" ")
      .filter((term) => term.length > 3 && !["control", "management", "policy", "procedures"].includes(term))
  ).slice(0, 5);
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function slugForEvidence(value: string): string {
  const slug = value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "CONTROL";
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim()).map((value) => value.trim()))];
}

function normalizedFrameworkKeys(values: string[] | undefined): string[] | null {
  const normalized = uniqueStrings((values ?? []).map((value) => value.toUpperCase()));
  return normalized.length > 0 ? normalized : null;
}

function shortChecksum(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

async function findGenerationRunWithClient(
  client: TenantScopedClient,
  tenantId: string,
  generationRunId: string
): Promise<AiGenerationRunRecord | null> {
  const result = await client.query(
    `
      select ${generationColumns()}
      from ai_generation_runs
      where tenant_id = $1 and id = $2
    `,
    [tenantId, generationRunId]
  );
  if (!result.rows[0]) {
    return null;
  }
  return recordWithQuestions(client, result.rows[0]);
}

async function recordWithQuestions(
  client: TenantScopedClient,
  row: Record<string, unknown>
): Promise<AiGenerationRunRecord> {
  const questions = await client.query(
    `
      select ${questionColumns()}, $3::text as generation_status
      from ai_question_versions q
      where q.tenant_id = $1 and q.generation_run_id = $2
      order by q.created_at, q.id
    `,
    [row.tenant_id, row.id, row.status]
  );
  return mapGeneration(row, questions.rows.map(mapQuestion));
}

async function upsertPrompt(
  client: TenantScopedClient,
  tenantId: string,
  prompt: PromptVersion,
  actorId: string
): Promise<PromptVersion> {
  const result = await client.query(
    `
      insert into ai_prompt_versions (
        id, tenant_id, prompt_key, prompt_version, template_sha256, parameters_schema,
        status, evaluation_id, approved_by, approved_at, classification, created_by, updated_by
      )
      values ($1, $2, $3, $4, $5, '{}'::jsonb, $6, $7, $8, $9, 'confidential', $10, $10)
      on conflict (tenant_id, prompt_key, prompt_version) do update
      set updated_at = ai_prompt_versions.updated_at
      returning id, prompt_key, prompt_version, template_sha256, status, evaluation_id, approved_by, approved_at
    `,
    [
      prompt.id,
      tenantId,
      prompt.key,
      prompt.version,
      prompt.templateSha256,
      prompt.status,
      prompt.evaluationId ?? null,
      prompt.approvedBy ?? null,
      prompt.approvedAt ?? null,
      actorId
    ]
  );
  const row = result.rows[0];
  return {
    id: String(row.id),
    key: String(row.prompt_key),
    version: String(row.prompt_version),
    templateSha256: String(row.template_sha256),
    status: row.status as PromptVersion["status"],
    evaluationId: row.evaluation_id ? String(row.evaluation_id) : undefined,
    approvedBy: row.approved_by ? String(row.approved_by) : undefined,
    approvedAt: row.approved_at as Date | undefined
  };
}

async function upsertModel(
  client: TenantScopedClient,
  tenantId: string,
  model: ModelDeployment,
  actorId: string
): Promise<ModelDeployment> {
  const result = await client.query(
    `
      insert into ai_model_deployments (
        id, tenant_id, provider, model_name, deployment_version, region, risk_tier,
        no_training, egress_allow_list, status, kill_switch, evaluation_id, approved_by,
        approved_at, classification, created_by, updated_by
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10, $11, $12, $13, $14,
              'confidential', $15, $15)
      on conflict (tenant_id, provider, model_name, deployment_version, region) do update
      set updated_at = ai_model_deployments.updated_at
      returning id, provider, model_name, deployment_version, region, risk_tier, no_training,
                egress_allow_list, status, kill_switch, evaluation_id, approved_by, approved_at
    `,
    [
      model.id,
      tenantId,
      model.provider,
      model.modelName,
      model.deploymentVersion,
      model.region,
      model.riskTier,
      model.noTraining,
      model.egressAllowList,
      model.status,
      model.killSwitch,
      model.evaluationId ?? null,
      model.approvedBy ?? null,
      model.approvedAt ?? null,
      actorId
    ]
  );
  const row = result.rows[0];
  return {
    id: String(row.id),
    provider: String(row.provider),
    modelName: String(row.model_name),
    deploymentVersion: String(row.deployment_version),
    region: String(row.region),
    riskTier: row.risk_tier as ModelDeployment["riskTier"],
    noTraining: Boolean(row.no_training),
    egressAllowList: (row.egress_allow_list as string[] | null) ?? [],
    status: row.status as ModelDeployment["status"],
    killSwitch: Boolean(row.kill_switch),
    evaluationId: row.evaluation_id ? String(row.evaluation_id) : undefined,
    approvedBy: row.approved_by ? String(row.approved_by) : undefined,
    approvedAt: row.approved_at as Date | undefined
  };
}

async function upsertRetrieval(
  client: TenantScopedClient,
  retrieval: RetrievalIndex,
  actorId: string
): Promise<RetrievalIndex> {
  const result = await client.query(
    `
      insert into ai_retrieval_indexes (
        id, tenant_id, index_key, index_version, source_pack_versions, acl_tenant_ids,
        status, approved_by, approved_at, classification, created_by, updated_by
      )
      values ($1, $2, $3, $4, $5::jsonb, $6::uuid[], $7, $8, $9, 'confidential', $10, $10)
      on conflict (tenant_id, index_key, index_version) do update
      set source_pack_versions = excluded.source_pack_versions,
          acl_tenant_ids = excluded.acl_tenant_ids,
          updated_by = excluded.updated_by,
          updated_at = now()
      returning id, tenant_id, index_key, index_version, source_pack_versions, acl_tenant_ids,
                status, approved_by, approved_at
    `,
    [
      retrieval.id,
      retrieval.tenantId,
      retrieval.key,
      retrieval.version,
      JSON.stringify(retrieval.sources),
      retrieval.allowedTenantIds,
      retrieval.status,
      retrieval.approvedBy ?? null,
      retrieval.approvedAt ?? null,
      actorId
    ]
  );
  const row = result.rows[0];
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    key: String(row.index_key),
    version: String(row.index_version),
    status: row.status as RetrievalIndex["status"],
    allowedTenantIds: (row.acl_tenant_ids as string[] | null) ?? [],
    sources: mapJsonArray<CitationSource>(row.source_pack_versions),
    approvedBy: row.approved_by ? String(row.approved_by) : undefined,
    approvedAt: row.approved_at as Date | undefined
  };
}

async function insertQuestion(client: TenantScopedClient, run: AiGenerationRun, question: QuestionVersion): Promise<void> {
  await client.query(
    `
      insert into ai_question_versions (
        id, tenant_id, generation_run_id, question_version, question_text, response_type,
        evidence_expectations, citations, confidence, state, approved_by, approved_at,
        classification, created_by, created_at, updated_by, updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12,
              'confidential', $13, $14, $13, $14)
    `,
    [
      question.id,
      run.tenantId,
      run.id,
      question.version,
      question.questionText,
      question.responseType,
      JSON.stringify(question.evidenceExpectationIds),
      JSON.stringify(question.citations),
      question.confidence,
      question.state,
      question.approvedBy ?? null,
      question.approvedAt ?? null,
      run.actorId,
      run.createdAt
    ]
  );
}

function generationColumns(): string {
  return `
    id, tenant_id, version, use_case, status, actor_id, prompt_version_id, model_deployment_id,
    retrieval_index_id, generation_parameters, input_fingerprint, output_fingerprint,
    failure_reason, provenance, classification, created_by, created_at, updated_by, updated_at
  `;
}

function questionColumns(): string {
  return `
    q.id, q.tenant_id, q.version as version_number, q.generation_run_id, q.question_version,
    q.question_text, q.response_type, q.evidence_expectations, q.citations, q.confidence,
    q.state, q.approved_by, q.approved_at, q.classification, q.created_by, q.created_at,
    q.updated_by, q.updated_at
  `;
}

function mapGeneration(
  row: Record<string, unknown>,
  questions: AiQuestionVersionRecord[]
): AiGenerationRunRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    actorId: String(row.actor_id),
    useCase: row.use_case as AiGenerationRun["useCase"],
    status: row.status as AiGenerationStatus,
    promptVersionId: String(row.prompt_version_id),
    modelDeploymentId: String(row.model_deployment_id),
    retrievalIndexId: String(row.retrieval_index_id),
    generationParameters: row.generation_parameters as AiGenerationRun["generationParameters"],
    inputFingerprint: String(row.input_fingerprint),
    outputFingerprint: String(row.output_fingerprint),
    failureReason: row.failure_reason ? (row.failure_reason as AiGenerationRun["failureReason"]) : undefined,
    provenance: (row.provenance as Record<string, unknown> | null) ?? {},
    questions,
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

function mapQuestion(row: Record<string, unknown>): AiQuestionVersionRecord {
  const generationParameters = {};
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    generationRunId: String(row.generation_run_id),
    generationStatus: row.generation_status as AiGenerationStatus,
    versionNumber: Number(row.version_number),
    version: String(row.question_version),
    questionText: String(row.question_text),
    responseType: row.response_type as AiQuestionVersionRecord["responseType"],
    evidenceExpectationIds: mapJsonArray<string>(row.evidence_expectations),
    citations: mapJsonArray<CitationSource>(row.citations),
    confidence: Number(row.confidence),
    state: row.state as AiReviewState,
    provenance: {
      promptVersionId: "",
      modelDeploymentId: "",
      retrievalIndexId: "",
      retrievalIndexVersion: "",
      generationParameters: generationParameters as AiQuestionVersionRecord["provenance"]["generationParameters"],
      inputFingerprint: ""
    },
    approvedBy: row.approved_by ? String(row.approved_by) : undefined,
    approvedAt: row.approved_at as Date | undefined,
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

function approvedEvaluation(actorId: string): GoldenSetEvaluation {
  return {
    id: randomUUID(),
    score: 0.98,
    passed: true,
    adversarialPassed: true,
    tenantIsolationPassed: true,
    driftWithinThreshold: true,
    approvedBy: actorId,
    approvedAt: new Date()
  };
}

function uniqueSources(sources: CitationSource[]): CitationSource[] {
  const byId = new Map<string, CitationSource>();
  for (const source of sources) {
    byId.set(`${source.sourceType}:${source.sourceId}`, source);
  }
  return [...byId.values()];
}

function mapJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (typeof value === "string") {
    return JSON.parse(value) as T[];
  }
  return [];
}

function hashObject(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function metadata(row: Record<string, unknown>) {
  return {
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

// ai_publication_events is append-only (0020) — no updated_by/updated_at column exists.
function appendOnlyMetadata(row: Record<string, unknown>) {
  return {
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date
  };
}

function knowledgeChunkColumns(): string {
  return `id, tenant_id, version, retrieval_index_id, source_type, source_id, source_version, content_hash, acl_json, text_uri, classification, created_by, created_at, updated_by, updated_at`;
}

function retrievalRunColumns(): string {
  return `id, tenant_id, version, query_hash, filters_json, retrieval_index_id, top_k, started_at, finished_at, classification, created_by, created_at, updated_by, updated_at`;
}

function retrievedChunkColumns(): string {
  return `id, tenant_id, version, retrieval_run_id, knowledge_chunk_id, rank, score, acl_decision, classification, created_by, created_at, updated_by, updated_at`;
}

function generationCitationColumns(): string {
  return `id, tenant_id, version, generation_run_id, output_path, knowledge_chunk_id, locator, entailment_score, classification, created_by, created_at, updated_by, updated_at`;
}

function safetyCheckColumns(): string {
  return `id, tenant_id, version, generation_run_id, check_type, policy_version, result, score, redaction_summary, classification, created_by, created_at, updated_by, updated_at`;
}

function evaluationSuiteColumns(): string {
  return `id, tenant_id, version, use_case, suite_key, suite_version, status, threshold_policy, classification, created_by, created_at, updated_by, updated_at`;
}

function evaluationCaseColumns(): string {
  return `id, tenant_id, version, suite_id, case_key, input_fixture_uri, expected_json, classification, created_by, created_at, updated_by, updated_at`;
}

function evaluationResultColumns(alias?: string): string {
  const prefix = alias ? `${alias}.` : "";
  return [
    "id",
    "tenant_id",
    "version",
    "evaluation_run_id",
    "case_id",
    "metric",
    "score",
    "threshold",
    "passed",
    "artifact_uri",
    "classification",
    "created_by",
    "created_at",
    "updated_by",
    "updated_at"
  ]
    .map((column) => `${prefix}${column}`)
    .join(", ");
}

function publicationEventColumns(): string {
  return `id, tenant_id, version, target_type, target_id, generation_run_id, approved_version_id, approver_id, published_at, classification, created_by, created_at`;
}

function mapKnowledgeChunk(row: Record<string, unknown>): KnowledgeChunkRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    retrievalIndexId: String(row.retrieval_index_id),
    sourceType: row.source_type as KnowledgeChunk["sourceType"],
    sourceId: String(row.source_id),
    sourceVersion: String(row.source_version),
    contentHash: String(row.content_hash),
    aclJson: mapJson(row.acl_json),
    textUri: String(row.text_uri),
    ...metadata(row)
  };
}

function mapRetrievalRun(row: Record<string, unknown>): RetrievalRunRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    queryHash: String(row.query_hash),
    filtersJson: mapJson(row.filters_json),
    retrievalIndexId: String(row.retrieval_index_id),
    topK: Number(row.top_k),
    startedAt: row.started_at as Date,
    finishedAt: row.finished_at ? (row.finished_at as Date) : undefined,
    ...metadata(row)
  };
}

function mapRetrievedChunk(row: Record<string, unknown>): RetrievedChunkRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    retrievalRunId: String(row.retrieval_run_id),
    knowledgeChunkId: String(row.knowledge_chunk_id),
    rank: Number(row.rank),
    score: Number(row.score),
    aclDecision: row.acl_decision as RetrievedChunk["aclDecision"],
    ...metadata(row)
  };
}

function mapGenerationCitation(row: Record<string, unknown>): GenerationCitationRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    generationRunId: String(row.generation_run_id),
    outputPath: String(row.output_path),
    knowledgeChunkId: String(row.knowledge_chunk_id),
    locator: row.locator ? String(row.locator) : undefined,
    entailmentScore: row.entailment_score !== null && row.entailment_score !== undefined ? Number(row.entailment_score) : undefined,
    ...metadata(row)
  };
}

function mapSafetyCheck(row: Record<string, unknown>): SafetyCheckRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    generationRunId: String(row.generation_run_id),
    checkType: row.check_type as SafetyCheck["checkType"],
    policyVersion: String(row.policy_version),
    result: row.result as SafetyCheck["result"],
    score: row.score !== null && row.score !== undefined ? Number(row.score) : undefined,
    redactionSummary: mapJson(row.redaction_summary),
    ...metadata(row)
  };
}

function mapEvaluationSuite(row: Record<string, unknown>): EvaluationSuiteRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    useCase: String(row.use_case),
    suiteKey: String(row.suite_key),
    suiteVersion: String(row.suite_version),
    status: row.status as EvaluationSuite["status"],
    thresholdPolicy: mapJson(row.threshold_policy),
    ...metadata(row)
  };
}

function mapEvaluationCase(row: Record<string, unknown>): EvaluationCaseRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    suiteId: String(row.suite_id),
    caseKey: String(row.case_key),
    inputFixtureUri: String(row.input_fixture_uri),
    expectedJson: mapJson(row.expected_json),
    ...metadata(row)
  };
}

function mapEvaluationResult(row: Record<string, unknown>): EvaluationResultRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    evaluationRunId: String(row.evaluation_run_id),
    caseId: String(row.case_id),
    metric: String(row.metric),
    score: Number(row.score),
    threshold: Number(row.threshold),
    passed: Boolean(row.passed),
    artifactUri: row.artifact_uri ? String(row.artifact_uri) : undefined,
    ...metadata(row)
  };
}

function mapPublicationEvent(row: Record<string, unknown>): AiPublicationEventRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    versionNumber: Number(row.version),
    targetType: row.target_type as AiPublicationEvent["targetType"],
    targetId: String(row.target_id),
    generationRunId: row.generation_run_id ? String(row.generation_run_id) : undefined,
    approvedVersionId: String(row.approved_version_id),
    approverId: String(row.approver_id),
    publishedAt: row.published_at as Date,
    ...appendOnlyMetadata(row)
  };
}

function mapJson(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    return JSON.parse(value) as Record<string, unknown>;
  }
  return {};
}
