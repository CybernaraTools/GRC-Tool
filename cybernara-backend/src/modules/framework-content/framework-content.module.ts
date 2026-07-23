import { Module } from "@nestjs/common";
import { AuditSecurityModule } from "../audit-security/public.js";
import { OutboxModule } from "../outbox/public.js";
import { PlatformHardeningModule } from "../platform-hardening/public.js";
import { AssessmentModule } from "../assessment/public.js";
import { IdentityTenantModule } from "../identity-tenant/public.js";
import { DatabaseModule } from "../../platform/database/database.module.js";
import { ContentIngestionService } from "./application/content-ingestion.service.js";
import { FRAMEWORK_CONTENT_REPOSITORY } from "./application/tokens.js";
import { PostgresFrameworkContentRepository } from "./infrastructure/postgres-framework-content.repository.js";
import { FrameworkContentController, PlatformFrameworkContentController } from "./presentation/framework-content.controller.js";

@Module({
  imports: [DatabaseModule, AuditSecurityModule, OutboxModule, PlatformHardeningModule, AssessmentModule, IdentityTenantModule],
  controllers: [FrameworkContentController, PlatformFrameworkContentController],
  providers: [
    ContentIngestionService,
    {
      provide: FRAMEWORK_CONTENT_REPOSITORY,
      useClass: PostgresFrameworkContentRepository
    }
  ],
  exports: [ContentIngestionService]
})
export class FrameworkContentModule {}
