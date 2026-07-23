import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../platform/database/database.module.js";
import { PlatformHardeningModule } from "../platform-hardening/public.js";
import { IdentityTenantModule } from "../identity-tenant/public.js";
import { HarmonizationService } from "./application/harmonization.service.js";
import { HARMONIZATION_REPOSITORY } from "./application/tokens.js";
import { PostgresHarmonizationRepository } from "./infrastructure/postgres-harmonization.repository.js";
import { HarmonizationController, PlatformHarmonizationController } from "./presentation/harmonization.controller.js";

@Module({
  imports: [DatabaseModule, PlatformHardeningModule, IdentityTenantModule],
  controllers: [HarmonizationController, PlatformHarmonizationController],
  providers: [
    HarmonizationService,
    {
      provide: HARMONIZATION_REPOSITORY,
      useClass: PostgresHarmonizationRepository
    }
  ],
  exports: [HarmonizationService]
})
export class HarmonizationModule {}
