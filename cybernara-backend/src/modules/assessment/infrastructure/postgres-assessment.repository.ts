import { createHash, randomUUID } from "node:crypto";
import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { CANONICAL_CONTENT_ACTOR_ID, CANONICAL_CONTENT_TENANT_ID } from "../../framework-content/public.js";
import { TenantScopedDb, type TenantScopedClient } from "../../../platform/database/tenant-scoped-db.js";
import type {
  AssessmentRecord,
  AssessmentRepository
} from "../application/assessment.types.js";
import type { Assessment, AssessmentItem, PinnedControlRef } from "../domain/assessment.js";
import {
  createAssessmentScope,
  createAssessmentSnapshot,
  createControlInstance,
  type AnswerRevision,
  type ApplicabilityDecision,
  type AssessmentSignoff,
  type ControlInstance,
  type ControlTestResult,
  type ReviewDecision,
  type TestProcedure
} from "../domain/execution-graph.js";

@Injectable()
export class PostgresAssessmentRepository implements AssessmentRepository {
  constructor(@Inject(TenantScopedDb) private readonly db: TenantScopedDb) {}

  async createAssessment(input: {
    assessment: Assessment;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<AssessmentRecord> {
    // G-01 completion (0017): framework_requirements lives under the canonical shared-catalog
    // tenant (G-05's CANONICAL_CONTENT_TENANT_ID), not the assessment's own tenant — resolving
    // matches requires its own tenant-scoped read, separate from the main transaction below
    // (TenantScopedDb.withTenant sets one app.tenant_id GUC per call; RLS would reject a lookup
    // against a different tenant's rows inside the assessment-tenant-scoped transaction). The
    // resolved IDs are plain foreign-key values by the time they're written into
    // requirement_instances (an assessment-tenant-owned row) — storing a value that references
    // another tenant's row is not an RLS violation; only reading/writing that other tenant's own
    // rows would be.
    const requirementIdsByControl = await this.resolveRequirementIds(input.assessment.items);

    return this.db.withTenant(input.assessment.tenantId, input.assessment.createdBy, async (client) => {
      await client.query(
        `
          insert into assessments (
            id, tenant_id, scope_name, status, control_snapshot_version,
            period_start, period_end, classification, created_by, created_at, updated_by, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, 'confidential', $8, $9, $8, $9)
        `,
        [
          input.assessment.id,
          input.assessment.tenantId,
          input.assessment.scopeName,
          input.assessment.status,
          input.assessment.controlSnapshotVersion,
          input.periodStart,
          input.periodEnd,
          input.assessment.createdBy,
          input.assessment.createdAt
        ]
      );

      // G-01 Phase 1: dual-write the normalized execution graph alongside
      // the legacy flat tables. See 0013_g01_assessment_execution_normalization.sql.
      const scope = createAssessmentScope({
        tenantId: input.assessment.tenantId,
        name: input.assessment.scopeName,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        approvedBy: input.assessment.createdBy,
        now: input.assessment.createdAt
      });
      await client.query(
        `
          insert into assessment_scopes (
            id, tenant_id, name, period_start, period_end, approved_by, approved_at,
            created_by, created_at, updated_by, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $7, $8, $7)
        `,
        [
          scope.id,
          scope.tenantId,
          scope.name,
          scope.periodStart,
          scope.periodEnd,
          scope.approvedBy,
          scope.approvedAt,
          input.assessment.createdBy
        ]
      );
      await client.query(`update assessments set scope_id = $1 where tenant_id = $2 and id = $3`, [
        scope.id,
        input.assessment.tenantId,
        input.assessment.id
      ]);

      const seenFrameworks = new Set<string>();
      for (const item of input.assessment.items) {
        if (!seenFrameworks.has(item.controlRef.frameworkKey)) {
          seenFrameworks.add(item.controlRef.frameworkKey);
          await client.query(
            `
              insert into assessment_frameworks (
                id, tenant_id, assessment_id, framework_key, framework_version, mapping_version,
                created_by, created_at, updated_by, updated_at
              )
              values ($1, $2, $3, $4, $5, $6, $7, $8, $7, $8)
              on conflict (tenant_id, assessment_id, framework_key) do nothing
            `,
            [
              randomUUID(),
              input.assessment.tenantId,
              input.assessment.id,
              item.controlRef.frameworkKey,
              item.controlRef.frameworkVersion,
              item.controlRef.mappingVersion,
              input.assessment.createdBy,
              input.assessment.createdAt
            ]
          );
        }
      }

      const controlInstanceMap = new Map<string, string>();

      for (const [sequence, item] of input.assessment.items.entries()) {
        let controlInstanceId = controlInstanceMap.get(item.controlRef.harmonizedControlId);
        if (!controlInstanceId) {
          const controlInstance = createControlInstance({
            tenantId: input.assessment.tenantId,
            assessmentId: input.assessment.id,
            controlId: item.controlRef.harmonizedControlId,
            frameworkKey: item.controlRef.frameworkKey,
            frameworkVersion: item.controlRef.frameworkVersion,
            mappingVersion: item.controlRef.mappingVersion,
            ownerId: item.ownerId
          });
          await client.query(
            `
              insert into control_instances (
                id, tenant_id, assessment_id, control_id, framework_key, framework_version,
                mapping_version, owner_id, applicability_status, status,
                created_by, created_at, updated_by, updated_at
              )
              values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $11, $12)
              on conflict (tenant_id, assessment_id, control_id) do nothing
            `,
            [
              controlInstance.id,
              controlInstance.tenantId,
              controlInstance.assessmentId,
              controlInstance.controlId,
              controlInstance.frameworkKey,
              controlInstance.frameworkVersion,
              controlInstance.mappingVersion,
              controlInstance.ownerId,
              controlInstance.applicabilityStatus,
              controlInstance.status,
              input.assessment.createdBy,
              input.assessment.createdAt
            ]
          );
          controlInstanceId = controlInstance.id;
          controlInstanceMap.set(item.controlRef.harmonizedControlId, controlInstanceId);
        }
        // Assessment creation consumes the governed question repository only.
        // It must never fabricate question_sets/question_versions on this path.
        if (!item.controlRef.questionVersionId) {
          throw new BadRequestException("Assessment item must reference an approved question version.");
        }

        await insertItem(
          client,
          input.assessment,
          item,
          controlInstanceId,
          item.controlRef.questionVersionId,
          sequence + 1
        );

        // G-01 completion (0017): requirement_instances, one per resolved
        // framework_requirements match for this control (see resolveRequirementIds
        // above) — none if the pinned control's (frameworkKey, controlId) doesn't
        // resolve to a real canonical-catalog requirement (e.g. synthetic test
        // fixtures using framework keys that don't exist in the real corpus).
        const requirementIds = requirementIdsByControl.get(requirementLookupKey(item.controlRef)) ?? [];
        for (const requirementId of requirementIds) {
          await client.query(
            `
              insert into requirement_instances (
                tenant_id, assessment_id, requirement_id, owner_id, created_by, updated_by
              )
              values ($1, $2, $3, $4, $5, $5)
              on conflict (tenant_id, assessment_id, requirement_id) do nothing
            `,
            [input.assessment.tenantId, input.assessment.id, requirementId, item.ownerId, input.assessment.createdBy]
          );
        }
      }

      const snapshot = createAssessmentSnapshot({
        assessmentId: input.assessment.id,
        snapshotType: "created",
        sequence: 1,
        contentHash: createHash("sha256").update(input.assessment.controlSnapshotVersion).digest("hex"),
        snapshotPayload: { controls: input.assessment.items.map((item) => item.controlRef) },
        createdBy: input.assessment.createdBy,
        now: input.assessment.createdAt
      });
      await client.query(
        `
          insert into assessment_snapshots (
            id, tenant_id, assessment_id, snapshot_type, sequence, content_hash, snapshot_payload,
            created_by, created_at
          )
          values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
        `,
        [
          snapshot.id,
          input.assessment.tenantId,
          snapshot.assessmentId,
          snapshot.snapshotType,
          snapshot.sequence,
          snapshot.contentHash,
          JSON.stringify(snapshot.snapshotPayload),
          snapshot.createdBy,
          snapshot.createdAt
        ]
      );

      const persisted = await findAssessmentWithClient(client, input.assessment.tenantId, input.assessment.id);
      if (!persisted) {
        throw new Error("Assessment was not persisted.");
      }
      return persisted;
    });
  }

  async updateDraftAssessment(input: {
    assessment: Assessment;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<AssessmentRecord> {
    const requirementIdsByControl = await this.resolveRequirementIds(input.assessment.items);

    return this.db.withTenant(input.assessment.tenantId, input.assessment.createdBy, async (client) => {
      const current = await client.query<{ status: string; scope_id: string | null }>(
        `
          select status, scope_id
          from assessments
          where tenant_id = $1 and id = $2
          for update
        `,
        [input.assessment.tenantId, input.assessment.id]
      );
      if (!current.rows[0]) {
        throw new Error("Assessment was not found.");
      }
      if (current.rows[0].status !== "not_started") {
        throw new BadRequestException("Only draft assessments that have not started can be edited.");
      }

      const startedItems = await client.query<{ count: string }>(
        `
          select count(*)::text as count
          from assessment_items
          where tenant_id = $1 and assessment_id = $2 and status <> 'not_started'
        `,
        [input.assessment.tenantId, input.assessment.id]
      );
      if (Number(startedItems.rows[0]?.count ?? 0) > 0) {
        throw new BadRequestException("Only draft assessments that have not started can be edited.");
      }

      if (current.rows[0].scope_id) {
        await client.query(
          `
            update assessment_scopes
            set name = $3,
                period_start = $4,
                period_end = $5,
                approved_by = $6,
                approved_at = $7,
                updated_by = $6,
                updated_at = $7,
                version = version + 1
            where tenant_id = $1 and id = $2
          `,
          [
            input.assessment.tenantId,
            current.rows[0].scope_id,
            input.assessment.scopeName,
            input.periodStart,
            input.periodEnd,
            input.assessment.createdBy,
            input.assessment.createdAt
          ]
        );
      } else {
        const scope = createAssessmentScope({
          tenantId: input.assessment.tenantId,
          name: input.assessment.scopeName,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          approvedBy: input.assessment.createdBy,
          now: input.assessment.createdAt
        });
        await client.query(
          `
            insert into assessment_scopes (
              id, tenant_id, name, period_start, period_end, approved_by, approved_at,
              created_by, created_at, updated_by, updated_at
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $7, $8, $7)
          `,
          [
            scope.id,
            scope.tenantId,
            scope.name,
            scope.periodStart,
            scope.periodEnd,
            scope.approvedBy,
            scope.approvedAt,
            input.assessment.createdBy
          ]
        );
        await client.query(`update assessments set scope_id = $1 where tenant_id = $2 and id = $3`, [
          scope.id,
          input.assessment.tenantId,
          input.assessment.id
        ]);
      }

      await client.query(`delete from requirement_instances where tenant_id = $1 and assessment_id = $2`, [
        input.assessment.tenantId,
        input.assessment.id
      ]);
      await client.query(`delete from assessment_items where tenant_id = $1 and assessment_id = $2`, [
        input.assessment.tenantId,
        input.assessment.id
      ]);
      await client.query(`delete from control_instances where tenant_id = $1 and assessment_id = $2`, [
        input.assessment.tenantId,
        input.assessment.id
      ]);
      await client.query(`delete from assessment_frameworks where tenant_id = $1 and assessment_id = $2`, [
        input.assessment.tenantId,
        input.assessment.id
      ]);

      await client.query(
        `
          update assessments
          set scope_name = $3,
              control_snapshot_version = $4,
              period_start = $5,
              period_end = $6,
              updated_by = $7,
              updated_at = $8,
              version = version + 1
          where tenant_id = $1 and id = $2
        `,
        [
          input.assessment.tenantId,
          input.assessment.id,
          input.assessment.scopeName,
          input.assessment.controlSnapshotVersion,
          input.periodStart,
          input.periodEnd,
          input.assessment.createdBy,
          input.assessment.createdAt
        ]
      );

      const seenFrameworks = new Set<string>();
      for (const item of input.assessment.items) {
        if (!seenFrameworks.has(item.controlRef.frameworkKey)) {
          seenFrameworks.add(item.controlRef.frameworkKey);
          await client.query(
            `
              insert into assessment_frameworks (
                id, tenant_id, assessment_id, framework_key, framework_version, mapping_version,
                created_by, created_at, updated_by, updated_at
              )
              values ($1, $2, $3, $4, $5, $6, $7, $8, $7, $8)
            `,
            [
              randomUUID(),
              input.assessment.tenantId,
              input.assessment.id,
              item.controlRef.frameworkKey,
              item.controlRef.frameworkVersion,
              item.controlRef.mappingVersion,
              input.assessment.createdBy,
              input.assessment.createdAt
            ]
          );
        }
      }

      for (const [sequence, item] of input.assessment.items.entries()) {
        const controlInstance = createControlInstance({
          tenantId: input.assessment.tenantId,
          assessmentId: input.assessment.id,
          controlId: item.controlRef.harmonizedControlId,
          frameworkKey: item.controlRef.frameworkKey,
          frameworkVersion: item.controlRef.frameworkVersion,
          mappingVersion: item.controlRef.mappingVersion,
          ownerId: item.ownerId
        });
        await client.query(
          `
            insert into control_instances (
              id, tenant_id, assessment_id, control_id, framework_key, framework_version,
              mapping_version, owner_id, applicability_status, status,
              created_by, created_at, updated_by, updated_at
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $11, $12)
          `,
          [
            controlInstance.id,
            controlInstance.tenantId,
            controlInstance.assessmentId,
            controlInstance.controlId,
            controlInstance.frameworkKey,
            controlInstance.frameworkVersion,
            controlInstance.mappingVersion,
            controlInstance.ownerId,
            controlInstance.applicabilityStatus,
            controlInstance.status,
            input.assessment.createdBy,
            input.assessment.createdAt
          ]
        );
        if (!item.controlRef.questionVersionId) {
          throw new BadRequestException("Assessment item must reference an approved question version.");
        }
        await insertItem(
          client,
          input.assessment,
          item,
          controlInstance.id,
          item.controlRef.questionVersionId,
          sequence + 1
        );

        const requirementIds = requirementIdsByControl.get(requirementLookupKey(item.controlRef)) ?? [];
        for (const requirementId of requirementIds) {
          await client.query(
            `
              insert into requirement_instances (
                tenant_id, assessment_id, requirement_id, owner_id, created_by, updated_by
              )
              values ($1, $2, $3, $4, $5, $5)
              on conflict (tenant_id, assessment_id, requirement_id) do nothing
            `,
            [input.assessment.tenantId, input.assessment.id, requirementId, item.ownerId, input.assessment.createdBy]
          );
        }
      }

      const nextSequence = await client.query<{ sequence: number }>(
        `
          select coalesce(max(sequence), 0) + 1 as sequence
          from assessment_snapshots
          where tenant_id = $1 and assessment_id = $2
        `,
        [input.assessment.tenantId, input.assessment.id]
      );
      const snapshot = createAssessmentSnapshot({
        assessmentId: input.assessment.id,
        snapshotType: "draft_updated",
        sequence: Number(nextSequence.rows[0]?.sequence ?? 1),
        contentHash: createHash("sha256").update(input.assessment.controlSnapshotVersion).digest("hex"),
        snapshotPayload: { controls: input.assessment.items.map((item) => item.controlRef) },
        createdBy: input.assessment.createdBy,
        now: input.assessment.createdAt
      });
      await client.query(
        `
          insert into assessment_snapshots (
            id, tenant_id, assessment_id, snapshot_type, sequence, content_hash, snapshot_payload,
            created_by, created_at
          )
          values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
        `,
        [
          snapshot.id,
          input.assessment.tenantId,
          snapshot.assessmentId,
          snapshot.snapshotType,
          snapshot.sequence,
          snapshot.contentHash,
          JSON.stringify(snapshot.snapshotPayload),
          snapshot.createdBy,
          snapshot.createdAt
        ]
      );

      const persisted = await findAssessmentWithClient(client, input.assessment.tenantId, input.assessment.id);
      if (!persisted) {
        throw new Error("Assessment was not persisted.");
      }
      return persisted;
    });
  }

  async findControlInstanceByItem(tenantId: string, itemId: string): Promise<ControlInstance | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ci.id, ci.tenant_id, ci.assessment_id, ci.control_id, ci.framework_key,
                 ci.framework_version, ci.mapping_version, ci.owner_id, ci.applicability_status,
                 ci.status, ci.score, ci.maturity
          from control_instances ci
          join assessment_items ai on ai.control_instance_id = ci.id
          where ai.tenant_id = $1 and ai.id = $2
        `,
        [tenantId, itemId]
      );
      return result.rows[0] ? mapControlInstance(result.rows[0]) : null;
    });
  }

  async recordApplicabilityDecision(input: { tenantId: string; decision: ApplicabilityDecision }): Promise<void> {
    await this.db.withTenant(input.tenantId, input.decision.decidedBy, async (client) => {
      await client.query(
        `
          insert into applicability_decisions (
            id, tenant_id, control_instance_id, decision, rationale, decided_by, approved_by, decided_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          input.decision.id,
          input.tenantId,
          input.decision.controlInstanceId,
          input.decision.decision,
          input.decision.rationale,
          input.decision.decidedBy,
          input.decision.approvedBy,
          input.decision.decidedAt
        ]
      );
      await client.query(
        `update control_instances set applicability_status = $3, updated_by = $4, updated_at = now(), version = version + 1
         where tenant_id = $1 and id = $2`,
        [input.tenantId, input.decision.controlInstanceId, input.decision.decision, input.decision.decidedBy]
      );
    });
  }

  async recordAnswerRevision(input: { tenantId: string; revision: AnswerRevision }): Promise<AnswerRevision> {
    return this.db.withTenant(input.tenantId, input.revision.submittedBy, async (client) => {
      await client.query(
        `
          insert into answer_revisions (
            id, tenant_id, assessment_item_id, revision, response_json, submitted_by, submitted_at, supersedes_id
          )
          values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
        `,
        [
          input.revision.id,
          input.tenantId,
          input.revision.assessmentItemId,
          input.revision.revision,
          JSON.stringify(input.revision.responseJson),
          input.revision.submittedBy,
          input.revision.submittedAt,
          input.revision.supersedesId
        ]
      );
      return input.revision;
    });
  }

  async findLatestAnswerRevision(tenantId: string, assessmentItemId: string): Promise<AnswerRevision | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select id, assessment_item_id, revision, response_json, submitted_by, submitted_at, supersedes_id
          from answer_revisions
          where tenant_id = $1 and assessment_item_id = $2
          order by revision desc
          limit 1
        `,
        [tenantId, assessmentItemId]
      );
      return result.rows[0] ? mapAnswerRevision(result.rows[0]) : null;
    });
  }

  async recordReviewDecision(input: { tenantId: string; decision: ReviewDecision }): Promise<void> {
    await this.db.withTenant(input.tenantId, input.decision.reviewerId, async (client) => {
      await client.query(
        `
          insert into review_decisions (
            id, tenant_id, assessment_item_id, answer_revision_id, reviewer_id, decision, rationale, decided_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          input.decision.id,
          input.tenantId,
          input.decision.assessmentItemId,
          input.decision.answerRevisionId,
          input.decision.reviewerId,
          input.decision.decision,
          input.decision.rationale,
          input.decision.decidedAt
        ]
      );
    });
  }

  async recordAssessmentSignoff(input: { tenantId: string; signoff: AssessmentSignoff }): Promise<void> {
    await this.db.withTenant(input.tenantId, input.signoff.signerId, async (client) => {
      await client.query(
        `
          insert into assessment_signoffs (
            id, tenant_id, assessment_id, scope_type, scope_id, signer_id, decision, signed_at,
            created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $6, $6)
          on conflict (tenant_id, assessment_id, scope_type, scope_id) do nothing
        `,
        [
          input.signoff.id,
          input.tenantId,
          input.signoff.assessmentId,
          input.signoff.scopeType,
          input.signoff.scopeId,
          input.signoff.signerId,
          input.signoff.decision,
          input.signoff.signedAt
        ]
      );
    });
  }

  async findAssessmentSignoffs(tenantId: string, assessmentId: string): Promise<AssessmentSignoff[]> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select id, assessment_id, scope_type, scope_id, signer_id, decision, signed_at
          from assessment_signoffs
          where tenant_id = $1 and assessment_id = $2
          order by signed_at
        `,
        [tenantId, assessmentId]
      );
      return result.rows.map(mapAssessmentSignoff);
    });
  }

  // G-01 Final Completion Pass: history reads for the append-only answer_revisions/
  // applicability_decisions/review_decisions tables — until now only "latest" reads existed
  // (needed by the dual-write mutation flows themselves), with no way for a caller to see the
  // full revision/decision history a real reviewer needs.
  async listAnswerRevisions(tenantId: string, assessmentItemId: string): Promise<AnswerRevision[]> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select id, assessment_item_id, revision, response_json, submitted_by, submitted_at, supersedes_id
          from answer_revisions
          where tenant_id = $1 and assessment_item_id = $2
          order by revision desc
        `,
        [tenantId, assessmentItemId]
      );
      return result.rows.map(mapAnswerRevision);
    });
  }

  async listApplicabilityDecisions(tenantId: string, controlInstanceId: string): Promise<ApplicabilityDecision[]> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select id, control_instance_id, decision, rationale, decided_by, approved_by, decided_at
          from applicability_decisions
          where tenant_id = $1 and control_instance_id = $2
          order by decided_at desc
        `,
        [tenantId, controlInstanceId]
      );
      return result.rows.map(mapApplicabilityDecision);
    });
  }

  async listReviewDecisions(tenantId: string, assessmentItemId: string): Promise<ReviewDecision[]> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select id, assessment_item_id, answer_revision_id, reviewer_id, decision, rationale, decided_at
          from review_decisions
          where tenant_id = $1 and assessment_item_id = $2
          order by decided_at desc
        `,
        [tenantId, assessmentItemId]
      );
      return result.rows.map(mapReviewDecision);
    });
  }

  // G-01 Final Completion Pass: test_procedures/control_test_results (spec §10) were added by
  // migration 0013 but never wired into a repository — closes that gap.
  async createTestProcedure(input: { tenantId: string; actorId: string; procedure: TestProcedure }): Promise<TestProcedure> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into test_procedures (
            id, tenant_id, control_id, procedure_key, method, expected_result, status,
            created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $8)
          on conflict (tenant_id, control_id, procedure_key, version) do update
            set updated_at = test_procedures.updated_at
          returning id, tenant_id, control_id, procedure_key, method, expected_result, status
        `,
        [
          input.procedure.id,
          input.tenantId,
          input.procedure.controlId,
          input.procedure.procedureKey,
          input.procedure.method,
          input.procedure.expectedResult,
          input.procedure.status,
          input.actorId
        ]
      );
      return mapTestProcedure(result.rows[0]);
    });
  }

  async listTestProcedures(tenantId: string, controlId: string): Promise<TestProcedure[]> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select id, tenant_id, control_id, procedure_key, method, expected_result, status
          from test_procedures
          where tenant_id = $1 and control_id = $2
          order by created_at desc
        `,
        [tenantId, controlId]
      );
      return result.rows.map(mapTestProcedure);
    });
  }

  async recordControlTestResult(input: { tenantId: string; result: ControlTestResult }): Promise<ControlTestResult> {
    return this.db.withTenant(input.tenantId, input.result.testedBy, async (client) => {
      await client.query(
        `
          insert into control_test_results (
            id, tenant_id, control_instance_id, test_procedure_id, run_id, population,
            sample_json, result, tested_by, tested_at, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $9, $9)
        `,
        [
          input.result.id,
          input.tenantId,
          input.result.controlInstanceId,
          input.result.testProcedureId,
          input.result.runId,
          input.result.population,
          JSON.stringify(input.result.sampleJson),
          input.result.result,
          input.result.testedBy,
          input.result.testedAt
        ]
      );
      return input.result;
    });
  }

  async listControlTestResults(tenantId: string, controlInstanceId: string): Promise<ControlTestResult[]> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select id, tenant_id, control_instance_id, test_procedure_id, run_id, population,
                 sample_json, result, tested_by, tested_at
          from control_test_results
          where tenant_id = $1 and control_instance_id = $2
          order by tested_at desc
        `,
        [tenantId, controlInstanceId]
      );
      return result.rows.map(mapControlTestResult);
    });
  }

  // G-01 completion (0017): resolves each pinned control's real framework_requirements matches
  // under the canonical shared-catalog tenant, via its own tenant-scoped read (see the header
  // comment on createAssessment for why this can't happen inside that method's own transaction).
  private async resolveRequirementIds(items: AssessmentItem[]): Promise<Map<string, string[]>> {
    const uniqueControls = [...new Map(items.map((item) => [requirementLookupKey(item.controlRef), item.controlRef])).values()];
    if (uniqueControls.length === 0) {
      return new Map();
    }
    return this.db.withTenant(CANONICAL_CONTENT_TENANT_ID, CANONICAL_CONTENT_ACTOR_ID, async (client) => {
      const resolved = new Map<string, string[]>();
      for (const controlRef of uniqueControls) {
        const result = await client.query<{ id: string }>(
          `select req.id
           from framework_requirements req
           join controls c on req.control_id_ref = c.id
           join framework_content_packs p on req.framework_pack_id = p.id
           join framework_versions fv on p.framework_version_id = fv.id
           join frameworks f on fv.framework_id = f.id
           where req.tenant_id = $1 and f.framework_key = $2 and c.control_key = $3`,
          [CANONICAL_CONTENT_TENANT_ID, controlRef.frameworkKey, controlRef.controlId]
        );
        resolved.set(
          requirementLookupKey(controlRef),
          result.rows.map((row) => row.id)
        );
      }
      return resolved;
    });
  }

  async listAssessments(tenantId: string, pagination: { limit: number; offset: number }): Promise<AssessmentRecord[]> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${assessmentColumns()}
          from assessments
          where tenant_id = $1
          order by created_at desc
          limit $2 offset $3
        `,
        [tenantId, pagination.limit, pagination.offset]
      );
      return Promise.all(result.rows.map((row) => recordWithItems(client, row)));
    });
  }

  async findAssessment(tenantId: string, assessmentId: string): Promise<AssessmentRecord | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      return findAssessmentWithClient(client, tenantId, assessmentId);
    });
  }

  async findItem(tenantId: string, assessmentId: string, itemId: string): Promise<AssessmentItem | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          ${itemsSelectWithNormalizedFallback()}
          where ai.tenant_id = $1 and ai.assessment_id = $2 and ai.id = $3
        `,
        [tenantId, assessmentId, itemId]
      );
      return result.rows[0] ? mapItem(result.rows[0]) : null;
    });
  }

  async updateItem(input: {
    tenantId: string;
    assessmentId: string;
    item: AssessmentItem;
    actorId: string;
  }): Promise<AssessmentItem> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          update assessment_items
          set status = $4,
              owner_id = $5,
              answer_text = $6,
              applicability = $7::jsonb,
              evidence_ids = $8::uuid[],
              updated_by = $9,
              updated_at = now(),
              version = version + 1
          where tenant_id = $1 and assessment_id = $2 and id = $3
          returning ${itemColumns()}
        `,
        [
          input.tenantId,
          input.assessmentId,
          input.item.id,
          input.item.status,
          input.item.ownerId,
          input.item.answerText ?? null,
          JSON.stringify(input.item.applicability),
          input.item.evidenceIds,
          input.actorId
        ]
      );
      if (!result.rows[0]) {
        throw new Error("Assessment item was not found.");
      }
      return mapItem(result.rows[0]);
    });
  }

  async updateAssessmentStatus(input: {
    tenantId: string;
    assessmentId: string;
    status: AssessmentRecord["status"];
    actorId: string;
  }): Promise<AssessmentRecord> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          update assessments
          set status = $3,
              updated_by = $4,
              updated_at = now(),
              version = version + 1
          where tenant_id = $1 and id = $2
          returning ${assessmentColumns()}
        `,
        [input.tenantId, input.assessmentId, input.status, input.actorId]
      );
      if (!result.rows[0]) {
        throw new Error("Assessment was not found.");
      }
      return recordWithItems(client, result.rows[0]);
    });
  }
}

async function findAssessmentWithClient(
  client: TenantScopedClient,
  tenantId: string,
  assessmentId: string
): Promise<AssessmentRecord | null> {
  const result = await client.query(
    `
      select ${assessmentColumns()}
      from assessments
      where tenant_id = $1 and id = $2
    `,
    [tenantId, assessmentId]
  );
  return result.rows[0] ? recordWithItems(client, result.rows[0]) : null;
}

async function recordWithItems(client: TenantScopedClient, row: Record<string, unknown>): Promise<AssessmentRecord> {
  const items = await client.query(
    `
      ${itemsSelectWithNormalizedFallback()}
      where ai.tenant_id = $1 and ai.assessment_id = $2
      order by ai.created_at, ai.id
    `,
    [row.tenant_id, row.id]
  );
  return mapAssessment(row, items.rows.map(mapItem));
}

async function insertItem(
  client: TenantScopedClient,
  assessment: Assessment,
  item: AssessmentItem,
  controlInstanceId: string,
  questionVersionId: string,
  sequenceNo: number
): Promise<void> {
  await client.query(
    `
      insert into assessment_items (
        id, tenant_id, assessment_id, framework_key, framework_version, mapping_version,
        control_id, harmonized_control_id, question_version, status, owner_id, answer_text,
        applicability, evidence_ids, classification, created_by, created_at, updated_by, updated_at,
        control_instance_id, question_version_id, sequence_no, required
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::uuid[],
              'confidential', $15, $16, $15, $16, $17, $18, $19, true)
    `,
    [
      item.id,
      assessment.tenantId,
      assessment.id,
      item.controlRef.frameworkKey,
      item.controlRef.frameworkVersion,
      item.controlRef.mappingVersion,
      item.controlRef.controlId,
      item.controlRef.harmonizedControlId,
      item.controlRef.questionVersion,
      item.status,
      item.ownerId,
      item.answerText ?? null,
      JSON.stringify(item.applicability),
      item.evidenceIds,
      assessment.createdBy,
      assessment.createdAt,
      controlInstanceId,
      questionVersionId,
      sequenceNo
    ]
  );
}

function assessmentColumns(): string {
  return `
    id, tenant_id, version, scope_name, status, control_snapshot_version,
    period_start, period_end, classification, created_by, created_at, updated_by, updated_at
  `;
}

function itemColumns(): string {
  return `
    id, tenant_id, version, assessment_id, framework_key, framework_version, mapping_version,
    control_id, harmonized_control_id, question_version, status, owner_id, answer_text,
    applicability, evidence_ids, classification, created_by, created_at, updated_by, updated_at,
    question_version_id
  `;
}

// G-01 Cutover: reads now source answer/applicability data from the normalized, append-only
// answer_revisions/applicability_decisions tables as authoritative — falling back to the legacy
// flat assessment_items.answer_text/applicability/evidence_ids columns only when no normalized
// record exists yet (defensive; every row reachable post-Backfill+Constrain should already have
// one). insertItem still dual-writes the flat columns on creation (see createAssessment above) and
// updateItem still writes them on every mutation, alongside the normalized inserts the service
// layer performs — this is a read-path cutover, not a write-path removal; that is Contract's job.
function itemsSelectWithNormalizedFallback(): string {
  return `
    select ai.id, ai.tenant_id, ai.version, ai.assessment_id, ai.framework_key, ai.framework_version,
           ai.mapping_version, ai.control_id, ai.harmonized_control_id, ai.question_version,
           ai.status, ai.owner_id, ai.classification, ai.created_by, ai.created_at, ai.updated_by,
           ai.updated_at, ai.question_version_id,
           coalesce(latest_answer.answer_text, ai.answer_text) as answer_text,
           coalesce(latest_answer.evidence_ids, ai.evidence_ids::text[]) as evidence_ids,
           coalesce(latest_decision.applicability, ai.applicability) as applicability
    from assessment_items ai
    left join lateral (
      select ar.response_json ->> 'answerText' as answer_text,
             array(
               select jsonb_array_elements_text(coalesce(ar.response_json -> 'evidenceIds', '[]'::jsonb))
             ) as evidence_ids
      from answer_revisions ar
      where ar.tenant_id = ai.tenant_id and ar.assessment_item_id = ai.id
      order by ar.revision desc
      limit 1
    ) latest_answer on true
    left join lateral (
      select jsonb_build_object(
               'applicable', (ad.decision = 'applicable'),
               'rationale', ad.rationale,
               'approvedBy', ad.decided_by,
               'approvedAt', ad.decided_at
             ) as applicability
      from applicability_decisions ad
      where ad.tenant_id = ai.tenant_id and ad.control_instance_id = ai.control_instance_id
      order by ad.decided_at desc
      limit 1
    ) latest_decision on true
  `;
}

function mapAssessment(row: Record<string, unknown>, items: AssessmentItem[]): AssessmentRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    scopeName: String(row.scope_name),
    status: row.status as AssessmentRecord["status"],
    controlSnapshotVersion: String(row.control_snapshot_version),
    periodStart: row.period_start as Date,
    periodEnd: row.period_end as Date,
    items,
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

function mapItem(row: Record<string, unknown>): AssessmentItem {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    status: row.status as AssessmentItem["status"],
    answerText: (row.answer_text as string | null) ?? undefined,
    evidenceIds: (row.evidence_ids as string[] | null) ?? [],
    applicability: mapApplicability(row.applicability),
    controlRef: mapControlRef(row)
  };
}

function mapControlRef(row: Record<string, unknown>): PinnedControlRef {
  return {
    frameworkKey: String(row.framework_key),
    frameworkVersion: String(row.framework_version),
    mappingVersion: String(row.mapping_version),
    controlId: String(row.control_id),
    harmonizedControlId: String(row.harmonized_control_id),
    questionVersion: String(row.question_version),
    questionVersionId: String(row.question_version_id)
  };
}

function requirementLookupKey(controlRef: PinnedControlRef): string {
  return `${controlRef.frameworkKey}:${controlRef.controlId}`;
}

function mapApplicability(value: unknown): AssessmentItem["applicability"] {
  if (!value) {
    return null;
  }
  const record = value as {
    applicable: boolean;
    rationale: string;
    approvedBy: string;
    approvedAt: string | Date;
  };
  return {
    applicable: Boolean(record.applicable),
    rationale: String(record.rationale),
    approvedBy: String(record.approvedBy),
    approvedAt: new Date(record.approvedAt)
  };
}

function mapControlInstance(row: Record<string, unknown>): ControlInstance {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    assessmentId: String(row.assessment_id),
    controlId: String(row.control_id),
    frameworkKey: String(row.framework_key),
    frameworkVersion: String(row.framework_version),
    mappingVersion: String(row.mapping_version),
    ownerId: String(row.owner_id),
    applicabilityStatus: row.applicability_status as ControlInstance["applicabilityStatus"],
    status: row.status as ControlInstance["status"],
    score: row.score === null || row.score === undefined ? null : Number(row.score),
    maturity: (row.maturity as string | null) ?? null
  };
}

function mapAnswerRevision(row: Record<string, unknown>): AnswerRevision {
  return {
    id: String(row.id),
    assessmentItemId: String(row.assessment_item_id),
    revision: Number(row.revision),
    responseJson: row.response_json as Record<string, unknown>,
    submittedBy: String(row.submitted_by),
    submittedAt: row.submitted_at as Date,
    supersedesId: (row.supersedes_id as string | null) ?? null
  };
}

function mapApplicabilityDecision(row: Record<string, unknown>): ApplicabilityDecision {
  return {
    id: String(row.id),
    controlInstanceId: String(row.control_instance_id),
    decision: row.decision as ApplicabilityDecision["decision"],
    rationale: String(row.rationale),
    decidedBy: String(row.decided_by),
    approvedBy: (row.approved_by as string | null) ?? null,
    decidedAt: row.decided_at as Date
  };
}

function mapReviewDecision(row: Record<string, unknown>): ReviewDecision {
  return {
    id: String(row.id),
    assessmentItemId: String(row.assessment_item_id),
    answerRevisionId: String(row.answer_revision_id),
    reviewerId: String(row.reviewer_id),
    decision: row.decision as ReviewDecision["decision"],
    rationale: (row.rationale as string | null) ?? null,
    decidedAt: row.decided_at as Date
  };
}

function mapAssessmentSignoff(row: Record<string, unknown>): AssessmentSignoff {
  return {
    id: String(row.id),
    assessmentId: String(row.assessment_id),
    scopeType: row.scope_type as AssessmentSignoff["scopeType"],
    scopeId: String(row.scope_id),
    signerId: String(row.signer_id),
    decision: row.decision as AssessmentSignoff["decision"],
    signedAt: row.signed_at as Date
  };
}

function mapTestProcedure(row: Record<string, unknown>): TestProcedure {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    controlId: String(row.control_id),
    procedureKey: String(row.procedure_key),
    method: String(row.method),
    expectedResult: String(row.expected_result),
    status: row.status as TestProcedure["status"]
  };
}

function mapControlTestResult(row: Record<string, unknown>): ControlTestResult {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    controlInstanceId: String(row.control_instance_id),
    testProcedureId: String(row.test_procedure_id),
    runId: String(row.run_id),
    population: (row.population as string | null) ?? null,
    sampleJson: row.sample_json as Record<string, unknown>,
    result: row.result as ControlTestResult["result"],
    testedBy: String(row.tested_by),
    testedAt: row.tested_at as Date
  };
}
