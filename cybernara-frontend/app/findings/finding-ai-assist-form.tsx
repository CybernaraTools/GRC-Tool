"use client";

import { useMemo, useState } from "react";
import type {
  Finding,
  FindingAssistRecommendation,
  FindingAssistRequest,
  FindingImpact,
  FindingLikelihood,
  FindingSeverity
} from "../../src/lib/api/generated";

type FindingAiAssistFormProps = {
  title: string;
  intent: "createFinding" | "updateFinding";
  actionPath: string;
  assessmentId: string;
  itemId: string;
  ownerId: string;
  context: FindingAssistRequest;
  finding?: Finding;
};

export function FindingAiAssistForm({
  title,
  intent,
  actionPath,
  assessmentId,
  itemId,
  ownerId,
  context,
  finding
}: FindingAiAssistFormProps) {
  const idempotencyKey = useMemo(() => generateIdempotencyKey(intent), [intent]);
  const [severity, setSeverity] = useState<FindingSeverity>(finding?.severity ?? "high");
  const [impact, setImpact] = useState<FindingImpact>(finding?.impact ?? "high");
  const [likelihood, setLikelihood] = useState<FindingLikelihood>(finding?.likelihood ?? "likely");
  const [dueAt, setDueAt] = useState(dateInputValue(finding?.dueAt));
  const [description, setDescription] = useState(
    finding?.description ?? "Evidence or control operation is insufficient and requires remediation."
  );
  const [recommendation, setRecommendation] = useState<FindingAssistRecommendation | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function generateRecommendation() {
    setStatus("loading");
    setError(null);
    try {
      const response = await fetch("/findings/assist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(context)
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(typeof body?.error === "string" ? body.error : `AI finding assistance failed with ${response.status}.`);
      }
      const nextRecommendation = body as FindingAssistRecommendation;
      setRecommendation(nextRecommendation);
      if (nextRecommendation.findingDecision !== "no_finding") {
        setSeverity(nextRecommendation.severity);
        setImpact(nextRecommendation.impact);
        setLikelihood(nextRecommendation.likelihood);
        setDescription(nextRecommendation.description);
      }
      setStatus("idle");
    } catch (nextError) {
      setStatus("error");
      setError(nextError instanceof Error ? nextError.message : "AI finding assistance failed.");
    }
  }

  return (
    <>
      <form className="miniForm" action={actionPath} method="post" aria-label={title}>
        <input type="hidden" name="intent" value={intent} />
        <input type="hidden" name="assessmentId" value={assessmentId} />
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="ownerId" value={finding?.ownerId ?? ownerId} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        {finding ? <input type="hidden" name="findingId" value={finding.id} /> : null}
        <strong>{title}</strong>
        <div className="constraintNote">
          Review manually, or use AI to analyze the answer, frameworks, harmonized control, citations, and submitted evidence files.
        </div>
        <button type="button" onClick={generateRecommendation} disabled={status === "loading"}>
          {status === "loading" ? "Analyzing evidence..." : "Analyze with AI"}
        </button>
        {status === "error" && error ? <div className="constraintNote errorNote" role="alert">{error}</div> : null}
        <label>
          Severity
          <select name="severity" value={severity} onChange={(event) => setSeverity(event.target.value as FindingSeverity)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
        <label>
          Impact
          <select name="impact" value={impact} onChange={(event) => setImpact(event.target.value as FindingImpact)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
        <label>
          Likelihood
          <select name="likelihood" value={likelihood} onChange={(event) => setLikelihood(event.target.value as FindingLikelihood)}>
            <option value="rare">Rare</option>
            <option value="unlikely">Unlikely</option>
            <option value="possible">Possible</option>
            <option value="likely">Likely</option>
            <option value="almost_certain">Almost certain</option>
          </select>
        </label>
        <label>
          Due date
          <input type="date" name="dueAt" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
        </label>
        <label>
          Description
          <textarea name="description" required value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <button type="submit">{title}</button>
      </form>
      <FindingAiReport recommendation={recommendation} loading={status === "loading"} />
    </>
  );
}

function FindingAiReport({
  recommendation,
  loading
}: {
  recommendation: FindingAssistRecommendation | null;
  loading: boolean;
}) {
  return (
    <aside className="miniForm" aria-label="AI finding recommendation">
      <strong>AI finding report</strong>
      {loading ? <div className="constraintNote">Reading submitted evidence and assessment context.</div> : null}
      {!recommendation && !loading ? (
        <div className="constraintNote">
          No AI report generated yet. Manual finding creation still works without AI.
        </div>
      ) : null}
      {recommendation ? (
        <>
          <div className="tagList compactTagList" aria-label="Suggested finding parameters">
            <span>Decision: {decisionLabel(recommendation.findingDecision)}</span>
            <span>Severity: {recommendation.severity}</span>
            <span>Impact: {recommendation.impact}</span>
            <span>Likelihood: {recommendation.likelihood}</span>
            <span>Evidence: {coverageLabel(recommendation.evidenceCoverage)}</span>
            <span>{Math.round(recommendation.confidence * 100)}% confidence</span>
          </div>
          <section>
            <span className="label">Finding decision</span>
            <h3>{decisionLabel(recommendation.findingDecision)}</h3>
            <p>{recommendation.findingDecisionRationale}</p>
            {recommendation.findingDecision === "no_finding" ? (
              <div className="constraintNote">
                AI does not recommend creating a finding from this evidence package. A reviewer can still create one manually if they disagree.
              </div>
            ) : null}
            {recommendation.findingDecision === "needs_manual_review" ? (
              <div className="constraintNote">
                AI recommends human inspection before creating or updating the finding because the supplied evidence is ambiguous, partial, unreadable, or contradictory.
              </div>
            ) : null}
          </section>
          <section>
            <span className="label">Executive summary</span>
            <p>{recommendation.executiveSummary}</p>
          </section>
          <label>
            Suggested description
            <textarea readOnly value={recommendation.description} />
          </label>
          <section>
            <span className="label">Control conclusion</span>
            <p>{recommendation.controlConclusion}</p>
          </section>
          <section>
            <span className="label">Evidence summary</span>
            <p>{recommendation.evidenceSummary}</p>
            <div className="constraintNote">
              <strong>Coverage rationale:</strong> {recommendation.evidenceCoverageRationale}
            </div>
          </section>
          <section>
            <span className="label">Evidence-by-file analysis</span>
            {recommendation.evidenceAnalyses.length > 0 ? recommendation.evidenceAnalyses.map((analysis) => (
              <article className="constraintNote" key={analysis.fileName}>
                <div className="sectionHeader compactSectionHeader">
                  <strong>{analysis.fileName}</strong>
                  <span>{relevanceLabel(analysis.relevance)}</span>
                </div>
                <p><strong>Document purpose:</strong> {analysis.documentPurpose}</p>
                <p>{analysis.summary}</p>
                <FindingList title="Supports" values={analysis.supports} emptyText="No expected evidence mapped to this file." />
                <FindingList title="Expected evidence covered" values={analysis.expectedEvidenceCovered} emptyText="No expected evidence coverage returned." />
                <FindingList title="Key observations" values={analysis.keyObservations} emptyText="No key observations returned." />
                <FindingList title="Notable evidence text" values={analysis.notableExcerpts} emptyText="No notable evidence text returned." />
                <FindingList title="Contradictions" values={analysis.contradictions} emptyText="No contradictions identified." />
                <FindingList title="Limitations" values={analysis.limitations} emptyText="No limitations identified." />
                <FindingList title="Gaps" values={analysis.gaps} emptyText="No gaps identified for this file." />
                <p><strong>Reliability:</strong> {analysis.reliabilityAssessment}</p>
                <FindingList title="Follow-up" values={analysis.recommendedFollowUp} emptyText="No file-specific follow-up suggested." />
              </article>
            )) : <p>No file-level analysis returned.</p>}
          </section>
          <section>
            <span className="label">Rationale</span>
            <p>{recommendation.rationale}</p>
          </section>
          <section>
            <span className="label">Parameter rationale</span>
            <div className="constraintNote">
              <strong>Scoring method:</strong> {recommendation.parameterScoringMethod}
            </div>
            <div className="detailGrid">
              <article>
                <span className="label">Severity</span>
                <p>{recommendation.severityRationale}</p>
              </article>
              <article>
                <span className="label">Impact</span>
                <p>{recommendation.impactRationale}</p>
              </article>
              <article>
                <span className="label">Likelihood</span>
                <p>{recommendation.likelihoodRationale}</p>
              </article>
            </div>
          </section>
          <section>
            <span className="label">Confidence rationale</span>
            <p>{recommendation.confidenceRationale}</p>
          </section>
          <FindingList title="Missing evidence" values={recommendation.missingEvidence} emptyText="No specific missing evidence identified." />
          <FindingList title="Reviewer actions" values={recommendation.recommendedReviewerActions} emptyText="No extra reviewer actions suggested." />
          <section>
            <span className="label">Evidence read by AI</span>
            <div className="tagList compactTagList">
              {recommendation.evidenceFiles.length > 0 ? recommendation.evidenceFiles.map((file) => (
                <span key={file.id}>{file.fileName}</span>
              )) : <span>No submitted evidence files were available.</span>}
            </div>
          </section>
          {recommendation.warnings.length > 0 ? (
            <section>
              <span className="label">Extraction notes</span>
              <ul>
                {recommendation.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </section>
          ) : null}
          <small>
            Generated by {recommendation.model} at {formatIstDateTime(recommendation.generatedAt)} with {Math.round(recommendation.confidence * 100)}% confidence.
          </small>
        </>
      ) : null}
    </aside>
  );
}

function decisionLabel(value: FindingAssistRecommendation["findingDecision"]): string {
  if (value === "create_finding") return "Create finding";
  if (value === "needs_manual_review") return "Needs manual review";
  return "No finding";
}

function coverageLabel(value: FindingAssistRecommendation["evidenceCoverage"]): string {
  return value.replace("_", " ");
}

function relevanceLabel(value: FindingAssistRecommendation["evidenceAnalyses"][number]["relevance"]): string {
  return value === "not_relevant" ? "not relevant" : `${value} relevance`;
}

function FindingList({ title, values, emptyText }: { title: string; values: string[]; emptyText: string }) {
  return (
    <section>
      <span className="label">{title}</span>
      {values.length > 0 ? (
        <ul>
          {values.map((value) => <li key={value}>{value}</li>)}
        </ul>
      ) : (
        <p>{emptyText}</p>
      )}
    </section>
  );
}

function dateInputValue(value: string | null | undefined): string {
  if (value) {
    return value.slice(0, 10);
  }
  const due = new Date();
  due.setUTCDate(due.getUTCDate() + 30);
  return due.toISOString().slice(0, 10);
}

function formatIstDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
    timeZoneName: "short"
  }).format(new Date(value));
}

function generateIdempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
