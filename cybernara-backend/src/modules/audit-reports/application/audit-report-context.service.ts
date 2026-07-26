import { Inject, Injectable } from "@nestjs/common";
import { AssessmentService, type AssessmentRecord } from "../../assessment/public.js";
import { RiskWorkflowService } from "../../risk-workflow/public.js";
import { EvidenceAssuranceService } from "../../evidence-assurance/public.js";
import { QuestionsDashboardService } from "../../questions-dashboard/public.js";
import { runComplianceEngine, type ComplianceEngineInput } from "../domain/compliance-engine.js";
import type { AuditReportJson, QuestionAnswerRow } from "./audit-report.types.js";

const PAGE_SIZE = 200;

/**
 * Fetches everything real for ONE assessment - its questions and answers,
 * items, findings, remediation tasks (with reviews), risk acceptances
 * (with the risk they reference), linked evidence, and reviewer signoffs -
 * and assembles the report directly from it. No AI call anywhere in this
 * path.
 *
 * The compliance engine reports the review outcome the assessment itself
 * already recorded (item approved or not) - it does not re-derive a verdict
 * from findings/remediation/risk-acceptance state. Those are real facts
 * about what happened and are surfaced in full as their own registers
 * below, not folded back into the score.
 */
@Injectable()
export class AuditReportContextService {
  constructor(
    @Inject(AssessmentService) private readonly assessments: AssessmentService,
    @Inject(RiskWorkflowService) private readonly riskWorkflow: RiskWorkflowService,
    @Inject(EvidenceAssuranceService) private readonly evidenceAssurance: EvidenceAssuranceService,
    @Inject(QuestionsDashboardService) private readonly questionsDashboard: QuestionsDashboardService
  ) {}

  async assemble(tenantId: string, actorId: string, assessment: AssessmentRecord): Promise<AuditReportJson> {
    const itemIds = new Set(assessment.items.map((item) => item.id));

    const [allFindings, allRiskAcceptances, signoffs, unifiedQuestions] = await Promise.all([
      fetchAllPages((pagination) => this.riskWorkflow.listFindings({ tenantId, pagination })),
      fetchAllPages((pagination) => this.riskWorkflow.listRiskAcceptances(tenantId, pagination)),
      this.assessments.getSignoffs(tenantId, assessment.id),
      this.questionsDashboard.listUnifiedQuestions(tenantId, actorId)
    ]);

    const findings = allFindings.filter((finding) => finding.assessmentItemId && itemIds.has(finding.assessmentItemId));
    const findingIds = new Set(findings.map((finding) => finding.id));

    const allRemediationTasks = await fetchAllPages((pagination) => this.riskWorkflow.listRemediationTasks({ tenantId, pagination }));
    const remediationTasks = allRemediationTasks.filter((task) => findingIds.has(task.findingId));
    const remediationWithReviews = await Promise.all(
      remediationTasks.map(async (task) => ({
        task,
        reviews: await this.riskWorkflow.listRemediationTaskReviews(tenantId, task.id, { limit: 200, offset: 0 })
      }))
    );

    const riskAcceptances = allRiskAcceptances.filter((acceptance) => findingIds.has(acceptance.findingId));
    const riskDetailById = new Map<string, { title: string; category: string; inherentScore: number; residualScore: number }>();
    for (const acceptance of riskAcceptances) {
      if (!acceptance.riskId || riskDetailById.has(acceptance.riskId)) {
        continue;
      }
      const risk = await this.riskWorkflow.getRisk(tenantId, acceptance.riskId).catch(() => null);
      if (risk) {
        riskDetailById.set(acceptance.riskId, {
          title: risk.title,
          category: risk.category,
          inherentScore: risk.inherentScore,
          residualScore: risk.residualScore
        });
      }
    }

    const evidenceIds = new Set(assessment.items.flatMap((item) => item.evidenceIds));
    const evidenceObjects = await Promise.all(
      [...evidenceIds].map((evidenceId) => this.evidenceAssurance.get(tenantId, evidenceId).catch(() => null))
    );

    const complianceInput: ComplianceEngineInput = {
      items: assessment.items.map((item) => ({
        itemId: item.id,
        status: item.status,
        applicability: item.applicability ? { applicable: item.applicability.applicable } : null,
        controlRef: item.controlRef
      })),
      findings: findings.map((finding) => ({ id: finding.id, assessmentItemId: finding.assessmentItemId }))
    };
    const compliance = runComplianceEngine(complianceInput);

    const finalSignoff = signoffs.find((signoff) => signoff.scopeType === "final" && signoff.decision === "approved");

    const itemById = new Map(assessment.items.map((item) => [item.id, item]));
    const questionTextByVersionId = new Map(unifiedQuestions.map((question) => [question.questionVersionId, question.questionText]));

    const remediationByFinding = new Map<string, typeof remediationWithReviews>();
    for (const entry of remediationWithReviews) {
      const list = remediationByFinding.get(entry.task.findingId) ?? [];
      list.push(entry);
      remediationByFinding.set(entry.task.findingId, list);
    }
    const activeAcceptanceByFinding = new Set(riskAcceptances.filter((acceptance) => acceptance.active).map((acceptance) => acceptance.findingId));

    const questionsAndAnswers: QuestionAnswerRow[] = assessment.items.map((item) => ({
      itemId: item.id,
      frameworkKey: item.controlRef.frameworkKey,
      controlId: item.controlRef.controlId,
      questionText: questionTextByVersionId.get(item.controlRef.questionVersionId ?? "") ?? "Question text unavailable.",
      answerText: item.answerText ?? null,
      applicable: item.applicability ? item.applicability.applicable : true,
      applicabilityRationale: item.applicability?.rationale ?? null,
      evidenceCount: item.evidenceIds.length
    }));

    return {
      assessment: {
        id: assessment.id,
        scopeName: assessment.scopeName,
        status: assessment.status,
        periodStart: assessment.periodStart,
        periodEnd: assessment.periodEnd,
        frameworkKeys: [...new Set(assessment.items.map((item) => item.controlRef.frameworkKey))].sort(),
        itemCount: assessment.items.length,
        closedAt: finalSignoff?.signedAt ?? null,
        closedBy: finalSignoff?.signerId ?? null
      },
      questionsAndAnswers,
      compliance,
      evidence: {
        total: evidenceObjects.filter((evidence): evidence is NonNullable<typeof evidence> => evidence !== null).length,
        byState: countBy(
          evidenceObjects.filter((evidence): evidence is NonNullable<typeof evidence> => evidence !== null),
          (evidence) => evidence.state
        ),
        items: evidenceObjects
          .filter((evidence): evidence is NonNullable<typeof evidence> => evidence !== null)
          .map((evidence) => ({
            id: evidence.id,
            fileName: evidence.fileName,
            state: evidence.state,
            classification: evidence.classification,
            linkedItemIds: assessment.items.filter((item) => item.evidenceIds.includes(evidence.id)).map((item) => item.id)
          }))
      },
      findings: {
        total: findings.length,
        bySeverity: countBy(findings, (finding) => finding.severity),
        items: findings.map((finding) => {
          const item = finding.assessmentItemId ? itemById.get(finding.assessmentItemId) : undefined;
          const findingRemediations = remediationByFinding.get(finding.id) ?? [];
          const verified = findingRemediations.some(
            ({ task, reviews }) => task.status === "verified" && reviews.some((review) => review.decision === "approved")
          );
          const remediationStatus = findingRemediations.length === 0 ? null : verified ? "verified" : findingRemediations[0]!.task.status;
          return {
            id: finding.id,
            severity: finding.severity,
            description: finding.description,
            assessmentItemId: finding.assessmentItemId,
            frameworkKey: item?.controlRef.frameworkKey ?? null,
            controlId: item?.controlRef.controlId ?? null,
            ownerId: finding.ownerId ?? null,
            dueAt: finding.dueAt ?? null,
            remediationStatus,
            riskAccepted: activeAcceptanceByFinding.has(finding.id)
          };
        })
      },
      remediationTasks: {
        total: remediationTasks.length,
        byStatus: countBy(remediationTasks, (task) => task.status),
        items: remediationTasks.map((task) => ({
          id: task.id,
          findingId: task.findingId,
          status: task.status,
          ownerId: task.ownerId,
          dueAt: task.dueAt
        }))
      },
      riskAcceptances: {
        total: riskAcceptances.length,
        active: riskAcceptances.filter((acceptance) => acceptance.active).length,
        items: riskAcceptances.map((acceptance) => {
          const riskDetail = acceptance.riskId ? riskDetailById.get(acceptance.riskId) : undefined;
          return {
            id: acceptance.id,
            findingId: acceptance.findingId,
            riskId: acceptance.riskId,
            riskTitle: riskDetail?.title,
            riskCategory: riskDetail?.category,
            riskInherentScore: riskDetail?.inherentScore,
            riskResidualScore: riskDetail?.residualScore,
            rationale: acceptance.rationale,
            approverId: acceptance.approverId,
            approvedAt: acceptance.approvedAt,
            expiresAt: acceptance.expiresAt,
            active: acceptance.active
          };
        })
      },
      signoffs: signoffs.map((signoff) => ({
        id: signoff.id,
        scopeType: signoff.scopeType,
        scopeId: signoff.scopeId,
        signerId: signoff.signerId,
        decision: signoff.decision,
        signedAt: signoff.signedAt
      }))
    };
  }
}

async function fetchAllPages<T>(fetchPage: (pagination: { limit: number; offset: number }) => Promise<T[]>): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  for (;;) {
    const page = await fetchPage({ limit: PAGE_SIZE, offset });
    all.push(...page);
    if (page.length < PAGE_SIZE) {
      return all;
    }
    offset += PAGE_SIZE;
  }
}

function countBy<T>(rows: T[], key: (row: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const value = key(row);
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}
