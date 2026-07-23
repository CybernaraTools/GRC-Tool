import { randomUUID } from "node:crypto";

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type TaskTargetType = "remediation_task" | "rights_request_task" | "framework_update_impact";

export interface UniversalTask {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: Date;
  ownerId: string;
  targetType: TaskTargetType;
  targetId: string;
  completedAt?: Date;
  completedBy?: string;
}

export function createUniversalTask(input: Omit<UniversalTask, "id" | "status"> & { id?: string; status?: TaskStatus }): UniversalTask {
  if (input.title.trim().length === 0) {
    throw new Error("Task title cannot be empty.");
  }
  return {
    id: input.id ?? randomUUID(),
    tenantId: input.tenantId,
    title: input.title,
    description: input.description,
    status: input.status ?? "pending",
    priority: input.priority,
    dueAt: input.dueAt,
    ownerId: input.ownerId,
    targetType: input.targetType,
    targetId: input.targetId,
    completedAt: input.completedAt,
    completedBy: input.completedBy
  };
}
