import { Controller, Get, Inject, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { PolicyGuard, RequirePolicy } from "../../platform-hardening/public.js";
import { readRequestContext } from "../../../shared/request-context.js";
import { QuestionsDashboardService } from "../application/questions-dashboard.service.js";

@ApiTags("questions-dashboard")
@Controller("v1/questions-dashboard")
@UseGuards(PolicyGuard)
export class QuestionsDashboardController {
  constructor(@Inject(QuestionsDashboardService) private readonly service: QuestionsDashboardService) {}

  @Get("questions")
  @RequirePolicy({ resourceType: "questions_dashboard", action: "read" })
  async listQuestions(@Req() req: Request) {
    const context = readRequestContext(req);
    return this.service.listUnifiedQuestions(context.tenantId, context.userId);
  }

  @Get("summary")
  @RequirePolicy({ resourceType: "questions_dashboard", action: "read" })
  async summary(@Req() req: Request) {
    const context = readRequestContext(req);
    return this.service.getSummary(context.tenantId, context.userId);
  }
}
