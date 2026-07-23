"use client";

import { useState } from "react";

export function AnswerEvidenceControls({
  evidenceOptions,
  defaultSelectedEvidenceIds
}: {
  evidenceOptions: Array<{ id: string; fileName: string; scopeTags: string[] }>;
  defaultSelectedEvidenceIds: string[];
}) {
  const [withoutEvidence, setWithoutEvidence] = useState(false);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState(defaultSelectedEvidenceIds);
  const hasEvidence = selectedEvidenceIds.length > 0;
  const canSubmit = hasEvidence || withoutEvidence;
  const selectedLabels = evidenceOptions
    .filter((evidence) => selectedEvidenceIds.includes(evidence.id))
    .map((evidence) => evidence.fileName);

  function toggleEvidence(id: string, checked: boolean) {
    setSelectedEvidenceIds((current) => {
      if (checked) {
        return current.includes(id) ? current : [...current, id];
      }
      return current.filter((candidate) => candidate !== id);
    });
  }

  return (
    <>
      {evidenceOptions.length > 0 ? (
        <fieldset className="choiceGroup">
          <legend>Select evidence for this answer</legend>
          {evidenceOptions.map((evidence) => (
            <label key={evidence.id} className="inlineChoice">
              <input
                type="checkbox"
                name="evidenceIds"
                value={evidence.id}
                checked={!withoutEvidence && selectedEvidenceIds.includes(evidence.id)}
                disabled={withoutEvidence}
                onChange={(event) => toggleEvidence(evidence.id, event.currentTarget.checked)}
              />
              <span>
                {evidence.fileName}
                {evidence.scopeTags.length > 0 ? <small>{evidence.scopeTags.join(", ")}</small> : null}
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}
      <label className="inlineChoice">
        <input
          type="checkbox"
          name="evidenceNotRequired"
          value="true"
          checked={withoutEvidence}
          onChange={(event) => setWithoutEvidence(event.currentTarget.checked)}
        />
        <span>No evidence needed for this answer</span>
      </label>
      <div className={canSubmit ? "constraintNote" : "constraintNote errorNote"} role="status" aria-live="polite">
        {withoutEvidence ? (
          "This answer will be submitted without evidence and marked as not requiring evidence for this item."
        ) : hasEvidence ? (
          <>
            Evidence ready: <strong>{selectedLabels.join(", ") || `${selectedEvidenceIds.length} selected evidence file(s)`}</strong> will be submitted with this answer.
          </>
        ) : (
          "Select one or more committed evidence files, upload a clean file, or mark that evidence is not needed."
        )}
      </div>
      <button type="submit" disabled={!canSubmit}>Submit answer</button>
    </>
  );
}
