import { Controller, Get, Inject, NotFoundException, Param, Query, Req, UseGuards } from "@nestjs/common";
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import type { Request } from "express";
import { PolicyGuard, RequirePolicy } from "../../platform-hardening/public.js";
import { PlatformOperatorGuard } from "../../identity-tenant/public.js";
import { PaginationQueryDto, toPagination } from "../../../shared/pagination.dto.js";
import { readRequestContext } from "../../../shared/request-context.js";
import { HarmonizationService } from "../application/harmonization.service.js";

@ApiTags("Harmonization")
@ApiUnauthorizedResponse({ description: "Request context headers are missing or invalid." })
@ApiForbiddenResponse({ description: "Platform policy denied the request." })
@UseGuards(PolicyGuard)
@Controller("v1/harmonization")
export class HarmonizationController {
  constructor(@Inject(HarmonizationService) private readonly service: HarmonizationService) {}

  @Get("controls")
  @RequirePolicy({ resourceType: "harmonization", action: "read" })
  @ApiOperation({ summary: "List published harmonized controls." })
  @ApiOkResponse({ description: "Harmonized controls." })
  async listControls(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    return this.service.listControls(context.tenantId, toPagination(query));
  }

  @Get("controls/:harmonizedId")
  @RequirePolicy({ resourceType: "harmonization", action: "read", resourceIdParam: "harmonizedId" })
  @ApiOperation({ summary: "Fetch one harmonized control by harmonized ID." })
  @ApiOkResponse({ description: "Harmonized control." })
  @ApiNotFoundResponse({ description: "Harmonized control not found." })
  async getControl(@Req() request: Request, @Param("harmonizedId") harmonizedId: string) {
    const context = readRequestContext(request);
    const control = await this.service.getControl(context.tenantId, harmonizedId);
    if (!control) {
      throw new NotFoundException("Harmonized control not found.");
    }
    return control;
  }

  @Get("controls/:harmonizedId/mappings")
  @RequirePolicy({ resourceType: "harmonization", action: "read", resourceIdParam: "harmonizedId" })
  @ApiOperation({ summary: "List mappings by harmonized control." })
  @ApiOkResponse({ description: "Mappings for the harmonized control." })
  async listMappingsByControl(
    @Req() request: Request,
    @Param("harmonizedId") harmonizedId: string,
    @Query() query: PaginationQueryDto
  ) {
    const context = readRequestContext(request);
    return this.service.listMappingsByControl(context.tenantId, harmonizedId, toPagination(query));
  }

  @Get("frameworks/:frameworkKey/mappings")
  @RequirePolicy({ resourceType: "harmonization", action: "read", resourceIdParam: "frameworkKey" })
  @ApiOperation({ summary: "List mappings for a source framework." })
  @ApiOkResponse({ description: "Framework mappings." })
  async listMappingsByFramework(
    @Req() request: Request,
    @Param("frameworkKey") frameworkKey: string,
    @Query() query: PaginationQueryDto
  ) {
    const context = readRequestContext(request);
    return this.service.listMappingsByFramework(context.tenantId, frameworkKey, toPagination(query));
  }

  @Get("frameworks/:frameworkKey/unique-controls")
  @RequirePolicy({ resourceType: "harmonization", action: "read", resourceIdParam: "frameworkKey" })
  @ApiOperation({ summary: "List controls unique to a source framework." })
  @ApiOkResponse({ description: "Framework-unique controls." })
  async listUniqueControlsByFramework(
    @Req() request: Request,
    @Param("frameworkKey") frameworkKey: string,
    @Query() query: PaginationQueryDto
  ) {
    const context = readRequestContext(request);
    return this.service.listUniqueControlsByFramework(context.tenantId, frameworkKey, toPagination(query));
  }
}

@ApiTags("PlatformHarmonization")
@ApiUnauthorizedResponse({ description: "Platform operator context headers are missing or invalid." })
@ApiForbiddenResponse({ description: "Platform operator check denied the request." })
@UseGuards(PlatformOperatorGuard)
@Controller("v1/platform/harmonization")
export class PlatformHarmonizationController {
  constructor(@Inject(HarmonizationService) private readonly service: HarmonizationService) {}

  @Get("controls")
  @ApiOperation({ summary: "List global published harmonized controls for platform content governance." })
  @ApiOkResponse({ description: "Global harmonized controls." })
  async listControls(@Query() query: PaginationQueryDto) {
    return this.service.listGlobalControls(toPagination(query));
  }

  @Get("controls/:harmonizedId")
  @ApiOperation({ summary: "Fetch one global harmonized control by harmonized ID." })
  @ApiOkResponse({ description: "Global harmonized control." })
  @ApiNotFoundResponse({ description: "Harmonized control not found." })
  async getControl(@Param("harmonizedId") harmonizedId: string) {
    const control = await this.service.getGlobalControl(harmonizedId);
    if (!control) {
      throw new NotFoundException("Harmonized control not found.");
    }
    return control;
  }

  @Get("controls/:harmonizedId/mappings")
  @ApiOperation({ summary: "List global mappings by harmonized control." })
  @ApiOkResponse({ description: "Global mappings for the harmonized control." })
  async listMappingsByControl(
    @Param("harmonizedId") harmonizedId: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.service.listGlobalMappingsByControl(harmonizedId, toPagination(query));
  }

  @Get("frameworks/:frameworkKey/mappings")
  @ApiOperation({ summary: "List global mappings for a source framework." })
  @ApiOkResponse({ description: "Global framework mappings." })
  async listMappingsByFramework(
    @Param("frameworkKey") frameworkKey: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.service.listGlobalMappingsByFramework(frameworkKey, toPagination(query));
  }

  @Get("frameworks/:frameworkKey/unique-controls")
  @ApiOperation({ summary: "List global controls unique to a source framework." })
  @ApiOkResponse({ description: "Global framework-unique controls." })
  async listUniqueControlsByFramework(
    @Param("frameworkKey") frameworkKey: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.service.listGlobalUniqueControlsByFramework(frameworkKey, toPagination(query));
  }
}
