import { createHash, randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { TenantScopedDb } from "../../../platform/database/tenant-scoped-db.js";
import type { TenantQuestion } from "../domain/tenant-question.js";

export interface TenantQuestionRecord extends TenantQuestion {
  done: boolean;
}

/**
 * Owns tenant_questions / tenant_question_frameworks (new, additive tables —
 * see 0052_tenant_custom_questions.sql) AND the one-time creation of each
 * custom question's backing harmonized_controls/question_sets/question_versions
 * row (written under the REAL tenant_id, never CANONICAL_CONTENT_TENANT_ID)
 * — purely to satisfy assessment_items.question_version_id's existing FK
 * constraint. That backing row is never read through
 * QuestionRepositoryService's canonical-only resolution query; it exists
 * solely so "does an assessment exist for this question" can use the exact
 * same assessment_items.question_version_id existence check for both
 * canonical and custom questions. Does not import, call, or modify
 * QuestionRepositoryService or PostgresAssessmentRepository.
 */
@Injectable()
export class PostgresTenantQuestionRepository {
  constructor(@Inject(TenantScopedDb) private readonly db: TenantScopedDb) {}

  async createCustomQuestion(input: {
    tenantId: string;
    actorId: string;
    questionText: string;
    responseType: string;
    description?: string;
    frameworkKeys: string[];
  }): Promise<TenantQuestionRecord> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const questionId = randomUUID();
      const now = new Date();

      const harmonizedId = `CUSTOM-${questionId}`;
      await client.query(
        `insert into harmonized_controls (
           id, tenant_id, harmonized_id, domain, control_name, control_description,
           source_workbook, source_sheet, source_row_number, status, classification,
           created_by, created_at, updated_by, updated_at
         ) values ($1, $2, $3, 'Custom', $4, $5, 'tenant-custom', 'tenant-custom', 0, 'published', 'confidential', $6, $7, $6, $7)`,
        [randomUUID(), input.tenantId, harmonizedId, input.questionText.slice(0, 200), input.questionText, input.actorId, now]
      );

      const questionSetId = randomUUID();
      await client.query(
        `insert into question_sets (
           id, tenant_id, control_id, question_set_key, status, source_type, classification,
           created_by, created_at, updated_by, updated_at
         ) values ($1, $2, $3, 'custom', 'active', 'curated', 'confidential', $4, $5, $4, $5)`,
        [questionSetId, input.tenantId, harmonizedId, input.actorId, now]
      );

      const payload = { questionText: input.questionText, responseType: input.responseType };
      const backingQuestionVersionId = randomUUID();
      await client.query(
        `insert into question_versions (
           id, tenant_id, question_set_id, question_version, payload_json, approved_by, approved_at,
           checksum, status, classification, created_by, created_at, updated_by, updated_at
         ) values ($1, $2, $3, 1, $4::jsonb, $5, $6, $7, 'approved', 'confidential', $5, $6, $5, $6)`,
        [backingQuestionVersionId, input.tenantId, questionSetId, JSON.stringify(payload), input.actorId, now, sha256(payload)]
      );

      await client.query(
        `insert into tenant_questions (
           id, tenant_id, version, question_text, response_type, description, backing_question_version_id,
           status, classification, created_by, created_at, updated_by, updated_at
         ) values ($1, $2, 1, $3, $4, $5, $6, 'active', 'confidential', $7, $8, $7, $8)`,
        [questionId, input.tenantId, input.questionText, input.responseType, input.description ?? null, backingQuestionVersionId, input.actorId, now]
      );

      for (const frameworkKey of new Set(input.frameworkKeys)) {
        await client.query(
          `insert into tenant_question_frameworks (
             id, tenant_id, version, tenant_question_id, framework_key, classification,
             created_by, created_at, updated_by, updated_at
           ) values ($1, $2, 1, $3, $4, 'confidential', $5, $6, $5, $6)`,
          [randomUUID(), input.tenantId, questionId, frameworkKey, input.actorId, now]
        );
      }

      return {
        id: questionId,
        tenantId: input.tenantId,
        questionText: input.questionText,
        responseType: input.responseType as TenantQuestion["responseType"],
        description: input.description ?? null,
        frameworkKeys: [...new Set(input.frameworkKeys)],
        status: "active",
        backingQuestionVersionId,
        createdBy: input.actorId,
        createdAt: now,
        done: false
      };
    });
  }

  async listCustomQuestions(tenantId: string, actorId: string): Promise<TenantQuestionRecord[]> {
    return this.db.withTenant(tenantId, actorId, async (client) => {
      const questions = await client.query<{
        id: string;
        question_text: string;
        response_type: string;
        description: string | null;
        backing_question_version_id: string;
        status: string;
        created_by: string;
        created_at: Date;
      }>(
        `select id, question_text, response_type, description, backing_question_version_id, status, created_by, created_at
         from tenant_questions
         where tenant_id = $1 and status = 'active'
         order by created_at desc`,
        [tenantId]
      );
      if (questions.rows.length === 0) {
        return [];
      }
      const questionIds = questions.rows.map((row) => row.id);
      const frameworks = await client.query<{ tenant_question_id: string; framework_key: string }>(
        `select tenant_question_id, framework_key from tenant_question_frameworks where tenant_id = $1 and tenant_question_id = any($2::uuid[])`,
        [tenantId, questionIds]
      );
      const frameworksByQuestion = new Map<string, string[]>();
      for (const row of frameworks.rows) {
        const list = frameworksByQuestion.get(row.tenant_question_id) ?? [];
        list.push(row.framework_key);
        frameworksByQuestion.set(row.tenant_question_id, list);
      }
      const backingIds = questions.rows.map((row) => row.backing_question_version_id);
      const doneRows = await client.query<{ question_version_id: string }>(
        `select distinct question_version_id from assessment_items where tenant_id = $1 and question_version_id = any($2::uuid[])`,
        [tenantId, backingIds]
      );
      const doneSet = new Set(doneRows.rows.map((row) => row.question_version_id));

      return questions.rows.map((row) => ({
        id: row.id,
        tenantId,
        questionText: row.question_text,
        responseType: row.response_type as TenantQuestion["responseType"],
        description: row.description,
        frameworkKeys: frameworksByQuestion.get(row.id) ?? [],
        status: row.status as TenantQuestion["status"],
        backingQuestionVersionId: row.backing_question_version_id,
        createdBy: row.created_by,
        createdAt: row.created_at,
        done: doneSet.has(row.backing_question_version_id)
      }));
    });
  }

  async findCustomQuestion(tenantId: string, actorId: string, questionId: string): Promise<TenantQuestionRecord | null> {
    const all = await this.listCustomQuestions(tenantId, actorId);
    return all.find((question) => question.id === questionId) ?? null;
  }
}

function sha256(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
