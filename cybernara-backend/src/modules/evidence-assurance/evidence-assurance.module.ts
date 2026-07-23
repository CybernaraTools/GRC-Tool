import { Module } from "@nestjs/common";
import { AuditSecurityModule } from "../audit-security/public.js";
import { OutboxModule } from "../outbox/public.js";
import { PlatformHardeningModule } from "../platform-hardening/public.js";
import { DatabaseModule } from "../../platform/database/database.module.js";
import { EvidenceAssuranceService } from "./application/evidence-assurance.service.js";
import { EVIDENCE_ASSURANCE_REPOSITORY } from "./application/tokens.js";
import { PostgresEvidenceAssuranceRepository } from "./infrastructure/postgres-evidence-assurance.repository.js";
import { EvidenceAssuranceController } from "./presentation/evidence-assurance.controller.js";
import { EvidenceGraphController } from "./presentation/evidence-graph.controller.js";

@Module({
  imports: [DatabaseModule, AuditSecurityModule, OutboxModule, PlatformHardeningModule],
  controllers: [EvidenceAssuranceController, EvidenceGraphController],
  providers: [
    EvidenceAssuranceService,
    {
      provide: EVIDENCE_ASSURANCE_REPOSITORY,
      useClass: PostgresEvidenceAssuranceRepository
    }
  ],
  exports: [EvidenceAssuranceService, EVIDENCE_ASSURANCE_REPOSITORY]
})
export class EvidenceAssuranceModule {}

