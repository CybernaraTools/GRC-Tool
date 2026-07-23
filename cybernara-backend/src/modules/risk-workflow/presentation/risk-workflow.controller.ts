import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
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
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min
} from "class-validator";
import type { RemediationTaskReview, RiskAcceptanceReview } from "../domain/risk.js";
import type { Request } from "express";
import { PolicyGuard, RequirePolicy } from "../../platform-hardening/public.js";
import { PaginationQueryDto, toPagination } from "../../../shared/pagination.dto.js";
import { readRequestContext } from "../../../shared/request-context.js";
import { FindingAiAssistantService } from "../application/finding-ai-assistant.service.js";
import { RiskAiAssistantService } from "../application/risk-ai-assistant.service.js";
import { RiskWorkflowService } from "../application/risk-workflow.service.js";
import type {
  Finding,
  RemediationTask,
  RiskLinkRelationship,
  RiskLinkTargetType,
  RiskTreatmentStrategy
} from "../domain/risk.js";

const severities = ["low", "medium", "high", "critical"] as const;
const impacts = ["low", "medium", "high", "critical"] as const;
const likelihoods = ["rare", "unlikely", "possible", "likely", "almost_certain"] as const;
const updatableStatuses = ["open", "in_progress", "verified"] as const;
const remediationReviewDecisions = ["approved", "rejected"] as const;

class CreateFindingDto {
  // G-03 (spec §11/§12): a finding requires at least one source — an assessment item or a
  // control test result — not necessarily both. Enforced in the domain layer
  // (createFinding throws if neither is present); the DTO only constrains shape/format.
  @IsOptional()
  @IsUUID()
  assessmentItemId?: string;

  @IsOptional()
  @IsUUID()
  testResultId?: string;

  @IsIn(severities)
  severity!: Finding["severity"];

  @IsOptional()
  @IsIn(impacts)
  impact?: Finding["impact"];

  @IsOptional()
  @IsIn(likelihoods)
  likelihood?: Finding["likelihood"];

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsString()
  @IsNotEmpty()
  description!: string;
}

class FindingListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  assessmentItemId?: string;

  @IsOptional()
  @IsUUID()
  testResultId?: string;
}

class UpdateFindingDto {
  @IsIn(severities)
  severity!: Finding["severity"];

  @IsOptional()
  @IsIn(impacts)
  impact?: Finding["impact"];

  @IsOptional()
  @IsIn(likelihoods)
  likelihood?: Finding["likelihood"];

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsString()
  @IsNotEmpty()
  description!: string;
}

class AssistFindingDto {
  @IsUUID()
  assessmentItemId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(6000)
  questionText!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  responseType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(24_000)
  answerText?: string;

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  frameworkKeys!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(128)
  harmonizedControlId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  harmonizedControlName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  sourceControlId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  sourceControlTitle?: string;

  @IsArray()
  @ArrayMaxSize(80)
  @IsString({ each: true })
  evidenceExpectationIds!: string[];

  @IsArray()
  @ArrayMaxSize(120)
  @IsObject({ each: true })
  citations!: Array<{ sourceId?: unknown; sourceType?: unknown }>;

  @IsArray()
  @ArrayMaxSize(8)
  @IsUUID("4", { each: true })
  evidenceObjectIds!: string[];

  @IsOptional()
  @IsUUID()
  findingId?: string;

  @IsOptional()
  @IsString()
  findingDescription?: string;

  @IsOptional()
  @IsUUID()
  riskId?: string;

  @IsOptional()
  @IsString()
  riskStatement?: string;

  @IsOptional()
  @IsString()
  mitigationPlan?: string;

  @IsOptional()
  @IsString()
  remediationAnswer?: string;

  @IsOptional()
  @IsUUID()
  remediationTaskId?: string;

  @IsOptional()
  @IsDateString()
  remediationSubmittedAt?: string;

  @IsOptional()
  @IsDateString()
  evidencePeriodStart?: string;

  @IsOptional()
  @IsDateString()
  evidencePeriodEnd?: string;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  reviewHistory?: Array<{ decision: string; rationale: string; reviewedAt?: string }>;
}

class AssistRiskDto {
  @IsUUID()
  findingId!: string;

  @IsUUID()
  assessmentId!: string;
}

class CreateRemediationTaskDto {
  @IsUUID()
  findingId!: string;

  @IsUUID()
  ownerId!: string;

  @IsDateString()
  dueAt!: string;
}

class RemediationTaskListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  findingId?: string;
}

class UpdateRemediationTaskDto {
  @IsUUID()
  ownerId!: string;

  @IsDateString()
  dueAt!: string;

  @IsIn(updatableStatuses)
  status!: Exclude<RemediationTask["status"], "risk_accepted">;
}

class RemediationTaskReviewDto {
  @IsIn(remediationReviewDecisions)
  decision!: RemediationTaskReview["decision"];

  @IsString()
  @IsNotEmpty()
  rationale!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID("4", { each: true })
  evidenceVersionIds?: string[];
}

const reviewDecisions = ["reaffirmed", "revoked", "escalated"] as const;

class RiskAcceptanceDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsDateString()
  expiresAt!: string;

  @IsDateString()
  nextReviewDueAt!: string;

  @IsOptional()
  @IsString()
  compensatingControls?: string;

  @IsOptional()
  @IsUUID()
  riskId?: string;
}

const riskLinkTargetTypes: RiskLinkTargetType[] = [
  "finding",
  "control_instance",
  "vendor",
  "evidence_object",
  "assessment",
  "requirement_instance"
];
const riskLinkRelationships: RiskLinkRelationship[] = ["related_to", "caused_by", "mitigated_by", "threatens"];
const riskTreatmentStrategies: RiskTreatmentStrategy[] = ["accept", "mitigate", "transfer", "avoid"];

class CreateRiskModelDto {
  @IsString()
  @IsNotEmpty()
  modelKey!: string;

  @IsString()
  @IsNotEmpty()
  modelVersion!: string;

  @IsObject()
  scalesJson!: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  formula!: string;

  @IsObject()
  thresholds!: Record<string, unknown>;
}

class CreateRiskDto {
  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @IsUUID()
  riskModelId?: string;

  @IsString()
  @IsNotEmpty()
  riskKey!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  inherentScore!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  residualScore!: number;

  @IsUUID()
  ownerId!: string;
}

class CreateRiskLinkDto {
  @IsIn(riskLinkTargetTypes)
  targetType!: RiskLinkTargetType;

  @IsUUID()
  targetId!: string;

  @IsIn(riskLinkRelationships)
  relationship!: RiskLinkRelationship;
}

class CreateRiskTreatmentDto {
  @IsIn(riskTreatmentStrategies)
  strategy!: RiskTreatmentStrategy;

  @IsString()
  @IsNotEmpty()
  plan!: string;

  @IsUUID()
  ownerId!: string;

  @IsDateString()
  dueAt!: string;
}

class RiskAcceptanceReviewDto {
  @IsIn(reviewDecisions)
  decision!: RiskAcceptanceReview["decision"];

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

@ApiTags("RiskWorkflow")
@ApiUnauthorizedResponse({ description: "Request context headers are missing or invalid." })
@ApiForbiddenResponse({ description: "Platform policy denied the request." })
@UseGuards(PolicyGuard)
@Controller("v1/risk-workflow")
export class RiskWorkflowController {
  constructor(
    @Inject(RiskWorkflowService) private readonly service: RiskWorkflowService,
    @Inject(FindingAiAssistantService) private readonly findingAssistant: FindingAiAssistantService,
    @Inject(RiskAiAssistantService) private readonly riskAssistant: RiskAiAssistantService
  ) {}

  @Post("findings")
  @RequirePolicy({ resourceType: "finding", action: "write" })
  @ApiOperation({ summary: "Create a risk finding linked to an assessment item." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Finding created." })
  @ApiBadRequestResponse({ description: "Invalid request body or idempotency key." })
  async createFinding(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: CreateFindingDto
  ) {
    const context = readRequestContext(request);
    return this.service.createFinding({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      assessmentItemId: body.assessmentItemId,
      testResultId: body.testResultId,
      severity: body.severity,
      impact: body.impact,
      likelihood: body.likelihood,
      ownerId: body.ownerId,
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
      description: body.description
    });
  }

  @Get("findings")
  @RequirePolicy({ resourceType: "finding", action: "read" })
  @ApiOperation({ summary: "List risk findings." })
  @ApiOkResponse({ description: "Findings." })
  async listFindings(@Req() request: Request, @Query() query: FindingListQueryDto) {
    const context = readRequestContext(request);
    return this.service.listFindings({
      tenantId: context.tenantId,
      assessmentItemId: query.assessmentItemId,
      testResultId: query.testResultId,
      pagination: toPagination(query)
    });
  }

  @Post("findings/assist")
  @HttpCode(200)
  @RequirePolicy({ resourceType: "finding", action: "write" })
  @ApiOperation({ summary: "Generate an AI-assisted finding recommendation for a submitted assessment item." })
  @ApiOkResponse({ description: "AI-assisted finding recommendation." })
  @ApiBadRequestResponse({ description: "Invalid request body." })
  async assistFinding(@Req() request: Request, @Body() body: AssistFindingDto) {
    const context = readRequestContext(request);
    return this.findingAssistant.recommend({
      tenantId: context.tenantId,
      context: {
        assessmentItemId: body.assessmentItemId,
        questionText: body.questionText,
        responseType: body.responseType,
        answerText: body.answerText,
        frameworkKeys: body.frameworkKeys,
        harmonizedControlId: body.harmonizedControlId,
        harmonizedControlName: body.harmonizedControlName,
        sourceControlId: body.sourceControlId,
        sourceControlTitle: body.sourceControlTitle,
        evidenceExpectationIds: body.evidenceExpectationIds,
        citations: body.citations.map((citation) => ({
          sourceId: typeof citation.sourceId === "string" ? citation.sourceId : "",
          sourceType: typeof citation.sourceType === "string" ? citation.sourceType : undefined
        })),
        evidenceObjectIds: body.evidenceObjectIds,
        findingId: body.findingId,
        findingDescription: body.findingDescription,
        riskId: body.riskId,
        riskStatement: body.riskStatement,
        mitigationPlan: body.mitigationPlan,
        remediationAnswer: body.remediationAnswer,
        remediationTaskId: body.remediationTaskId,
        remediationSubmittedAt: body.remediationSubmittedAt,
        evidencePeriodStart: body.evidencePeriodStart,
        evidencePeriodEnd: body.evidencePeriodEnd,
        reviewHistory: body.reviewHistory
      }
    });
  }

  @Post("risks/assist")
  @HttpCode(200)
  @RequirePolicy({ resourceType: "risk", action: "write" })
  @ApiOperation({ summary: "Generate an AI-assisted enterprise risk proposal from a finding and assessment context." })
  @ApiOkResponse({ description: "AI-assisted risk proposal." })
  @ApiBadRequestResponse({ description: "Invalid request body." })
  async assistRisk(@Req() request: Request, @Body() body: AssistRiskDto) {
    const context = readRequestContext(request);
    return this.riskAssistant.recommend({
      tenantId: context.tenantId,
      findingId: body.findingId,
      assessmentId: body.assessmentId
    });
  }

  @Get("findings/:findingId")
  @RequirePolicy({ resourceType: "finding", action: "read", resourceIdParam: "findingId" })
  @ApiOperation({ summary: "Fetch a risk finding." })
  @ApiOkResponse({ description: "Finding." })
  async getFinding(@Req() request: Request, @Param("findingId") findingId: string) {
    const context = readRequestContext(request);
    return this.service.getFinding(context.tenantId, findingId);
  }

  @Patch("findings/:findingId")
  @RequirePolicy({ resourceType: "finding", action: "write", resourceIdParam: "findingId" })
  @ApiOperation({ summary: "Update a risk finding severity and description." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Updated finding." })
  async updateFinding(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("findingId") findingId: string,
    @Body() body: UpdateFindingDto
  ) {
    const context = readRequestContext(request);
    return this.service.updateFinding({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      findingId,
      severity: body.severity,
      impact: body.impact,
      likelihood: body.likelihood,
      ownerId: body.ownerId,
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
      description: body.description
    });
  }

  @Post("remediation-tasks")
  @RequirePolicy({ resourceType: "remediation_task", action: "write" })
  @ApiOperation({ summary: "Create a remediation task for a finding." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Remediation task created." })
  async createRemediationTask(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: CreateRemediationTaskDto
  ) {
    const context = readRequestContext(request);
    return this.service.createRemediationTask({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      findingId: body.findingId,
      ownerId: body.ownerId,
      dueAt: new Date(body.dueAt)
    });
  }

  @Get("remediation-tasks")
  @RequirePolicy({ resourceType: "remediation_task", action: "read" })
  @ApiOperation({ summary: "List remediation tasks." })
  @ApiOkResponse({ description: "Remediation tasks." })
  async listRemediationTasks(@Req() request: Request, @Query() query: RemediationTaskListQueryDto) {
    const context = readRequestContext(request);
    return this.service.listRemediationTasks({
      tenantId: context.tenantId,
      findingId: query.findingId,
      pagination: toPagination(query)
    });
  }

  @Get("remediation-tasks/:taskId")
  @RequirePolicy({ resourceType: "remediation_task", action: "read", resourceIdParam: "taskId" })
  @ApiOperation({ summary: "Fetch a remediation task." })
  @ApiOkResponse({ description: "Remediation task." })
  async getRemediationTask(@Req() request: Request, @Param("taskId") taskId: string) {
    const context = readRequestContext(request);
    return this.service.getRemediationTask(context.tenantId, taskId);
  }

  @Patch("remediation-tasks/:taskId")
  @RequirePolicy({ resourceType: "remediation_task", action: "write", resourceIdParam: "taskId" })
  @ApiOperation({ summary: "Update remediation task owner, due date, and active status." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Updated remediation task." })
  async updateRemediationTask(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("taskId") taskId: string,
    @Body() body: UpdateRemediationTaskDto
  ) {
    const context = readRequestContext(request);
    return this.service.updateRemediationTask({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      taskId,
      ownerId: body.ownerId,
      dueAt: new Date(body.dueAt),
      status: body.status
    });
  }

  @Get("remediation-tasks/:taskId/reviews")
  @RequirePolicy({ resourceType: "remediation_task", action: "read", resourceIdParam: "taskId" })
  @ApiOperation({ summary: "List remediation task approval and rejection decisions." })
  @ApiOkResponse({ description: "Remediation task reviews." })
  async listRemediationTaskReviews(
    @Req() request: Request,
    @Param("taskId") taskId: string,
    @Query() query: PaginationQueryDto
  ) {
    const context = readRequestContext(request);
    return this.service.listRemediationTaskReviews(context.tenantId, taskId, toPagination(query));
  }

  @Post("remediation-tasks/:taskId/reviews")
  @RequirePolicy({ resourceType: "remediation_task", action: "write", resourceIdParam: "taskId" })
  @ApiOperation({ summary: "Approve or reject submitted remediation work with a reviewer rationale." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Remediation task review recorded." })
  async reviewRemediationTask(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("taskId") taskId: string,
    @Body() body: RemediationTaskReviewDto
  ) {
    const context = readRequestContext(request);
    return this.service.reviewRemediationTask({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      taskId,
      decision: body.decision,
      rationale: body.rationale,
      evidenceVersionIds: body.evidenceVersionIds
    });
  }

  @Post("remediation-tasks/:taskId/risk-acceptance")
  @RequirePolicy({ resourceType: "remediation_task", action: "write", resourceIdParam: "taskId" })
  @ApiOperation({ summary: "Accept the risk for a remediation task with a required reason, expiry, and review schedule." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Risk accepted remediation task." })
  async acceptRisk(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("taskId") taskId: string,
    @Body() body: RiskAcceptanceDto
  ) {
    const context = readRequestContext(request);
    return this.service.acceptRisk({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      taskId,
      riskId: body.riskId,
      reason: body.reason,
      expiresAt: new Date(body.expiresAt),
      nextReviewDueAt: new Date(body.nextReviewDueAt),
      compensatingControls: body.compensatingControls
    });
  }

  @Get("remediation-tasks/:taskId/risk-acceptance")
  @RequirePolicy({ resourceType: "remediation_task", action: "read", resourceIdParam: "taskId" })
  @ApiOperation({ summary: "Fetch the current risk acceptance for a remediation task, including whether it is still active." })
  @ApiOkResponse({ description: "Risk acceptance." })
  async getRiskAcceptance(@Req() request: Request, @Param("taskId") taskId: string) {
    const context = readRequestContext(request);
    return this.service.getRiskAcceptanceForTask(context.tenantId, taskId);
  }

  @Post("remediation-tasks/:taskId/risk-acceptance/reviews")
  @RequirePolicy({ resourceType: "remediation_task", action: "write", resourceIdParam: "taskId" })
  @ApiOperation({ summary: "Record a periodic review decision against a remediation task's active risk acceptance." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Recorded review." })
  async reviewRiskAcceptance(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("taskId") taskId: string,
    @Body() body: RiskAcceptanceReviewDto
  ) {
    const context = readRequestContext(request);
    return this.service.reviewRiskAcceptance({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      taskId,
      decision: body.decision,
      reason: body.reason
    });
  }

  @Post("risk-models")
  @RequirePolicy({ resourceType: "risk_model", action: "write" })
  @ApiOperation({ summary: "Create a versioned risk scoring model." })
  @ApiCreatedResponse({ description: "Risk model created." })
  async createRiskModel(@Req() request: Request, @Body() body: CreateRiskModelDto) {
    const context = readRequestContext(request);
    return this.service.createRiskModel({
      tenantId: context.tenantId,
      actorId: context.userId,
      modelKey: body.modelKey,
      modelVersion: body.modelVersion,
      scalesJson: body.scalesJson,
      formula: body.formula,
      thresholds: body.thresholds
    });
  }

  @Get("risk-models")
  @RequirePolicy({ resourceType: "risk_model", action: "read" })
  @ApiOperation({ summary: "List risk scoring models." })
  @ApiOkResponse({ description: "Risk models." })
  async listRiskModels(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listRiskModels(context.tenantId, toPagination(query));
  }

  @Post("risks")
  @RequirePolicy({ resourceType: "risk", action: "write" })
  @ApiOperation({ summary: "Register an enterprise risk (G-09)." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Risk created." })
  async createRisk(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: CreateRiskDto
  ) {
    const context = readRequestContext(request);
    return this.service.createRisk({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      workspaceId: body.workspaceId,
      riskModelId: body.riskModelId,
      riskKey: body.riskKey,
      title: body.title,
      category: body.category,
      inherentScore: body.inherentScore,
      residualScore: body.residualScore,
      ownerId: body.ownerId
    });
  }

  @Get("risks")
  @RequirePolicy({ resourceType: "risk", action: "read" })
  @ApiOperation({ summary: "List enterprise risks." })
  @ApiOkResponse({ description: "Risks." })
  async listRisks(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listRisks(context.tenantId, toPagination(query));
  }

  @Get("risks/:riskId")
  @RequirePolicy({ resourceType: "risk", action: "read", resourceIdParam: "riskId" })
  @ApiOperation({ summary: "Fetch an enterprise risk." })
  @ApiOkResponse({ description: "Risk." })
  async getRisk(@Req() request: Request, @Param("riskId") riskId: string) {
    const context = readRequestContext(request);
    return this.service.getRisk(context.tenantId, riskId);
  }

  @Post("risks/:riskId/links")
  @RequirePolicy({ resourceType: "risk", action: "write", resourceIdParam: "riskId" })
  @ApiOperation({ summary: "Link a risk to a domain object (finding, control instance, vendor, etc.)." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Risk link created." })
  async createRiskLink(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("riskId") riskId: string,
    @Body() body: CreateRiskLinkDto
  ) {
    const context = readRequestContext(request);
    return this.service.createRiskLink({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      riskId,
      targetType: body.targetType,
      targetId: body.targetId,
      relationship: body.relationship
    });
  }

  @Get("risks/:riskId/links")
  @RequirePolicy({ resourceType: "risk", action: "read", resourceIdParam: "riskId" })
  @ApiOperation({ summary: "List a risk's domain-object links." })
  @ApiOkResponse({ description: "Risk links." })
  async listRiskLinks(@Req() request: Request, @Param("riskId") riskId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listRiskLinks(context.tenantId, riskId, toPagination(query));
  }

  @Post("risks/:riskId/treatments")
  @RequirePolicy({ resourceType: "risk", action: "write", resourceIdParam: "riskId" })
  @ApiOperation({ summary: "Create a treatment plan for a risk." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Risk treatment created." })
  async createRiskTreatment(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("riskId") riskId: string,
    @Body() body: CreateRiskTreatmentDto
  ) {
    const context = readRequestContext(request);
    return this.service.createRiskTreatment({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      riskId,
      strategy: body.strategy,
      plan: body.plan,
      ownerId: body.ownerId,
      dueAt: new Date(body.dueAt)
    });
  }

  @Get("risks/:riskId/treatments")
  @RequirePolicy({ resourceType: "risk", action: "read", resourceIdParam: "riskId" })
  @ApiOperation({ summary: "List a risk's treatment plans." })
  @ApiOkResponse({ description: "Risk treatments." })
  async listRiskTreatments(@Req() request: Request, @Param("riskId") riskId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listRiskTreatments(context.tenantId, riskId, toPagination(query));
  }
}

function requiredIdempotencyKey(value: string | undefined): string {
  if (!value?.trim()) {
    throw new BadRequestException("Idempotency-Key header is required.");
  }
  return value;
}

