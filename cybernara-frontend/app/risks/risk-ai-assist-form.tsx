"use client";

import { useMemo, useState } from "react";
import type {
  AssessmentItem,
  Finding,
  RiskAssistRecommendation,
  RiskAssistRequest,
  RiskModel
} from "../../src/lib/api/generated";

type RiskAiAssistFormProps = {
  actionPath: string;
  assessmentId: string;
  finding: Finding;
  item: AssessmentItem;
  riskModels: RiskModel[];
  currentUserId: string;
};

type RiskAssistEvidenceFile = RiskAssistRecommendation["evidenceFiles"][number];

export function RiskAiAssistForm({
  actionPath,
  assessmentId,
  finding,
  item,
  riskModels,
  currentUserId
}: RiskAiAssistFormProps) {
  const sourceControlId = item.controlRef.controlId ?? item.controlRef.harmonizedControlId ?? "CONTROL";
  const defaultKey = `RISK-${sourceControlId.replace(/[^A-Za-z0-9]/g, "-")}-${finding.id.slice(0, 6)}`.toUpperCase();
  const idempotencyKey = useMemo(() => generateIdempotencyKey(), []);
  const [riskKey, setRiskKey] = useState(defaultKey);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [inherentScore, setInherentScore] = useState("");
  const [residualScore, setResidualScore] = useState("");
  const [mitigationPlan, setMitigationPlan] = useState("");
  const [strategy, setStrategy] = useState("mitigate");
  const [recommendation, setRecommendation] = useState<RiskAssistRecommendation | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function analyzeRisk() {
    const body: RiskAssistRequest = { assessmentId, findingId: finding.id };
    setStatus("loading");
    setError(null);
    try {
      const response = await fetch("/risks/assist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const responseBody = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(typeof responseBody?.error === "string" ? responseBody.error : `AI risk analysis failed with ${response.status}.`);
      }
      const nextRecommendation = responseBody as RiskAssistRecommendation;
      setRecommendation(nextRecommendation);
      if (nextRecommendation.escalationDecision === "create_new_risk") {
        if (nextRecommendation.riskTitle) {
          setTitle(nextRecommendation.riskTitle);
        }
        if (nextRecommendation.category) {
          setCategory(nextRecommendation.category);
        }
        if (typeof nextRecommendation.inherentScore === "number") {
          setInherentScore(String(Math.round(nextRecommendation.inherentScore)));
        }
        if (typeof nextRecommendation.residualScore === "number") {
          setResidualScore(String(Math.round(nextRecommendation.residualScore)));
        }
        if (nextRecommendation.suggestedMitigation) {
          setMitigationPlan(nextRecommendation.suggestedMitigation);
        }
        if (nextRecommendation.suggestedTreatment) {
          setStrategy(treatmentStrategyValue(nextRecommendation.suggestedTreatment));
        }
      }
      setStatus("idle");
    } catch (nextError) {
      setStatus("error");
      setError(nextError instanceof Error ? nextError.message : "AI risk analysis failed.");
    }
  }

  return (
    <>
      <form className="miniForm" action={actionPath} method="post" aria-label="Create enterprise risk from finding">
        <input type="hidden" name="intent" value="createRiskFromFinding" />
        <input type="hidden" name="findingId" value={finding.id} />
        <input type="hidden" name="ownerId" value={currentUserId} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <h3>Create linked risk</h3>
        <div className="constraintNote">
          Create manually, or use AI to analyze the full finding, question, answer, controls, framework mappings, reviewer context, and submitted evidence files.
        </div>
        {recommendation?.escalationDecision === "no_escalation" ? (
          <div className="constraintNote">
            AI does not recommend escalation for this finding. A reviewer can still manually create a risk if they disagree.
          </div>
        ) : null}
        {recommendation?.escalationDecision === "link_existing_risk" ? (
          <div className="constraintNote">
            AI recommends linking an existing risk instead of creating a duplicate. Review the proposal before deciding.
          </div>
        ) : null}
        <button type="button" onClick={analyzeRisk} disabled={status === "loading"}>
          {status === "loading" ? "Analyzing risk context..." : "Analyze Risk with AI"}
        </button>
        {status === "error" && error ? <div className="constraintNote errorNote" role="alert">{error}</div> : null}
        {riskModels.length > 0 ? (
          <label>
            Risk model
            <select name="riskModelId" defaultValue={riskModels[0]?.id ?? ""}>
              {riskModels.map((model) => (
                <option key={model.id} value={model.id}>{model.modelKey} {model.modelVersion}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          Risk key
          <input name="riskKey" value={riskKey} onChange={(event) => setRiskKey(event.target.value)} />
        </label>
        <label>
          Title
          <input
            name="title"
            required
            placeholder="Example: Lack of formal secure coding standard governance"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          Category
          <input
            name="category"
            required
            placeholder="Example: application_security"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
        </label>
        <label>
          Inherent score
          <input
            type="number"
            name="inherentScore"
            min="0"
            max="100"
            required
            placeholder="Example: 80"
            value={inherentScore}
            onChange={(event) => setInherentScore(event.target.value)}
          />
        </label>
        <label>
          Residual score
          <input
            type="number"
            name="residualScore"
            min="0"
            max="100"
            required
            placeholder="Example: 45"
            value={residualScore}
            onChange={(event) => setResidualScore(event.target.value)}
          />
        </label>
        <label>
          Mitigation strategy
          <select name="strategy" value={strategy} onChange={(event) => setStrategy(event.target.value)}>
            <option value="mitigate">Mitigate</option>
            <option value="transfer">Transfer</option>
            <option value="avoid">Avoid</option>
            <option value="accept">Accept</option>
          </select>
        </label>
        <label>
          Mitigation description
          <textarea
            name="mitigationPlan"
            required
            placeholder="Example: publish the secure coding standard, train developers, and verify adoption through code-review and SAST evidence."
            value={mitigationPlan}
            onChange={(event) => setMitigationPlan(event.target.value)}
          />
        </label>
        <label>
          Mitigation due date
          <input type="date" name="mitigationDueAt" defaultValue={dateDaysFromNow(45)} />
        </label>
        <button type="submit">Create and link risk</button>
      </form>
      <RiskAiProposal recommendation={recommendation} loading={status === "loading"} />
    </>
  );
}

function RiskAiProposal({
  recommendation,
  loading
}: {
  recommendation: RiskAssistRecommendation | null;
  loading: boolean;
}) {
  return (
    <aside className="miniForm" aria-label="AI risk proposal">
      <strong>AI risk proposal</strong>
      {loading ? <div className="constraintNote">Building the governed risk package and reading submitted evidence.</div> : null}
      {!recommendation && !loading ? (
        <div className="constraintNote">No AI risk proposal generated yet. Manual risk creation still works without AI.</div>
      ) : null}
      {recommendation ? (
        <>
          <section>
            <span className="label">Escalation decision</span>
            <h3>{decisionLabel(recommendation.escalationDecision)}</h3>
            <p>{recommendation.escalationDecisionRationale}</p>
            {recommendation.findingReassessmentRecommended ? (
              <div className="constraintNote">
                Finding reassessment recommended: evidence or reviewer context may contradict the current finding.
              </div>
            ) : null}
          </section>
          <div className="tagList compactTagList" aria-label="Suggested risk parameters">
            <span>Likelihood: {recommendation.suggestedLikelihood ?? "not applicable"}</span>
            <span>Impact: {recommendation.suggestedImpact ?? "not applicable"}</span>
            <span>Inherent: {recommendation.suggestedInherentRisk ?? "not applicable"}</span>
            <span>Treatment: {recommendation.suggestedTreatment ?? "not applicable"}</span>
            <span>{Math.round(recommendation.confidence * 100)}% confidence</span>
          </div>
          <section>
            <span className="label">Risk scoring rationale</span>
            <div className="proposalScoreGrid">
              <article className="proposalScoreCard">
                <span className="label">Category</span>
                <strong>{recommendation.category ?? "Not proposed"}</strong>
                <p>{recommendation.categoryRationale ?? "No category rationale returned."}</p>
              </article>
              <article className="proposalScoreCard">
                <span className="label">Inherent score</span>
                <strong>{scoreDisplay(recommendation.inherentScore)}</strong>
                <p>{recommendation.inherentScoreRationale ?? "No inherent score rationale returned."}</p>
              </article>
              <article className="proposalScoreCard">
                <span className="label">Residual score</span>
                <strong>{scoreDisplay(recommendation.residualScore)}</strong>
                <p>{recommendation.residualScoreRationale ?? "No residual score rationale returned."}</p>
              </article>
              <article className="proposalScoreCard">
                <span className="label">Treatment logic</span>
                <strong>{recommendation.suggestedTreatment ?? "Not proposed"}</strong>
                <p>{recommendation.treatmentRationale ?? "No treatment rationale returned."}</p>
              </article>
            </div>
            <div className="constraintNote">
              <strong>Scoring method:</strong> {recommendation.riskScoringMethod ?? "No scoring method returned."}
            </div>
          </section>
          {recommendation.recommendedExistingRiskKey ? (
            <section>
              <span className="label">Recommended existing risk</span>
              <p>
                <strong>{recommendation.recommendedExistingRiskKey}</strong>
                {recommendation.recommendedExistingRiskTitle ? ` - ${recommendation.recommendedExistingRiskTitle}` : ""}
              </p>
              {recommendation.recommendedExistingRiskReason ? <p>{recommendation.recommendedExistingRiskReason}</p> : null}
            </section>
          ) : null}
          {recommendation.riskStatement ? (
            <section>
              <span className="label">Risk statement</span>
              <p>{recommendation.riskStatement}</p>
            </section>
          ) : null}
          {recommendation.suggestedMitigation ? (
            <section>
              <span className="label">Suggested mitigation</span>
              <p>{recommendation.suggestedMitigation}</p>
            </section>
          ) : null}
          <RiskList title="Suggested evidence required" values={recommendation.suggestedEvidenceRequired} emptyText="No specific evidence requirement returned." />
          <section>
            <span className="label">Framework impact</span>
            {recommendation.frameworkImpact.length > 0 ? recommendation.frameworkImpact.map((impact) => (
              <article className="constraintNote" key={impact.frameworkKey}>
                <strong>{impact.frameworkKey}</strong>
                <p>{impact.impact}</p>
                <div className="tagList compactTagList">
                  {impact.requirementRefs.map((ref) => <span key={`${impact.frameworkKey}-${ref}`}>{ref}</span>)}
                </div>
              </article>
            )) : <p>No framework impact returned.</p>}
          </section>
          <section>
            <span className="label">Evidence-by-file analysis</span>
            {recommendation.evidenceAnalysis.length > 0 ? recommendation.evidenceAnalysis.map((analysis) => (
              <details className="constraintNote evidenceAnalysisDetails" key={analysis.fileName}>
                <summary className="sectionHeader compactSectionHeader">
                  <strong>{analysis.fileName}</strong>
                  <span className="badge internal">{analysis.relevance === "not_relevant" ? "not relevant" : `${analysis.relevance} relevance`}</span>
                </summary>
                <div className="evidenceAnalysisContent">
                  <p><strong>Document purpose:</strong> {analysis.documentPurpose}</p>
                  <p>{analysis.summary}</p>
                  <RiskList title="Key facts found" values={analysis.keyFacts} emptyText="No key facts returned." />
                  <RiskList title="Control coverage" values={analysis.controlCoverage} emptyText="No control coverage returned." />
                  <RiskList title="Notable evidence text" values={analysis.notableExcerpts} emptyText="No excerpts returned." />
                  <RiskList title="Supports" values={analysis.supports} emptyText="No supporting points returned." />
                  <RiskList title="Gaps" values={analysis.gaps} emptyText="No gaps identified for this file." />
                  <RiskList title="Risk signals" values={analysis.riskSignals} emptyText="No risk signals identified." />
                  <RiskList title="Limitations" values={analysis.limitations} emptyText="No limitations identified." />
                  <p><strong>Reviewer conclusion:</strong> {analysis.reviewerConclusion}</p>
                </div>
              </details>
            )) : <p>No file-level analysis returned.</p>}
          </section>
          <section>
            <span className="label">Potential related risks</span>
            {recommendation.potentialRelatedRisks.length > 0 ? recommendation.potentialRelatedRisks.map((risk) => (
              <article className="constraintNote" key={`${risk.riskKey}-${risk.title}`}>
                <strong>{risk.riskKey} - {risk.title}</strong>
                <p>{risk.reason}</p>
              </article>
            )) : <p>No related enterprise risks were identified.</p>}
          </section>
          <section>
            <span className="label">AI rationale</span>
            <p>{recommendation.aiRationale}</p>
          </section>
          <RiskList title="Sources used" values={recommendation.sourcesUsed} emptyText="No sources returned." />
          <section>
            <span className="label">Evidence read by AI</span>
            {recommendation.evidenceFiles.length > 0 ? recommendation.evidenceFiles.map((file) => (
              <details className="evidenceTextCard" key={file.id}>
                <summary>{file.fileName}</summary>
                <div className="tagList compactTagList" aria-label={`Evidence metadata for ${file.fileName}`}>
                  <span>{file.state}</span>
                  <span>{file.mimeType}</span>
                  {file.sha256 ? <span>{file.sha256.slice(0, 16)}</span> : null}
                </div>
                {file.scopeTags.length > 0 ? (
                  <div className="tagList compactTagList" aria-label={`Scope tags for ${file.fileName}`}>
                    {file.scopeTags.map((tag) => <span key={`${file.id}-${tag}`}>{tag}</span>)}
                  </div>
                ) : null}
                <p>{file.extractionNote ?? "Text was extracted directly from this evidence file."}</p>
                <pre className="evidenceTextPreview">{evidenceTextPreview(file)}</pre>
              </details>
            )) : <p>No submitted evidence files were available.</p>}
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
            Generated by {recommendation.model} at {formatIstDateTime(recommendation.generatedAt)}.
          </small>
        </>
      ) : null}
    </aside>
  );
}

function decisionLabel(value: RiskAssistRecommendation["escalationDecision"]): string {
  if (value === "create_new_risk") {
    return "Create new risk";
  }
  if (value === "link_existing_risk") {
    return "Link existing risk";
  }
  return "No escalation";
}

function scoreDisplay(score: number | null): string {
  if (typeof score !== "number") {
    return "Not scored";
  }
  return `${Math.round(score)} / 100 (${scoreBand(score)})`;
}

function scoreBand(score: number): string {
  if (score >= 80) return "critical exposure";
  if (score >= 50) return "high exposure";
  if (score >= 25) return "moderate exposure";
  return "low exposure";
}

function RiskList({ title, values, emptyText }: { title: string; values: string[]; emptyText: string }) {
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

function evidenceTextPreview(file: RiskAssistEvidenceFile): string {
  if (!file.extractedText) {
    return "No extracted text is available for this file. The AI used only metadata and extraction notes.";
  }
  const maxPreviewCharacters = 5000;
  if (file.extractedText.length <= maxPreviewCharacters) {
    return file.extractedText;
  }
  return `${file.extractedText.slice(0, maxPreviewCharacters)}\n\n[Preview truncated in the UI. The AI received the extracted text package from the backend.]`;
}

function generateIdempotencyKey(): string {
  const randomId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `risk-create-${randomId}`;
}

function treatmentStrategyValue(value: string): string {
  if (value === "transfer" || value === "avoid" || value === "accept") {
    return value;
  }
  return "mitigate";
}

function dateDaysFromNow(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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
