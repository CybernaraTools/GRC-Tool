import type { ClosureSnapshotPayload } from "../../closure-snapshot/public.js";

// Deterministic compliance engine. Pure function, no DB/AI access — every
// number a generated report can ever state traces back to this module's
// output, and the Rule #2 groundedness validator diffs AI narrative claims
// against exactly these values (never a re-derivation performed elsewhere,
// per the feature spec's citation-manifest single-source-of-truth
// requirement).

export type ControlDisposition =
  | "satisfied"
  | "remediation_verified"
  | "accepted_residual_risk"
  | "unresolved"
  | "not_applicable";

export interface ControlDispositionResult {
  itemId: string;
  controlId: string;
  harmonizedControlId: string;
  frameworkKey: string;
  frameworkVersion: string;
  disposition: ControlDisposition;
  reason: string;
  findingIds: string[];
  citationId: string;
}

export interface FrameworkComplianceResult {
  frameworkKey: string;
  frameworkVersion: string;
  applicableCount: number;
  satisfiedCount: number;
  remediatedCount: number;
  acceptedRiskCount: number;
  unresolvedCount: number;
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

type FindingResolution = "remediation_verified" | "accepted_residual_risk" | "unresolved";

const DISPOSITION_PRIORITY: Record<FindingResolution, number> = {
  unresolved: 3,
  accepted_residual_risk: 2,
  remediation_verified: 1
};

export function runComplianceEngine(snapshot: ClosureSnapshotPayload): ComplianceEngineResult {
  const findingsByItem = new Map<string, ClosureSnapshotPayload["findings"]>();
  for (const finding of snapshot.findings) {
    if (!finding.assessmentItemId) {
      continue;
    }
    const list = findingsByItem.get(finding.assessmentItemId) ?? [];
    list.push(finding);
    findingsByItem.set(finding.assessmentItemId, list);
  }

  const remediationByFinding = new Map<string, ClosureSnapshotPayload["remediationTasks"]>();
  for (const task of snapshot.remediationTasks) {
    const list = remediationByFinding.get(task.findingId) ?? [];
    list.push(task);
    remediationByFinding.set(task.findingId, list);
  }

  const activeAcceptanceByFinding = new Map<string, boolean>();
  for (const acceptance of snapshot.riskAcceptances) {
    if (acceptance.isActiveAtCapture) {
      activeAcceptanceByFinding.set(acceptance.findingId, true);
    }
  }

  const dispositions: ControlDispositionResult[] = snapshot.items.map((item) => {
    const citationId = `CONTROL:${item.controlRef.frameworkKey}:${item.controlRef.controlId}`;

    if (item.applicability && item.applicability.applicable === false) {
      return {
        itemId: item.itemId,
        controlId: item.controlRef.controlId,
        harmonizedControlId: item.controlRef.harmonizedControlId,
        frameworkKey: item.controlRef.frameworkKey,
        frameworkVersion: item.controlRef.frameworkVersion,
        disposition: "not_applicable",
        reason: "Control was formally marked not applicable.",
        findingIds: [],
        citationId
      };
    }

    if (item.status !== "approved") {
      return {
        itemId: item.itemId,
        controlId: item.controlRef.controlId,
        harmonizedControlId: item.controlRef.harmonizedControlId,
        frameworkKey: item.controlRef.frameworkKey,
        frameworkVersion: item.controlRef.frameworkVersion,
        disposition: "unresolved",
        reason: `Required review incomplete at closure: item status was '${item.status}', not 'approved'.`,
        findingIds: [],
        citationId
      };
    }

    const itemFindings = findingsByItem.get(item.itemId) ?? [];
    if (itemFindings.length === 0) {
      return {
        itemId: item.itemId,
        controlId: item.controlRef.controlId,
        harmonizedControlId: item.controlRef.harmonizedControlId,
        frameworkKey: item.controlRef.frameworkKey,
        frameworkVersion: item.controlRef.frameworkVersion,
        disposition: "satisfied",
        reason: "Approved control with no associated finding.",
        findingIds: [],
        citationId
      };
    }

    let worst: FindingResolution = "remediation_verified";
    for (const finding of itemFindings) {
      const resolution = resolveFinding(finding.id, remediationByFinding, activeAcceptanceByFinding);
      if (DISPOSITION_PRIORITY[resolution] > DISPOSITION_PRIORITY[worst]) {
        worst = resolution;
      }
    }

    const reasonByResolution: Record<FindingResolution, string> = {
      remediation_verified: "All associated findings had remediation completed and formally verified by an authorized reviewer.",
      accepted_residual_risk: "At least one associated finding's residual risk was formally accepted via an active, approved risk acceptance, and no finding remains unresolved.",
      unresolved: "At least one associated finding has no verified remediation and no active risk acceptance."
    };

    return {
      itemId: item.itemId,
      controlId: item.controlRef.controlId,
      harmonizedControlId: item.controlRef.harmonizedControlId,
      frameworkKey: item.controlRef.frameworkKey,
      frameworkVersion: item.controlRef.frameworkVersion,
      disposition: worst,
      reason: reasonByResolution[worst],
      findingIds: itemFindings.map((finding) => finding.id),
      citationId
    };
  });

  const frameworks = computeFrameworkCompliance(dispositions);
  return { dispositions, frameworks };
}

function resolveFinding(
  findingId: string,
  remediationByFinding: Map<string, ClosureSnapshotPayload["remediationTasks"]>,
  activeAcceptanceByFinding: Map<string, boolean>
): FindingResolution {
  const tasks = remediationByFinding.get(findingId) ?? [];
  const verified = tasks.some(
    (task) => task.status === "verified" && task.reviews.some((review) => review.decision === "approved")
  );
  if (verified) {
    return "remediation_verified";
  }
  if (activeAcceptanceByFinding.get(findingId)) {
    return "accepted_residual_risk";
  }
  return "unresolved";
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
    const satisfiedCount = items.filter((item) => item.disposition === "satisfied").length;
    const remediatedCount = items.filter((item) => item.disposition === "remediation_verified").length;
    const acceptedRiskCount = items.filter((item) => item.disposition === "accepted_residual_risk").length;
    const unresolvedCount = items.filter((item) => item.disposition === "unresolved").length;
    const notApplicableCount = items.filter((item) => item.disposition === "not_applicable").length;
    const applicableCount = items.length - notApplicableCount;
    const compliantCount = satisfiedCount + remediatedCount;

    const rawPercentage = applicableCount > 0 ? (compliantCount / applicableCount) * 100 : null;
    const displayPercentage = rawPercentage === null ? "N/A (no applicable controls)" : `${Math.round(rawPercentage * 100) / 100}%`;
    const formula =
      applicableCount > 0
        ? `(${satisfiedCount} satisfied + ${remediatedCount} remediation verified) / ${applicableCount} applicable × 100 = ${displayPercentage}`
        : `No applicable controls for ${frameworkKey} (all ${notApplicableCount} marked not applicable).`;

    results.push({
      frameworkKey,
      frameworkVersion,
      applicableCount,
      satisfiedCount,
      remediatedCount,
      acceptedRiskCount,
      unresolvedCount,
      notApplicableCount,
      rawPercentage,
      displayPercentage,
      formula,
      citationId: `FRAMEWORK_COMPLIANCE:${frameworkKey}`
    });
  }

  return results.sort((left, right) => left.frameworkKey.localeCompare(right.frameworkKey));
}
