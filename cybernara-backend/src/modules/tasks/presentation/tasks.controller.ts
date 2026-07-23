import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { IsIn, IsOptional, IsUUID } from "class-validator";
import type { Request } from "express";
import { PolicyGuard, RequirePolicy } from "../../platform-hardening/public.js";
import { PaginationQueryDto, toPagination } from "../../../shared/pagination.dto.js";
import { readRequestContext } from "../../../shared/request-context.js";
import { TasksService } from "../application/tasks.service.js";
import type { TaskStatus, TaskPriority } from "../domain/task.js";

const statuses = ["pending", "in_progress", "completed", "cancelled"] as const;
const priorities = ["low", "medium", "high", "critical"] as const;

class TaskListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsIn(statuses)
  status?: string;

  @IsOptional()
  @IsIn(priorities)
  priority?: string;
}

class UpdateTaskDto {
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsIn(statuses)
  status?: TaskStatus;

  @IsOptional()
  @IsIn(priorities)
  priority?: TaskPriority;
}

@ApiTags("Tasks")
@Controller("v1/tasks")
@UseGuards(PolicyGuard)
@ApiUnauthorizedResponse({ description: "Unauthorized access." })
@ApiForbiddenResponse({ description: "Forbidden access." })
export class TasksController {
  constructor(@Inject(TasksService) private readonly service: TasksService) {}

  @Get()
  @RequirePolicy({ resourceType: "universal_task", action: "read" })
  @ApiOperation({ summary: "List universal tasks for the current tenant." })
  @ApiOkResponse({ description: "Universal tasks listed successfully." })
  async list(@Req() request: Request, @Query() query: TaskListQueryDto) {
    const context = readRequestContext(request);
    return this.service.listTasks({
      tenantId: context.tenantId,
      ownerId: query.ownerId,
      status: query.status,
      priority: query.priority,
      pagination: toPagination(query)
    });
  }

  @Get(":id")
  @RequirePolicy({ resourceType: "universal_task", action: "read", resourceIdParam: "id" })
  @ApiOperation({ summary: "Fetch a specific universal task details." })
  @ApiOkResponse({ description: "Universal task details." })
  async get(@Req() request: Request, @Param("id") id: string) {
    const context = readRequestContext(request);
    return this.service.getTask(context.tenantId, id);
  }

  @Patch(":id")
  @RequirePolicy({ resourceType: "universal_task", action: "write", resourceIdParam: "id" })
  @ApiOperation({ summary: "Update task assignment, status, or priority." })
  @ApiOkResponse({ description: "Universal task updated successfully." })
  async update(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() body: UpdateTaskDto
  ) {
    const context = readRequestContext(request);
    return this.service.updateTask({
      tenantId: context.tenantId,
      id,
      actorId: context.userId,
      ownerId: body.ownerId,
      status: body.status,
      priority: body.priority
    });
  }
}
