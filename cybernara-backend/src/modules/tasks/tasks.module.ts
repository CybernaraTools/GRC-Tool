import { Module } from "@nestjs/common";
import { AuditSecurityModule } from "../audit-security/public.js";
import { OutboxModule } from "../outbox/public.js";
import { PlatformHardeningModule } from "../platform-hardening/public.js";
import { DatabaseModule } from "../../platform/database/database.module.js";
import { TasksService } from "./application/tasks.service.js";
import { TASKS_REPOSITORY } from "./application/tasks.types.js";
import { PostgresTasksRepository } from "./infrastructure/postgres-tasks.repository.js";
import { TasksController } from "./presentation/tasks.controller.js";

@Module({
  imports: [DatabaseModule, AuditSecurityModule, OutboxModule, PlatformHardeningModule],
  controllers: [TasksController],
  providers: [
    TasksService,
    {
      provide: TASKS_REPOSITORY,
      useClass: PostgresTasksRepository
    }
  ],
  exports: [TasksService]
})
export class TasksModule {}
