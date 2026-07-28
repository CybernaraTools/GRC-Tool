import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../../audit-security/public.js";
import { ClosureSnapshotService } from "../../closure-snapshot/public.js";
import { AdminUsersService } from "../../identity-tenant/public.js";
import { OutboxService } from "../../outbox/public.js";
import {
  approveApplicability,
  closeAssessment,
  createAssessment,
  reopenItem,
  reviewItem,
  reviseDraftAssessment,
  submitAnswer,
  type AssessmentItem,
  type AssessmentStatus,
  type PinnedControlRef
} from "../domain/assessment.js";
import {
  createAnswerRevision,
  createApplicabilityDecision,
  createAssessmentSignoff,
  createControlTestResult,
  createReviewDecision,
  createTestProcedure,
  type AnswerRevision,
  type ApplicabilityDecision,
  type AssessmentSignoff,
  type ControlTestResult,
  type ReviewDecision,
  type TestProcedure
} from "../domain/execution-graph.js";
import { ASSESSMENT_REPOSITORY } from "./tokens.js";
import type { AssessmentCreateInput, AssessmentRecord, AssessmentRepository, AssessmentUpdateInput } from "./assessment.types.js";
import { QuestionRepositoryService } from "./question-repository.service.js";
import type { Pagination } from "../../../shared/pagination.js";

interface OperationPayload extends Record<string, unknown> {
  assessmentId: string;
  itemId?: string;
}

@Injectable()
export class AssessmentService {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY) private readonly repository: AssessmentRepository,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(AuditLogService) private readonly auditLog: AuditLogService,
    @Inject(QuestionRepositoryService) private readonly questionRepository: QuestionRepositoryService,
    @Inject(ClosureSnapshotService) private readonly closureSnapshot: ClosureSnapshotService,
    @Inject(AdminUsersService) private readonly adminUsers: AdminUsersService
  ) {}

  async create(input: AssessmentCreateInput): Promise<AssessmentRecord> {
    const replay = await this.replayedAssessment(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }

    const controls = await this.questionRepository.resolveAssessmentControls({
      tenantId: input.tenantId,
      selections: input.controls
    });
    const ownerId = await this.adminUsers.normalizeAssessmentOwnerId(input.tenantId, input.ownerId);
    const assessment = createAssessment({
      tenantId: input.tenantId,
      scopeName: input.scopeName,
      controls,
      createdBy: input.actorId,
      ownerId
    });
    const persisted = await this.repository.createAssessment({
      assessment,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd
    });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "assessment.created",
      assessmentId: persisted.id,
      body: { assessmentId: persisted.id, scopeName: persisted.scopeName }
    });
    return persisted;
  }

  /**
   * Questions Page / Compliance Dashboard feature: an additive sibling to
   * create() for assessments originated from a tenant's own custom question
   * (src/modules/tenant-questions). Custom questions have no backing in the
   * canonical control-mapping catalog, so `resolveAssessmentControls()`
   * (which only ever resolves against CANONICAL_CONTENT_TENANT_ID-scoped
   * rows) cannot and does not resolve them — this method accepts an
   * already-fully-specified PinnedControlRef[] and skips that resolution
   * step entirely, reusing every other part of the existing create() flow
   * (idempotency replay, the createAssessment domain function, persistence,
   * outbox/audit publish) unchanged. Existing callers of create() are
   * unaffected — this is a new method, not a modified one.
   */
  async createFromPinnedControls(input: {
    tenantId: string;
    actorId: string;
    ownerId: string;
    scopeName: string;
    periodStart: Date;
    periodEnd: Date;
    controls: PinnedControlRef[];
    idempotencyKey: string;
  }): Promise<AssessmentRecord> {
    const replay = await this.replayedAssessment(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }

    const ownerId = await this.adminUsers.normalizeAssessmentOwnerId(input.tenantId, input.ownerId);
    const assessment = createAssessment({
      tenantId: input.tenantId,
      scopeName: input.scopeName,
      controls: input.controls,
      createdBy: input.actorId,
      ownerId
    });
    const persisted = await this.repository.createAssessment({
      assessment,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd
    });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "assessment.created",
      assessmentId: persisted.id,
      body: { assessmentId: persisted.id, scopeName: persisted.scopeName }
    });
    return persisted;
  }

  async updateDraft(input: AssessmentUpdateInput): Promise<AssessmentRecord> {
    const replay = await this.replayedAssessment(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const existing = await this.get(input.tenantId, input.assessmentId);
    if (existing.status !== "not_started" || existing.items.some((item) => item.status !== "not_started")) {
      throw new BadRequestException("Only draft assessments that have not started can be edited.");
    }

    const controls = await this.questionRepository.resolveAssessmentControls({
      tenantId: input.tenantId,
      selections: input.controls
    });
    const ownerId = await this.adminUsers.normalizeAssessmentOwnerId(input.tenantId, input.ownerId);
    const assessment = reviseDraftAssessment({
      assessmentId: input.assessmentId,
      tenantId: input.tenantId,
      scopeName: input.scopeName,
      controls,
      updatedBy: input.actorId,
      ownerId
    });
    const persisted = await this.repository.updateDraftAssessment({
      assessment,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd
    });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "assessment.updated",
      assessmentId: persisted.id,
      body: { assessmentId: persisted.id, scopeName: persisted.scopeName }
    });
    return persisted;
  }

  async list(tenantId: string, pagination: Pagination): Promise<AssessmentRecord[]> {
    return this.repository.listAssessments(tenantId, pagination);
  }

  async get(tenantId: string, assessmentId: string): Promise<AssessmentRecord> {
    const assessment = await this.repository.findAssessment(tenantId, assessmentId);
    if (!assessment) {
      throw new NotFoundException("Assessment not found.");
    }
    return assessment;
  }

  async approveApplicability(input: {
    tenantId: string;
    actorId: string;
    assessmentId: string;
    itemId: string;
    applicable: boolean;
    rationale: string;
    idempotencyKey: string;
  }): Promise<AssessmentRecord> {
    const replay = await this.replayedAssessment(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const siblings = await this.findHarmonizedSiblingItems(input.tenantId, input.assessmentId, input.itemId);
    for (const item of siblings) {
      const updated = approveApplicability(item, {
        applicable: input.applicable,
        rationale: input.rationale,
        approvedBy: input.actorId
      });
      await this.repository.updateItem({
        tenantId: input.tenantId,
        assessmentId: input.assessmentId,
        item: updated,
        actorId: input.actorId
      });

      const controlInstance = await this.repository.findControlInstanceByItem(input.tenantId, item.id);
      if (controlInstance) {
        const decision = createApplicabilityDecision({
          controlInstanceId: controlInstance.id,
          applicable: input.applicable,
          rationale: input.rationale,
          decidedBy: input.actorId
        });
        await this.repository.recordApplicabilityDecision({ tenantId: input.tenantId, decision });
      }
    }

    const assessment = await this.repository.updateAssessmentStatus({
      tenantId: input.tenantId,
      assessmentId: input.assessmentId,
      status: "in_progress",
      actorId: input.actorId
    });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "assessment.applicability_approved",
      assessmentId: input.assessmentId,
      itemId: input.itemId,
      body: { assessmentId: input.assessmentId, itemId: input.itemId, applicable: input.applicable }
    });
    return assessment;
  }

  async submitAnswer(input: {
    tenantId: string;
    actorId: string;
    assessmentId: string;
    itemId: string;
    answerText: string;
    evidenceIds: string[];
    idempotencyKey: string;
  }): Promise<AssessmentRecord> {
    const replay = await this.replayedAssessment(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const siblings = await this.findHarmonizedSiblingItems(input.tenantId, input.assessmentId, input.itemId);
    for (const item of siblings) {
      const updated = submitAnswer(item, { answerText: input.answerText, evidenceIds: input.evidenceIds });
      await this.repository.updateItem({
        tenantId: input.tenantId,
        assessmentId: input.assessmentId,
        item: updated,
        actorId: input.actorId
      });

      const previousRevision = await this.repository.findLatestAnswerRevision(input.tenantId, item.id);
      const revision = createAnswerRevision({
        assessmentItemId: item.id,
        revision: (previousRevision?.revision ?? 0) + 1,
        responseJson: { answerText: input.answerText, evidenceIds: input.evidenceIds },
        submittedBy: input.actorId,
        supersedesId: previousRevision?.id
      });
      await this.repository.recordAnswerRevision({ tenantId: input.tenantId, revision });
    }

    const assessment = await this.updateStatusFromItems(input.tenantId, input.assessmentId, input.actorId);
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "assessment.answer_submitted",
      assessmentId: input.assessmentId,
      itemId: input.itemId,
      body: { assessmentId: input.assessmentId, itemId: input.itemId }
    });
    return assessment;
  }

  async review(input: {
    tenantId: string;
    actorId: string;
    assessmentId: string;
    itemId: string;
    approved: boolean;
    reason?: string;
    idempotencyKey: string;
  }): Promise<AssessmentRecord> {
    const replay = await this.replayedAssessment(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const siblings = await this.findHarmonizedSiblingItems(input.tenantId, input.assessmentId, input.itemId);
    for (const item of siblings) {
      const updated = reviewItem(item, {
        approved: input.approved,
        reviewerId: input.actorId,
        reason: input.reason
      });
      await this.repository.updateItem({
        tenantId: input.tenantId,
        assessmentId: input.assessmentId,
        item: updated,
        actorId: input.actorId
      });

      const latestAnswer = await this.repository.findLatestAnswerRevision(input.tenantId, item.id);
      if (latestAnswer && latestAnswer.submittedBy !== input.actorId) {
        const decision = createReviewDecision({
          assessmentItemId: item.id,
          answerRevisionId: latestAnswer.id,
          reviewerId: input.actorId,
          answerSubmittedBy: latestAnswer.submittedBy,
          approved: input.approved,
          reason: input.reason
        });
        await this.repository.recordReviewDecision({ tenantId: input.tenantId, decision });
      }
    }

    const assessment = await this.updateStatusFromItems(input.tenantId, input.assessmentId, input.actorId);
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "assessment.item_reviewed",
      assessmentId: input.assessmentId,
      itemId: input.itemId,
      body: { assessmentId: input.assessmentId, itemId: input.itemId, approved: input.approved }
    });
    return assessment;
  }

  async reopen(input: {
    tenantId: string;
    actorId: string;
    assessmentId: string;
    itemId: string;
    reason: string;
    idempotencyKey: string;
  }): Promise<AssessmentRecord> {
    const replay = await this.replayedAssessment(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const siblings = await this.findHarmonizedSiblingItems(input.tenantId, input.assessmentId, input.itemId);
    for (const item of siblings) {
      const updated = reopenItem(item, { reviewerId: input.actorId, reason: input.reason });
      await this.repository.updateItem({
        tenantId: input.tenantId,
        assessmentId: input.assessmentId,
        item: updated,
        actorId: input.actorId
      });
    }
    const assessment = await this.repository.updateAssessmentStatus({
      tenantId: input.tenantId,
      assessmentId: input.assessmentId,
      status: "needs_changes",
      actorId: input.actorId
    });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "assessment.item_reopened",
      assessmentId: input.assessmentId,
      itemId: input.itemId,
      body: { assessmentId: input.assessmentId, itemId: input.itemId }
    });
    return assessment;
  }

  private async findHarmonizedSiblingItems(
    tenantId: string,
    assessmentId: string,
    targetItemId: string
  ): Promise<AssessmentItem[]> {
    const assessment = await this.repository.findAssessment(tenantId, assessmentId);
    if (!assessment) return [];
    const targetItem = assessment.items.find((item) => item.id === targetItemId);
    if (!targetItem) return [];

    return assessment.items.filter(
      (candidate) =>
        candidate.id === targetItemId ||
        (targetItem.controlRef.harmonizedControlId &&
          candidate.controlRef.harmonizedControlId === targetItem.controlRef.harmonizedControlId) ||
        (targetItem.controlRef.questionVersionId &&
          candidate.controlRef.questionVersionId === targetItem.controlRef.questionVersionId)
    );
  }

  async close(input: {
    tenantId: string;
    actorId: string;
    assessmentId: string;
    idempotencyKey: string;
  }): Promise<AssessmentRecord> {
    const replay = await this.replayedAssessment(input.tenantId, input.idempotencyKey);
    if (replay) {
      return replay;
    }
    const assessment = await this.get(input.tenantId, input.assessmentId);
    closeAssessment(assessment, input.actorId);
    const closed = await this.repository.updateAssessmentStatus({
      tenantId: input.tenantId,
      assessmentId: input.assessmentId,
      status: "closed",
      actorId: input.actorId
    });

    // G-01 completion (0017): a real, persisted final sign-off record, replacing
    // the previous behavior of "closed" being representable only by
    // assessments.status — closeAssessment() above already enforces every item
    // is approved before this point, so the decision is always 'approved'.
    const signoff = createAssessmentSignoff({
      assessmentId: input.assessmentId,
      scopeType: "final",
      scopeId: input.assessmentId,
      signerId: input.actorId,
      approved: true
    });
    await this.repository.recordAssessmentSignoff({ tenantId: input.tenantId, signoff });

    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "assessment.closed",
      assessmentId: input.assessmentId,
      body: { assessmentId: input.assessmentId }
    });

    // Audit Reports feature: capture an immutable closure snapshot for the
    // AI Audit Report pipeline (src/modules/closure-snapshot). Deliberately
    // the last statement in close(), awaited but failure-isolated — every
    // existing validation, state transition, signoff, outbox event, audit
    // event, and the return value above are already complete and correct by
    // this point. A snapshot-capture failure here must never turn an
    // otherwise-successful close() into a failed request: closed assessments
    // without a native snapshot remain fully supported via the on-demand
    // legacy-reconstruction path in ClosureSnapshotService, which is exactly
    // the mechanism that makes this safe to isolate rather than propagate.
    try {
      await this.closureSnapshot.captureClosureSnapshot({
        tenantId: input.tenantId,
        actorId: input.actorId,
        assessment: closed
      });
    } catch (error) {
      await this.auditLog.append({
        tenantId: input.tenantId,
        eventType: "assessment.closure_snapshot_failed",
        actorId: input.actorId,
        targetType: "assessment",
        targetId: input.assessmentId,
        traceId: input.idempotencyKey,
        classification: "confidential",
        body: { assessmentId: input.assessmentId, error: error instanceof Error ? error.message : String(error) }
      });
    }

    return closed;
  }

  // G-01 Final Completion Pass: read-only history endpoints — the append-only tables already
  // held this data (dual-written since G-01 Phase 1/completion), but nothing surfaced the full
  // history to a caller before now, only the single "current" value on the item itself.
  async getAnswerHistory(tenantId: string, assessmentId: string, itemId: string): Promise<AnswerRevision[]> {
    await this.requireItem(tenantId, assessmentId, itemId);
    return this.repository.listAnswerRevisions(tenantId, itemId);
  }

  async getApplicabilityHistory(tenantId: string, assessmentId: string, itemId: string): Promise<ApplicabilityDecision[]> {
    await this.requireItem(tenantId, assessmentId, itemId);
    const controlInstance = await this.repository.findControlInstanceByItem(tenantId, itemId);
    if (!controlInstance) {
      return [];
    }
    return this.repository.listApplicabilityDecisions(tenantId, controlInstance.id);
  }

  async getReviewHistory(tenantId: string, assessmentId: string, itemId: string): Promise<ReviewDecision[]> {
    await this.requireItem(tenantId, assessmentId, itemId);
    return this.repository.listReviewDecisions(tenantId, itemId);
  }

  async getSignoffs(tenantId: string, assessmentId: string): Promise<AssessmentSignoff[]> {
    await this.get(tenantId, assessmentId);
    return this.repository.findAssessmentSignoffs(tenantId, assessmentId);
  }

  // G-01 Final Completion Pass: test_procedures/control_test_results were never wired past the
  // migration that created them — this exposes the ability to define a manual test procedure for
  // a control and record a result against a specific assessment item's control instance.
  async createTestProcedure(input: {
    tenantId: string;
    actorId: string;
    assessmentId: string;
    itemId: string;
    procedureKey: string;
    method: string;
    expectedResult: string;
    idempotencyKey: string;
  }): Promise<TestProcedure> {
    const item = await this.requireItem(input.tenantId, input.assessmentId, input.itemId);
    const procedure = createTestProcedure({
      tenantId: input.tenantId,
      controlId: item.controlRef.harmonizedControlId,
      procedureKey: input.procedureKey,
      method: input.method,
      expectedResult: input.expectedResult
    });
    const created = await this.repository.createTestProcedure({
      tenantId: input.tenantId,
      actorId: input.actorId,
      procedure
    });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "assessment.test_procedure_created",
      assessmentId: input.assessmentId,
      itemId: input.itemId,
      body: { assessmentId: input.assessmentId, itemId: input.itemId, procedureId: created.id }
    });
    return created;
  }

  async listTestProcedures(tenantId: string, assessmentId: string, itemId: string): Promise<TestProcedure[]> {
    const item = await this.requireItem(tenantId, assessmentId, itemId);
    return this.repository.listTestProcedures(tenantId, item.controlRef.harmonizedControlId);
  }

  async recordControlTestResult(input: {
    tenantId: string;
    actorId: string;
    assessmentId: string;
    itemId: string;
    testProcedureId: string;
    result: "pass" | "fail" | "not_tested";
    population?: string;
    sampleJson?: Record<string, unknown>;
    idempotencyKey: string;
  }): Promise<ControlTestResult> {
    await this.requireItem(input.tenantId, input.assessmentId, input.itemId);
    const controlInstance = await this.repository.findControlInstanceByItem(input.tenantId, input.itemId);
    if (!controlInstance) {
      throw new BadRequestException(
        "This assessment item has no linked control instance yet; test results require one."
      );
    }
    const testResult = createControlTestResult({
      tenantId: input.tenantId,
      controlInstanceId: controlInstance.id,
      testProcedureId: input.testProcedureId,
      population: input.population,
      sampleJson: input.sampleJson,
      result: input.result,
      testedBy: input.actorId
    });
    const recorded = await this.repository.recordControlTestResult({ tenantId: input.tenantId, result: testResult });
    await this.publishMutation({
      tenantId: input.tenantId,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      eventType: "assessment.control_test_result_recorded",
      assessmentId: input.assessmentId,
      itemId: input.itemId,
      body: { assessmentId: input.assessmentId, itemId: input.itemId, resultId: recorded.id, result: input.result }
    });
    return recorded;
  }

  async listControlTestResults(tenantId: string, assessmentId: string, itemId: string): Promise<ControlTestResult[]> {
    await this.requireItem(tenantId, assessmentId, itemId);
    const controlInstance = await this.repository.findControlInstanceByItem(tenantId, itemId);
    if (!controlInstance) {
      return [];
    }
    return this.repository.listControlTestResults(tenantId, controlInstance.id);
  }

  private async requireItem(tenantId: string, assessmentId: string, itemId: string): Promise<AssessmentItem> {
    const item = await this.repository.findItem(tenantId, assessmentId, itemId);
    if (!item) {
      throw new NotFoundException("Assessment item not found.");
    }
    return item;
  }

  private async updateStatusFromItems(
    tenantId: string,
    assessmentId: string,
    actorId: string
  ): Promise<AssessmentRecord> {
    const assessment = await this.get(tenantId, assessmentId);
    return this.repository.updateAssessmentStatus({
      tenantId,
      assessmentId,
      actorId,
      status: statusFromItems(assessment.items)
    });
  }

  private async replayedAssessment(tenantId: string, idempotencyKey: string): Promise<AssessmentRecord | null> {
    const existing = await this.outbox.findByIdempotencyKey(tenantId, idempotencyKey);
    if (!existing) {
      return null;
    }
    const payload = existing.payload as Partial<OperationPayload>;
    if (!payload.assessmentId) {
      throw new BadRequestException("Idempotency key is already used by another operation.");
    }
    return this.get(tenantId, payload.assessmentId);
  }

  private async publishMutation(input: {
    tenantId: string;
    actorId: string;
    idempotencyKey: string;
    eventType: string;
    assessmentId: string;
    itemId?: string;
    body: Record<string, unknown>;
  }): Promise<void> {
    const now = new Date();
    const payload: OperationPayload = { assessmentId: input.assessmentId, itemId: input.itemId };
    const outboxEvent = await this.outbox.publish({
      tenantId: input.tenantId,
      eventType: input.eventType,
      aggregateType: "assessment",
      aggregateId: input.assessmentId,
      payload,
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
      targetType: input.itemId ? "assessment_item" : "assessment",
      targetId: input.itemId ?? input.assessmentId,
      traceId: input.idempotencyKey,
      classification: "confidential",
      body: input.body
    });
  }
}

function statusFromItems(items: AssessmentItem[]): AssessmentStatus {
  if (items.some((item) => item.status === "needs_changes")) {
    return "needs_changes";
  }
  if (items.every((item) => item.status === "approved")) {
    return "approved";
  }
  if (items.every((item) => item.status === "submitted" || item.status === "approved")) {
    return "submitted";
  }
  if (items.some((item) => item.status !== "not_started")) {
    return "in_progress";
  }
  return "not_started";
}
