import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
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
import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import type { Request } from "express";
import { PolicyGuard, RequirePolicy } from "../../platform-hardening/public.js";
import { PaginationQueryDto, toPagination } from "../../../shared/pagination.dto.js";
import { readRequestContext } from "../../../shared/request-context.js";
import { AuditLogService } from "../application/audit-log.service.js";
import type { AuditEvent, AuditEventInput } from "../domain/audit-event.js";

const auditClassifications = ["internal", "confidential", "restricted"] as const;

class AuditEventListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  eventType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  targetType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  targetId?: string;

  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsOptional()
  @IsIn(auditClassifications)
  classification?: (typeof auditClassifications)[number];

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

@ApiTags("AuditSecurity")
@Controller("v1/audit/events")
export class AuditSecurityController {
  constructor(@Inject(AuditLogService) private readonly service: AuditLogService) {}

  @Post()
  async append(@Body() body: AuditEventInput) {
    return serializeAuditEvent(await this.service.append(body));
  }

  @Get()
  @UseGuards(PolicyGuard)
  @RequirePolicy({ resourceType: "audit_event", action: "read" })
  @ApiOperation({ summary: "List audit events with optional filters." })
  @ApiOkResponse({ description: "Audit events." })
  @ApiUnauthorizedResponse({ description: "Request context headers are missing or invalid." })
  @ApiForbiddenResponse({ description: "Platform policy denied the request." })
  async list(@Req() request: Request, @Query() query: AuditEventListQueryDto) {
    const context = readRequestContext(request);
    const occurredAtFrom = query.from ? new Date(query.from) : undefined;
    const occurredAtTo = query.to ? new Date(query.to) : undefined;
    if (occurredAtFrom && occurredAtTo && occurredAtFrom.getTime() > occurredAtTo.getTime()) {
      throw new BadRequestException("from must be before or equal to to.");
    }

    const events = await this.service.list({
      tenantId: context.tenantId,
      filters: {
        eventType: query.eventType,
        targetType: query.targetType,
        targetId: query.targetId,
        actorId: query.actorId,
        classification: query.classification,
        occurredAtFrom,
        occurredAtTo
      },
      pagination: toPagination(query)
    });
    return events.map(serializeAuditEvent);
  }

  @Get(":eventId")
  @UseGuards(PolicyGuard)
  @RequirePolicy({ resourceType: "audit_event", action: "read", resourceIdParam: "eventId" })
  @ApiOperation({ summary: "Fetch a single audit event by ID, scoped to the caller's tenant." })
  @ApiOkResponse({ description: "Audit event." })
  @ApiUnauthorizedResponse({ description: "Request context headers are missing or invalid." })
  @ApiForbiddenResponse({ description: "Platform policy denied the request." })
  async findById(@Req() request: Request, @Param("eventId") eventId: string) {
    const context = readRequestContext(request);
    const event = await this.service.findById(context.tenantId, eventId);
    if (!event) {
      throw new NotFoundException("Audit event not found.");
    }

    return serializeAuditEvent(event);
  }
}

function serializeAuditEvent(event: AuditEvent) {
  return {
    ...event,
    sequence: event.sequence.toString()
  };
}
