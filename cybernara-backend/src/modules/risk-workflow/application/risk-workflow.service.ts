import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../../audit-security/public.js";
import { OutboxService } from "../../outbox/public.js";
import {
  acceptRisk,
  createFinding,
  createRemediationTask,
  createRisk,
  createRiskAcceptance,
  createRiskLink,
  createRiskModel,
  createRiskTreatment,
  isRiskAcceptanceActive,
  reviewRemediationTask,
  reviewRiskAcceptance,
  type Finding,
  type RemediationTask,
  type RiskLinkRelationship,
  type RiskLinkTargetType,
  type RiskTreatmentStrategy
} from "../domain/risk.js";
import { RISK_WORKFLOW_REPOSITORY } from "./tokens.js";
import type {
  FindingRecord,
  RemediationTaskRecord,
  RemediationTaskReviewRecord,
  RiskAcceptanceRecord,
  RiskAcceptanceReviewRecord,
  RiskLinkRecord,
  RiskModelRecord,
  RiskRecord,
  RiskTreatmentRecord,
  RiskWorkflowRepository
} from "./risk-workflow.types.js";
import type { Pagination } from "../../../shared/pagination.js";

interface RiskOperationPayload extends Record<string, unknown> {
  findingId?: string;
  taskId?: string;
  riskId?: string;
  riskLinkId?: string;
  riskTreatmentId?: string;
  riskAcceptanceId?: string;
  reviewId?: string;
}

@Injectable()
export class RiskWorkflowService {
  constructor(
    @Inject(RISK_WORKFLOW_REPOSITORY) private readonly repository: RiskWorkflowRepository,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(AuditLogService) private readonly auditLog: AuditLogService
  ) {}

  async createFinding(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    assessmentItemId?: string;
    testResultId?: string;
    severity: Finding["severity"];
    impact?: Finding["impact"];
    likelihood?: Finding["likelihood"];
    ownerId?: string;
    dueAt?: Date;
    description: string;
  }): Promise<FindingRecord> {
    const replay = await this.replayedFinding(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }

    const finding = this.fromDomain(() =>
      createFinding({
        tenantId: input.tenantId,
        assessmentItemId: input.assessmentItemId ?? null,
        testResultId: input.testResultId ?? null,
        severity: input.severity,
        impact: input.impact ?? null,
        likelihood: input.likelihood ?? null,
        ownerId: input.ownerId ?? null,
        dueAt: input.dueAt ?? null,
        description: input.description
      })
    );
    const persisted = await this.repository.createFinding({ finding, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "risk.finding_created",
      aggregateType: "finding",
      aggregateId: persisted.id,
      payload: { findingId: persisted.id },
      body: {
        findingId: persisted.id,
        assessmentItemId: persisted.assessmentItemId,
        testResultId: persisted.testResultId,
        severity: persisted.severity,
        impact: persisted.impact,
        likelihood: persisted.likelihood,
        ownerId: persisted.ownerId,
        dueAt: persisted.dueAt
      }
    });
    return persisted;
  }

  async listFindings(input: {
    tenantId: string;
    assessmentItemId?: string;
    testResultId?: string;
    pagination: Pagination;
  }): Promise<FindingRecord[]> {
    return this.repository.listFindings(input);
  }

  async getFinding(tenantId: string, findingId: string): Promise<FindingRecord> {
    const finding = await this.repository.findFinding(tenantId, findingId);
    if (!finding) {
      throw new NotFoundException("Finding not found.");
    }
    return finding;
  }

  async updateFinding(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    findingId: string;
    severity: Finding["severity"];
    impact?: Finding["impact"];
    likelihood?: Finding["likelihood"];
    ownerId?: string;
    dueAt?: Date;
    description: string;
  }): Promise<FindingRecord> {
    const replay = await this.replayedFinding(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }

    await this.getFinding(input.tenantId, input.findingId);
    const updated = await this.repository.updateFinding(input);
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "risk.finding_updated",
      aggregateType: "finding",
      aggregateId: updated.id,
      payload: { findingId: updated.id },
      body: {
        findingId: updated.id,
        severity: updated.severity,
        impact: updated.impact,
        likelihood: updated.likelihood,
        ownerId: updated.ownerId,
        dueAt: updated.dueAt
      }
    });
    return updated;
  }

  async createRemediationTask(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    findingId: string;
    ownerId: string;
    dueAt: Date;
  }): Promise<RemediationTaskRecord> {
    const replay = await this.replayedTask(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }

    await this.getFinding(input.tenantId, input.findingId);
    const task = createRemediationTask({
      findingId: input.findingId,
      ownerId: input.ownerId,
      dueAt: input.dueAt
    });
    const persisted = await this.repository.createRemediationTask({
      tenantId: input.tenantId,
      task,
      actorId: input.actorId
    });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "risk.remediation_task_created",
      aggregateType: "remediation_task",
      aggregateId: persisted.id,
      payload: { taskId: persisted.id, findingId: persisted.findingId },
      body: { taskId: persisted.id, findingId: persisted.findingId, ownerId: persisted.ownerId }
    });
    return persisted;
  }

  async listRemediationTasks(input: {
    tenantId: string;
    findingId?: string;
    pagination: Pagination;
  }): Promise<RemediationTaskRecord[]> {
    return this.repository.listRemediationTasks(input);
  }

  async getRemediationTask(tenantId: string, taskId: string): Promise<RemediationTaskRecord> {
    const task = await this.repository.findRemediationTask(tenantId, taskId);
    if (!task) {
      throw new NotFoundException("Remediation task not found.");
    }
    return task;
  }

  async updateRemediationTask(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    taskId: string;
    ownerId: string;
    dueAt: Date;
    status: Exclude<RemediationTask["status"], "risk_accepted">;
  }): Promise<RemediationTaskRecord> {
    const replay = await this.replayedTask(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }

    await this.getRemediationTask(input.tenantId, input.taskId);
    const updated = await this.repository.updateRemediationTask(input);
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "risk.remediation_task_updated",
      aggregateType: "remediation_task",
      aggregateId: updated.id,
      payload: { taskId: updated.id, findingId: updated.findingId },
      body: { taskId: updated.id, status: updated.status }
    });
    return updated;
  }

  async reviewRemediationTask(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    taskId: string;
    decision: "approved" | "rejected";
    rationale: string;
    evidenceVersionIds?: string[];
  }): Promise<RemediationTaskReviewRecord> {
    const replayed = await this.outbox.findByIdempotencyKey(input.tenantId, input.idempotencyKey);
    if (replayed) {
      const payload = replayed.payload as RiskOperationPayload;
      if (!payload.reviewId || !payload.taskId) {
        throw new BadRequestException("Idempotency key is already used by another operation.");
      }
      const reviews = await this.repository.listRemediationTaskReviews({
        tenantId: input.tenantId,
        taskId: payload.taskId,
        pagination: { limit: 200, offset: 0 }
      });
      const existing = reviews.find((review) => review.id === payload.reviewId);
      if (!existing) {
        throw new NotFoundException("Remediation review not found.");
      }
      return existing;
    }

    const current = await this.getRemediationTask(input.tenantId, input.taskId);
    const review = this.fromDomain(() =>
      reviewRemediationTask({
        remediationTaskId: current.id,
        reviewerId: input.actorId,
        decision: input.decision,
        rationale: input.rationale,
        evidenceVersionIds: input.evidenceVersionIds
      })
    );
    const persisted = await this.repository.createRemediationTaskReview({
      tenantId: input.tenantId,
      review
    });
    await this.repository.updateRemediationTask({
      tenantId: input.tenantId,
      taskId: current.id,
      actorId: input.actorId,
      ownerId: current.ownerId,
      dueAt: current.dueAt,
      status: input.decision === "approved" ? "verified" : "in_progress"
    });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "risk.remediation_task_reviewed",
      aggregateType: "remediation_task",
      aggregateId: current.id,
      payload: { taskId: current.id, reviewId: persisted.id },
      body: {
        taskId: current.id,
        reviewId: persisted.id,
        decision: input.decision,
        rationale: input.rationale,
        evidenceVersionIds: input.evidenceVersionIds ?? []
      }
    });
    return persisted;
  }

  async listRemediationTaskReviews(
    tenantId: string,
    taskId: string,
    pagination: Pagination
  ): Promise<RemediationTaskReviewRecord[]> {
    await this.getRemediationTask(tenantId, taskId);
    return this.repository.listRemediationTaskReviews({ tenantId, taskId, pagination });
  }

  async acceptRisk(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    taskId: string;
    riskId?: string;
    reason: string;
    expiresAt: Date;
    nextReviewDueAt: Date;
    compensatingControls?: string;
  }): Promise<RemediationTaskRecord> {
    const replay = await this.replayedTask(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }

    if (input.riskId) {
      await this.getRisk(input.tenantId, input.riskId);
    }

    const current = await this.getRemediationTask(input.tenantId, input.taskId);
    const hasRemediationEvidence = await this.repository.hasRemediationEvidenceLinks(input.tenantId, current.id);
    if (hasRemediationEvidence) {
      throw new ConflictException(
        "This remediation task already has remediation evidence; risk acceptance is a separate path."
      );
    }

    const accepted = acceptRisk(current, { acceptedBy: input.actorId, reason: input.reason });
    const acceptance = createRiskAcceptance({
      tenantId: input.tenantId,
      remediationTaskId: current.id,
      findingId: current.findingId,
      riskId: input.riskId,
      rationale: input.reason,
      approverId: input.actorId,
      expiresAt: input.expiresAt,
      nextReviewDueAt: input.nextReviewDueAt,
      compensatingControls: input.compensatingControls
    });
    const persistedAcceptance = await this.repository.createRiskAcceptance({
      tenantId: input.tenantId,
      acceptance,
      actorId: input.actorId
    });
    const updated = await this.repository.updateRemediationTask({
      tenantId: input.tenantId,
      taskId: current.id,
      actorId: input.actorId,
      ownerId: current.ownerId,
      dueAt: current.dueAt,
      status: accepted.status
    });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "risk.accepted",
      aggregateType: "remediation_task",
      aggregateId: updated.id,
      payload: { taskId: updated.id, findingId: updated.findingId, riskAcceptanceId: persistedAcceptance.id },
      body: {
        taskId: updated.id,
        findingId: updated.findingId,
        riskAcceptanceId: persistedAcceptance.id,
        reason: input.reason,
        expiresAt: persistedAcceptance.expiresAt,
        nextReviewDueAt: persistedAcceptance.nextReviewDueAt
      }
    });
    return updated;
  }

  async getRiskAcceptanceForTask(
    tenantId: string,
    taskId: string
  ): Promise<RiskAcceptanceRecord & { active: boolean }> {
    await this.getRemediationTask(tenantId, taskId);
    const acceptance = await this.repository.findActiveRiskAcceptanceForTask(tenantId, taskId);
    if (!acceptance) {
      throw new NotFoundException("This remediation task has no risk acceptance on record.");
    }
    return { ...acceptance, active: isRiskAcceptanceActive(acceptance) };
  }

  async listRiskAcceptances(tenantId: string, pagination: Pagination): Promise<(RiskAcceptanceRecord & { active: boolean })[]> {
    const acceptances = await this.repository.listRiskAcceptances({ tenantId, pagination });
    return acceptances.map((acceptance) => ({ ...acceptance, active: isRiskAcceptanceActive(acceptance) }));
  }

  async reviewRiskAcceptance(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    taskId: string;
    decision: "reaffirmed" | "revoked" | "escalated";
    reason: string;
  }): Promise<RiskAcceptanceReviewRecord> {
    const replayed = await this.outbox.findByIdempotencyKey(input.tenantId, input.idempotencyKey);
    if (replayed) {
      const payload = replayed.payload as RiskOperationPayload;
      if (!payload.reviewId || !payload.riskAcceptanceId) {
        throw new BadRequestException("Idempotency key is already used by another operation.");
      }
      const acceptance = await this.repository.findRiskAcceptance(input.tenantId, payload.riskAcceptanceId);
      if (!acceptance) {
        throw new NotFoundException("Risk acceptance not found.");
      }
      return {
        id: payload.reviewId,
        tenantId: input.tenantId,
        riskAcceptanceId: acceptance.id,
        reviewerId: input.actorId,
        decision: input.decision,
        reason: input.reason,
        reviewedAt: acceptance.updatedAt
      };
    }

    const current = await this.getRemediationTask(input.tenantId, input.taskId);
    const acceptance = await this.repository.findActiveRiskAcceptanceForTask(input.tenantId, current.id);
    if (!acceptance) {
      throw new ConflictException("This remediation task has no active risk acceptance to review.");
    }
    const review = reviewRiskAcceptance({
      riskAcceptanceId: acceptance.id,
      reviewerId: input.actorId,
      decision: input.decision,
      reason: input.reason
    });
    const persisted = await this.repository.createRiskAcceptanceReview({ tenantId: input.tenantId, review });
    const targetStatus: RemediationTask["status"] = input.decision === "reaffirmed" ? "verified" : "in_progress";
    await this.repository.updateRemediationTask({
      tenantId: input.tenantId,
      taskId: current.id,
      actorId: input.actorId,
      ownerId: current.ownerId,
      dueAt: current.dueAt,
      status: targetStatus
    });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "risk.acceptance_reviewed",
      aggregateType: "risk_acceptance",
      aggregateId: acceptance.id,
      payload: { riskAcceptanceId: acceptance.id, reviewId: persisted.id },
      body: { riskAcceptanceId: acceptance.id, decision: input.decision, reason: input.reason }
    });
    return persisted;
  }

  // G-09 Phase 1 (enterprise risk register, migration
  // 0019_g09_enterprise_grc_risk_register.sql). risk_models is platform-level
  // configuration rather than a per-incident workflow entity, so it gets a
  // simple create+list surface without idempotency replay (there is no
  // meaningful "retry the same model creation" scenario the way there is for
  // a finding or a remediation task).
  async createRiskModel(input: {
    tenantId: string;
    actorId: string;
    modelKey: string;
    modelVersion: string;
    scalesJson: Record<string, unknown>;
    formula: string;
    thresholds: Record<string, unknown>;
  }): Promise<RiskModelRecord> {
    const model = this.fromDomain(() => createRiskModel(input));
    return this.repository.createRiskModel({ model, actorId: input.actorId });
  }

  listRiskModels(tenantId: string, pagination: Pagination): Promise<RiskModelRecord[]> {
    return this.repository.listRiskModels({ tenantId, pagination });
  }

  async createRisk(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    workspaceId?: string;
    riskModelId?: string;
    riskKey: string;
    title: string;
    category: string;
    inherentScore: number;
    residualScore: number;
    ownerId: string;
  }): Promise<RiskRecord> {
    const replay = await this.replayedRisk(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }

    const risk = this.fromDomain(() => createRisk(input));
    const persisted = await this.repository.createRisk({ risk, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "risk.risk_created",
      aggregateType: "risk",
      aggregateId: persisted.id,
      payload: { riskId: persisted.id },
      body: { riskId: persisted.id, riskKey: persisted.riskKey, category: persisted.category }
    });
    return persisted;
  }

  listRisks(tenantId: string, pagination: Pagination): Promise<RiskRecord[]> {
    return this.repository.listRisks({ tenantId, pagination });
  }

  async getRisk(tenantId: string, riskId: string): Promise<RiskRecord> {
    const risk = await this.repository.findRisk(tenantId, riskId);
    if (!risk) {
      throw new NotFoundException("Risk not found.");
    }
    return risk;
  }

  async createRiskLink(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    riskId: string;
    targetType: RiskLinkTargetType;
    targetId: string;
    relationship: RiskLinkRelationship;
  }): Promise<RiskLinkRecord> {
    const replay = await this.replayedRiskLink(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }

    await this.getRisk(input.tenantId, input.riskId);
    const link = this.fromDomain(() => createRiskLink(input));
    const persisted = await this.repository.createRiskLink({ link, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "risk.risk_link_created",
      aggregateType: "risk_link",
      aggregateId: persisted.id,
      payload: { riskLinkId: persisted.id, riskId: persisted.riskId },
      body: {
        riskLinkId: persisted.id,
        riskId: persisted.riskId,
        targetType: persisted.targetType,
        targetId: persisted.targetId
      }
    });
    return persisted;
  }

  async listRiskLinks(tenantId: string, riskId: string, pagination: Pagination): Promise<RiskLinkRecord[]> {
    await this.getRisk(tenantId, riskId);
    return this.repository.listRiskLinks({ tenantId, riskId, pagination });
  }

  async createRiskTreatment(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    riskId: string;
    strategy: RiskTreatmentStrategy;
    plan: string;
    ownerId: string;
    dueAt: Date;
  }): Promise<RiskTreatmentRecord> {
    const replay = await this.replayedRiskTreatment(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }

    await this.getRisk(input.tenantId, input.riskId);
    const treatment = this.fromDomain(() => createRiskTreatment(input));
    const persisted = await this.repository.createRiskTreatment({ treatment, actorId: input.actorId });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "risk.risk_treatment_created",
      aggregateType: "risk_treatment",
      aggregateId: persisted.id,
      payload: { riskTreatmentId: persisted.id, riskId: persisted.riskId },
      body: { riskTreatmentId: persisted.id, riskId: persisted.riskId, strategy: persisted.strategy }
    });
    return persisted;
  }

  async listRiskTreatments(tenantId: string, riskId: string, pagination: Pagination): Promise<RiskTreatmentRecord[]> {
    await this.getRisk(tenantId, riskId);
    return this.repository.listRiskTreatments({ tenantId, riskId, pagination });
  }

  private async replayedRisk(tenantId: string, idempotencyKey: string): Promise<RiskRecord | null> {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as RiskOperationPayload;
    if (!payload.riskId) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    return this.getRisk(tenantId, payload.riskId);
  }

  private async replayedRiskLink(tenantId: string, idempotencyKey: string): Promise<RiskLinkRecord | null> {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as RiskOperationPayload;
    if (!payload.riskLinkId || !payload.riskId) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    const links = await this.repository.listRiskLinks({
      tenantId,
      riskId: payload.riskId,
      pagination: { limit: 200, offset: 0 }
    });
    const match = links.find((link) => link.id === payload.riskLinkId);
    if (!match) {
      throw new NotFoundException("Risk link not found.");
    }
    return match;
  }

  private async replayedRiskTreatment(tenantId: string, idempotencyKey: string): Promise<RiskTreatmentRecord | null> {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as RiskOperationPayload;
    if (!payload.riskTreatmentId || !payload.riskId) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    const treatments = await this.repository.listRiskTreatments({
      tenantId,
      riskId: payload.riskId,
      pagination: { limit: 200, offset: 0 }
    });
    const match = treatments.find((treatment) => treatment.id === payload.riskTreatmentId);
    if (!match) {
      throw new NotFoundException("Risk treatment not found.");
    }
    return match;
  }

  private fromDomain<T>(operation: () => T): T {
    try {
      return operation();
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  private async replayedFinding(tenantId: string, idempotencyKey: string): Promise<FindingRecord | null> {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as RiskOperationPayload;
    if (!payload.findingId) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    return this.getFinding(tenantId, payload.findingId);
  }

  private async replayedTask(tenantId: string, idempotencyKey: string): Promise<RemediationTaskRecord | null> {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as RiskOperationPayload;
    if (!payload.taskId) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    return this.getRemediationTask(tenantId, payload.taskId);
  }

  private async publishMutation(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    payload: RiskOperationPayload;
    body: Record<string, unknown>;
  }): Promise<void> {
    const now = new Date();
    const outboxEvent = await this.outbox.publish({
      tenantId: input.tenantId,
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload,
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
      targetType: input.aggregateType,
      targetId: input.aggregateId,
      traceId: input.idempotencyKey,
      classification: "confidential",
      body: input.body
    });
  }
}