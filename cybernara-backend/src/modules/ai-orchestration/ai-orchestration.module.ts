import { Module } from "@nestjs/common";
import { AuditSecurityModule } from "../audit-security/public.js";
import { OutboxModule } from "../outbox/public.js";
import { PlatformHardeningModule } from "../platform-hardening/public.js";
import { AssessmentModule } from "../assessment/public.js";
import { DatabaseModule } from "../../platform/database/database.module.js";
import { AiOrchestrationService } from "./application/ai-orchestration.service.js";
import { OpenAiQuestionGeneratorService } from "./application/openai-question-generator.service.js";
import { AI_ORCHESTRATION_REPOSITORY } from "./application/tokens.js";
import { PostgresAiOrchestrationRepository } from "./infrastructure/postgres-ai-orchestration.repository.js";
import { AiOrchestrationController } from "./presentation/ai-orchestration.controller.js";

@Module({
  imports: [DatabaseModule, AuditSecurityModule, OutboxModule, PlatformHardeningModule, AssessmentModule],
  controllers: [AiOrchestrationController],
  providers: [
    AiOrchestrationService,
    OpenAiQuestionGeneratorService,
    {
      provide: AI_ORCHESTRATION_REPOSITORY,
      useClass: PostgresAiOrchestrationRepository
    }
  ],
  exports: [AiOrchestrationService, AI_ORCHESTRATION_REPOSITORY]
})
export class AiOrchestrationModule {}
