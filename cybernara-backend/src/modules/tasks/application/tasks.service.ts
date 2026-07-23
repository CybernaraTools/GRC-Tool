import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AuditLogService } from "../../audit-security/public.js";
import { OutboxService } from "../../outbox/public.js";
import { createUniversalTask, type TaskStatus, type TaskPriority, type TaskTargetType } from "../domain/task.js";
import { TASKS_REPOSITORY, type TasksRepository, type UniversalTaskRecord } from "./tasks.types.js";
import type { Pagination } from "../../../shared/pagination.js";

@Injectable()
export class TasksService {
  constructor(
    @Inject(TASKS_REPOSITORY) private readonly repository: TasksRepository,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(AuditLogService) private readonly auditLog: AuditLogService
  ) {}

  async createTask(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    title: string;
    description?: string;
    priority: TaskPriority;
    dueAt?: Date;
    ownerId: string;
    targetType: TaskTargetType;
    targetId: string;
  }): Promise<UniversalTaskRecord> {
    const task = createUniversalTask({
      tenantId: input.tenantId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      dueAt: input.dueAt,
      ownerId: input.ownerId,
      targetType: input.targetType,
      targetId: input.targetId
    });

    const record = await this.repository.createTask({
      tenantId: input.tenantId,
      task,
      actorId: input.actorId
    });

    await this.auditLog.append({
      tenantId: input.tenantId,
      eventType: "universal_task.create",
      actorId: input.actorId,
      targetType: "universal_task",
      targetId: record.id,
      traceId: input.idempotencyKey,
      classification: "confidential",
      body: { taskId: record.id }
    });

    return record;
  }

  async listTasks(input: {
    tenantId: string;
    ownerId?: string;
    status?: string;
    priority?: string;
    pagination: Pagination;
  }): Promise<UniversalTaskRecord[]> {
    return this.repository.listTasks(input);
  }

  async getTask(tenantId: string, id: string): Promise<UniversalTaskRecord> {
    const record = await this.repository.findTask(tenantId, id);
    if (!record) {
      throw new NotFoundException("Universal task not found.");
    }
    return record;
  }

  async updateTask(input: {
    tenantId: string;
    id: string;
    actorId: string;
    ownerId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
  }): Promise<UniversalTaskRecord> {
    const record = await this.repository.updateTask(input);

    await this.auditLog.append({
      tenantId: input.tenantId,
      eventType: "universal_task.update",
      actorId: input.actorId,
      targetType: "universal_task",
      targetId: record.id,
      traceId: randomUUID(),
      classification: "confidential",
      body: { taskId: record.id }
    });

    return record;
  }
}
