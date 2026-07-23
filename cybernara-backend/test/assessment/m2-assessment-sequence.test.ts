import { describe, expect, it } from "vitest";
import {
  approveApplicability,
  closeAssessment,
  createAssessment,
  reviewItem,
  submitAnswer
} from "../../src/modules/assessment/domain/assessment.js";
import {
  assertEvidenceReusable,
  commitCleanEvidence,
  createPendingEvidence,
  quarantineEvidence
} from "../../src/modules/evidence-assurance/domain/evidence.js";
import {
  acceptRisk,
  createFinding,
  createRemediationTask
} from "../../src/modules/risk-workflow/domain/risk.js";
import {
  renderAssessmentPdf,
  renderAssessmentWorkbook
} from "../../src/modules/reporting-analytics/domain/reporting.js";

const tenantId = "00000000-0000-4000-8000-000000000001";
const actorId = "00000000-0000-4000-8000-000000000002";
const ownerId = "00000000-0000-4000-8000-000000000003";
const reviewerId = "00000000-0000-4000-8000-000000000004";

describe("M2 assessment sequence", () => {
  it("creates scope, pins controls, answers with evidence, reviews, tracks risk, and exports reports", async () => {
    const assessment = createAssessment({
      tenantId,
      scopeName: "FY26 readiness",
      createdBy: actorId,
      ownerId,
      controls: [
        {
          frameworkKey: "SOC2",
          frameworkVersion: "b01c65d04ae5",
          mappingVersion: "m1-harmonization",
          controlId: "CC6.1",
          harmonizedControlId: "HARM-00002",
          questionVersion: "curated-baseline-v1"
        }
      ]
    });

    const pendingEvidence = createPendingEvidence({
      tenantId,
      ownerId,
      fileName: "access-review.csv",
      classification: "confidential",
      periodStart: new Date("2026-01-01T00:00:00.000Z"),
      periodEnd: new Date("2026-06-30T00:00:00.000Z"),
      scopeTags: ["identity", "access-review"]
    });
    const committedEvidence = commitCleanEvidence(quarantineEvidence(pendingEvidence), {
      bytes: Buffer.from("user,reviewer,status\nalice,manager,approved"),
      scannerVerdict: "clean"
    });
    assertEvidenceReusable(committedEvidence, {
      periodStart: new Date("2026-02-01T00:00:00.000Z"),
      periodEnd: new Date("2026-06-01T00:00:00.000Z"),
      scopeTags: ["identity"]
    });

    const applicable = approveApplicability(assessment.items[0], {
      applicable: true,
      rationale: "SOC 2 access control applies to the scoped identity system.",
      approvedBy: reviewerId
    });
    const submitted = submitAnswer(applicable, {
      answerText: "Quarterly access review completed for the scoped population.",
      evidenceIds: [committedEvidence.id]
    });
    const approved = reviewItem(submitted, { approved: true, reviewerId });
    const closed = closeAssessment({ ...assessment, items: [approved] }, reviewerId);

    const finding = createFinding({
      tenantId,
      assessmentItemId: approved.id,
      testResultId: null,
      severity: "medium",
      description: "One access review sample required remediation evidence."
    });
    const task = createRemediationTask({
      findingId: finding.id,
      ownerId,
      dueAt: new Date("2026-07-31T00:00:00.000Z")
    });
    const accepted = acceptRisk(task, {
      acceptedBy: reviewerId,
      reason: "Residual risk accepted until next quarterly access review."
    });

    const pdf = await renderAssessmentPdf(closed);
    const workbook = await renderAssessmentWorkbook(closed);

    expect(closed.status).toBe("closed");
    expect(committedEvidence.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(accepted.status).toBe("risk_accepted");
    expect(pdf.idempotencyKey).toBe(`${closed.controlSnapshotVersion}:m2-readiness-v1:pdf`);
    expect(workbook.idempotencyKey).toBe(`${closed.controlSnapshotVersion}:m2-readiness-v1:xlsx`);
    expect(pdf.bytes.length).toBeGreaterThan(1000);
    expect(workbook.bytes.length).toBeGreaterThan(1000);
  });

  it("enforces reviewer reason when reopening approved items", () => {
    const assessment = createAssessment({
      tenantId,
      scopeName: "Reopen rules",
      createdBy: actorId,
      ownerId,
      controls: [
        {
          frameworkKey: "ISO_27001",
          frameworkVersion: "d021f456d412",
          mappingVersion: "m1-harmonization",
          controlId: "A.5.15",
          harmonizedControlId: "HARM-00002",
          questionVersion: "curated-baseline-v1"
        }
      ]
    });

    expect(() =>
      closeAssessment(
        {
          ...assessment,
          items: [{ ...assessment.items[0], status: "submitted" }]
        },
        reviewerId
      )
    ).toThrow(/approved/);
  });
});

