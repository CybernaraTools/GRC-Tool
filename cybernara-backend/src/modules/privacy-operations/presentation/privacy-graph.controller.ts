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
import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import type { Request } from "express";
import { PolicyGuard, RequirePolicy } from "../../platform-hardening/public.js";
import { PaginationQueryDto, toPagination } from "../../../shared/pagination.dto.js";
import { readRequestContext } from "../../../shared/request-context.js";
import { PrivacyOperationsService } from "../application/privacy-operations.service.js";
import type {
  ConsentEventType,
  DataDiscoveryScanStatus,
  DataSensitivity,
  DeletionItemDisposition,
  DpiaRiskLikelihoodImpact,
  IncidentNotificationRecipientType,
  InventoryLinkRole,
  RecipientType,
  RetentionDisposition,
  RetentionTargetType,
  RightsRequestTaskType,
  TransferMechanism
} from "../domain/privacy.js";

const dataSensitivities: DataSensitivity[] = ["low", "moderate", "high", "special_category"];
const inventoryLinkRoles: InventoryLinkRole[] = ["source", "destination", "processor"];
const recipientTypes: RecipientType[] = ["controller", "processor", "sub_processor"];
const transferMechanisms: TransferMechanism[] = ["sccs", "adequacy_decision", "bcr", "derogation"];
const likelihoodImpact: DpiaRiskLikelihoodImpact[] = ["low", "medium", "high"];
const rightsTaskTypes: RightsRequestTaskType[] = ["search", "decision", "fulfillment"];
const consentEventTypes: ConsentEventType[] = ["granted", "withdrawn", "updated"];
const incidentRecipientTypes: IncidentNotificationRecipientType[] = ["regulator", "data_subject", "partner"];
const retentionDispositions: RetentionDisposition[] = ["delete", "anonymize", "archive"];
const dataDiscoveryScanStatuses: DataDiscoveryScanStatus[] = ["running", "succeeded", "failed"];
const retentionTargetTypes: RetentionTargetType[] = ["data_inventory_record", "evidence_object", "evidence_version", "rights_request", "consent_event"];
const deletionItemDispositions: DeletionItemDisposition[] = ["deleted", "anonymized", "blocked_by_hold", "not_found"];

class CreateSystemAssetDto {
  @IsOptional() @IsUUID() workspaceId?: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() assetType!: string;
  @IsUUID() ownerId!: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsIn(["low", "medium", "high", "critical"]) criticality?: "low" | "medium" | "high" | "critical";
}

class CreateDataCategoryDto {
  @IsString() @IsNotEmpty() categoryKey!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsIn(dataSensitivities) sensitivity!: DataSensitivity;
}

class CreateDataSubjectCategoryDto {
  @IsString() @IsNotEmpty() subjectKey!: string;
  @IsString() @IsNotEmpty() name!: string;
}

class CreateDataDiscoveryScanDto {
  @IsUUID() systemId!: string;
  @IsUUID() connectorId!: string;
  @IsString() @IsNotEmpty() classifierVersion!: string;
  @IsOptional() @IsIn(dataDiscoveryScanStatuses) status?: DataDiscoveryScanStatus;
}

class CreateDataDiscoveryFindingDto {
  @IsUUID() scanId!: string;
  @IsString() @IsNotEmpty() locatorHash!: string;
  @IsUUID() dataCategoryId!: string;
  @IsNumber() @Min(0) @Max(1) confidence!: number;
}

class CreatePrivacyNoticeDto {
  @IsString() @IsNotEmpty() noticeKey!: string;
  @IsString() @IsNotEmpty() audience!: string;
  @IsUUID() ownerId!: string;
}

class CreatePrivacyNoticeVersionDto {
  @IsString() @IsNotEmpty() contentUri!: string;
  @IsString() @IsNotEmpty() sha256!: string;
  @IsArray() @IsString({ each: true }) jurisdictions!: string[];
  @IsString() effectiveFrom!: string;
  @IsOptional() @IsString() effectiveTo?: string;
}

class CreateProcessingInventoryLinkDto {
  @IsUUID() inventoryRecordId!: string;
  @IsIn(inventoryLinkRoles) role!: InventoryLinkRole;
}

class CreatePurposeDto {
  @IsString() @IsNotEmpty() purposeKey!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() description?: string;
}

class CreateLawfulBasisDto {
  @IsString() @IsNotEmpty() jurisdiction!: string;
  @IsString() @IsNotEmpty() basisKey!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() citation?: string;
}

class CreateProcessingPurposeAssignmentDto {
  @IsUUID() purposeId!: string;
  @IsUUID() lawfulBasisId!: string;
}

class CreateRecipientDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsIn(recipientTypes) recipientType!: RecipientType;
  @IsString() @IsNotEmpty() country!: string;
  @IsOptional() @IsUUID() vendorId?: string;
}

class CreateProcessingRecipientLinkDto {
  @IsUUID() recipientId!: string;
  @IsUUID() purposeId!: string;
  @IsOptional() @IsArray() @IsUUID(undefined, { each: true }) dataCategoryIds?: string[];
}

class CreateTransferDto {
  @IsString() @IsNotEmpty() fromCountry!: string;
  @IsString() @IsNotEmpty() toCountry!: string;
  @IsIn(transferMechanisms) mechanism!: TransferMechanism;
  @IsOptional() @IsString() safeguards?: string;
}

class CreateDpiaV2Dto {
  @IsString() @IsNotEmpty() triggerReason!: string;
  @IsUUID() ownerId!: string;
}

class CreateDpiaRiskDto {
  @IsString() @IsNotEmpty() description!: string;
  @IsIn(likelihoodImpact) likelihood!: DpiaRiskLikelihoodImpact;
  @IsIn(likelihoodImpact) impact!: DpiaRiskLikelihoodImpact;
  @IsOptional() @IsString() treatment?: string;
  @IsNumber() @Min(0) @Max(100) residualScore!: number;
}

class CreateRightsRequestTaskDto {
  @IsUUID() systemId!: string;
  @IsUUID() ownerId!: string;
  @IsIn(rightsTaskTypes) taskType!: RightsRequestTaskType;
}

class CreateConsentPurposeVersionDto {
  @IsUUID() purposeId!: string;
  @IsUUID() noticeVersionId!: string;
  @IsString() @IsNotEmpty() channel!: string;
  @IsString() @IsNotEmpty() region!: string;
}

class CreateConsentEventDto {
  @IsString() @IsNotEmpty() subjectToken!: string;
  @IsUUID() consentPurposeId!: string;
  @IsIn(consentEventTypes) eventType!: ConsentEventType;
  @IsString() @IsNotEmpty() source!: string;
  @IsString() @IsNotEmpty() proofHash!: string;
}

class CreateIncidentAssessmentDto {
  @IsString() @IsNotEmpty() jurisdiction!: string;
  @IsBoolean() reportable!: boolean;
  @IsString() @IsNotEmpty() rationale!: string;
}

class CreateIncidentNotificationDto {
  @IsIn(incidentRecipientTypes) recipientType!: IncidentNotificationRecipientType;
  @IsString() @IsNotEmpty() jurisdiction!: string;
  @IsString() dueAt!: string;
}

class CreateRetentionRuleDto {
  @IsUUID() dataCategoryId!: string;
  @IsString() @IsNotEmpty() jurisdiction!: string;
  @IsString() @IsNotEmpty() retentionTrigger!: string;
  @IsNumber() @Min(1) durationDays!: number;
  @IsIn(retentionDispositions) disposition!: RetentionDisposition;
}

class CreateRetentionAssignmentDto {
  @IsUUID() retentionRuleId!: string;
  @IsIn(retentionTargetTypes) targetType!: RetentionTargetType;
  @IsUUID() targetId!: string;
}

class CreateLegalHoldDto {
  @IsString() @IsNotEmpty() holdKey!: string;
  @IsString() @IsNotEmpty() reason!: string;
}

class CreateLegalHoldItemDto {
  @IsIn(retentionTargetTypes) targetType!: RetentionTargetType;
  @IsUUID() targetId!: string;
}

class CreateDeletionJobDto {
  @IsString() @IsNotEmpty() deletionTrigger!: string;
}

class CreateDeletionItemDto {
  @IsIn(retentionTargetTypes) targetType!: RetentionTargetType;
  @IsUUID() targetId!: string;
  @IsOptional() @IsIn(deletionItemDispositions) requestedDisposition?: DeletionItemDisposition;
  @IsOptional() @IsBoolean() keyDestroyed?: boolean;
  @IsOptional() @IsString() proofHash?: string;
}

@ApiTags("PrivacyOperations")
@ApiUnauthorizedResponse({ description: "Request context headers are missing or invalid." })
@ApiForbiddenResponse({ description: "Platform policy denied the request." })
@UseGuards(PolicyGuard)
@Controller("v1/privacy")
export class PrivacyGraphController {
  constructor(@Inject(PrivacyOperationsService) private readonly service: PrivacyOperationsService) {}

  @Post("systems-assets")
  @RequirePolicy({ resourceType: "systems_asset", action: "write" })
  @ApiOperation({ summary: "Register a system/asset in the processing inventory." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "System asset created." })
  @ApiBadRequestResponse({ description: "Invalid request body or idempotency key." })
  async createSystemAsset(@Req() request: Request, @Headers("idempotency-key") idempotencyKey: string | undefined, @Body() body: CreateSystemAssetDto) {
    const context = readRequestContext(request);
    return this.service.createSystemAsset({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      workspaceId: body.workspaceId,
      name: body.name,
      assetType: body.assetType,
      ownerId: body.ownerId,
      region: body.region,
      criticality: body.criticality
    });
  }

  @Get("systems-assets")
  @RequirePolicy({ resourceType: "systems_asset", action: "read" })
  @ApiOperation({ summary: "List systems/assets." })
  @ApiOkResponse({ description: "System assets." })
  async listSystemAssets(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listSystemAssets(context.tenantId, toPagination(query));
  }

  @Post("data-categories")
  @RequirePolicy({ resourceType: "data_category", action: "write" })
  @ApiOperation({ summary: "Define a personal/sensitive data category." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Data category created." })
  async createDataCategory(@Req() request: Request, @Headers("idempotency-key") idempotencyKey: string | undefined, @Body() body: CreateDataCategoryDto) {
    const context = readRequestContext(request);
    return this.service.createDataCategory({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      categoryKey: body.categoryKey,
      name: body.name,
      sensitivity: body.sensitivity
    });
  }

  @Get("data-categories")
  @RequirePolicy({ resourceType: "data_category", action: "read" })
  @ApiOperation({ summary: "List data categories." })
  @ApiOkResponse({ description: "Data categories." })
  async listDataCategories(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listDataCategories(context.tenantId, toPagination(query));
  }

  @Post("data-subject-categories")
  @RequirePolicy({ resourceType: "data_subject_category", action: "write" })
  @ApiOperation({ summary: "Define a data subject taxonomy category." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Data subject category created." })
  async createDataSubjectCategory(@Req() request: Request, @Headers("idempotency-key") idempotencyKey: string | undefined, @Body() body: CreateDataSubjectCategoryDto) {
    const context = readRequestContext(request);
    return this.service.createDataSubjectCategory({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      subjectKey: body.subjectKey,
      name: body.name
    });
  }

  @Get("data-subject-categories")
  @RequirePolicy({ resourceType: "data_subject_category", action: "read" })
  @ApiOperation({ summary: "List data subject categories." })
  @ApiOkResponse({ description: "Data subject categories." })
  async listDataSubjectCategories(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listDataSubjectCategories(context.tenantId, toPagination(query));
  }

  @Post("systems-assets/:systemId/discovery-scans")
  @RequirePolicy({ resourceType: "data_discovery_scan", action: "write" })
  @ApiOperation({ summary: "Record a data-discovery/classification scan run for a system." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Data discovery scan created." })
  async createDataDiscoveryScan(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("systemId") systemId: string,
    @Body() body: CreateDataDiscoveryScanDto
  ) {
    const context = readRequestContext(request);
    return this.service.createDataDiscoveryScan({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      systemId,
      connectorId: body.connectorId,
      classifierVersion: body.classifierVersion,
      status: body.status
    });
  }

  @Get("systems-assets/:systemId/discovery-scans")
  @RequirePolicy({ resourceType: "data_discovery_scan", action: "read" })
  @ApiOperation({ summary: "List data-discovery scans for a system." })
  @ApiOkResponse({ description: "Data discovery scans." })
  async listDataDiscoveryScans(@Req() request: Request, @Param("systemId") systemId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listDataDiscoveryScans(context.tenantId, systemId, toPagination(query));
  }

  @Post("discovery-scans/:scanId/findings")
  @RequirePolicy({ resourceType: "data_discovery_finding", action: "write" })
  @ApiOperation({ summary: "Record a discovered-data-location finding for a scan." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Data discovery finding created." })
  async createDataDiscoveryFinding(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("scanId") scanId: string,
    @Body() body: CreateDataDiscoveryFindingDto
  ) {
    const context = readRequestContext(request);
    return this.service.createDataDiscoveryFinding({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      scanId,
      locatorHash: body.locatorHash,
      dataCategoryId: body.dataCategoryId,
      confidence: body.confidence
    });
  }

  @Get("discovery-scans/:scanId/findings")
  @RequirePolicy({ resourceType: "data_discovery_finding", action: "read" })
  @ApiOperation({ summary: "List discovered-data-location findings for a scan." })
  @ApiOkResponse({ description: "Data discovery findings." })
  async listDataDiscoveryFindings(@Req() request: Request, @Param("scanId") scanId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listDataDiscoveryFindings(context.tenantId, scanId, toPagination(query));
  }

  @Post("notices")
  @RequirePolicy({ resourceType: "privacy_notice", action: "write" })
  @ApiOperation({ summary: "Create a privacy notice identity." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Privacy notice created." })
  async createPrivacyNotice(@Req() request: Request, @Headers("idempotency-key") idempotencyKey: string | undefined, @Body() body: CreatePrivacyNoticeDto) {
    const context = readRequestContext(request);
    return this.service.createPrivacyNotice({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      noticeKey: body.noticeKey,
      audience: body.audience,
      ownerId: body.ownerId
    });
  }

  @Get("notices")
  @RequirePolicy({ resourceType: "privacy_notice", action: "read" })
  @ApiOperation({ summary: "List privacy notices." })
  @ApiOkResponse({ description: "Privacy notices." })
  async listPrivacyNotices(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listPrivacyNotices(context.tenantId, toPagination(query));
  }

  @Get("notices/:noticeId")
  @RequirePolicy({ resourceType: "privacy_notice", action: "read", resourceIdParam: "noticeId" })
  @ApiOperation({ summary: "Fetch a privacy notice." })
  @ApiOkResponse({ description: "Privacy notice." })
  async getPrivacyNotice(@Req() request: Request, @Param("noticeId") noticeId: string) {
    const context = readRequestContext(request);
    return this.service.getPrivacyNotice(context.tenantId, noticeId);
  }

  @Post("notices/:noticeId/versions")
  @RequirePolicy({ resourceType: "privacy_notice_version", action: "write" })
  @ApiOperation({ summary: "Publish an immutable version of a privacy notice." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Privacy notice version created." })
  async createPrivacyNoticeVersion(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("noticeId") noticeId: string,
    @Body() body: CreatePrivacyNoticeVersionDto
  ) {
    const context = readRequestContext(request);
    return this.service.createPrivacyNoticeVersion({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      privacyNoticeId: noticeId,
      contentUri: body.contentUri,
      sha256: body.sha256,
      jurisdictions: body.jurisdictions,
      effectiveFrom: new Date(body.effectiveFrom),
      effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : undefined
    });
  }

  @Get("notices/:noticeId/versions")
  @RequirePolicy({ resourceType: "privacy_notice_version", action: "read" })
  @ApiOperation({ summary: "List versions of a privacy notice." })
  @ApiOkResponse({ description: "Privacy notice versions." })
  async listPrivacyNoticeVersions(@Req() request: Request, @Param("noticeId") noticeId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listPrivacyNoticeVersions(context.tenantId, noticeId, toPagination(query));
  }

  @Post("processing-activities/:activityId/inventory-links")
  @RequirePolicy({ resourceType: "processing_inventory_link", action: "write" })
  @ApiOperation({ summary: "Link a processing activity to a data inventory record." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Processing inventory link created." })
  async createProcessingInventoryLink(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("activityId") activityId: string,
    @Body() body: CreateProcessingInventoryLinkDto
  ) {
    const context = readRequestContext(request);
    return this.service.createProcessingInventoryLink({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      processingActivityId: activityId,
      inventoryRecordId: body.inventoryRecordId,
      role: body.role
    });
  }

  @Get("processing-activities/:activityId/inventory-links")
  @RequirePolicy({ resourceType: "processing_inventory_link", action: "read" })
  @ApiOperation({ summary: "List inventory links for a processing activity." })
  @ApiOkResponse({ description: "Processing inventory links." })
  async listProcessingInventoryLinks(@Req() request: Request, @Param("activityId") activityId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listProcessingInventoryLinks(context.tenantId, activityId, toPagination(query));
  }

  @Post("purposes")
  @RequirePolicy({ resourceType: "purpose", action: "write" })
  @ApiOperation({ summary: "Define a processing purpose." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Purpose created." })
  async createPurpose(@Req() request: Request, @Headers("idempotency-key") idempotencyKey: string | undefined, @Body() body: CreatePurposeDto) {
    const context = readRequestContext(request);
    return this.service.createPurpose({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      purposeKey: body.purposeKey,
      name: body.name,
      description: body.description
    });
  }

  @Get("purposes")
  @RequirePolicy({ resourceType: "purpose", action: "read" })
  @ApiOperation({ summary: "List processing purposes." })
  @ApiOkResponse({ description: "Purposes." })
  async listPurposes(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listPurposes(context.tenantId, toPagination(query));
  }

  @Post("lawful-bases")
  @RequirePolicy({ resourceType: "lawful_basis", action: "write" })
  @ApiOperation({ summary: "Define a jurisdiction lawful basis." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Lawful basis created." })
  async createLawfulBasis(@Req() request: Request, @Headers("idempotency-key") idempotencyKey: string | undefined, @Body() body: CreateLawfulBasisDto) {
    const context = readRequestContext(request);
    return this.service.createLawfulBasis({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      jurisdiction: body.jurisdiction,
      basisKey: body.basisKey,
      name: body.name,
      citation: body.citation
    });
  }

  @Get("lawful-bases")
  @RequirePolicy({ resourceType: "lawful_basis", action: "read" })
  @ApiOperation({ summary: "List lawful bases." })
  @ApiOkResponse({ description: "Lawful bases." })
  async listLawfulBases(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listLawfulBases(context.tenantId, toPagination(query));
  }

  @Post("processing-activities/:activityId/purposes")
  @RequirePolicy({ resourceType: "processing_purpose_assignment", action: "write" })
  @ApiOperation({ summary: "Assign a purpose and lawful basis to a processing activity, effective-dated." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Processing purpose assignment created." })
  async createProcessingPurposeAssignment(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("activityId") activityId: string,
    @Body() body: CreateProcessingPurposeAssignmentDto
  ) {
    const context = readRequestContext(request);
    return this.service.createProcessingPurposeAssignment({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      processingActivityId: activityId,
      purposeId: body.purposeId,
      lawfulBasisId: body.lawfulBasisId
    });
  }

  @Get("processing-activities/:activityId/purposes")
  @RequirePolicy({ resourceType: "processing_purpose_assignment", action: "read" })
  @ApiOperation({ summary: "List purpose/lawful-basis assignments for a processing activity." })
  @ApiOkResponse({ description: "Processing purpose assignments." })
  async listProcessingPurposeAssignments(@Req() request: Request, @Param("activityId") activityId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listProcessingPurposeAssignments(context.tenantId, activityId, toPagination(query));
  }

  @Post("recipients")
  @RequirePolicy({ resourceType: "recipient", action: "write" })
  @ApiOperation({ summary: "Register a recipient/controller/processor." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Recipient created." })
  async createRecipient(@Req() request: Request, @Headers("idempotency-key") idempotencyKey: string | undefined, @Body() body: CreateRecipientDto) {
    const context = readRequestContext(request);
    return this.service.createRecipient({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      name: body.name,
      recipientType: body.recipientType,
      country: body.country,
      vendorId: body.vendorId
    });
  }

  @Get("recipients")
  @RequirePolicy({ resourceType: "recipient", action: "read" })
  @ApiOperation({ summary: "List recipients." })
  @ApiOkResponse({ description: "Recipients." })
  async listRecipients(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listRecipients(context.tenantId, toPagination(query));
  }

  @Post("processing-activities/:activityId/recipients")
  @RequirePolicy({ resourceType: "processing_recipient_link", action: "write" })
  @ApiOperation({ summary: "Link a processing activity to a recipient for a given purpose." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Processing recipient link created." })
  async createProcessingRecipientLink(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("activityId") activityId: string,
    @Body() body: CreateProcessingRecipientLinkDto
  ) {
    const context = readRequestContext(request);
    return this.service.createProcessingRecipientLink({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      processingActivityId: activityId,
      recipientId: body.recipientId,
      purposeId: body.purposeId,
      dataCategoryIds: body.dataCategoryIds
    });
  }

  @Get("processing-activities/:activityId/recipients")
  @RequirePolicy({ resourceType: "processing_recipient_link", action: "read" })
  @ApiOperation({ summary: "List recipient links for a processing activity." })
  @ApiOkResponse({ description: "Processing recipient links." })
  async listProcessingRecipientLinks(@Req() request: Request, @Param("activityId") activityId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listProcessingRecipientLinks(context.tenantId, activityId, toPagination(query));
  }

  @Post("processing-activities/:activityId/transfers")
  @RequirePolicy({ resourceType: "transfer", action: "write" })
  @ApiOperation({ summary: "Record an international transfer for a processing activity." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Transfer created." })
  async createTransfer(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("activityId") activityId: string,
    @Body() body: CreateTransferDto
  ) {
    const context = readRequestContext(request);
    return this.service.createTransfer({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      processingActivityId: activityId,
      fromCountry: body.fromCountry,
      toCountry: body.toCountry,
      mechanism: body.mechanism,
      safeguards: body.safeguards
    });
  }

  @Get("processing-activities/:activityId/transfers")
  @RequirePolicy({ resourceType: "transfer", action: "read" })
  @ApiOperation({ summary: "List international transfers for a processing activity." })
  @ApiOkResponse({ description: "Transfers." })
  async listTransfers(@Req() request: Request, @Param("activityId") activityId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listTransfers(context.tenantId, activityId, toPagination(query));
  }

  @Post("processing-activities/:activityId/dpias")
  @RequirePolicy({ resourceType: "dpia", action: "write" })
  @ApiOperation({ summary: "Open a DPIA for a processing activity." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "DPIA created." })
  async createDpiaV2(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("activityId") activityId: string,
    @Body() body: CreateDpiaV2Dto
  ) {
    const context = readRequestContext(request);
    return this.service.createDpiaV2({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      processingActivityId: activityId,
      triggerReason: body.triggerReason,
      ownerId: body.ownerId
    });
  }

  @Get("dpias-v2")
  @RequirePolicy({ resourceType: "dpia", action: "read" })
  @ApiOperation({ summary: "List DPIAs." })
  @ApiOkResponse({ description: "DPIAs." })
  async listDpiasV2(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listDpiasV2(context.tenantId, toPagination(query));
  }

  @Post("dpias-v2/:dpiaId/risks")
  @RequirePolicy({ resourceType: "dpia_risk", action: "write" })
  @ApiOperation({ summary: "Record a DPIA risk finding." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "DPIA risk created." })
  async createDpiaRisk(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("dpiaId") dpiaId: string,
    @Body() body: CreateDpiaRiskDto
  ) {
    const context = readRequestContext(request);
    return this.service.createDpiaRisk({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      dpiaId,
      description: body.description,
      likelihood: body.likelihood,
      impact: body.impact,
      treatment: body.treatment,
      residualScore: body.residualScore
    });
  }

  @Get("dpias-v2/:dpiaId/risks")
  @RequirePolicy({ resourceType: "dpia_risk", action: "read" })
  @ApiOperation({ summary: "List DPIA risk findings." })
  @ApiOkResponse({ description: "DPIA risks." })
  async listDpiaRisks(@Req() request: Request, @Param("dpiaId") dpiaId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listDpiaRisks(context.tenantId, dpiaId, toPagination(query));
  }

  @Post("rights-requests/:requestId/tasks")
  @RequirePolicy({ resourceType: "rights_request_task", action: "write" })
  @ApiOperation({ summary: "Add a search/decision/fulfillment task to a rights request." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Rights request task created." })
  async createRightsRequestTask(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("requestId") requestId: string,
    @Body() body: CreateRightsRequestTaskDto
  ) {
    const context = readRequestContext(request);
    return this.service.createRightsRequestTask({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      rightsRequestId: requestId,
      systemId: body.systemId,
      ownerId: body.ownerId,
      taskType: body.taskType
    });
  }

  @Get("rights-requests/:requestId/tasks")
  @RequirePolicy({ resourceType: "rights_request_task", action: "read" })
  @ApiOperation({ summary: "List tasks for a rights request." })
  @ApiOkResponse({ description: "Rights request tasks." })
  async listRightsRequestTasks(@Req() request: Request, @Param("requestId") requestId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listRightsRequestTasks(context.tenantId, requestId, toPagination(query));
  }

  @Post("consent-purposes")
  @RequirePolicy({ resourceType: "consent_purpose_version", action: "write" })
  @ApiOperation({ summary: "Publish a versioned consent purpose (effective-dated)." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Consent purpose version created." })
  async createConsentPurposeVersion(@Req() request: Request, @Headers("idempotency-key") idempotencyKey: string | undefined, @Body() body: CreateConsentPurposeVersionDto) {
    const context = readRequestContext(request);
    return this.service.createConsentPurposeVersion({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      purposeId: body.purposeId,
      noticeVersionId: body.noticeVersionId,
      channel: body.channel,
      region: body.region
    });
  }

  @Get("consent-purposes")
  @RequirePolicy({ resourceType: "consent_purpose_version", action: "read" })
  @ApiOperation({ summary: "List versioned consent purposes." })
  @ApiOkResponse({ description: "Consent purpose versions." })
  async listConsentPurposeVersions(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listConsentPurposeVersions(context.tenantId, toPagination(query));
  }

  @Post("consent-events")
  @RequirePolicy({ resourceType: "consent_event", action: "write" })
  @ApiOperation({ summary: "Append a consent ledger event (granted/withdrawn/updated)." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Consent event recorded." })
  async createConsentEvent(@Req() request: Request, @Headers("idempotency-key") idempotencyKey: string | undefined, @Body() body: CreateConsentEventDto) {
    const context = readRequestContext(request);
    return this.service.createConsentEvent({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      subjectToken: body.subjectToken,
      consentPurposeId: body.consentPurposeId,
      eventType: body.eventType,
      source: body.source,
      proofHash: body.proofHash
    });
  }

  @Get("consent-events")
  @RequirePolicy({ resourceType: "consent_event", action: "read" })
  @ApiOperation({ summary: "List consent ledger events for a subject." })
  @ApiOkResponse({ description: "Consent events." })
  async listConsentEvents(@Req() request: Request, @Query("subjectToken") subjectToken: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listConsentEvents(context.tenantId, subjectToken, toPagination(query));
  }

  @Post("incidents/:incidentId/assessments")
  @RequirePolicy({ resourceType: "incident_assessment", action: "write" })
  @ApiOperation({ summary: "Record a breach-determination assessment for a privacy incident." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Incident assessment created." })
  async createIncidentAssessment(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("incidentId") incidentId: string,
    @Body() body: CreateIncidentAssessmentDto
  ) {
    const context = readRequestContext(request);
    return this.service.createIncidentAssessment({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      incidentId,
      jurisdiction: body.jurisdiction,
      reportable: body.reportable,
      rationale: body.rationale
    });
  }

  @Get("incidents/:incidentId/assessments")
  @RequirePolicy({ resourceType: "incident_assessment", action: "read" })
  @ApiOperation({ summary: "List breach-determination assessments for a privacy incident." })
  @ApiOkResponse({ description: "Incident assessments." })
  async listIncidentAssessments(@Req() request: Request, @Param("incidentId") incidentId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listIncidentAssessments(context.tenantId, incidentId, toPagination(query));
  }

  @Post("incidents/:incidentId/notifications")
  @RequirePolicy({ resourceType: "incident_notification", action: "write" })
  @ApiOperation({ summary: "Record a regulator/subject notification obligation for a privacy incident." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Incident notification created." })
  async createIncidentNotification(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("incidentId") incidentId: string,
    @Body() body: CreateIncidentNotificationDto
  ) {
    const context = readRequestContext(request);
    return this.service.createIncidentNotification({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      incidentId,
      recipientType: body.recipientType,
      jurisdiction: body.jurisdiction,
      dueAt: new Date(body.dueAt)
    });
  }

  @Get("incidents/:incidentId/notifications")
  @RequirePolicy({ resourceType: "incident_notification", action: "read" })
  @ApiOperation({ summary: "List notification obligations for a privacy incident." })
  @ApiOkResponse({ description: "Incident notifications." })
  async listIncidentNotifications(@Req() request: Request, @Param("incidentId") incidentId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listIncidentNotifications(context.tenantId, incidentId, toPagination(query));
  }

  @Post("retention-rules")
  @RequirePolicy({ resourceType: "retention_rule", action: "write" })
  @ApiOperation({ summary: "Define a typed retention rule for a data category." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Retention rule created." })
  async createRetentionRule(@Req() request: Request, @Headers("idempotency-key") idempotencyKey: string | undefined, @Body() body: CreateRetentionRuleDto) {
    const context = readRequestContext(request);
    return this.service.createRetentionRule({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      dataCategoryId: body.dataCategoryId,
      jurisdiction: body.jurisdiction,
      retentionTrigger: body.retentionTrigger,
      durationDays: body.durationDays,
      disposition: body.disposition
    });
  }

  @Get("retention-rules")
  @RequirePolicy({ resourceType: "retention_rule", action: "read" })
  @ApiOperation({ summary: "List retention rules." })
  @ApiOkResponse({ description: "Retention rules." })
  async listRetentionRules(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listRetentionRules(context.tenantId, toPagination(query));
  }

  @Post("retention-assignments")
  @RequirePolicy({ resourceType: "retention_assignment", action: "write" })
  @ApiOperation({ summary: "Assign a retention rule to a target object, effective-dated." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Retention assignment created." })
  async createRetentionAssignment(@Req() request: Request, @Headers("idempotency-key") idempotencyKey: string | undefined, @Body() body: CreateRetentionAssignmentDto) {
    const context = readRequestContext(request);
    return this.service.createRetentionAssignment({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      retentionRuleId: body.retentionRuleId,
      targetType: body.targetType,
      targetId: body.targetId
    });
  }

  @Get("retention-assignments")
  @RequirePolicy({ resourceType: "retention_assignment", action: "read" })
  @ApiOperation({ summary: "List retention assignments for a target object." })
  @ApiOkResponse({ description: "Retention assignments." })
  async listRetentionAssignments(
    @Req() request: Request,
    @Query("targetType") targetType: string,
    @Query("targetId") targetId: string,
    @Query() query: PaginationQueryDto
  ) {
    const context = readRequestContext(request);
    return this.service.listRetentionAssignments(context.tenantId, targetType, targetId, toPagination(query));
  }

  @Post("legal-holds")
  @RequirePolicy({ resourceType: "legal_hold", action: "write" })
  @ApiOperation({ summary: "Issue a legal hold." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Legal hold created." })
  async createLegalHold(@Req() request: Request, @Headers("idempotency-key") idempotencyKey: string | undefined, @Body() body: CreateLegalHoldDto) {
    const context = readRequestContext(request);
    return this.service.createLegalHold({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      holdKey: body.holdKey,
      reason: body.reason
    });
  }

  @Get("legal-holds")
  @RequirePolicy({ resourceType: "legal_hold", action: "read" })
  @ApiOperation({ summary: "List legal holds." })
  @ApiOkResponse({ description: "Legal holds." })
  async listLegalHolds(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listLegalHolds(context.tenantId, toPagination(query));
  }

  @Get("legal-holds/:legalHoldId")
  @RequirePolicy({ resourceType: "legal_hold", action: "read", resourceIdParam: "legalHoldId" })
  @ApiOperation({ summary: "Fetch a legal hold." })
  @ApiOkResponse({ description: "Legal hold." })
  async getLegalHold(@Req() request: Request, @Param("legalHoldId") legalHoldId: string) {
    const context = readRequestContext(request);
    return this.service.getLegalHold(context.tenantId, legalHoldId);
  }

  @Post("legal-holds/:legalHoldId/release")
  @RequirePolicy({ resourceType: "legal_hold", action: "write", resourceIdParam: "legalHoldId" })
  @ApiOperation({ summary: "Release a legal hold." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Legal hold released." })
  async releaseLegalHold(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("legalHoldId") legalHoldId: string
  ) {
    const context = readRequestContext(request);
    return this.service.releaseLegalHold({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      legalHoldId
    });
  }

  @Post("legal-holds/:legalHoldId/items")
  @RequirePolicy({ resourceType: "legal_hold_item", action: "write" })
  @ApiOperation({ summary: "Resolve a legal hold to an explicit protected target object." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Legal hold item created." })
  async createLegalHoldItem(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("legalHoldId") legalHoldId: string,
    @Body() body: CreateLegalHoldItemDto
  ) {
    const context = readRequestContext(request);
    return this.service.createLegalHoldItem({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      legalHoldId,
      targetType: body.targetType,
      targetId: body.targetId
    });
  }

  @Get("legal-holds/:legalHoldId/items")
  @RequirePolicy({ resourceType: "legal_hold_item", action: "read" })
  @ApiOperation({ summary: "List protected target objects for a legal hold." })
  @ApiOkResponse({ description: "Legal hold items." })
  async listLegalHoldItems(@Req() request: Request, @Param("legalHoldId") legalHoldId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listLegalHoldItems(context.tenantId, legalHoldId, toPagination(query));
  }

  @Post("deletion-jobs")
  @RequirePolicy({ resourceType: "deletion_job", action: "write" })
  @ApiOperation({ summary: "Start a deletion/erasure execution job." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Deletion job created." })
  async createDeletionJob(@Req() request: Request, @Headers("idempotency-key") idempotencyKey: string | undefined, @Body() body: CreateDeletionJobDto) {
    const context = readRequestContext(request);
    return this.service.createDeletionJob({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      deletionTrigger: body.deletionTrigger
    });
  }

  @Get("deletion-jobs")
  @RequirePolicy({ resourceType: "deletion_job", action: "read" })
  @ApiOperation({ summary: "List deletion jobs." })
  @ApiOkResponse({ description: "Deletion jobs." })
  async listDeletionJobs(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listDeletionJobs(context.tenantId, toPagination(query));
  }

  @Get("deletion-jobs/:deletionJobId")
  @RequirePolicy({ resourceType: "deletion_job", action: "read", resourceIdParam: "deletionJobId" })
  @ApiOperation({ summary: "Fetch a deletion job." })
  @ApiOkResponse({ description: "Deletion job." })
  async getDeletionJob(@Req() request: Request, @Param("deletionJobId") deletionJobId: string) {
    const context = readRequestContext(request);
    return this.service.getDeletionJob(context.tenantId, deletionJobId);
  }

  @Post("deletion-jobs/:deletionJobId/items")
  @RequirePolicy({ resourceType: "deletion_item", action: "write" })
  @ApiOperation({ summary: "Record a per-object deletion proof (blocked automatically by an active legal hold)." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Deletion item created." })
  async createDeletionItem(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("deletionJobId") deletionJobId: string,
    @Body() body: CreateDeletionItemDto
  ) {
    const context = readRequestContext(request);
    return this.service.createDeletionItem({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      deletionJobId,
      targetType: body.targetType,
      targetId: body.targetId,
      requestedDisposition: body.requestedDisposition,
      keyDestroyed: body.keyDestroyed,
      proofHash: body.proofHash
    });
  }

  @Get("deletion-jobs/:deletionJobId/items")
  @RequirePolicy({ resourceType: "deletion_item", action: "read" })
  @ApiOperation({ summary: "List per-object deletion proofs for a deletion job." })
  @ApiOkResponse({ description: "Deletion items." })
  async listDeletionItems(@Req() request: Request, @Param("deletionJobId") deletionJobId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listDeletionItems(context.tenantId, deletionJobId, toPagination(query));
  }
}

function requiredIdempotencyKey(value: string | undefined): string {
  if (!value?.trim()) {
    throw new BadRequestException("Idempotency-Key header is required.");
  }
  return value;
}
