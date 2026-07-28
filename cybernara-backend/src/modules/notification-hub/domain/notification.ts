// Deterministic, pure computation of "what needs action right now" per role.
// Nothing here is stored - a notification exists exactly as long as its
// underlying condition is true, and disappears the moment the state moves
// past it (item answered, review decided, remediation verified, assessment
// closed). There is no dismiss action because there is nothing to dismiss:
// the feed is recomputed live from current assessment/finding/remediation
// state every time it's requested.

export type UserRole = "platform_admin" | "auditor" | "compliance_manager" | "viewer";

export type NotificationCategory =
  | "pending_answer"
  | "pending_remediation"
  | "review_item"
  | "verify_remediation"
  | "ready_to_close";

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  link: string;
  createdAt: string;
}

export interface AssessmentItemFact {
  itemId: string;
  assessmentId: string;
  scopeName: string;
  assessmentStatus: string;
  itemStatus: string;
  applicable: boolean;
  ownerId: string;
  frameworkKey: string;
  controlId: string;
  referenceAt: string;
}

export interface RemediationFact {
  taskId: string;
  findingId: string;
  findingSeverity: string;
  findingDescription: string;
  ownerId: string;
  status: string;
  dueAt: string;
}

export interface AssessmentCloseReadinessFact {
  assessmentId: string;
  scopeName: string;
  status: string;
  allItemsResolved: boolean;
  referenceAt: string;
}

export interface NotificationInput {
  role: UserRole;
  actorId: string;
  actorIds?: string[];
  items: AssessmentItemFact[];
  remediations: RemediationFact[];
  assessments: AssessmentCloseReadinessFact[];
}

export function computeNotifications(input: NotificationInput): NotificationItem[] {
  const notifications: NotificationItem[] = [];
  const includeEveryone = input.role === "platform_admin";
  const actorIds = new Set([input.actorId, ...(input.actorIds ?? [])]);
  const mine = (ownerId: string) => includeEveryone || actorIds.has(ownerId);

  if (input.role === "compliance_manager" || includeEveryone) {
    const pendingAnswersByAssessment = new Map<string, AssessmentItemFact[]>();
    for (const item of input.items) {
      if (item.assessmentStatus === "closed" || !item.applicable || !mine(item.ownerId)) {
        continue;
      }
      if (item.itemStatus === "not_started" || item.itemStatus === "needs_changes") {
        const existing = pendingAnswersByAssessment.get(item.assessmentId) ?? [];
        existing.push(item);
        pendingAnswersByAssessment.set(item.assessmentId, existing);
      }
    }
    for (const items of pendingAnswersByAssessment.values()) {
      const firstItem = items[0];
      const references = Array.from(new Set(items.map((item) => `${item.frameworkKey} ${item.controlId}`)));
      const hasChangesRequested = items.some((item) => item.itemStatus === "needs_changes");
      const referenceText = references.join("; ");
      notifications.push({
        id: `pending_answer:${firstItem.assessmentId}`,
        category: "pending_answer",
        title: `Submit answer & evidence for ${firstItem.scopeName}`,
        description: hasChangesRequested
          ? `Reviewer requested changes across ${references.length} framework mapping${references.length === 1 ? "" : "s"}: ${referenceText}.`
          : `Awaiting your answer across ${references.length} framework mapping${references.length === 1 ? "" : "s"}: ${referenceText}.`,
        link: `/assessments?assessmentId=${firstItem.assessmentId}&itemId=${firstItem.itemId}`,
        createdAt: newestReferenceAt(items)
      });
    }
    for (const task of input.remediations) {
      if (task.status !== "open" || !mine(task.ownerId)) {
        continue;
      }
      notifications.push({
        id: `pending_remediation:${task.taskId}`,
        category: "pending_remediation",
        title: `Execute remediation for finding (${task.findingSeverity} severity)`,
        description: task.findingDescription,
        link: `/risks?findingId=${task.findingId}&taskId=${task.taskId}`,
        createdAt: task.dueAt
      });
    }
  }

  if (input.role === "auditor" || includeEveryone) {
    const reviewItemsByAssessment = new Map<string, AssessmentItemFact[]>();
    for (const item of input.items) {
      if (item.assessmentStatus === "closed") {
        continue;
      }
      if (item.itemStatus === "submitted") {
        const existing = reviewItemsByAssessment.get(item.assessmentId) ?? [];
        existing.push(item);
        reviewItemsByAssessment.set(item.assessmentId, existing);
      }
    }
    for (const items of reviewItemsByAssessment.values()) {
      const firstItem = items[0];
      const references = Array.from(new Set(items.map((item) => `${item.frameworkKey} ${item.controlId}`)));
      notifications.push({
        id: `review_item:${firstItem.assessmentId}`,
        category: "review_item",
        title: `Review required: answer submitted for ${firstItem.scopeName}`,
        description: `${references.length} framework mapping${references.length === 1 ? "" : "s"} awaiting your review: ${references.join("; ")}.`,
        link: `/assessments/review?assessmentId=${firstItem.assessmentId}&itemId=${firstItem.itemId}`,
        createdAt: newestReferenceAt(items)
      });
    }
    for (const task of input.remediations) {
      if (task.status === "in_progress") {
        notifications.push({
          id: `verify_remediation:${task.taskId}`,
          category: "verify_remediation",
          title: `Verification required: remediation submitted (${task.findingSeverity} severity)`,
          description: task.findingDescription,
          link: `/risks?findingId=${task.findingId}&taskId=${task.taskId}&mode=review`,
          createdAt: task.dueAt
        });
      }
    }
    for (const assessment of input.assessments) {
      if (assessment.status !== "closed" && assessment.status !== "not_started" && assessment.allItemsResolved) {
        notifications.push({
          id: `ready_to_close:${assessment.assessmentId}`,
          category: "ready_to_close",
          title: `Ready to close: ${assessment.scopeName}`,
          description: "Every item on this assessment is approved or not applicable.",
          link: `/assessments/review?assessmentId=${assessment.assessmentId}`,
          createdAt: assessment.referenceAt
        });
      }
    }
  }

  return notifications.sort((left, right) => (left.createdAt < right.createdAt ? 1 : -1));
}

function newestReferenceAt(items: AssessmentItemFact[]): string {
  return items.reduce((newest, item) => (item.referenceAt > newest ? item.referenceAt : newest), items[0].referenceAt);
}
