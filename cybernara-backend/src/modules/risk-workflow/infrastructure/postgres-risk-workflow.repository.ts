import { Inject, Injectable } from "@nestjs/common";
import { TenantScopedDb, type TenantScopedClient } from "../../../platform/database/tenant-scoped-db.js";
import type {
  Finding,
  RemediationTask,
  RemediationTaskReview,
  Risk,
  RiskAcceptance,
  RiskAcceptanceReview,
  RiskLink,
  RiskModel,
  RiskTreatment
} from "../domain/risk.js";
import type {
  RiskAcceptanceRecord,
  RiskAcceptanceReviewRecord,
  FindingRecord,
  RemediationTaskRecord,
  RemediationTaskReviewRecord,
  RiskLinkRecord,
  RiskModelRecord,
  RiskRecord,
  RiskTreatmentRecord,
  RiskWorkflowRepository
} from "../application/risk-workflow.types.js";

@Injectable()
export class PostgresRiskWorkflowRepository implements RiskWorkflowRepository {
  constructor(@Inject(TenantScopedDb) private readonly db: TenantScopedDb) {}

  async createFinding(input: { finding: Finding; actorId: string }): Promise<FindingRecord> {
    return this.db.withTenant(input.finding.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into findings (
            id, tenant_id, assessment_item_id, test_result_id, severity, impact, likelihood, owner_id,
            due_at, description, classification,
            created_by, created_at, updated_by, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'confidential', $11, $12, $11, $12)
          returning ${findingColumns()}
        `,
        [
          input.finding.id,
          input.finding.tenantId,
          input.finding.assessmentItemId,
          input.finding.testResultId,
          input.finding.severity,
          input.finding.impact ?? null,
          input.finding.likelihood ?? null,
          input.finding.ownerId ?? null,
          input.finding.dueAt ?? null,
          input.finding.description,
          input.actorId,
          input.finding.createdAt
        ]
      );
      return mapFinding(result.rows[0]);
    });
  }

  async listFindings(input: {
    tenantId: string;
    assessmentItemId?: string;
    testResultId?: string;
    pagination: { limit: number; offset: number };
  }): Promise<FindingRecord[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const values: unknown[] = [input.tenantId, input.pagination.limit, input.pagination.offset];
      const predicates: string[] = [];
      if (input.assessmentItemId) {
        values.push(input.assessmentItemId);
        predicates.push(`and assessment_item_id = $${values.length}`);
      }
      if (input.testResultId) {
        values.push(input.testResultId);
        predicates.push(`and test_result_id = $${values.length}`);
      }
      const result = await client.query(
        `
          select ${findingColumns()}
          from findings
          where tenant_id = $1
          ${predicates.join(" ")}
          order by created_at desc
          limit $2 offset $3
        `,
        values
      );
      return result.rows.map(mapFinding);
    });
  }

  async findFinding(tenantId: string, findingId: string): Promise<FindingRecord | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${findingColumns()}
          from findings
          where tenant_id = $1 and id = $2
        `,
        [tenantId, findingId]
      );
      return result.rows[0] ? mapFinding(result.rows[0]) : null;
    });
  }

  async updateFinding(input: {
    tenantId: string;
    findingId: string;
    actorId: string;
    severity: Finding["severity"];
    impact?: Finding["impact"];
    likelihood?: Finding["likelihood"];
    ownerId?: string;
    dueAt?: Date;
    description: string;
  }): Promise<FindingRecord> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          update findings
          set severity = $3,
              impact = coalesce($4, impact),
              likelihood = coalesce($5, likelihood),
              owner_id = coalesce($6, owner_id),
              due_at = coalesce($7, due_at),
              description = $8,
              updated_by = $9,
              updated_at = now(),
              version = version + 1
          where tenant_id = $1 and id = $2
          returning ${findingColumns()}
        `,
        [
          input.tenantId,
          input.findingId,
          input.severity,
          input.impact ?? null,
          input.likelihood ?? null,
          input.ownerId ?? null,
          input.dueAt ?? null,
          input.description,
          input.actorId
        ]
      );
      if (!result.rows[0]) {
        throw new Error("Finding was not found.");
      }
      return mapFinding(result.rows[0]);
    });
  }

  async createRemediationTask(input: {
    tenantId: string;
    task: RemediationTask;
    actorId: string;
  }): Promise<RemediationTaskRecord> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      return withLegacyWrite(client, async () => {
        const result = await client.query(
          `
            insert into remediation_tasks (
              id, tenant_id, finding_id, owner_id, due_at, status, classification,
              created_by, created_at, updated_by, updated_at
            )
            values ($1, $2, $3, $4, $5, $6, 'confidential', $7, now(), $7, now())
            returning ${taskColumns()}
          `,
          [
            input.task.id,
            input.tenantId,
            input.task.findingId,
            input.task.ownerId,
            input.task.dueAt,
            input.task.status,
            input.actorId
          ]
        );
        return mapTask(result.rows[0]);
      });
    });
  }

  async listRemediationTasks(input: {
    tenantId: string;
    findingId?: string;
    pagination: { limit: number; offset: number };
  }): Promise<RemediationTaskRecord[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const values: unknown[] = [input.tenantId, input.pagination.limit, input.pagination.offset];
      const findingPredicate = input.findingId ? "and finding_id = $4" : "";
      if (input.findingId) {
        values.push(input.findingId);
      }
      const result = await client.query(
        `
          select ${taskColumns()}
          from remediation_tasks
          where tenant_id = $1
          ${findingPredicate}
          order by created_at desc
          limit $2 offset $3
        `,
        values
      );
      return result.rows.map(mapTask);
    });
  }

  async findRemediationTask(tenantId: string, taskId: string): Promise<RemediationTaskRecord | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${taskColumns()}
          from remediation_tasks
          where tenant_id = $1 and id = $2
        `,
        [tenantId, taskId]
      );
      return result.rows[0] ? mapTask(result.rows[0]) : null;
    });
  }

  async updateRemediationTask(input: {
    tenantId: string;
    taskId: string;
    actorId: string;
    ownerId: string;
    dueAt: Date;
    status: RemediationTask["status"];
  }): Promise<RemediationTaskRecord> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      return withLegacyWrite(client, async () => {
        const result = await client.query(
          `
            update remediation_tasks
            set owner_id = $3,
                due_at = $4,
                status = $5,
                updated_by = $6,
                updated_at = now(),
                version = version + 1
            where tenant_id = $1 and id = $2
            returning ${taskColumns()}
          `,
          [input.tenantId, input.taskId, input.ownerId, input.dueAt, input.status, input.actorId]
        );
        if (!result.rows[0]) {
          throw new Error("Remediation task was not found.");
        }
        return mapTask(result.rows[0]);
      });
    });
  }

  async createRemediationTaskReview(input: {
    tenantId: string;
    review: RemediationTaskReview;
  }): Promise<RemediationTaskReviewRecord> {
    return this.db.withTenant(input.tenantId, input.review.reviewerId, async (client) => {
      const review = input.review;
      const result = await client.query(
        `
          insert into remediation_task_reviews (
            id, tenant_id, remediation_task_id, reviewer_id, decision, rationale,
            evidence_version_ids, reviewed_at
          )
          values ($1, $2, $3, $4, $5, $6, $7::uuid[], $8)
          returning ${taskReviewColumns()}
        `,
        [
          review.id,
          input.tenantId,
          review.remediationTaskId,
          review.reviewerId,
          review.decision,
          review.rationale,
          review.evidenceVersionIds,
          review.reviewedAt
        ]
      );
      return mapTaskReview(result.rows[0]);
    });
  }

  async listRemediationTaskReviews(input: {
    tenantId: string;
    taskId: string;
    pagination: { limit: number; offset: number };
  }): Promise<RemediationTaskReviewRecord[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${taskReviewColumns()}
          from remediation_task_reviews
          where tenant_id = $1 and remediation_task_id = $2
          order by reviewed_at desc
          limit $3 offset $4
        `,
        [input.tenantId, input.taskId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapTaskReview);
    });
  }

  async createRiskAcceptance(input: {
    tenantId: string;
    acceptance: RiskAcceptance;
    actorId: string;
  }): Promise<RiskAcceptanceRecord> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const acceptance = input.acceptance;
      const result = await client.query(
        `
          insert into risk_acceptances (
            id, tenant_id, remediation_task_id, finding_id, risk_id, rationale, approver_id,
            approved_at, expires_at, next_review_due_at, compensating_controls,
            classification, created_by, created_at, updated_by, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'confidential', $12, $8, $12, $8)
          returning ${acceptanceColumns()}
        `,
        [
          acceptance.id,
          input.tenantId,
          acceptance.remediationTaskId,
          acceptance.findingId,
          acceptance.riskId ?? null,
          acceptance.rationale,
          acceptance.approverId,
          acceptance.approvedAt,
          acceptance.expiresAt,
          acceptance.nextReviewDueAt,
          acceptance.compensatingControls ?? null,
          input.actorId
        ]
      );
      return mapAcceptance(result.rows[0]);
    });
  }

  async hasRemediationEvidenceLinks(tenantId: string, remediationTaskId: string): Promise<boolean> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select 1
          from evidence_links
          where tenant_id = $1
            and target_type = 'remediation_task'
            and target_id = $2
          limit 1
        `,
        [tenantId, remediationTaskId]
      );
      return (result.rowCount ?? 0) > 0;
    });
  }

  async findActiveRiskAcceptanceForTask(tenantId: string, remediationTaskId: string): Promise<RiskAcceptanceRecord | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${acceptanceColumns()}
          from risk_acceptances
          where tenant_id = $1 and remediation_task_id = $2 and superseded_at is null
          order by approved_at desc
          limit 1
        `,
        [tenantId, remediationTaskId]
      );
      return result.rows[0] ? mapAcceptance(result.rows[0]) : null;
    });
  }

  async findRiskAcceptance(tenantId: string, riskAcceptanceId: string): Promise<RiskAcceptanceRecord | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${acceptanceColumns()}
          from risk_acceptances
          where tenant_id = $1 and id = $2
        `,
        [tenantId, riskAcceptanceId]
      );
      return result.rows[0] ? mapAcceptance(result.rows[0]) : null;
    });
  }

  async createRiskAcceptanceReview(input: {
    tenantId: string;
    review: RiskAcceptanceReview;
  }): Promise<RiskAcceptanceReviewRecord> {
    return this.db.withTenant(input.tenantId, input.review.reviewerId, async (client) => {
      const review = input.review;
      const result = await client.query(
        `
          insert into risk_acceptance_reviews (
            id, tenant_id, risk_acceptance_id, reviewer_id, decision, reason, reviewed_at
          )
          values ($1, $2, $3, $4, $5, $6, $7)
          returning id, tenant_id, risk_acceptance_id, reviewer_id, decision, reason, reviewed_at
        `,
        [review.id, input.tenantId, review.riskAcceptanceId, review.reviewerId, review.decision, review.reason, review.reviewedAt]
      );
      return mapReview(result.rows[0]);
    });
  }

  async createRiskModel(input: { model: RiskModel; actorId: string }): Promise<RiskModelRecord> {
    return this.db.withTenant(input.model.tenantId, input.actorId, async (client) => {
      const model = input.model;
      const result = await client.query(
        `
          insert into risk_models (
            id, tenant_id, model_key, model_version, scales_json, formula, thresholds, status,
            classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8, 'confidential', $9, $9)
          returning ${riskModelColumns()}
        `,
        [
          model.id,
          model.tenantId,
          model.modelKey,
          model.modelVersion,
          JSON.stringify(model.scalesJson),
          model.formula,
          JSON.stringify(model.thresholds),
          model.status,
          input.actorId
        ]
      );
      return mapRiskModel(result.rows[0]);
    });
  }

  async listRiskModels(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<RiskModelRecord[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${riskModelColumns()} from risk_models where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapRiskModel);
    });
  }

  async createRisk(input: { risk: Risk; actorId: string }): Promise<RiskRecord> {
    return this.db.withTenant(input.risk.tenantId, input.actorId, async (client) => {
      const risk = input.risk;
      const result = await client.query(
        `
          insert into risks (
            id, tenant_id, workspace_id, risk_model_id, risk_key, title, category,
            inherent_score, residual_score, owner_id, status, classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'confidential', $12, $12)
          returning ${riskColumns()}
        `,
        [
          risk.id,
          risk.tenantId,
          risk.workspaceId ?? null,
          risk.riskModelId ?? null,
          risk.riskKey,
          risk.title,
          risk.category,
          risk.inherentScore,
          risk.residualScore,
          risk.ownerId,
          risk.status,
          input.actorId
        ]
      );
      return mapRisk(result.rows[0]);
    });
  }

  async listRisks(input: { tenantId: string; pagination: { limit: number; offset: number } }): Promise<RiskRecord[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${riskColumns()} from risks where tenant_id = $1 order by created_at desc limit $2 offset $3`,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapRisk);
    });
  }

  async findRisk(tenantId: string, riskId: string): Promise<RiskRecord | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(`select ${riskColumns()} from risks where tenant_id = $1 and id = $2`, [
        tenantId,
        riskId
      ]);
      return result.rows[0] ? mapRisk(result.rows[0]) : null;
    });
  }

  async createRiskLink(input: { link: RiskLink; actorId: string }): Promise<RiskLinkRecord> {
    return this.db.withTenant(input.link.tenantId, input.actorId, async (client) => {
      const link = input.link;
      const result = await client.query(
        `
          insert into risk_links (id, tenant_id, risk_id, target_type, target_id, relationship, classification, created_by, updated_by)
          values ($1, $2, $3, $4, $5, $6, 'confidential', $7, $7)
          returning ${riskLinkColumns()}
        `,
        [link.id, link.tenantId, link.riskId, link.targetType, link.targetId, link.relationship, input.actorId]
      );
      return mapRiskLink(result.rows[0]);
    });
  }

  async listRiskLinks(input: {
    tenantId: string;
    riskId: string;
    pagination: { limit: number; offset: number };
  }): Promise<RiskLinkRecord[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${riskLinkColumns()} from risk_links where tenant_id = $1 and risk_id = $2 order by created_at desc limit $3 offset $4`,
        [input.tenantId, input.riskId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapRiskLink);
    });
  }

  async createRiskTreatment(input: { treatment: RiskTreatment; actorId: string }): Promise<RiskTreatmentRecord> {
    return this.db.withTenant(input.treatment.tenantId, input.actorId, async (client) => {
      const treatment = input.treatment;
      const result = await client.query(
        `
          insert into risk_treatments (
            id, tenant_id, risk_id, strategy, plan, owner_id, due_at, status,
            classification, created_by, updated_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, 'confidential', $9, $9)
          returning ${riskTreatmentColumns()}
        `,
        [
          treatment.id,
          treatment.tenantId,
          treatment.riskId,
          treatment.strategy,
          treatment.plan,
          treatment.ownerId,
          treatment.dueAt,
          treatment.status,
          input.actorId
        ]
      );
      return mapRiskTreatment(result.rows[0]);
    });
  }

  async listRiskTreatments(input: {
    tenantId: string;
    riskId: string;
    pagination: { limit: number; offset: number };
  }): Promise<RiskTreatmentRecord[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${riskTreatmentColumns()} from risk_treatments where tenant_id = $1 and risk_id = $2 order by created_at desc limit $3 offset $4`,
        [input.tenantId, input.riskId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapRiskTreatment);
    });
  }
}

async function withLegacyWrite<T>(client: TenantScopedClient, operation: () => Promise<T>): Promise<T> {
  await client.query("set local app.allow_legacy_write = '1'");
  return operation();
}

function findingColumns(): string {
  return `
    id, tenant_id, version, assessment_item_id, test_result_id, severity, impact, likelihood,
    owner_id, due_at, description,
    classification, created_by, created_at, updated_by, updated_at
  `;
}

function taskColumns(): string {
  return `
    id, tenant_id, version, finding_id, owner_id, due_at, status, classification,
    created_by, created_at, updated_by, updated_at
  `;
}

function taskReviewColumns(): string {
  return `
    id, tenant_id, version, remediation_task_id, reviewer_id, decision, rationale,
    evidence_version_ids, reviewed_at
  `;
}

function acceptanceColumns(): string {
  return `
    id, tenant_id, version, remediation_task_id, finding_id, risk_id, rationale, approver_id,
    approved_at, expires_at, next_review_due_at, compensating_controls, superseded_at,
    superseded_by_id, classification, created_by, created_at, updated_by, updated_at
  `;
}

function mapFinding(row: Record<string, unknown>): FindingRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    assessmentItemId: (row.assessment_item_id as string | null) ?? null,
    testResultId: (row.test_result_id as string | null) ?? null,
    severity: row.severity as Finding["severity"],
    impact: (row.impact as Finding["impact"]) ?? null,
    likelihood: (row.likelihood as Finding["likelihood"]) ?? null,
    ownerId: row.owner_id ? String(row.owner_id) : null,
    dueAt: row.due_at ? (row.due_at as Date) : null,
    description: String(row.description),
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

function mapTask(row: Record<string, unknown>): RemediationTaskRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    findingId: String(row.finding_id),
    ownerId: String(row.owner_id),
    dueAt: row.due_at as Date,
    status: row.status as RemediationTask["status"],
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

function mapTaskReview(row: Record<string, unknown>): RemediationTaskReviewRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    remediationTaskId: String(row.remediation_task_id),
    reviewerId: String(row.reviewer_id),
    decision: row.decision as RemediationTaskReview["decision"],
    rationale: String(row.rationale),
    evidenceVersionIds: Array.isArray(row.evidence_version_ids)
      ? row.evidence_version_ids.map(String)
      : [],
    reviewedAt: row.reviewed_at as Date
  };
}

function mapAcceptance(row: Record<string, unknown>): RiskAcceptanceRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    remediationTaskId: String(row.remediation_task_id),
    findingId: String(row.finding_id),
    riskId: row.risk_id ? String(row.risk_id) : undefined,
    rationale: String(row.rationale),
    approverId: String(row.approver_id),
    approvedAt: row.approved_at as Date,
    expiresAt: row.expires_at as Date,
    nextReviewDueAt: row.next_review_due_at as Date,
    compensatingControls: row.compensating_controls ? String(row.compensating_controls) : undefined,
    supersededAt: row.superseded_at ? (row.superseded_at as Date) : undefined,
    supersededById: row.superseded_by_id ? String(row.superseded_by_id) : undefined,
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

function mapReview(row: Record<string, unknown>): RiskAcceptanceReviewRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    riskAcceptanceId: String(row.risk_acceptance_id),
    reviewerId: String(row.reviewer_id),
    decision: row.decision as RiskAcceptanceReview["decision"],
    reason: String(row.reason),
    reviewedAt: row.reviewed_at as Date
  };
}

function riskModelColumns(): string {
  return `
    id, tenant_id, version, model_key, model_version, scales_json, formula, thresholds, status,
    classification, created_by, created_at, updated_by, updated_at
  `;
}

function riskColumns(): string {
  return `
    id, tenant_id, version, workspace_id, risk_model_id, risk_key, title, category,
    inherent_score, residual_score, owner_id, status, classification, created_by, created_at,
    updated_by, updated_at
  `;
}

function riskLinkColumns(): string {
  return `
    id, tenant_id, version, risk_id, target_type, target_id, relationship, classification,
    created_by, created_at, updated_by, updated_at
  `;
}

function riskTreatmentColumns(): string {
  return `
    id, tenant_id, version, risk_id, strategy, plan, owner_id, due_at, status, classification,
    created_by, created_at, updated_by, updated_at
  `;
}

function mapRiskModel(row: Record<string, unknown>): RiskModelRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    modelKey: String(row.model_key),
    modelVersion: String(row.model_version),
    scalesJson: mapJson(row.scales_json),
    formula: String(row.formula),
    thresholds: mapJson(row.thresholds),
    status: row.status as RiskModel["status"],
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

function mapRisk(row: Record<string, unknown>): RiskRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    workspaceId: row.workspace_id ? String(row.workspace_id) : undefined,
    riskModelId: row.risk_model_id ? String(row.risk_model_id) : undefined,
    riskKey: String(row.risk_key),
    title: String(row.title),
    category: String(row.category),
    inherentScore: Number(row.inherent_score),
    residualScore: Number(row.residual_score),
    ownerId: String(row.owner_id),
    status: row.status as Risk["status"],
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

function mapRiskLink(row: Record<string, unknown>): RiskLinkRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    riskId: String(row.risk_id),
    targetType: row.target_type as RiskLink["targetType"],
    targetId: String(row.target_id),
    relationship: row.relationship as RiskLink["relationship"],
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

function mapRiskTreatment(row: Record<string, unknown>): RiskTreatmentRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    riskId: String(row.risk_id),
    strategy: row.strategy as RiskTreatment["strategy"],
    plan: String(row.plan),
    ownerId: String(row.owner_id),
    dueAt: row.due_at as Date,
    status: row.status as RiskTreatment["status"],
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

function mapJson(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    return JSON.parse(value) as Record<string, unknown>;
  }
  return {};
}

// Re-exported for callers that only need the client shape (e.g. tests).
export type { TenantScopedClient };
