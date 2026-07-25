import { Inject, Injectable } from "@nestjs/common";
import { TenantScopedDb } from "../../../platform/database/tenant-scoped-db.js";

export interface AssessmentLinkForQuestion {
  questionVersionId: string;
  assessmentId: string;
  assessmentScopeName: string;
  createdAt: Date;
}

/**
 * Read-only. Answers "which assessment (if any) already exists for this
 * question_version_id" via the same assessment_items.question_version_id
 * column both canonical questions (resolved through
 * QuestionRepositoryService) and custom questions (via their backing
 * question_versions row, see tenant-questions module) already populate.
 * Does not modify or duplicate PostgresAssessmentRepository — this is a new,
 * narrow, read-only query against the same table for a different purpose
 * (dashboard completion status, not assessment retrieval).
 */
@Injectable()
export class PostgresQuestionsDashboardRepository {
  constructor(@Inject(TenantScopedDb) private readonly db: TenantScopedDb) {}

  async findAssessmentsForQuestionVersions(
    tenantId: string,
    actorId: string,
    questionVersionIds: string[]
  ): Promise<Map<string, AssessmentLinkForQuestion>> {
    if (questionVersionIds.length === 0) {
      return new Map();
    }
    return this.db.withTenant(tenantId, actorId, async (client) => {
      const rows = await client.query<{
        question_version_id: string;
        assessment_id: string;
        scope_name: string;
        created_at: Date;
      }>(
        `select distinct on (ai.question_version_id)
           ai.question_version_id, ai.assessment_id, a.scope_name, ai.created_at
         from assessment_items ai
         join assessments a on a.tenant_id = $1 and a.id = ai.assessment_id
         where ai.tenant_id = $1 and ai.question_version_id = any($2::uuid[])
         order by ai.question_version_id, ai.created_at desc`,
        [tenantId, questionVersionIds]
      );
      const map = new Map<string, AssessmentLinkForQuestion>();
      for (const row of rows.rows) {
        map.set(row.question_version_id, {
          questionVersionId: row.question_version_id,
          assessmentId: row.assessment_id,
          assessmentScopeName: row.scope_name,
          createdAt: row.created_at
        });
      }
      return map;
    });
  }

  async listRecentAssessments(tenantId: string, actorId: string, limit: number): Promise<Array<{ id: string; scopeName: string; status: string; createdAt: Date }>> {
    return this.db.withTenant(tenantId, actorId, async (client) => {
      const rows = await client.query<{ id: string; scope_name: string; status: string; created_at: Date }>(
        `select id, scope_name, status, created_at from assessments where tenant_id = $1 order by created_at desc limit $2`,
        [tenantId, limit]
      );
      return rows.rows.map((row) => ({ id: row.id, scopeName: row.scope_name, status: row.status, createdAt: row.created_at }));
    });
  }
}
