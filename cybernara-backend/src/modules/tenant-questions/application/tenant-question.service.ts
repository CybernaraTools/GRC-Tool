import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AssessmentService, type AssessmentRecord } from "../../assessment/public.js";
import type { PinnedControlRef } from "../../assessment/public.js";
import { PostgresTenantQuestionRepository, type TenantQuestionRecord } from "../infrastructure/postgres-tenant-question.repository.js";

@Injectable()
export class TenantQuestionService {
  constructor(
    @Inject(PostgresTenantQuestionRepository) private readonly repository: PostgresTenantQuestionRepository,
    @Inject(AssessmentService) private readonly assessments: AssessmentService
  ) {}

  async create(input: {
    tenantId: string;
    actorId: string;
    questionText: string;
    responseType: string;
    description?: string;
    frameworkKeys: string[];
  }): Promise<TenantQuestionRecord> {
    if (!input.questionText.trim()) {
      throw new BadRequestException("Custom question requires non-blank question text.");
    }
    if (input.frameworkKeys.length === 0) {
      throw new BadRequestException("Custom question requires at least one framework tag.");
    }
    return this.repository.createCustomQuestion(input);
  }

  async list(tenantId: string, actorId: string): Promise<TenantQuestionRecord[]> {
    return this.repository.listCustomQuestions(tenantId, actorId);
  }

  async get(tenantId: string, actorId: string, questionId: string): Promise<TenantQuestionRecord> {
    const question = await this.repository.findCustomQuestion(tenantId, actorId, questionId);
    if (!question) {
      throw new NotFoundException("Custom question not found.");
    }
    return question;
  }

  /**
   * Creates an assessment for a custom question — one AssessmentItem per
   * framework tag (mirrors how a canonical multi-framework question resolves
   * to one PinnedControlRef per mapped framework). Uses
   * AssessmentService.createFromPinnedControls(), not create(), because a
   * custom question has no canonical control-mapping backing for
   * resolveAssessmentControls() to resolve against.
   */
  async createAssessmentForCustomQuestion(input: {
    tenantId: string;
    actorId: string;
    questionId: string;
    ownerId: string;
    scopeName: string;
    periodStart: Date;
    periodEnd: Date;
    idempotencyKey: string;
  }): Promise<AssessmentRecord> {
    const question = await this.get(input.tenantId, input.actorId, input.questionId);
    if (!question.backingQuestionVersionId) {
      throw new BadRequestException("Custom question is missing its backing question version.");
    }
    const controls: PinnedControlRef[] = question.frameworkKeys.map((frameworkKey) => ({
      frameworkKey,
      frameworkVersion: "custom-v1",
      mappingVersion: "custom",
      controlId: `CUSTOM-${question.id}`,
      harmonizedControlId: `CUSTOM-${question.id}`,
      questionVersion: "1",
      questionVersionId: question.backingQuestionVersionId!
    }));
    return this.assessments.createFromPinnedControls({
      tenantId: input.tenantId,
      actorId: input.actorId,
      ownerId: input.ownerId,
      scopeName: input.scopeName,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      controls,
      idempotencyKey: input.idempotencyKey
    });
  }
}
