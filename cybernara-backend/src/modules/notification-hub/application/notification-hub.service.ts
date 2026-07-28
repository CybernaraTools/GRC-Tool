import { Inject, Injectable } from "@nestjs/common";
import { AssessmentService } from "../../assessment/public.js";
import { AdminUsersService } from "../../identity-tenant/public.js";
import { RiskWorkflowService, type FindingRecord } from "../../risk-workflow/public.js";
import {
  computeNotifications,
  type AssessmentCloseReadinessFact,
  type AssessmentItemFact,
  type NotificationItem,
  type RemediationFact,
  type UserRole
} from "../domain/notification.js";

const PAGE_SIZE = 200;

@Injectable()
export class NotificationHubService {
  constructor(
    @Inject(AssessmentService) private readonly assessments: AssessmentService,
    @Inject(AdminUsersService) private readonly adminUsers: AdminUsersService,
    @Inject(RiskWorkflowService) private readonly riskWorkflow: RiskWorkflowService
  ) {}

  async list(tenantId: string, actorId: string, role: UserRole): Promise<NotificationItem[]> {
    const [allAssessments, allFindings, allRemediationTasks, allUsers] = await Promise.all([
      fetchAllPages((pagination) => this.assessments.list(tenantId, pagination)),
      fetchAllPages((pagination) => this.riskWorkflow.listFindings({ tenantId, pagination })),
      fetchAllPages((pagination) => this.riskWorkflow.listRemediationTasks({ tenantId, pagination })),
      this.adminUsers.listUsers(tenantId)
    ]);

    const findingById = new Map<string, FindingRecord>(allFindings.map((finding) => [finding.id, finding]));
    const actorUser = allUsers.find((user) => user.id === actorId || user.supabaseUserId === actorId);
    const actorIds = actorUser ? [actorUser.id, actorUser.supabaseUserId] : [actorId];

    const items: AssessmentItemFact[] = allAssessments.flatMap((assessment) =>
      assessment.items.map((item) => ({
        itemId: item.id,
        assessmentId: assessment.id,
        scopeName: assessment.scopeName,
        assessmentStatus: assessment.status,
        itemStatus: item.status,
        applicable: item.applicability ? item.applicability.applicable : true,
        ownerId: item.ownerId,
        frameworkKey: item.controlRef.frameworkKey,
        controlId: item.controlRef.controlId,
        referenceAt: assessment.createdAt.toISOString()
      }))
    );

    const remediations: RemediationFact[] = allRemediationTasks.map((task) => {
      const finding = findingById.get(task.findingId);
      return {
        taskId: task.id,
        findingId: task.findingId,
        findingSeverity: finding?.severity ?? "unknown",
        findingDescription: finding?.description ?? "Finding details unavailable.",
        ownerId: task.ownerId,
        status: task.status,
        dueAt: task.dueAt.toISOString()
      };
    });

    const assessmentReadiness: AssessmentCloseReadinessFact[] = allAssessments.map((assessment) => ({
      assessmentId: assessment.id,
      scopeName: assessment.scopeName,
      status: assessment.status,
      allItemsResolved:
        assessment.items.length > 0 &&
        assessment.items.every((item) => item.status === "approved" || (item.applicability ? !item.applicability.applicable : false)),
      referenceAt: assessment.createdAt.toISOString()
    }));

    return computeNotifications({
      role,
      actorId,
      actorIds,
      items,
      remediations,
      assessments: assessmentReadiness
    });
  }
}

async function fetchAllPages<T>(fetchPage: (pagination: { limit: number; offset: number }) => Promise<T[]>): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  for (;;) {
    const page = await fetchPage({ limit: PAGE_SIZE, offset });
    all.push(...page);
    if (page.length < PAGE_SIZE) {
      return all;
    }
    offset += PAGE_SIZE;
  }
}
