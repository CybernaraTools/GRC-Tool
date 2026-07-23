import { createHash, randomUUID } from "node:crypto";
import type { AssessmentItem, AssessmentStatus, PinnedControlRef } from "../../assessment/public.js";

// Dedicated closure/legacy-reconstruction snapshot capture, kept deliberately
// separate from src/modules/assessment/domain/execution-graph.ts's
// createAssessmentSnapshot ("created"/"draft_updated" snapshot_type values).
// Both write into the same existing @append_only assessment_snapshots table
// (0013_g01_assessment_execution_normalization.sql) — no schema change is
// needed to add new snapshot_type values to an existing free-form text
// column — but the *payload shape* a report needs (answers, findings, risks,
// remediation, evidence references, signoffs at close time) is materially
// richer than the pinned-control-only payload the create/draft-update path
// writes, so it gets its own pure builder rather than overloading that one.

export const CLOSURE_SNAPSHOT_SCHEMA_VERSION = "1.0.0";

export type ClosureSnapshotType = "closure" | "legacy_closure_reconstruction";

export interface ClosureSnapshotItemPayload {
  itemId: string;
  controlRef: PinnedControlRef;
  status: AssessmentStatus;
  ownerId: string;
  answerText: string | null;
  evidenceIds: string[];
  applicability: {
    applicable: boolean;
    rationale: string;
    approvedBy: string;
    approvedAt: string;
  } | null;
}

export interface ClosureSnapshotFindingPayload {
  id: string;
  assessmentItemId: string | null;
  testResultId: string | null;
  severity: string;
  impact: string | null;
  likelihood: string | null;
  ownerId: string | null;
  dueAt: string | null;
  description: string;
  createdAt: string;
}

export interface ClosureSnapshotRemediationTaskPayload {
  id: string;
  findingId: string;
  ownerId: string;
  dueAt: string;
  status: string;
  reviews: Array<{
    id: string;
    reviewerId: string;
    decision: string;
    rationale: string;
    evidenceVersionIds: string[];
    reviewedAt: string;
  }>;
}

export interface ClosureSnapshotRiskPayload {
  id: string;
  riskKey: string;
  title: string;
  category: string;
  inherentScore: number;
  residualScore: number;
  ownerId: string;
  status: string;
}

export interface ClosureSnapshotRiskAcceptancePayload {
  id: string;
  remediationTaskId: string;
  findingId: string;
  riskId: string | null;
  rationale: string;
  approverId: string;
  approvedAt: string;
  expiresAt: string;
  nextReviewDueAt: string;
  compensatingControls: string | null;
  supersededAt: string | null;
  supersededById: string | null;
  isActiveAtCapture: boolean;
}

export interface ClosureSnapshotEvidenceRefPayload {
  evidenceId: string;
  evidenceVersionId: string | null;
  fileName: string;
  mimeType: string | null;
  sha256: string | null;
  state: string;
  uploadedBy: string | null;
  uploadedAt: string | null;
  linkedTargetType: string;
  linkedTargetId: string;
}

export interface ClosureSnapshotSignoffPayload {
  id: string;
  scopeType: string;
  scopeId: string;
  signerId: string;
  decision: string;
  signedAt: string;
}

export interface ClosureSnapshotPayload {
  schemaVersion: string;
  assessment: {
    id: string;
    scopeName: string;
    status: AssessmentStatus;
    controlSnapshotVersion: string;
    periodStart: string;
    periodEnd: string;
    createdBy: string;
    createdAt: string;
  };
  items: ClosureSnapshotItemPayload[];
  findings: ClosureSnapshotFindingPayload[];
  remediationTasks: ClosureSnapshotRemediationTaskPayload[];
  risks: ClosureSnapshotRiskPayload[];
  riskAcceptances: ClosureSnapshotRiskAcceptancePayload[];
  evidence: ClosureSnapshotEvidenceRefPayload[];
  signoffs: ClosureSnapshotSignoffPayload[];
  capturedAt: string;
  reconstructed: boolean;
  historicalAssuranceLevel: "native" | "legacy_reconstructed";
  reconstructionNote?: string;
}

export interface ClosureSnapshotRecord {
  id: string;
  tenantId: string;
  assessmentId: string;
  snapshotType: ClosureSnapshotType;
  sequence: number;
  contentHash: string;
  payload: ClosureSnapshotPayload;
  createdBy: string;
  createdAt: Date;
}

export function buildClosureSnapshotPayload(input: {
  assessment: {
    id: string;
    scopeName: string;
    status: AssessmentStatus;
    controlSnapshotVersion: string;
    periodStart: Date;
    periodEnd: Date;
    createdBy: string;
    createdAt: Date;
  };
  items: AssessmentItem[];
  findings: ClosureSnapshotFindingPayload[];
  remediationTasks: ClosureSnapshotRemediationTaskPayload[];
  risks: ClosureSnapshotRiskPayload[];
  riskAcceptances: ClosureSnapshotRiskAcceptancePayload[];
  evidence: ClosureSnapshotEvidenceRefPayload[];
  signoffs: ClosureSnapshotSignoffPayload[];
  reconstructed: boolean;
  reconstructionNote?: string;
  now?: Date;
}): ClosureSnapshotPayload {
  const capturedAt = input.now ?? new Date();
  return {
    schemaVersion: CLOSURE_SNAPSHOT_SCHEMA_VERSION,
    assessment: {
      id: input.assessment.id,
      scopeName: input.assessment.scopeName,
      status: input.assessment.status,
      controlSnapshotVersion: input.assessment.controlSnapshotVersion,
      periodStart: input.assessment.periodStart.toISOString(),
      periodEnd: input.assessment.periodEnd.toISOString(),
      createdBy: input.assessment.createdBy,
      createdAt: input.assessment.createdAt.toISOString()
    },
    items: input.items.map((item) => ({
      itemId: item.id,
      controlRef: item.controlRef,
      status: item.status,
      ownerId: item.ownerId,
      answerText: item.answerText ?? null,
      evidenceIds: [...item.evidenceIds],
      applicability: item.applicability
        ? {
            applicable: item.applicability.applicable,
            rationale: item.applicability.rationale,
            approvedBy: item.applicability.approvedBy,
            approvedAt: item.applicability.approvedAt.toISOString()
          }
        : null
    })),
    findings: input.findings,
    remediationTasks: input.remediationTasks,
    risks: input.risks,
    riskAcceptances: input.riskAcceptances,
    evidence: input.evidence,
    signoffs: input.signoffs,
    capturedAt: capturedAt.toISOString(),
    reconstructed: input.reconstructed,
    historicalAssuranceLevel: input.reconstructed ? "legacy_reconstructed" : "native",
    reconstructionNote: input.reconstructionNote
  };
}

export function createClosureSnapshot(input: {
  assessmentId: string;
  snapshotType: ClosureSnapshotType;
  sequence: number;
  payload: ClosureSnapshotPayload;
  createdBy: string;
  now?: Date;
}): { id: string; assessmentId: string; snapshotType: ClosureSnapshotType; sequence: number; contentHash: string; payload: ClosureSnapshotPayload; createdBy: string; createdAt: Date } {
  if (input.sequence < 1) {
    throw new Error("Closure snapshot sequence must start at 1.");
  }
  return {
    id: randomUUID(),
    assessmentId: input.assessmentId,
    snapshotType: input.snapshotType,
    sequence: input.sequence,
    contentHash: hashClosureSnapshotPayload(input.payload),
    payload: input.payload,
    createdBy: input.createdBy,
    createdAt: input.now ?? new Date()
  };
}

export function hashClosureSnapshotPayload(payload: ClosureSnapshotPayload): string {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
