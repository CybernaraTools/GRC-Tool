import { Inject, Injectable } from "@nestjs/common";
import type { AssessmentRecord } from "../../assessment/public.js";
import { buildClosureSnapshotPayload } from "../domain/closure-snapshot.js";
import type { ClosureSnapshotRecord } from "../domain/closure-snapshot.js";
import { PostgresClosureSnapshotRepository } from "../infrastructure/postgres-closure-snapshot.repository.js";

/**
 * Called from two, and only two, places:
 *  1. AssessmentService.close() — an awaited, failure-isolated call (the
 *     caller wraps this in try/catch; a throw here must never be allowed to
 *     fail an otherwise-successful close()). Captures the *native* closure
 *     snapshot at the moment of closure.
 *  2. The audit-reports report-generation flow — reads back the native
 *     snapshot, or, for assessments closed before this feature existed
 *     (no native snapshot present), explicitly reconstructs one on demand
 *     from current retained records, tagged as such and never silently
 *     conflated with a native capture.
 */
@Injectable()
export class ClosureSnapshotService {
  constructor(@Inject(PostgresClosureSnapshotRepository) private readonly repository: PostgresClosureSnapshotRepository) {}

  async captureClosureSnapshot(input: {
    tenantId: string;
    actorId: string;
    assessment: AssessmentRecord;
  }): Promise<ClosureSnapshotRecord> {
    const existing = await this.repository.findLatestByType(input.tenantId, input.actorId, input.assessment.id, "closure");
    if (existing) {
      // Exactly one canonical closure snapshot per assessment closure state
      // (spec requirement) — a replayed/duplicate close() attempt (e.g. an
      // outbox retry racing this awaited call) must not mint a second one.
      return existing;
    }
    const payload = await this.assemblePayload(input.tenantId, input.actorId, input.assessment, { reconstructed: false });
    return this.repository.insertSnapshot({
      tenantId: input.tenantId,
      actorId: input.actorId,
      assessmentId: input.assessment.id,
      snapshotType: "closure",
      payload,
      createdBy: input.actorId
    });
  }

  async findClosureSnapshot(tenantId: string, actorId: string, assessmentId: string): Promise<ClosureSnapshotRecord | null> {
    return this.repository.findLatestByType(tenantId, actorId, assessmentId, "closure");
  }

  async findLegacyReconstruction(tenantId: string, actorId: string, assessmentId: string): Promise<ClosureSnapshotRecord | null> {
    return this.repository.findLatestByType(tenantId, actorId, assessmentId, "legacy_closure_reconstruction");
  }

  /**
   * Reconstructs a closure snapshot for a legacy closed assessment that
   * predates this feature and therefore has no native 'closure' snapshot.
   * Reconstruction reads *current* retained records (there is no historical
   * state to recover for these — they closed before capture existed), and
   * the result is tagged reconstructed:true / historicalAssuranceLevel:
   * 'legacy_reconstructed' so a report built from it discloses the weaker
   * provenance rather than presenting it as an equivalent native capture.
   * Idempotent: a second call reuses the first reconstruction rather than
   * minting a new one (spec: "exactly one canonical closure snapshot").
   */
  async reconstructLegacyClosureSnapshot(input: {
    tenantId: string;
    actorId: string;
    assessment: AssessmentRecord;
  }): Promise<ClosureSnapshotRecord> {
    const existing = await this.repository.findLatestByType(
      input.tenantId,
      input.actorId,
      input.assessment.id,
      "legacy_closure_reconstruction"
    );
    if (existing) {
      return existing;
    }
    const payload = await this.assemblePayload(input.tenantId, input.actorId, input.assessment, {
      reconstructed: true,
      reconstructionNote:
        "This assessment closed before AI Audit Report snapshot capture existed. This snapshot was reconstructed from currently retained records rather than captured at the moment of closure; findings/risk/remediation state reflects retained records as of reconstruction time, not necessarily the exact state at closure."
    });
    return this.repository.insertSnapshot({
      tenantId: input.tenantId,
      actorId: input.actorId,
      assessmentId: input.assessment.id,
      snapshotType: "legacy_closure_reconstruction",
      payload,
      createdBy: input.actorId
    });
  }

  private async assemblePayload(
    tenantId: string,
    actorId: string,
    assessment: AssessmentRecord,
    reconstruction: { reconstructed: boolean; reconstructionNote?: string }
  ) {
    const itemIds = assessment.items.map((item) => item.id);
    const findings = await this.repository.gatherFindingsForItems(tenantId, actorId, itemIds);
    const findingIds = findings.map((finding) => finding.id);
    const [remediationTasks, riskContext, evidence, signoffs] = await Promise.all([
      this.repository.gatherRemediationForFindings(tenantId, actorId, findingIds),
      this.repository.gatherRisksAndAcceptancesForFindings(tenantId, actorId, findingIds, new Date()),
      this.repository.gatherEvidenceForItems(tenantId, actorId, itemIds),
      this.repository.gatherSignoffs(tenantId, actorId, assessment.id)
    ]);

    return buildClosureSnapshotPayload({
      assessment: {
        id: assessment.id,
        scopeName: assessment.scopeName,
        status: assessment.status,
        controlSnapshotVersion: assessment.controlSnapshotVersion,
        periodStart: assessment.periodStart,
        periodEnd: assessment.periodEnd,
        createdBy: assessment.createdBy,
        createdAt: assessment.createdAt
      },
      items: assessment.items,
      findings,
      remediationTasks,
      risks: riskContext.risks,
      riskAcceptances: riskContext.riskAcceptances,
      evidence,
      signoffs,
      reconstructed: reconstruction.reconstructed,
      reconstructionNote: reconstruction.reconstructionNote
    });
  }
}
