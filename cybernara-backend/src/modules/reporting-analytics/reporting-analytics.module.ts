import { Module } from "@nestjs/common";
import { AssessmentModule } from "../assessment/public.js";
import { AuditSecurityModule } from "../audit-security/public.js";
import { OutboxModule } from "../outbox/public.js";
import { PlatformHardeningModule } from "../platform-hardening/public.js";
import { DatabaseModule } from "../../platform/database/database.module.js";
import { ReportingAnalyticsService } from "./application/reporting-analytics.service.js";
import { REPORTING_ANALYTICS_REPOSITORY } from "./application/tokens.js";
import { PostgresReportingAnalyticsRepository } from "./infrastructure/postgres-reporting-analytics.repository.js";
import { ReportingAnalyticsController } from "./presentation/reporting-analytics.controller.js";

@Module({
  imports: [DatabaseModule, AssessmentModule, AuditSecurityModule, OutboxModule, PlatformHardeningModule],
  controllers: [ReportingAnalyticsController],
  providers: [
    ReportingAnalyticsService,
    {
      provide: REPORTING_ANALYTICS_REPOSITORY,
      useClass: PostgresReportingAnalyticsRepository
    }
  ],
  exports: [ReportingAnalyticsService, REPORTING_ANALYTICS_REPOSITORY]
})
export class ReportingAnalyticsModule {}

