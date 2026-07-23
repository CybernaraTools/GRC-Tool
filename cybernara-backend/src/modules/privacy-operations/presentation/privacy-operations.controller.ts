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
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested
} from "class-validator";
import type { Request } from "express";
import { PolicyGuard, RequirePolicy } from "../../platform-hardening/public.js";
import { PaginationQueryDto, toPagination } from "../../../shared/pagination.dto.js";
import { readRequestContext } from "../../../shared/request-context.js";
import { PrivacyOperationsService } from "../application/privacy-operations.service.js";
import type { DpiaRiskLevel, IncidentSeverity, PrivacyClassification, RightsRequest } from "../domain/privacy.js";

const privacyClassifications = ["internal", "confidential", "restricted"] as const;

class InventoryDto {
  @IsString()
  @IsNotEmpty()
  systemName!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  dataElements!: string[];

  @IsUUID()
  ownerId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  locations!: string[];

  @IsIn(privacyClassifications)
  classification!: PrivacyClassification;

  @IsArray()
  @IsString({ each: true })
  lineage!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  processingActivityIds!: string[];

  @IsArray()
  @IsString({ each: true })
  controlIds!: string[];

  @IsArray()
  @IsUUID(undefined, { each: true })
  vendorIds!: string[];

  @IsArray()
  @IsUUID(undefined, { each: true })
  evidenceIds!: string[];
}

class ProcessingActivityDto {
  @IsString()
  @IsNotEmpty()
  purpose!: string;

  @IsString()
  @IsNotEmpty()
  lawfulBasis!: string;

  @IsArray()
  @IsString({ each: true })
  dataSubjectCategories!: string[];

  @IsArray()
  @IsString({ each: true })
  recipients!: string[];

  @IsArray()
  @IsString({ each: true })
  transfers!: string[];

  @IsInt()
  @Min(1)
  retentionMonths!: number;

  @IsString()
  @IsNotEmpty()
  jurisdiction!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  inventoryRecordIds!: string[];
}

class DpiaApprovalDto {
  @IsUUID()
  actorId!: string;

  @IsString()
  @IsNotEmpty()
  role!: string;

  @IsDateString()
  approvedAt!: string;
}

class DpiaDto {
  @IsUUID()
  processingActivityId!: string;

  @IsIn(["low", "medium", "high"])
  riskLevel!: DpiaRiskLevel;

  @IsInt()
  @Min(0)
  @Max(100)
  residualRiskScore!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DpiaApprovalDto)
  approvals!: DpiaApprovalDto[];

  @IsArray()
  @IsString({ each: true })
  findings!: string[];
}

class RightsRequestDto {
  @IsString()
  @IsNotEmpty()
  subjectId!: string;

  @IsIn(["access", "delete", "correct", "export", "restrict"])
  requestType!: RightsRequest["requestType"];

  @IsDateString()
  openedAt!: string;

  @IsInt()
  @Min(1)
  slaDays!: number;
}

class RightsSearchTaskDto {
  @IsString()
  @IsNotEmpty()
  systemName!: string;

  @IsUUID()
  ownerId!: string;
}

class RightsCommunicationDto {
  @IsString()
  @IsNotEmpty()
  channel!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsDateString()
  sentAt!: string;
}

class CompleteRightsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  completionEvidenceIds!: string[];

  @ValidateNested()
  @Type(() => RightsCommunicationDto)
  communication!: RightsCommunicationDto;
}

class GrantConsentDto {
  @IsString()
  @IsNotEmpty()
  subjectId!: string;

  @IsString()
  @IsNotEmpty()
  purpose!: string;

  @IsString()
  @IsNotEmpty()
  version!: string;

  @IsString()
  @IsNotEmpty()
  region!: string;
}

class WithdrawConsentDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

class IncidentDto {
  @IsIn(["low", "medium", "high", "critical"])
  severity!: IncidentSeverity;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  impactedProcessingActivityIds!: string[];

  @IsArray()
  @IsUUID(undefined, { each: true })
  evidenceIds!: string[];

  @IsArray()
  @IsUUID(undefined, { each: true })
  reportIds!: string[];

  @IsDateString()
  discoveredAt!: string;
}

class RetentionScheduleDto {
  @IsString()
  @IsNotEmpty()
  dataCategory!: string;

  @IsString()
  @IsNotEmpty()
  jurisdiction!: string;

  @IsString()
  @IsNotEmpty()
  residency!: string;

  @IsString()
  @IsNotEmpty()
  transferMechanism!: string;

  @IsInt()
  @Min(1)
  retentionMonths!: number;

  @IsBoolean()
  legalHold!: boolean;

  @IsArray()
  @IsUUID(undefined, { each: true })
  disposalEvidenceIds!: string[];
}

class RetentionEvaluationQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageMonths!: number;
}

@ApiTags("PrivacyOperations")
@ApiUnauthorizedResponse({ description: "Request context headers are missing or invalid." })
@ApiForbiddenResponse({ description: "Platform policy denied the request." })
@UseGuards(PolicyGuard)
@Controller("v1/privacy-operations")
export class PrivacyOperationsController {
  constructor(@Inject(PrivacyOperationsService) private readonly service: PrivacyOperationsService) {}

  @Post("inventory-records")
  @RequirePolicy({ resourceType: "data_inventory_record", action: "write" })
  @ApiOperation({ summary: "Create a data inventory record." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Data inventory record created." })
  @ApiBadRequestResponse({ description: "Invalid request body or idempotency key." })
  async createInventory(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: InventoryDto
  ) {
    const context = readRequestContext(request);
    return this.service.createInventory({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      ...body
    });
  }

  @Get("inventory-records")
  @RequirePolicy({ resourceType: "data_inventory_record", action: "read" })
  @ApiOperation({ summary: "List data inventory records." })
  @ApiOkResponse({ description: "Data inventory records." })
  async listInventory(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listInventory(context.tenantId, toPagination(query));
  }

  @Get("inventory-records/:recordId")
  @RequirePolicy({ resourceType: "data_inventory_record", action: "read", resourceIdParam: "recordId" })
  @ApiOperation({ summary: "Fetch a data inventory record." })
  @ApiOkResponse({ description: "Data inventory record." })
  async getInventory(@Req() request: Request, @Param("recordId") recordId: string) {
    const context = readRequestContext(request);
    return this.service.getInventory(context.tenantId, recordId);
  }

  @Post("processing-activities")
  @RequirePolicy({ resourceType: "processing_activity", action: "write" })
  @ApiOperation({ summary: "Create a RoPA processing activity." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Processing activity created." })
  async createProcessingActivity(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: ProcessingActivityDto
  ) {
    const context = readRequestContext(request);
    return this.service.createProcessingActivity({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      ...body
    });
  }

  @Get("processing-activities")
  @RequirePolicy({ resourceType: "processing_activity", action: "read" })
  @ApiOperation({ summary: "List RoPA processing activities." })
  @ApiOkResponse({ description: "Processing activities." })
  async listProcessingActivities(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listProcessingActivities(context.tenantId, toPagination(query));
  }

  @Get("processing-activities/:activityId")
  @RequirePolicy({ resourceType: "processing_activity", action: "read", resourceIdParam: "activityId" })
  @ApiOperation({ summary: "Fetch a RoPA processing activity." })
  @ApiOkResponse({ description: "Processing activity." })
  async getProcessingActivity(@Req() request: Request, @Param("activityId") activityId: string) {
    const context = readRequestContext(request);
    return this.service.getProcessingActivity(context.tenantId, activityId);
  }

  @Post("dpia-assessments")
  @RequirePolicy({ resourceType: "dpia_assessment", action: "write" })
  @ApiOperation({ summary: "Create a DPIA assessment." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "DPIA assessment created." })
  async createDpia(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: DpiaDto
  ) {
    const context = readRequestContext(request);
    return this.service.createDpia({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      processingActivityId: body.processingActivityId,
      riskLevel: body.riskLevel,
      residualRiskScore: body.residualRiskScore,
      approvals: body.approvals.map((approval) => ({ ...approval, approvedAt: new Date(approval.approvedAt) })),
      findings: body.findings
    });
  }

  @Get("dpia-assessments")
  @RequirePolicy({ resourceType: "dpia_assessment", action: "read" })
  @ApiOperation({ summary: "List DPIA assessments." })
  @ApiOkResponse({ description: "DPIA assessments." })
  async listDpias(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listDpias(context.tenantId, toPagination(query));
  }

  @Get("dpia-assessments/:dpiaId")
  @RequirePolicy({ resourceType: "dpia_assessment", action: "read", resourceIdParam: "dpiaId" })
  @ApiOperation({ summary: "Fetch a DPIA assessment." })
  @ApiOkResponse({ description: "DPIA assessment." })
  async getDpia(@Req() request: Request, @Param("dpiaId") dpiaId: string) {
    const context = readRequestContext(request);
    return this.service.getDpia(context.tenantId, dpiaId);
  }

  @Post("rights-requests")
  @RequirePolicy({ resourceType: "privacy_rights_request", action: "write" })
  @ApiOperation({ summary: "Open a privacy rights request." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Rights request opened." })
  async createRightsRequest(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: RightsRequestDto
  ) {
    const context = readRequestContext(request);
    return this.service.createRightsRequest({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      subjectId: body.subjectId,
      requestType: body.requestType,
      openedAt: new Date(body.openedAt),
      slaDays: body.slaDays
    });
  }

  @Get("rights-requests")
  @RequirePolicy({ resourceType: "privacy_rights_request", action: "read" })
  @ApiOperation({ summary: "List privacy rights requests." })
  @ApiOkResponse({ description: "Rights requests." })
  async listRightsRequests(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listRightsRequests(context.tenantId, toPagination(query));
  }

  @Get("rights-requests/:requestId")
  @RequirePolicy({ resourceType: "privacy_rights_request", action: "read", resourceIdParam: "requestId" })
  @ApiOperation({ summary: "Fetch a privacy rights request." })
  @ApiOkResponse({ description: "Rights request." })
  async getRightsRequest(@Req() request: Request, @Param("requestId") requestId: string) {
    const context = readRequestContext(request);
    return this.service.getRightsRequest(context.tenantId, requestId);
  }

  @Post("rights-requests/:requestId/verify-identity")
  @RequirePolicy({ resourceType: "privacy_rights_request", action: "write", resourceIdParam: "requestId" })
  @ApiOperation({ summary: "Verify identity for a rights request." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Verified rights request." })
  async verifyRightsRequest(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("requestId") requestId: string
  ) {
    const context = readRequestContext(request);
    return this.service.verifyRightsRequest({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      requestId
    });
  }

  @Post("rights-requests/:requestId/search-tasks")
  @RequirePolicy({ resourceType: "privacy_rights_request", action: "write", resourceIdParam: "requestId" })
  @ApiOperation({ summary: "Add a system search task to a verified rights request." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Rights request with added search task." })
  async addRightsSearchTask(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("requestId") requestId: string,
    @Body() body: RightsSearchTaskDto
  ) {
    const context = readRequestContext(request);
    return this.service.addRightsSearchTask({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      requestId,
      systemName: body.systemName,
      ownerId: body.ownerId
    });
  }

  @Post("rights-requests/:requestId/complete")
  @RequirePolicy({ resourceType: "privacy_rights_request", action: "write", resourceIdParam: "requestId" })
  @ApiOperation({ summary: "Complete a rights request with evidence and communication." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Completed rights request." })
  async completeRightsRequest(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("requestId") requestId: string,
    @Body() body: CompleteRightsDto
  ) {
    const context = readRequestContext(request);
    return this.service.completeRightsRequest({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      requestId,
      completionEvidenceIds: body.completionEvidenceIds,
      communication: { ...body.communication, sentAt: new Date(body.communication.sentAt) }
    });
  }

  @Post("consents")
  @RequirePolicy({ resourceType: "consent_record", action: "write" })
  @ApiOperation({ summary: "Grant consent for a subject and purpose." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Consent granted." })
  async grantConsent(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: GrantConsentDto
  ) {
    const context = readRequestContext(request);
    return this.service.grantConsent({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      ...body
    });
  }

  @Get("consents")
  @RequirePolicy({ resourceType: "consent_record", action: "read" })
  @ApiOperation({ summary: "List consent records." })
  @ApiOkResponse({ description: "Consent records." })
  async listConsents(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listConsents(context.tenantId, toPagination(query));
  }

  @Get("consents/:consentId")
  @RequirePolicy({ resourceType: "consent_record", action: "read", resourceIdParam: "consentId" })
  @ApiOperation({ summary: "Fetch a consent record." })
  @ApiOkResponse({ description: "Consent record." })
  async getConsent(@Req() request: Request, @Param("consentId") consentId: string) {
    const context = readRequestContext(request);
    return this.service.getConsent(context.tenantId, consentId);
  }

  @Post("consents/:consentId/withdraw")
  @RequirePolicy({ resourceType: "consent_record", action: "write", resourceIdParam: "consentId" })
  @ApiOperation({ summary: "Withdraw consent with a reason." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Withdrawn consent record." })
  async withdrawConsent(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("consentId") consentId: string,
    @Body() body: WithdrawConsentDto
  ) {
    const context = readRequestContext(request);
    return this.service.withdrawConsent({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      consentId,
      reason: body.reason
    });
  }

  @Post("incidents")
  @RequirePolicy({ resourceType: "privacy_incident", action: "write" })
  @ApiOperation({ summary: "Create a privacy incident with notification clocks." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Privacy incident created." })
  async createIncident(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: IncidentDto
  ) {
    const context = readRequestContext(request);
    return this.service.createIncident({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      severity: body.severity,
      impactedProcessingActivityIds: body.impactedProcessingActivityIds,
      evidenceIds: body.evidenceIds,
      reportIds: body.reportIds,
      discoveredAt: new Date(body.discoveredAt)
    });
  }

  @Get("incidents")
  @RequirePolicy({ resourceType: "privacy_incident", action: "read" })
  @ApiOperation({ summary: "List privacy incidents." })
  @ApiOkResponse({ description: "Privacy incidents." })
  async listIncidents(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listIncidents(context.tenantId, toPagination(query));
  }

  @Get("incidents/:incidentId")
  @RequirePolicy({ resourceType: "privacy_incident", action: "read", resourceIdParam: "incidentId" })
  @ApiOperation({ summary: "Fetch a privacy incident." })
  @ApiOkResponse({ description: "Privacy incident." })
  async getIncident(@Req() request: Request, @Param("incidentId") incidentId: string) {
    const context = readRequestContext(request);
    return this.service.getIncident(context.tenantId, incidentId);
  }

  @Post("retention-schedules")
  @RequirePolicy({ resourceType: "retention_schedule", action: "write" })
  @ApiOperation({ summary: "Create a retention schedule." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Retention schedule created." })
  async createRetentionSchedule(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: RetentionScheduleDto
  ) {
    const context = readRequestContext(request);
    return this.service.createRetentionSchedule({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      ...body
    });
  }

  @Get("retention-schedules")
  @RequirePolicy({ resourceType: "retention_schedule", action: "read" })
  @ApiOperation({ summary: "List retention schedules." })
  @ApiOkResponse({ description: "Retention schedules." })
  async listRetentionSchedules(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listRetentionSchedules(context.tenantId, toPagination(query));
  }

  @Get("retention-schedules/:scheduleId")
  @RequirePolicy({ resourceType: "retention_schedule", action: "read", resourceIdParam: "scheduleId" })
  @ApiOperation({ summary: "Fetch a retention schedule." })
  @ApiOkResponse({ description: "Retention schedule." })
  async getRetentionSchedule(@Req() request: Request, @Param("scheduleId") scheduleId: string) {
    const context = readRequestContext(request);
    return this.service.getRetentionSchedule(context.tenantId, scheduleId);
  }

  @Get("retention-schedules/:scheduleId/evaluation")
  @RequirePolicy({ resourceType: "retention_schedule", action: "read", resourceIdParam: "scheduleId" })
  @ApiOperation({ summary: "Evaluate retention or legal-hold decision for record age." })
  @ApiOkResponse({ description: "Retention decision." })
  async evaluateRetention(
    @Req() request: Request,
    @Param("scheduleId") scheduleId: string,
    @Query() query: RetentionEvaluationQueryDto
  ) {
    const context = readRequestContext(request);
    return this.service.evaluateRetention({ tenantId: context.tenantId, scheduleId, ageMonths: query.ageMonths });
  }
}

function requiredIdempotencyKey(value: string | undefined): string {
  if (!value?.trim()) {
    throw new BadRequestException("Idempotency-Key header is required.");
  }
  return value;
}
