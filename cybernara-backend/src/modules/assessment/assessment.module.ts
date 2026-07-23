import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../platform/database/database.module.js";
import { AuditSecurityModule } from "../audit-security/public.js";
import { IdentityTenantModule } from "../identity-tenant/public.js";
import { OutboxModule } from "../outbox/public.js";
import { PlatformHardeningModule } from "../platform-hardening/public.js";
import { OpenAiQuestionGeneratorService } from "../ai-orchestration/application/openai-question-generator.service.js";
import { AssessmentService } from "./application/assessment.service.js";
import { QuestionRepositoryService } from "./application/question-repository.service.js";
import { ASSESSMENT_REPOSITORY } from "./application/tokens.js";
import { PostgresAssessmentRepository } from "./infrastructure/postgres-assessment.repository.js";
import { AssessmentController } from "./presentation/assessment.controller.js";
import { QuestionRepositoryController } from "./presentation/question-repository.controller.js";

@Module({
  imports: [DatabaseModule, AuditSecurityModule, OutboxModule, PlatformHardeningModule, IdentityTenantModule],
  controllers: [AssessmentController, QuestionRepositoryController],
  providers: [
    AssessmentService,
    QuestionRepositoryService,
    OpenAiQuestionGeneratorService,
    {
      provide: ASSESSMENT_REPOSITORY,
      useClass: PostgresAssessmentRepository
    }
  ],
  exports: [AssessmentService, QuestionRepositoryService]
})
export class AssessmentModule {}
