import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../platform/database/database.module.js";
import { AssessmentModule } from "../assessment/public.js";
import { PlatformHardeningModule } from "../platform-hardening/public.js";
import { TenantQuestionsModule } from "../tenant-questions/public.js";
import { QuestionsDashboardService } from "./application/questions-dashboard.service.js";
import { PostgresQuestionsDashboardRepository } from "./infrastructure/postgres-questions-dashboard.repository.js";
import { QuestionsDashboardController } from "./presentation/questions-dashboard.controller.js";

@Module({
  imports: [DatabaseModule, AssessmentModule, TenantQuestionsModule, PlatformHardeningModule],
  controllers: [QuestionsDashboardController],
  providers: [QuestionsDashboardService, PostgresQuestionsDashboardRepository],
  exports: [QuestionsDashboardService]
})
export class QuestionsDashboardModule {}
