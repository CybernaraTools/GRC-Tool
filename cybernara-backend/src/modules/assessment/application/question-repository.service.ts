import { createHash } from "node:crypto";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import pg from "pg";
import { CANONICAL_CONTENT_TENANT_ID } from "../../framework-content/public.js";
import { OpenAiQuestionGeneratorService } from "../../ai-orchestration/application/openai-question-generator.service.js";
import type { AiQuestionVersionRecord, ApprovedControlContext, CitationSource } from "../../ai-orchestration/public.js";
import { TenantScopedDb, type TenantScopedClient } from "../../../platform/database/tenant-scoped-db.js";
import { ADMIN_DATABASE_POOL } from "../../../platform/database/tokens.js";
import type { Pagination } from "../../../shared/pagination.js";
import type { PinnedControlRef } from "../domain/assessment.js";

export type QuestionRepositoryStatus = "draft" | "pending_review" | "approved" | "rejected" | "deprecated" | "inactive" | "retired";
export type QuestionRepositoryResponseType = "boolean" | "text" | "maturity" | "multi_select";

export interface FrameworkEnablementRecord {
  id: string;
  tenantId: string;
  frameworkId: string;
  frameworkVersionId: string;
  sourcePackageId: string;
  frameworkKey: string;
  frameworkName: string;
  versionKey: string;
  status: string;
  subscribedAt: Date;
  classification: string;
}

export interface AssessmentQuestionOption {
  frameworkId: string;
  frameworkVersionId: string;
  frameworkKey: string;
  frameworkName: string;
  frameworkVersion: string;
  frameworkKeys: string[];
  sourcePackageId: string;
  controlId: string;
  controlTitle: string;
  harmonizedControlId: string;
  harmonizedControlName: string;
  mappingVersion: string;
  questionVersionId: string;
  questionSetId: string;
  questionSetKey: string;
  questionVersion: number;
  questionText: string;
  responseType: QuestionRepositoryResponseType;
  evidenceExpectationIds: string[];
  citations: Array<Record<string, unknown>>;
  confidence: number;
  sourceType: string;
  sourceAiQuestionVersionId: string | null;
  generationRunId: string | null;
  promptVersionId: string | null;
  modelDeploymentId: string | null;
  retrievalIndexId: string | null;
  status: QuestionRepositoryStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
  previousVersionCount: number;
  isCurrentVersion: boolean;
}

export interface QuestionRepositoryEntry {
  id: string;
  tenantId: string;
  questionSetId: string;
  harmonizedControlId: string;
  harmonizedControlName: string | null;
  harmonizedControlDescription: string | null;
  harmonizedDomain: string | null;
  questionSetKey: string;
  sourceType: string;
  questionVersion: number;
  status: QuestionRepositoryStatus;
  questionText: string;
  responseType: QuestionRepositoryResponseType;
  evidenceExpectationIds: string[];
  citations: Array<Record<string, unknown>>;
  confidence: number;
  sourceAiQuestionVersionId: string | null;
  generationRunId: string | null;
  promptVersionId: string | null;
  modelDeploymentId: string | null;
  retrievalIndexId: string | null;
  frameworkKeys: string[];
  sourceControls: QuestionRepositorySourceControl[];
  approvedBy: string | null;
  approvedAt: Date | null;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface QuestionRepositorySourceControl {
  frameworkKey: string;
  sourceControlId: string;
  mappingClassification: string;
  coverage: string | null;
  controlId: string | null;
  controlTitle: string | null;
  subcontrolId: string | null;
  subcontrolTitle: string | null;
}

export interface QuestionRepositoryControlContext {
  harmonizedControlId: string;
  harmonizedControlName: string;
  harmonizedControlDescription: string;
  harmonizedDomain: string;
  frameworkKeys: string[];
  sourceControls: QuestionRepositorySourceControl[];
  evidenceExpectationIds: string[];
  citations: CitationSource[];
}

export interface QuestionRepositoryAssistResult {
  harmonizedControlId: string;
  responseType: QuestionRepositoryResponseType;
  suggestedQuestionText: string;
  evidenceExpectationIds: string[];
  citations: CitationSource[];
  confidence: number;
  controlContext: QuestionRepositoryControlContext;
}

export interface QuestionRepositoryConsumers {
  frameworks: Array<{
    frameworkKey: string;
    sourceControlId: string;
    harmonizedControlId: string;
    mappingStatus: string;
  }>;
  assessments: Array<{
    tenantId: string;
    assessmentId: string;
    assessmentName: string;
    assessmentItemId: string;
    status: string;
  }>;
}

export interface AssessmentControlSelection {
  questionVersionId?: string;
  frameworkVersionId?: string;
  controlId?: string;
  harmonizedControlId?: string;
  frameworkKey?: string;
  frameworkVersion?: string;
  mappingVersion?: string;
  questionVersion?: string;
}

@Injectable()
export class QuestionRepositoryService {
  constructor(
    @Inject(TenantScopedDb) private readonly db: TenantScopedDb,
    @Inject(ADMIN_DATABASE_POOL) private readonly adminPool: pg.Pool,
    @Inject(OpenAiQuestionGeneratorService) private readonly questionGenerator: OpenAiQuestionGeneratorService = new OpenAiQuestionGeneratorService()
  ) {}

  async enableFramework(input: {
    tenantId: string;
    actorId: string;
    frameworkVersionId: string;
  }): Promise<FrameworkEnablementRecord> {
    const version = await this.findCanonicalFrameworkVersion(input.frameworkVersionId);
    if (!version.sourcePackageId) {
      throw new BadRequestException("Published framework version does not have a source package to subscribe to.");
    }

    await this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      await client.query(
        `
          with updated as (
            update tenant_catalog_subscriptions
               set updated_by = $4,
                   updated_at = now()
             where tenant_id = $1
               and framework_id = $2
               and source_package_id = $3
               and status = 'active'
             returning id
          )
          insert into tenant_catalog_subscriptions (
            tenant_id, framework_id, source_package_id, status, classification, created_by, updated_by
          )
          select $1, $2, $3, 'active', 'restricted', $4, $4
          where not exists (select 1 from updated)
        `,
        [input.tenantId, version.frameworkId, version.sourcePackageId, input.actorId]
      );
    });

    await this.ensureCuratedBaselineQuestions({
      actorId: input.actorId,
      frameworkVersionId: version.frameworkVersionId
    });

    const enabled = await this.listEnabledFrameworks(input.tenantId);
    const match = enabled.find((entry) => entry.frameworkVersionId === version.frameworkVersionId);
    if (!match) {
      throw new Error("Framework subscription was not visible after enablement.");
    }
    return match;
  }

  async listEnabledFrameworks(tenantId: string): Promise<FrameworkEnablementRecord[]> {
    const subscriptions = await this.activeSubscriptions(tenantId);
    if (subscriptions.length === 0) {
      return [];
    }

    return this.db.withTenant(CANONICAL_CONTENT_TENANT_ID, undefined, async (client) => {
      const result = await client.query(
        `
          select
            s.id,
            s.tenant_id,
            f.id as framework_id,
            fv.id as framework_version_id,
            fv.source_package_id,
            f.framework_key,
            f.name as framework_name,
            fv.version_key,
            s.status,
            s.subscribed_at,
            s.classification
          from jsonb_to_recordset($1::jsonb) as s(
            id uuid,
            tenant_id uuid,
            framework_id uuid,
            source_package_id uuid,
            status text,
            subscribed_at timestamptz,
            classification text
          )
          join frameworks f on f.id = s.framework_id and f.tenant_id = $2
          join framework_versions fv
            on fv.framework_id = f.id
           and fv.tenant_id = $2
           and fv.source_package_id = s.source_package_id
           and fv.status = 'published'
          order by f.framework_key, fv.version_key
        `,
        [JSON.stringify(subscriptions), CANONICAL_CONTENT_TENANT_ID]
      );
      return result.rows.map(mapFrameworkEnablement);
    });
  }

  async listAssessmentQuestionOptions(tenantId: string, pagination: Pagination): Promise<AssessmentQuestionOption[]> {
    return this.queryAssessmentQuestionOptions({
      tenantId,
      pagination
    });
  }

  async resolveAssessmentControls(input: {
    tenantId: string;
    selections: AssessmentControlSelection[];
  }): Promise<PinnedControlRef[]> {
    if (input.selections.length === 0) {
      throw new BadRequestException("Assessment requires at least one selected approved question.");
    }

    const refs: PinnedControlRef[] = [];
    for (const selection of input.selections) {
      const option = await this.resolveAssessmentQuestionOption(input.tenantId, selection);
      refs.push({
        frameworkKey: option.frameworkKey,
        frameworkVersion: option.frameworkVersion,
        mappingVersion: option.mappingVersion,
        controlId: option.controlId,
        harmonizedControlId: option.harmonizedControlId,
        questionVersion: String(option.questionVersion),
        questionVersionId: option.questionVersionId
      });
    }
    return refs;
  }

  async publishAiQuestion(input: {
    actorId: string;
    question: AiQuestionVersionRecord;
  }): Promise<QuestionRepositoryEntry> {
    const existing = await this.findBySourceAiQuestion(input.question.id);
    if (existing) {
      return existing;
    }

    const harmonizedControlId = harmonizedControlFromCitations(input.question.citations) ?? `AI-${input.question.id}`;
    const semanticDuplicate = await this.findApprovedQuestionBySemanticKey({
      harmonizedControlId,
      responseType: input.question.responseType,
      questionText: input.question.questionText
    });
    if (semanticDuplicate) {
      return semanticDuplicate;
    }

    const questionSetKey = `ai:${harmonizedControlId}:${input.question.responseType}`;
    const payload = {
      questionText: input.question.questionText,
      responseType: input.question.responseType,
      evidenceExpectationIds: input.question.evidenceExpectationIds,
      citations: input.question.citations,
      confidence: input.question.confidence,
      source: "ai_generated",
      sourceAiQuestionVersionId: input.question.id,
      generationRunId: input.question.generationRunId,
      promptVersionId: input.question.provenance.promptVersionId || null,
      modelDeploymentId: input.question.provenance.modelDeploymentId || null,
      retrievalIndexId: input.question.provenance.retrievalIndexId || null
    };

    return this.db.withTenant(CANONICAL_CONTENT_TENANT_ID, input.actorId, async (client) => {
      const questionSetId = await upsertQuestionSet(client, {
        controlId: harmonizedControlId,
        questionSetKey,
        sourceType: "ai_generated",
        actorId: input.actorId
      });
      const versionNumber = await nextQuestionVersion(client, questionSetId);
      const result = await client.query(
        `
          with inserted as (
            insert into question_versions (
              tenant_id, question_set_id, question_version, payload_json, source_ai_question_version_id,
              approved_by, approved_at, checksum, status, classification, created_by, updated_by
            )
            values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, 'approved', 'confidential', $9, $9)
            returning *
          )
          select ${questionRepositoryColumns()}
          from inserted qv
          join question_sets qs on qs.id = qv.question_set_id
        `,
        [
          CANONICAL_CONTENT_TENANT_ID,
          questionSetId,
          versionNumber,
          JSON.stringify(payload),
          input.question.id,
          input.question.approvedBy ?? input.actorId,
          input.question.approvedAt ?? new Date(),
          checksum(payload),
          input.actorId
        ]
      );
      return mapQuestionRepositoryEntry(result.rows[0]);
    });
  }

  async listGlobalQuestions(input: {
    pagination: Pagination;
    search?: string;
    status?: string;
    harmonizedControlId?: string;
    frameworkKey?: string;
  }): Promise<QuestionRepositoryEntry[]> {
    const result = await this.adminPool.query(
      `
        select
          ${questionRepositoryColumns()},
          hc.control_name as harmonized_control_name,
          hc.control_description as harmonized_control_description,
          hc.domain as harmonized_domain,
          coalesce(context.framework_keys, array[]::text[]) as framework_keys,
          coalesce(context.source_controls, '[]'::jsonb) as source_controls
        from question_versions qv
        join question_sets qs on qs.id = qv.question_set_id
        left join harmonized_controls hc
          on hc.tenant_id = qv.tenant_id
         and hc.harmonized_id = qs.control_id
        left join lateral (
          ${sourceControlContextSql("qs.control_id")}
        ) context on true
        where qv.tenant_id = $1
          and ($2::text is null or qv.status = $2)
          and (
            $3::text is null
            or qs.control_id ilike '%' || $3 || '%'
            or coalesce(hc.control_name, '') ilike '%' || $3 || '%'
            or coalesce(hc.control_description, '') ilike '%' || $3 || '%'
            or qs.question_set_key ilike '%' || $3 || '%'
            or qv.payload_json ->> 'questionText' ilike '%' || $3 || '%'
            or exists (
              select 1
              from control_mappings cm_search
              where cm_search.tenant_id = $1
                and cm_search.harmonized_control_id = qs.control_id
                and cm_search.status = 'published'
                and (
                  cm_search.framework_key ilike '%' || $3 || '%'
                  or cm_search.source_control_id ilike '%' || $3 || '%'
                )
            )
          )
          and ($4::text is null or qs.control_id = $4)
          and (
            $5::text is null
            or exists (
              select 1
              from control_mappings cm_filter
              where cm_filter.tenant_id = $1
                and cm_filter.harmonized_control_id = qs.control_id
                and cm_filter.status = 'published'
                and cm_filter.framework_key = $5
            )
          )
        order by
          case
            when $3::text is null then 100
            when lower(qv.payload_json ->> 'questionText') = lower($3) then 0
            when lower(qs.control_id) = lower($3) then 1
            when lower(coalesce(hc.control_name, '')) = lower($3) then 2
            when qv.payload_json ->> 'questionText' ilike $3 || '%' then 3
            when coalesce(hc.control_name, '') ilike $3 || '%' then 4
            when qs.control_id ilike $3 || '%' then 5
            else 20
          end,
          qv.created_at desc,
          qv.id desc
        limit $6 offset $7
      `,
      [
        CANONICAL_CONTENT_TENANT_ID,
        input.status || null,
        input.search?.trim() || null,
        input.harmonizedControlId?.trim() || null,
        input.frameworkKey?.trim() || null,
        input.pagination.limit,
        input.pagination.offset
      ]
    );
    return result.rows.map(mapQuestionRepositoryEntry);
  }

  async listGlobalControlContexts(input: {
    pagination: Pagination;
    search?: string;
  }): Promise<QuestionRepositoryControlContext[]> {
    return this.queryGlobalControlContexts({
      pagination: input.pagination,
      search: input.search
    });
  }

  async suggestQuestionDraft(input: {
    harmonizedControlId: string;
    questionText: string;
    responseType: QuestionRepositoryResponseType;
  }): Promise<QuestionRepositoryAssistResult> {
    const controlContext = await this.getGlobalControlContext(input.harmonizedControlId);
    const [candidate] = await this.questionGenerator.generateQuestions({
      generationParameters: { temperature: 0.1, maxOutputTokens: 1200, retrievalTopK: 6 },
      controls: [toApprovedControlContext(controlContext)],
      responseTypes: [input.responseType],
      questionFocus: input.questionText.trim() || `${controlContext.harmonizedControlName} assessment question`
    });
    return {
      harmonizedControlId: controlContext.harmonizedControlId,
      responseType: candidate.responseType,
      suggestedQuestionText: candidate.questionText,
      evidenceExpectationIds: candidate.evidenceExpectationIds,
      citations: candidate.citations,
      confidence: candidate.confidence,
      controlContext
    };
  }

  async createManualDraft(input: {
    actorId: string;
    harmonizedControlId: string;
    questionText: string;
    responseType: QuestionRepositoryResponseType;
    evidenceExpectationIds: string[];
    citations: Array<Record<string, unknown>>;
    confidence: number;
  }): Promise<QuestionRepositoryEntry> {
    const payload = {
      questionText: input.questionText,
      responseType: input.responseType,
      evidenceExpectationIds: input.evidenceExpectationIds,
      citations: input.citations,
      confidence: input.confidence,
      source: "manual"
    };
    return this.db.withTenant(CANONICAL_CONTENT_TENANT_ID, input.actorId, async (client) => {
      const questionSetId = await upsertQuestionSet(client, {
        controlId: input.harmonizedControlId,
        questionSetKey: `manual:${input.harmonizedControlId}:${input.responseType}:${slug(input.questionText).slice(0, 48)}`,
        sourceType: "curated",
        actorId: input.actorId
      });
      const versionNumber = await nextQuestionVersion(client, questionSetId);
      const result = await client.query(
        `
          with inserted as (
            insert into question_versions (
              tenant_id, question_set_id, question_version, payload_json, checksum, status,
              classification, created_by, updated_by
            )
            values ($1, $2, $3, $4::jsonb, $5, 'draft', 'confidential', $6, $6)
            returning *
          )
          select ${questionRepositoryColumns()}
          from inserted qv
          join question_sets qs on qs.id = qv.question_set_id
        `,
        [CANONICAL_CONTENT_TENANT_ID, questionSetId, versionNumber, JSON.stringify(payload), checksum(payload), input.actorId]
      );
      return mapQuestionRepositoryEntry(result.rows[0]);
    });
  }

  async createRevisionDraft(input: {
    actorId: string;
    baseQuestionVersionId: string;
    harmonizedControlId: string;
    questionText: string;
    responseType: QuestionRepositoryResponseType;
    evidenceExpectationIds: string[];
    citations: Array<Record<string, unknown>>;
    confidence: number;
  }): Promise<QuestionRepositoryEntry> {
    const base = await this.adminPool.query(
      `
        select qv.question_set_id, qs.control_id
        from question_versions qv
        join question_sets qs on qs.id = qv.question_set_id
        where qv.tenant_id = $1 and qv.id = $2
      `,
      [CANONICAL_CONTENT_TENANT_ID, input.baseQuestionVersionId]
    );
    if (!base.rows[0]) {
      throw new NotFoundException("Base question version not found.");
    }

    const targetHarmonizedControlId = input.harmonizedControlId.trim();
    await this.getGlobalControlContext(targetHarmonizedControlId);

    const payload = {
      questionText: input.questionText,
      responseType: input.responseType,
      evidenceExpectationIds: input.evidenceExpectationIds,
      citations: input.citations,
      confidence: input.confidence,
      source: "manual_revision",
      previousHarmonizedControlId: String(base.rows[0].control_id),
      revisedFromQuestionVersionId: input.baseQuestionVersionId
    };

    return this.db.withTenant(CANONICAL_CONTENT_TENANT_ID, input.actorId, async (client) => {
      const baseQuestionSetId = String(base.rows[0].question_set_id);
      const baseHarmonizedControlId = String(base.rows[0].control_id);
      const questionSetId = targetHarmonizedControlId === baseHarmonizedControlId
        ? baseQuestionSetId
        : await upsertQuestionSet(client, {
            controlId: targetHarmonizedControlId,
            questionSetKey: `manual:${targetHarmonizedControlId}:${input.responseType}:${slug(input.questionText).slice(0, 48)}`,
            sourceType: "curated",
            actorId: input.actorId
          });
      const versionNumber = await nextQuestionVersion(client, questionSetId);
      const result = await client.query(
        `
          with inserted as (
            insert into question_versions (
              tenant_id, question_set_id, question_version, payload_json, checksum, status,
              classification, created_by, updated_by
            )
            values ($1, $2, $3, $4::jsonb, $5, 'draft', 'confidential', $6, $6)
            returning *
          )
          select ${questionRepositoryColumns()}
          from inserted qv
          join question_sets qs on qs.id = qv.question_set_id
        `,
        [CANONICAL_CONTENT_TENANT_ID, questionSetId, versionNumber, JSON.stringify(payload), checksum(payload), input.actorId]
      );
      return mapQuestionRepositoryEntry(result.rows[0]);
    });
  }

  async approveGlobalQuestion(input: {
    actorId: string;
    questionVersionId: string;
  }): Promise<QuestionRepositoryEntry> {
    const result = await this.adminPool.query(
      `
        with updated as (
          update question_versions
          set status = 'approved',
              approved_by = coalesce(approved_by, $2),
              approved_at = coalesce(approved_at, now()),
              updated_by = $2,
              updated_at = now(),
              version = version + 1
          where tenant_id = $1 and id = $3 and status in ('draft', 'pending_review', 'approved')
          returning *
        )
        select ${questionRepositoryColumns()}
        from updated qv
        join question_sets qs on qs.id = qv.question_set_id
      `,
      [CANONICAL_CONTENT_TENANT_ID, input.actorId, input.questionVersionId]
    );
    if (!result.rows[0]) {
      throw new NotFoundException("Question version was not found or cannot be approved.");
    }
    return mapQuestionRepositoryEntry(result.rows[0]);
  }

  async updateGlobalQuestionStatus(input: {
    actorId: string;
    questionVersionId: string;
    status: Extract<QuestionRepositoryStatus, "approved" | "inactive" | "retired" | "deprecated">;
  }): Promise<QuestionRepositoryEntry> {
    const result = await this.adminPool.query(
      `
        with updated as (
          update question_versions
          set status = $3,
              updated_by = $2,
              updated_at = now(),
              version = version + 1
          where tenant_id = $1 and id = $4
          returning *
        )
        select ${questionRepositoryColumns()}
        from updated qv
        join question_sets qs on qs.id = qv.question_set_id
      `,
      [CANONICAL_CONTENT_TENANT_ID, input.actorId, input.status, input.questionVersionId]
    );
    if (!result.rows[0]) {
      throw new NotFoundException("Question version not found.");
    }
    return mapQuestionRepositoryEntry(result.rows[0]);
  }

  async compareGlobalQuestionVersions(questionSetId: string): Promise<QuestionRepositoryEntry[]> {
    const result = await this.adminPool.query(
      `
        select ${questionRepositoryColumns()}
        from question_versions qv
        join question_sets qs on qs.id = qv.question_set_id
        where qv.tenant_id = $1 and qv.question_set_id = $2
        order by qv.question_version
      `,
      [CANONICAL_CONTENT_TENANT_ID, questionSetId]
    );
    return result.rows.map(mapQuestionRepositoryEntry);
  }

  async getGlobalQuestionConsumers(questionVersionId: string): Promise<QuestionRepositoryConsumers> {
    const question = await this.adminPool.query(
      `
        select qs.control_id
        from question_versions qv
        join question_sets qs on qs.id = qv.question_set_id
        where qv.tenant_id = $1 and qv.id = $2
      `,
      [CANONICAL_CONTENT_TENANT_ID, questionVersionId]
    );
    if (!question.rows[0]) {
      throw new NotFoundException("Question version not found.");
    }
    const harmonizedControlId = String(question.rows[0].control_id);
    const frameworks = await this.adminPool.query(
      `
        select framework_key, source_control_id, harmonized_control_id, status as mapping_status
        from control_mappings
        where tenant_id = $1 and harmonized_control_id = $2
        order by framework_key, source_control_id
      `,
      [CANONICAL_CONTENT_TENANT_ID, harmonizedControlId]
    );
    const assessments = await this.adminPool.query(
      `
        select tenant_id, assessment_id, id as assessment_item_id, status
        from assessment_items
        where question_version_id = $1
        order by created_at desc
      `,
      [questionVersionId]
    );
    const assessmentNames = await this.adminPool.query(
      `
        select id, scope_name
        from assessments
        where id = any($1::uuid[])
      `,
      [assessments.rows.map((row) => row.assessment_id)]
    );
    const names = new Map(assessmentNames.rows.map((row) => [String(row.id), String(row.scope_name)]));
    return {
      frameworks: frameworks.rows.map((row) => ({
        frameworkKey: String(row.framework_key),
        sourceControlId: String(row.source_control_id),
        harmonizedControlId: String(row.harmonized_control_id),
        mappingStatus: String(row.mapping_status)
      })),
      assessments: assessments.rows.map((row) => ({
        tenantId: String(row.tenant_id),
        assessmentId: String(row.assessment_id),
        assessmentName: names.get(String(row.assessment_id)) ?? "Assessment",
        assessmentItemId: String(row.assessment_item_id),
        status: String(row.status)
      }))
    };
  }

  async ensureCuratedBaselineQuestions(input: {
    actorId: string;
    frameworkVersionId?: string;
    limit?: number;
  }): Promise<{ examined: number; created: number }> {
    return this.db.withTenant(CANONICAL_CONTENT_TENANT_ID, input.actorId, async (client) => {
      const rows = await client.query(
        `
          select distinct
            cm.harmonized_control_id,
            hc.control_name,
            hc.control_description,
            array_agg(distinct cm.framework_key || ':' || cm.source_control_id) as source_ids
          from control_mappings cm
          join harmonized_controls hc
            on hc.tenant_id = cm.tenant_id
           and hc.harmonized_id = cm.harmonized_control_id
          left join frameworks f
            on f.tenant_id = cm.tenant_id
           and f.framework_key = cm.framework_key
          left join framework_versions fv
            on fv.tenant_id = cm.tenant_id
           and fv.framework_id = f.id
          where cm.tenant_id = $1
            and cm.status = 'published'
            and hc.status = 'published'
            and ($2::uuid is null or fv.id = $2)
          group by cm.harmonized_control_id, hc.control_name, hc.control_description
          order by cm.harmonized_control_id
          limit $3
        `,
        [CANONICAL_CONTENT_TENANT_ID, input.frameworkVersionId ?? null, input.limit ?? 500]
      );

      let created = 0;
      for (const row of rows.rows) {
        const didCreate = await this.ensureCuratedQuestionForControl(client, input.actorId, row);
        if (didCreate) {
          created += 1;
        }
      }
      return { examined: rows.rowCount ?? rows.rows.length, created };
    });
  }

  private async ensureCuratedQuestionForControl(
    client: TenantScopedClient,
    actorId: string,
    row: Record<string, unknown>
  ): Promise<boolean> {
    const harmonizedControlId = String(row.harmonized_control_id);
    const existing = await client.query(
      `
        select qv.id
        from question_versions qv
        join question_sets qs on qs.id = qv.question_set_id
        where qv.tenant_id = $1
          and qs.control_id = $2
          and qs.question_set_key = $3
          and qv.status = 'approved'
        limit 1
      `,
      [CANONICAL_CONTENT_TENANT_ID, harmonizedControlId, `baseline:${harmonizedControlId}`]
    );
    if (existing.rows[0]) {
      return false;
    }

    const sourceIds = Array.isArray(row.source_ids) ? row.source_ids.map(String) : [];
    const payload = {
      questionText: `How does the organization implement, operate, and evidence ${String(row.control_name)}?`,
      responseType: "text",
      evidenceExpectationIds: [`EV-${slug(harmonizedControlId)}-${slug(String(row.control_name))}`],
      citations: [
        ...sourceIds.map((sourceId) => ({ sourceId, sourceType: "framework_requirement" })),
        { sourceId: harmonizedControlId, sourceType: "harmonized_control" }
      ],
      confidence: 0.85,
      source: "curated_baseline"
    };
    const questionSetId = await upsertQuestionSet(client, {
      controlId: harmonizedControlId,
      questionSetKey: `baseline:${harmonizedControlId}`,
      sourceType: "curated",
      actorId
    });
    await client.query(
      `
        insert into question_versions (
          tenant_id, question_set_id, question_version, payload_json, approved_by, approved_at,
          checksum, status, classification, created_by, updated_by
        )
        values ($1, $2, 1, $3::jsonb, $4, now(), $5, 'approved', 'confidential', $4, $4)
        on conflict (tenant_id, question_set_id, question_version) do nothing
      `,
      [CANONICAL_CONTENT_TENANT_ID, questionSetId, JSON.stringify(payload), actorId, checksum(payload)]
    );
    return true;
  }

  private async findCanonicalFrameworkVersion(frameworkVersionId: string): Promise<{
    frameworkId: string;
    frameworkVersionId: string;
    sourcePackageId: string | null;
  }> {
    return this.db.withTenant(CANONICAL_CONTENT_TENANT_ID, undefined, async (client) => {
      const result = await client.query(
        `
          select f.id as framework_id, fv.id as framework_version_id, fv.source_package_id
          from framework_versions fv
          join frameworks f on f.id = fv.framework_id and f.tenant_id = fv.tenant_id
          where fv.tenant_id = $1 and fv.id = $2 and fv.status = 'published'
        `,
        [CANONICAL_CONTENT_TENANT_ID, frameworkVersionId]
      );
      if (!result.rows[0]) {
        throw new NotFoundException("Published framework version not found.");
      }
      return {
        frameworkId: String(result.rows[0].framework_id),
        frameworkVersionId: String(result.rows[0].framework_version_id),
        sourcePackageId: result.rows[0].source_package_id ? String(result.rows[0].source_package_id) : null
      };
    });
  }

  private async activeSubscriptions(tenantId: string): Promise<Array<Record<string, unknown>>> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select id, tenant_id, framework_id, source_package_id, status, subscribed_at, classification
          from tenant_catalog_subscriptions
          where tenant_id = $1 and status = 'active'
          order by subscribed_at desc
        `,
        [tenantId]
      );
      return result.rows;
    });
  }

  private async resolveAssessmentQuestionOption(
    tenantId: string,
    selection: AssessmentControlSelection
  ): Promise<AssessmentQuestionOption> {
    const questionVersionId = selection.questionVersionId || (isUuid(selection.questionVersion) ? selection.questionVersion : undefined);
    const options = await this.queryAssessmentQuestionOptions({
      tenantId,
      pagination: { limit: 2, offset: 0 },
      questionVersionId,
      frameworkVersionId: selection.frameworkVersionId,
      controlId: selection.controlId,
      harmonizedControlId: selection.harmonizedControlId,
      frameworkKey: selection.frameworkKey
    });
    if (options.length === 0) {
      throw new BadRequestException("Selected control does not resolve to an active, approved question for an enabled framework.");
    }
    return options[0];
  }

  private async queryAssessmentQuestionOptions(input: {
    tenantId: string;
    pagination: Pagination;
    questionVersionId?: string;
    frameworkVersionId?: string;
    controlId?: string;
    harmonizedControlId?: string;
    frameworkKey?: string;
  }): Promise<AssessmentQuestionOption[]> {
    const subscriptions = await this.activeSubscriptions(input.tenantId);
    if (subscriptions.length === 0) {
      return [];
    }

    return this.db.withTenant(CANONICAL_CONTENT_TENANT_ID, undefined, async (client) => {
      const result = await client.query(
        `
          with enabled_versions as (
            select
              f.id as framework_id,
              f.framework_key,
              f.name as framework_name,
              fv.id as framework_version_id,
              fv.version_key,
              fv.source_package_id
            from jsonb_to_recordset($2::jsonb) as s(framework_id uuid, source_package_id uuid)
            join frameworks f on f.tenant_id = $1 and f.id = s.framework_id
            join framework_versions fv
              on fv.tenant_id = $1
             and fv.framework_id = f.id
             and fv.source_package_id = s.source_package_id
             and fv.status = 'published'
          ),
          mapping_rows as (
            select
              ev.framework_id,
              ev.framework_key,
              ev.framework_name,
              ev.framework_version_id,
              ev.version_key as framework_version,
              ev.source_package_id,
              c.control_key as control_id,
              c.title as control_title,
              cm.harmonized_control_id,
              hc.control_name as harmonized_control_name,
              coalesce(mv.version_key, 'published-ingestion') as mapping_version,
              qv.id as question_version_id,
              qv.question_set_id,
              qs.question_set_key,
              qv.question_version,
              qv.payload_json,
              qv.source_ai_question_version_id,
              qv.status,
              qv.approved_by,
              qv.approved_at,
              qv.classification,
              qv.created_by,
              qv.created_at,
              qv.updated_by,
              qv.updated_at,
              qs.source_type,
              lower(regexp_replace(trim(coalesce(qv.payload_json ->> 'questionText', '')), '\\s+', ' ', 'g')) as question_semantic_key,
              coalesce(qv.payload_json ->> 'responseType', 'text') as question_response_key,
              (
                select count(*)::int
                from question_versions history
                where history.tenant_id = qv.tenant_id
                  and history.question_set_id = qv.question_set_id
                  and history.id <> qv.id
              ) as previous_version_count,
              qv.question_version = (
                select max(current_qv.question_version)
                from question_versions current_qv
                where current_qv.tenant_id = qv.tenant_id
                  and current_qv.question_set_id = qv.question_set_id
              ) as is_current_version
            from enabled_versions ev
            join control_sets cs
              on cs.tenant_id = $1
             and cs.framework_version_id = ev.framework_version_id
            join controls c
              on c.tenant_id = $1
             and c.control_set_id = cs.id
            join control_mappings cm
              on cm.tenant_id = $1
             and cm.framework_key = ev.framework_key
             and (cm.source_control_id = c.control_key or cm.source_control_id like c.control_key || '.%')
             and cm.status = 'published'
            join harmonized_controls hc
              on hc.tenant_id = $1
             and hc.harmonized_id = cm.harmonized_control_id
             and hc.status = 'published'
            left join mapping_versions mv
              on mv.tenant_id = $1
             and mv.id = cm.mapping_version_id
            join question_sets qs
              on qs.tenant_id = $1
             and qs.control_id = cm.harmonized_control_id
             and qs.status = 'active'
            join question_versions qv
              on qv.tenant_id = $1
             and qv.question_set_id = qs.id
             and qv.status = 'approved'
            where ($3::uuid is null or qv.id = $3)
              and ($4::uuid is null or ev.framework_version_id = $4)
              and ($5::text is null or c.control_key = $5)
              and ($6::text is null or cm.harmonized_control_id = $6)
              and ($7::text is null or ev.framework_key = $7)
            order by ev.framework_version_id, c.control_key, cm.harmonized_control_id,
                     qv.approved_at desc nulls last, qv.created_at desc
          ),
          question_frameworks as (
            select
              harmonized_control_id,
              question_semantic_key,
              question_response_key,
              array_agg(distinct framework_key order by framework_key) as framework_keys
            from mapping_rows
            group by harmonized_control_id, question_semantic_key, question_response_key
          ),
          option_rows as (
            select distinct on (mr.harmonized_control_id, mr.question_semantic_key, mr.question_response_key)
              mr.*,
              qf.framework_keys
            from mapping_rows mr
            join question_frameworks qf
              on qf.harmonized_control_id = mr.harmonized_control_id
             and qf.question_semantic_key = mr.question_semantic_key
             and qf.question_response_key = mr.question_response_key
            order by mr.harmonized_control_id,
                     mr.question_semantic_key,
                     mr.question_response_key,
                     mr.approved_at desc nulls last,
                     mr.created_at desc,
                     mr.framework_key,
                     mr.control_id
          )
          select *
          from option_rows
          order by harmonized_control_id, question_version_id
          limit $8 offset $9
        `,
        [
          CANONICAL_CONTENT_TENANT_ID,
          JSON.stringify(subscriptions.map((subscription) => ({
            framework_id: subscription.framework_id,
            source_package_id: subscription.source_package_id
          }))),
          input.questionVersionId ?? null,
          input.frameworkVersionId ?? null,
          input.controlId ?? null,
          input.harmonizedControlId ?? null,
          input.frameworkKey ?? null,
          input.pagination.limit,
          input.pagination.offset
        ]
      );
      return result.rows.map(mapAssessmentQuestionOption);
    });
  }

  private async findBySourceAiQuestion(sourceAiQuestionVersionId: string): Promise<QuestionRepositoryEntry | null> {
    const result = await this.adminPool.query(
      `
        select ${questionRepositoryColumns()}
        from question_versions qv
        join question_sets qs on qs.id = qv.question_set_id
        where qv.tenant_id = $1 and qv.source_ai_question_version_id = $2
        limit 1
      `,
      [CANONICAL_CONTENT_TENANT_ID, sourceAiQuestionVersionId]
    );
    return result.rows[0] ? mapQuestionRepositoryEntry(result.rows[0]) : null;
  }

  private async findApprovedQuestionBySemanticKey(input: {
    harmonizedControlId: string;
    responseType: QuestionRepositoryResponseType;
    questionText: string;
  }): Promise<QuestionRepositoryEntry | null> {
    const result = await this.adminPool.query(
      `
        select ${questionRepositoryColumns()}
        from question_versions qv
        join question_sets qs on qs.id = qv.question_set_id
        where qv.tenant_id = $1
          and qs.tenant_id = $1
          and qs.control_id = $2
          and qv.status = 'approved'
          and coalesce(qv.payload_json ->> 'responseType', 'text') = $3
          and lower(regexp_replace(trim(coalesce(qv.payload_json ->> 'questionText', '')), '\\s+', ' ', 'g')) =
              lower(regexp_replace(trim($4::text), '\\s+', ' ', 'g'))
        order by qv.approved_at desc nulls last, qv.created_at desc
        limit 1
      `,
      [CANONICAL_CONTENT_TENANT_ID, input.harmonizedControlId, input.responseType, input.questionText]
    );
    return result.rows[0] ? mapQuestionRepositoryEntry(result.rows[0]) : null;
  }

  private async getGlobalControlContext(harmonizedControlId: string): Promise<QuestionRepositoryControlContext> {
    const contexts = await this.queryGlobalControlContexts({
      harmonizedControlId,
      pagination: { limit: 1, offset: 0 }
    });
    if (!contexts[0]) {
      throw new NotFoundException("Harmonized control context not found.");
    }
    return contexts[0];
  }

  private async queryGlobalControlContexts(input: {
    pagination: Pagination;
    search?: string;
    harmonizedControlId?: string;
  }): Promise<QuestionRepositoryControlContext[]> {
    const result = await this.adminPool.query(
      `
        select
          hc.harmonized_id,
          hc.control_name,
          hc.control_description,
          hc.domain,
          coalesce(context.framework_keys, array[]::text[]) as framework_keys,
          coalesce(context.source_controls, '[]'::jsonb) as source_controls
        from harmonized_controls hc
        left join lateral (
          ${sourceControlContextSql("hc.harmonized_id")}
        ) context on true
        where hc.tenant_id = $1
          and hc.status = 'published'
          and coalesce(hc.domain, '') <> 'Framework-Specific Requirement'
          and ($2::text is null or hc.harmonized_id = $2)
          and (
            $3::text is null
            or hc.harmonized_id ilike '%' || $3 || '%'
            or hc.control_name ilike '%' || $3 || '%'
            or hc.control_description ilike '%' || $3 || '%'
            or exists (
              select 1
              from control_mappings cm
              where cm.tenant_id = $1
                and cm.harmonized_control_id = hc.harmonized_id
                and cm.status = 'published'
                and (cm.framework_key ilike '%' || $3 || '%' or cm.source_control_id ilike '%' || $3 || '%')
            )
          )
        order by hc.harmonized_id
        limit $4 offset $5
      `,
      [
        CANONICAL_CONTENT_TENANT_ID,
        input.harmonizedControlId ?? null,
        input.search?.trim() || null,
        input.pagination.limit,
        input.pagination.offset
      ]
    );
    return result.rows.map(mapQuestionRepositoryControlContext);
  }
}

async function upsertQuestionSet(
  client: TenantScopedClient,
  input: {
    controlId: string;
    questionSetKey: string;
    sourceType: "curated" | "ai_generated";
    actorId: string;
  }
): Promise<string> {
  const result = await client.query(
    `
      insert into question_sets (
        tenant_id, control_id, question_set_key, status, source_type,
        classification, created_by, updated_by
      )
      values ($1, $2, $3, 'active', $4, 'confidential', $5, $5)
      on conflict (tenant_id, control_id, question_set_key) do update
        set status = 'active',
            updated_by = excluded.updated_by,
            updated_at = now()
      returning id
    `,
    [CANONICAL_CONTENT_TENANT_ID, input.controlId, input.questionSetKey, input.sourceType, input.actorId]
  );
  return String(result.rows[0].id);
}

async function nextQuestionVersion(client: TenantScopedClient, questionSetId: string): Promise<number> {
  const result = await client.query(
    `
      select coalesce(max(question_version), 0) + 1 as next_version
      from question_versions
      where tenant_id = $1 and question_set_id = $2
    `,
    [CANONICAL_CONTENT_TENANT_ID, questionSetId]
  );
  return Number(result.rows[0].next_version);
}

function questionRepositoryColumns(): string {
  return `
    qv.id,
    qv.tenant_id,
    qv.question_set_id,
    qs.control_id,
    qs.question_set_key,
    qs.source_type,
    qv.question_version,
    qv.payload_json,
    qv.source_ai_question_version_id,
    qv.approved_by,
    qv.approved_at,
    qv.status,
    qv.classification,
    qv.created_by,
    qv.created_at,
    qv.updated_by,
    qv.updated_at
  `;
}

function mapFrameworkEnablement(row: Record<string, unknown>): FrameworkEnablementRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    frameworkId: String(row.framework_id),
    frameworkVersionId: String(row.framework_version_id),
    sourcePackageId: String(row.source_package_id),
    frameworkKey: String(row.framework_key),
    frameworkName: String(row.framework_name),
    versionKey: String(row.version_key),
    status: String(row.status),
    subscribedAt: row.subscribed_at as Date,
    classification: String(row.classification)
  };
}

function mapAssessmentQuestionOption(row: Record<string, unknown>): AssessmentQuestionOption {
  const payload = mapPayload(row.payload_json);
  return {
    frameworkId: String(row.framework_id),
    frameworkVersionId: String(row.framework_version_id),
    frameworkKey: String(row.framework_key),
    frameworkName: String(row.framework_name),
    frameworkVersion: String(row.framework_version),
    frameworkKeys: Array.isArray(row.framework_keys) ? row.framework_keys.map(String) : [String(row.framework_key)],
    sourcePackageId: String(row.source_package_id),
    controlId: String(row.control_id),
    controlTitle: String(row.control_title),
    harmonizedControlId: String(row.harmonized_control_id),
    harmonizedControlName: String(row.harmonized_control_name),
    mappingVersion: String(row.mapping_version),
    questionVersionId: String(row.question_version_id),
    questionSetId: String(row.question_set_id),
    questionSetKey: String(row.question_set_key),
    questionVersion: Number(row.question_version),
    questionText: payload.questionText,
    responseType: payload.responseType,
    evidenceExpectationIds: payload.evidenceExpectationIds,
    citations: payload.citations,
    confidence: payload.confidence,
    sourceType: String(row.source_type),
    sourceAiQuestionVersionId: (row.source_ai_question_version_id as string | null) ?? null,
    generationRunId: payload.generationRunId,
    promptVersionId: payload.promptVersionId,
    modelDeploymentId: payload.modelDeploymentId,
    retrievalIndexId: payload.retrievalIndexId,
    status: row.status as QuestionRepositoryStatus,
    approvedBy: (row.approved_by as string | null) ?? null,
    approvedAt: (row.approved_at as Date | null) ?? null,
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date,
    previousVersionCount: Number(row.previous_version_count ?? 0),
    isCurrentVersion: row.is_current_version === true
  };
}

function mapQuestionRepositoryEntry(row: Record<string, unknown>): QuestionRepositoryEntry {
  const payload = mapPayload(row.payload_json);
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    questionSetId: String(row.question_set_id),
    harmonizedControlId: String(row.control_id),
    harmonizedControlName: nullableString(row.harmonized_control_name),
    harmonizedControlDescription: nullableString(row.harmonized_control_description),
    harmonizedDomain: nullableString(row.harmonized_domain),
    questionSetKey: String(row.question_set_key),
    sourceType: String(row.source_type),
    questionVersion: Number(row.question_version),
    status: row.status as QuestionRepositoryStatus,
    questionText: payload.questionText,
    responseType: payload.responseType,
    evidenceExpectationIds: payload.evidenceExpectationIds,
    citations: payload.citations,
    confidence: payload.confidence,
    sourceAiQuestionVersionId: (row.source_ai_question_version_id as string | null) ?? null,
    generationRunId: payload.generationRunId,
    promptVersionId: payload.promptVersionId,
    modelDeploymentId: payload.modelDeploymentId,
    retrievalIndexId: payload.retrievalIndexId,
    frameworkKeys: stringArray(row.framework_keys),
    sourceControls: sourceControlArray(row.source_controls),
    approvedBy: (row.approved_by as string | null) ?? null,
    approvedAt: (row.approved_at as Date | null) ?? null,
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

function mapQuestionRepositoryControlContext(row: Record<string, unknown>): QuestionRepositoryControlContext {
  const sourceControls = sourceControlArray(row.source_controls);
  const harmonizedControlId = String(row.harmonized_id);
  const harmonizedControlName = String(row.control_name);
  const harmonizedControlDescription = String(row.control_description);
  const harmonizedDomain = String(row.domain);
  const evidenceExpectationIds = evidenceExpectationsForControl(
    harmonizedControlName,
    normalizeSearchText(`${harmonizedDomain} ${harmonizedControlName} ${harmonizedControlDescription} ${sourceControls.map((control) => `${control.frameworkKey} ${control.sourceControlId}`).join(" ")}`)
  );
  return {
    harmonizedControlId,
    harmonizedControlName,
    harmonizedControlDescription,
    harmonizedDomain,
    frameworkKeys: stringArray(row.framework_keys),
    sourceControls,
    evidenceExpectationIds,
    citations: citationsForControlContext(harmonizedControlId, harmonizedControlName, harmonizedControlDescription, sourceControls)
  };
}

function sourceControlArray(value: unknown): QuestionRepositorySourceControl[] {
  const raw = typeof value === "string" ? JSON.parse(value) as unknown : value;
  if (!Array.isArray(raw)) {
    return [];
  }
  const byKey = new Map<string, QuestionRepositorySourceControl>();
  for (const entry of raw) {
    const record = jsonObject(entry);
    const sourceControl: QuestionRepositorySourceControl = {
      frameworkKey: stringValue(record.frameworkKey),
      sourceControlId: stringValue(record.sourceControlId),
      mappingClassification: stringValue(record.mappingClassification) || "mapped",
      coverage: nullableString(record.coverage),
      controlId: nullableString(record.controlId),
      controlTitle: nullableString(record.controlTitle),
      subcontrolId: nullableString(record.subcontrolId),
      subcontrolTitle: nullableString(record.subcontrolTitle)
    };
    if (sourceControl.frameworkKey && sourceControl.sourceControlId) {
      byKey.set(`${sourceControl.frameworkKey}:${sourceControl.sourceControlId}:${sourceControl.subcontrolId ?? ""}`, sourceControl);
    }
  }
  return [...byKey.values()].sort((left, right) =>
    left.frameworkKey.localeCompare(right.frameworkKey) ||
    left.sourceControlId.localeCompare(right.sourceControlId) ||
    (left.subcontrolId ?? "").localeCompare(right.subcontrolId ?? "")
  );
}

function mapPayload(value: unknown): {
  questionText: string;
  responseType: QuestionRepositoryResponseType;
  evidenceExpectationIds: string[];
  citations: Array<Record<string, unknown>>;
  confidence: number;
  generationRunId: string | null;
  promptVersionId: string | null;
  modelDeploymentId: string | null;
  retrievalIndexId: string | null;
} {
  const payload = jsonObject(value);
  return {
    questionText: stringValue(payload.questionText) || "Assessment question",
    responseType: responseTypeValue(payload.responseType),
    evidenceExpectationIds: stringArray(payload.evidenceExpectationIds),
    citations: Array.isArray(payload.citations)
      ? payload.citations.filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
      : [],
    confidence: typeof payload.confidence === "number" ? payload.confidence : 0,
    generationRunId: nullableString(payload.generationRunId),
    promptVersionId: nullableString(payload.promptVersionId),
    modelDeploymentId: nullableString(payload.modelDeploymentId),
    retrievalIndexId: nullableString(payload.retrievalIndexId)
  };
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    return JSON.parse(value) as Record<string, unknown>;
  }
  return {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0) : [];
}

function responseTypeValue(value: unknown): QuestionRepositoryResponseType {
  return value === "boolean" || value === "maturity" || value === "multi_select" ? value : "text";
}

function checksum(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function harmonizedControlFromCitations(citations: AiQuestionVersionRecord["citations"]): string | null {
  const harmonized = citations.find((citation) => citation.sourceType === "harmonized_control");
  if (harmonized?.sourceId) {
    return harmonized.sourceId;
  }
  const sourceId = citations.map((citation) => citation.sourceId).find((candidate) => candidate.startsWith("HARM-"));
  return sourceId ?? null;
}

function sourceControlContextSql(harmonizedControlExpression: string): string {
  return `
    select
      array_agg(distinct cm.framework_key order by cm.framework_key) filter (where cm.framework_key is not null) as framework_keys,
      jsonb_agg(distinct jsonb_build_object(
        'frameworkKey', cm.framework_key,
        'sourceControlId', cm.source_control_id,
        'mappingClassification', cm.mapping_classification,
        'coverage', cm.coverage,
        'controlId', c.control_key,
        'controlTitle', c.title,
        'subcontrolId', sc.subcontrol_key,
        'subcontrolTitle', sc.title
      )) filter (where cm.framework_key is not null) as source_controls
    from control_mappings cm
    left join frameworks f
      on f.tenant_id = cm.tenant_id
     and f.framework_key = cm.framework_key
    left join framework_versions fv
      on fv.tenant_id = cm.tenant_id
     and fv.framework_id = f.id
     and fv.status = 'published'
    left join control_sets cs
      on cs.tenant_id = cm.tenant_id
     and cs.framework_version_id = fv.id
    left join controls c
      on c.tenant_id = cm.tenant_id
     and c.control_set_id = cs.id
     and (cm.source_control_id = c.control_key or cm.source_control_id like c.control_key || '.%')
    left join control_subcontrols sc
      on sc.tenant_id = cm.tenant_id
     and sc.control_id = c.id
     and (sc.subcontrol_key = cm.source_control_id or cm.source_control_id = c.control_key || '.' || sc.subcontrol_key)
    where cm.tenant_id = $1
      and cm.harmonized_control_id = ${harmonizedControlExpression}
      and cm.status = 'published'
  `;
}

function toApprovedControlContext(context: QuestionRepositoryControlContext): ApprovedControlContext {
  return {
    harmonizedControlId: context.harmonizedControlId,
    controlTitle: context.harmonizedControlName,
    controlDescription: `${context.harmonizedDomain}: ${context.harmonizedControlDescription}`,
    mappedClauseIds: context.sourceControls.length > 0
      ? context.sourceControls.map((control) => `${control.frameworkKey}:${control.sourceControlId}`)
      : [`${context.harmonizedControlId}:catalog`],
    evidenceExpectationIds: context.evidenceExpectationIds,
    tenantScopeTags: tenantScopeTagsForControl(context.harmonizedDomain, context.harmonizedControlName),
    citations: context.citations
  };
}

function citationsForControlContext(
  harmonizedControlId: string,
  harmonizedControlName: string,
  harmonizedControlDescription: string,
  sourceControls: QuestionRepositorySourceControl[]
): CitationSource[] {
  const frameworkCitations = sourceControls.map((control) => {
    const sourceId = `${control.frameworkKey}:${control.sourceControlId}`;
    return {
      sourceId,
      sourceType: "framework_requirement" as const,
      checksum: shortChecksum(sourceId)
    };
  });
  return uniqueSources([
    ...frameworkCitations,
    {
      sourceId: harmonizedControlId,
      sourceType: "harmonized_control",
      checksum: shortChecksum(`${harmonizedControlId}:${harmonizedControlName}:${harmonizedControlDescription}`)
    }
  ]);
}

function evidenceExpectationsForControl(title: string, normalizedControlText: string): string[] {
  const base = slug(title);
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

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim()).map((value) => value.trim()))];
}

function uniqueSources(sources: CitationSource[]): CitationSource[] {
  const byKey = new Map<string, CitationSource>();
  for (const source of sources) {
    byKey.set(`${source.sourceType}:${source.sourceId}`, source);
  }
  return [...byKey.values()];
}

function shortChecksum(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function slug(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "CONTROL";
}

function isUuid(value: string | undefined): boolean {
  return Boolean(value?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
}
