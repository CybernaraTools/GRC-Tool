import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../platform/database/database.module.js";
import { AuditSecurityModule } from "../audit-security/public.js";
import { OutboxModule } from "../outbox/public.js";
import { PlatformHardeningModule } from "../platform-hardening/public.js";
import { IntegrationPlatformService } from "./application/integration-platform.service.js";
import { INTEGRATION_PLATFORM_REPOSITORY } from "./application/tokens.js";
import { PostgresIntegrationPlatformRepository } from "./infrastructure/postgres-integration-platform.repository.js";
import { IntegrationPlatformController } from "./presentation/integration-platform.controller.js";

@Module({
  imports: [DatabaseModule, AuditSecurityModule, OutboxModule, PlatformHardeningModule],
  controllers: [IntegrationPlatformController],
  providers: [
    IntegrationPlatformService,
    {
      provide: INTEGRATION_PLATFORM_REPOSITORY,
      useClass: PostgresIntegrationPlatformRepository
    }
  ],
  exports: [IntegrationPlatformService, INTEGRATION_PLATFORM_REPOSITORY]
})
export class IntegrationPlatformModule {}
