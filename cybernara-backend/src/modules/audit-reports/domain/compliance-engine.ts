// Deterministic compliance engine. Pure function, no DB/AI access.
//
// The evaluation of each control already happened during the assessment
// itself - a reviewer either approved the item or didn't, before the
// assessment could close. This engine does not re-judge that decision by
// cross-referencing findings/remediation/risk-acceptance state; it reports
// the review outcome exactly as it was recorded. Findings, remediation, and
// risk acceptances are real facts about what happened and are surfaced in
// full elsewhere in the report (Findings/Remediation/Risk Acceptance
// registers) - they are informative context, not a second, silent scoring
// pass on top of the reviewer's own decision.

export interface ComplianceEngineItem {
  itemId: string;
  status: string;
  applicability: { applicable: boolean } | null;
  controlRef: {
    frameworkKey: string;
    frameworkVersion: string;
    controlId: string;
    harmonizedControlId: string;
  };
}

export interface ComplianceEngineFinding {
  id: string;
  assessmentItemId: string | null;
}

export interface ComplianceEngineInput {
  items: ComplianceEngineItem[];
  findings: ComplianceEngineFinding[];
}

export type ControlDisposition = "approved" | "not_approved" | "not_applicable";

export interface ControlDispositionResult {
  itemId: string;
  controlId: string;
  harmonizedControlId: string;
  frameworkKey: string;
  frameworkVersion: string;
  disposition: ControlDisposition;
  reason: string;
  findingCount: number;
  citationId: string;
}

export interface FrameworkComplianceResult {
  frameworkKey: string;
  frameworkVersion: string;
  applicableCount: number;
  approvedCount: number;
  notApprovedCount: number;
  notApplicableCount: number;
  rawPercentage: number | null;
  displayPercentage: string;
  formula: string;
  citationId: string;
}

export interface ComplianceEngineResult {
  dispositions: ControlDispositionResult[];
  frameworks: FrameworkComplianceResult[];
}

export function runComplianceEngine(input: ComplianceEngineInput): ComplianceEngineResult {
  const findingCountByItem = new Map<string, number>();
  for (const finding of input.findings) {
    if (!finding.assessmentItemId) {
      continue;
    }
    findingCountByItem.set(finding.assessmentItemId, (findingCountByItem.get(finding.assessmentItemId) ?? 0) + 1);
  }

  const dispositions: ControlDispositionResult[] = input.items.map((item) => {
    const citationId = `CONTROL:${item.controlRef.frameworkKey}:${item.controlRef.controlId}`;
    const findingCount = findingCountByItem.get(item.itemId) ?? 0;
    const base = {
      itemId: item.itemId,
      controlId: item.controlRef.controlId,
      harmonizedControlId: item.controlRef.harmonizedControlId,
      frameworkKey: item.controlRef.frameworkKey,
      frameworkVersion: item.controlRef.frameworkVersion,
      findingCount,
      citationId
    };

    if (item.applicability && item.applicability.applicable === false) {
      return {
        ...base,
        disposition: "not_applicable" as const,
        reason:
          findingCount > 0
            ? `Control was formally marked not applicable, but has ${findingCount} associated finding(s) in historical records.`
            : "Control was formally marked not applicable."
      };
    }

    if (item.status === "approved") {
      return {
        ...base,
        disposition: "approved" as const,
        reason:
          findingCount > 0
            ? `Reviewer approved this control during the assessment, with ${findingCount} associated finding(s) on record (see Findings Register).`
            : "Reviewer approved this control during the assessment, with no associated findings."
      };
    }

    return {
      ...base,
      disposition: "not_approved" as const,
      reason: `Not approved at closure: item status was '${item.status}', not 'approved'.`
    };
  });

  const frameworks = computeFrameworkCompliance(dispositions);
  return { dispositions, frameworks };
}

function computeFrameworkCompliance(dispositions: ControlDispositionResult[]): FrameworkComplianceResult[] {
  const byFramework = new Map<string, { frameworkVersion: string; items: ControlDispositionResult[] }>();
  for (const disposition of dispositions) {
    const existing = byFramework.get(disposition.frameworkKey);
    if (existing) {
      existing.items.push(disposition);
    } else {
      byFramework.set(disposition.frameworkKey, { frameworkVersion: disposition.frameworkVersion, items: [disposition] });
    }
  }

  const results: FrameworkComplianceResult[] = [];
  for (const [frameworkKey, { frameworkVersion, items }] of byFramework) {
    const approvedCount = items.filter((item) => item.disposition === "approved").length;
    const notApprovedCount = items.filter((item) => item.disposition === "not_approved").length;
    const notApplicableCount = items.filter((item) => item.disposition === "not_applicable").length;
    const applicableCount = items.length - notApplicableCount;

    const rawPercentage = applicableCount > 0 ? (approvedCount / applicableCount) * 100 : null;
    const displayPercentage = rawPercentage === null ? "N/A (no applicable controls)" : `${Math.round(rawPercentage * 100) / 100}%`;
    const formula =
      applicableCount > 0
        ? `${approvedCount} approved / ${applicableCount} applicable × 100 = ${displayPercentage}`
        : `No applicable controls for ${frameworkKey} (all ${notApplicableCount} marked not applicable).`;

    results.push({
      frameworkKey,
      frameworkVersion,
      applicableCount,
      approvedCount,
      notApprovedCount,
      notApplicableCount,
      rawPercentage,
      displayPercentage,
      formula,
      citationId: `FRAMEWORK_COMPLIANCE:${frameworkKey}`
    });
  }

  return results.sort((left, right) => left.frameworkKey.localeCompare(right.frameworkKey));
}
