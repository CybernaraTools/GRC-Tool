import { Module } from "@nestjs/common";
import { AuditSecurityModule } from "../audit-security/public.js";
import { OutboxModule } from "../outbox/public.js";
import { PlatformHardeningModule } from "../platform-hardening/public.js";
import { IdentityTenantModule } from "../identity-tenant/public.js";
import { DatabaseModule } from "../../platform/database/database.module.js";
import { FrameworkUpdateService } from "./application/framework-update.service.js";
import { FRAMEWORK_UPDATE_REPOSITORY } from "./application/framework-update.types.js";
import { PostgresFrameworkUpdateRepository } from "./infrastructure/postgres-framework-update.repository.js";
import { FrameworkUpdateController, PlatformFrameworkUpdateController } from "./presentation/framework-update.controller.js";
import { TasksModule } from "../tasks/public.js";

@Module({
  imports: [DatabaseModule, AuditSecurityModule, OutboxModule, PlatformHardeningModule, IdentityTenantModule, TasksModule],
  controllers: [FrameworkUpdateController, PlatformFrameworkUpdateController],
  providers: [
    FrameworkUpdateService,
    {
      provide: FRAMEWORK_UPDATE_REPOSITORY,
      useClass: PostgresFrameworkUpdateRepository
    }
  ],
  exports: [FrameworkUpdateService]
})
export class FrameworkUpdateModule {}
