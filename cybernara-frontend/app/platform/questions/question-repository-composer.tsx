"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  QuestionRepositoryControlContext,
  QuestionRepositoryEntry,
  QuestionRepositoryResponseType
} from "../../../src/lib/api/generated";

type EvidenceMode = "ai" | "manual";

type QuestionRepositoryComposerProps = {
  actionPath: string;
  controls: QuestionRepositoryControlContext[];
  editingQuestion: QuestionRepositoryEntry | null;
};

const responseTypes: Array<{ value: QuestionRepositoryResponseType; label: string }> = [
  { value: "text", label: "Text" },
  { value: "boolean", label: "Boolean" },
  { value: "maturity", label: "Maturity" },
  { value: "multi_select", label: "Multi-select" }
];

export function QuestionRepositoryComposer({ actionPath, controls, editingQuestion }: QuestionRepositoryComposerProps) {
  const initialControlId = editingQuestion?.harmonizedControlId ?? controls[0]?.harmonizedControlId ?? "";
  const [harmonizedControlId, setHarmonizedControlId] = useState(initialControlId);
  const [responseType, setResponseType] = useState<QuestionRepositoryResponseType>(editingQuestion?.responseType ?? "text");
  const [questionText, setQuestionText] = useState(editingQuestion?.questionText ?? "");
  const [evidenceMode, setEvidenceMode] = useState<EvidenceMode>("ai");
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>(editingQuestion?.evidenceExpectationIds ?? []);
  const [confidence, setConfidence] = useState(editingQuestion ? String(editingQuestion.confidence) : "0.75");
  const [citationsJson, setCitationsJson] = useState(JSON.stringify(editingQuestion?.citations ?? []));
  const [assistState, setAssistState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [assistMessage, setAssistMessage] = useState("");

  const selectedControl = useMemo(
    () => controls.find((control) => control.harmonizedControlId === harmonizedControlId) ?? controls[0] ?? null,
    [controls, harmonizedControlId]
  );

  useEffect(() => {
    const nextControlId = editingQuestion?.harmonizedControlId ?? controls[0]?.harmonizedControlId ?? "";
    setHarmonizedControlId(nextControlId);
    setResponseType(editingQuestion?.responseType ?? "text");
    setQuestionText(editingQuestion?.questionText ?? "");
    setSelectedEvidence(editingQuestion?.evidenceExpectationIds ?? []);
    setConfidence(editingQuestion ? String(editingQuestion.confidence) : "0.75");
    setCitationsJson(JSON.stringify(editingQuestion?.citations ?? []));
    setEvidenceMode("ai");
    setAssistState("idle");
    setAssistMessage("");
  }, [controls, editingQuestion]);

  useEffect(() => {
    if (evidenceMode === "manual") {
      setConfidence("1");
      setCitationsJson(JSON.stringify(selectedControl?.citations ?? []));
    }
  }, [evidenceMode, selectedControl]);

  useEffect(() => {
    const evidenceOptions = selectedControl?.evidenceExpectationIds ?? [];
    const isOriginalEditControl = Boolean(editingQuestion && selectedControl?.harmonizedControlId === editingQuestion.harmonizedControlId);
    if (!isOriginalEditControl) {
      setSelectedEvidence((current) => current.filter((evidenceId) => evidenceOptions.includes(evidenceId)));
      setCitationsJson(JSON.stringify(selectedControl?.citations ?? []));
    }
  }, [editingQuestion, selectedControl]);

  async function requestAiSuggestion() {
    if (!selectedControl) {
      setAssistState("error");
      setAssistMessage("Select a harmonized control before using AI assist.");
      return;
    }
    setAssistState("loading");
    setAssistMessage("Generating evidence and question suggestions with OpenAI...");
    const response = await fetch("/platform/questions/assist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        harmonizedControlId: selectedControl.harmonizedControlId,
        questionText,
        responseType
      })
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setAssistState("error");
      setAssistMessage(body?.error ?? "AI assist failed.");
      return;
    }
    setQuestionText(body.suggestedQuestionText);
    setResponseType(body.responseType);
    setSelectedEvidence(body.evidenceExpectationIds);
    setConfidence(String(body.confidence));
    setCitationsJson(JSON.stringify(body.citations));
    setEvidenceMode("ai");
    setAssistState("ready");
    setAssistMessage("AI suggestion applied. Review the question text, evidence, and confidence before saving.");
  }

  if (controls.length === 0) {
    return (
      <div className="miniForm">
        <p className="eyebrow">Question authoring</p>
        <h3>No harmonized controls available</h3>
        <p className="constraintNote">Publish the global framework catalog and harmonization mappings before creating repository questions.</p>
      </div>
    );
  }

  const evidenceOptions = selectedControl?.evidenceExpectationIds ?? [];
  const canSubmit = Boolean(harmonizedControlId && questionText.trim().length >= 10 && selectedEvidence.length > 0);

  return (
    <form className="miniForm repositoryComposer" action={actionPath} method="post" aria-label="Create or revise question draft">
      <input type="hidden" name="intent" value={editingQuestion ? "createRevision" : "createDraft"} />
      {editingQuestion ? <input type="hidden" name="baseQuestionVersionId" value={editingQuestion.id} /> : null}
      <input type="hidden" name="harmonizedControlId" value={harmonizedControlId} />
      <input type="hidden" name="evidenceExpectationIds" value={selectedEvidence.join(",")} />
      <input type="hidden" name="confidence" value={confidence} />
      <input type="hidden" name="citationsJson" value={citationsJson} />

      <div className="composerHeader">
        <div>
          <p className="eyebrow">{editingQuestion ? "Draft revision" : "Question authoring"}</p>
          <h3>{editingQuestion ? `Edit v${editingQuestion.questionVersion} as a new draft` : "Create a governed question"}</h3>
        </div>
        <span className="badge internal">{evidenceMode === "ai" ? "AI assisted" : "Manual"}</span>
      </div>

      <label>
        Harmonized control
        <select
          name="harmonizedControlSelector"
          value={harmonizedControlId}
          onChange={(event) => setHarmonizedControlId(event.target.value)}
        >
          {controls.map((control) => (
            <option key={control.harmonizedControlId} value={control.harmonizedControlId}>
              {control.harmonizedControlId} - {control.harmonizedControlName} [{control.frameworkKeys.join(", ")}]
            </option>
          ))}
        </select>
      </label>

      {selectedControl ? <ControlContextPanel control={selectedControl} /> : null}

      <label>
        Response type
        <select
          name="responseType"
          value={responseType}
          onChange={(event) => setResponseType(event.target.value as QuestionRepositoryResponseType)}
        >
          {responseTypes.map((entry) => (
            <option key={entry.value} value={entry.value}>{entry.label}</option>
          ))}
        </select>
        <small>{responseTypeGuidance(responseType)}</small>
      </label>

      <label>
        Question text
        <textarea
          name="questionText"
          value={questionText}
          onChange={(event) => setQuestionText(event.target.value)}
          placeholder="Describe the assessment question this control should ask..."
          required
        />
      </label>

      <label>
        Evidence expectation mode
        <select value={evidenceMode} onChange={(event) => setEvidenceMode(event.target.value as EvidenceMode)}>
          <option value="ai">AI recommends evidence, citations, improved text, and confidence</option>
          <option value="manual">Manual evidence selection, confidence fixed at 1.0</option>
        </select>
      </label>

      {evidenceMode === "ai" ? (
        <div className="assistPanel">
          <button className="buttonWithIcon" type="button" onClick={requestAiSuggestion} disabled={assistState === "loading"}>
            <span className="material-symbols-outlined" aria-hidden="true">psychology</span>
            {assistState === "loading" ? "Generating..." : "Generate AI suggestion"}
          </button>
          <p className={assistState === "error" ? "constraintNote errorNote" : "constraintNote"}>
            {assistMessage || "AI uses the selected HARM control, its source controls/subcontrols, framework overlap, and your question text."}
          </p>
        </div>
      ) : (
        <label>
          Evidence expectations
          <select
            multiple
            value={selectedEvidence}
            onChange={(event) => setSelectedEvidence(Array.from(event.currentTarget.selectedOptions).map((option) => option.value))}
            size={Math.min(Math.max(evidenceOptions.length, 4), 8)}
          >
            {evidenceOptions.map((evidenceId) => (
              <option key={evidenceId} value={evidenceId}>{evidenceId}</option>
            ))}
          </select>
        </label>
      )}

      <div className="detailGrid compactDetailGrid">
        <article>
          <span className="label">Selected evidence</span>
          <strong>{selectedEvidence.length}</strong>
          <small>{selectedEvidence.join(", ") || "No evidence selected yet."}</small>
        </article>
        <article>
          <span className="label">Confidence</span>
          <strong>{Math.round(Number(confidence || 0) * 100)}%</strong>
          <small>{evidenceMode === "manual" ? "Manual mode fixes confidence at 1.0." : "Set by AI assist."}</small>
        </article>
        <article>
          <span className="label">Citations</span>
          <strong>{safeCitationCount(citationsJson)}</strong>
          <small>Derived from framework and harmonized-control context.</small>
        </article>
      </div>

      <button type="submit" disabled={!canSubmit}>{editingQuestion ? "Create revision draft" : "Create draft"}</button>
    </form>
  );
}

function ControlContextPanel({ control }: { control: QuestionRepositoryControlContext }) {
  return (
    <section className="contextPanel" aria-label="Selected harmonized control details">
      <div>
        <p className="eyebrow">{control.harmonizedControlId}</p>
        <h3>{control.harmonizedControlName}</h3>
        <p>{control.harmonizedControlDescription}</p>
      </div>
      <div className="tagList" aria-label="Framework overlap">
        {control.frameworkKeys.map((frameworkKey) => <span key={frameworkKey}>{frameworkKey}</span>)}
      </div>
      <div className="sourceControlList">
        {control.sourceControls.slice(0, 8).map((sourceControl) => (
          <article key={`${sourceControl.frameworkKey}:${sourceControl.sourceControlId}:${sourceControl.subcontrolId ?? ""}`}>
            <strong>{sourceControl.frameworkKey}:{sourceControl.sourceControlId}</strong>
            <small>
              {sourceControl.controlTitle ?? "Source control"}
              {sourceControl.subcontrolId ? ` / ${sourceControl.subcontrolId} ${sourceControl.subcontrolTitle ?? ""}` : ""}
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}

function safeCitationCount(value: string): number {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function responseTypeGuidance(responseType: QuestionRepositoryResponseType): string {
  if (responseType === "boolean") {
    return "Use for yes/no control operation checks.";
  }
  if (responseType === "maturity") {
    return "Use for 1-to-5 rating questions such as maturity, consistency, or operating effectiveness.";
  }
  if (responseType === "multi_select") {
    return "Use for checkbox-style questions where several practices, artifacts, or safeguards may apply.";
  }
  return "Use for narrative answers that need explanation, owners, frequency, exceptions, or evidence.";
}
