import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import type { Request } from "express";
import type { Classification } from "../../platform-hardening/public.js";
import { clearanceLevels } from "../application/admin-role-catalog.js";
import { PlatformOnboardingService } from "../application/platform-onboarding.service.js";
import { PlatformOperatorGuard, readPlatformRequestContext } from "../application/platform-operator.guard.js";

class CreatePlatformTenantDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsIn(clearanceLevels)
  classification?: Classification;
}

class InviteFirstTenantAdminDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  roleKey?: string;

  @IsOptional()
  @IsIn(clearanceLevels)
  clearance?: Classification;
}

@ApiTags("Platform")
@ApiUnauthorizedResponse({ description: "Platform operator context headers are missing or invalid." })
@ApiForbiddenResponse({ description: "Platform operator check denied the request." })
@UseGuards(PlatformOperatorGuard)
@Controller("v1/platform")
export class PlatformOnboardingController {
  constructor(@Inject(PlatformOnboardingService) private readonly service: PlatformOnboardingService) {}

  @Get("tenants")
  @ApiOperation({ summary: "List client tenants for platform onboarding oversight." })
  @ApiOkResponse({ description: "Client tenants." })
  listTenants() {
    return this.service.listTenants();
  }

  @Post("tenants")
  @ApiOperation({ summary: "Create a new client tenant." })
  @ApiCreatedResponse({ description: "Client tenant created." })
  @ApiBadRequestResponse({ description: "Invalid tenant request." })
  async createTenant(@Req() request: Request, @Body() body: CreatePlatformTenantDto) {
    const context = readPlatformRequestContext(request);
    return this.service.createTenant({
      operatorUserId: context.userId,
      name: body.name,
      classification: body.classification
    });
  }

  @Post("tenants/:tenantId/admin-invite")
  @ApiOperation({ summary: "Create the first tenant-scoped admin for a client tenant." })
  @ApiCreatedResponse({ description: "Tenant admin invited." })
  @ApiBadRequestResponse({ description: "Invalid admin invite request." })
  @ApiNotFoundResponse({ description: "Tenant not found." })
  async inviteFirstAdmin(
    @Req() request: Request,
    @Param("tenantId") tenantId: string,
    @Body() body: InviteFirstTenantAdminDto
  ) {
    const context = readPlatformRequestContext(request);
    return this.service.inviteFirstAdmin({
      operatorUserId: context.userId,
      tenantId,
      email: body.email,
      displayName: body.displayName,
      roleKey: body.roleKey,
      clearance: body.clearance
    });
  }
}
