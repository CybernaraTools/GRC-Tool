import { randomUUID } from "node:crypto";

export interface Finding {
  id: string;
  tenantId: string;
  // G-03 (spec §11/§12): a finding must originate from at least one real source — a manual
  // assessment item or an automated/manual control test result — but not necessarily both.
  // Enforced here (createFinding) and by the DB's findings_has_source CHECK constraint.
  assessmentItemId: string | null;
  testResultId: string | null;
  severity: "low" | "medium" | "high" | "critical";
  impact?: "low" | "medium" | "high" | "critical" | null;
  likelihood?: "rare" | "unlikely" | "possible" | "likely" | "almost_certain" | null;
  ownerId?: string | null;
  dueAt?: Date | null;
  description: string;
  createdAt: Date;
}

export interface RemediationTask {
  id: string;
  findingId: string;
  ownerId: string;
  dueAt: Date;
  status: "open" | "in_progress" | "verified" | "risk_accepted";
}

export interface RemediationTaskReview {
  id: string;
  remediationTaskId: string;
  reviewerId: string;
  decision: "approved" | "rejected";
  rationale: string;
  evidenceVersionIds: string[];
  reviewedAt: Date;
}

export function createFinding(input: Omit<Finding, "id" | "createdAt"> & { now?: Date }): Finding {
  if (!input.assessmentItemId && !input.testResultId) {
    throw new Error("A finding requires at least one source: an assessment item or a control test result.");
  }
  if (input.dueAt && input.dueAt <= new Date("2000-01-01T00:00:00.000Z")) {
    throw new Error("Finding due date is invalid.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    assessmentItemId: input.assessmentItemId,
    testResultId: input.testResultId,
    severity: input.severity,
    impact: input.impact ?? null,
    likelihood: input.likelihood ?? null,
    ownerId: input.ownerId ?? null,
    dueAt: input.dueAt ?? null,
    description: input.description,
    createdAt: input.now ?? new Date()
  };
}

export function createRemediationTask(input: Omit<RemediationTask, "id" | "status">): RemediationTask {
  if (input.dueAt <= new Date("2000-01-01T00:00:00.000Z")) {
    throw new Error("Remediation due date is invalid.");
  }

  return {
    id: randomUUID(),
    findingId: input.findingId,
    ownerId: input.ownerId,
    dueAt: input.dueAt,
    status: "open"
  };
}

export function acceptRisk(
  task: RemediationTask,
  input: { acceptedBy: string; reason: string }
): RemediationTask {
  if (!input.acceptedBy || !input.reason.trim()) {
    throw new Error("Risk acceptance requires actor and reason.");
  }

  return { ...task, status: "risk_accepted" };
}

export function reviewRemediationTask(input: {
  remediationTaskId: string;
  reviewerId: string;
  decision: RemediationTaskReview["decision"];
  rationale: string;
  evidenceVersionIds?: string[];
  now?: Date;
}): RemediationTaskReview {
  if (!input.reviewerId) {
    throw new Error("Remediation review requires a reviewer.");
  }
  if (!input.rationale.trim()) {
    throw new Error("Remediation review requires a rationale.");
  }

  return {
    id: randomUUID(),
    remediationTaskId: input.remediationTaskId,
    reviewerId: input.reviewerId,
    decision: input.decision,
    rationale: input.rationale,
    evidenceVersionIds: input.evidenceVersionIds ?? [],
    reviewedAt: input.now ?? new Date()
  };
}

export interface RiskAcceptance {
  id: string;
  tenantId: string;
  remediationTaskId: string;
  findingId: string;
  // G-09 (0019_g09_enterprise_grc_risk_register.sql): optional link to the
  // enterprise risk register, completing the linkage this table's own
  // migration comment (0010_g03_risk_acceptances.sql) flagged as blocked on
  // G-09 not existing yet. Nullable: acceptances created before a matching
  // `risks` row existed (or that never needed one) leave this unset.
  riskId?: string;
  rationale: string;
  approverId: string;
  approvedAt: Date;
  expiresAt: Date;
  nextReviewDueAt: Date;
  compensatingControls?: string;
  supersededAt?: Date;
  supersededById?: string;
}

export interface RiskAcceptanceReview {
  id: string;
  riskAcceptanceId: string;
  reviewerId: string;
  decision: "reaffirmed" | "revoked" | "escalated";
  reason: string;
  reviewedAt: Date;
}

/**
 * Formal risk acceptance per schema spec §12/§18: acceptance cannot be
 * represented by task status alone, and requires an approver, rationale,
 * expiry, and a scheduled next review — all distinct from (and in addition
 * to) the remediation_tasks.status flip the pre-remediation schema relied on
 * exclusively.
 */
export function createRiskAcceptance(input: {
  tenantId: string;
  remediationTaskId: string;
  findingId: string;
  riskId?: string;
  rationale: string;
  approverId: string;
  expiresAt: Date;
  nextReviewDueAt: Date;
  compensatingControls?: string;
  now?: Date;
}): RiskAcceptance {
  const approvedAt = input.now ?? new Date();
  if (!input.approverId) {
    throw new Error("Risk acceptance requires an approver.");
  }
  if (!input.rationale.trim()) {
    throw new Error("Risk acceptance requires a rationale.");
  }
  if (input.expiresAt <= approvedAt) {
    throw new Error("Risk acceptance expiry must be after approval.");
  }
  if (input.nextReviewDueAt <= approvedAt) {
    throw new Error("Risk acceptance review schedule must be after approval.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    remediationTaskId: input.remediationTaskId,
    findingId: input.findingId,
    riskId: input.riskId,
    rationale: input.rationale,
    approverId: input.approverId,
    approvedAt,
    expiresAt: input.expiresAt,
    nextReviewDueAt: input.nextReviewDueAt,
    compensatingControls: input.compensatingControls
  };
}

/**
 * The schema spec's completeness rule, made explicit and testable: an
 * acceptance is only "active" while it has neither expired nor been
 * superseded, AND its next scheduled review has not itself lapsed. A
 * superseded/expired/overdue-review acceptance must not be treated as a
 * still-valid reason to leave a remediation task closed.
 */
export function isRiskAcceptanceActive(acceptance: RiskAcceptance, now: Date = new Date()): boolean {
  if (acceptance.supersededAt) {
    return false;
  }
  if (acceptance.expiresAt <= now) {
    return false;
  }
  if (acceptance.nextReviewDueAt <= now) {
    return false;
  }
  return true;
}

export function reviewRiskAcceptance(input: {
  riskAcceptanceId: string;
  reviewerId: string;
  decision: RiskAcceptanceReview["decision"];
  reason: string;
  now?: Date;
}): RiskAcceptanceReview {
  if (!input.reviewerId) {
    throw new Error("Risk acceptance review requires a reviewer.");
  }
  if (!input.reason.trim()) {
    throw new Error("Risk acceptance review requires a reason.");
  }

  return {
    id: randomUUID(),
    riskAcceptanceId: input.riskAcceptanceId,
    reviewerId: input.reviewerId,
    decision: input.decision,
    reason: input.reason,
    reviewedAt: input.now ?? new Date()
  };
}

// G-09 Phase 1 (enterprise risk register, migration
// 0019_g09_enterprise_grc_risk_register.sql): the top-level `risks` aggregate
// the gap report names directly ("No complete risk...model"), plus its
// scoring-methodology, relationship, and treatment-plan satellites. Built
// alongside — not replacing — the existing Finding/RemediationTask/
// RiskAcceptance domain above, which stays exactly as-is.

export type RiskModelStatus = "draft" | "active" | "retired";
export type RiskStatus = "identified" | "assessed" | "treatment_planned" | "monitoring" | "closed";
export type RiskLinkTargetType =
  | "finding"
  | "control_instance"
  | "vendor"
  | "evidence_object"
  | "assessment"
  | "requirement_instance";
export type RiskLinkRelationship = "related_to" | "caused_by" | "mitigated_by" | "threatens";
export type RiskTreatmentStrategy = "accept" | "mitigate" | "transfer" | "avoid";
export type RiskTreatmentStatus = "planned" | "in_progress" | "completed" | "cancelled";

export interface RiskModel {
  id: string;
  tenantId: string;
  modelKey: string;
  modelVersion: string;
  scalesJson: Record<string, unknown>;
  formula: string;
  thresholds: Record<string, unknown>;
  status: RiskModelStatus;
}

export function createRiskModel(input: {
  tenantId: string;
  modelKey: string;
  modelVersion: string;
  scalesJson: Record<string, unknown>;
  formula: string;
  thresholds: Record<string, unknown>;
}): RiskModel {
  if (!input.modelKey.trim() || !input.formula.trim()) {
    throw new Error("Risk models require a model key and a formula.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    modelKey: input.modelKey,
    modelVersion: input.modelVersion,
    scalesJson: input.scalesJson,
    formula: input.formula,
    thresholds: input.thresholds,
    status: "active"
  };
}

export interface Risk {
  id: string;
  tenantId: string;
  workspaceId?: string;
  riskModelId?: string;
  riskKey: string;
  title: string;
  category: string;
  inherentScore: number;
  residualScore: number;
  ownerId: string;
  status: RiskStatus;
}

export function createRisk(input: {
  tenantId: string;
  workspaceId?: string;
  riskModelId?: string;
  riskKey: string;
  title: string;
  category: string;
  inherentScore: number;
  residualScore: number;
  ownerId: string;
}): Risk {
  if (!input.riskKey.trim()) {
    throw new Error("Risks require a non-blank risk key.");
  }
  for (const [label, score] of [
    ["inherent", input.inherentScore],
    ["residual", input.residualScore]
  ] as const) {
    if (score < 0 || score > 100) {
      throw new Error(`Risk ${label} score must be between 0 and 100.`);
    }
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    riskModelId: input.riskModelId,
    riskKey: input.riskKey,
    title: input.title,
    category: input.category,
    inherentScore: input.inherentScore,
    residualScore: input.residualScore,
    ownerId: input.ownerId,
    status: "identified"
  };
}

export interface RiskLink {
  id: string;
  tenantId: string;
  riskId: string;
  targetType: RiskLinkTargetType;
  targetId: string;
  relationship: RiskLinkRelationship;
}

export function createRiskLink(input: {
  tenantId: string;
  riskId: string;
  targetType: RiskLinkTargetType;
  targetId: string;
  relationship: RiskLinkRelationship;
}): RiskLink {
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    riskId: input.riskId,
    targetType: input.targetType,
    targetId: input.targetId,
    relationship: input.relationship
  };
}

export interface RiskTreatment {
  id: string;
  tenantId: string;
  riskId: string;
  strategy: RiskTreatmentStrategy;
  plan: string;
  ownerId: string;
  dueAt: Date;
  status: RiskTreatmentStatus;
}

export function createRiskTreatment(input: {
  tenantId: string;
  riskId: string;
  strategy: RiskTreatmentStrategy;
  plan: string;
  ownerId: string;
  dueAt: Date;
}): RiskTreatment {
  if (!input.plan.trim()) {
    throw new Error("Risk treatments require a plan.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    riskId: input.riskId,
    strategy: input.strategy,
    plan: input.plan,
    ownerId: input.ownerId,
    dueAt: input.dueAt,
    status: "planned"
  };
}

