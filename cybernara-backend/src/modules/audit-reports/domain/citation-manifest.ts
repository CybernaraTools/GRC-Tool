import type { ClosureSnapshotPayload } from "../../closure-snapshot/public.js";
import type { ComplianceEngineResult } from "./compliance-engine.js";

// The closed set of citation IDs valid for one generation run, built BEFORE
// the AI is ever called (feature spec: "Build the full citation manifest...
// BEFORE calling the model"). This is also the single source of truth the
// Rule #2 groundedness validator's citation-existence check diffs against —
// deliberately the same object, not a separate re-derivation, so the two
// checks cannot drift out of sync with each other.

export type CitationRecordType =
  | "assessment_item"
  | "question"
  | "answer"
  | "evidence"
  | "finding"
  | "risk"
  | "remediation"
  | "risk_acceptance"
  | "reviewer_decision"
  | "control"
  | "harmonized_control"
  | "framework_compliance"
  | "control_disposition";

export interface CitationRecord {
  id: string;
  type: CitationRecordType;
  summary: string;
  // The full underlying record, used by the groundedness validator's
  // citation-content consistency check (e.g. does a statement claiming
  // "high severity" for [FINDING:FND-123] match FND-123's actual stored
  // severity field).
  data: Record<string, unknown>;
  integrityVerified: boolean;
}

export type CitationManifest = Map<string, CitationRecord>;

export function buildCitationManifest(
  snapshot: ClosureSnapshotPayload,
  engineResult: ComplianceEngineResult
): CitationManifest {
  const manifest: CitationManifest = new Map();

  for (const item of snapshot.items) {
    const controlCitationId = `CONTROL:${item.controlRef.frameworkKey}:${item.controlRef.controlId}`;
    manifest.set(controlCitationId, {
      id: controlCitationId,
      type: "control",
      summary: `${item.controlRef.frameworkKey} control ${item.controlRef.controlId}`,
      data: { ...item.controlRef, itemId: item.itemId, status: item.status },
      integrityVerified: true
    });

    const harmonizedCitationId = `HARM:${item.controlRef.harmonizedControlId}`;
    if (!manifest.has(harmonizedCitationId)) {
      manifest.set(harmonizedCitationId, {
        id: harmonizedCitationId,
        type: "harmonized_control",
        summary: `Harmonized control ${item.controlRef.harmonizedControlId}`,
        data: { harmonizedControlId: item.controlRef.harmonizedControlId },
        integrityVerified: true
      });
    }

    const itemCitationId = `ITEM:${item.itemId}`;
    manifest.set(itemCitationId, {
      id: itemCitationId,
      type: "assessment_item",
      summary: `Assessment item ${item.itemId} (${item.controlRef.controlId})`,
      data: { itemId: item.itemId, status: item.status, applicability: item.applicability },
      integrityVerified: true
    });

    if (item.answerText !== null) {
      const answerCitationId = `ANSWER:${item.itemId}`;
      manifest.set(answerCitationId, {
        id: answerCitationId,
        type: "answer",
        summary: `Final submitted answer for item ${item.itemId}`,
        data: { itemId: item.itemId, answerText: item.answerText },
        integrityVerified: true
      });
    }
  }

  for (const finding of snapshot.findings) {
    const citationId = `FINDING:${finding.id}`;
    manifest.set(citationId, {
      id: citationId,
      type: "finding",
      summary: `Finding ${finding.id} (${finding.severity} severity)`,
      data: finding as unknown as Record<string, unknown>,
      integrityVerified: true
    });
  }

  for (const task of snapshot.remediationTasks) {
    const citationId = `REMEDIATION:${task.id}`;
    manifest.set(citationId, {
      id: citationId,
      type: "remediation",
      summary: `Remediation task ${task.id} for finding ${task.findingId} (status: ${task.status})`,
      data: task as unknown as Record<string, unknown>,
      integrityVerified: true
    });
    for (const review of task.reviews) {
      const reviewCitationId = `REVIEWER_DECISION:${review.id}`;
      manifest.set(reviewCitationId, {
        id: reviewCitationId,
        type: "reviewer_decision",
        summary: `Remediation review ${review.id} (${review.decision})`,
        data: review as unknown as Record<string, unknown>,
        integrityVerified: true
      });
    }
  }

  for (const risk of snapshot.risks) {
    const citationId = `RISK:${risk.id}`;
    manifest.set(citationId, {
      id: citationId,
      type: "risk",
      summary: `Risk ${risk.id} (${risk.title})`,
      data: risk as unknown as Record<string, unknown>,
      integrityVerified: true
    });
  }

  for (const acceptance of snapshot.riskAcceptances) {
    const citationId = `RISK_ACCEPTANCE:${acceptance.id}`;
    manifest.set(citationId, {
      id: citationId,
      type: "risk_acceptance",
      summary: `Risk acceptance ${acceptance.id} for finding ${acceptance.findingId}`,
      data: acceptance as unknown as Record<string, unknown>,
      integrityVerified: true
    });
  }

  for (const evidence of snapshot.evidence) {
    const citationId = `EVIDENCE:${evidence.evidenceId}`;
    manifest.set(citationId, {
      id: citationId,
      type: "evidence",
      summary: `Evidence file ${evidence.fileName}`,
      data: evidence as unknown as Record<string, unknown>,
      // Set true here at reference-only capture time; the report-generation
      // flow re-verifies actual content hash via the governed evidence
      // service and OVERWRITES this flag per-citation with the real
      // integrity result before the manifest is handed to the AI — see
      // ReportContextService.
      integrityVerified: true
    });
  }

  for (const signoff of snapshot.signoffs) {
    const citationId = `SIGNOFF:${signoff.id}`;
    manifest.set(citationId, {
      id: citationId,
      type: "reviewer_decision",
      summary: `Assessment signoff ${signoff.id} (${signoff.scopeType}, ${signoff.decision})`,
      data: signoff as unknown as Record<string, unknown>,
      integrityVerified: true
    });
  }

  for (const disposition of engineResult.dispositions) {
    const citationId = `DISPOSITION:${disposition.itemId}`;
    manifest.set(citationId, {
      id: citationId,
      type: "control_disposition",
      summary: `Deterministic disposition for control ${disposition.controlId}: ${disposition.disposition}`,
      data: disposition as unknown as Record<string, unknown>,
      integrityVerified: true
    });
  }

  for (const framework of engineResult.frameworks) {
    manifest.set(framework.citationId, {
      id: framework.citationId,
      type: "framework_compliance",
      summary: `${framework.frameworkKey} compliance: ${framework.displayPercentage}`,
      data: framework as unknown as Record<string, unknown>,
      integrityVerified: true
    });
  }

  return manifest;
}

export function citationManifestToPromptList(manifest: CitationManifest): Array<{ id: string; type: string; summary: string }> {
  return [...manifest.values()]
    .map((record) => ({ id: record.id, type: record.type, summary: record.summary }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function citationManifestToJson(manifest: CitationManifest): Record<string, { type: string; summary: string; integrityVerified: boolean }> {
  const json: Record<string, { type: string; summary: string; integrityVerified: boolean }> = {};
  for (const record of manifest.values()) {
    json[record.id] = { type: record.type, summary: record.summary, integrityVerified: record.integrityVerified };
  }
  return json;
}
