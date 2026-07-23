import { createHash, randomUUID } from "node:crypto";

export type EvidenceState = "pending" | "quarantined" | "committed" | "rejected";

export interface EvidenceObject {
  id: string;
  tenantId: string;
  ownerId: string;
  fileName: string;
  classification: "internal" | "confidential" | "restricted";
  state: EvidenceState;
  sha256?: string;
  periodStart: Date;
  periodEnd: Date;
  scopeTags: string[];
  createdAt: Date;
  committedAt?: Date;
}

export function createPendingEvidence(input: {
  tenantId: string;
  ownerId: string;
  fileName: string;
  classification: EvidenceObject["classification"];
  periodStart: Date;
  periodEnd: Date;
  scopeTags: string[];
  now?: Date;
}): EvidenceObject {
  if (input.periodEnd < input.periodStart) {
    throw new Error("Evidence period end cannot precede period start.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    ownerId: input.ownerId,
    fileName: input.fileName,
    classification: input.classification,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    scopeTags: [...input.scopeTags],
    state: "pending",
    createdAt: input.now ?? new Date()
  };
}

export function quarantineEvidence(evidence: EvidenceObject): EvidenceObject {
  if (evidence.state !== "pending") {
    throw new Error("Only pending evidence can enter quarantine.");
  }
  return { ...evidence, state: "quarantined" };
}

export function commitCleanEvidence(
  evidence: EvidenceObject,
  input: { bytes: Uint8Array; scannerVerdict: "clean" | "malicious"; committedAt?: Date }
): EvidenceObject {
  if (evidence.state !== "quarantined") {
    throw new Error("Evidence must be quarantined before commit.");
  }
  if (input.scannerVerdict !== "clean") {
    return { ...evidence, state: "rejected" };
  }

  return {
    ...evidence,
    state: "committed",
    sha256: createHash("sha256").update(input.bytes).digest("hex"),
    committedAt: input.committedAt ?? new Date()
  };
}

export function assertEvidenceReusable(
  evidence: EvidenceObject,
  required: { periodStart: Date; periodEnd: Date; scopeTags: string[] }
): void {
  if (evidence.state !== "committed" || !evidence.sha256) {
    throw new Error("Evidence is not reusable until committed with a hash.");
  }
  if (evidence.periodStart > required.periodStart || evidence.periodEnd < required.periodEnd) {
    throw new Error("Evidence period does not cover required assessment period.");
  }
  const evidenceScope = new Set(evidence.scopeTags);
  for (const tag of required.scopeTags) {
    if (!evidenceScope.has(tag)) {
      throw new Error(`Evidence is missing required scope tag: ${tag}`);
    }
  }
}

// G-07 (0021_g07_evidence_graph.sql) — evidence graph domain types. See the
// migration's own header comment for the full scoping/reconciliation record.

export interface EvidenceVersion {
  id: string;
  tenantId: string;
  evidenceId: string;
  evidenceVersionNo: number;
  objectUri: string;
  sha256: string;
  sizeBytes: number;
  mimeType: string;
  observedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  uploadedBy: string;
  contentAvailable?: boolean;
}

export function createEvidenceVersion(input: {
  tenantId: string;
  evidenceId: string;
  evidenceVersionNo: number;
  objectUri: string;
  sha256: string;
  sizeBytes: number;
  mimeType: string;
  observedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  uploadedBy: string;
}): EvidenceVersion {
  if (input.evidenceVersionNo < 1) {
    throw new Error("evidenceVersionNo must be at least 1.");
  }
  if (input.objectUri.trim().length === 0) {
    throw new Error("objectUri must not be blank.");
  }
  if (input.sha256.trim().length !== 64) {
    throw new Error("sha256 must be a 64-character hex digest.");
  }
  if (input.sizeBytes < 0) {
    throw new Error("sizeBytes must not be negative.");
  }
  if (input.mimeType.trim().length === 0) {
    throw new Error("mimeType must not be blank.");
  }
  if (input.periodEnd < input.periodStart) {
    throw new Error("periodEnd cannot precede periodStart.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    evidenceId: input.evidenceId,
    evidenceVersionNo: input.evidenceVersionNo,
    objectUri: input.objectUri,
    sha256: input.sha256,
    sizeBytes: input.sizeBytes,
    mimeType: input.mimeType,
    observedAt: input.observedAt,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    uploadedBy: input.uploadedBy
  };
}

export type EvidenceLinkTargetType = "control_instance" | "assessment_item" | "automated_test_run" | "remediation_task";

export interface EvidenceLink {
  id: string;
  tenantId: string;
  evidenceVersionId: string;
  targetType: EvidenceLinkTargetType;
  targetId: string;
  purpose: string;
  scopeMatch: boolean;
  periodMatch: boolean;
}

export function createEvidenceLink(input: {
  tenantId: string;
  evidenceVersionId: string;
  targetType: EvidenceLinkTargetType;
  targetId: string;
  purpose: string;
  scopeMatch?: boolean;
  periodMatch?: boolean;
}): EvidenceLink {
  if (input.purpose.trim().length === 0) {
    throw new Error("purpose must not be blank.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    evidenceVersionId: input.evidenceVersionId,
    targetType: input.targetType,
    targetId: input.targetId,
    purpose: input.purpose,
    scopeMatch: input.scopeMatch ?? false,
    periodMatch: input.periodMatch ?? false
  };
}

export type EvidenceRequestStatus = "requested" | "submitted" | "accepted" | "rejected";

export interface EvidenceRequest {
  id: string;
  tenantId: string;
  assessmentId: string;
  controlInstanceId: string;
  requestedFrom: string;
  dueAt: Date;
  status: EvidenceRequestStatus;
  instructions?: string;
}

export function createEvidenceRequest(input: {
  tenantId: string;
  assessmentId: string;
  controlInstanceId: string;
  requestedFrom: string;
  dueAt: Date;
  instructions?: string;
}): EvidenceRequest {
  if (input.requestedFrom.trim().length === 0) {
    throw new Error("requestedFrom must not be blank.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    assessmentId: input.assessmentId,
    controlInstanceId: input.controlInstanceId,
    requestedFrom: input.requestedFrom,
    dueAt: input.dueAt,
    status: "requested",
    instructions: input.instructions
  };
}

export type EvidenceReviewDecision = "sufficient" | "insufficient" | "needs_more_context";

export interface EvidenceReview {
  id: string;
  tenantId: string;
  evidenceVersionId: string;
  reviewerId: string;
  decision: EvidenceReviewDecision;
  rationale: string;
  reviewedAt: Date;
}

/**
 * `reviewerId` must differ from the reviewed evidence's owner (spec §11's
 * "reviewer separation" constraint) — this cannot be a single-table CHECK
 * constraint, so it is enforced here at the domain layer and again by the
 * service before persisting.
 */
export function createEvidenceReview(input: {
  tenantId: string;
  evidenceVersionId: string;
  reviewerId: string;
  evidenceOwnerId: string;
  decision: EvidenceReviewDecision;
  rationale: string;
  reviewedAt?: Date;
}): EvidenceReview {
  if (input.rationale.trim().length === 0) {
    throw new Error("rationale must not be blank.");
  }
  if (input.reviewerId === input.evidenceOwnerId) {
    throw new Error("A reviewer cannot review evidence they own (reviewer separation).");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    evidenceVersionId: input.evidenceVersionId,
    reviewerId: input.reviewerId,
    decision: input.decision,
    rationale: input.rationale,
    reviewedAt: input.reviewedAt ?? new Date()
  };
}

export type AutomatedTestSeverity = "low" | "medium" | "high" | "critical";

export interface AutomatedTest {
  id: string;
  tenantId: string;
  controlId: string;
  connectorType: string;
  queryTemplate: string;
  schedule: string;
  severity: AutomatedTestSeverity;
}

export function createAutomatedTest(input: {
  tenantId: string;
  controlId: string;
  connectorType: string;
  queryTemplate: string;
  schedule: string;
  severity: AutomatedTestSeverity;
}): AutomatedTest {
  if (input.connectorType.trim().length === 0) {
    throw new Error("connectorType must not be blank.");
  }
  if (input.queryTemplate.trim().length === 0) {
    throw new Error("queryTemplate must not be blank.");
  }
  if (input.schedule.trim().length === 0) {
    throw new Error("schedule must not be blank.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    controlId: input.controlId,
    connectorType: input.connectorType,
    queryTemplate: input.queryTemplate,
    schedule: input.schedule,
    severity: input.severity
  };
}

export type AutomatedTestRunStatus = "running" | "succeeded" | "failed";

export interface AutomatedTestRun {
  id: string;
  tenantId: string;
  automatedTestId: string;
  connectorId: string;
  startedAt: Date;
  finishedAt?: Date;
  status: AutomatedTestRunStatus;
  resultJson: Record<string, unknown>;
  sourceWatermark?: string;
  idempotencyKey: string;
}

export function createAutomatedTestRun(input: {
  tenantId: string;
  automatedTestId: string;
  connectorId: string;
  idempotencyKey: string;
  startedAt?: Date;
  status?: AutomatedTestRunStatus;
  resultJson?: Record<string, unknown>;
  sourceWatermark?: string;
}): AutomatedTestRun {
  if (input.idempotencyKey.trim().length === 0) {
    throw new Error("idempotencyKey must not be blank.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    automatedTestId: input.automatedTestId,
    connectorId: input.connectorId,
    startedAt: input.startedAt ?? new Date(),
    status: input.status ?? "running",
    resultJson: input.resultJson ?? {},
    sourceWatermark: input.sourceWatermark,
    idempotencyKey: input.idempotencyKey
  };
}

export type EvidenceSampleMethod = "random" | "stratified" | "judgmental" | "full_population";

export interface EvidenceSample {
  id: string;
  tenantId: string;
  testResultId: string;
  populationRef: string;
  method: EvidenceSampleMethod;
  sampleSize: number;
  sampleJson: unknown[];
  seed?: string;
}

export function createEvidenceSample(input: {
  tenantId: string;
  testResultId: string;
  populationRef: string;
  method: EvidenceSampleMethod;
  sampleSize: number;
  sampleJson?: unknown[];
  seed?: string;
}): EvidenceSample {
  if (input.populationRef.trim().length === 0) {
    throw new Error("populationRef must not be blank.");
  }
  if (input.sampleSize < 0) {
    throw new Error("sampleSize must not be negative.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    testResultId: input.testResultId,
    populationRef: input.populationRef,
    method: input.method,
    sampleSize: input.sampleSize,
    sampleJson: input.sampleJson ?? [],
    seed: input.seed
  };
}

export type MalwareScanStatus = "clean" | "infected" | "error";

export interface MalwareScanResult {
  id: string;
  tenantId: string;
  evidenceVersionId: string;
  engine: string;
  signatureVersion: string;
  status: MalwareScanStatus;
  detailsHash?: string;
  scannedAt: Date;
}

export function createMalwareScanResult(input: {
  tenantId: string;
  evidenceVersionId: string;
  engine: string;
  signatureVersion: string;
  status: MalwareScanStatus;
  detailsHash?: string;
  scannedAt?: Date;
}): MalwareScanResult {
  if (input.engine.trim().length === 0) {
    throw new Error("engine must not be blank.");
  }
  if (input.signatureVersion.trim().length === 0) {
    throw new Error("signatureVersion must not be blank.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    evidenceVersionId: input.evidenceVersionId,
    engine: input.engine,
    signatureVersion: input.signatureVersion,
    status: input.status,
    detailsHash: input.detailsHash,
    scannedAt: input.scannedAt ?? new Date()
  };
}

export interface EvidenceExpiryEvent {
  id: string;
  tenantId: string;
  evidenceId: string;
  previousState: string;
  newState: string;
  reason: string;
  actorId: string;
  occurredAt: Date;
}

export function createEvidenceExpiryEvent(input: {
  tenantId: string;
  evidenceId: string;
  previousState: string;
  newState: string;
  reason: string;
  actorId: string;
  occurredAt?: Date;
}): EvidenceExpiryEvent {
  if (input.reason.trim().length === 0) {
    throw new Error("reason must not be blank.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    evidenceId: input.evidenceId,
    previousState: input.previousState,
    newState: input.newState,
    reason: input.reason,
    actorId: input.actorId,
    occurredAt: input.occurredAt ?? new Date()
  };
}

export type EvidenceCustodyEventType = "created" | "transferred" | "accessed" | "exported" | "disposed";

export interface EvidenceCustodyEvent {
  id: string;
  tenantId: string;
  evidenceVersionId: string;
  eventType: EvidenceCustodyEventType;
  actorId: string;
  locationRef: string;
  eventHash: string;
  occurredAt: Date;
}

export function createEvidenceCustodyEvent(input: {
  tenantId: string;
  evidenceVersionId: string;
  eventType: EvidenceCustodyEventType;
  actorId: string;
  locationRef: string;
  eventHash: string;
  occurredAt?: Date;
}): EvidenceCustodyEvent {
  if (input.locationRef.trim().length === 0) {
    throw new Error("locationRef must not be blank.");
  }
  if (input.eventHash.trim().length === 0) {
    throw new Error("eventHash must not be blank.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    evidenceVersionId: input.evidenceVersionId,
    eventType: input.eventType,
    actorId: input.actorId,
    locationRef: input.locationRef,
    eventHash: input.eventHash,
    occurredAt: input.occurredAt ?? new Date()
  };
}
