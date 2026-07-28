import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
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

  @Get("dashboard")
  @ApiOperation({ summary: "Platform super-admin dashboard across all client tenants." })
  @ApiOkResponse({ description: "Platform dashboard aggregate." })
  getDashboard() {
    return this.service.getDashboard();
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

  @Post("tenants/:tenantId/deactivate")
  @HttpCode(200)
  @ApiOperation({ summary: "Suspend a client tenant and revoke tenant-user login access." })
  @ApiOkResponse({ description: "Client tenant suspended." })
  @ApiNotFoundResponse({ description: "Tenant not found." })
  async deactivateTenant(@Req() request: Request, @Param("tenantId") tenantId: string) {
    const context = readPlatformRequestContext(request);
    return this.service.deactivateTenant({
      operatorUserId: context.userId,
      tenantId
    });
  }

  @Post("tenants/:tenantId/activate")
  @HttpCode(200)
  @ApiOperation({ summary: "Reactivate a suspended client tenant and restore tenant-user login access." })
  @ApiOkResponse({ description: "Client tenant activated." })
  @ApiNotFoundResponse({ description: "Tenant not found." })
  async activateTenant(@Req() request: Request, @Param("tenantId") tenantId: string) {
    const context = readPlatformRequestContext(request);
    return this.service.activateTenant({
      operatorUserId: context.userId,
      tenantId
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
