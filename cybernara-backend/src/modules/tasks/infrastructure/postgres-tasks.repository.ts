import { Inject, Injectable } from "@nestjs/common";
import { TenantScopedDb } from "../../../platform/database/tenant-scoped-db.js";
import type { TasksRepository, UniversalTaskRecord } from "../application/tasks.types.js";
import type { UniversalTask, TaskStatus, TaskPriority, TaskTargetType } from "../domain/task.js";

@Injectable()
export class PostgresTasksRepository implements TasksRepository {
  constructor(@Inject(TenantScopedDb) private readonly db: TenantScopedDb) {}

  async createTask(input: {
    tenantId: string;
    task: UniversalTask;
    actorId: string;
  }): Promise<UniversalTaskRecord> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const task = input.task;
      const result = await client.query(
        `
          insert into universal_tasks (
            id, tenant_id, title, description, status, priority, due_at, owner_id, target_type, target_id, classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'confidential', $11, $11)
          returning ${taskColumns()}
        `,
        [
          task.id,
          input.tenantId,
          task.title,
          task.description ?? null,
          task.status,
          task.priority,
          task.dueAt ? task.dueAt.toISOString() : null,
          task.ownerId,
          task.targetType,
          task.targetId,
          input.actorId
        ]
      );
      return mapTask(result.rows[0] as unknown as TaskRow);
    });
  }

  async listTasks(input: {
    tenantId: string;
    ownerId?: string;
    status?: string;
    priority?: string;
    pagination: { limit: number; offset: number };
  }): Promise<UniversalTaskRecord[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const params: unknown[] = [input.tenantId];
      let query = `select ${taskColumns()} from universal_tasks where tenant_id = $1`;

      if (input.ownerId) {
        params.push(input.ownerId);
        query += ` and owner_id = $${params.length}`;
      }
      if (input.status) {
        params.push(input.status);
        query += ` and status = $${params.length}`;
      }
      if (input.priority) {
        params.push(input.priority);
        query += ` and priority = $${params.length}`;
      }

      params.push(input.pagination.limit, input.pagination.offset);
      query += ` order by created_at desc limit $${params.length - 1} offset $${params.length}`;

      const result = await client.query(query, params);
      return result.rows.map((row) => mapTask(row as unknown as TaskRow));
    });
  }

  async findTask(tenantId: string, id: string): Promise<UniversalTaskRecord | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${taskColumns()} from universal_tasks where tenant_id = $1 and id = $2`,
        [tenantId, id]
      );
      return result.rows[0] ? mapTask(result.rows[0] as unknown as TaskRow) : null;
    });
  }

  async updateTask(input: {
    tenantId: string;
    id: string;
    actorId: string;
    ownerId?: string;
    status?: string;
    priority?: string;
  }): Promise<UniversalTaskRecord> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const existing = await this.findTask(input.tenantId, input.id);
      if (!existing) {
        throw new Error("Task not found.");
      }

      const ownerId = input.ownerId ?? existing.ownerId;
      const status = input.status ?? existing.status;
      const priority = input.priority ?? existing.priority;

      const result = await client.query(
        `
          update universal_tasks
          set
            version = version + 1,
            owner_id = $1,
            status = $2,
            priority = $3,
            updated_by = $4,
            updated_at = now()
          where tenant_id = $5 and id = $6
          returning ${taskColumns()}
        `,
        [ownerId, status, priority, input.actorId, input.tenantId, input.id]
      );

      return mapTask(result.rows[0] as unknown as TaskRow);
    });
  }
}

function taskColumns(): string {
  return "id, tenant_id, version, title, description, status, priority, due_at, owner_id, target_type, target_id, completed_at, completed_by, classification, created_by, created_at, updated_by, updated_at";
}

interface TaskRow {
  id: string;
  tenant_id: string;
  version: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: Date | string | null;
  owner_id: string;
  target_type: TaskTargetType;
  target_id: string;
  completed_at: Date | string | null;
  completed_by: string | null;
  classification: string;
  created_by: string;
  created_at: Date | string;
  updated_by: string;
  updated_at: Date | string;
}

function mapTask(row: TaskRow): UniversalTaskRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    version: row.version,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    priority: row.priority,
    dueAt: row.due_at ? new Date(row.due_at) : undefined,
    ownerId: row.owner_id,
    targetType: row.target_type,
    targetId: row.target_id,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    completedBy: row.completed_by ?? undefined,
    classification: row.classification,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedBy: row.updated_by,
    updatedAt: new Date(row.updated_at)
  };
}
