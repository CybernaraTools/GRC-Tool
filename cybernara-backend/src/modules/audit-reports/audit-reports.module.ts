import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../platform/database/database.module.js";
import { AssessmentModule } from "../assessment/public.js";
import { AuditSecurityModule } from "../audit-security/public.js";
import { ClosureSnapshotModule } from "../closure-snapshot/public.js";
import { EvidenceAssuranceModule } from "../evidence-assurance/public.js";
import { OutboxModule } from "../outbox/public.js";
import { PlatformHardeningModule } from "../platform-hardening/public.js";
import { AuditReportService } from "./application/audit-report.service.js";
import { NarrativeGeneratorService } from "./application/narrative-generator.service.js";
import { ReportContextService } from "./application/report-context.service.js";
import { AUDIT_REPORT_REPOSITORY } from "./application/tokens.js";
import { PostgresAuditReportRepository } from "./infrastructure/postgres-audit-report.repository.js";
import { AuditReportController } from "./presentation/audit-report.controller.js";

// AssessmentModule and ClosureSnapshotModule are both imported here, but
// neither of them imports this module back — AssessmentModule only imports
// ClosureSnapshotModule (see assessment.module.ts), never AuditReportsModule
// — so this stays a one-way dependency graph with no cycle.
@Module({
  imports: [
    DatabaseModule,
    AssessmentModule,
    AuditSecurityModule,
    ClosureSnapshotModule,
    EvidenceAssuranceModule,
    OutboxModule,
    PlatformHardeningModule
  ],
  controllers: [AuditReportController],
  providers: [
    AuditReportService,
    ReportContextService,
    NarrativeGeneratorService,
    {
      provide: AUDIT_REPORT_REPOSITORY,
      useClass: PostgresAuditReportRepository
    }
  ],
  exports: [AuditReportService]
})
export class AuditReportsModule {}
