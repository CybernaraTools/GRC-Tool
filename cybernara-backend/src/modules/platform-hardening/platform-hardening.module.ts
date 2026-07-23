import { Module } from "@nestjs/common";
import { PolicyGuard } from "./application/policy.guard.js";

@Module({
  providers: [PolicyGuard],
  exports: [PolicyGuard]
})
export class PlatformHardeningModule {}
