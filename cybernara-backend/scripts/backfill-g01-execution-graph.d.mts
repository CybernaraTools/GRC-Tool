// Ambient type declaration for the plain-JS backfill script, so test files importing it under
// TypeScript's `strict` mode don't need `allowJs` project-wide just for this one script.

export interface BackfillSummary {
  rowsExamined: number;
  controlInstancesLinked: number;
  questionVersionsLinked: number;
  applicabilityDecisionsBackfilled: number;
  answerRevisionsBackfilled: number;
  applicabilitySkippedBlankRationale: number;
  remainingNulls?: number;
}

export interface AssessmentItemLegacyRow {
  id: string;
  tenant_id: string;
  assessment_id: string;
  framework_key: string;
  framework_version: string;
  mapping_version: string;
  control_id: string;
  harmonized_control_id: string;
  question_version: string;
  status: string;
  owner_id: string;
  answer_text: string | null;
  applicability: { applicable: boolean; rationale: string; approvedBy: string; approvedAt: Date | string } | null;
  evidence_ids: string[] | null;
  created_by: string;
  created_at: Date | string;
  updated_by: string;
  updated_at: Date | string;
}

export function deriveApplicabilityStatus(
  applicability: Pick<NonNullable<AssessmentItemLegacyRow["applicability"]>, "applicable"> | null
): "pending" | "applicable" | "not_applicable";

export function deriveControlInstanceInsertValues(item: AssessmentItemLegacyRow): {
  tenantId: string;
  assessmentId: string;
  controlId: string;
  frameworkKey: string;
  frameworkVersion: string;
  mappingVersion: string;
  ownerId: string;
  applicabilityStatus: string;
  status: string;
  createdBy: string;
  createdAt: Date | string;
  updatedBy: string;
  updatedAt: Date | string;
};

export function deriveApplicabilityDecisionInsertValues(
  item: AssessmentItemLegacyRow,
  controlInstanceId: string
):
  | { skippedBlankRationale: true }
  | {
      tenantId: string;
      controlInstanceId: string;
      decision: "applicable" | "not_applicable";
      rationale: string;
      decidedBy: string;
      approvedBy: null;
      decidedAt: Date | string;
    }
  | null;

export function deriveAnswerRevisionInsertValues(item: AssessmentItemLegacyRow):
  | {
      tenantId: string;
      assessmentItemId: string;
      revision: number;
      responseJson: Record<string, unknown>;
      submittedBy: string;
      submittedAt: Date | string;
      supersedesId: null;
    }
  | null;

export function deriveQuestionSetInsertValues(item: AssessmentItemLegacyRow): {
  tenantId: string;
  controlId: string;
  questionSetKey: string;
  createdBy: string;
  createdAt: Date | string;
  updatedBy: string;
  updatedAt: Date | string;
};

export function deriveQuestionVersionInsertValues(
  item: AssessmentItemLegacyRow,
  questionSetId: string
): {
  tenantId: string;
  questionSetId: string;
  questionVersion: number;
  payloadJson: Record<string, unknown>;
  checksum: string;
  createdBy: string;
  createdAt: Date | string;
  updatedBy: string;
  updatedAt: Date | string;
};

export function backfillItem(
  client: { query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> },
  itemId: string,
  summary: BackfillSummary
): Promise<void>;
