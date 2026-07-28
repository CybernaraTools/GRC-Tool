import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../platform/database/database.module.js";
import { SupabaseModule } from "../../platform/supabase/supabase.module.js";
import { AdminUsersService } from "./application/admin-users.service.js";
import { IdentityTenantService } from "./application/identity-tenant.service.js";
import { PlatformOnboardingService } from "./application/platform-onboarding.service.js";
import { PlatformOperatorGuard } from "./application/platform-operator.guard.js";
import { ADMIN_USERS_REPOSITORY, IDENTITY_TENANT_REPOSITORY, PLATFORM_ONBOARDING_REPOSITORY } from "./application/tokens.js";
import { PostgresAdminUsersRepository } from "./infrastructure/postgres-admin-users.repository.js";
import { PostgresIdentityTenantRepository } from "./infrastructure/postgres-identity-tenant.repository.js";
import { PostgresPlatformOnboardingRepository } from "./infrastructure/postgres-platform-onboarding.repository.js";
import { AdminUsersController } from "./presentation/admin-users.controller.js";
import { IdentityTenantController } from "./presentation/identity-tenant.controller.js";
import { PlatformOnboardingController } from "./presentation/platform-onboarding.controller.js";

@Module({
  imports: [DatabaseModule, SupabaseModule],
  controllers: [IdentityTenantController, AdminUsersController, PlatformOnboardingController],
  providers: [
    IdentityTenantService,
    AdminUsersService,
    PlatformOnboardingService,
    PlatformOperatorGuard,
    {
      provide: IDENTITY_TENANT_REPOSITORY,
      useClass: PostgresIdentityTenantRepository
    },
    {
      provide: ADMIN_USERS_REPOSITORY,
      useClass: PostgresAdminUsersRepository
    },
    {
      provide: PLATFORM_ONBOARDING_REPOSITORY,
      useClass: PostgresPlatformOnboardingRepository
    }
  ],
  exports: [IdentityTenantService, AdminUsersService, PlatformOnboardingService, PlatformOperatorGuard]
})
export class IdentityTenantModule {}
