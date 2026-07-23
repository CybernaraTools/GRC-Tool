import type { UniversalTask } from "../domain/task.js";
import type { Pagination } from "../../../shared/pagination.js";

export interface UniversalTaskRecord extends UniversalTask {
  version: number;
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface TasksRepository {
  createTask(input: {
    tenantId: string;
    task: UniversalTask;
    actorId: string;
  }): Promise<UniversalTaskRecord>;

  listTasks(input: {
    tenantId: string;
    ownerId?: string;
    status?: string;
    priority?: string;
    pagination: Pagination;
  }): Promise<UniversalTaskRecord[]>;

  findTask(tenantId: string, id: string): Promise<UniversalTaskRecord | null>;

  updateTask(input: {
    tenantId: string;
    id: string;
    actorId: string;
    ownerId?: string;
    status?: string;
    priority?: string;
  }): Promise<UniversalTaskRecord>;
}

export const TASKS_REPOSITORY = Symbol("TASKS_REPOSITORY");
