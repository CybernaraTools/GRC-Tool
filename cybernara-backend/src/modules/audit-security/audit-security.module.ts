import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../platform/database/database.module.js";
import { AuditLogService } from "./application/audit-log.service.js";
import { AUDIT_REPOSITORY } from "./application/tokens.js";
import { PostgresAuditRepository } from "./infrastructure/postgres-audit.repository.js";
import { AuditSecurityController } from "./presentation/audit-security.controller.js";
import { AuditChainController } from "./presentation/audit-chain.controller.js";

@Module({
  imports: [DatabaseModule],
  controllers: [AuditSecurityController, AuditChainController],
  providers: [
    AuditLogService,
    {
      provide: AUDIT_REPOSITORY,
      useClass: PostgresAuditRepository
    }
  ],
  exports: [AuditLogService]
})
export class AuditSecurityModule {}

