import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
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
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested
} from "class-validator";
import type { Request } from "express";
import { PolicyGuard, RequirePolicy } from "../../platform-hardening/public.js";
import { PaginationQueryDto, toPagination } from "../../../shared/pagination.dto.js";
import { readRequestContext } from "../../../shared/request-context.js";
import { AiOrchestrationService } from "../application/ai-orchestration.service.js";
import type {
  AiActorKind,
  AiFailureReason,
  AiResponseType,
  KnowledgeChunkSourceType,
  RetrievedChunkAclDecision,
  SafetyCheckResult,
  SafetyCheckType
} from "../domain/governance.js";

class CitationSourceDto {
  @IsString()
  @IsNotEmpty()
  sourceId!: string;

  @IsIn(["framework_requirement", "harmonized_control", "evidence_expectation", "tenant_scope", "knowledge_base"])
  sourceType!: "framework_requirement" | "harmonized_control" | "evidence_expectation" | "tenant_scope" | "knowledge_base";

  @IsOptional()
  @IsString()
  checksum?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}

class ControlContextDto {
  @IsString()
  @IsNotEmpty()
  harmonizedControlId!: string;

  @IsString()
  @IsNotEmpty()
  controlTitle!: string;

  @IsString()
  @IsNotEmpty()
  controlDescription!: string;

  @IsArray()
  @IsString({ each: true })
  mappedClauseIds!: string[];

  @IsArray()
  @IsString({ each: true })
  evidenceExpectationIds!: string[];

  @IsArray()
  @IsString({ each: true })
  tenantScopeTags!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CitationSourceDto)
  citations!: CitationSourceDto[];
}

class GenerationParametersDto {
  @IsNumber()
  @Min(0)
  @Max(0.3)
  temperature!: number;

  @IsNumber()
  @Min(1)
  maxOutputTokens!: number;

  @IsNumber()
  @Min(1)
  retrievalTopK!: number;
}

class GeneratedQuestionCandidateDto {
  @IsString()
  @IsNotEmpty()
  questionText!: string;

  @IsIn(["boolean", "text", "maturity", "multi_select"])
  responseType!: AiResponseType;

  @IsArray()
  @IsString({ each: true })
  evidenceExpectationIds!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CitationSourceDto)
  citations!: CitationSourceDto[];

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number;
}

class QuestionGenerationDto {
  @ValidateNested()
  @Type(() => GenerationParametersDto)
  generationParameters!: GenerationParametersDto;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ControlContextDto)
  controls?: ControlContextDto[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @IsIn(["boolean", "text", "maturity", "multi_select"], { each: true })
  responseTypes?: AiResponseType[];

  @IsOptional()
  @IsString()
  questionFocus?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  frameworkKeys?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GeneratedQuestionCandidateDto)
  providerQuestions?: GeneratedQuestionCandidateDto[];
}

class FallbackGenerationDto {
  @ValidateNested()
  @Type(() => GenerationParametersDto)
  generationParameters!: GenerationParametersDto;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ControlContextDto)
  controls?: ControlContextDto[];

  @IsOptional()
  @IsString()
  questionFocus?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  frameworkKeys?: string[];

  @IsIn(["model_unavailable", "retrieval_unavailable", "policy_failed", "evaluation_failed"])
  failureReason!: AiFailureReason;
}

class ReviewGenerationDto {
  @IsIn(["approved", "rejected"])
  decision!: "approved" | "rejected";

  @IsString()
  @IsNotEmpty()
  rationale!: string;

  @IsOptional()
  @IsIn(["human", "ai", "service"])
  reviewerKind?: AiActorKind;
}

const knowledgeChunkSourceTypes: KnowledgeChunkSourceType[] = [
  "framework_requirement",
  "harmonized_control",
  "policy_version",
  "evidence_object"
];
const aclDecisions: RetrievedChunkAclDecision[] = ["allowed", "denied"];
const safetyCheckTypes: SafetyCheckType[] = ["prompt_injection", "pii_exposure", "toxicity", "policy_bypass", "jailbreak"];
const safetyCheckResults: SafetyCheckResult[] = ["pass", "fail", "warn"];

class CreateKnowledgeChunkDto {
  @IsString()
  @IsNotEmpty()
  retrievalIndexId!: string;

  @IsIn(knowledgeChunkSourceTypes)
  sourceType!: KnowledgeChunkSourceType;

  @IsString()
  @IsNotEmpty()
  sourceId!: string;

  @IsString()
  @IsNotEmpty()
  sourceVersion!: string;

  @IsString()
  @IsNotEmpty()
  contentHash!: string;

  @IsOptional()
  @IsObject()
  aclJson?: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  textUri!: string;
}

class CreateRetrievalRunDto {
  @IsString()
  @IsNotEmpty()
  queryHash!: string;

  @IsOptional()
  @IsObject()
  filtersJson?: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  retrievalIndexId!: string;

  @IsNumber()
  @Min(1)
  @Max(50)
  topK!: number;
}

class CreateRetrievedChunkDto {
  @IsString()
  @IsNotEmpty()
  knowledgeChunkId!: string;

  @IsNumber()
  @Min(1)
  rank!: number;

  @IsNumber()
  score!: number;

  @IsIn(aclDecisions)
  aclDecision!: RetrievedChunkAclDecision;
}

class CreateGenerationCitationDto {
  @IsString()
  @IsNotEmpty()
  outputPath!: string;

  @IsString()
  @IsNotEmpty()
  knowledgeChunkId!: string;

  @IsOptional()
  @IsString()
  locator?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  entailmentScore?: number;
}

class CreateSafetyCheckDto {
  @IsIn(safetyCheckTypes)
  checkType!: SafetyCheckType;

  @IsString()
  @IsNotEmpty()
  policyVersion!: string;

  @IsIn(safetyCheckResults)
  result!: SafetyCheckResult;

  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsObject()
  redactionSummary?: Record<string, unknown>;
}

class CreateEvaluationSuiteDto {
  @IsString()
  @IsNotEmpty()
  useCase!: string;

  @IsString()
  @IsNotEmpty()
  suiteKey!: string;

  @IsString()
  @IsNotEmpty()
  suiteVersion!: string;

  @IsOptional()
  @IsObject()
  thresholdPolicy?: Record<string, unknown>;
}

class CreateEvaluationCaseDto {
  @IsString()
  @IsNotEmpty()
  caseKey!: string;

  @IsString()
  @IsNotEmpty()
  inputFixtureUri!: string;

  @IsOptional()
  @IsObject()
  expectedJson?: Record<string, unknown>;
}

class CreateEvaluationResultDto {
  @IsString()
  @IsNotEmpty()
  evaluationRunId!: string;

  @IsString()
  @IsNotEmpty()
  caseId!: string;

  @IsString()
  @IsNotEmpty()
  metric!: string;

  @IsNumber()
  score!: number;

  @IsNumber()
  threshold!: number;

  @IsOptional()
  @IsString()
  artifactUri?: string;
}

@ApiTags("AIOrchestration")
@ApiUnauthorizedResponse({ description: "Request context headers are missing or invalid." })
@ApiForbiddenResponse({ description: "Platform policy denied the request." })
@UseGuards(PolicyGuard)
@Controller("v1/ai-orchestration")
export class AiOrchestrationController {
  constructor(@Inject(AiOrchestrationService) private readonly service: AiOrchestrationService) {}

  @Post("question-generations")
  @RequirePolicy({ resourceType: "ai_generation_run", action: "write" })
  @ApiOperation({ summary: "Request governed assessment-question generation." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "AI question generation requested." })
  @ApiBadRequestResponse({ description: "Invalid request body or idempotency key." })
  async requestGeneration(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: QuestionGenerationDto
  ) {
    const context = readRequestContext(request);
    return this.service.requestGeneration({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      generationParameters: body.generationParameters,
      controls: body.controls,
      providerQuestions: body.providerQuestions,
      responseTypes: body.responseTypes,
      questionFocus: body.questionFocus,
      frameworkKeys: body.frameworkKeys
    });
  }

  @Post("question-generations/fallback")
  @RequirePolicy({ resourceType: "ai_generation_run", action: "write" })
  @ApiOperation({ summary: "Explicitly trigger curated fallback question generation." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Fallback generation created." })
  async triggerFallback(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: FallbackGenerationDto
  ) {
    const context = readRequestContext(request);
    return this.service.triggerFallback({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      generationParameters: body.generationParameters,
      controls: body.controls,
      questionFocus: body.questionFocus,
      frameworkKeys: body.frameworkKeys,
      failureReason: body.failureReason
    });
  }

  @Get("questions/pending-review")
  @RequirePolicy({ resourceType: "ai_question_version", action: "read" })
  @ApiOperation({ summary: "List pending AI-origin question versions awaiting human review." })
  @ApiOkResponse({ description: "Pending question versions." })
  async pending(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listPendingQuestions(context.tenantId, toPagination(query));
  }

  @Get("questions/approved")
  @RequirePolicy({ resourceType: "ai_question_version", action: "read" })
  @ApiOperation({ summary: "List approved AI-origin question versions." })
  @ApiOkResponse({ description: "Approved question versions." })
  async approved(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listApprovedQuestions(context.tenantId, toPagination(query));
  }

  @Get("question-generations/:generationRunId/provenance")
  @RequirePolicy({ resourceType: "ai_generation_run", action: "read", resourceIdParam: "generationRunId" })
  @ApiOperation({ summary: "Fetch AI generation provenance." })
  @ApiOkResponse({ description: "AI generation provenance." })
  async provenance(@Req() request: Request, @Param("generationRunId") generationRunId: string) {
    const context = readRequestContext(request);
    return this.service.getProvenance(context.tenantId, generationRunId);
  }

  @Post("question-generations/:generationRunId/reviews")
  @RequirePolicy({ resourceType: "ai_generation_run", action: "review", resourceIdParam: "generationRunId" })
  @ApiOperation({ summary: "Submit a human approval or rejection for generated questions." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Reviewed AI generation run." })
  async review(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("generationRunId") generationRunId: string,
    @Body() body: ReviewGenerationDto
  ) {
    const context = readRequestContext(request);
    return this.service.review({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      generationRunId,
      decision: body.decision,
      rationale: body.rationale,
      reviewerKind: body.reviewerKind ?? "human"
    });
  }

  @Post("question-generations/:generationRunId/publish")
  @RequirePolicy({ resourceType: "ai_question_version", action: "write", resourceIdParam: "generationRunId" })
  @ApiOperation({ summary: "Publish every approved AI-origin question in a generation run." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Published AI question generation run." })
  async publishGenerationQuestions(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("generationRunId") generationRunId: string
  ) {
    const context = readRequestContext(request);
    return this.service.publishGenerationQuestions({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      generationRunId
    });
  }

  @Post("questions/:questionId/publish")
  @RequirePolicy({ resourceType: "ai_question_version", action: "write", resourceIdParam: "questionId" })
  @ApiOperation({ summary: "Publish an approved AI-origin question version." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Published question version." })
  async publishQuestion(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("questionId") questionId: string
  ) {
    const context = readRequestContext(request);
    return this.service.publishQuestion({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      questionId
    });
  }

  @Get("questions/:questionId/publication-events")
  @RequirePolicy({ resourceType: "ai_question_version", action: "read", resourceIdParam: "questionId" })
  @ApiOperation({ summary: "List publication approval events for a published AI-origin question." })
  @ApiOkResponse({ description: "AI publication events." })
  async publicationEvents(@Req() request: Request, @Param("questionId") questionId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.getPublicationEvents(context.tenantId, "ai_question_version", questionId, toPagination(query));
  }

  @Post("knowledge-chunks")
  @RequirePolicy({ resourceType: "knowledge_chunk", action: "write" })
  @ApiOperation({ summary: "Register a versioned retrievable knowledge chunk." })
  @ApiCreatedResponse({ description: "Knowledge chunk created." })
  async createKnowledgeChunk(@Req() request: Request, @Body() body: CreateKnowledgeChunkDto) {
    const context = readRequestContext(request);
    return this.service.createKnowledgeChunk({
      tenantId: context.tenantId,
      actorId: context.userId,
      ...body
    });
  }

  @Get("knowledge-chunks")
  @RequirePolicy({ resourceType: "knowledge_chunk", action: "read" })
  @ApiOperation({ summary: "List knowledge chunks." })
  @ApiOkResponse({ description: "Knowledge chunks." })
  async listKnowledgeChunks(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listKnowledgeChunks(context.tenantId, toPagination(query));
  }

  @Post("retrieval-runs")
  @RequirePolicy({ resourceType: "retrieval_run", action: "write" })
  @ApiOperation({ summary: "Record a retrieval execution." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Retrieval run created." })
  async createRetrievalRun(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: CreateRetrievalRunDto
  ) {
    const context = readRequestContext(request);
    return this.service.createRetrievalRun({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      ...body
    });
  }

  @Get("retrieval-runs")
  @RequirePolicy({ resourceType: "retrieval_run", action: "read" })
  @ApiOperation({ summary: "List retrieval runs." })
  @ApiOkResponse({ description: "Retrieval runs." })
  async listRetrievalRuns(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listRetrievalRuns(context.tenantId, toPagination(query));
  }

  @Post("retrieval-runs/:runId/chunks")
  @RequirePolicy({ resourceType: "retrieved_chunk", action: "write", resourceIdParam: "runId" })
  @ApiOperation({ summary: "Record a ranked retrieval result for a retrieval run." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Retrieved chunk recorded." })
  async createRetrievedChunk(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("runId") runId: string,
    @Body() body: CreateRetrievedChunkDto
  ) {
    const context = readRequestContext(request);
    return this.service.createRetrievedChunk({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      retrievalRunId: runId,
      ...body
    });
  }

  @Get("retrieval-runs/:runId/chunks")
  @RequirePolicy({ resourceType: "retrieved_chunk", action: "read", resourceIdParam: "runId" })
  @ApiOperation({ summary: "List a retrieval run's ranked results." })
  @ApiOkResponse({ description: "Retrieved chunks." })
  async listRetrievedChunks(@Req() request: Request, @Param("runId") runId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listRetrievedChunks(context.tenantId, runId, toPagination(query));
  }

  @Post("question-generations/:generationRunId/citations")
  @RequirePolicy({ resourceType: "generation_citation", action: "write", resourceIdParam: "generationRunId" })
  @ApiOperation({ summary: "Record an output-source citation for a generation run." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Generation citation recorded." })
  async createGenerationCitation(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("generationRunId") generationRunId: string,
    @Body() body: CreateGenerationCitationDto
  ) {
    const context = readRequestContext(request);
    return this.service.createGenerationCitation({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      generationRunId,
      ...body
    });
  }

  @Get("question-generations/:generationRunId/citations")
  @RequirePolicy({ resourceType: "generation_citation", action: "read", resourceIdParam: "generationRunId" })
  @ApiOperation({ summary: "List a generation run's output-source citations." })
  @ApiOkResponse({ description: "Generation citations." })
  async listGenerationCitations(@Req() request: Request, @Param("generationRunId") generationRunId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listGenerationCitations(context.tenantId, generationRunId, toPagination(query));
  }

  @Post("question-generations/:generationRunId/safety-checks")
  @RequirePolicy({ resourceType: "safety_check", action: "write", resourceIdParam: "generationRunId" })
  @ApiOperation({ summary: "Record a policy/safety check result for a generation run." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Safety check recorded." })
  async createSafetyCheck(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("generationRunId") generationRunId: string,
    @Body() body: CreateSafetyCheckDto
  ) {
    const context = readRequestContext(request);
    return this.service.createSafetyCheck({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      generationRunId,
      ...body
    });
  }

  @Get("question-generations/:generationRunId/safety-checks")
  @RequirePolicy({ resourceType: "safety_check", action: "read", resourceIdParam: "generationRunId" })
  @ApiOperation({ summary: "List a generation run's safety check results." })
  @ApiOkResponse({ description: "Safety checks." })
  async listSafetyChecks(@Req() request: Request, @Param("generationRunId") generationRunId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listSafetyChecks(context.tenantId, generationRunId, toPagination(query));
  }

  @Post("evaluation-suites")
  @RequirePolicy({ resourceType: "evaluation_suite", action: "write" })
  @ApiOperation({ summary: "Create an evaluation suite." })
  @ApiCreatedResponse({ description: "Evaluation suite created." })
  async createEvaluationSuite(@Req() request: Request, @Body() body: CreateEvaluationSuiteDto) {
    const context = readRequestContext(request);
    return this.service.createEvaluationSuite({
      tenantId: context.tenantId,
      actorId: context.userId,
      ...body
    });
  }

  @Get("evaluation-suites")
  @RequirePolicy({ resourceType: "evaluation_suite", action: "read" })
  @ApiOperation({ summary: "List evaluation suites." })
  @ApiOkResponse({ description: "Evaluation suites." })
  async listEvaluationSuites(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listEvaluationSuites(context.tenantId, toPagination(query));
  }

  @Get("evaluation-suites/:suiteId")
  @RequirePolicy({ resourceType: "evaluation_suite", action: "read", resourceIdParam: "suiteId" })
  @ApiOperation({ summary: "Fetch an evaluation suite." })
  @ApiOkResponse({ description: "Evaluation suite." })
  async getEvaluationSuite(@Req() request: Request, @Param("suiteId") suiteId: string) {
    const context = readRequestContext(request);
    return this.service.getEvaluationSuite(context.tenantId, suiteId);
  }

  @Post("evaluation-suites/:suiteId/cases")
  @RequirePolicy({ resourceType: "evaluation_case", action: "write", resourceIdParam: "suiteId" })
  @ApiOperation({ summary: "Add a golden/adversarial case to an evaluation suite." })
  @ApiCreatedResponse({ description: "Evaluation case created." })
  async createEvaluationCase(@Req() request: Request, @Param("suiteId") suiteId: string, @Body() body: CreateEvaluationCaseDto) {
    const context = readRequestContext(request);
    return this.service.createEvaluationCase({
      tenantId: context.tenantId,
      actorId: context.userId,
      suiteId,
      ...body
    });
  }

  @Get("evaluation-suites/:suiteId/cases")
  @RequirePolicy({ resourceType: "evaluation_case", action: "read", resourceIdParam: "suiteId" })
  @ApiOperation({ summary: "List an evaluation suite's cases." })
  @ApiOkResponse({ description: "Evaluation cases." })
  async listEvaluationCases(@Req() request: Request, @Param("suiteId") suiteId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listEvaluationCases(context.tenantId, suiteId, toPagination(query));
  }

  @Post("evaluation-suites/:suiteId/results")
  @RequirePolicy({ resourceType: "evaluation_result", action: "write", resourceIdParam: "suiteId" })
  @ApiOperation({ summary: "Record a per-case/metric evaluation result." })
  @ApiCreatedResponse({ description: "Evaluation result created." })
  async createEvaluationResult(@Req() request: Request, @Param("suiteId") suiteId: string, @Body() body: CreateEvaluationResultDto) {
    const context = readRequestContext(request);
    return this.service.createEvaluationResult({
      tenantId: context.tenantId,
      actorId: context.userId,
      suiteId,
      ...body
    });
  }

  @Get("evaluation-suites/:suiteId/results")
  @RequirePolicy({ resourceType: "evaluation_result", action: "read", resourceIdParam: "suiteId" })
  @ApiOperation({ summary: "List an evaluation suite's results." })
  @ApiOkResponse({ description: "Evaluation results." })
  async listEvaluationResults(@Req() request: Request, @Param("suiteId") suiteId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listEvaluationResults(context.tenantId, suiteId, toPagination(query));
  }
}

function requiredIdempotencyKey(value: string | undefined): string {
  if (!value?.trim()) {
    throw new BadRequestException("Idempotency-Key header is required.");
  }
  return value;
}
