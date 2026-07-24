import type { ClosureSnapshotPayload } from "../../closure-snapshot/public.js";
import type { CitationManifest } from "./citation-manifest.js";
import type { ComplianceEngineResult } from "./compliance-engine.js";
import { validateNarrativeSchema, type NarrativeStatement } from "./narrative-schema.js";

// The Rule #2 Groundedness Validator. Pure function — no DB/network access —
// so it is independently unit-testable without mocks, matching this
// codebase's domain/ purity convention (risk.ts, assessment.ts, hardening.ts).
//
// Design note on citation-content consistency (check 3): true open-ended
// semantic entailment ("does this sentence's full meaning match this
// record") is not something a deterministic function can do — it is a
// research problem, not an engineering one. What IS implementable
// deterministically, and what this validator actually does, is: scan each
// statement's text for a fixed vocabulary of checkable claim keywords
// (severity level, status/disposition words, applicability) and, where the
// text asserts one of those specific values about a specifically cited
// record, verify it against that record's actual stored field — this is a
// genuine, narrow, negative check (catch a stated contradiction), not a
// positive proof that every word of a sentence is independently verifiable.
// A statement that cites a real record and asserts nothing from the
// checkable vocabulary passes this specific check (there is nothing false in
// it to catch); it can still fail overall for lacking a citation (check 1)
// or citing something nonexistent (check 2) or misstating a number (check 4).

export type ValidationCheck = "schema" | "citation_existence" | "citation_consistency" | "numeric_cross_check" | "evidence_integrity" | "coverage";

export interface StatementIssue {
  section: string;
  index: number;
  check: ValidationCheck;
  detail: string;
}

export interface ValidationAttemptResult {
  attemptedAt: string;
  passed: boolean;
  groundednessScore: number;
  totalFactInferenceStatements: number;
  verifiedFactInferenceStatements: number;
  issues: StatementIssue[];
}

const SEVERITY_KEYWORDS = ["low", "medium", "high", "critical"] as const;
const REMEDIATION_STATUS_KEYWORDS = ["open", "in_progress", "in progress", "verified", "risk_accepted", "risk accepted"] as const;
const RISK_STATUS_KEYWORDS = ["identified", "assessed", "treatment_planned", "treatment planned", "monitoring", "closed"] as const;
const DISPOSITION_KEYWORDS = ["satisfied", "remediation_verified", "remediation verified", "accepted_residual_risk", "accepted residual risk", "unresolved", "not_applicable", "not applicable"] as const;

const SPECULATIVE_RISK_TERMS = [
  "proactive approach",
  "proactive risk",
  "proactive",
  "managed effectively",
  "effectively managed",
  "strategic decision",
  "opted to accept",
  "opted not to",
  "opting not to",
  "accepted instead of",
  "instead of pursuing",
  "instead of remediating",
  "remediation was abandoned",
  "abandoned remediation",
  "without immediate remediation",
  "decision to manage",
  "acknowledged the potential impact",
  "is concerning",
  "concerning",
  "significant gap in compliance efforts",
  "has not yet implemented",
  "need for immediate attention",
  "must address",
  "should address",
  "must implement",
  "should implement"
];

const EVIDENCE_CONTENT_CONCLUSION_TERMS = [
  "did not demonstrate compliance",
  "failed to demonstrate compliance",
  "did not contribute to compliance",
  "proved compliance",
  "demonstrated compliance",
  "evidence showed",
  "evidence proves",
  "evidence confirms",
  "evidence was insufficient"
];

const COMMENTARY_ORGANIZATIONAL_FACT_TERMS = [
  "the organization opted",
  "the organization has not",
  "the organization decided",
  "opted to accept",
  "opted not to",
  "instead of pursuing remediation",
  "instead of remediating",
  "abandoned remediation",
  "was not remediated",
  "were not remediated",
  "failed to implement",
  "did not implement",
  "was not implemented",
  "were not implemented",
  "did not contribute to compliance",
  "did not demonstrate compliance",
  "unresolved issue",
  "unresolved finding"
];

function detectCommentaryBypass(text: string): string | null {
  const lowerText = text.toLowerCase();
  for (const term of COMMENTARY_ORGANIZATIONAL_FACT_TERMS) {
    if (lowerText.includes(term)) {
      return `Statement classified as 'commentary' asserts organizational facts or past actions/decisions ('${term}'). Factual assertions must be classified as 'fact' or 'inference' and cite a valid grounded source.`;
    }
  }
  return null;
}

export function validateNarrativeGroundedness(input: {
  rawPayload: unknown;
  snapshot: ClosureSnapshotPayload;
  citationManifest: CitationManifest;
  engineResult: ComplianceEngineResult;
  now?: Date;
}): ValidationAttemptResult {
  const attemptedAt = (input.now ?? new Date()).toISOString();
  const schemaResult = validateNarrativeSchema(input.rawPayload);
  if (!schemaResult.success) {
    return {
      attemptedAt,
      passed: false,
      groundednessScore: 0,
      totalFactInferenceStatements: 0,
      verifiedFactInferenceStatements: 0,
      issues: schemaResult.errors.map((detail) => ({ section: "schema", index: -1, check: "schema" as const, detail }))
    };
  }

  const payload = schemaResult.data;
  const issues: StatementIssue[] = [];
  let totalFactInference = 0;
  let verifiedFactInference = 0;

  const totals = {
    finding_count: input.snapshot.findings.length,
    risk_count: input.snapshot.risks.length,
    evidence_count: input.snapshot.evidence.length,
    control_count: input.snapshot.items.length,
    applicable_control_count: input.engineResult.frameworks.reduce((sum, framework) => sum + framework.applicableCount, 0)
  };

  for (const [section, statements] of Object.entries(payload) as Array<[string, NarrativeStatement[]]>) {
    statements.forEach((statement, index) => {
      if (statement.claimType === "commentary") {
        const commentaryBypass = detectCommentaryBypass(statement.text);
        if (commentaryBypass) {
          totalFactInference += 1;
          issues.push({
            section,
            index,
            check: "citation_consistency",
            detail: commentaryBypass
          });
        }
        return;
      }
      totalFactInference += 1;
      let statementValid = true;

      // Check 2: citation existence — every cited ID must be in the manifest
      // built for THIS generation run.
      const unknownCitations = statement.citations.filter((citationId) => !input.citationManifest.has(citationId));
      if (unknownCitations.length > 0) {
        statementValid = false;
        issues.push({
          section,
          index,
          check: "citation_existence",
          detail: `Cites unknown citation ID(s) not present in this run's manifest: ${unknownCitations.join(", ")}`
        });
      }

      // Check 3: citation-content consistency (deterministic keyword checks only — see module doc).
      const resolvedCitations = statement.citations
        .map((citationId) => input.citationManifest.get(citationId))
        .filter((record): record is NonNullable<typeof record> => Boolean(record));
      for (const citation of resolvedCitations) {
        const mismatch = detectDeterministicContradiction(statement.text, citation.type, citation.data);
        if (mismatch) {
          statementValid = false;
          issues.push({
            section,
            index,
            check: "citation_consistency",
            detail: `Statement asserts '${mismatch.assertedValue}' but citation ${citation.id} actually has ${mismatch.field}='${mismatch.actualValue}'.`
          });
        }
      }

      // Check 3b: Global speculative / subjective language check
      const lowerText = statement.text.toLowerCase();
      for (const term of SPECULATIVE_RISK_TERMS) {
        if (lowerText.includes(term)) {
          const supportedInRationale = resolvedCitations.some(
            (c) => typeof c.data?.rationale === "string" && c.data.rationale.toLowerCase().includes(term)
          );
          if (!supportedInRationale) {
            statementValid = false;
            issues.push({
              section,
              index,
              check: "citation_consistency",
              detail: `Statement asserts speculative, subjective, or unsupported interpretation ('${term}'). Statements must state objective audit facts without speculative characterization.`
            });
            break;
          }
        }
      }

      // Check 4: numeric cross-check — every numeric claim must exactly match the deterministic engine's own stored output.
      for (const numericClaim of statement.numericClaims) {
        const mismatch = detectNumericMismatch(numericClaim, input.engineResult, totals);
        if (mismatch) {
          statementValid = false;
          issues.push({ section, index, check: "numeric_cross_check", detail: mismatch });
        }
      }

      // Check 5 (evidence integrity gate): a fact statement whose ONLY
      // citation(s) are unverified-integrity evidence is rejected unless
      // corroborated by another, integrity-verified citation.
      if (statement.claimType === "fact" && resolvedCitations.length > 0) {
        const allEvidence = resolvedCitations.every((citation) => citation.type === "evidence");
        const allUnverified = resolvedCitations.every((citation) => !citation.integrityVerified);
        if (allEvidence && allUnverified) {
          statementValid = false;
          issues.push({
            section,
            index,
            check: "evidence_integrity",
            detail: "Statement rests solely on evidence with unverified integrity (hash mismatch) and has no corroborating verified citation."
          });
        }
      }

      if (statement.citations.length === 0) {
        // Schema validation already rejects this for fact/inference, but
        // guard here too in case a future schema relaxation slips through.
        statementValid = false;
      }

      if (statementValid) {
        verifiedFactInference += 1;
      }
    });
  }

  const groundednessScore = totalFactInference === 0 ? 100 : Math.round((verifiedFactInference / totalFactInference) * 10000) / 100;
  const passed = issues.length === 0 && groundednessScore === 100;

  if (!passed && issues.length === 0) {
    issues.push({
      section: "coverage",
      index: -1,
      check: "coverage",
      detail: `Groundedness score ${groundednessScore}% did not reach the required 100%.`
    });
  }

  return {
    attemptedAt,
    passed,
    groundednessScore,
    totalFactInferenceStatements: totalFactInference,
    verifiedFactInferenceStatements: verifiedFactInference,
    issues
  };
}

function detectDeterministicContradiction(
  text: string,
  citationType: string,
  data: Record<string, unknown>
): { field: string; assertedValue: string; actualValue: string } | null {
  const lowerText = text.toLowerCase();

  if (citationType === "risk_acceptance" || citationType === "risk" || citationType === "control_disposition") {
    const storedRationale = typeof data.rationale === "string" ? data.rationale.toLowerCase() : "";
    for (const term of SPECULATIVE_RISK_TERMS) {
      if (lowerText.includes(term) && !storedRationale.includes(term)) {
        return {
          field: "risk_acceptance_interpretation",
          assertedValue: term,
          actualValue: "unsupported speculation (acceptance record establishes only recorded rationale, dates, and approver)"
        };
      }
    }
  }

  if (citationType === "finding" || citationType === "control_disposition" || citationType === "risk_acceptance") {
    if (data.disposition === "accepted_residual_risk" || data.status === "risk_accepted" || citationType === "risk_acceptance") {
      const UNRESOLVED_TERMS = ["unresolved issue", "unresolved finding", "unresolved gap", "remains unresolved", "unresolved"];
      for (const term of UNRESOLVED_TERMS) {
        if (containsKeyword(lowerText, term)) {
          return {
            field: "disposition_contradiction",
            assertedValue: term,
            actualValue: "accepted_residual_risk (accepted risk items MUST NOT be described as unresolved)"
          };
        }
      }
    }
  }

  if (citationType === "evidence") {
    const hasExtractedText = typeof data.extractedText === "string" && data.extractedText.length > 0;
    if (!hasExtractedText) {
      for (const term of EVIDENCE_CONTENT_CONCLUSION_TERMS) {
        if (lowerText.includes(term)) {
          return {
            field: "evidence_content_conclusion",
            assertedValue: term,
            actualValue: "unsupported conclusion (evidence citation contains metadata/linkage only, not extracted content)"
          };
        }
      }
    }
  }

  if ((citationType === "finding" || citationType === "control_disposition") && typeof data.severity === "string") {
    const asserted = SEVERITY_KEYWORDS.find((keyword) => containsKeyword(lowerText, `${keyword} severity`) || containsKeyword(lowerText, `severity: ${keyword}`) || containsKeyword(lowerText, `severity of ${keyword}`));
    if (asserted && asserted !== data.severity) {
      return { field: "severity", assertedValue: asserted, actualValue: String(data.severity) };
    }
  }

  if (citationType === "remediation" && typeof data.status === "string") {
    const asserted = REMEDIATION_STATUS_KEYWORDS.find((keyword) => containsKeyword(lowerText, keyword));
    if (asserted) {
      const normalizedAsserted = asserted.replace(" ", "_");
      const normalizedActual = String(data.status).replace(" ", "_");
      if (normalizedAsserted !== normalizedActual) {
        return { field: "status", assertedValue: asserted, actualValue: String(data.status) };
      }
    }
  }

  if (citationType === "risk" && typeof data.status === "string") {
    const asserted = RISK_STATUS_KEYWORDS.find((keyword) => containsKeyword(lowerText, keyword));
    if (asserted) {
      const normalizedAsserted = asserted.replace(" ", "_");
      const normalizedActual = String(data.status).replace(" ", "_");
      if (normalizedAsserted !== normalizedActual) {
        return { field: "status", assertedValue: asserted, actualValue: String(data.status) };
      }
    }
  }

  if (citationType === "control_disposition" && typeof data.disposition === "string") {
    const asserted = DISPOSITION_KEYWORDS.find((keyword) => containsKeyword(lowerText, keyword));
    if (asserted) {
      const normalizedAsserted = asserted.replace(" ", "_");
      const normalizedActual = String(data.disposition).replace(" ", "_");
      if (normalizedAsserted !== normalizedActual) {
        return { field: "disposition", assertedValue: asserted, actualValue: String(data.disposition) };
      }
    }
  }

  return null;
}

function containsKeyword(lowerText: string, keyword: string): boolean {
  return new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lowerText);
}

function detectNumericMismatch(
  claim: { metric: string; frameworkKey?: string | null; statedValue: number },
  engineResult: ComplianceEngineResult,
  totals: { finding_count: number; risk_count: number; evidence_count: number; control_count: number }
): string | null {
  if (claim.metric === "framework_compliance_percentage") {
    if (!claim.frameworkKey) {
      return "framework_compliance_percentage claim missing frameworkKey.";
    }
    const framework = engineResult.frameworks.find((entry) => entry.frameworkKey === claim.frameworkKey);
    if (!framework) {
      return `Numeric claim references unknown framework '${claim.frameworkKey}'.`;
    }
    if (framework.rawPercentage === null) {
      return `Numeric claim states ${claim.statedValue}% for '${claim.frameworkKey}' but the engine has no applicable controls (N/A) for that framework. REMEDY: Remove the framework_compliance_percentage numericClaim for '${claim.frameworkKey}' completely from this statement and state in prose that '${claim.frameworkKey}' has zero applicable controls.`;
    }
    const rounded = Math.round(framework.rawPercentage * 100) / 100;
    if (Math.abs(rounded - claim.statedValue) > 0.001) {
      return `Numeric claim states ${claim.statedValue}% for '${claim.frameworkKey}' but the deterministic engine's displayPercentage is ${rounded}%.`;
    }
    return null;
  }

  const actual = totals[claim.metric as keyof typeof totals];
  if (actual === undefined) {
    return `Unknown numeric metric '${claim.metric}'.`;
  }
  if (actual !== claim.statedValue) {
    return `Numeric claim states ${claim.metric}=${claim.statedValue} but the deterministic count is ${actual}.`;
  }
  return null;
}

export function summarizeIssuesForRetry(issues: StatementIssue[]): string {
  if (issues.length === 0) {
    return "";
  }
  return issues
    .map((issue) => `- [${issue.section}#${issue.index}] (${issue.check}) ${issue.detail}`)
    .join("\n");
}
