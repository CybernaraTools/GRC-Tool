import path from "node:path";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  NotFoundException,
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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import type { Request } from "express";
import { PolicyGuard, RequirePolicy } from "../../platform-hardening/public.js";
import { PlatformOperatorGuard } from "../../identity-tenant/public.js";
import { PaginationQueryDto, toPagination } from "../../../shared/pagination.dto.js";
import { readRequestContext } from "../../../shared/request-context.js";
import { QuestionRepositoryService } from "../../assessment/public.js";
import { ContentIngestionService } from "../application/content-ingestion.service.js";

class PublishContentIngestionDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  sourcesDir?: string;
}

class RequirementsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  frameworkKey?: string;
}

class EnableFrameworkDto {
  @IsUUID()
  frameworkVersionId!: string;
}

@ApiTags("FrameworkContent")
@ApiUnauthorizedResponse({ description: "Request context headers are missing or invalid." })
@ApiForbiddenResponse({ description: "Platform policy denied the request." })
@UseGuards(PolicyGuard)
@Controller("v1/framework-content")
export class FrameworkContentController {
  constructor(
    @Inject(ContentIngestionService) private readonly service: ContentIngestionService,
    @Inject(QuestionRepositoryService) private readonly questionRepository: QuestionRepositoryService
  ) {}

  @Post("ingestion-runs")
  @RequirePolicy({ resourceType: "framework-content", action: "write" })
  @ApiOperation({ summary: "Publish canonical framework content and harmonization source workbooks." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Source content was parsed, persisted, and published." })
  @ApiBadRequestResponse({ description: "Idempotency key or request body is invalid." })
  async publishIngestion(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: PublishContentIngestionDto | undefined
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException("Idempotency-Key header is required.");
    }
    const context = readRequestContext(request);
    return this.service.publishSources({
      tenantId: context.tenantId,
      actorId: context.userId,
      idempotencyKey,
      sourcesDir: body?.sourcesDir ?? path.resolve(process.cwd(), "sources")
    });
  }

  @Get("source-packages")
  @RequirePolicy({ resourceType: "framework-content", action: "read" })
  @ApiOperation({ summary: "List persisted source workbook packages." })
  @ApiOkResponse({ description: "Source packages." })
  async listSourcePackages(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listSourcePackages(context.tenantId, toPagination(query));
  }

  @Get("content-packs")
  @RequirePolicy({ resourceType: "framework-content", action: "read" })
  @ApiOperation({ summary: "List published framework content packs." })
  @ApiOkResponse({ description: "Content packs." })
  async listContentPacks(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listContentPacks(context.tenantId, toPagination(query));
  }

  @Get("enabled-frameworks")
  @RequirePolicy({ resourceType: "framework-content", action: "read" })
  @ApiOperation({ summary: "List framework versions enabled for the current tenant." })
  @ApiOkResponse({ description: "Enabled framework versions." })
  async listEnabledFrameworks(@Req() request: Request) {
    const context = readRequestContext(request);
    return this.questionRepository.listEnabledFrameworks(context.tenantId);
  }

  @Post("enabled-frameworks")
  @RequirePolicy({ resourceType: "framework-content", action: "write" })
  @ApiOperation({ summary: "Enable a published framework version for the current tenant." })
  @ApiCreatedResponse({ description: "Framework version enabled." })
  @ApiBadRequestResponse({ description: "Invalid framework enablement request." })
  async enableFramework(@Req() request: Request, @Body() body: EnableFrameworkDto) {
    const context = readRequestContext(request);
    return this.questionRepository.enableFramework({
      tenantId: context.tenantId,
      actorId: context.userId,
      frameworkVersionId: body.frameworkVersionId
    });
  }

  @Post("enabled-frameworks/disable")
  @HttpCode(200)
  @RequirePolicy({ resourceType: "framework-content", action: "write" })
  @ApiOperation({ summary: "Disable an enabled framework version for the current tenant." })
  @ApiOkResponse({ description: "Framework version disabled." })
  @ApiBadRequestResponse({ description: "Invalid framework disablement request." })
  async disableFramework(@Req() request: Request, @Body() body: EnableFrameworkDto) {
    const context = readRequestContext(request);
    return this.questionRepository.disableFramework({
      tenantId: context.tenantId,
      actorId: context.userId,
      frameworkVersionId: body.frameworkVersionId
    });
  }

  @Get("question-options")
  @RequirePolicy({ resourceType: "question_version", action: "read" })
  @ApiOperation({ summary: "List active approved question versions selectable for assessment creation." })
  @ApiOkResponse({ description: "Assessment question options." })
  async listAssessmentQuestionOptions(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.questionRepository.listAssessmentQuestionOptions(context.tenantId, toPagination(query));
  }

  @Get("content-packs/:packId")
  @RequirePolicy({ resourceType: "framework-content", action: "read", resourceIdParam: "packId" })
  @ApiOperation({ summary: "Fetch a published framework content pack by ID." })
  @ApiOkResponse({ description: "Content pack." })
  @ApiNotFoundResponse({ description: "Content pack not found." })
  async getContentPack(@Req() request: Request, @Param("packId") packId: string) {
    const context = readRequestContext(request);
    const pack = await this.service.getContentPack(context.tenantId, packId);
    if (!pack) {
      throw new NotFoundException("Content pack not found.");
    }
    return pack;
  }

  @Get("content-packs/:packId/requirements")
  @RequirePolicy({ resourceType: "framework-content", action: "read", resourceIdParam: "packId" })
  @ApiOperation({ summary: "List canonical requirements for a content pack." })
  @ApiOkResponse({ description: "Content pack requirements." })
  async listPackRequirements(
    @Req() request: Request,
    @Param("packId") packId: string,
    @Query() query: PaginationQueryDto
  ) {
    const context = readRequestContext(request);
    return this.service.listRequirements({
      tenantId: context.tenantId,
      packId,
      pagination: toPagination(query)
    });
  }

  @Get("requirements")
  @RequirePolicy({ resourceType: "framework-content", action: "read" })
  @ApiOperation({ summary: "List canonical framework requirements, optionally filtered by framework." })
  @ApiOkResponse({ description: "Framework requirements." })
  async listRequirements(
    @Req() request: Request,
    @Query() query: RequirementsQueryDto
  ) {
    const context = readRequestContext(request);
    return this.service.listRequirements({
      tenantId: context.tenantId,
      frameworkKey: query.frameworkKey,
      pagination: toPagination(query)
    });
  }

  @Get("rejected-records")
  @RequirePolicy({ resourceType: "framework-content", action: "read" })
  @ApiOperation({ summary: "List rejected workbook records and diagnostics." })
  @ApiOkResponse({ description: "Rejected workbook records." })
  async listRejectedRecords(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listRejectedRecords(context.tenantId, toPagination(query));
  }
}

@ApiTags("PlatformFrameworkContent")
@ApiUnauthorizedResponse({ description: "Platform operator context headers are missing or invalid." })
@ApiForbiddenResponse({ description: "Platform operator check denied the request." })
@UseGuards(PlatformOperatorGuard)
@Controller("v1/platform/framework-content")
export class PlatformFrameworkContentController {
  constructor(@Inject(ContentIngestionService) private readonly service: ContentIngestionService) {}

  @Get("source-packages")
  @ApiOperation({ summary: "List global source workbook packages for platform content governance." })
  @ApiOkResponse({ description: "Global source packages." })
  async listSourcePackages(@Query() query: PaginationQueryDto) {
    return this.service.listSourcePackages("platform-global", toPagination(query));
  }

  @Get("content-packs")
  @ApiOperation({ summary: "List global published framework content packs for platform content governance." })
  @ApiOkResponse({ description: "Global content packs." })
  async listContentPacks(@Query() query: PaginationQueryDto) {
    return this.service.listContentPacks("platform-global", toPagination(query));
  }

  @Get("requirements")
  @ApiOperation({ summary: "List global canonical framework requirements, optionally filtered by framework." })
  @ApiOkResponse({ description: "Global framework requirements." })
  async listRequirements(@Query() query: RequirementsQueryDto) {
    return this.service.listRequirements({
      tenantId: "platform-global",
      frameworkKey: query.frameworkKey,
      pagination: toPagination(query)
    });
  }

  @Get("rejected-records")
  @ApiOperation({ summary: "List global rejected workbook records and diagnostics." })
  @ApiOkResponse({ description: "Global rejected workbook records." })
  async listRejectedRecords(@Query() query: PaginationQueryDto) {
    return this.service.listRejectedRecords("platform-global", toPagination(query));
  }
}
