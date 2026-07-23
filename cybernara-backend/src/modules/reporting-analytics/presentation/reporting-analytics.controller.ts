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
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import type { Request } from "express";
import { PolicyGuard, RequirePolicy } from "../../platform-hardening/public.js";
import { PaginationQueryDto, toPagination } from "../../../shared/pagination.dto.js";
import { readRequestContext } from "../../../shared/request-context.js";
import { ReportingAnalyticsService } from "../application/reporting-analytics.service.js";
import type { ReportFormat } from "../application/reporting-analytics.types.js";

class RequestReportExportDto {
  @IsUUID()
  assessmentId!: string;

  @IsString()
  @IsNotEmpty()
  snapshotId!: string;

  @IsString()
  @IsNotEmpty()
  templateVersion!: string;

  @IsIn(["pdf", "xlsx"])
  format!: ReportFormat;
}

class ReportExportListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  assessmentId?: string;
}

@ApiTags("ReportingAnalytics")
@ApiUnauthorizedResponse({ description: "Request context headers are missing or invalid." })
@ApiForbiddenResponse({ description: "Platform policy denied the request." })
@UseGuards(PolicyGuard)
@Controller("v1/report-exports")
export class ReportingAnalyticsController {
  constructor(@Inject(ReportingAnalyticsService) private readonly service: ReportingAnalyticsService) {}

  @Post()
  @RequirePolicy({ resourceType: "report_export", action: "write" })
  @ApiOperation({ summary: "Request a PDF or Excel export for a frozen assessment snapshot." })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiCreatedResponse({ description: "Report export requested." })
  @ApiBadRequestResponse({ description: "Invalid request body or idempotency key." })
  async requestExport(
    @Req() request: Request,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: RequestReportExportDto
  ) {
    const context = readRequestContext(request);
    return this.service.requestExport({
      tenantId: context.tenantId,
      actorId: context.userId,
      requestIdempotencyKey: requiredIdempotencyKey(idempotencyKey),
      assessmentId: body.assessmentId,
      snapshotId: body.snapshotId,
      templateVersion: body.templateVersion,
      format: body.format
    });
  }

  @Get()
  @RequirePolicy({ resourceType: "report_export", action: "read" })
  @ApiOperation({ summary: "List report exports." })
  @ApiOkResponse({ description: "Report exports." })
  async list(@Req() request: Request, @Query() query: ReportExportListQueryDto) {
    const context = readRequestContext(request);
    return this.service.list({
      tenantId: context.tenantId,
      assessmentId: query.assessmentId,
      pagination: toPagination(query)
    });
  }

  @Get(":exportId")
  @RequirePolicy({ resourceType: "report_export", action: "read", resourceIdParam: "exportId" })
  @ApiOperation({ summary: "Poll report export metadata." })
  @ApiOkResponse({ description: "Report export." })
  async get(@Req() request: Request, @Param("exportId") exportId: string) {
    const context = readRequestContext(request);
    return this.service.get(context.tenantId, exportId);
  }

  @Get(":exportId/download")
  @RequirePolicy({ resourceType: "report_export", action: "read", resourceIdParam: "exportId" })
  @ApiOperation({ summary: "Download a report export artifact." })
  @ApiOkResponse({ description: "Report export artifact." })
  async download(@Req() request: Request, @Param("exportId") exportId: string) {
    const context = readRequestContext(request);
    const { record, artifact } = await this.service.download(context.tenantId, exportId);
    const extension = record.format === "pdf" ? "pdf" : "xlsx";
    return new StreamableFile(artifact.bytes, {
      type: record.format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      disposition: `attachment; filename="cybernara-report-${record.id}.${extension}"`
    });
  }
}

function requiredIdempotencyKey(value: string | undefined): string {
  if (!value?.trim()) {
    throw new BadRequestException("Idempotency-Key header is required.");
  }
  return value;
}

