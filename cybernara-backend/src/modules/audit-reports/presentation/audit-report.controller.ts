import { Controller, Get, Headers, Inject, NotFoundException, Param, Post, Query, Req, StreamableFile, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { PolicyGuard, RequirePolicy } from "../../platform-hardening/public.js";
import { PaginationQueryDto, toPagination } from "../../../shared/pagination.dto.js";
import { readRequestContext } from "../../../shared/request-context.js";
import { AuditReportService } from "../application/audit-report.service.js";

@ApiTags("audit-reports")
@Controller("v1/audit-reports")
@UseGuards(PolicyGuard)
export class AuditReportController {
  constructor(@Inject(AuditReportService) private readonly service: AuditReportService) {}

  @Get("closed-assessments")
  @RequirePolicy({ resourceType: "audit_report", action: "read" })
  async listClosedAssessments(@Req() req: Request, @Query() pagination: PaginationQueryDto) {
    const context = readRequestContext(req);
    return this.service.listClosedAssessments(context.tenantId, toPagination(pagination));
  }

  @Get("assessments/:assessmentId")
  @RequirePolicy({ resourceType: "audit_report", action: "read", resourceIdParam: "assessmentId" })
  async listReportsForAssessment(@Req() req: Request, @Param("assessmentId") assessmentId: string) {
    const context = readRequestContext(req);
    return this.service.listReportsForAssessment(context.tenantId, assessmentId);
  }

  @Post("assessments/:assessmentId/generate")
  @RequirePolicy({ resourceType: "audit_report", action: "write", resourceIdParam: "assessmentId" })
  async generate(
    @Req() req: Request,
    @Param("assessmentId") assessmentId: string,
    @Headers("idempotency-key") idempotencyKey: string
  ) {
    const context = readRequestContext(req);
    if (!idempotencyKey) {
      throw new NotFoundException("Idempotency-Key header is required.");
    }
    return this.service.generateReport({
      tenantId: context.tenantId,
      actorId: context.userId,
      assessmentId,
      idempotencyKey
    });
  }

  @Get(":reportId")
  @RequirePolicy({ resourceType: "audit_report", action: "read", resourceIdParam: "reportId" })
  async getReport(@Req() req: Request, @Param("reportId") reportId: string) {
    const context = readRequestContext(req);
    return this.service.getReport(context.tenantId, reportId);
  }

  @Get(":reportId/download")
  @RequirePolicy({ resourceType: "audit_report", action: "read", resourceIdParam: "reportId" })
  async download(@Req() req: Request, @Param("reportId") reportId: string): Promise<StreamableFile> {
    const context = readRequestContext(req);
    const bytes = await this.service.downloadArtifact(context.tenantId, reportId);
    return new StreamableFile(bytes, {
      type: "application/pdf",
      disposition: `attachment; filename="audit-report-${reportId}.pdf"`
    });
  }
}
