import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../platform/database/database.module.js";
import { AssessmentModule } from "../assessment/public.js";
import { PlatformHardeningModule } from "../platform-hardening/public.js";
import { TenantQuestionService } from "./application/tenant-question.service.js";
import { PostgresTenantQuestionRepository } from "./infrastructure/postgres-tenant-question.repository.js";
import { TenantQuestionController } from "./presentation/tenant-question.controller.js";

@Module({
  imports: [DatabaseModule, AssessmentModule, PlatformHardeningModule],
  controllers: [TenantQuestionController],
  providers: [TenantQuestionService, PostgresTenantQuestionRepository],
  exports: [TenantQuestionService]
})
export class TenantQuestionsModule {}
