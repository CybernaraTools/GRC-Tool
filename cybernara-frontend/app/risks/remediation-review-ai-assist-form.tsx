"use client";

import { useMemo, useState } from "react";
import type { FindingAssistRecommendation, FindingAssistRequest } from "../../src/lib/api/generated";

type RemediationReviewAiAssistFormProps = {
  assessmentName: string;
  itemId: string;
  questionText: string;
  responseType?: string;
  originalAnswer: string;
  findingDescription: string;
  findingSeverity: string;
  riskKey: string;
  riskTitle: string;
  riskCategory: string;
  riskStatus: string;
  taskStatus: string;
  acceptanceRationale?: string;
  acceptanceExpiresAt?: string;
  acceptanceNextReviewDueAt?: string;
  frameworkKeys: string[];
  harmonizedControlId?: string;
  harmonizedControlName?: string;
  sourceControlId?: string;
  sourceControlTitle?: string;
  evidenceExpectationIds: string[];
  citations: Array<{ sourceId: string; sourceType?: string }>;
  evidenceObjectIds: string[];
  remediationEvidenceNames: string[];
};

export function RemediationReviewAiAssistForm(props: RemediationReviewAiAssistFormProps) {
  const [recommendation, setRecommendation] = useState<FindingAssistRecommendation | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const mode = props.acceptanceRationale ? "risk acceptance review" : "remediation review";
  const context = useMemo<FindingAssistRequest>(() => ({
    assessmentItemId: props.itemId,
    questionText: [
      `Reviewer decision mode: ${mode}.`,
      `Assessment: ${props.assessmentName}.`,
      `Original question: ${props.questionText}`,
      `Finding severity: ${props.findingSeverity}. Finding: ${props.findingDescription}`,
      `Risk: ${props.riskKey} - ${props.riskTitle}. Category: ${props.riskCategory}. Risk status: ${props.riskStatus}.`,
      `Remediation task status: ${props.taskStatus}.`,
      props.acceptanceRationale
        ? `Risk acceptance request: ${props.acceptanceRationale}. Expires: ${props.acceptanceExpiresAt ?? "not supplied"}. Next review: ${props.acceptanceNextReviewDueAt ?? "not supplied"}.`
        : `Remediation submission: review the linked remediation answer/evidence files and decide whether the finding can be resolved.`,
      `Remediation evidence files: ${props.remediationEvidenceNames.join(", ") || "none"}.`
    ].join("\n"),
    responseType: props.responseType,
    answerText: [
      `Original assessment answer: ${props.originalAnswer || "No original answer submitted."}`,
      props.acceptanceRationale
        ? `Acceptance rationale to evaluate: ${props.acceptanceRationale}`
        : "The updated remediation answer, if submitted, is attached as remediation evidence and should be read from the evidence file text."
    ].join("\n\n"),
    frameworkKeys: props.frameworkKeys,
    harmonizedControlId: props.harmonizedControlId,
    harmonizedControlName: props.harmonizedControlName,
    sourceControlId: props.sourceControlId,
    sourceControlTitle: props.sourceControlTitle,
    evidenceExpectationIds: props.evidenceExpectationIds,
    citations: props.citations,
    evidenceObjectIds: props.evidenceObjectIds
  }), [props, mode]);

  async function analyze() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/findings/assist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(context)
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(typeof body?.error === "string" ? body.error : "AI review could not be completed.");
      }
      setRecommendation(body as FindingAssistRecommendation);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }

  const decision = recommendation ? reviewerDecision(recommendation.findingDecision, Boolean(props.acceptanceRationale)) : null;

  return (
    <section className="subWorkspace" aria-labelledby="ai-review-aid-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">AI reviewer aid</p>
          <h3 id="ai-review-aid-heading">Advisory decision support</h3>
        </div>
        <span className="badge internal">{mode}</span>
      </div>
      <div className="subWorkspaceContent">
        <p>
          AI reads the question, original answer, finding, risk context, and submitted evidence files through the existing governed evidence route.
          It cannot approve, reject, accept risk, close a finding, or close an assessment.
        </p>
        <div className="actionRow">
          <button className="reviewLink" type="button" onClick={analyze} disabled={loading}>
            {loading ? "Analyzing..." : "Analyze submission with AI"}
          </button>
        </div>
        {error ? <div className="errorPanel">{error}</div> : null}
        {recommendation ? (
          <aside className="aiResultPanel">
            <section>
              <span className="label">Recommended decision</span>
              <strong>{decision}</strong>
              <p>{recommendation.findingDecisionRationale}</p>
            </section>
            <section>
              <span className="label">Confidence</span>
              <strong>{Math.round(recommendation.confidence * 100)}%</strong>
              <p>{recommendation.confidenceRationale}</p>
            </section>
            <section>
              <span className="label">Evidence coverage</span>
              <strong>{recommendation.evidenceCoverage.replace("_", " ")}</strong>
              <p>{recommendation.evidenceCoverageRationale}</p>
            </section>

            {recommendation.materialObligations && recommendation.materialObligations.length > 0 ? (
              <section>
                <span className="label">Material remediation obligations</span>
                <div className="obligationList">
                  {recommendation.materialObligations.map((ob, idx) => (
                    <article key={idx} className="constraintNote obligationCard">
                      <div className="sectionHeader compactSectionHeader">
                        <strong>{ob.obligation}</strong>
                        <div className="tagList compactTagList">
                          <span className="badge">{ob.stage}</span>
                          <span className={`badge ${ob.status === "proven" ? "internal" : ob.status === "partially_proven" ? "confidential" : "restricted"}`}>
                            {ob.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                      {ob.supportingEvidence.length > 0 ? (
                        <p><strong>Supporting evidence:</strong> {ob.supportingEvidence.join(", ")}</p>
                      ) : (
                        <p><strong>Supporting evidence:</strong> None provided.</p>
                      )}
                      {ob.missingProof ? <p><strong>Missing proof:</strong> {ob.missingProof}</p> : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {recommendation.evidenceContextMismatches && recommendation.evidenceContextMismatches.length > 0 ? (
              <section>
                <span className="label">Evidence context mismatches</span>
                <div className="constraintNote errorNote">
                  <ul>
                    {recommendation.evidenceContextMismatches.map((mismatch, idx) => (
                      <li key={idx}>{mismatch}</li>
                    ))}
                  </ul>
                </div>
              </section>
            ) : null}

            <section>
              <span className="label">Reasoning</span>
              <p>{recommendation.rationale}</p>
            </section>

            <section>
              <span className="label">Remaining gaps</span>
              {recommendation.missingEvidence.length > 0 ? (
                <ul>
                  {recommendation.missingEvidence.map((gap) => <li key={gap}>{gap}</li>)}
                </ul>
              ) : (
                <p>No material missing evidence identified by AI.</p>
              )}
            </section>

            {recommendation.suggestedAdditionalEvidence && recommendation.suggestedAdditionalEvidence.length > 0 ? (
              <section>
                <span className="label">Suggested additional evidence required</span>
                <ul>
                  {recommendation.suggestedAdditionalEvidence.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section>
              <span className="label">Evidence-by-file analysis</span>
              {recommendation.evidenceAnalyses.length > 0 ? recommendation.evidenceAnalyses.map((analysis) => (
                <details key={analysis.fileName} className="evidenceAnalysisDetails">
                  <summary className="sectionHeader compactSectionHeader">
                    <strong>{analysis.fileName}</strong>
                    <div className="tagList compactTagList">
                      {analysis.evidenceType ? <span className="badge">{analysis.evidenceType.replace("_", " ")}</span> : null}
                      <span className="badge internal">{analysis.relevance === "not_relevant" ? "not relevant" : `${analysis.relevance} relevance`}</span>
                    </div>
                  </summary>
                  <div className="evidenceAnalysisContent">
                    {analysis.proves ? <p><strong>What this file proves:</strong> {analysis.proves}</p> : null}
                    <p><strong>Document purpose:</strong> {analysis.documentPurpose}</p>
                    <p>{analysis.summary}</p>
                    {analysis.contextMismatches && analysis.contextMismatches.length > 0 ? (
                      <FindingList title="Context mismatches" values={analysis.contextMismatches} />
                    ) : null}
                    <FindingList title="Supports" values={analysis.supports} />
                    <FindingList title="Gaps" values={analysis.gaps} />
                    <FindingList title="Limitations" values={analysis.limitations} />
                    <p><strong>Reviewer note:</strong> {analysis.reliabilityAssessment}</p>
                  </div>
                </details>
              )) : <p>No file-level analysis returned.</p>}
            </section>

            {recommendation.recommendedReviewerActions && recommendation.recommendedReviewerActions.length > 0 ? (
              <FindingList title="Recommended reviewer actions" values={recommendation.recommendedReviewerActions} />
            ) : null}

            {recommendation.warnings.length > 0 ? (
              <section>
                <span className="label">Extraction notes</span>
                <ul>
                  {recommendation.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              </section>
            ) : null}
            <small>Generated by {recommendation.model} at {formatIstDateTime(recommendation.generatedAt)}.</small>
          </aside>
        ) : null}
      </div>
    </section>
  );
}

function reviewerDecision(findingDecision: FindingAssistRecommendation["findingDecision"], acceptanceMode: boolean): string {
  if (findingDecision === "no_finding") {
    return acceptanceMode ? "Approve Risk Acceptance" : "Approve Remediation";
  }
  if (findingDecision === "needs_manual_review") {
    return "More Evidence Required";
  }
  return acceptanceMode ? "Reject Risk Acceptance" : "Reject / Re-remediation";
}

function FindingList({ title, values }: { title: string; values: string[] }) {
  return (
    <section>
      <span className="label">{title}</span>
      {values.length > 0 ? (
        <ul>
          {values.map((value) => <li key={value}>{value}</li>)}
        </ul>
      ) : (
        <p>None identified.</p>
      )}
    </section>
  );
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
