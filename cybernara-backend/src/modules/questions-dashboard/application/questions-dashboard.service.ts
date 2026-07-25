import { Inject, Injectable } from "@nestjs/common";
import { QuestionRepositoryService } from "../../assessment/public.js";
import { TenantQuestionService } from "../../tenant-questions/public.js";
import { computeDashboardSummary, type DashboardSummary, type UnifiedQuestion } from "../domain/dashboard-aggregation.js";
import { PostgresQuestionsDashboardRepository } from "../infrastructure/postgres-questions-dashboard.repository.js";

@Injectable()
export class QuestionsDashboardService {
  constructor(
    @Inject(QuestionRepositoryService) private readonly questionRepository: QuestionRepositoryService,
    @Inject(TenantQuestionService) private readonly tenantQuestions: TenantQuestionService,
    @Inject(PostgresQuestionsDashboardRepository) private readonly repository: PostgresQuestionsDashboardRepository
  ) {}

  async listUnifiedQuestions(tenantId: string, actorId: string): Promise<UnifiedQuestion[]> {
    const [canonicalOptions, customQuestions] = await Promise.all([
      this.questionRepository.listAssessmentQuestionOptions(tenantId, { limit: 500, offset: 0 }),
      this.tenantQuestions.list(tenantId, actorId)
    ]);

    const canonicalQuestionVersionIds = canonicalOptions.map((option) => option.questionVersionId);
    const assessmentLinks = await this.repository.findAssessmentsForQuestionVersions(tenantId, actorId, canonicalQuestionVersionIds);

    const canonical: UnifiedQuestion[] = canonicalOptions.map((option) => {
      const link = assessmentLinks.get(option.questionVersionId);
      return {
        id: option.questionVersionId,
        source: "canonical",
        questionVersionId: option.questionVersionId,
        questionText: option.questionText,
        responseType: option.responseType,
        frameworkKeys: option.frameworkKeys,
        done: Boolean(link),
        assessmentId: link?.assessmentId ?? null
      };
    });

    const customBackingIds = customQuestions
      .map((question) => question.backingQuestionVersionId)
      .filter((id): id is string => Boolean(id));
    const customAssessmentLinks = await this.repository.findAssessmentsForQuestionVersions(tenantId, actorId, customBackingIds);

    const custom: UnifiedQuestion[] = customQuestions.map((question) => {
      const link = question.backingQuestionVersionId ? customAssessmentLinks.get(question.backingQuestionVersionId) : undefined;
      return {
        id: question.id,
        source: "custom",
        questionVersionId: question.backingQuestionVersionId ?? "",
        questionText: question.questionText,
        responseType: question.responseType,
        frameworkKeys: question.frameworkKeys,
        done: Boolean(link),
        assessmentId: link?.assessmentId ?? null
      };
    });

    return [...canonical, ...custom];
  }

  async getSummary(tenantId: string, actorId: string): Promise<DashboardSummary & { recentAssessments: Array<{ id: string; scopeName: string; status: string; createdAt: Date }> }> {
    const [questions, recentAssessments] = await Promise.all([
      this.listUnifiedQuestions(tenantId, actorId),
      this.repository.listRecentAssessments(tenantId, actorId, 10)
    ]);
    const summary = computeDashboardSummary(questions);
    return { ...summary, recentAssessments };
  }
}
