import { Inject, Injectable } from "@nestjs/common";
import { AuditLogService } from "../../audit-security/public.js";
import { ingestHarmonizationWorkbooks } from "../../harmonization/public.js";
import { OutboxService } from "../../outbox/public.js";
import { CANONICAL_CONTENT_TENANT_ID } from "../domain/canonical-catalog.js";
import { ingestFrameworkContentPacks } from "./framework-workbook-adapters.js";
import type { ContentIngestionResult } from "../domain/content-pack.js";
import { FRAMEWORK_CONTENT_REPOSITORY } from "./tokens.js";
import type {
  ContentIngestionInput,
  ContentIngestionPublishResult,
  FrameworkContentRepository
} from "./framework-content.types.js";
import type { Pagination } from "../../../shared/pagination.js";

@Injectable()
export class ContentIngestionService {
  constructor(
    @Inject(FRAMEWORK_CONTENT_REPOSITORY) private readonly repository: FrameworkContentRepository,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(AuditLogService) private readonly auditLog: AuditLogService
  ) {}

  async ingestSources(sourcesDir: string): Promise<ContentIngestionResult> {
    const packs = await ingestFrameworkContentPacks(sourcesDir);
    return {
      packs,
      rejectedRecords: packs.flatMap((pack) => pack.rejectedRecords)
    };
  }

  async publishSources(input: ContentIngestionInput): Promise<ContentIngestionPublishResult> {
    const packs = await ingestFrameworkContentPacks(input.sourcesDir);
    const harmonization = await ingestHarmonizationWorkbooks(input.sourcesDir, resolvableControlIds(packs));
    const published = await this.repository.publishIngestion({
      tenantId: input.tenantId,
      actorId: input.actorId,
      packs,
      harmonization
    });
    const rowCounts = await this.repository.countRows(input.tenantId);
    const now = new Date();
    const outboxEvent = await this.outbox.publish({
      tenantId: input.tenantId,
      eventType: "framework_content.ingestion_published",
      aggregateType: "framework_content_ingestion",
      aggregateId: input.idempotencyKey,
      payload: { published, rowCounts },
      idempotencyKey: input.idempotencyKey,
      createdBy: input.actorId,
      now
    });
    const isNewOutboxEvent = outboxEvent.createdAt.getTime() === now.getTime();
    const auditEvent = isNewOutboxEvent
      ? await this.auditLog.append({
          tenantId: input.tenantId,
          eventType: "framework_content.ingestion_published",
          actorId: input.actorId,
          targetType: "framework_content_ingestion",
          targetId: input.idempotencyKey,
          traceId: input.idempotencyKey,
          classification: "restricted",
          body: { published, rowCounts }
        })
      : null;

    return {
      parsed: {
        contentPackCount: packs.length,
        requirementCount: packs.reduce((count, pack) => count + pack.requirements.length, 0),
        harmonizedControlRowCount: harmonization.controls.length,
        acceptedMappingCount: harmonization.mappings.length,
        rejectedRecordCount: packs.reduce((count, pack) => count + pack.rejectedRecords.length, 0) + harmonization.rejectedRecords.length
      },
      published,
      rowCounts,
      outboxEventId: outboxEvent.id,
      auditEventId: auditEvent?.id ?? null
    };
  }

  async listSourcePackages(tenantId: string, pagination: Pagination) {
    void tenantId;
    return this.repository.listSourcePackages(catalogReadTenantId(), pagination);
  }

  async listContentPacks(tenantId: string, pagination: Pagination) {
    void tenantId;
    return this.repository.listContentPacks(catalogReadTenantId(), pagination);
  }

  async getContentPack(tenantId: string, packId: string) {
    void tenantId;
    return this.repository.findContentPack(catalogReadTenantId(), packId);
  }

  async listRequirements(input: {
    tenantId: string;
    packId?: string;
    frameworkKey?: string;
    pagination: Pagination;
  }) {
    return this.repository.listRequirements({
      ...input,
      tenantId: catalogReadTenantId()
    });
  }

  async listRejectedRecords(tenantId: string, pagination: Pagination) {
    void tenantId;
    return this.repository.listRejectedRecords(catalogReadTenantId(), pagination);
  }
}

function catalogReadTenantId(): string {
  return CANONICAL_CONTENT_TENANT_ID;
}

function resolvableControlIds(packs: ContentIngestionResult["packs"]): Map<string, Set<string>> {
  return new Map(
    packs.map((pack) => [
      pack.frameworkKey,
      new Set(
        pack.requirements.flatMap((requirement) =>
          [requirement.controlId, requirement.subControlId].filter((value): value is string => Boolean(value))
        )
      )
    ])
  );
}
