import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { AuditEventInput, AuditLogService } from "../../src/modules/audit-security/public.js";
import { EvidenceAssuranceService } from "../../src/modules/evidence-assurance/application/evidence-assurance.service.js";
import type {
  AutomatedTest,
  AutomatedTestRow,
  AutomatedTestRun,
  AutomatedTestRunRow,
  EvidenceCustodyEvent,
  EvidenceCustodyEventRow,
  EvidenceExpiryEvent,
  EvidenceExpiryEventRow,
  EvidenceLink,
  EvidenceLinkRow,
  EvidenceRecord,
  EvidenceRepository,
  EvidenceRequest,
  EvidenceRequestRow,
  EvidenceReview,
  EvidenceReviewRow,
  EvidenceSample,
  EvidenceSampleRow,
  EvidenceVersion,
  EvidenceVersionRow,
  MalwareScanResult,
  MalwareScanResultRow
} from "../../src/modules/evidence-assurance/public.js";
import type { OutboxEvent, OutboxService } from "../../src/modules/outbox/public.js";
import { createOutboxEvent } from "../../src/modules/outbox/domain/outbox-event.js";
import { RiskWorkflowService } from "../../src/modules/risk-workflow/application/risk-workflow.service.js";
import type {
  FindingRecord,
  RemediationTaskRecord,
  RemediationTaskReview,
  RemediationTaskReviewRecord,
  RiskAcceptance,
  RiskAcceptanceRecord,
  RiskAcceptanceReview,
  RiskAcceptanceReviewRecord,
  RiskLinkRecord,
  RiskModelRecord,
  RiskRecord,
  RiskTreatmentRecord,
  RiskWorkflowRepository
} from "../../src/modules/risk-workflow/public.js";

describe("A3 application-service orchestration", () => {
  it("deduplicates evidence upload initiation and emits one outbox/audit side effect", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const evidenceRepository = new InMemoryEvidenceRepository();
    const outbox = new InMemoryOutbox();
    const audit = new InMemoryAuditLog();
    const service = new EvidenceAssuranceService(
      evidenceRepository,
      outbox as unknown as OutboxService,
      audit as unknown as AuditLogService
    );

    const input = {
      tenantId,
      actorId,
      idempotencyKey: "a3-unit-evidence",
      ownerId: randomUUID(),
      fileName: "policy.pdf",
      classification: "restricted" as const,
      periodStart: new Date("2026-01-01T00:00:00.000Z"),
      periodEnd: new Date("2026-12-31T00:00:00.000Z"),
      scopeTags: ["soc2"]
    };
    const first = await service.initiateUpload(input);
    const second = await service.initiateUpload(input);

    expect(second.id).toBe(first.id);
    expect(evidenceRepository.records.size).toBe(1);
    expect(outbox.events).toHaveLength(1);
    expect(audit.events).toHaveLength(1);
    expect(outbox.events[0].payload).toEqual({ evidenceId: first.id });
  });

  it("retains committed evidence bytes for authenticated download", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const evidenceRepository = new InMemoryEvidenceRepository();
    const outbox = new InMemoryOutbox();
    const audit = new InMemoryAuditLog();
    const service = new EvidenceAssuranceService(
      evidenceRepository,
      outbox as unknown as OutboxService,
      audit as unknown as AuditLogService
    );
    const evidenceBytes = Buffer.from("SOC 2 access review evidence sample", "utf8");

    const initiated = await service.initiateUpload({
      tenantId,
      actorId,
      idempotencyKey: "a3-unit-evidence-download-init",
      ownerId: actorId,
      fileName: "soc2-access-review.txt",
      classification: "restricted",
      periodStart: new Date("2026-01-01T00:00:00.000Z"),
      periodEnd: new Date("2026-12-31T00:00:00.000Z"),
      scopeTags: ["soc2", "access"]
    });
    const uploaded = await service.uploadBytes({
      tenantId,
      actorId,
      evidenceId: initiated.id,
      bytesBase64: evidenceBytes.toString("base64"),
      mimeType: "text/plain",
      storageUri: `cybernara://evidence/${initiated.id}/soc2-access-review.txt`,
      idempotencyKey: "a3-unit-evidence-download-upload"
    });

    const downloaded = await service.downloadEvidenceObject(tenantId, uploaded.id);

    expect(downloaded.evidence.id).toBe(uploaded.id);
    expect(downloaded.version.contentAvailable).toBe(true);
    expect(downloaded.version.mimeType).toBe("text/plain");
    expect(downloaded.bytes.equals(evidenceBytes)).toBe(true);
  });

  // G-03 remediation: this test used to assert that recording the acceptance
  // reason in the audit/outbox payload WAS the complete behavior — that
  // encoded the exact gap the schema remediation closes (schema spec §18:
  // "Risk acceptance cannot be represented by task status alone"). It now
  // asserts the real risk_acceptances row is what task status transitions
  // are backed by, with the audit/outbox trail kept as a secondary record
  // rather than the only record.
  it("accepts remediation risk by creating a real risk_acceptances row, not just flipping task status", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const riskRepository = new InMemoryRiskRepository();
    const outbox = new InMemoryOutbox();
    const audit = new InMemoryAuditLog();
    const service = new RiskWorkflowService(
      riskRepository,
      outbox as unknown as OutboxService,
      audit as unknown as AuditLogService
    );
    const finding = riskRepository.seedFinding(tenantId);
    const task = riskRepository.seedTask(tenantId, finding.id);
    const expiresAt = new Date("2027-01-01T00:00:00.000Z");
    const nextReviewDueAt = new Date("2026-10-01T00:00:00.000Z");

    const accepted = await service.acceptRisk({
      tenantId,
      actorId,
      idempotencyKey: "a3-unit-risk-accept",
      taskId: task.id,
      reason: "Residual risk is approved for this scoped period.",
      expiresAt,
      nextReviewDueAt,
      compensatingControls: "Quarterly manual review of the scoped population."
    });

    expect(accepted.status).toBe("risk_accepted");
    expect(riskRepository.acceptances.size).toBe(1);
    const acceptanceRecord = [...riskRepository.acceptances.values()][0];
    expect(acceptanceRecord.remediationTaskId).toBe(task.id);
    expect(acceptanceRecord.findingId).toBe(finding.id);
    expect(acceptanceRecord.approverId).toBe(actorId);
    expect(acceptanceRecord.rationale).toBe("Residual risk is approved for this scoped period.");
    expect(acceptanceRecord.expiresAt).toEqual(expiresAt);
    expect(acceptanceRecord.nextReviewDueAt).toEqual(nextReviewDueAt);

    expect(outbox.events).toHaveLength(1);
    expect(outbox.events[0].payload).toEqual({
      taskId: task.id,
      findingId: finding.id,
      riskAcceptanceId: acceptanceRecord.id
    });
    expect(audit.events[0].body.reason).toBe("Residual risk is approved for this scoped period.");

    const fetched = await service.getRiskAcceptanceForTask(tenantId, task.id);
    expect(fetched.active).toBe(true);
  });

  it("records remediation review decisions and moves the operational task state", async () => {
    const tenantId = randomUUID();
    const reviewerId = randomUUID();
    const riskRepository = new InMemoryRiskRepository();
    const outbox = new InMemoryOutbox();
    const audit = new InMemoryAuditLog();
    const service = new RiskWorkflowService(
      riskRepository,
      outbox as unknown as OutboxService,
      audit as unknown as AuditLogService
    );
    const finding = riskRepository.seedFinding(tenantId);
    const task = riskRepository.seedTask(tenantId, finding.id);
    const evidenceVersionId = randomUUID();

    const rejected = await service.reviewRemediationTask({
      tenantId,
      actorId: reviewerId,
      idempotencyKey: "a3-unit-remediation-review-reject",
      taskId: task.id,
      decision: "rejected",
      rationale: "Evidence does not prove the remediation is complete.",
      evidenceVersionIds: [evidenceVersionId]
    });

    expect(rejected.decision).toBe("rejected");
    expect(rejected.evidenceVersionIds).toEqual([evidenceVersionId]);
    expect((await service.getRemediationTask(tenantId, task.id)).status).toBe("in_progress");

    const approved = await service.reviewRemediationTask({
      tenantId,
      actorId: reviewerId,
      idempotencyKey: "a3-unit-remediation-review-approve",
      taskId: task.id,
      decision: "approved",
      rationale: "Updated evidence proves the remediation is complete.",
      evidenceVersionIds: [evidenceVersionId]
    });

    expect(approved.decision).toBe("approved");
    expect((await service.getRemediationTask(tenantId, task.id)).status).toBe("verified");
    expect(await service.listRemediationTaskReviews(tenantId, task.id, { limit: 10, offset: 0 })).toHaveLength(2);
    expect(outbox.events.map((event) => event.eventType)).toEqual([
      "risk.remediation_task_reviewed",
      "risk.remediation_task_reviewed"
    ]);
    expect(audit.events[1].body).toMatchObject({
      decision: "approved",
      rationale: "Updated evidence proves the remediation is complete.",
      evidenceVersionIds: [evidenceVersionId]
    });
  });

  it("rejects risk acceptance after remediation evidence has been submitted for the same task", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const riskRepository = new InMemoryRiskRepository();
    const outbox = new InMemoryOutbox();
    const audit = new InMemoryAuditLog();
    const service = new RiskWorkflowService(
      riskRepository,
      outbox as unknown as OutboxService,
      audit as unknown as AuditLogService
    );
    const finding = riskRepository.seedFinding(tenantId);
    const task = riskRepository.seedTask(tenantId, finding.id);
    riskRepository.seedRemediationEvidenceLink(task.id);

    await expect(
      service.acceptRisk({
        tenantId,
        actorId,
        idempotencyKey: "a3-unit-risk-accept-blocked-by-evidence",
        taskId: task.id,
        reason: "Residual risk is approved for this scoped period.",
        expiresAt: new Date("2027-01-01T00:00:00.000Z"),
        nextReviewDueAt: new Date("2026-10-01T00:00:00.000Z")
      })
    ).rejects.toThrow(/remediation evidence/i);
    expect(riskRepository.acceptances.size).toBe(0);
    expect(outbox.events).toHaveLength(0);
  });
});

class InMemoryOutbox {
  readonly events: OutboxEvent[] = [];

  async findByIdempotencyKey(tenantId: string, idempotencyKey: string): Promise<OutboxEvent | null> {
    return this.events.find((event) => event.tenantId === tenantId && event.idempotencyKey === idempotencyKey) ?? null;
  }

  async publish(input: {
    tenantId: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    payload: Record<string, unknown>;
    idempotencyKey: string;
    createdBy: string;
    now?: Date;
  }): Promise<OutboxEvent> {
    const existing = await this.findByIdempotencyKey(input.tenantId, input.idempotencyKey);
    if (existing) {
      return existing;
    }
    const event = createOutboxEvent(input);
    this.events.push(event);
    return event;
  }
}

class InMemoryAuditLog {
  readonly events: AuditEventInput[] = [];

  async append(input: AuditEventInput): Promise<AuditEventInput> {
    this.events.push(input);
    return input;
  }
}

class InMemoryEvidenceRepository implements EvidenceRepository {
  readonly records = new Map<string, EvidenceRecord>();
  readonly versions = new Map<string, EvidenceVersionRow>();
  readonly versionBytes = new Map<string, Buffer>();
  readonly links = new Map<string, EvidenceLinkRow>();
  readonly requests = new Map<string, EvidenceRequestRow>();
  readonly reviews = new Map<string, EvidenceReviewRow>();
  readonly automatedTests = new Map<string, AutomatedTestRow>();
  readonly automatedTestRuns = new Map<string, AutomatedTestRunRow>();
  readonly samples = new Map<string, EvidenceSampleRow>();
  readonly malwareScanResults = new Map<string, MalwareScanResultRow>();
  readonly expiryEvents = new Map<string, EvidenceExpiryEventRow>();
  readonly custodyEvents = new Map<string, EvidenceCustodyEventRow>();

  async create(input: { evidence: Omit<EvidenceRecord, "version" | "createdBy" | "updatedBy" | "updatedAt">; actorId: string }): Promise<EvidenceRecord> {
    const record: EvidenceRecord = {
      ...input.evidence,
      version: 1,
      createdBy: input.actorId,
      updatedBy: input.actorId,
      updatedAt: input.evidence.createdAt
    };
    this.records.set(record.id, record);
    return record;
  }

  async list(): Promise<EvidenceRecord[]> {
    return [...this.records.values()];
  }

  async find(tenantId: string, evidenceId: string): Promise<EvidenceRecord | null> {
    const record = this.records.get(evidenceId);
    return record?.tenantId === tenantId ? record : null;
  }

  async updateState(input: {
    tenantId: string;
    evidence: EvidenceRecord;
    actorId: string;
    storageUri?: string;
  }): Promise<EvidenceRecord> {
    const record: EvidenceRecord = {
      ...input.evidence,
      storageUri: input.storageUri,
      version: input.evidence.version + 1,
      updatedBy: input.actorId,
      updatedAt: new Date()
    };
    this.records.set(record.id, record);
    return record;
  }

  async createEvidenceVersion(input: { version: EvidenceVersion; actorId: string; contentBytes?: Buffer }): Promise<EvidenceVersionRow> {
    const record: EvidenceVersionRow = {
      ...withAppendOnlyMetadata(input.version, input.actorId),
      contentAvailable: Boolean(input.contentBytes)
    };
    this.versions.set(record.id, record);
    if (input.contentBytes) {
      this.versionBytes.set(record.id, input.contentBytes);
    }
    return record;
  }

  async listEvidenceVersions(input: { tenantId: string; evidenceId: string }): Promise<EvidenceVersionRow[]> {
    return [...this.versions.values()].filter((v) => v.tenantId === input.tenantId && v.evidenceId === input.evidenceId);
  }

  async findEvidenceVersion(tenantId: string, evidenceVersionId: string): Promise<EvidenceVersionRow | null> {
    const record = this.versions.get(evidenceVersionId);
    return record?.tenantId === tenantId ? record : null;
  }

  async findEvidenceVersionBytes(tenantId: string, evidenceVersionId: string): Promise<Buffer | null> {
    const record = this.versions.get(evidenceVersionId);
    if (!record || record.tenantId !== tenantId) {
      return null;
    }
    return this.versionBytes.get(evidenceVersionId) ?? null;
  }

  async createEvidenceLink(input: { link: EvidenceLink; actorId: string }): Promise<EvidenceLinkRow> {
    const record: EvidenceLinkRow = withMetadata(input.link, input.actorId);
    this.links.set(record.id, record);
    return record;
  }

  async listEvidenceLinks(input: { tenantId: string; evidenceVersionId: string }): Promise<EvidenceLinkRow[]> {
    return [...this.links.values()].filter((l) => l.tenantId === input.tenantId && l.evidenceVersionId === input.evidenceVersionId);
  }

  async createEvidenceRequest(input: { request: EvidenceRequest; actorId: string }): Promise<EvidenceRequestRow> {
    const record: EvidenceRequestRow = withMetadata(input.request, input.actorId);
    this.requests.set(record.id, record);
    return record;
  }

  async listEvidenceRequests(input: { tenantId: string; assessmentId: string }): Promise<EvidenceRequestRow[]> {
    return [...this.requests.values()].filter((r) => r.tenantId === input.tenantId && r.assessmentId === input.assessmentId);
  }

  async createEvidenceReview(input: { review: EvidenceReview; actorId: string }): Promise<EvidenceReviewRow> {
    const record: EvidenceReviewRow = withMetadata(input.review, input.actorId);
    this.reviews.set(record.id, record);
    return record;
  }

  async listEvidenceReviews(input: { tenantId: string; evidenceVersionId: string }): Promise<EvidenceReviewRow[]> {
    return [...this.reviews.values()].filter((r) => r.tenantId === input.tenantId && r.evidenceVersionId === input.evidenceVersionId);
  }

  async createAutomatedTest(input: { test: AutomatedTest; actorId: string }): Promise<AutomatedTestRow> {
    const record: AutomatedTestRow = withMetadata(input.test, input.actorId);
    this.automatedTests.set(record.id, record);
    return record;
  }

  async listAutomatedTests(input: { tenantId: string }): Promise<AutomatedTestRow[]> {
    return [...this.automatedTests.values()].filter((t) => t.tenantId === input.tenantId);
  }

  async findAutomatedTest(tenantId: string, automatedTestId: string): Promise<AutomatedTestRow | null> {
    const record = this.automatedTests.get(automatedTestId);
    return record?.tenantId === tenantId ? record : null;
  }

  async createAutomatedTestRun(input: { run: AutomatedTestRun; actorId: string }): Promise<AutomatedTestRunRow> {
    const record: AutomatedTestRunRow = withMetadata(input.run, input.actorId);
    this.automatedTestRuns.set(record.id, record);
    return record;
  }

  async listAutomatedTestRuns(input: { tenantId: string; automatedTestId: string }): Promise<AutomatedTestRunRow[]> {
    return [...this.automatedTestRuns.values()].filter(
      (r) => r.tenantId === input.tenantId && r.automatedTestId === input.automatedTestId
    );
  }

  async createEvidenceSample(input: { sample: EvidenceSample; actorId: string }): Promise<EvidenceSampleRow> {
    const record: EvidenceSampleRow = withMetadata(input.sample, input.actorId);
    this.samples.set(record.id, record);
    return record;
  }

  async listEvidenceSamples(input: { tenantId: string; testResultId: string }): Promise<EvidenceSampleRow[]> {
    return [...this.samples.values()].filter((s) => s.tenantId === input.tenantId && s.testResultId === input.testResultId);
  }

  async createMalwareScanResult(input: { scan: MalwareScanResult; actorId: string }): Promise<MalwareScanResultRow> {
    const record: MalwareScanResultRow = withMetadata(input.scan, input.actorId);
    this.malwareScanResults.set(record.id, record);
    return record;
  }

  async listMalwareScanResults(input: { tenantId: string; evidenceVersionId: string }): Promise<MalwareScanResultRow[]> {
    return [...this.malwareScanResults.values()].filter(
      (m) => m.tenantId === input.tenantId && m.evidenceVersionId === input.evidenceVersionId
    );
  }

  async createEvidenceExpiryEvent(input: { event: EvidenceExpiryEvent; actorId: string }): Promise<EvidenceExpiryEventRow> {
    const record: EvidenceExpiryEventRow = withAppendOnlyMetadata(input.event, input.actorId);
    this.expiryEvents.set(record.id, record);
    return record;
  }

  async listEvidenceExpiryEvents(input: { tenantId: string; evidenceId: string }): Promise<EvidenceExpiryEventRow[]> {
    return [...this.expiryEvents.values()].filter((e) => e.tenantId === input.tenantId && e.evidenceId === input.evidenceId);
  }

  async createEvidenceCustodyEvent(input: { event: EvidenceCustodyEvent; actorId: string }): Promise<EvidenceCustodyEventRow> {
    const record: EvidenceCustodyEventRow = withAppendOnlyMetadata(input.event, input.actorId);
    this.custodyEvents.set(record.id, record);
    return record;
  }

  async listEvidenceCustodyEvents(input: { tenantId: string; evidenceVersionId: string }): Promise<EvidenceCustodyEventRow[]> {
    return [...this.custodyEvents.values()].filter(
      (e) => e.tenantId === input.tenantId && e.evidenceVersionId === input.evidenceVersionId
    );
  }
}

function withMetadata<T extends { id: string }>(record: T, actorId: string): T & {
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
} {
  const now = new Date();
  return { ...record, classification: "confidential", createdBy: actorId, createdAt: now, updatedBy: actorId, updatedAt: now };
}

function withAppendOnlyMetadata<T extends { id: string }>(record: T, actorId: string): T & {
  classification: string;
  createdBy: string;
  createdAt: Date;
} {
  return { ...record, classification: "restricted", createdBy: actorId, createdAt: new Date() };
}

class InMemoryRiskRepository implements RiskWorkflowRepository {
  readonly findings = new Map<string, FindingRecord>();
  readonly tasks = new Map<string, RemediationTaskRecord>();
  readonly taskReviews = new Map<string, RemediationTaskReviewRecord>();
  readonly acceptances = new Map<string, RiskAcceptanceRecord>();
  readonly reviews = new Map<string, RiskAcceptanceReviewRecord>();
  readonly riskModels = new Map<string, RiskModelRecord>();
  readonly risks = new Map<string, RiskRecord>();
  readonly riskLinks = new Map<string, RiskLinkRecord>();
  readonly riskTreatments = new Map<string, RiskTreatmentRecord>();
  readonly remediationEvidenceTaskIds = new Set<string>();

  seedFinding(tenantId: string): FindingRecord {
    const now = new Date();
    const finding: FindingRecord = {
      id: randomUUID(),
      tenantId,
      version: 1,
      assessmentItemId: randomUUID(),
      testResultId: null,
      severity: "high",
      description: "Seed finding",
      classification: "confidential",
      createdBy: randomUUID(),
      createdAt: now,
      updatedBy: randomUUID(),
      updatedAt: now
    };
    this.findings.set(finding.id, finding);
    return finding;
  }

  seedTask(tenantId: string, findingId: string): RemediationTaskRecord {
    const now = new Date();
    const task: RemediationTaskRecord = {
      id: randomUUID(),
      tenantId,
      version: 1,
      findingId,
      ownerId: randomUUID(),
      dueAt: new Date("2026-12-31T00:00:00.000Z"),
      status: "open",
      classification: "confidential",
      createdBy: randomUUID(),
      createdAt: now,
      updatedBy: randomUUID(),
      updatedAt: now
    };
    this.tasks.set(task.id, task);
    return task;
  }

  seedRemediationEvidenceLink(taskId: string): void {
    this.remediationEvidenceTaskIds.add(taskId);
  }

  async createFinding(input: { finding: Omit<FindingRecord, "version" | "classification" | "createdBy" | "updatedBy" | "updatedAt">; actorId: string }): Promise<FindingRecord> {
    const record: FindingRecord = {
      ...input.finding,
      version: 1,
      classification: "confidential",
      createdBy: input.actorId,
      updatedBy: input.actorId,
      updatedAt: input.finding.createdAt
    };
    this.findings.set(record.id, record);
    return record;
  }

  async listFindings(): Promise<FindingRecord[]> {
    return [...this.findings.values()];
  }

  async findFinding(tenantId: string, findingId: string): Promise<FindingRecord | null> {
    const finding = this.findings.get(findingId);
    return finding?.tenantId === tenantId ? finding : null;
  }

  async updateFinding(input: {
    tenantId: string;
    findingId: string;
    actorId: string;
    severity: FindingRecord["severity"];
    description: string;
  }): Promise<FindingRecord> {
    const current = await this.findFinding(input.tenantId, input.findingId);
    if (!current) {
      throw new Error("Finding not found.");
    }
    const updated = {
      ...current,
      severity: input.severity,
      description: input.description,
      updatedBy: input.actorId,
      updatedAt: new Date(),
      version: current.version + 1
    };
    this.findings.set(updated.id, updated);
    return updated;
  }

  async createRemediationTask(input: {
    tenantId: string;
    task: Omit<RemediationTaskRecord, "tenantId" | "version" | "classification" | "createdBy" | "createdAt" | "updatedBy" | "updatedAt">;
    actorId: string;
  }): Promise<RemediationTaskRecord> {
    const now = new Date();
    const record: RemediationTaskRecord = {
      ...input.task,
      tenantId: input.tenantId,
      version: 1,
      classification: "confidential",
      createdBy: input.actorId,
      createdAt: now,
      updatedBy: input.actorId,
      updatedAt: now
    };
    this.tasks.set(record.id, record);
    return record;
  }

  async listRemediationTasks(): Promise<RemediationTaskRecord[]> {
    return [...this.tasks.values()];
  }

  async findRemediationTask(tenantId: string, taskId: string): Promise<RemediationTaskRecord | null> {
    const task = this.tasks.get(taskId);
    return task?.tenantId === tenantId ? task : null;
  }

  async updateRemediationTask(input: {
    tenantId: string;
    taskId: string;
    actorId: string;
    ownerId: string;
    dueAt: Date;
    status: RemediationTaskRecord["status"];
  }): Promise<RemediationTaskRecord> {
    const current = await this.findRemediationTask(input.tenantId, input.taskId);
    if (!current) {
      throw new Error("Remediation task not found.");
    }
    const updated: RemediationTaskRecord = {
      ...current,
      ownerId: input.ownerId,
      dueAt: input.dueAt,
      status: input.status,
      updatedBy: input.actorId,
      updatedAt: new Date(),
      version: current.version + 1
    };
    this.tasks.set(updated.id, updated);
    return updated;
  }

  async createRemediationTaskReview(input: {
    tenantId: string;
    review: RemediationTaskReview;
  }): Promise<RemediationTaskReviewRecord> {
    const record: RemediationTaskReviewRecord = {
      ...input.review,
      tenantId: input.tenantId,
      version: 1
    };
    this.taskReviews.set(record.id, record);
    return record;
  }

  async listRemediationTaskReviews(input: {
    tenantId: string;
    taskId: string;
    pagination: { limit: number; offset: number };
  }): Promise<RemediationTaskReviewRecord[]> {
    return [...this.taskReviews.values()]
      .filter((review) => review.tenantId === input.tenantId && review.remediationTaskId === input.taskId)
      .sort((a, b) => b.reviewedAt.getTime() - a.reviewedAt.getTime())
      .slice(input.pagination.offset, input.pagination.offset + input.pagination.limit);
  }

  async createRiskAcceptance(input: {
    tenantId: string;
    acceptance: RiskAcceptance;
    actorId: string;
  }): Promise<RiskAcceptanceRecord> {
    const now = new Date();
    const record: RiskAcceptanceRecord = {
      ...input.acceptance,
      tenantId: input.tenantId,
      version: 1,
      classification: "confidential",
      createdBy: input.actorId,
      createdAt: now,
      updatedBy: input.actorId,
      updatedAt: now
    };
    this.acceptances.set(record.id, record);
    return record;
  }

  async hasRemediationEvidenceLinks(_tenantId: string, remediationTaskId: string): Promise<boolean> {
    return this.remediationEvidenceTaskIds.has(remediationTaskId);
  }

  async findActiveRiskAcceptanceForTask(tenantId: string, remediationTaskId: string): Promise<RiskAcceptanceRecord | null> {
    const candidates = [...this.acceptances.values()]
      .filter((a) => a.tenantId === tenantId && a.remediationTaskId === remediationTaskId && !a.supersededAt)
      .sort((a, b) => b.approvedAt.getTime() - a.approvedAt.getTime());
    return candidates[0] ?? null;
  }

  async findRiskAcceptance(tenantId: string, riskAcceptanceId: string): Promise<RiskAcceptanceRecord | null> {
    const record = this.acceptances.get(riskAcceptanceId);
    return record?.tenantId === tenantId ? record : null;
  }

  async createRiskAcceptanceReview(input: {
    tenantId: string;
    review: RiskAcceptanceReview;
  }): Promise<RiskAcceptanceReviewRecord> {
    const record: RiskAcceptanceReviewRecord = {
      ...input.review,
      tenantId: input.tenantId
    };
    this.reviews.set(record.id, record);
    return record;
  }

  async createRiskModel(input: { model: RiskModelRecord; actorId: string }): Promise<RiskModelRecord> {
    const record: RiskModelRecord = { ...input.model, version: 1, classification: "confidential", createdBy: input.actorId, createdAt: new Date(), updatedBy: input.actorId, updatedAt: new Date() };
    this.riskModels.set(record.id, record);
    return record;
  }

  async listRiskModels(): Promise<RiskModelRecord[]> {
    return [...this.riskModels.values()];
  }

  async createRisk(input: { risk: RiskRecord; actorId: string }): Promise<RiskRecord> {
    const record: RiskRecord = { ...input.risk, version: 1, classification: "confidential", createdBy: input.actorId, createdAt: new Date(), updatedBy: input.actorId, updatedAt: new Date() };
    this.risks.set(record.id, record);
    return record;
  }

  async listRisks(): Promise<RiskRecord[]> {
    return [...this.risks.values()];
  }

  async findRisk(tenantId: string, riskId: string): Promise<RiskRecord | null> {
    const record = this.risks.get(riskId);
    return record?.tenantId === tenantId ? record : null;
  }

  async createRiskLink(input: { link: RiskLinkRecord; actorId: string }): Promise<RiskLinkRecord> {
    const record: RiskLinkRecord = { ...input.link, version: 1, classification: "confidential", createdBy: input.actorId, createdAt: new Date(), updatedBy: input.actorId, updatedAt: new Date() };
    this.riskLinks.set(record.id, record);
    return record;
  }

  async listRiskLinks(input: { tenantId: string; riskId: string }): Promise<RiskLinkRecord[]> {
    return [...this.riskLinks.values()].filter((link) => link.tenantId === input.tenantId && link.riskId === input.riskId);
  }

  async createRiskTreatment(input: { treatment: RiskTreatmentRecord; actorId: string }): Promise<RiskTreatmentRecord> {
    const record: RiskTreatmentRecord = { ...input.treatment, version: 1, classification: "confidential", createdBy: input.actorId, createdAt: new Date(), updatedBy: input.actorId, updatedAt: new Date() };
    this.riskTreatments.set(record.id, record);
    return record;
  }

  async listRiskTreatments(input: { tenantId: string; riskId: string }): Promise<RiskTreatmentRecord[]> {
    return [...this.riskTreatments.values()].filter(
      (treatment) => treatment.tenantId === input.tenantId && treatment.riskId === input.riskId
    );
  }
}
