import { Inject, Injectable } from "@nestjs/common";
import { TenantScopedDb } from "../../../platform/database/tenant-scoped-db.js";
import type {
  ClosureSnapshotEvidenceRefPayload,
  ClosureSnapshotFindingPayload,
  ClosureSnapshotPayload,
  ClosureSnapshotRecord,
  ClosureSnapshotRemediationTaskPayload,
  ClosureSnapshotRiskAcceptancePayload,
  ClosureSnapshotRiskPayload,
  ClosureSnapshotSignoffPayload,
  ClosureSnapshotType
} from "../domain/closure-snapshot.js";
import { createClosureSnapshot } from "../domain/closure-snapshot.js";

/**
 * Reads/writes ONLY:
 *  - assessment_snapshots (new snapshot_type values 'closure' /
 *    'legacy_closure_reconstruction' on the existing, unmodified,
 *    @append_only table — see 0013_g01_assessment_execution_normalization.sql)
 *  - findings / remediation_tasks / remediation_task_reviews / risks /
 *    risk_acceptances (metadata only, batched by assessment_item_id / id, for
 *    freezing close-time state into the snapshot payload)
 *  - evidence_objects / evidence_versions / evidence_links (reference/hash
 *    metadata only — NOT content_bytes; actual governed content retrieval for
 *    AI context happens later, in the audit-reports report-generation flow,
 *    via the existing EvidenceAssuranceService)
 *
 * Deliberately independent of PostgresAssessmentRepository,
 * PostgresRiskWorkflowRepository, and PostgresEvidenceAssuranceRepository —
 * none of those files are imported or modified. This keeps
 * ClosureSnapshotModule free of any NestJS module dependency on
 * AssessmentModule/RiskWorkflowModule/EvidenceAssuranceModule, so
 * AssessmentModule can depend on ClosureSnapshotModule without a cycle.
 */
@Injectable()
export class PostgresClosureSnapshotRepository {
  constructor(@Inject(TenantScopedDb) private readonly db: TenantScopedDb) {}

  async gatherFindingsForItems(tenantId: string, actorId: string, itemIds: string[]): Promise<ClosureSnapshotFindingPayload[]> {
    if (itemIds.length === 0) {
      return [];
    }
    return this.db.withTenant(tenantId, actorId, async (client) => {
      const result = await client.query<{
        id: string;
        assessment_item_id: string | null;
        test_result_id: string | null;
        severity: string;
        impact: string | null;
        likelihood: string | null;
        owner_id: string | null;
        due_at: Date | null;
        description: string;
        created_at: Date;
      }>(
        `select id, assessment_item_id, test_result_id, severity, impact, likelihood, owner_id, due_at, description, created_at
         from findings
         where tenant_id = $1 and assessment_item_id = any($2::uuid[])
         order by created_at asc`,
        [tenantId, itemIds]
      );
      return result.rows.map((row) => ({
        id: row.id,
        assessmentItemId: row.assessment_item_id,
        testResultId: row.test_result_id,
        severity: row.severity,
        impact: row.impact,
        likelihood: row.likelihood,
        ownerId: row.owner_id,
        dueAt: row.due_at ? row.due_at.toISOString() : null,
        description: row.description,
        createdAt: row.created_at.toISOString()
      }));
    });
  }

  async gatherRemediationForFindings(
    tenantId: string,
    actorId: string,
    findingIds: string[]
  ): Promise<ClosureSnapshotRemediationTaskPayload[]> {
    if (findingIds.length === 0) {
      return [];
    }
    return this.db.withTenant(tenantId, actorId, async (client) => {
      const tasks = await client.query<{
        id: string;
        finding_id: string;
        owner_id: string;
        due_at: Date;
        status: string;
      }>(
        `select id, finding_id, owner_id, due_at, status
         from remediation_tasks
         where tenant_id = $1 and finding_id = any($2::uuid[])
         order by due_at asc`,
        [tenantId, findingIds]
      );
      if (tasks.rows.length === 0) {
        return [];
      }
      const taskIds = tasks.rows.map((row) => row.id);
      const reviews = await client.query<{
        id: string;
        remediation_task_id: string;
        reviewer_id: string;
        decision: string;
        rationale: string;
        evidence_version_ids: string[] | null;
        reviewed_at: Date;
      }>(
        `select id, remediation_task_id, reviewer_id, decision, rationale, evidence_version_ids, reviewed_at
         from remediation_task_reviews
         where tenant_id = $1 and remediation_task_id = any($2::uuid[])
         order by reviewed_at asc`,
        [tenantId, taskIds]
      );
      const reviewsByTask = new Map<string, ClosureSnapshotRemediationTaskPayload["reviews"]>();
      for (const review of reviews.rows) {
        const list = reviewsByTask.get(review.remediation_task_id) ?? [];
        list.push({
          id: review.id,
          reviewerId: review.reviewer_id,
          decision: review.decision,
          rationale: review.rationale,
          evidenceVersionIds: review.evidence_version_ids ?? [],
          reviewedAt: review.reviewed_at.toISOString()
        });
        reviewsByTask.set(review.remediation_task_id, list);
      }
      return tasks.rows.map((row) => ({
        id: row.id,
        findingId: row.finding_id,
        ownerId: row.owner_id,
        dueAt: row.due_at.toISOString(),
        status: row.status,
        reviews: reviewsByTask.get(row.id) ?? []
      }));
    });
  }

  async gatherRisksAndAcceptancesForFindings(
    tenantId: string,
    actorId: string,
    findingIds: string[],
    now: Date
  ): Promise<{ risks: ClosureSnapshotRiskPayload[]; riskAcceptances: ClosureSnapshotRiskAcceptancePayload[] }> {
    if (findingIds.length === 0) {
      return { risks: [], riskAcceptances: [] };
    }
    return this.db.withTenant(tenantId, actorId, async (client) => {
      const acceptanceRows = await client.query<{
        id: string;
        remediation_task_id: string;
        finding_id: string;
        risk_id: string | null;
        rationale: string;
        approver_id: string;
        approved_at: Date;
        expires_at: Date;
        next_review_due_at: Date;
        compensating_controls: string | null;
        superseded_at: Date | null;
        superseded_by_id: string | null;
      }>(
        `select id, remediation_task_id, finding_id, risk_id, rationale, approver_id, approved_at, expires_at,
                next_review_due_at, compensating_controls, superseded_at, superseded_by_id
         from risk_acceptances
         where tenant_id = $1 and finding_id = any($2::uuid[])
         order by approved_at asc`,
        [tenantId, findingIds]
      );
      const riskAcceptances: ClosureSnapshotRiskAcceptancePayload[] = acceptanceRows.rows.map((row) => ({
        id: row.id,
        remediationTaskId: row.remediation_task_id,
        findingId: row.finding_id,
        riskId: row.risk_id,
        rationale: row.rationale,
        approverId: row.approver_id,
        approvedAt: row.approved_at.toISOString(),
        expiresAt: row.expires_at.toISOString(),
        nextReviewDueAt: row.next_review_due_at.toISOString(),
        compensatingControls: row.compensating_controls,
        supersededAt: row.superseded_at ? row.superseded_at.toISOString() : null,
        supersededById: row.superseded_by_id,
        isActiveAtCapture:
          !row.superseded_at && row.expires_at > now && row.next_review_due_at > now
      }));

      const riskIds = [...new Set(riskAcceptances.map((row) => row.riskId).filter((id): id is string => Boolean(id)))];
      if (riskIds.length === 0) {
        return { risks: [], riskAcceptances };
      }
      const riskRows = await client.query<{
        id: string;
        risk_key: string;
        title: string;
        category: string;
        inherent_score: number;
        residual_score: number;
        owner_id: string;
        status: string;
      }>(
        `select id, risk_key, title, category, inherent_score, residual_score, owner_id, status
         from risks
         where tenant_id = $1 and id = any($2::uuid[])`,
        [tenantId, riskIds]
      );
      const risks: ClosureSnapshotRiskPayload[] = riskRows.rows.map((row) => ({
        id: row.id,
        riskKey: row.risk_key,
        title: row.title,
        category: row.category,
        inherentScore: Number(row.inherent_score),
        residualScore: Number(row.residual_score),
        ownerId: row.owner_id,
        status: row.status
      }));
      return { risks, riskAcceptances };
    });
  }

  async gatherEvidenceForItems(
    tenantId: string,
    actorId: string,
    itemIds: string[]
  ): Promise<ClosureSnapshotEvidenceRefPayload[]> {
    if (itemIds.length === 0) {
      return [];
    }
    return this.db.withTenant(tenantId, actorId, async (client) => {
      const links = await client.query<{
        evidence_version_id: string;
        target_type: string;
        target_id: string;
      }>(
        `select evidence_version_id, target_type, target_id
         from evidence_links
         where tenant_id = $1 and target_type = 'assessment_item' and target_id = any($2::uuid[])`,
        [tenantId, itemIds]
      );
      if (links.rows.length === 0) {
        return [];
      }
      const versionIds = [...new Set(links.rows.map((row) => row.evidence_version_id))];
      const versions = await client.query<{
        id: string;
        evidence_id: string;
        sha256: string;
        mime_type: string;
        created_by: string;
        created_at: Date;
      }>(
        `select id, evidence_id, sha256, mime_type, created_by, created_at
         from evidence_versions
         where tenant_id = $1 and id = any($2::uuid[])`,
        [tenantId, versionIds]
      );
      const evidenceIds = [...new Set(versions.rows.map((row) => row.evidence_id))];
      const objects =
        evidenceIds.length > 0
          ? await client.query<{ id: string; file_name: string; state: string }>(
              `select id, file_name, state from evidence_objects where tenant_id = $1 and id = any($2::uuid[])`,
              [tenantId, evidenceIds]
            )
          : { rows: [] as Array<{ id: string; file_name: string; state: string }> };
      const objectById = new Map(objects.rows.map((row) => [row.id, row]));
      const versionById = new Map(versions.rows.map((row) => [row.id, row]));

      return links.rows.map((link) => {
        const version = versionById.get(link.evidence_version_id);
        const object = version ? objectById.get(version.evidence_id) : undefined;
        return {
          evidenceId: version?.evidence_id ?? "unknown",
          evidenceVersionId: link.evidence_version_id,
          fileName: object?.file_name ?? "Not available",
          mimeType: version?.mime_type ?? null,
          sha256: version?.sha256 ?? null,
          state: object?.state ?? "Not available",
          uploadedBy: version?.created_by ?? null,
          uploadedAt: version?.created_at ? version.created_at.toISOString() : null,
          linkedTargetType: link.target_type,
          linkedTargetId: link.target_id
        };
      });
    });
  }

  async gatherSignoffs(tenantId: string, actorId: string, assessmentId: string): Promise<ClosureSnapshotSignoffPayload[]> {
    return this.db.withTenant(tenantId, actorId, async (client) => {
      const result = await client.query<{
        id: string;
        scope_type: string;
        scope_id: string;
        signer_id: string;
        decision: string;
        signed_at: Date;
      }>(
        `select id, scope_type, scope_id, signer_id, decision, signed_at
         from assessment_signoffs
         where tenant_id = $1 and assessment_id = $2
         order by signed_at asc`,
        [tenantId, assessmentId]
      );
      return result.rows.map((row) => ({
        id: row.id,
        scopeType: row.scope_type,
        scopeId: row.scope_id,
        signerId: row.signer_id,
        decision: row.decision,
        signedAt: row.signed_at.toISOString()
      }));
    });
  }

  async insertSnapshot(input: {
    tenantId: string;
    actorId: string;
    assessmentId: string;
    snapshotType: ClosureSnapshotType;
    payload: ClosureSnapshotPayload;
    createdBy: string;
  }): Promise<ClosureSnapshotRecord> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const nextSequence = await client.query<{ sequence: number }>(
        `select coalesce(max(sequence), 0) + 1 as sequence from assessment_snapshots where tenant_id = $1 and assessment_id = $2`,
        [input.tenantId, input.assessmentId]
      );
      const snapshot = createClosureSnapshot({
        assessmentId: input.assessmentId,
        snapshotType: input.snapshotType,
        sequence: Number(nextSequence.rows[0]?.sequence ?? 1),
        payload: input.payload,
        createdBy: input.createdBy
      });
      await client.query(
        `insert into assessment_snapshots (id, tenant_id, assessment_id, snapshot_type, sequence, content_hash, snapshot_payload, created_by, created_at)
         values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)`,
        [
          snapshot.id,
          input.tenantId,
          snapshot.assessmentId,
          snapshot.snapshotType,
          snapshot.sequence,
          snapshot.contentHash,
          JSON.stringify(snapshot.payload),
          snapshot.createdBy,
          snapshot.createdAt
        ]
      );
      return { ...snapshot, tenantId: input.tenantId };
    });
  }

  async findLatestByType(
    tenantId: string,
    actorId: string,
    assessmentId: string,
    snapshotType: ClosureSnapshotType
  ): Promise<ClosureSnapshotRecord | null> {
    return this.db.withTenant(tenantId, actorId, async (client) => {
      const result = await client.query<{
        id: string;
        assessment_id: string;
        snapshot_type: ClosureSnapshotType;
        sequence: number;
        content_hash: string;
        snapshot_payload: ClosureSnapshotPayload;
        created_by: string;
        created_at: Date;
      }>(
        `select id, assessment_id, snapshot_type, sequence, content_hash, snapshot_payload, created_by, created_at
         from assessment_snapshots
         where tenant_id = $1 and assessment_id = $2 and snapshot_type = $3
         order by sequence desc
         limit 1`,
        [tenantId, assessmentId, snapshotType]
      );
      const row = result.rows[0];
      if (!row) {
        return null;
      }
      return {
        id: row.id,
        tenantId,
        assessmentId: row.assessment_id,
        snapshotType: row.snapshot_type,
        sequence: row.sequence,
        contentHash: row.content_hash,
        payload: row.snapshot_payload,
        createdBy: row.created_by,
        createdAt: row.created_at
      };
    });
  }

  async findById(tenantId: string, actorId: string, snapshotId: string): Promise<ClosureSnapshotRecord | null> {
    return this.db.withTenant(tenantId, actorId, async (client) => {
      const result = await client.query<{
        id: string;
        assessment_id: string;
        snapshot_type: ClosureSnapshotType;
        sequence: number;
        content_hash: string;
        snapshot_payload: ClosureSnapshotPayload;
        created_by: string;
        created_at: Date;
      }>(
        `select id, assessment_id, snapshot_type, sequence, content_hash, snapshot_payload, created_by, created_at
         from assessment_snapshots
         where tenant_id = $1 and id = $2`,
        [tenantId, snapshotId]
      );
      const row = result.rows[0];
      if (!row) {
        return null;
      }
      return {
        id: row.id,
        tenantId,
        assessmentId: row.assessment_id,
        snapshotType: row.snapshot_type,
        sequence: row.sequence,
        contentHash: row.content_hash,
        payload: row.snapshot_payload,
        createdBy: row.created_by,
        createdAt: row.created_at
      };
    });
  }
}
