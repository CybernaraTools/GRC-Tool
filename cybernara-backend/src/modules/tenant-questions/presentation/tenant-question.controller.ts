import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsArray, IsDateString, IsIn, IsOptional, IsString, IsUUID, MinLength } from "class-validator";
import type { Request } from "express";
import { PolicyGuard, RequirePolicy } from "../../platform-hardening/public.js";
import { readRequestContext } from "../../../shared/request-context.js";
import { TenantQuestionService } from "../application/tenant-question.service.js";

class CreateTenantQuestionDto {
  @IsString()
  @MinLength(1)
  questionText!: string;

  @IsIn(["boolean", "text", "maturity", "multi_select"])
  responseType!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  frameworkKeys!: string[];
}

class CreateAssessmentFromQuestionDto {
  @IsString()
  @MinLength(1)
  scopeName!: string;

  @IsUUID()
  ownerId!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;
}

@ApiTags("tenant-questions")
@Controller("v1/tenant-questions")
@UseGuards(PolicyGuard)
export class TenantQuestionController {
  constructor(@Inject(TenantQuestionService) private readonly service: TenantQuestionService) {}

  @Get()
  @RequirePolicy({ resourceType: "tenant_question", action: "read" })
  async list(@Req() req: Request) {
    const context = readRequestContext(req);
    return this.service.list(context.tenantId, context.userId);
  }

  @Get(":questionId")
  @RequirePolicy({ resourceType: "tenant_question", action: "read", resourceIdParam: "questionId" })
  async get(@Req() req: Request, @Param("questionId") questionId: string) {
    const context = readRequestContext(req);
    return this.service.get(context.tenantId, context.userId, questionId);
  }

  @Post()
  @RequirePolicy({ resourceType: "tenant_question", action: "write" })
  async create(@Req() req: Request, @Body() body: CreateTenantQuestionDto) {
    const context = readRequestContext(req);
    return this.service.create({
      tenantId: context.tenantId,
      actorId: context.userId,
      questionText: body.questionText,
      responseType: body.responseType,
      description: body.description,
      frameworkKeys: body.frameworkKeys
    });
  }

  @Post(":questionId/create-assessment")
  @RequirePolicy({ resourceType: "tenant_question", action: "write", resourceIdParam: "questionId" })
  async createAssessment(
    @Req() req: Request,
    @Param("questionId") questionId: string,
    @Body() body: CreateAssessmentFromQuestionDto,
    @Headers("idempotency-key") idempotencyKey: string | undefined
  ) {
    const context = readRequestContext(req);
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException("Idempotency-Key header is required.");
    }
    return this.service.createAssessmentForCustomQuestion({
      tenantId: context.tenantId,
      actorId: context.userId,
      questionId,
      ownerId: body.ownerId,
      scopeName: body.scopeName,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
      idempotencyKey
    });
  }
}
