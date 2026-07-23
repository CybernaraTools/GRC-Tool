import { Module } from "@nestjs/common";
import { AuditSecurityModule } from "../audit-security/public.js";
import { OutboxModule } from "../outbox/public.js";
import { PlatformHardeningModule } from "../platform-hardening/public.js";
import { EvidenceAssuranceModule } from "../evidence-assurance/public.js";
import { AssessmentModule } from "../assessment/public.js";
import { DatabaseModule } from "../../platform/database/database.module.js";
import { FindingAiAssistantService } from "./application/finding-ai-assistant.service.js";
import { RiskAiAssistantService } from "./application/risk-ai-assistant.service.js";
import { RiskWorkflowService } from "./application/risk-workflow.service.js";
import { RISK_WORKFLOW_REPOSITORY } from "./application/tokens.js";
import { PostgresRiskWorkflowRepository } from "./infrastructure/postgres-risk-workflow.repository.js";
import { RiskWorkflowController } from "./presentation/risk-workflow.controller.js";

@Module({
  imports: [DatabaseModule, AuditSecurityModule, OutboxModule, PlatformHardeningModule, EvidenceAssuranceModule, AssessmentModule],
  controllers: [RiskWorkflowController],
  providers: [
    FindingAiAssistantService,
    RiskAiAssistantService,
    RiskWorkflowService,
    {
      provide: RISK_WORKFLOW_REPOSITORY,
      useClass: PostgresRiskWorkflowRepository
    }
  ],
  exports: [RiskWorkflowService, RISK_WORKFLOW_REPOSITORY]
})
export class RiskWorkflowModule {}
