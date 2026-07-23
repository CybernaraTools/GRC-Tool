import { Controller, Get, Inject, NotFoundException, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import type { Request } from "express";
import { PolicyGuard, RequirePolicy } from "../../platform-hardening/public.js";
import { PaginationQueryDto, toPagination } from "../../../shared/pagination.dto.js";
import { readRequestContext } from "../../../shared/request-context.js";
import { AuditLogService } from "../application/audit-log.service.js";
import type { AuditCheckpoint, AuditVerification } from "../domain/audit-event.js";

// G-11: a separate controller (not new routes bolted onto `AuditSecurityController`) — that
// controller's base path is `v1/audit/events` and already has a `:eventId` catch-all route; adding
// `checkpoints`/`verifications` under the same base would have `:eventId` swallow a request for
// `GET /v1/audit/events/checkpoints` (eventId="checkpoints") before it ever reached a literal
// "checkpoints" route, since NestJS/Express match routes in registration order. This mirrors the
// same "new sibling controller, not new routes on an existing one" decision already made for
// G-08/G-12's `PrivacyGraphController` (kept separate from `PrivacyOperationsController`).
class VerificationListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  checkpointId?: string;
}

@ApiTags("AuditSecurity")
@Controller("v1/audit")
export class AuditChainController {
  constructor(@Inject(AuditLogService) private readonly service: AuditLogService) {}

  // No idempotency-key pattern exists elsewhere in this module (unlike privacy-operations/
  // evidence-assurance's replay-by-key convention) — matching that, this simply creates the next
  // checkpoint each call; the `unique(chain_partition, start_sequence/end_sequence)` constraints
  // plus the "nothing new since last checkpoint" `ConflictException` make an accidental duplicate
  // call a normal, safe 409 rather than a silent duplicate/overlapping checkpoint.
  @Post("checkpoints")
  @UseGuards(PolicyGuard)
  @RequirePolicy({ resourceType: "audit_checkpoint", action: "write" })
  @ApiOperation({ summary: "Create the next signed checkpoint covering events since the last checkpoint." })
  async createCheckpoint(@Req() request: Request) {
    const context = readRequestContext(request);
    const checkpoint = await this.service.createCheckpoint({ tenantId: context.tenantId, actorId: context.userId });
    return serializeAuditCheckpoint(checkpoint);
  }

  @Get("checkpoints")
  @UseGuards(PolicyGuard)
  @RequirePolicy({ resourceType: "audit_checkpoint", action: "read" })
  @ApiOperation({ summary: "List audit checkpoints, most recent first." })
  async listCheckpoints(@Req() request: Request, @Query() query: PaginationQueryDto) {
    const context = readRequestContext(request);
    const checkpoints = await this.service.listCheckpoints({
      tenantId: context.tenantId,
      pagination: toPagination(query)
    });
    return checkpoints.map(serializeAuditCheckpoint);
  }

  @Get("checkpoints/:checkpointId")
  @UseGuards(PolicyGuard)
  @RequirePolicy({ resourceType: "audit_checkpoint", action: "read", resourceIdParam: "checkpointId" })
  @ApiOperation({ summary: "Fetch a single audit checkpoint." })
  async findCheckpoint(@Req() request: Request, @Param("checkpointId") checkpointId: string) {
    const context = readRequestContext(request);
    const checkpoint = await this.service.findCheckpoint(context.tenantId, checkpointId);
    if (!checkpoint) {
      throw new NotFoundException("Audit checkpoint not found.");
    }
    return serializeAuditCheckpoint(checkpoint);
  }

  // Spec §21: "Verifier independently recomputes chain and signature and writes
  // audit_verifications." Triggering verification synchronously (rather than as a background job)
  // matches this module's existing style (append/list are all synchronous request/response), and
  // keeps the "does this checkpoint's chain still verify" answer immediately available to the
  // caller rather than requiring a poll for a job's completion.
  @Post("checkpoints/:checkpointId/verify")
  @UseGuards(PolicyGuard)
  @RequirePolicy({ resourceType: "audit_checkpoint", action: "write", resourceIdParam: "checkpointId" })
  @ApiOperation({ summary: "Independently recompute the chain and signature for a checkpoint and record the result." })
  async verifyCheckpoint(@Req() request: Request, @Param("checkpointId") checkpointId: string) {
    const context = readRequestContext(request);
    const verification = await this.service.verifyCheckpoint({
      tenantId: context.tenantId,
      checkpointId,
      actorId: context.userId
    });
    return serializeAuditVerification(verification);
  }

  @Get("verifications")
  @UseGuards(PolicyGuard)
  @RequirePolicy({ resourceType: "audit_checkpoint", action: "read" })
  @ApiOperation({ summary: "List recorded verifier outcomes, optionally filtered to one checkpoint." })
  async listVerifications(@Req() request: Request, @Query() query: VerificationListQueryDto) {
    const context = readRequestContext(request);
    const verifications = await this.service.listVerifications({
      tenantId: context.tenantId,
      checkpointId: query.checkpointId,
      pagination: toPagination(query)
    });
    return verifications.map(serializeAuditVerification);
  }
}

function serializeAuditCheckpoint(checkpoint: AuditCheckpoint) {
  return {
    ...checkpoint,
    startSequence: checkpoint.startSequence.toString(),
    endSequence: checkpoint.endSequence.toString()
  };
}

function serializeAuditVerification(verification: AuditVerification) {
  return {
    ...verification,
    mismatchSequence: verification.mismatchSequence?.toString()
  };
}
