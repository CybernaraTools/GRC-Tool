import { randomUUID } from "node:crypto";

export type AssessmentStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "needs_changes"
  | "approved"
  | "closed";

export interface PinnedControlRef {
  frameworkKey: string;
  frameworkVersion: string;
  mappingVersion: string;
  controlId: string;
  harmonizedControlId: string;
  questionVersion: string;
  questionVersionId?: string;
}

export interface AssessmentItem {
  id: string;
  controlRef: PinnedControlRef;
  status: AssessmentStatus;
  ownerId: string;
  answerText?: string;
  evidenceIds: string[];
  applicability: {
    applicable: boolean;
    rationale: string;
    approvedBy: string;
    approvedAt: Date;
  } | null;
}

export interface Assessment {
  id: string;
  tenantId: string;
  scopeName: string;
  status: AssessmentStatus;
  controlSnapshotVersion: string;
  items: AssessmentItem[];
  createdBy: string;
  createdAt: Date;
}

export function createAssessment(input: {
  tenantId: string;
  scopeName: string;
  controls: PinnedControlRef[];
  createdBy: string;
  ownerId: string;
  now?: Date;
}): Assessment {
  if (input.controls.length === 0) {
    throw new Error("Assessment requires at least one pinned control.");
  }

  const now = input.now ?? new Date();
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    scopeName: input.scopeName,
    status: "not_started",
    controlSnapshotVersion: buildSnapshotVersion(input.controls),
    createdBy: input.createdBy,
    createdAt: now,
    items: input.controls.map((controlRef) => ({
      id: randomUUID(),
      controlRef,
      status: "not_started",
      ownerId: input.ownerId,
      evidenceIds: [],
      applicability: null
    }))
  };
}

export function reviseDraftAssessment(input: {
  assessmentId: string;
  tenantId: string;
  scopeName: string;
  controls: PinnedControlRef[];
  updatedBy: string;
  ownerId: string;
  now?: Date;
}): Assessment {
  if (input.controls.length === 0) {
    throw new Error("Assessment requires at least one pinned control.");
  }

  const now = input.now ?? new Date();
  return {
    id: input.assessmentId,
    tenantId: input.tenantId,
    scopeName: input.scopeName,
    status: "not_started",
    controlSnapshotVersion: buildSnapshotVersion(input.controls),
    createdBy: input.updatedBy,
    createdAt: now,
    items: input.controls.map((controlRef) => ({
      id: randomUUID(),
      controlRef,
      status: "not_started",
      ownerId: input.ownerId,
      evidenceIds: [],
      applicability: null
    }))
  };
}

export function approveApplicability(
  item: AssessmentItem,
  decision: { applicable: boolean; rationale: string; approvedBy: string; approvedAt?: Date }
): AssessmentItem {
  if (!decision.rationale.trim()) {
    throw new Error("Applicability decisions require rationale.");
  }

  return {
    ...item,
    applicability: {
      applicable: decision.applicable,
      rationale: decision.rationale,
      approvedBy: decision.approvedBy,
      approvedAt: decision.approvedAt ?? new Date()
    },
    status: "in_progress"
  };
}

export function submitAnswer(
  item: AssessmentItem,
  input: { answerText: string; evidenceIds: string[] }
): AssessmentItem {
  if (!item.applicability) {
    throw new Error("Applicability must be approved before answering.");
  }
  if (item.applicability.applicable && input.evidenceIds.length === 0) {
    throw new Error("Applicable assessment items require evidence before submission.");
  }

  return {
    ...item,
    answerText: input.answerText,
    evidenceIds: [...input.evidenceIds],
    status: "submitted"
  };
}

export function reviewItem(
  item: AssessmentItem,
  input: { approved: boolean; reviewerId: string; reason?: string }
): AssessmentItem {
  if (item.status !== "submitted") {
    throw new Error("Only submitted items can be reviewed.");
  }
  if (!input.approved && !input.reason?.trim()) {
    throw new Error("Needs-changes review requires a reason.");
  }

  return {
    ...item,
    status: input.approved ? "approved" : "needs_changes"
  };
}

export function closeAssessment(assessment: Assessment, actorId: string): Assessment {
  if (!assessment.items.every((item) => item.status === "approved")) {
    throw new Error("All assessment items must be approved before close.");
  }
  if (!actorId) {
    throw new Error("Close requires an actor.");
  }

  return { ...assessment, status: "closed" };
}

export function reopenItem(
  item: AssessmentItem,
  input: { reviewerId: string; reason: string }
): AssessmentItem {
  if (item.status !== "approved" && item.status !== "closed") {
    throw new Error("Only approved or closed items can be reopened.");
  }
  if (!input.reviewerId || !input.reason.trim()) {
    throw new Error("Reopen requires authorized reviewer and reason.");
  }

  return { ...item, status: "needs_changes" };
}

function buildSnapshotVersion(controls: PinnedControlRef[]): string {
  return controls
    .map((control) =>
      [
        control.frameworkKey,
        control.frameworkVersion,
        control.mappingVersion,
        control.controlId,
        control.harmonizedControlId,
        control.questionVersion,
        control.questionVersionId ?? ""
      ].join(":")
    )
    .sort()
    .join("|");
}
