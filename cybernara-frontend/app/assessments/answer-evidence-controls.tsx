"use client";

import { useState } from "react";

const ITEMS_PER_PAGE = 3;

export function AnswerEvidenceControls({
  evidenceOptions,
  defaultSelectedEvidenceIds
}: {
  evidenceOptions: Array<{ id: string; fileName: string; scopeTags: string[] }>;
  defaultSelectedEvidenceIds: string[];
}) {
  const [withoutEvidence, setWithoutEvidence] = useState(false);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState(defaultSelectedEvidenceIds);
  const [page, setPage] = useState(1);

  const hasEvidence = selectedEvidenceIds.length > 0;
  const canSubmit = hasEvidence || withoutEvidence;
  const selectedLabels = evidenceOptions
    .filter((evidence) => selectedEvidenceIds.includes(evidence.id))
    .map((evidence) => evidence.fileName);

  const totalPages = Math.max(1, Math.ceil(evidenceOptions.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const visibleOptions = evidenceOptions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
          <legend>
            Select evidence for this answer ({evidenceOptions.length} total)
          </legend>
          {visibleOptions.map((evidence) => (
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

          {/* Preserve hidden inputs for selected evidence items on non-visible pages */}
          {!withoutEvidence &&
            selectedEvidenceIds.map((id) => {
              const isVisible = visibleOptions.some((opt) => opt.id === id);
              return !isVisible ? <input key={id} type="hidden" name="evidenceIds" value={id} /> : null;
            })}

          {totalPages > 1 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: "1px solid var(--border)"
              }}
            >
              <button
                type="button"
                className="button-outline"
                style={{ minHeight: "32px", padding: "4px 14px", fontSize: "12px" }}
                disabled={currentPage === 1}
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.max(1, p - 1));
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="button-outline"
                style={{ minHeight: "32px", padding: "4px 14px", fontSize: "12px" }}
                disabled={currentPage === totalPages}
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.min(totalPages, p + 1));
                }}
              >
                Next
              </button>
            </div>
          ) : null}
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

      <button type="submit" disabled={!canSubmit}>
        Submit answer
      </button>
    </>
  );
}
