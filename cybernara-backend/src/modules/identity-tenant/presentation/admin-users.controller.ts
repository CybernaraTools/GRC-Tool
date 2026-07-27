import { Body, Controller, Get, Inject, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { IsEmail, IsIn, IsOptional, IsString } from "class-validator";
import type { Request } from "express";
import { PolicyGuard, RequirePolicy, type Classification } from "../../platform-hardening/public.js";
import { AdminUsersService } from "../application/admin-users.service.js";
import { clearanceLevels } from "../application/admin-role-catalog.js";
import type { AdminUserStatus } from "../application/admin-users.types.js";
import { readRequestContext } from "../../../shared/request-context.js";

const userStatuses: AdminUserStatus[] = ["active", "invited", "disabled"];

class InviteAdminUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsString()
  roleKey!: string;

  @IsIn(clearanceLevels)
  clearance!: Classification;
}

class UpdateAdminUserDto {
  @IsOptional()
  @IsIn(userStatuses)
  status?: AdminUserStatus;

  @IsOptional()
  @IsString()
  roleKey?: string;

  @IsOptional()
  @IsIn(clearanceLevels)
  clearance?: Classification;
}

@ApiTags("Admin")
@ApiUnauthorizedResponse({ description: "Request context headers are missing or invalid." })
@ApiForbiddenResponse({ description: "Platform policy denied the request." })
@UseGuards(PolicyGuard)
@Controller("v1/admin")
export class AdminUsersController {
  constructor(@Inject(AdminUsersService) private readonly service: AdminUsersService) {}

  @Get("roles")
  @RequirePolicy({ resourceType: "admin_role", action: "read" })
  @ApiOperation({ summary: "List tenant admin roles and clearance levels." })
  @ApiOkResponse({ description: "Admin role catalog." })
  listRoles() {
    return this.service.listRoles();
  }

  @Get("users")
  @RequirePolicy({ resourceType: "admin_user", action: "read" })
  @ApiOperation({ summary: "List users in the current tenant." })
  @ApiOkResponse({ description: "Tenant users." })
  async listUsers(@Req() request: Request) {
    const context = readRequestContext(request);
    return this.service.listUsers(context.tenantId);
  }

  @Get("users/assignable")
  @RequirePolicy({ resourceType: "assessment", action: "write" })
  @ApiOperation({ summary: "Minimal user list (id/email/display name/roles) for assigning ownership of new work - no admin_user:read required." })
  @ApiOkResponse({ description: "Assignable tenant users." })
  async listAssignableUsers(@Req() request: Request) {
    const context = readRequestContext(request);
    return this.service.listAssignableUsers(context.tenantId);
  }

  @Post("users/invite")
  @RequirePolicy({ resourceType: "admin_user", action: "write" })
  @ApiOperation({ summary: "Invite a tenant user and seed Cybernara role metadata." })
  @ApiCreatedResponse({ description: "Tenant user invited." })
  @ApiBadRequestResponse({ description: "Invalid invite request." })
  async inviteUser(@Req() request: Request, @Body() body: InviteAdminUserDto) {
    const context = readRequestContext(request);
    return this.service.inviteUser({
      tenantId: context.tenantId,
      actorId: context.userId,
      email: body.email,
      displayName: body.displayName,
      roleKey: body.roleKey,
      clearance: body.clearance
    });
  }

  @Patch("users/:id")
  @RequirePolicy({ resourceType: "admin_user", action: "write", resourceIdParam: "id" })
  @ApiOperation({ summary: "Update a tenant user's active status, role, or clearance." })
  @ApiOkResponse({ description: "Tenant user updated." })
  @ApiBadRequestResponse({ description: "Invalid update request." })
  async updateUser(@Req() request: Request, @Param("id") id: string, @Body() body: UpdateAdminUserDto) {
    const context = readRequestContext(request);
    return this.service.updateUser({
      tenantId: context.tenantId,
      actorId: context.userId,
      userId: id,
      status: body.status,
      roleKey: body.roleKey,
      clearance: body.clearance
    });
  }
}
