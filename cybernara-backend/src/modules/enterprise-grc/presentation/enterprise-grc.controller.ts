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
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
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
import { EnterpriseGrcService } from "../application/enterprise-grc.service.js";
import type {
  AccessReviewDecisionOutcome,
  AuditStatus,
  CustomFieldDataType,
  CustomObjectDefinition,
  CustomObjectDefinitionStatus,
  FindingSeverityLevel,
  PolicyAttestationDecision,
  PolicyControlCoverage,
  VendorAssessmentType,
  VendorTier
} from "../domain/grc.js";

class DraftPolicyDto {
  @IsString()
  @IsNotEmpty()
  templateKey!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  version!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
}

class PublishPolicyDto {
  @IsUUID()
  approverId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  attestationEvidenceIds!: string[];

  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}

class PolicyExceptionDto {
  @IsUUID()
  ownerId!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsDateString()
  expiresAt!: string;
}

class AccessReviewDecisionDto {
  @IsString()
  @IsNotEmpty()
  subjectId!: string;

  @IsString()
  @IsNotEmpty()
  resourceId!: string;

  @IsIn(["approved", "revoked"])
  decision!: "approved" | "revoked";

  @IsString()
  @IsNotEmpty()
  evidenceId!: string;
}

class AccessReviewDto {
  @IsString()
  @IsNotEmpty()
  populationSource!: string;

  @IsUUID()
  certifierId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AccessReviewDecisionDto)
  decisions!: AccessReviewDecisionDto[];
}

class VendorDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsIn(["low", "medium", "high", "critical"])
  tier!: VendorTier;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  systems!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  contractIds!: string[];

  @IsArray()
  @IsString({ each: true })
  controlIds!: string[];

  @IsArray()
  @IsString({ each: true })
  incidentIds!: string[];

  @IsArray()
  @IsString({ each: true })
  questionnaireIds!: string[];

  @IsArray()
  @IsString({ each: true })
  monitoringFindings!: string[];

  @IsDateString()
  renewalAt!: string;
}

class ManagementResponseDto {
  @IsUUID()
  ownerId!: string;

  @IsString()
  @IsNotEmpty()
  response!: string;

  @IsDateString()
  dueAt!: string;
}

class AuditEngagementDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsIn(["planned", "fieldwork", "management_response", "closed"])
  status!: AuditStatus;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  requestListIds!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  evidenceIds!: string[];

  @IsArray()
  @IsString({ each: true })
  findingIds!: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManagementResponseDto)
  managementResponses!: ManagementResponseDto[];
}

class TrustArtifactDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  version!: string;

  @IsBoolean()
  approved!: boolean;

  @IsIn(["public", "private"])
  visibility!: "public" | "private";

  @IsUUID()
  artifactEvidenceId!: string;

  @IsBoolean()
  ndaRequired!: boolean;

  @IsOptional()
  @IsString()
  crmAccountId?: string;
}

class TrustDownloadDto {
  @IsOptional()
  @IsDateString()
  downloadedAt?: string;
}

class WorkspaceDto {
  @IsString()
  @IsNotEmpty()
  businessUnit!: string;

  @IsOptional()
  @IsUUID()
  parentWorkspaceId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  inheritedControlIds!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  delegatedAdminIds!: string[];
}

class CustomObjectFieldDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsIn(["text", "number", "date", "boolean"])
  type!: CustomObjectDefinition["fields"][number]["type"];

  @IsBoolean()
  required!: boolean;
}

class CustomObjectDto {
  @IsString()
  @IsNotEmpty()
  objectKey!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CustomObjectFieldDto)
  fields!: CustomObjectFieldDto[];

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  workflowStates!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  permissionRoleIds!: string[];

  @IsBoolean()
  upgradeSafe!: boolean;

  @IsBoolean()
  connectorSdkEnabled!: boolean;
}

class UpdateCustomObjectStatusDto {
  @IsIn(["draft", "active", "deprecated"])
  status!: CustomObjectDefinitionStatus;

  @IsOptional()
  @IsObject()
  validationSchema?: Record<string, unknown>;
}

class CreateCustomFieldDefinitionDto {
  @IsString()
  @IsNotEmpty()
  fieldKey!: string;

  @IsIn(["text", "number", "boolean", "date", "datetime", "uuid", "json", "enum"])
  dataType!: CustomFieldDataType;

  @IsBoolean()
  required!: boolean;

  @IsOptional()
  @IsObject()
  validationJson?: Record<string, unknown>;
}

class CreateCustomRecordDto {
  @IsString()
  @IsNotEmpty()
  recordKey!: string;
}

class CreateCustomValueDto {
  @IsUUID()
  fieldDefinitionId!: string;

  @IsOptional()
  valueJson?: unknown;

  @IsOptional()
  @IsString()
  searchText?: string;
}

const policyControlCoverages: PolicyControlCoverage[] = ["full", "partial", "not_covered"];
const policyAttestationDecisions: PolicyAttestationDecision[] = ["attested", "declined"];
const accessReviewDecisionOutcomes: AccessReviewDecisionOutcome[] = ["approved", "revoked", "flagged"];
const vendorAssessmentTypes: VendorAssessmentType[] = ["onboarding", "renewal", "ad_hoc"];
const findingSeverities: FindingSeverityLevel[] = ["low", "medium", "high", "critical"];

class CreatePolicyRecordDto {
  @IsString()
  @IsNotEmpty()
  policyKey!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsUUID()
  ownerId!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;
}

class CreatePolicyControlLinkDto {
  @IsString()
  @IsNotEmpty()
  controlId!: string;

  @IsOptional()
  @IsIn(policyControlCoverages)
  coverage?: PolicyControlCoverage;
}

class CreatePolicyAttestationDto {
  @IsIn(policyAttestationDecisions)
  decision!: PolicyAttestationDecision;

  @IsString()
  @IsNotEmpty()
  evidenceHash!: string;
}

class CreateAccessReviewItemDto {
  @IsString()
  @IsNotEmpty()
  principalRef!: string;

  @IsString()
  @IsNotEmpty()
  resourceRef!: string;

  @IsString()
  @IsNotEmpty()
  entitlementRef!: string;
}

class CreateAccessReviewDecisionDto {
  @IsIn(accessReviewDecisionOutcomes)
  decision!: AccessReviewDecisionOutcome;

  @IsOptional()
  @IsString()
  rationale?: string;
}

class CreateVendorAssessmentDto {
  @IsIn(vendorAssessmentTypes)
  assessmentType!: VendorAssessmentType;

  @IsString()
  @IsNotEmpty()
  period!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;
}

class CreateVendorFindingDto {
  @IsIn(findingSeverities)
  severity!: FindingSeverityLevel;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

class CreateAuditRequestDto {
  @IsOptional()
  @IsString()
  controlId?: string;

  @IsString()
  @IsNotEmpty()
  requestedFrom!: string;

  @IsDateString()
  dueAt!: string;
}

class CreateAuditTestDto {
  @IsOptional()
  @IsUUID()
  controlInstanceId?: string;

  @IsString()
  @IsNotEmpty()
  procedure!: string;

  @IsOptional()
  @IsString()
  sampleRef?: string;
}

@ApiTags("EnterpriseGRC")
@ApiUnauthorizedResponse({ description: "Request context headers are missing or invalid." })
@ApiForbiddenResponse({ description: "Platform policy denied the request." })
@UseGuards(PolicyGuard)
@Controller("v1/enterprise-grc")
export class EnterpriseGrcController {
  constructor(@Inject(EnterpriseGrcService) private readonly service: EnterpriseGrcService) {}

  @Post("policies")
  @RequirePolicy({ resourceType: "policy_version", action: "write" })
  @ApiOperation({ summary: "Draft a policy version." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Policy version drafted." })
  @ApiBadRequestResponse({ description: "Invalid request body or idempotency key." })
  async draftPolicy(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: DraftPolicyDto
  ) {
    const context = readRequestContext(request);
    return this.service.draftPolicy({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      ...body
    });
  }

  @Get("policies")
  @RequirePolicy({ resourceType: "policy_version", action: "read" })
  @ApiOperation({ summary: "List policy versions." })
  @ApiOkResponse({ description: "Policy versions." })
  async listPolicies(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listPolicies(context.tenantId, toPagination(query));
  }

  @Get("policies/:policyId")
  @RequirePolicy({ resourceType: "policy_version", action: "read", resourceIdParam: "policyId" })
  @ApiOperation({ summary: "Fetch a policy version." })
  @ApiOkResponse({ description: "Policy version." })
  async getPolicy(@Req() request: Request, @Param("policyId") policyId: string) {
    const context = readRequestContext(request);
    return this.service.getPolicy(context.tenantId, policyId);
  }

  @Post("policies/:policyId/publish")
  @RequirePolicy({ resourceType: "policy_version", action: "write", resourceIdParam: "policyId" })
  @ApiOperation({ summary: "Publish a policy version with approval evidence." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Published policy version." })
  async publishPolicy(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("policyId") policyId: string,
    @Body() body: PublishPolicyDto
  ) {
    const context = readRequestContext(request);
    return this.service.publishPolicy({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      policyId,
      approverId: body.approverId,
      attestationEvidenceIds: body.attestationEvidenceIds,
      publishedAt: body.publishedAt ? new Date(body.publishedAt) : undefined
    });
  }

  @Post("policies/:policyId/exceptions")
  @RequirePolicy({ resourceType: "policy_version", action: "write", resourceIdParam: "policyId" })
  @ApiOperation({ summary: "Add a policy exception." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Policy version with exception." })
  async addPolicyException(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("policyId") policyId: string,
    @Body() body: PolicyExceptionDto
  ) {
    const context = readRequestContext(request);
    return this.service.addPolicyException({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      policyId,
      ownerId: body.ownerId,
      reason: body.reason,
      expiresAt: new Date(body.expiresAt)
    });
  }

  @Post("access-reviews")
  @RequirePolicy({ resourceType: "access_review", action: "write" })
  @ApiOperation({ summary: "Create an access review." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Access review created." })
  async createAccessReview(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: AccessReviewDto
  ) {
    const context = readRequestContext(request);
    return this.service.createAccessReview({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      populationSource: body.populationSource,
      certifierId: body.certifierId,
      decisions: body.decisions
    });
  }

  @Get("access-reviews")
  @RequirePolicy({ resourceType: "access_review", action: "read" })
  @ApiOperation({ summary: "List access reviews." })
  @ApiOkResponse({ description: "Access reviews." })
  async listAccessReviews(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listAccessReviews(context.tenantId, toPagination(query));
  }

  @Get("access-reviews/:reviewId")
  @RequirePolicy({ resourceType: "access_review", action: "read", resourceIdParam: "reviewId" })
  @ApiOperation({ summary: "Fetch an access review." })
  @ApiOkResponse({ description: "Access review." })
  async getAccessReview(@Req() request: Request, @Param("reviewId") reviewId: string) {
    const context = readRequestContext(request);
    return this.service.getAccessReview(context.tenantId, reviewId);
  }

  @Post("vendors")
  @RequirePolicy({ resourceType: "vendor", action: "write" })
  @ApiOperation({ summary: "Create a vendor record." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Vendor record created." })
  async createVendor(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: VendorDto
  ) {
    const context = readRequestContext(request);
    return this.service.createVendor({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      ...body,
      renewalAt: new Date(body.renewalAt)
    });
  }

  @Get("vendors")
  @RequirePolicy({ resourceType: "vendor", action: "read" })
  @ApiOperation({ summary: "List vendor records." })
  @ApiOkResponse({ description: "Vendor records." })
  async listVendors(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listVendors(context.tenantId, toPagination(query));
  }

  @Get("vendors/:vendorId")
  @RequirePolicy({ resourceType: "vendor", action: "read", resourceIdParam: "vendorId" })
  @ApiOperation({ summary: "Fetch a vendor record." })
  @ApiOkResponse({ description: "Vendor record." })
  async getVendor(@Req() request: Request, @Param("vendorId") vendorId: string) {
    const context = readRequestContext(request);
    return this.service.getVendor(context.tenantId, vendorId);
  }

  @Post("audit-engagements")
  @RequirePolicy({ resourceType: "audit_engagement", action: "write" })
  @ApiOperation({ summary: "Create an audit engagement." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Audit engagement created." })
  async createAuditEngagement(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: AuditEngagementDto
  ) {
    const context = readRequestContext(request);
    return this.service.createAuditEngagement({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      name: body.name,
      status: body.status,
      requestListIds: body.requestListIds,
      evidenceIds: body.evidenceIds,
      findingIds: body.findingIds,
      managementResponses: body.managementResponses.map((response) => ({
        ...response,
        dueAt: new Date(response.dueAt)
      }))
    });
  }

  @Get("audit-engagements")
  @RequirePolicy({ resourceType: "audit_engagement", action: "read" })
  @ApiOperation({ summary: "List audit engagements." })
  @ApiOkResponse({ description: "Audit engagements." })
  async listAuditEngagements(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listAuditEngagements(context.tenantId, toPagination(query));
  }

  @Get("audit-engagements/:engagementId")
  @RequirePolicy({ resourceType: "audit_engagement", action: "read", resourceIdParam: "engagementId" })
  @ApiOperation({ summary: "Fetch an audit engagement." })
  @ApiOkResponse({ description: "Audit engagement." })
  async getAuditEngagement(@Req() request: Request, @Param("engagementId") engagementId: string) {
    const context = readRequestContext(request);
    return this.service.getAuditEngagement(context.tenantId, engagementId);
  }

  @Post("trust-center-artifacts")
  @RequirePolicy({ resourceType: "trust_center_artifact", action: "write" })
  @ApiOperation({ summary: "Publish a trust center artifact." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Trust center artifact published." })
  async publishTrustArtifact(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: TrustArtifactDto
  ) {
    const context = readRequestContext(request);
    return this.service.publishTrustArtifact({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      ...body
    });
  }

  @Get("trust-center-artifacts")
  @RequirePolicy({ resourceType: "trust_center_artifact", action: "read" })
  @ApiOperation({ summary: "List trust center artifacts." })
  @ApiOkResponse({ description: "Trust center artifacts." })
  async listTrustArtifacts(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listTrustArtifacts(context.tenantId, toPagination(query));
  }

  @Get("trust-center-artifacts/:artifactId")
  @RequirePolicy({ resourceType: "trust_center_artifact", action: "read", resourceIdParam: "artifactId" })
  @ApiOperation({ summary: "Fetch a trust center artifact." })
  @ApiOkResponse({ description: "Trust center artifact." })
  async getTrustArtifact(@Req() request: Request, @Param("artifactId") artifactId: string) {
    const context = readRequestContext(request);
    return this.service.getTrustArtifact(context.tenantId, artifactId);
  }

  @Post("trust-center-artifacts/:artifactId/downloads")
  @RequirePolicy({ resourceType: "trust_center_artifact", action: "write", resourceIdParam: "artifactId" })
  @ApiOperation({ summary: "Record a trust center artifact download." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Trust center artifact with download audit." })
  async recordTrustDownload(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("artifactId") artifactId: string,
    @Body() body: TrustDownloadDto
  ) {
    const context = readRequestContext(request);
    return this.service.recordTrustArtifactDownload({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      artifactId,
      downloadedAt: body.downloadedAt ? new Date(body.downloadedAt) : undefined
    });
  }

  @Post("workspaces")
  @RequirePolicy({ resourceType: "grc_workspace", action: "write" })
  @ApiOperation({ summary: "Create a business-unit GRC workspace." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "GRC workspace created." })
  async createWorkspace(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: WorkspaceDto
  ) {
    const context = readRequestContext(request);
    return this.service.createWorkspace({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      ...body
    });
  }

  @Get("workspaces")
  @RequirePolicy({ resourceType: "grc_workspace", action: "read" })
  @ApiOperation({ summary: "List business-unit GRC workspaces." })
  @ApiOkResponse({ description: "GRC workspaces." })
  async listWorkspaces(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listWorkspaces(context.tenantId, toPagination(query));
  }

  @Get("workspaces/:workspaceId")
  @RequirePolicy({ resourceType: "grc_workspace", action: "read", resourceIdParam: "workspaceId" })
  @ApiOperation({ summary: "Fetch a business-unit GRC workspace." })
  @ApiOkResponse({ description: "GRC workspace." })
  async getWorkspace(@Req() request: Request, @Param("workspaceId") workspaceId: string) {
    const context = readRequestContext(request);
    return this.service.getWorkspace(context.tenantId, workspaceId);
  }

  @Post("custom-object-definitions")
  @RequirePolicy({ resourceType: "custom_object_definition", action: "write" })
  @ApiOperation({ summary: "Create an upgrade-safe custom object definition." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Custom object definition created." })
  async createCustomObject(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: CustomObjectDto
  ) {
    const context = readRequestContext(request);
    return this.service.createCustomObject({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      ...body
    });
  }

  @Get("custom-object-definitions")
  @RequirePolicy({ resourceType: "custom_object_definition", action: "read" })
  @ApiOperation({ summary: "List custom object definitions." })
  @ApiOkResponse({ description: "Custom object definitions." })
  async listCustomObjects(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listCustomObjects(context.tenantId, toPagination(query));
  }

  @Get("custom-object-definitions/:definitionId")
  @RequirePolicy({ resourceType: "custom_object_definition", action: "read", resourceIdParam: "definitionId" })
  @ApiOperation({ summary: "Fetch a custom object definition." })
  @ApiOkResponse({ description: "Custom object definition." })
  async getCustomObject(@Req() request: Request, @Param("definitionId") definitionId: string) {
    const context = readRequestContext(request);
    return this.service.getCustomObject(context.tenantId, definitionId);
  }

  // G-13 (0025_g13_custom_platform.sql).
  @Post("custom-object-definitions/:definitionId/status")
  @RequirePolicy({ resourceType: "custom_object_definition", action: "write", resourceIdParam: "definitionId" })
  @ApiOperation({ summary: "Update a custom object definition's lifecycle status and/or validation schema." })
  @ApiOkResponse({ description: "Custom object definition updated." })
  async updateCustomObjectStatus(
    @Req() request: Request,
    @Param("definitionId") definitionId: string,
    @Body() body: UpdateCustomObjectStatusDto
  ) {
    const context = readRequestContext(request);
    return this.service.updateCustomObjectStatus({
      tenantId: context.tenantId,
      actorId: context.userId,
      definitionId,
      ...body
    });
  }

  @Post("custom-object-definitions/:definitionId/fields")
  @RequirePolicy({ resourceType: "custom_field_definition", action: "write", resourceIdParam: "definitionId" })
  @ApiOperation({ summary: "Add a normalized field definition to a custom object definition." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Custom field definition created." })
  async createCustomFieldDefinition(
    @Req() request: Request,
    @Param("definitionId") definitionId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: CreateCustomFieldDefinitionDto
  ) {
    const context = readRequestContext(request);
    return this.service.createCustomFieldDefinition({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      objectDefinitionId: definitionId,
      ...body
    });
  }

  @Get("custom-object-definitions/:definitionId/fields")
  @RequirePolicy({ resourceType: "custom_field_definition", action: "read", resourceIdParam: "definitionId" })
  @ApiOperation({ summary: "List a custom object definition's field definitions." })
  @ApiOkResponse({ description: "Custom field definitions." })
  async listCustomFieldDefinitions(
    @Req() request: Request,
    @Param("definitionId") definitionId: string,
    @Query() query: PaginationQueryDto
  ) {
    const context = readRequestContext(request);
    return this.service.listCustomFieldDefinitions(context.tenantId, definitionId, toPagination(query));
  }

  @Post("custom-object-definitions/:definitionId/records")
  @RequirePolicy({ resourceType: "custom_record", action: "write", resourceIdParam: "definitionId" })
  @ApiOperation({ summary: "Create a record of a custom object definition." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Custom record created." })
  async createCustomRecord(
    @Req() request: Request,
    @Param("definitionId") definitionId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: CreateCustomRecordDto
  ) {
    const context = readRequestContext(request);
    return this.service.createCustomRecord({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      objectDefinitionId: definitionId,
      ...body
    });
  }

  @Get("custom-object-definitions/:definitionId/records")
  @RequirePolicy({ resourceType: "custom_record", action: "read", resourceIdParam: "definitionId" })
  @ApiOperation({ summary: "List a custom object definition's records." })
  @ApiOkResponse({ description: "Custom records." })
  async listCustomRecords(
    @Req() request: Request,
    @Param("definitionId") definitionId: string,
    @Query() query: PaginationQueryDto
  ) {
    const context = readRequestContext(request);
    return this.service.listCustomRecords(context.tenantId, definitionId, toPagination(query));
  }

  @Get("custom-records/:recordId")
  @RequirePolicy({ resourceType: "custom_record", action: "read", resourceIdParam: "recordId" })
  @ApiOperation({ summary: "Fetch a custom record." })
  @ApiOkResponse({ description: "Custom record." })
  async getCustomRecord(@Req() request: Request, @Param("recordId") recordId: string) {
    const context = readRequestContext(request);
    return this.service.getCustomRecord(context.tenantId, recordId);
  }

  @Post("custom-records/:recordId/values")
  @RequirePolicy({ resourceType: "custom_value", action: "write", resourceIdParam: "recordId" })
  @ApiOperation({ summary: "Set a typed extension value on a custom record, validated against its field definition." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Custom value created." })
  @ApiBadRequestResponse({ description: "Value is missing/required, or does not match the field definition's dataType." })
  async createCustomValue(
    @Req() request: Request,
    @Param("recordId") recordId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: CreateCustomValueDto
  ) {
    const context = readRequestContext(request);
    return this.service.createCustomValue({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      recordId,
      ...body
    });
  }

  @Get("custom-records/:recordId/values")
  @RequirePolicy({ resourceType: "custom_value", action: "read", resourceIdParam: "recordId" })
  @ApiOperation({ summary: "List a custom record's typed extension values." })
  @ApiOkResponse({ description: "Custom values." })
  async listCustomValues(@Req() request: Request, @Param("recordId") recordId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listCustomValues(context.tenantId, recordId, toPagination(query));
  }

  @Post("policy-definitions")
  @RequirePolicy({ resourceType: "policy", action: "write" })
  @ApiOperation({ summary: "Create the stable policy identity (G-09) a policy_version belongs under." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Policy record created." })
  async createPolicyRecord(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: CreatePolicyRecordDto
  ) {
    const context = readRequestContext(request);
    return this.service.createPolicyRecord({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      ...body
    });
  }

  @Get("policy-definitions")
  @RequirePolicy({ resourceType: "policy", action: "read" })
  @ApiOperation({ summary: "List policy identities." })
  @ApiOkResponse({ description: "Policy records." })
  async listPolicyRecords(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listPolicyRecords(context.tenantId, toPagination(query));
  }

  @Get("policy-definitions/:policyRecordId")
  @RequirePolicy({ resourceType: "policy", action: "read", resourceIdParam: "policyRecordId" })
  @ApiOperation({ summary: "Fetch a policy identity." })
  @ApiOkResponse({ description: "Policy record." })
  async getPolicyRecord(@Req() request: Request, @Param("policyRecordId") policyRecordId: string) {
    const context = readRequestContext(request);
    return this.service.getPolicyRecord(context.tenantId, policyRecordId);
  }

  @Post("policies/:policyId/control-links")
  @RequirePolicy({ resourceType: "policy_control_link", action: "write", resourceIdParam: "policyId" })
  @ApiOperation({ summary: "Link a policy version to a control it covers." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Policy control link created." })
  async createPolicyControlLink(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("policyId") policyId: string,
    @Body() body: CreatePolicyControlLinkDto
  ) {
    const context = readRequestContext(request);
    return this.service.createPolicyControlLink({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      policyVersionId: policyId,
      controlId: body.controlId,
      coverage: body.coverage
    });
  }

  @Get("policies/:policyId/control-links")
  @RequirePolicy({ resourceType: "policy_control_link", action: "read", resourceIdParam: "policyId" })
  @ApiOperation({ summary: "List a policy version's control links." })
  @ApiOkResponse({ description: "Policy control links." })
  async listPolicyControlLinks(@Req() request: Request, @Param("policyId") policyId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listPolicyControlLinks(context.tenantId, policyId, toPagination(query));
  }

  @Post("policies/:policyId/attestations")
  @RequirePolicy({ resourceType: "policy_attestation", action: "write", resourceIdParam: "policyId" })
  @ApiOperation({ summary: "Record an employee attestation for a policy version." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Policy attestation recorded." })
  async createPolicyAttestation(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("policyId") policyId: string,
    @Body() body: CreatePolicyAttestationDto
  ) {
    const context = readRequestContext(request);
    return this.service.createPolicyAttestation({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      policyVersionId: policyId,
      decision: body.decision,
      evidenceHash: body.evidenceHash
    });
  }

  @Get("policies/:policyId/attestations")
  @RequirePolicy({ resourceType: "policy_attestation", action: "read", resourceIdParam: "policyId" })
  @ApiOperation({ summary: "List a policy version's attestations." })
  @ApiOkResponse({ description: "Policy attestations." })
  async listPolicyAttestations(@Req() request: Request, @Param("policyId") policyId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listPolicyAttestations(context.tenantId, policyId, toPagination(query));
  }

  @Post("access-reviews/:reviewId/items")
  @RequirePolicy({ resourceType: "access_review_item", action: "write", resourceIdParam: "reviewId" })
  @ApiOperation({ summary: "Add a reviewable entitlement to an access review campaign." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Access review item created." })
  async createAccessReviewItem(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("reviewId") reviewId: string,
    @Body() body: CreateAccessReviewItemDto
  ) {
    const context = readRequestContext(request);
    return this.service.createAccessReviewItem({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      accessReviewId: reviewId,
      ...body
    });
  }

  @Get("access-reviews/:reviewId/items")
  @RequirePolicy({ resourceType: "access_review_item", action: "read", resourceIdParam: "reviewId" })
  @ApiOperation({ summary: "List an access review's reviewable entitlements." })
  @ApiOkResponse({ description: "Access review items." })
  async listAccessReviewItems(@Req() request: Request, @Param("reviewId") reviewId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listAccessReviewItems(context.tenantId, reviewId, toPagination(query));
  }

  @Post("access-reviews/:reviewId/items/:itemId/decisions")
  @RequirePolicy({ resourceType: "access_review_decision", action: "write", resourceIdParam: "itemId" })
  @ApiOperation({ summary: "Record a certification decision for a reviewable entitlement." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Access review decision recorded." })
  async createAccessReviewDecision(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("itemId") itemId: string,
    @Body() body: CreateAccessReviewDecisionDto
  ) {
    const context = readRequestContext(request);
    return this.service.createAccessReviewDecision({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      reviewItemId: itemId,
      decision: body.decision,
      rationale: body.rationale
    });
  }

  @Get("access-reviews/:reviewId/items/:itemId/decisions")
  @RequirePolicy({ resourceType: "access_review_decision", action: "read", resourceIdParam: "itemId" })
  @ApiOperation({ summary: "List an entitlement's certification decisions." })
  @ApiOkResponse({ description: "Access review decisions." })
  async listAccessReviewDecisions(@Req() request: Request, @Param("itemId") itemId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listAccessReviewDecisions(context.tenantId, itemId, toPagination(query));
  }

  @Post("vendors/:vendorId/assessments")
  @RequirePolicy({ resourceType: "vendor_assessment", action: "write", resourceIdParam: "vendorId" })
  @ApiOperation({ summary: "Create a vendor due-diligence/renewal assessment." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Vendor assessment created." })
  async createVendorAssessment(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("vendorId") vendorId: string,
    @Body() body: CreateVendorAssessmentDto
  ) {
    const context = readRequestContext(request);
    return this.service.createVendorAssessment({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      vendorId,
      ...body
    });
  }

  @Get("vendors/:vendorId/assessments")
  @RequirePolicy({ resourceType: "vendor_assessment", action: "read", resourceIdParam: "vendorId" })
  @ApiOperation({ summary: "List a vendor's assessments." })
  @ApiOkResponse({ description: "Vendor assessments." })
  async listVendorAssessments(@Req() request: Request, @Param("vendorId") vendorId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listVendorAssessments(context.tenantId, vendorId, toPagination(query));
  }

  @Post("vendors/:vendorId/assessments/:assessmentId/findings")
  @RequirePolicy({ resourceType: "vendor_finding", action: "write", resourceIdParam: "assessmentId" })
  @ApiOperation({ summary: "Record a deficiency found during a vendor assessment." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Vendor finding created." })
  async createVendorFinding(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("assessmentId") assessmentId: string,
    @Body() body: CreateVendorFindingDto
  ) {
    const context = readRequestContext(request);
    return this.service.createVendorFinding({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      vendorAssessmentId: assessmentId,
      severity: body.severity,
      title: body.title,
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined
    });
  }

  @Get("vendors/:vendorId/assessments/:assessmentId/findings")
  @RequirePolicy({ resourceType: "vendor_finding", action: "read", resourceIdParam: "assessmentId" })
  @ApiOperation({ summary: "List a vendor assessment's findings." })
  @ApiOkResponse({ description: "Vendor findings." })
  async listVendorFindings(@Req() request: Request, @Param("assessmentId") assessmentId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listVendorFindings(context.tenantId, assessmentId, toPagination(query));
  }

  @Post("audit-engagements/:engagementId/requests")
  @RequirePolicy({ resourceType: "audit_request", action: "write", resourceIdParam: "engagementId" })
  @ApiOperation({ summary: "Create a PBC (provided-by-client) request for an audit engagement." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Audit request created." })
  async createAuditRequest(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("engagementId") engagementId: string,
    @Body() body: CreateAuditRequestDto
  ) {
    const context = readRequestContext(request);
    return this.service.createAuditRequest({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      auditEngagementId: engagementId,
      controlId: body.controlId,
      requestedFrom: body.requestedFrom,
      dueAt: new Date(body.dueAt)
    });
  }

  @Get("audit-engagements/:engagementId/requests")
  @RequirePolicy({ resourceType: "audit_request", action: "read", resourceIdParam: "engagementId" })
  @ApiOperation({ summary: "List an audit engagement's PBC requests." })
  @ApiOkResponse({ description: "Audit requests." })
  async listAuditRequests(@Req() request: Request, @Param("engagementId") engagementId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listAuditRequests(context.tenantId, engagementId, toPagination(query));
  }

  @Post("audit-engagements/:engagementId/tests")
  @RequirePolicy({ resourceType: "audit_test", action: "write", resourceIdParam: "engagementId" })
  @ApiOperation({ summary: "Record an audit test workpaper for an audit engagement." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Audit test created." })
  async createAuditTest(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("engagementId") engagementId: string,
    @Body() body: CreateAuditTestDto
  ) {
    const context = readRequestContext(request);
    return this.service.createAuditTest({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      auditEngagementId: engagementId,
      ...body
    });
  }

  @Get("audit-engagements/:engagementId/tests")
  @RequirePolicy({ resourceType: "audit_test", action: "read", resourceIdParam: "engagementId" })
  @ApiOperation({ summary: "List an audit engagement's test workpapers." })
  @ApiOkResponse({ description: "Audit tests." })
  async listAuditTests(@Req() request: Request, @Param("engagementId") engagementId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listAuditTests(context.tenantId, engagementId, toPagination(query));
  }
}

function requiredIdempotencyKey(value: string | undefined): string {
  if (!value?.trim()) {
    throw new BadRequestException("Idempotency-Key header is required.");
  }
  return value;
}
