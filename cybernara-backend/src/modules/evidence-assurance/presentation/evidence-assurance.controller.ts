import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  Req,
  StreamableFile,
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
import { IsArray, IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import type { Request } from "express";
import { PolicyGuard, RequirePolicy } from "../../platform-hardening/public.js";
import { PaginationQueryDto, toPagination } from "../../../shared/pagination.dto.js";
import { readRequestContext } from "../../../shared/request-context.js";
import { EvidenceAssuranceService } from "../application/evidence-assurance.service.js";
import type { EvidenceState } from "../domain/evidence.js";

class InitiateEvidenceUploadDto {
  @IsUUID()
  ownerId!: string;

  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsIn(["internal", "confidential", "restricted"])
  classification!: "internal" | "confidential" | "restricted";

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsArray()
  @IsString({ each: true })
  scopeTags!: string[];
}

class EvidenceListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(["pending", "quarantined", "committed", "rejected"])
  state?: EvidenceState;
}

class QuarantineEvidenceDto {
  @IsOptional()
  @IsString()
  storageUri?: string;
}

class CommitEvidenceDto {
  @IsIn(["clean", "malicious"])
  scannerVerdict!: "clean" | "malicious";

  @IsString()
  @IsNotEmpty()
  bytesBase64!: string;

  @IsOptional()
  @IsString()
  storageUri?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

class UploadEvidenceBytesDto {
  @IsString()
  @IsNotEmpty()
  bytesBase64!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @IsOptional()
  @IsString()
  storageUri?: string;

  @IsOptional()
  @IsIn(["clean", "malicious"])
  scannerVerdict?: "clean" | "malicious";
}

class CreateEvidenceExpiryEventDto {
  @IsString()
  @IsNotEmpty()
  previousState!: string;

  @IsString()
  @IsNotEmpty()
  newState!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

class EvidenceReuseCheckDto {
  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsArray()
  @IsString({ each: true })
  scopeTags!: string[];
}

@ApiTags("EvidenceAssurance")
@ApiUnauthorizedResponse({ description: "Request context headers are missing or invalid." })
@ApiForbiddenResponse({ description: "Platform policy denied the request." })
@UseGuards(PolicyGuard)
@Controller("v1/evidence/objects")
export class EvidenceAssuranceController {
  constructor(@Inject(EvidenceAssuranceService) private readonly service: EvidenceAssuranceService) {}

  @Post()
  @RequirePolicy({ resourceType: "evidence_object", action: "write" })
  @ApiOperation({ summary: "Initiate an evidence object upload." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Evidence upload initiated." })
  @ApiBadRequestResponse({ description: "Invalid request body or idempotency key." })
  async initiateUpload(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: InitiateEvidenceUploadDto
  ) {
    const context = readRequestContext(request);
    return this.service.initiateUpload({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      ownerId: body.ownerId,
      fileName: body.fileName,
      classification: body.classification,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
      scopeTags: body.scopeTags
    });
  }

  @Get()
  @RequirePolicy({ resourceType: "evidence_object", action: "read" })
  @ApiOperation({ summary: "List evidence objects." })
  @ApiOkResponse({ description: "Evidence objects." })
  async list(@Req() request: Request, @Query() query: EvidenceListQueryDto) {
    const context = readRequestContext(request);
    return this.service.list({ tenantId: context.tenantId, state: query.state, pagination: toPagination(query) });
  }

  @Get("upload-policy")
  @RequirePolicy({ resourceType: "evidence_object", action: "read" })
  @ApiOperation({ summary: "Fetch evidence upload size and MIME-type limits." })
  @ApiOkResponse({ description: "Evidence upload policy." })
  uploadPolicy() {
    return this.service.getUploadPolicy();
  }

  @Get(":evidenceId")
  @RequirePolicy({ resourceType: "evidence_object", action: "read", resourceIdParam: "evidenceId" })
  @ApiOperation({ summary: "Fetch an evidence object." })
  @ApiOkResponse({ description: "Evidence object." })
  async get(@Req() request: Request, @Param("evidenceId") evidenceId: string) {
    const context = readRequestContext(request);
    return this.service.get(context.tenantId, evidenceId);
  }

  @Get(":evidenceId/download")
  @RequirePolicy({ resourceType: "evidence_object", action: "read", resourceIdParam: "evidenceId" })
  @ApiOperation({ summary: "Download the latest retained evidence file content." })
  @ApiOkResponse({ description: "Evidence file content." })
  async download(@Req() request: Request, @Param("evidenceId") evidenceId: string) {
    const context = readRequestContext(request);
    const { evidence, version, bytes } = await this.service.downloadEvidenceObject(context.tenantId, evidenceId);
    return new StreamableFile(bytes, {
      type: version.mimeType,
      disposition: `inline; filename="${safeDownloadName(evidence.fileName)}"`
    });
  }

  @Get(":evidenceId/scan-status")
  @RequirePolicy({ resourceType: "evidence_object", action: "read", resourceIdParam: "evidenceId" })
  @ApiOperation({ summary: "Fetch quarantine and scanner status for an evidence object." })
  @ApiOkResponse({ description: "Evidence scan status." })
  async scanStatus(@Req() request: Request, @Param("evidenceId") evidenceId: string) {
    const context = readRequestContext(request);
    const evidence = await this.service.get(context.tenantId, evidenceId);
    return {
      evidenceId: evidence.id,
      state: evidence.state,
      sha256: evidence.sha256 ?? null,
      storageUri: evidence.storageUri ?? null,
      updatedAt: evidence.updatedAt
    };
  }

  @Post(":evidenceId/quarantine")
  @RequirePolicy({ resourceType: "evidence_object", action: "write", resourceIdParam: "evidenceId" })
  @ApiOperation({ summary: "Move pending evidence into quarantine." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Quarantined evidence object." })
  async quarantine(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("evidenceId") evidenceId: string,
    @Body() body: QuarantineEvidenceDto
  ) {
    const context = readRequestContext(request);
    return this.service.quarantine({
      tenantId: context.tenantId,
      actorId: context.userId,
      evidenceId,
      storageUri: body.storageUri,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey)
    });
  }

  @Post(":evidenceId/commit")
  @RequirePolicy({ resourceType: "evidence_object", action: "write", resourceIdParam: "evidenceId" })
  @ApiOperation({ summary: "Commit clean evidence or reject malicious evidence after scanning." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Committed or rejected evidence object." })
  async commit(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("evidenceId") evidenceId: string,
    @Body() body: CommitEvidenceDto
  ) {
    const context = readRequestContext(request);
    return this.service.commit({
      tenantId: context.tenantId,
      actorId: context.userId,
      evidenceId,
      scannerVerdict: body.scannerVerdict,
      bytesBase64: body.bytesBase64,
      storageUri: body.storageUri,
      mimeType: body.mimeType,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey)
    });
  }

  @Post(":evidenceId/upload")
  @HttpCode(200)
  @RequirePolicy({ resourceType: "evidence_object", action: "write", resourceIdParam: "evidenceId" })
  @ApiOperation({ summary: "Upload evidence bytes through the validated browser-upload path." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ description: "Uploaded, scanned, and committed/rejected evidence object." })
  @ApiBadRequestResponse({ description: "Invalid, oversized, or disallowed upload." })
  async upload(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("evidenceId") evidenceId: string,
    @Body() body: UploadEvidenceBytesDto
  ) {
    const context = readRequestContext(request);
    return this.service.uploadBytes({
      tenantId: context.tenantId,
      actorId: context.userId,
      evidenceId,
      bytesBase64: body.bytesBase64,
      mimeType: body.mimeType,
      storageUri: body.storageUri,
      scannerVerdict: body.scannerVerdict,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey)
    });
  }

  @Get(":evidenceId/versions")
  @RequirePolicy({ resourceType: "evidence_version", action: "read", resourceIdParam: "evidenceId" })
  @ApiOperation({ summary: "List the immutable content versions of an evidence object." })
  @ApiOkResponse({ description: "Evidence versions." })
  async listVersions(@Req() request: Request, @Param("evidenceId") evidenceId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.getEvidenceVersions(context.tenantId, evidenceId, toPagination(query));
  }

  @Post(":evidenceId/expiry-events")
  @RequirePolicy({ resourceType: "evidence_expiry_event", action: "write", resourceIdParam: "evidenceId" })
  @ApiOperation({ summary: "Record a retention/expiry lifecycle transition for an evidence object." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Evidence expiry event recorded." })
  async createExpiryEvent(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("evidenceId") evidenceId: string,
    @Body() body: CreateEvidenceExpiryEventDto
  ) {
    const context = readRequestContext(request);
    return this.service.createEvidenceExpiryEvent({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey: requiredIdempotencyKey(idempotencyKey),
      evidenceId,
      previousState: body.previousState,
      newState: body.newState,
      reason: body.reason
    });
  }

  @Get(":evidenceId/expiry-events")
  @RequirePolicy({ resourceType: "evidence_expiry_event", action: "read", resourceIdParam: "evidenceId" })
  @ApiOperation({ summary: "List retention/expiry lifecycle events for an evidence object." })
  @ApiOkResponse({ description: "Evidence expiry events." })
  async listExpiryEvents(@Req() request: Request, @Param("evidenceId") evidenceId: string, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listEvidenceExpiryEvents(context.tenantId, evidenceId, toPagination(query));
  }

  @Post(":evidenceId/reuse-check")
  @RequirePolicy({ resourceType: "evidence_object", action: "read", resourceIdParam: "evidenceId" })
  @ApiOperation({ summary: "Check whether committed evidence can be reused for a required period and scope." })
  @ApiOkResponse({ description: "Evidence reuse decision." })
  async reuseCheck(
    @Req() request: Request,
    @Param("evidenceId") evidenceId: string,
    @Body() body: EvidenceReuseCheckDto
  ) {
    const context = readRequestContext(request);
    return this.service.checkReuse({
      tenantId: context.tenantId,
      evidenceId,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
      scopeTags: body.scopeTags
    });
  }
}

function requiredIdempotencyKey(value: string | undefined): string {
  if (!value?.trim()) {
    throw new BadRequestException("Idempotency-Key header is required.");
  }
  return value;
}

function safeDownloadName(fileName: string): string {
  return fileName.replace(/[\\/\r\n"]/g, "_");
}
