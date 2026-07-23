import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested
} from "class-validator";
import type { Request } from "express";
import { PolicyGuard, RequirePolicy } from "../../platform-hardening/public.js";
import { PaginationQueryDto, toPagination } from "../../../shared/pagination.dto.js";
import { readRequestContext } from "../../../shared/request-context.js";
import { AssessmentService } from "../application/assessment.service.js";

class PinnedControlDto {
  @IsUUID()
  questionVersionId!: string;

  @IsOptional()
  @IsUUID()
  frameworkVersionId?: string;

  @IsOptional()
  @IsString()
  frameworkKey?: string;

  @IsOptional()
  @IsString()
  frameworkVersion?: string;

  @IsOptional()
  @IsString()
  mappingVersion?: string;

  @IsOptional()
  @IsString()
  controlId?: string;

  @IsOptional()
  @IsString()
  harmonizedControlId?: string;

  @IsOptional()
  @IsString()
  questionVersion?: string;
}

class CreateAssessmentDto {
  @IsString()
  @IsNotEmpty()
  scopeName!: string;

  @IsUUID()
  ownerId!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PinnedControlDto)
  controls!: PinnedControlDto[];
}

class ApplicabilityDto {
  @IsBoolean()
  applicable!: boolean;

  @IsString()
  @IsNotEmpty()
  rationale!: string;
}

class AnswerDto {
  @IsString()
  @IsNotEmpty()
  answerText!: string;

  @IsArray()
  @IsUUID(undefined, { each: true })
  evidenceIds!: string[];
}

class ReviewDto {
  @IsBoolean()
  approved!: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}

class ReopenDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

class CreateTestProcedureDto {
  @IsString()
  @IsNotEmpty()
  procedureKey!: string;

  @IsString()
  @IsNotEmpty()
  method!: string;

  @IsString()
  @IsNotEmpty()
  expectedResult!: string;
}

class RecordControlTestResultDto {
  @IsUUID()
  testProcedureId!: string;

  @IsIn(["pass", "fail", "not_tested"])
  result!: "pass" | "fail" | "not_tested";

  @IsOptional()
  @IsString()
  population?: string;
}

@ApiTags("Assessment")
@ApiUnauthorizedResponse({ description: "Request context headers are missing or invalid." })
@ApiForbiddenResponse({ description: "Platform policy denied the request." })
@UseGuards(PolicyGuard)
@Controller("v1/assessments")
export class AssessmentController {
  constructor(@Inject(AssessmentService) private readonly service: AssessmentService) {}

  @Post()
  @RequirePolicy({ resourceType: "assessment", action: "write" })
  @ApiOperation({ summary: "Create an assessment scope with pinned controls." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Assessment created." })
  @ApiBadRequestResponse({ description: "Invalid request body or idempotency key." })
  async create(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: CreateAssessmentDto
  ) {
    const context = readRequestContext(request);
    return this.service.create({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      scopeName: body.scopeName,
      ownerId: body.ownerId,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
      controls: body.controls
    });
  }

  @Patch(":assessmentId")
  @RequirePolicy({ resourceType: "assessment", action: "write", resourceIdParam: "assessmentId" })
  @ApiOperation({ summary: "Edit a draft assessment scope before work starts." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Draft assessment updated." })
  @ApiBadRequestResponse({ description: "Invalid request body, idempotency key, or assessment state." })
  async updateDraft(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("assessmentId") assessmentId: string,
    @Body() body: CreateAssessmentDto
  ) {
    const context = readRequestContext(request);
    return this.service.updateDraft({
      tenantId: context.tenantId,
      actorId: context.userId,
      assessmentId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      scopeName: body.scopeName,
      ownerId: body.ownerId,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
      controls: body.controls
    });
  }

  @Get()
  @RequirePolicy({ resourceType: "assessment", action: "read" })
  @ApiOperation({ summary: "List assessments." })
  @ApiOkResponse({ description: "Assessments." })
  async list(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.list(context.tenantId, toPagination(query));
  }

  @Get(":assessmentId")
  @RequirePolicy({ resourceType: "assessment", action: "read", resourceIdParam: "assessmentId" })
  @ApiOperation({ summary: "Fetch an assessment with items." })
  @ApiOkResponse({ description: "Assessment." })
  async get(@Req() request: Request, @Param("assessmentId") assessmentId: string) {
    const context = readRequestContext(request);
    return this.service.get(context.tenantId, assessmentId);
  }

  @Get(":assessmentId/items")
  @RequirePolicy({ resourceType: "assessment", action: "read", resourceIdParam: "assessmentId" })
  @ApiOperation({ summary: "List assessment items." })
  @ApiOkResponse({ description: "Assessment items." })
  async listItems(@Req() request: Request, @Param("assessmentId") assessmentId: string) {
    const context = readRequestContext(request);
    return (await this.service.get(context.tenantId, assessmentId)).items;
  }

  @Get(":assessmentId/items/:itemId")
  @RequirePolicy({ resourceType: "assessment", action: "read", resourceIdParam: "assessmentId" })
  @ApiOperation({ summary: "Fetch one assessment item." })
  @ApiOkResponse({ description: "Assessment item." })
  async getItem(
    @Req() request: Request,
    @Param("assessmentId") assessmentId: string,
    @Param("itemId") itemId: string
  ) {
    const context = readRequestContext(request);
    const item = (await this.service.get(context.tenantId, assessmentId)).items.find((candidate) => candidate.id === itemId);
    if (!item) {
      throw new NotFoundException("Assessment item not found.");
    }
    return item;
  }

  @Post(":assessmentId/items/:itemId/applicability")
  @RequirePolicy({ resourceType: "assessment", action: "write", resourceIdParam: "assessmentId" })
  @ApiOperation({ summary: "Approve an assessment-item applicability decision." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Updated assessment." })
  async approveApplicability(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("assessmentId") assessmentId: string,
    @Param("itemId") itemId: string,
    @Body() body: ApplicabilityDto
  ) {
    const context = readRequestContext(request);
    return this.service.approveApplicability({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      assessmentId,
      itemId,
      applicable: body.applicable,
      rationale: body.rationale
    });
  }

  @Post(":assessmentId/items/:itemId/answers")
  @RequirePolicy({ resourceType: "assessment", action: "write", resourceIdParam: "assessmentId" })
  @ApiOperation({ summary: "Submit an answer and evidence references for an assessment item." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Updated assessment." })
  async submitAnswer(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("assessmentId") assessmentId: string,
    @Param("itemId") itemId: string,
    @Body() body: AnswerDto
  ) {
    const context = readRequestContext(request);
    return this.service.submitAnswer({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      assessmentId,
      itemId,
      answerText: body.answerText,
      evidenceIds: body.evidenceIds
    });
  }

  @Post(":assessmentId/items/:itemId/reviews")
  @RequirePolicy({ resourceType: "assessment", action: "review", resourceIdParam: "assessmentId" })
  @ApiOperation({ summary: "Approve or request changes on a submitted assessment item." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Updated assessment." })
  async review(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("assessmentId") assessmentId: string,
    @Param("itemId") itemId: string,
    @Body() body: ReviewDto
  ) {
    const context = readRequestContext(request);
    return this.service.review({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      assessmentId,
      itemId,
      approved: body.approved,
      reason: body.reason
    });
  }

  @Post(":assessmentId/items/:itemId/reopen")
  @RequirePolicy({ resourceType: "assessment", action: "review", resourceIdParam: "assessmentId" })
  @ApiOperation({ summary: "Reopen an approved item for changes." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Updated assessment." })
  async reopen(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("assessmentId") assessmentId: string,
    @Param("itemId") itemId: string,
    @Body() body: ReopenDto
  ) {
    const context = readRequestContext(request);
    return this.service.reopen({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      assessmentId,
      itemId,
      reason: body.reason
    });
  }

  @Post(":assessmentId/close")
  @RequirePolicy({ resourceType: "assessment", action: "review", resourceIdParam: "assessmentId" })
  @ApiOperation({ summary: "Close an assessment after all items are approved." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Closed assessment." })
  async close(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("assessmentId") assessmentId: string
  ) {
    const context = readRequestContext(request);
    return this.service.close({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      assessmentId
    });
  }

  @Get(":assessmentId/items/:itemId/answers/history")
  @RequirePolicy({ resourceType: "assessment", action: "read", resourceIdParam: "assessmentId" })
  @ApiOperation({ summary: "List every answer revision for an assessment item, oldest to newest." })
  @ApiOkResponse({ description: "Answer revision history." })
  async answerHistory(
    @Req() request: Request,
    @Param("assessmentId") assessmentId: string,
    @Param("itemId") itemId: string
  ) {
    const context = readRequestContext(request);
    return this.service.getAnswerHistory(context.tenantId, assessmentId, itemId);
  }

  @Get(":assessmentId/items/:itemId/applicability/history")
  @RequirePolicy({ resourceType: "assessment", action: "read", resourceIdParam: "assessmentId" })
  @ApiOperation({ summary: "List every applicability decision for an assessment item's control instance." })
  @ApiOkResponse({ description: "Applicability decision history." })
  async applicabilityHistory(
    @Req() request: Request,
    @Param("assessmentId") assessmentId: string,
    @Param("itemId") itemId: string
  ) {
    const context = readRequestContext(request);
    return this.service.getApplicabilityHistory(context.tenantId, assessmentId, itemId);
  }

  @Get(":assessmentId/items/:itemId/reviews/history")
  @RequirePolicy({ resourceType: "assessment", action: "read", resourceIdParam: "assessmentId" })
  @ApiOperation({ summary: "List every review decision for an assessment item." })
  @ApiOkResponse({ description: "Review decision history." })
  async reviewHistory(
    @Req() request: Request,
    @Param("assessmentId") assessmentId: string,
    @Param("itemId") itemId: string
  ) {
    const context = readRequestContext(request);
    return this.service.getReviewHistory(context.tenantId, assessmentId, itemId);
  }

  @Get(":assessmentId/signoffs")
  @RequirePolicy({ resourceType: "assessment", action: "read", resourceIdParam: "assessmentId" })
  @ApiOperation({ summary: "List every sign-off recorded for an assessment." })
  @ApiOkResponse({ description: "Assessment sign-offs." })
  async signoffs(@Req() request: Request, @Param("assessmentId") assessmentId: string) {
    const context = readRequestContext(request);
    return this.service.getSignoffs(context.tenantId, assessmentId);
  }

  @Post(":assessmentId/items/:itemId/test-procedures")
  @RequirePolicy({ resourceType: "assessment", action: "write", resourceIdParam: "assessmentId" })
  @ApiOperation({ summary: "Define a manual test procedure for an assessment item's control." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Test procedure created." })
  async createTestProcedure(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("assessmentId") assessmentId: string,
    @Param("itemId") itemId: string,
    @Body() body: CreateTestProcedureDto
  ) {
    const context = readRequestContext(request);
    return this.service.createTestProcedure({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      assessmentId,
      itemId,
      procedureKey: body.procedureKey,
      method: body.method,
      expectedResult: body.expectedResult
    });
  }

  @Get(":assessmentId/items/:itemId/test-procedures")
  @RequirePolicy({ resourceType: "assessment", action: "read", resourceIdParam: "assessmentId" })
  @ApiOperation({ summary: "List test procedures defined for an assessment item's control." })
  @ApiOkResponse({ description: "Test procedures." })
  async listTestProcedures(
    @Req() request: Request,
    @Param("assessmentId") assessmentId: string,
    @Param("itemId") itemId: string
  ) {
    const context = readRequestContext(request);
    return this.service.listTestProcedures(context.tenantId, assessmentId, itemId);
  }

  @Post(":assessmentId/items/:itemId/test-results")
  @RequirePolicy({ resourceType: "assessment", action: "write", resourceIdParam: "assessmentId" })
  @ApiOperation({ summary: "Record a control test result against an assessment item's control instance." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Control test result recorded." })
  async recordControlTestResult(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("assessmentId") assessmentId: string,
    @Param("itemId") itemId: string,
    @Body() body: RecordControlTestResultDto
  ) {
    const context = readRequestContext(request);
    return this.service.recordControlTestResult({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      assessmentId,
      itemId,
      testProcedureId: body.testProcedureId,
      result: body.result,
      population: body.population
    });
  }

  @Get(":assessmentId/items/:itemId/test-results")
  @RequirePolicy({ resourceType: "assessment", action: "read", resourceIdParam: "assessmentId" })
  @ApiOperation({ summary: "List control test results recorded against an assessment item's control instance." })
  @ApiOkResponse({ description: "Control test results." })
  async listControlTestResults(
    @Req() request: Request,
    @Param("assessmentId") assessmentId: string,
    @Param("itemId") itemId: string
  ) {
    const context = readRequestContext(request);
    return this.service.listControlTestResults(context.tenantId, assessmentId, itemId);
  }
}

function requiredIdempotencyKey(value: string | undefined): string {
  if (!value?.trim()) {
    throw new BadRequestException("Idempotency-Key header is required.");
  }
  return value;
}
