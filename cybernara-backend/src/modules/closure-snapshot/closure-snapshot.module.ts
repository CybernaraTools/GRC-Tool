import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../platform/database/database.module.js";
import { ClosureSnapshotService } from "./application/closure-snapshot.service.js";
import { PostgresClosureSnapshotRepository } from "./infrastructure/postgres-closure-snapshot.repository.js";

// Deliberately imports only DatabaseModule — no dependency on AssessmentModule,
// RiskWorkflowModule, or EvidenceAssuranceModule, so that AssessmentModule can
// import this module (for closure-time capture) and AuditReportsModule can
// separately import both this module and AssessmentModule without a cycle.
@Module({
  imports: [DatabaseModule],
  providers: [ClosureSnapshotService, PostgresClosureSnapshotRepository],
  exports: [ClosureSnapshotService]
})
export class ClosureSnapshotModule {}
