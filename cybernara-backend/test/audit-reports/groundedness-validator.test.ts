import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { runComplianceEngine } from "../../src/modules/audit-reports/domain/compliance-engine.js";
import { buildCitationManifest } from "../../src/modules/audit-reports/domain/citation-manifest.js";
import { validateNarrativeGroundedness } from "../../src/modules/audit-reports/domain/groundedness-validator.js";
import { emptyNarrativePayload } from "../../src/modules/audit-reports/domain/narrative-schema.js";
import { buildClosureSnapshotPayload } from "../../src/modules/closure-snapshot/domain/closure-snapshot.js";
import type { PinnedControlRef, AssessmentItem } from "../../src/modules/assessment/public.js";

const actorId = randomUUID();

function controlRef(): PinnedControlRef {
  return {
    frameworkKey: "SOC2",
    frameworkVersion: "v1",
    mappingVersion: "m1",
    controlId: "CC6.1",
    harmonizedControlId: "HARM-1",
    questionVersion: "curated-v1"
  };
}

function baseItem(): AssessmentItem {
  return {
    id: randomUUID(),
    controlRef: controlRef(),
    status: "approved",
    ownerId: actorId,
    answerText: "Evidence provided.",
    evidenceIds: [],
    applicability: { applicable: true, rationale: "Applies", approvedBy: actorId, approvedAt: new Date() }
  };
}

function buildContext(overrides: { withUnverifiedEvidence?: boolean } = {}) {
  const item = baseItem();
  const findingId = randomUUID();
  const evidenceId = randomUUID();
  const payload = buildClosureSnapshotPayload({
    assessment: {
      id: randomUUID(),
      scopeName: "Groundedness Test Assessment",
      status: "closed",
      controlSnapshotVersion: "v1",
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-12-31"),
      createdBy: actorId,
      createdAt: new Date("2026-01-01")
    },
    items: [item],
    findings: [
      { id: findingId, assessmentItemId: item.id, testResultId: null, severity: "high", impact: null, likelihood: null, ownerId: null, dueAt: null, description: "Access review gap", createdAt: new Date().toISOString() }
    ],
    remediationTasks: [],
    risks: [],
    riskAcceptances: [],
    evidence: [
      {
        evidenceId,
        evidenceVersionId: randomUUID(),
        fileName: "policy.pdf",
        mimeType: "application/pdf",
        sha256: "a".repeat(64),
        state: "committed",
        uploadedBy: actorId,
        uploadedAt: new Date().toISOString(),
        linkedTargetType: "assessment_item",
        linkedTargetId: item.id
      }
    ],
    signoffs: [],
    reconstructed: false
  });
  const engineResult = runComplianceEngine(payload);
  const manifest = buildCitationManifest(payload, engineResult);
  if (overrides.withUnverifiedEvidence) {
    const evidenceCitation = manifest.get(`EVIDENCE:${evidenceId}`);
    if (evidenceCitation) {
      evidenceCitation.integrityVerified = false;
    }
  }
  return { payload, engineResult, manifest, findingId, evidenceId, item };
}

function payloadWith(sectionStatements: Record<string, unknown[]>) {
  return { ...emptyNarrativePayload(), ...sectionStatements };
}

describe("Rule #2 Groundedness Validator", () => {
  it("test 31: rejects a fact statement citing a plausible-looking but nonexistent citation ID", () => {
    const { manifest, payload, engineResult } = buildContext();
    const raw = payloadWith({
      executiveSummary: [
        { text: "Control CC6.1 is satisfied.", citations: ["FINDING:FND-99999999-does-not-exist"], claimType: "fact", numericClaims: [] }
      ]
    });
    const result = validateNarrativeGroundedness({ rawPayload: raw, snapshot: payload, citationManifest: manifest, engineResult });
    expect(result.passed).toBe(false);
    expect(result.issues.some((issue) => issue.check === "citation_existence")).toBe(true);
  });

  it("test 32: manifest never contains a citation ID belonging to another tenant/assessment (built exclusively from this assessment's own snapshot)", () => {
    const { manifest, findingId } = buildContext();
    // The manifest is constructed purely from this snapshot's own records —
    // assert no foreign-looking ID sneaks in, and that a fabricated
    // "other tenant" finding ID is correctly absent.
    expect(manifest.has(`FINDING:${findingId}`)).toBe(true);
    expect(manifest.has(`FINDING:${randomUUID()}`)).toBe(false);
  });

  it("test 33: a fact statement with zero citations fails schema validation", () => {
    const { manifest, payload, engineResult } = buildContext();
    const raw = payloadWith({
      executiveSummary: [{ text: "The assessment is fully compliant.", citations: [], claimType: "fact", numericClaims: [] }]
    });
    const result = validateNarrativeGroundedness({ rawPayload: raw, snapshot: payload, citationManifest: manifest, engineResult });
    expect(result.passed).toBe(false);
    expect(result.issues.some((issue) => issue.check === "schema")).toBe(true);
  });

  it("an inference statement with zero citations also fails schema validation", () => {
    const { manifest, payload, engineResult } = buildContext();
    const raw = payloadWith({
      remainingGaps: [{ text: "Taken together, this suggests a process gap.", citations: [], claimType: "inference", numericClaims: [] }]
    });
    const result = validateNarrativeGroundedness({ rawPayload: raw, snapshot: payload, citationManifest: manifest, engineResult });
    expect(result.passed).toBe(false);
  });

  it("test 34: a statement contradicting the cited finding's actual stored severity is rejected", () => {
    const { manifest, payload, engineResult, findingId } = buildContext();
    const raw = payloadWith({
      materialFindings: [
        { text: "This is a low severity finding requiring no urgent action.", citations: [`FINDING:${findingId}`], claimType: "fact", numericClaims: [] }
      ]
    });
    const result = validateNarrativeGroundedness({ rawPayload: raw, snapshot: payload, citationManifest: manifest, engineResult });
    expect(result.passed).toBe(false);
    expect(result.issues.some((issue) => issue.check === "citation_consistency")).toBe(true);
  });

  it("a statement matching the cited finding's actual severity passes the consistency check", () => {
    const { manifest, payload, engineResult, findingId } = buildContext();
    const raw = payloadWith({
      materialFindings: [
        { text: "This is a high severity finding requiring prompt remediation.", citations: [`FINDING:${findingId}`], claimType: "fact", numericClaims: [] }
      ]
    });
    const result = validateNarrativeGroundedness({ rawPayload: raw, snapshot: payload, citationManifest: manifest, engineResult });
    expect(result.passed).toBe(true);
    expect(result.groundednessScore).toBe(100);
  });

  it("test 35: a compliance percentage that does not match the deterministic engine's displayPercentage is rejected", () => {
    const { manifest, payload, engineResult } = buildContext();
    const framework = engineResult.frameworks[0]!;
    const wrongValue = (framework.rawPercentage ?? 0) + 5;
    const raw = payloadWith({
      frameworkComplianceNarrative: [
        {
          text: `${framework.frameworkKey} compliance stands at ${wrongValue}%.`,
          citations: [framework.citationId],
          claimType: "fact",
          numericClaims: [{ metric: "framework_compliance_percentage", frameworkKey: framework.frameworkKey, statedValue: wrongValue }]
        }
      ]
    });
    const result = validateNarrativeGroundedness({ rawPayload: raw, snapshot: payload, citationManifest: manifest, engineResult });
    expect(result.passed).toBe(false);
    expect(result.issues.some((issue) => issue.check === "numeric_cross_check")).toBe(true);
  });

  it("test 36: a finding/risk/control count that does not match the deterministic count is rejected", () => {
    const { manifest, payload, engineResult } = buildContext();
    const raw = payloadWith({
      materialFindings: [
        {
          text: "There are 7 findings in this assessment.",
          citations: [engineResult.dispositions[0]!.citationId],
          claimType: "fact",
          numericClaims: [{ metric: "finding_count", statedValue: 7 }]
        }
      ]
    });
    const result = validateNarrativeGroundedness({ rawPayload: raw, snapshot: payload, citationManifest: manifest, engineResult });
    expect(result.passed).toBe(false);
    expect(result.issues.some((issue) => issue.check === "numeric_cross_check")).toBe(true);
  });

  it("test 37: a commentary statement with no citation is accepted and does not count against coverage", () => {
    const { manifest, payload, engineResult, findingId } = buildContext();
    const raw = payloadWith({
      auditorNotes: [
        { text: "In the auditor's professional judgment, this pattern suggests a broader process gap worth monitoring.", citations: [], claimType: "commentary", numericClaims: [] },
        { text: "This is a high severity finding requiring prompt remediation.", citations: [`FINDING:${findingId}`], claimType: "fact", numericClaims: [] }
      ]
    });
    const result = validateNarrativeGroundedness({ rawPayload: raw, snapshot: payload, citationManifest: manifest, engineResult });
    expect(result.passed).toBe(true);
    expect(result.totalFactInferenceStatements).toBe(1);
  });

  it("test 38: evidence with unverified integrity cannot be the sole citation supporting a fact statement", () => {
    const { manifest, payload, engineResult, evidenceId } = buildContext({ withUnverifiedEvidence: true });
    const raw = payloadWith({
      evidenceAnalysis: [
        { text: "The uploaded policy document confirms the control is fully implemented.", citations: [`EVIDENCE:${evidenceId}`], claimType: "fact", numericClaims: [] }
      ]
    });
    const result = validateNarrativeGroundedness({ rawPayload: raw, snapshot: payload, citationManifest: manifest, engineResult });
    expect(result.passed).toBe(false);
    expect(result.issues.some((issue) => issue.check === "evidence_integrity")).toBe(true);
  });

  it("evidence with unverified integrity IS acceptable when corroborated by another verified citation", () => {
    const { manifest, payload, engineResult, evidenceId, findingId } = buildContext({ withUnverifiedEvidence: true });
    const raw = payloadWith({
      evidenceAnalysis: [
        {
          text: "The uploaded policy document is high severity and confirms the control gap.",
          citations: [`EVIDENCE:${evidenceId}`, `FINDING:${findingId}`],
          claimType: "fact",
          numericClaims: []
        }
      ]
    });
    const result = validateNarrativeGroundedness({ rawPayload: raw, snapshot: payload, citationManifest: manifest, engineResult });
    expect(result.passed).toBe(true);
  });

  it("coverage score must equal exactly 100, not merely a high number, to pass", () => {
    const { manifest, payload, engineResult, findingId } = buildContext();
    const raw = payloadWith({
      materialFindings: [
        { text: "This is a high severity finding requiring prompt remediation.", citations: [`FINDING:${findingId}`], claimType: "fact", numericClaims: [] },
        { text: "This finding requires no action.", citations: [], claimType: "fact", numericClaims: [] }
      ]
    });
    const result = validateNarrativeGroundedness({ rawPayload: raw, snapshot: payload, citationManifest: manifest, engineResult });
    expect(result.groundednessScore).toBeLessThan(100);
    expect(result.passed).toBe(false);
  });
});
