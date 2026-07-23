import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import type { Request } from "express";
import { PolicyGuard, RequirePolicy } from "../../platform-hardening/public.js";
import { PlatformOperatorGuard } from "../../identity-tenant/public.js";
import { PaginationQueryDto, toPagination } from "../../../shared/pagination.dto.js";
import { readRequestContext } from "../../../shared/request-context.js";
import { FrameworkUpdateService } from "../application/framework-update.service.js";

class CalculateDiffDto {
  @IsString()
  @IsNotEmpty()
  frameworkKey!: string;

  @IsString()
  @IsNotEmpty()
  fromVersionKey!: string;

  @IsString()
  @IsNotEmpty()
  toVersionKey!: string;
}

class ImpactListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  assessmentId?: string;

  @IsOptional()
  @IsUUID()
  controlInstanceId?: string;

  @IsOptional()
  @IsIn(["pending", "reassessed", "accepted", "ignored"])
  status?: string;
}

class ResolveImpactDto {
  @IsIn(["reassessed", "accepted", "ignored"])
  status!: string;

  @IsString()
  @IsNotEmpty()
  resolutionRationale!: string;
}

@ApiTags("FrameworkUpdates")
@Controller("v1")
@UseGuards(PolicyGuard)
export class FrameworkUpdateController {
  constructor(
    @Inject(FrameworkUpdateService) private readonly service: FrameworkUpdateService
  ) {}

  @Post("frameworks/diffs")
  @RequirePolicy({ resourceType: "framework_diff", action: "write" })
  @ApiOperation({ summary: "Calculate version differences and register active assessment impacts." })
  @ApiOkResponse({ description: "Framework diff generated." })
  @ApiUnauthorizedResponse({ description: "Invalid session credentials." })
  @ApiForbiddenResponse({ description: "Insufficient authorization privileges." })
  async calculateDiff(@Req() request: Request, @Body() dto: CalculateDiffDto) {
    const ctx = readRequestContext(request);
    return this.service.calculateAndApplyDiff({
      tenantId: ctx.tenantId,
      frameworkKey: dto.frameworkKey,
      fromVersionKey: dto.fromVersionKey,
      toVersionKey: dto.toVersionKey,
      createdBy: ctx.userId,
      idempotencyKey: ctx.correlationId
    });
  }

  @Get("frameworks/diffs")
  @RequirePolicy({ resourceType: "framework_diff", action: "read" })
  @ApiOperation({ summary: "List calculated framework version diffs." })
  @ApiOkResponse({ description: "List of framework diffs." })
  async listDiffs(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const ctx = readRequestContext(request);
    return this.service.listDiffs(ctx.tenantId, toPagination(query));
  }

  @Get("frameworks/diffs/:id/items")
  @RequirePolicy({ resourceType: "framework_diff", action: "read" })
  @ApiOperation({ summary: "List individual requirement changes for a diff." })
  @ApiOkResponse({ description: "List of requirement change items." })
  async listDiffItems(
    @Req() request: Request,
    @Param("id") diffId: string,
    @Query() query: PaginationQueryDto
  ) {
    const ctx = readRequestContext(request);
    return this.service.listDiffItems(ctx.tenantId, diffId, toPagination(query));
  }

  @Get("frameworks/updates/impacts")
  @RequirePolicy({ resourceType: "framework_update_impact", action: "read" })
  @ApiOperation({ summary: "List affected assessment control instances queue." })
  @ApiOkResponse({ description: "Framework update impact queue." })
  async listImpacts(@Req() request: Request, @Query() query: ImpactListQueryDto) {
    const ctx = readRequestContext(request);
    return this.service.listImpacts({
      tenantId: ctx.tenantId,
      assessmentId: query.assessmentId,
      controlInstanceId: query.controlInstanceId,
      status: query.status,
      pagination: toPagination(query)
    });
  }

  @Patch("frameworks/updates/impacts/:id")
  @RequirePolicy({ resourceType: "framework_update_impact", action: "write" })
  @ApiOperation({ summary: "Resolve a framework change impact assessment queue item." })
  @ApiOkResponse({ description: "Resolved impact queue item." })
  async resolveImpact(
    @Req() request: Request,
    @Param("id") impactId: string,
    @Body() dto: ResolveImpactDto
  ) {
    const ctx = readRequestContext(request);
    return this.service.resolveImpact({
      tenantId: ctx.tenantId,
      impactId,
      status: dto.status,
      resolutionRationale: dto.resolutionRationale,
      resolvedBy: ctx.userId
    });
  }
}

@ApiTags("PlatformFrameworkUpdates")
@Controller("v1/platform/frameworks")
@UseGuards(PlatformOperatorGuard)
export class PlatformFrameworkUpdateController {
  constructor(@Inject(FrameworkUpdateService) private readonly service: FrameworkUpdateService) {}

  @Get("diffs")
  @ApiOperation({ summary: "List global framework version diffs for platform content governance." })
  @ApiOkResponse({ description: "List of global framework diffs." })
  @ApiUnauthorizedResponse({ description: "Invalid platform operator credentials." })
  @ApiForbiddenResponse({ description: "Insufficient platform operator privileges." })
  async listDiffs(@Query() query: PaginationQueryDto) {
    return this.service.listGlobalDiffs(toPagination(query));
  }

  @Get("diffs/:id/items")
  @ApiOperation({ summary: "List global requirement changes for a framework diff." })
  @ApiOkResponse({ description: "List of global requirement change items." })
  async listDiffItems(@Param("id") diffId: string, @Query() query: PaginationQueryDto) {
    return this.service.listGlobalDiffItems(diffId, toPagination(query));
  }
}
