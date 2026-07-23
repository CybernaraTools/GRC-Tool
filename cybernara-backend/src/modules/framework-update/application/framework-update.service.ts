
import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { AuditLogService } from "../../audit-security/public.js";
import { OutboxService } from "../../outbox/public.js";
import { FRAMEWORK_UPDATE_REPOSITORY, type FrameworkUpdateRepository } from "./framework-update.types.js";
import { TasksService } from "../../tasks/public.js";
import { CANONICAL_CONTENT_TENANT_ID } from "../../framework-content/public.js";
import type { Pagination } from "../../../shared/pagination.js";
import type { FrameworkDiffItem } from "../domain/diff.js";

@Injectable()
export class FrameworkUpdateService {
  constructor(
    @Inject(FRAMEWORK_UPDATE_REPOSITORY) private readonly repository: FrameworkUpdateRepository,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(AuditLogService) private readonly auditLog: AuditLogService,
    @Inject(TasksService) private readonly tasksService: TasksService
  ) {}

  async calculateAndApplyDiff(input: {
    tenantId: string;
    frameworkKey: string;
    fromVersionKey: string;
    toVersionKey: string;
    createdBy: string;
    idempotencyKey: string;
  }) {
    const ids = await this.repository.resolveVersionIds(
      input.tenantId,
      input.frameworkKey,
      input.fromVersionKey,
      input.toVersionKey
    );
    if (!ids) {
      throw new Error(`Invalid framework key "${input.frameworkKey}" or version keys.`);
    }
    const { frameworkId, fromVersionId, toVersionId } = ids;

    const fromControls = await this.repository.fetchVersionControls(input.tenantId, fromVersionId);
    const toControls = await this.repository.fetchVersionControls(input.tenantId, toVersionId);

    const fromMap = new Map<string, Record<string, unknown>>(fromControls.map((c: unknown) => [(c as Record<string, unknown>).controlKey as string, c as Record<string, unknown>]));
    const toMap = new Map<string, Record<string, unknown>>(toControls.map((c: unknown) => [(c as Record<string, unknown>).controlKey as string, c as Record<string, unknown>]));

    const diffItems: Omit<FrameworkDiffItem, "id" | "version" | "createdBy" | "createdAt" | "diffId">[] = [];

    // Added and Modified
    for (const [key, toCtrl] of toMap.entries()) {
      const fromCtrl = fromMap.get(key);
      if (!fromCtrl) {
        diffItems.push({
          tenantId: input.tenantId,
          changeType: "added",
          controlKey: key,
          newValue: { title: toCtrl.title, requirementText: toCtrl.requirementText, citation: toCtrl.citation }
        });
      } else {
        const titleChanged = fromCtrl.title !== toCtrl.title;
        const textChanged = fromCtrl.requirementText !== toCtrl.requirementText;
        const citationChanged = fromCtrl.citation !== toCtrl.citation;
        if (titleChanged || textChanged || citationChanged) {
          diffItems.push({
            tenantId: input.tenantId,
            changeType: "modified",
            controlKey: key,
            oldValue: { title: fromCtrl.title, requirementText: fromCtrl.requirementText, citation: fromCtrl.citation },
            newValue: { title: toCtrl.title, requirementText: toCtrl.requirementText, citation: toCtrl.citation }
          });
        }
      }
    }

    // Removed
    for (const [key, fromCtrl] of fromMap.entries()) {
      if (!toMap.has(key)) {
        diffItems.push({
          tenantId: input.tenantId,
          changeType: "removed",
          controlKey: key,
          oldValue: { title: fromCtrl.title, requirementText: fromCtrl.requirementText, citation: fromCtrl.citation }
        });
      }
    }

    const diff = await this.repository.createDiff({
      tenantId: input.tenantId,
      frameworkId,
      fromVersionId,
      toVersionId,
      createdBy: input.createdBy,
      items: diffItems
    });

    const activeInstances = await this.repository.fetchActiveControlInstances(input.tenantId, fromVersionId);
    
    // Fetch newly created diff items to match database IDs
    const createdItems = await this.repository.listDiffItems(input.tenantId, diff.id, { limit: 1000, offset: 0 });
    const itemsMap = new Map<string, string>(createdItems.map(item => [item.controlKey, item.id]));

    const impacts: { diffItemId: string; assessmentId: string; controlInstanceId?: string }[] = [];
    for (const inst of activeInstances as Record<string, unknown>[]) {
      const diffItemId = itemsMap.get(inst.controlKey as string);
      if (diffItemId) {
        impacts.push({
          diffItemId,
          assessmentId: inst.assessmentId as string,
          controlInstanceId: inst.controlInstanceId as string
        });
      }
    }

    if (impacts.length > 0) {
      const createdImpacts = await this.repository.createImpacts({
        tenantId: input.tenantId,
        createdBy: input.createdBy,
        impacts
      });

      for (const impact of createdImpacts) {
        const inst = (activeInstances as Record<string, unknown>[]).find((i) => i.controlInstanceId === impact.controlInstanceId);
        const ownerId = (inst?.ownerId as string) ?? input.createdBy; // Fallback to updater if instance has no owner
        await this.tasksService.createTask({
          tenantId: input.tenantId,
          actorId: input.createdBy,
          idempotencyKey: `${input.idempotencyKey}-impact-${impact.id}`,
          title: `Framework update impact review required`,
          description: `A framework update has impacted control instance ${impact.controlInstanceId}. Please review and resolve.`,
          priority: "high",
          ownerId,
          targetType: "framework_update_impact",
          targetId: impact.id
        });
      }
    }

    // 4. Log events
    const now = new Date();
    await this.outbox.publish({
      tenantId: input.tenantId,
      eventType: "framework_update.diff_created",
      aggregateType: "framework_diff",
      aggregateId: diff.id,
      payload: { diffId: diff.id, impactCount: impacts.length },
      idempotencyKey: input.idempotencyKey,
      createdBy: input.createdBy,
      now
    });

    await this.auditLog.append({
      tenantId: input.tenantId,
      eventType: "framework_update.diff_created",
      actorId: input.createdBy,
      targetType: "framework_diff",
      targetId: diff.id,
      traceId: input.idempotencyKey,
      classification: "restricted",
      body: { diffId: diff.id, impactCount: impacts.length }
    });

    return diff;
  }

  async listDiffs(tenantId: string, pagination: Pagination) {
    return this.repository.listDiffs(tenantId, pagination);
  }

  async listGlobalDiffs(pagination: Pagination) {
    return this.repository.listDiffs(CANONICAL_CONTENT_TENANT_ID, pagination);
  }

  async listDiffItems(tenantId: string, diffId: string, pagination: Pagination) {
    return this.repository.listDiffItems(tenantId, diffId, pagination);
  }

  async listGlobalDiffItems(diffId: string, pagination: Pagination) {
    return this.repository.listDiffItems(CANONICAL_CONTENT_TENANT_ID, diffId, pagination);
  }

  async listImpacts(input: {
    tenantId: string;
    assessmentId?: string;
    controlInstanceId?: string;
    status?: string;
    pagination: Pagination;
  }) {
    return this.repository.listImpacts(input);
  }

  async resolveImpact(input: {
    tenantId: string;
    impactId: string;
    status: string;
    resolutionRationale: string;
    resolvedBy: string;
  }) {
    const impact = await this.repository.findImpact(input.tenantId, input.impactId);
    if (!impact) {
      throw new Error("Framework update impact item not found.");
    }

    const updated = await this.repository.updateImpact({
      tenantId: input.tenantId,
      impactId: input.impactId,
      status: input.status,
      resolutionRationale: input.resolutionRationale,
      resolvedBy: input.resolvedBy,
      updatedBy: input.resolvedBy
    });

    await this.auditLog.append({
      tenantId: input.tenantId,
      eventType: "framework_update.impact_resolved",
      actorId: input.resolvedBy,
      targetType: "framework_update_impact",
      targetId: input.impactId,
      traceId: randomUUID(),
      classification: "restricted",
      body: { impactId: input.impactId, status: input.status, rationale: input.resolutionRationale }
    });

    return updated;
  }
}
