import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../platform/database/database.module.js";
import { AssessmentModule } from "../assessment/public.js";
import { AuditSecurityModule } from "../audit-security/public.js";
import { RiskWorkflowModule } from "../risk-workflow/public.js";
import { EvidenceAssuranceModule } from "../evidence-assurance/public.js";
import { OutboxModule } from "../outbox/public.js";
import { PlatformHardeningModule } from "../platform-hardening/public.js";
import { AuditReportService } from "./application/audit-report.service.js";
import { AuditReportContextService } from "./application/audit-report-context.service.js";
import { AUDIT_REPORT_REPOSITORY } from "./application/tokens.js";
import { PostgresAuditReportRepository } from "./infrastructure/postgres-audit-report.repository.js";
import { AuditReportController } from "./presentation/audit-report.controller.js";

@Module({
  imports: [
    DatabaseModule,
    AssessmentModule,
    AuditSecurityModule,
    RiskWorkflowModule,
    EvidenceAssuranceModule,
    OutboxModule,
    PlatformHardeningModule
  ],
  controllers: [AuditReportController],
  providers: [
    AuditReportService,
    AuditReportContextService,
    {
      provide: AUDIT_REPORT_REPOSITORY,
      useClass: PostgresAuditReportRepository
    }
  ],
  exports: [AuditReportService]
})
export class AuditReportsModule {}
