import { Controller, Get, Inject, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { PolicyGuard, RequirePolicy } from "../../platform-hardening/public.js";
import { readRequestContext } from "../../../shared/request-context.js";
import { NotificationHubService } from "../application/notification-hub.service.js";
import type { UserRole } from "../domain/notification.js";

const KNOWN_ROLES: UserRole[] = ["platform_admin", "auditor", "compliance_manager", "viewer"];

@ApiTags("notifications")
@Controller("v1/notifications")
@UseGuards(PolicyGuard)
export class NotificationHubController {
  constructor(@Inject(NotificationHubService) private readonly service: NotificationHubService) {}

  @Get()
  @RequirePolicy({ resourceType: "notification", action: "read" })
  async list(@Req() req: Request) {
    const context = readRequestContext(req);
    const role = KNOWN_ROLES.find((candidate) => context.roles.includes(candidate)) ?? "viewer";
    const items = await this.service.list(context.tenantId, context.userId, role);
    return { role, items };
  }
}
