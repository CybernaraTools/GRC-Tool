import { Module } from "@nestjs/common";
import { AssessmentModule } from "../assessment/public.js";
import { IdentityTenantModule } from "../identity-tenant/public.js";
import { RiskWorkflowModule } from "../risk-workflow/public.js";
import { PlatformHardeningModule } from "../platform-hardening/public.js";
import { NotificationHubService } from "./application/notification-hub.service.js";
import { NotificationHubController } from "./presentation/notification-hub.controller.js";

@Module({
  imports: [AssessmentModule, IdentityTenantModule, RiskWorkflowModule, PlatformHardeningModule],
  controllers: [NotificationHubController],
  providers: [NotificationHubService],
  exports: [NotificationHubService]
})
export class NotificationHubModule {}
