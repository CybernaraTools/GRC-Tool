import { Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { AiOrchestrationModule } from "./modules/ai-orchestration/ai-orchestration.module.js";
import { AssessmentModule } from "./modules/assessment/assessment.module.js";
import { AuditReportsModule } from "./modules/audit-reports/audit-reports.module.js";
import { AuditSecurityModule } from "./modules/audit-security/audit-security.module.js";
import { EnterpriseGrcModule } from "./modules/enterprise-grc/enterprise-grc.module.js";
import { EvidenceAssuranceModule } from "./modules/evidence-assurance/evidence-assurance.module.js";
import { FrameworkContentModule } from "./modules/framework-content/framework-content.module.js";
import { HarmonizationModule } from "./modules/harmonization/harmonization.module.js";
import { IdentityTenantModule } from "./modules/identity-tenant/identity-tenant.module.js";
import { IntegrationPlatformModule } from "./modules/integration-platform/integration-platform.module.js";
import { OutboxModule } from "./modules/outbox/outbox.module.js";
import { PlatformHardeningModule } from "./modules/platform-hardening/platform-hardening.module.js";
import { PrivacyOperationsModule } from "./modules/privacy-operations/privacy-operations.module.js";
import { ReportingAnalyticsModule } from "./modules/reporting-analytics/reporting-analytics.module.js";
import { RiskWorkflowModule } from "./modules/risk-workflow/risk-workflow.module.js";
import { TasksModule } from "./modules/tasks/tasks.module.js";
import { FrameworkUpdateModule } from "./modules/framework-update/framework-update.module.js";
import { HealthController } from "./health.controller.js";
import { RootController } from "./root.controller.js";
import { RootStatusService } from "./root-status.service.js";

@Module({
  imports: [
    DiscoveryModule,
    IdentityTenantModule,
    AuditSecurityModule,
    OutboxModule,
    FrameworkContentModule,
    HarmonizationModule,
    AiOrchestrationModule,
    IntegrationPlatformModule,
    PrivacyOperationsModule,
    EnterpriseGrcModule,
    PlatformHardeningModule,
    AssessmentModule,
    EvidenceAssuranceModule,
    RiskWorkflowModule,
    TasksModule,
    FrameworkUpdateModule,
    ReportingAnalyticsModule,
    AuditReportsModule
  ],
  controllers: [RootController, HealthController],
  providers: [RootStatusService]
})
export class AppModule {}
