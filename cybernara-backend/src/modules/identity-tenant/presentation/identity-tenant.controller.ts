import { Body, Controller, Get, Inject, NotFoundException, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IdentityTenantService } from "../application/identity-tenant.service.js";

class RegisterTenantDto {
  id!: string;
  name!: string;
  createdBy!: string;
  classification?: "public" | "internal" | "confidential" | "restricted";
}

@ApiTags("IdentityTenant")
@Controller("v1/identity/tenants")
export class IdentityTenantController {
  constructor(@Inject(IdentityTenantService) private readonly service: IdentityTenantService) {}

  @Post()
  async registerTenant(@Body() body: RegisterTenantDto) {
    return this.service.registerTenant(body);
  }

  @Get(":tenantId")
  async getTenant(@Param("tenantId") tenantId: string) {
    const tenant = await this.service.getTenant(tenantId);
    if (!tenant) {
      throw new NotFoundException("Tenant not found.");
    }

    return tenant;
  }
}

