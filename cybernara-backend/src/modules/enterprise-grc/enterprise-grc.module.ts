import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../platform/database/database.module.js";
import { AuditSecurityModule } from "../audit-security/public.js";
import { OutboxModule } from "../outbox/public.js";
import { PlatformHardeningModule } from "../platform-hardening/public.js";
import { EnterpriseGrcService } from "./application/enterprise-grc.service.js";
import { ENTERPRISE_GRC_REPOSITORY } from "./application/tokens.js";
import { PostgresEnterpriseGrcRepository } from "./infrastructure/postgres-enterprise-grc.repository.js";
import { EnterpriseGrcController } from "./presentation/enterprise-grc.controller.js";

@Module({
  imports: [DatabaseModule, AuditSecurityModule, OutboxModule, PlatformHardeningModule],
  controllers: [EnterpriseGrcController],
  providers: [
    EnterpriseGrcService,
    {
      provide: ENTERPRISE_GRC_REPOSITORY,
      useClass: PostgresEnterpriseGrcRepository
    }
  ],
  exports: [EnterpriseGrcService, ENTERPRISE_GRC_REPOSITORY]
})
export class EnterpriseGrcModule {}
