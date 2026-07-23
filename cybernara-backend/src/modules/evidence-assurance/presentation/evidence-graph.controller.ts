import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
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
import { IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, Min } from "class-validator";
import type { Request } from "express";
import { PolicyGuard, RequirePolicy } from "../../platform-hardening/public.js";
import { PaginationQueryDto, toPagination } from "../../../shared/pagination.dto.js";
import { readRequestContext } from "../../../shared/request-context.js";
import { EvidenceAssuranceService } from "../application/evidence-assurance.service.js";
import type {
  AutomatedTestRunStatus,
  AutomatedTestSeverity,
  EvidenceLinkTargetType,
  EvidenceReviewDecision,
  EvidenceSampleMethod
} from "../domain/evidence.js";

const targetTypes: EvidenceLinkTargetType[] = ["control_instance", "assessment_item", "automated_test_run", "remediation_task"];
const reviewDecisions: EvidenceReviewDecision[] = ["sufficient", "insufficient", "needs_more_context"];
const severities: AutomatedTestSeverity[] = ["low", "medium", "high", "critical"];
const runStatuses: AutomatedTestRunStatus[] = ["running", "succeeded", "failed"];
const sampleMethods: EvidenceSampleMethod[] = ["random", "stratified", "judgmental", "full_population"];

class CreateEvidenceLinkDto {
  @IsIn(targetTypes)
  targetType!: EvidenceLinkTargetType;

  @IsUUID()
  targetId!: string;

  @IsString()
  @IsNotEmpty()
  purpose!: string;

  @IsOptional()
  @IsBoolean()
  scopeMatch?: boolean;

  @IsOptional()
  @IsBoolean()
  periodMatch?: boolean;
}

class CreateEvidenceRequestDto {
  @IsUUID()
  assessmentId!: string;

  @IsUUID()
  controlInstanceId!: string;

  @IsString()
  @IsNotEmpty()
  requestedFrom!: string;

  @IsString()
  @IsNotEmpty()
  dueAt!: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}

class CreateEvidenceReviewDto {
  @IsUUID()
  reviewerId!: string;

  @IsIn(reviewDecisions)
  decision!: EvidenceReviewDecision;

  @IsString()
  @IsNotEmpty()
  rationale!: string;
}

class CreateAutomatedTestDto {
  @IsUUID()
  controlId!: string;

  @IsString()
  @IsNotEmpty()
  connectorType!: string;

  @IsString()
  @IsNotEmpty()
  queryTemplate!: string;

  @IsString()
  @IsNotEmpty()
  schedule!: string;

  @IsIn(severities)
  severity!: AutomatedTestSeverity;
}

class CreateAutomatedTestRunDto {
  @IsUUID()
  connectorId!: string;

  @IsOptional()
  @IsIn(runStatuses)
  status?: AutomatedTestRunStatus;

  @IsOptional()
  @IsObject()
  resultJson?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  sourceWatermark?: string;
}

class CreateEvidenceSampleDto {
  @IsString()
  @IsNotEmpty()
  populationRef!: string;

  @IsIn(sampleMethods)
  method!: EvidenceSampleMethod;

  @IsInt()
  @Min(0)
  sampleSize!: number;

  @IsOptional()
  @IsArray()
  sampleJson?: unknown[];

  @IsOptional()
  @IsString()
  seed?: string;
}

@ApiTags("EvidenceAssurance")
@ApiUnauthorizedResponse({ description: "Request context headers are missing or invalid." })
@ApiForbiddenResponse({ description: "Platform policy denied the request." })
@UseGuards(PolicyGuard)
@Controller("v1/evidence")
export class EvidenceGraphController {
  constructor(@Inject(EvidenceAssuranceService) private readonly service: EvidenceAssuranceService) {}

  @Post("versions/:evidenceVersionId/links")
  @RequirePolicy({ resourceType: "evidence_link", action: "write" })
  @ApiOperation({ summary: "Link an evidence version to a control instance, question, or automated test run." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Evidence link created." })
  @ApiBadRequestResponse({ description: "Invalid request body or idempotency key." })
  async createLink(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("evidenceVersionId") evidenceVersionId: string,
    @Body() body: CreateEvidenceLinkDto
  ) {
    const context = readRequestContext(request);
    return this.service.createEvidenceLink({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      evidenceVersionId,
      targetType: body.targetType,
      targetId: body.targetId,
      purpose: body.purpose,
      scopeMatch: body.scopeMatch,
      periodMatch: body.periodMatch
    });
  }

  @Get("versions/:evidenceVersionId/links")
  @RequirePolicy({ resourceType: "evidence_link", action: "read" })
  @ApiOperation({ summary: "List links for an evidence version." })
  @ApiOkResponse({ description: "Evidence links." })
  async listLinks(@Req() request: Request, @Param("evidenceVersionId") evidenceVersionId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listEvidenceLinks(context.tenantId, evidenceVersionId, toPagination(query));
  }

  @Get("versions/:evidenceVersionId/malware-scans")
  @RequirePolicy({ resourceType: "malware_scan_result", action: "read" })
  @ApiOperation({ summary: "List malware scan results for an evidence version." })
  @ApiOkResponse({ description: "Malware scan results." })
  async listMalwareScans(@Req() request: Request, @Param("evidenceVersionId") evidenceVersionId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.getMalwareScanResults(context.tenantId, evidenceVersionId, toPagination(query));
  }

  @Get("versions/:evidenceVersionId/custody-events")
  @RequirePolicy({ resourceType: "evidence_custody_event", action: "read" })
  @ApiOperation({ summary: "List chain-of-custody events for an evidence version." })
  @ApiOkResponse({ description: "Evidence custody events." })
  async listCustodyEvents(@Req() request: Request, @Param("evidenceVersionId") evidenceVersionId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.getEvidenceCustodyEvents(context.tenantId, evidenceVersionId, toPagination(query));
  }

  @Post("versions/:evidenceVersionId/reviews")
  @RequirePolicy({ resourceType: "evidence_review", action: "write" })
  @ApiOperation({ summary: "Record a sufficiency review for an evidence version (reviewer must not own the evidence)." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Evidence review created." })
  @ApiBadRequestResponse({ description: "Invalid request body, idempotency key, or self-review attempt." })
  async createReview(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("evidenceVersionId") evidenceVersionId: string,
    @Body() body: CreateEvidenceReviewDto
  ) {
    const context = readRequestContext(request);
    return this.service.createEvidenceReview({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      evidenceVersionId,
      reviewerId: body.reviewerId,
      decision: body.decision,
      rationale: body.rationale
    });
  }

  @Get("versions/:evidenceVersionId/reviews")
  @RequirePolicy({ resourceType: "evidence_review", action: "read" })
  @ApiOperation({ summary: "List sufficiency reviews for an evidence version." })
  @ApiOkResponse({ description: "Evidence reviews." })
  async listReviews(@Req() request: Request, @Param("evidenceVersionId") evidenceVersionId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listEvidenceReviews(context.tenantId, evidenceVersionId, toPagination(query));
  }

  @Post("requests")
  @RequirePolicy({ resourceType: "evidence_request", action: "write" })
  @ApiOperation({ summary: "Request evidence for a control instance within an assessment." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Evidence request created." })
  async createRequest(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: CreateEvidenceRequestDto
  ) {
    const context = readRequestContext(request);
    return this.service.createEvidenceRequest({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      assessmentId: body.assessmentId,
      controlInstanceId: body.controlInstanceId,
      requestedFrom: body.requestedFrom,
      dueAt: new Date(body.dueAt),
      instructions: body.instructions
    });
  }

  @Get("requests")
  @RequirePolicy({ resourceType: "evidence_request", action: "read" })
  @ApiOperation({ summary: "List evidence requests for an assessment." })
  @ApiOkResponse({ description: "Evidence requests." })
  async listRequests(@Req() request: Request, @Query("assessmentId") assessmentId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listEvidenceRequests(context.tenantId, assessmentId, toPagination(query));
  }

  @Post("automated-tests")
  @RequirePolicy({ resourceType: "automated_test", action: "write" })
  @ApiOperation({ summary: "Define a connector-driven automated control test." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Automated test created." })
  async createAutomatedTest(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: CreateAutomatedTestDto
  ) {
    const context = readRequestContext(request);
    return this.service.createAutomatedTest({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      controlId: body.controlId,
      connectorType: body.connectorType,
      queryTemplate: body.queryTemplate,
      schedule: body.schedule,
      severity: body.severity
    });
  }

  @Get("automated-tests")
  @RequirePolicy({ resourceType: "automated_test", action: "read" })
  @ApiOperation({ summary: "List automated control test definitions." })
  @ApiOkResponse({ description: "Automated tests." })
  async listAutomatedTests(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listAutomatedTests(context.tenantId, toPagination(query));
  }

  @Get("automated-tests/:automatedTestId")
  @RequirePolicy({ resourceType: "automated_test", action: "read", resourceIdParam: "automatedTestId" })
  @ApiOperation({ summary: "Fetch an automated control test definition." })
  @ApiOkResponse({ description: "Automated test." })
  async getAutomatedTest(@Req() request: Request, @Param("automatedTestId") automatedTestId: string) {
    const context = readRequestContext(request);
    return this.service.getAutomatedTest(context.tenantId, automatedTestId);
  }

  @Post("automated-tests/:automatedTestId/runs")
  @RequirePolicy({ resourceType: "automated_test_run", action: "write", resourceIdParam: "automatedTestId" })
  @ApiOperation({ summary: "Record an automated control test execution." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Automated test run created." })
  async createAutomatedTestRun(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("automatedTestId") automatedTestId: string,
    @Body() body: CreateAutomatedTestRunDto
  ) {
    const context = readRequestContext(request);
    const key = requiredIdempotencyKey(idempotencyKey);
    return this.service.createAutomatedTestRun({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: key,
      automatedTestId,
      connectorId: body.connectorId,
      status: body.status,
      resultJson: body.resultJson,
      sourceWatermark: body.sourceWatermark
    });
  }

  @Get("automated-tests/:automatedTestId/runs")
  @RequirePolicy({ resourceType: "automated_test_run", action: "read", resourceIdParam: "automatedTestId" })
  @ApiOperation({ summary: "List executions of an automated control test." })
  @ApiOkResponse({ description: "Automated test runs." })
  async listAutomatedTestRuns(@Req() request: Request, @Param("automatedTestId") automatedTestId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listAutomatedTestRuns(context.tenantId, automatedTestId, toPagination(query));
  }

  @Post("test-results/:testResultId/samples")
  @RequirePolicy({ resourceType: "evidence_sample", action: "write" })
  @ApiOperation({ summary: "Record a sample selected from an automated test run's population." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Evidence sample created." })
  async createSample(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("testResultId") testResultId: string,
    @Body() body: CreateEvidenceSampleDto
  ) {
    const context = readRequestContext(request);
    return this.service.createEvidenceSample({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      testResultId,
      populationRef: body.populationRef,
      method: body.method,
      sampleSize: body.sampleSize,
      sampleJson: body.sampleJson,
      seed: body.seed
    });
  }

  @Get("test-results/:testResultId/samples")
  @RequirePolicy({ resourceType: "evidence_sample", action: "read" })
  @ApiOperation({ summary: "List samples selected from an automated test run's population." })
  @ApiOkResponse({ description: "Evidence samples." })
  async listSamples(@Req() request: Request, @Param("testResultId") testResultId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listEvidenceSamples(context.tenantId, testResultId, toPagination(query));
  }
}

function requiredIdempotencyKey(value: string | undefined): string {
  if (!value?.trim()) {
    throw new BadRequestException("Idempotency-Key header is required.");
  }
  return value;
}
