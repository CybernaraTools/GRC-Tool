import { createHash } from "node:crypto";
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../../audit-security/public.js";
import { OutboxService } from "../../outbox/public.js";
import {
  assertEvidenceReusable,
  commitCleanEvidence,
  createAutomatedTest,
  createAutomatedTestRun,
  createEvidenceCustodyEvent,
  createEvidenceExpiryEvent,
  createEvidenceLink,
  createEvidenceRequest,
  createEvidenceReview,
  createEvidenceSample,
  createEvidenceVersion,
  createMalwareScanResult,
  createPendingEvidence,
  quarantineEvidence,
  type AutomatedTestSeverity,
  type AutomatedTestRunStatus,
  type EvidenceLinkTargetType,
  type EvidenceObject,
  type EvidenceReviewDecision,
  type EvidenceState
} from "../domain/evidence.js";
import { EVIDENCE_ASSURANCE_REPOSITORY } from "./tokens.js";
import { readEvidenceUploadPolicy, type EvidenceUploadPolicy } from "./evidence-upload-policy.js";
import type {
  AutomatedTestRow,
  AutomatedTestRunRow,
  EvidenceCustodyEventRow,
  EvidenceExpiryEventRow,
  EvidenceLinkRow,
  EvidenceRecord,
  EvidenceRepository,
  EvidenceRequestRow,
  EvidenceReviewRow,
  EvidenceSampleRow,
  EvidenceVersionRow,
  MalwareScanResultRow
} from "./evidence-assurance.types.js";
import type { Pagination } from "../../../shared/pagination.js";

interface EvidenceOperationPayload extends Record<string, unknown> {
  evidenceId: string;
}

interface EvidenceGraphOperationPayload extends Record<string, unknown> {
  recordId: string;
}

@Injectable()
export class EvidenceAssuranceService {
  constructor(
    @Inject(EVIDENCE_ASSURANCE_REPOSITORY) private readonly repository: EvidenceRepository,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(AuditLogService) private readonly auditLog: AuditLogService
  ) {}

  async initiateUpload(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    ownerId: string;
    fileName: string;
    classification: EvidenceObject["classification"];
    periodStart: Date;
    periodEnd: Date;
    scopeTags: string[];
  }): Promise<EvidenceRecord> {
    const replay = await this.replayedEvidence(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }

    const evidence = createPendingEvidence({
      tenantId: input.tenantId,
      ownerId: input.ownerId,
      fileName: input.fileName,
      classification: input.classification,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      scopeTags: input.scopeTags
    });
    const persisted = await this.repository.create({ evidence, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "evidence.upload_initiated",
      evidenceId: persisted.id,
      body: { evidenceId: persisted.id, fileName: persisted.fileName, state: persisted.state }
    });
    return persisted;
  }

  async list(input: { tenantId: string; state?: EvidenceState; pagination: Pagination }): Promise<EvidenceRecord[]> {
    return this.repository.list(input);
  }

  async get(tenantId: string, evidenceId: string): Promise<EvidenceRecord> {
    const evidence = await this.repository.find(tenantId, evidenceId);
    if (!evidence) {
      throw new NotFoundException("Evidence object not found.");
    }
    return evidence;
  }

  getUploadPolicy(): EvidenceUploadPolicy {
    return readEvidenceUploadPolicy();
  }

  async quarantine(input: {
    tenantId: string;
    actorId: string;
    evidenceId: string;
    storageUri?: string;
    idempotencyKey: string;
  }): Promise<EvidenceRecord> {
    const replay = await this.replayedEvidence(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const current = await this.get(input.tenantId, input.evidenceId);
    const quarantined = quarantineEvidence(current);
    const persisted = await this.repository.updateState({
      tenantId: input.tenantId,
      evidence: quarantined,
      actorId: input.actorId,
      storageUri: input.storageUri ?? current.storageUri
    });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "evidence.quarantined",
      evidenceId: persisted.id,
      body: { evidenceId: persisted.id, state: persisted.state }
    });
    return persisted;
  }

  async uploadBytes(input: {
    tenantId: string;
    actorId: string;
    evidenceId: string;
    bytesBase64: string;
    mimeType: string;
    storageUri?: string;
    scannerVerdict?: "clean" | "malicious";
    idempotencyKey: string;
  }): Promise<EvidenceRecord> {
    const policy = readEvidenceUploadPolicy();
    const bytes = Buffer.from(input.bytesBase64, "base64");
    if (bytes.length === 0) {
      throw new BadRequestException("Uploaded file must contain at least one byte.");
    }
    if (bytes.length > policy.maxBytes) {
      throw new BadRequestException(`Uploaded file exceeds the ${policy.maxBytes} byte limit.`);
    }
    if (!policy.allowedMimeTypes.includes(input.mimeType)) {
      throw new BadRequestException(`Uploaded file MIME type '${input.mimeType}' is not allowed.`);
    }

    const current = await this.get(input.tenantId, input.evidenceId);
    if (current.state === "pending") {
      await this.quarantine({
        tenantId: input.tenantId,
        actorId: input.actorId,
        evidenceId: input.evidenceId,
        storageUri: input.storageUri ?? `cybernara://evidence/${input.evidenceId}/${encodeURIComponent(current.fileName)}`,
        idempotencyKey: `${input.idempotencyKey}:quarantine`
      });
    } else if (current.state !== "quarantined") {
      const replay = await this.replayedEvidence(input.tenantId, `${input.idempotencyKey}:commit`);
      if (replay) {
        return replay;
      }
      throw new BadRequestException("Evidence must be pending or quarantined before upload.");
    }

    return this.commit({
      tenantId: input.tenantId,
      actorId: input.actorId,
      evidenceId: input.evidenceId,
      scannerVerdict: input.scannerVerdict ?? "clean",
      bytesBase64: input.bytesBase64,
      storageUri: input.storageUri ?? `cybernara://evidence/${input.evidenceId}/${encodeURIComponent(current.fileName)}`,
      mimeType: input.mimeType,
      idempotencyKey: `${input.idempotencyKey}:commit`
    });
  }

  async commit(input: {
    tenantId: string;
    actorId: string;
    evidenceId: string;
    scannerVerdict: "clean" | "malicious";
    bytesBase64: string;
    storageUri?: string;
    mimeType?: string;
    idempotencyKey: string;
  }): Promise<EvidenceRecord> {
    const replay = await this.replayedEvidence(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const current = await this.get(input.tenantId, input.evidenceId);
    const bytes = Buffer.from(input.bytesBase64, "base64");
    if (bytes.length === 0) {
      throw new BadRequestException("bytesBase64 must decode to at least one byte.");
    }
    const committed = commitCleanEvidence(current, {
      bytes,
      scannerVerdict: input.scannerVerdict
    });
    const persisted = await this.repository.updateState({
      tenantId: input.tenantId,
      evidence: committed,
      actorId: input.actorId,
      storageUri: input.storageUri ?? current.storageUri
    });

    // G-07 (0021_g07_evidence_graph.sql): a clean commit now produces a real, immutable
    // evidence_versions row (previously: only the mutable evidence_objects row changed
    // state), a persisted malware_scan_results row (previously: scannerVerdict was a
    // throwaway parameter, never stored), and the opening evidence_custody_events entry —
    // closing this gap's "no malware scan record, no chain of custody" finding directly.
    if (persisted.state === "committed" && persisted.sha256) {
      const existingVersions = await this.repository.listEvidenceVersions({
        tenantId: input.tenantId,
        evidenceId: persisted.id,
        pagination: { limit: 1, offset: 0 }
      });
      const nextVersionNo = (existingVersions[0]?.evidenceVersionNo ?? 0) + 1;
      const version = createEvidenceVersion({
        tenantId: input.tenantId,
        evidenceId: persisted.id,
        evidenceVersionNo: nextVersionNo,
        objectUri: persisted.storageUri ?? input.storageUri ?? "",
        sha256: persisted.sha256,
        sizeBytes: bytes.length,
        mimeType: input.mimeType ?? "application/octet-stream",
        observedAt: new Date(),
        periodStart: persisted.periodStart,
        periodEnd: persisted.periodEnd,
        uploadedBy: input.actorId
      });
      const versionRow = await this.repository.createEvidenceVersion({
        version,
        actorId: input.actorId,
        contentBytes: bytes
      });
      await this.repository.createMalwareScanResult({
        scan: createMalwareScanResult({
          tenantId: input.tenantId,
          evidenceVersionId: versionRow.id,
          engine: "commit-time-scan",
          signatureVersion: "n/a",
          status: input.scannerVerdict === "clean" ? "clean" : "infected"
        }),
        actorId: input.actorId
      });
      await this.repository.createEvidenceCustodyEvent({
        event: createEvidenceCustodyEvent({
          tenantId: input.tenantId,
          evidenceVersionId: versionRow.id,
          eventType: "created",
          actorId: input.actorId,
          locationRef: versionRow.objectUri || "unknown",
          eventHash: versionRow.sha256
        }),
        actorId: input.actorId
      });
    }

    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: persisted.state === "committed" ? "evidence.committed" : "evidence.rejected",
      evidenceId: persisted.id,
      body: { evidenceId: persisted.id, state: persisted.state, sha256: persisted.sha256 ?? null }
    });
    return persisted;
  }

  async getEvidenceVersions(
    tenantId: string,
    evidenceId: string,
    pagination: Pagination
  ): Promise<EvidenceVersionRow[]> {
    return this.repository.listEvidenceVersions({ tenantId, evidenceId, pagination });
  }

  async downloadEvidenceObject(tenantId: string, evidenceId: string): Promise<{
    evidence: EvidenceRecord;
    version: EvidenceVersionRow;
    bytes: Buffer;
  }> {
    const evidence = await this.get(tenantId, evidenceId);
    const [version] = await this.repository.listEvidenceVersions({
      tenantId,
      evidenceId,
      pagination: { limit: 1, offset: 0 }
    });
    if (!version) {
      throw new NotFoundException("Evidence version not found.");
    }
    const bytes = await this.repository.findEvidenceVersionBytes(tenantId, version.id);
    if (!bytes) {
      throw new NotFoundException("Evidence file content is not available for this version.");
    }
    const rehashed = createHash("sha256").update(bytes).digest("hex");
    if (rehashed !== version.sha256 || rehashed !== evidence.sha256) {
      throw new ConflictException("Persisted evidence content no longer matches its recorded hash.");
    }
    return { evidence, version, bytes };
  }

  async getMalwareScanResults(
    tenantId: string,
    evidenceVersionId: string,
    pagination: Pagination
  ): Promise<MalwareScanResultRow[]> {
    return this.repository.listMalwareScanResults({ tenantId, evidenceVersionId, pagination });
  }

  async getEvidenceCustodyEvents(
    tenantId: string,
    evidenceVersionId: string,
    pagination: Pagination
  ): Promise<EvidenceCustodyEventRow[]> {
    return this.repository.listEvidenceCustodyEvents({ tenantId, evidenceVersionId, pagination });
  }

  async createEvidenceLink(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    evidenceVersionId: string;
    targetType: EvidenceLinkTargetType;
    targetId: string;
    purpose: string;
    scopeMatch?: boolean;
    periodMatch?: boolean;
  }): Promise<EvidenceLinkRow> {
    const replay = await this.replayedGraphRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository
        .listEvidenceLinks({ tenantId: input.tenantId, evidenceVersionId: input.evidenceVersionId, pagination: { limit: 200, offset: 0 } })
        .then((rows) => rows.find((row) => row.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const link = createEvidenceLink({
      tenantId: input.tenantId,
      evidenceVersionId: input.evidenceVersionId,
      targetType: input.targetType,
      targetId: input.targetId,
      purpose: input.purpose,
      scopeMatch: input.scopeMatch,
      periodMatch: input.periodMatch
    });
    const persisted = await this.repository.createEvidenceLink({ link, actorId: input.actorId });
    await this.publishGraphMutation(input.tenantId, input.actorId, input.idempotencyKey, "evidence.link_created", persisted.id);
    return persisted;
  }

  async listEvidenceLinks(
    tenantId: string,
    evidenceVersionId: string,
    pagination: Pagination
  ): Promise<EvidenceLinkRow[]> {
    return this.repository.listEvidenceLinks({ tenantId, evidenceVersionId, pagination });
  }

  async createEvidenceRequest(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    assessmentId: string;
    controlInstanceId: string;
    requestedFrom: string;
    dueAt: Date;
    instructions?: string;
  }): Promise<EvidenceRequestRow> {
    const replay = await this.replayedGraphRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository
        .listEvidenceRequests({ tenantId: input.tenantId, assessmentId: input.assessmentId, pagination: { limit: 200, offset: 0 } })
        .then((rows) => rows.find((row) => row.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const request = createEvidenceRequest({
      tenantId: input.tenantId,
      assessmentId: input.assessmentId,
      controlInstanceId: input.controlInstanceId,
      requestedFrom: input.requestedFrom,
      dueAt: input.dueAt,
      instructions: input.instructions
    });
    const persisted = await this.repository.createEvidenceRequest({ request, actorId: input.actorId });
    await this.publishGraphMutation(input.tenantId, input.actorId, input.idempotencyKey, "evidence.request_created", persisted.id);
    return persisted;
  }

  async listEvidenceRequests(
    tenantId: string,
    assessmentId: string,
    pagination: Pagination
  ): Promise<EvidenceRequestRow[]> {
    return this.repository.listEvidenceRequests({ tenantId, assessmentId, pagination });
  }

  async createEvidenceReview(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    evidenceVersionId: string;
    reviewerId: string;
    decision: EvidenceReviewDecision;
    rationale: string;
  }): Promise<EvidenceReviewRow> {
    const replay = await this.replayedGraphRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository
        .listEvidenceReviews({ tenantId: input.tenantId, evidenceVersionId: input.evidenceVersionId, pagination: { limit: 200, offset: 0 } })
        .then((rows) => rows.find((row) => row.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const version = await this.repository.findEvidenceVersion(input.tenantId, input.evidenceVersionId);
    if (!version) {
      throw new NotFoundException("Evidence version not found.");
    }
    const evidence = await this.get(input.tenantId, version.evidenceId);
    const review = createEvidenceReview({
      tenantId: input.tenantId,
      evidenceVersionId: input.evidenceVersionId,
      reviewerId: input.reviewerId,
      evidenceOwnerId: evidence.ownerId,
      decision: input.decision,
      rationale: input.rationale
    });
    const persisted = await this.repository.createEvidenceReview({ review, actorId: input.actorId });
    await this.publishGraphMutation(input.tenantId, input.actorId, input.idempotencyKey, "evidence.review_created", persisted.id);
    return persisted;
  }

  async listEvidenceReviews(
    tenantId: string,
    evidenceVersionId: string,
    pagination: Pagination
  ): Promise<EvidenceReviewRow[]> {
    return this.repository.listEvidenceReviews({ tenantId, evidenceVersionId, pagination });
  }

  async createAutomatedTest(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    controlId: string;
    connectorType: string;
    queryTemplate: string;
    schedule: string;
    severity: AutomatedTestSeverity;
  }): Promise<AutomatedTestRow> {
    const replay = await this.replayedGraphRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository.findAutomatedTest(input.tenantId, id)
    );
    if (replay) {
      return replay;
    }
    const test = createAutomatedTest({
      tenantId: input.tenantId,
      controlId: input.controlId,
      connectorType: input.connectorType,
      queryTemplate: input.queryTemplate,
      schedule: input.schedule,
      severity: input.severity
    });
    const persisted = await this.repository.createAutomatedTest({ test, actorId: input.actorId });
    await this.publishGraphMutation(input.tenantId, input.actorId, input.idempotencyKey, "evidence.automated_test_created", persisted.id);
    return persisted;
  }

  async listAutomatedTests(tenantId: string, pagination: Pagination): Promise<AutomatedTestRow[]> {
    return this.repository.listAutomatedTests({ tenantId, pagination });
  }

  async getAutomatedTest(tenantId: string, automatedTestId: string): Promise<AutomatedTestRow> {
    const test = await this.repository.findAutomatedTest(tenantId, automatedTestId);
    if (!test) {
      throw new NotFoundException("Automated test not found.");
    }
    return test;
  }

  async createAutomatedTestRun(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    automatedTestId: string;
    connectorId: string;
    status?: AutomatedTestRunStatus;
    resultJson?: Record<string, unknown>;
    sourceWatermark?: string;
  }): Promise<AutomatedTestRunRow> {
    const replay = await this.replayedGraphRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository
        .listAutomatedTestRuns({ tenantId: input.tenantId, automatedTestId: input.automatedTestId, pagination: { limit: 200, offset: 0 } })
        .then((rows) => rows.find((row) => row.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const run = createAutomatedTestRun({
      tenantId: input.tenantId,
      automatedTestId: input.automatedTestId,
      connectorId: input.connectorId,
      idempotencyKey: input.idempotencyKey,
      status: input.status,
      resultJson: input.resultJson,
      sourceWatermark: input.sourceWatermark
    });
    const persisted = await this.repository.createAutomatedTestRun({ run, actorId: input.actorId });
    await this.publishGraphMutation(input.tenantId, input.actorId, input.idempotencyKey, "evidence.automated_test_run_created", persisted.id);
    return persisted;
  }

  async listAutomatedTestRuns(
    tenantId: string,
    automatedTestId: string,
    pagination: Pagination
  ): Promise<AutomatedTestRunRow[]> {
    return this.repository.listAutomatedTestRuns({ tenantId, automatedTestId, pagination });
  }

  async createEvidenceSample(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    testResultId: string;
    populationRef: string;
    method: "random" | "stratified" | "judgmental" | "full_population";
    sampleSize: number;
    sampleJson?: unknown[];
    seed?: string;
  }): Promise<EvidenceSampleRow> {
    const replay = await this.replayedGraphRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository
        .listEvidenceSamples({ tenantId: input.tenantId, testResultId: input.testResultId, pagination: { limit: 200, offset: 0 } })
        .then((rows) => rows.find((row) => row.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const sample = createEvidenceSample({
      tenantId: input.tenantId,
      testResultId: input.testResultId,
      populationRef: input.populationRef,
      method: input.method,
      sampleSize: input.sampleSize,
      sampleJson: input.sampleJson,
      seed: input.seed
    });
    const persisted = await this.repository.createEvidenceSample({ sample, actorId: input.actorId });
    await this.publishGraphMutation(input.tenantId, input.actorId, input.idempotencyKey, "evidence.sample_created", persisted.id);
    return persisted;
  }

  async listEvidenceSamples(
    tenantId: string,
    testResultId: string,
    pagination: Pagination
  ): Promise<EvidenceSampleRow[]> {
    return this.repository.listEvidenceSamples({ tenantId, testResultId, pagination });
  }

  async createEvidenceExpiryEvent(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    evidenceId: string;
    previousState: string;
    newState: string;
    reason: string;
  }): Promise<EvidenceExpiryEventRow> {
    const replay = await this.replayedGraphRecord(input.tenantId, input.idempotencyKey, (id) =>
      this.repository
        .listEvidenceExpiryEvents({ tenantId: input.tenantId, evidenceId: input.evidenceId, pagination: { limit: 200, offset: 0 } })
        .then((rows) => rows.find((row) => row.id === id) ?? null)
    );
    if (replay) {
      return replay;
    }
    const event = createEvidenceExpiryEvent({
      tenantId: input.tenantId,
      evidenceId: input.evidenceId,
      previousState: input.previousState,
      newState: input.newState,
      reason: input.reason,
      actorId: input.actorId
    });
    const persisted = await this.repository.createEvidenceExpiryEvent({ event, actorId: input.actorId });
    await this.publishGraphMutation(input.tenantId, input.actorId, input.idempotencyKey, "evidence.expiry_event_created", persisted.id);
    return persisted;
  }

  async listEvidenceExpiryEvents(
    tenantId: string,
    evidenceId: string,
    pagination: Pagination
  ): Promise<EvidenceExpiryEventRow[]> {
    return this.repository.listEvidenceExpiryEvents({ tenantId, evidenceId, pagination });
  }

  async checkReuse(input: {
    tenantId: string;
    evidenceId: string;
    periodStart: Date;
    periodEnd: Date;
    scopeTags: string[];
  }): Promise<{ evidenceId: string; reusable: boolean; reason?: string }> {
    const evidence = await this.get(input.tenantId, input.evidenceId);
    try {
      assertEvidenceReusable(evidence, {
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        scopeTags: input.scopeTags
      });
      return { evidenceId: evidence.id, reusable: true };
    } catch (error) {
      return {
        evidenceId: evidence.id,
        reusable: false,
        reason: error instanceof Error ? error.message : "Evidence is not reusable."
      };
    }
  }

  private async replayedEvidence(tenantId: string, idempotencyKey: string): Promise<EvidenceRecord | null> {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as Partial<EvidenceOperationPayload>;
    if (!payload.evidenceId) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    return this.get(tenantId, payload.evidenceId);
  }

  private async publishMutation(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    eventType: string;
    evidenceId: string;
    body: Record<string, unknown>;
  }): Promise<void> {
    const now = new Date();
    const outboxEvent = await this.outbox.publish({
      tenantId: input.tenantId,
      eventType: input.eventType,
      aggregateType: "evidence_object",
      aggregateId: input.evidenceId,
      payload: { evidenceId: input.evidenceId },
      idempotencyKey: input.idempotencyKey,
      createdBy: input.actorId,
      now
    });
    if (outboxEvent.createdAt.getTime() !== now.getTime()) {
      return;
    }
    await this.auditLog.append({
      tenantId: input.tenantId,
      eventType: input.eventType,
      actorId: input.actorId,
      targetType: "evidence_object",
      targetId: input.evidenceId,
      traceId: input.idempotencyKey,
      classification: "restricted",
      body: input.body
    });
  }

  private async replayedGraphRecord<T>(
    tenantId: string,
    idempotencyKey: string,
    fetchReplay: (recordId: string) => Promise<T | null>
  ): Promise<T | null> {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as Partial<EvidenceGraphOperationPayload>;
    if (!payload.recordId) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    const replay = await fetchReplay(payload.recordId);
    if (!replay) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    return replay;
  }

  private async publishGraphMutation(
    tenantId: string,
    actorId: string,
    idempotencyKey: string,
    eventType: string,
    recordId: string
  ): Promise<void> {
    const now = new Date();
    const payload: EvidenceGraphOperationPayload = { recordId };
    const outboxEvent = await this.outbox.publish({
      tenantId,
      eventType,
      aggregateType: "evidence_graph_record",
      aggregateId: recordId,
      payload,
      idempotencyKey,
      createdBy: actorId,
      now
    });
    if (outboxEvent.createdAt.getTime() !== now.getTime()) {
      return;
    }
    await this.auditLog.append({
      tenantId,
      eventType,
      actorId,
      targetType: "evidence_graph_record",
      targetId: recordId,
      traceId: idempotencyKey,
      classification: "confidential",
      body: { recordId }
    });
  }
}
