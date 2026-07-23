import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { IsArray, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, Min, MinLength } from "class-validator";
import type { Request } from "express";
import { PaginationQueryDto, toPagination } from "../../../shared/pagination.dto.js";
import { PlatformOperatorGuard, readPlatformRequestContext } from "../../identity-tenant/public.js";
import {
  QuestionRepositoryService,
  type QuestionRepositoryResponseType,
  type QuestionRepositoryStatus
} from "../application/question-repository.service.js";

class QuestionRepositoryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(["draft", "pending_review", "approved", "rejected", "deprecated", "inactive", "retired"])
  status?: QuestionRepositoryStatus;

  @IsOptional()
  @IsString()
  harmonizedControlId?: string;

  @IsOptional()
  @IsString()
  frameworkKey?: string;
}

class QuestionRepositoryControlContextQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}

class CreateRepositoryDraftDto {
  @IsString()
  @MinLength(1)
  harmonizedControlId!: string;

  @IsString()
  @MinLength(10)
  questionText!: string;

  @IsIn(["boolean", "text", "maturity", "multi_select"])
  responseType!: QuestionRepositoryResponseType;

  @IsArray()
  @IsString({ each: true })
  evidenceExpectationIds!: string[];

  @IsOptional()
  @IsArray()
  citations?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;
}

class AssistRepositoryDraftDto {
  @IsString()
  @MinLength(1)
  harmonizedControlId!: string;

  @IsString()
  questionText!: string;

  @IsIn(["boolean", "text", "maturity", "multi_select"])
  responseType!: QuestionRepositoryResponseType;
}

class ReviseRepositoryDraftDto extends CreateRepositoryDraftDto {}

class UpdateRepositoryStatusDto {
  @IsIn(["approved", "inactive", "retired", "deprecated"])
  status!: Extract<QuestionRepositoryStatus, "approved" | "inactive" | "retired" | "deprecated">;
}

class PopulateBaselineDto {
  @IsOptional()
  @IsUUID()
  frameworkVersionId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;
}

@ApiTags("PlatformQuestionRepository")
@ApiUnauthorizedResponse({ description: "Platform operator context headers are missing or invalid." })
@ApiForbiddenResponse({ description: "Platform operator check denied the request." })
@UseGuards(PlatformOperatorGuard)
@Controller("v1/platform/question-repository")
export class QuestionRepositoryController {
  constructor(@Inject(QuestionRepositoryService) private readonly service: QuestionRepositoryService) {}

  @Get("questions")
  @ApiOperation({ summary: "Browse the global governed question repository." })
  @ApiOkResponse({ description: "Question repository entries." })
  listQuestions(@Query() query: QuestionRepositoryQueryDto) {
    return this.service.listGlobalQuestions({
      pagination: toPagination(query),
      search: query.search,
      status: query.status,
      harmonizedControlId: query.harmonizedControlId,
      frameworkKey: query.frameworkKey
    });
  }

  @Get("controls")
  @ApiOperation({ summary: "List harmonized controls with source-control overlap for repository authoring." })
  @ApiOkResponse({ description: "Harmonized control contexts." })
  listControls(@Query() query: QuestionRepositoryControlContextQueryDto) {
    return this.service.listGlobalControlContexts({
      pagination: toPagination(query),
      search: query.search
    });
  }

  @Post("question-assist")
  @HttpCode(200)
  @ApiOperation({ summary: "Use the governed OpenAI question generator to suggest repository draft metadata." })
  @ApiOkResponse({ description: "AI-assisted repository draft suggestion." })
  @ApiBadRequestResponse({ description: "Invalid AI assist request." })
  assistDraft(@Body() body: AssistRepositoryDraftDto) {
    return this.service.suggestQuestionDraft({
      harmonizedControlId: body.harmonizedControlId,
      questionText: body.questionText,
      responseType: body.responseType
    });
  }

  @Post("questions")
  @ApiOperation({ summary: "Create a manually authored draft question." })
  @ApiCreatedResponse({ description: "Draft question created." })
  @ApiBadRequestResponse({ description: "Invalid draft request." })
  createDraft(@Req() request: Request, @Body() body: CreateRepositoryDraftDto) {
    const context = readPlatformRequestContext(request);
    return this.service.createManualDraft({
      actorId: context.userId,
      harmonizedControlId: body.harmonizedControlId,
      questionText: body.questionText,
      responseType: body.responseType,
      evidenceExpectationIds: body.evidenceExpectationIds,
      citations: body.citations ?? [],
      confidence: body.confidence ?? 0.75
    });
  }

  @Post("questions/:questionVersionId/approve")
  @ApiOperation({ summary: "Approve a draft or pending question version." })
  @ApiOkResponse({ description: "Question version approved." })
  approve(@Req() request: Request, @Param("questionVersionId") questionVersionId: string) {
    const context = readPlatformRequestContext(request);
    return this.service.approveGlobalQuestion({
      actorId: context.userId,
      questionVersionId
    });
  }

  @Post("questions/:questionVersionId/revisions")
  @ApiOperation({ summary: "Create a new draft version from an existing question version." })
  @ApiCreatedResponse({ description: "Draft revision created." })
  @ApiBadRequestResponse({ description: "Invalid revision request." })
  reviseDraft(
    @Req() request: Request,
    @Param("questionVersionId") questionVersionId: string,
    @Body() body: ReviseRepositoryDraftDto
  ) {
    const context = readPlatformRequestContext(request);
    return this.service.createRevisionDraft({
      actorId: context.userId,
      baseQuestionVersionId: questionVersionId,
      harmonizedControlId: body.harmonizedControlId,
      questionText: body.questionText,
      responseType: body.responseType,
      evidenceExpectationIds: body.evidenceExpectationIds,
      citations: body.citations ?? [],
      confidence: body.confidence ?? 0.75
    });
  }

  @Post("questions/:questionVersionId/status")
  @ApiOperation({ summary: "Change lifecycle status without mutating approved question payload." })
  @ApiOkResponse({ description: "Question version status updated." })
  updateStatus(
    @Req() request: Request,
    @Param("questionVersionId") questionVersionId: string,
    @Body() body: UpdateRepositoryStatusDto
  ) {
    const context = readPlatformRequestContext(request);
    return this.service.updateGlobalQuestionStatus({
      actorId: context.userId,
      questionVersionId,
      status: body.status
    });
  }

  @Get("questions/:questionVersionId/consumers")
  @ApiOperation({ summary: "List frameworks and assessments that consume a question version." })
  @ApiOkResponse({ description: "Question consumers." })
  getConsumers(@Param("questionVersionId") questionVersionId: string) {
    return this.service.getGlobalQuestionConsumers(questionVersionId);
  }

  @Get("question-sets/:questionSetId/versions")
  @ApiOperation({ summary: "Compare every version for a question set." })
  @ApiOkResponse({ description: "Question set version history." })
  compareVersions(@Param("questionSetId") questionSetId: string) {
    return this.service.compareGlobalQuestionVersions(questionSetId);
  }

  @Post("baseline-generation")
  @ApiOperation({ summary: "Idempotently seed approved curated baseline questions from the global catalog." })
  @ApiOkResponse({ description: "Baseline generation result." })
  populateBaseline(@Req() request: Request, @Body() body: PopulateBaselineDto) {
    const context = readPlatformRequestContext(request);
    return this.service.ensureCuratedBaselineQuestions({
      actorId: context.userId,
      frameworkVersionId: body.frameworkVersionId,
      limit: body.limit
    });
  }
}
