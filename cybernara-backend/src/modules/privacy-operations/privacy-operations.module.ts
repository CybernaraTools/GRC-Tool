import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../platform/database/database.module.js";
import { AuditSecurityModule } from "../audit-security/public.js";
import { OutboxModule } from "../outbox/public.js";
import { PlatformHardeningModule } from "../platform-hardening/public.js";
import { PrivacyOperationsService } from "./application/privacy-operations.service.js";
import { PRIVACY_OPERATIONS_REPOSITORY } from "./application/tokens.js";
import { PostgresPrivacyOperationsRepository } from "./infrastructure/postgres-privacy-operations.repository.js";
import { PrivacyOperationsController } from "./presentation/privacy-operations.controller.js";
import { PrivacyGraphController } from "./presentation/privacy-graph.controller.js";

@Module({
  imports: [DatabaseModule, AuditSecurityModule, OutboxModule, PlatformHardeningModule],
  controllers: [PrivacyOperationsController, PrivacyGraphController],
  providers: [
    PrivacyOperationsService,
    {
      provide: PRIVACY_OPERATIONS_REPOSITORY,
      useClass: PostgresPrivacyOperationsRepository
    }
  ],
  exports: [PrivacyOperationsService, PRIVACY_OPERATIONS_REPOSITORY]
})
export class PrivacyOperationsModule {}
