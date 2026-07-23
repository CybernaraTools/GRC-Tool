"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { EvidenceObject, EvidenceUploadPolicy } from "../../src/lib/api/generated";

type UploadState =
  | { kind: "idle" }
  | { kind: "client-error"; message: string }
  | { kind: "uploading"; progress: number }
  | { kind: "server-error"; message: string }
  | { kind: "network-error"; message: string }
  | { kind: "success"; message: string; evidenceId: string };

type EvidenceClassification = "internal" | "confidential" | "restricted";

const classificationHelp: Record<EvidenceClassification, string> = {
  internal: "Internal: low-sensitivity business evidence, such as generic process notes or non-sensitive policy excerpts.",
  confidential: "Confidential: sensitive control evidence, such as audit records, internal procedures, or test results.",
  restricted: "Restricted: highest-sensitivity evidence, such as IAM exports, access reviews, security configs, or data-bearing files."
};

export function EvidenceUploadPanel({
  assessmentId,
  itemId,
  ownerId,
  uploadPolicy,
  defaultScopeTags,
  defaultPeriodStart,
  defaultPeriodEnd
}: {
  assessmentId: string;
  itemId?: string;
  ownerId: string;
  uploadPolicy: EvidenceUploadPolicy;
  defaultScopeTags: string[];
  defaultPeriodStart: string;
  defaultPeriodEnd: string;
}) {
  const [state, setState] = useState<UploadState>({ kind: "idle" });
  const [classification, setClassification] = useState<EvidenceClassification>("restricted");
  const formRef = useRef<HTMLFormElement>(null);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    if (!file) {
      setState({ kind: "idle" });
      return;
    }
    const validation = validateFile(file, uploadPolicy);
    setState(validation ? { kind: "client-error", message: validation } : { kind: "idle" });
  }

  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = formRef.current;
    const uploadFile = form ? formFile(form) : null;
    if (!form || !uploadFile) {
      setState({ kind: "client-error", message: "Choose a file before uploading." });
      return;
    }
    const validation = validateFile(uploadFile, uploadPolicy);
    if (validation) {
      setState({ kind: "client-error", message: validation });
      return;
    }

    const request = new XMLHttpRequest();
    request.open("POST", "/assessments/upload");
    request.setRequestHeader("accept", "application/json");
    request.upload.onprogress = (progressEvent) => {
      if (progressEvent.lengthComputable && progressEvent.total > 0) {
        setState({ kind: "uploading", progress: Math.round((progressEvent.loaded / progressEvent.total) * 100) });
      } else {
        setState({ kind: "uploading", progress: 1 });
      }
    };
    request.onload = () => {
      try {
        const body = JSON.parse(request.responseText || "{}") as { evidence?: EvidenceObject; error?: string };
        if (request.status < 200 || request.status >= 300 || !body.evidence) {
          setState({ kind: "server-error", message: body.error ?? "The server rejected this upload." });
          return;
        }
        setState({
          kind: "success",
          message: `${body.evidence.fileName} uploaded, scanned, committed, and linked.`,
          evidenceId: body.evidence.id
        });
        const query = new URLSearchParams({ assessmentId, evidenceId: body.evidence.id, upload: "success" });
        if (itemId) {
          query.set("itemId", itemId);
        }
        window.setTimeout(() => {
          window.location.assign(`/assessments?${query.toString()}`);
        }, 150);
      } catch {
        setState({ kind: "server-error", message: "The upload response could not be parsed." });
      }
    };
    request.onerror = () => {
      setState({ kind: "network-error", message: "Network failure during upload. Retry is available." });
    };
    request.onabort = () => {
      setState({ kind: "network-error", message: "Upload was interrupted before the server accepted it." });
    };

    setState({ kind: "uploading", progress: 0 });
    request.send(new FormData(form));
  }

  const submitLabel = state.kind === "network-error" || state.kind === "server-error" ? "Retry upload" : "Upload evidence file";

  return (
    <form
      className="miniForm"
      ref={formRef}
      onSubmit={upload}
      aria-label="Upload evidence file"
      method="post"
      action="/assessments/upload"
      encType="multipart/form-data"
    >
      <input type="hidden" name="ownerId" value={ownerId} />
      <input type="hidden" name="assessmentId" value={assessmentId} />
      {itemId ? <input type="hidden" name="itemId" value={itemId} /> : null}
      <label>
        File
        <input
          name="file"
          type="file"
          accept={uploadPolicy.allowedMimeTypes.join(",")}
          onChange={onFileChange}
          onInput={onFileChange}
          required
        />
      </label>
      <label>
        Classification
        <select
          name="classification"
          value={classification}
          onChange={(event) => setClassification(classificationValue(event.currentTarget.value))}
        >
          <option value="internal">Internal - low sensitivity</option>
          <option value="confidential">Confidential - sensitive business/control evidence</option>
          <option value="restricted">Restricted - highest sensitivity</option>
        </select>
        <small>{classificationHelp[classification]}</small>
      </label>
      <label>
        Period start
        <input name="periodStart" type="date" defaultValue={defaultPeriodStart} required />
        <small>Defaults to this assessment question period.</small>
      </label>
      <label>
        Period end
        <input name="periodEnd" type="date" defaultValue={defaultPeriodEnd} required />
        <small>Defaults to this assessment question period.</small>
      </label>
      <label>
        Scope tags
        <input name="scopeTags" defaultValue={defaultScopeTags.join(", ")} required />
        <small>Auto-filled from the current question, framework, and control. Edit if this evidence applies differently.</small>
      </label>
      <UploadStatus state={state} maxBytes={uploadPolicy.maxBytes} />
      <button type="submit" disabled={state.kind === "uploading"}>
        {submitLabel}
      </button>
    </form>
  );
}

function UploadStatus({ state, maxBytes }: { state: UploadState; maxBytes: number }) {
  if (state.kind === "uploading") {
    return (
      <div className="uploadProgress" role="status" aria-live="polite">
        <span>Uploading {state.progress}%</span>
        <progress max={100} value={state.progress} aria-label="Evidence upload progress" />
      </div>
    );
  }
  if (state.kind === "client-error" || state.kind === "server-error" || state.kind === "network-error") {
    return (
      <div className="constraintNote errorNote" role="alert">
        {state.message}
      </div>
    );
  }
  if (state.kind === "success") {
    return (
      <div className="constraintNote" role="status" aria-live="polite">
        {state.message}
      </div>
    );
  }
  return (
    <div className="constraintNote">
      Max upload size: {formatBytes(maxBytes)}. Files remain quarantined until the backend scan path accepts them.
    </div>
  );
}

function formFile(form: HTMLFormElement): File | null {
  const value = new FormData(form).get("file");
  return value instanceof File && value.size > 0 ? value : null;
}

function validateFile(file: File, uploadPolicy: EvidenceUploadPolicy): string | null {
  if (file.size > uploadPolicy.maxBytes) {
    return `File is ${formatBytes(file.size)}, which exceeds the ${formatBytes(uploadPolicy.maxBytes)} limit.`;
  }
  const mimeType = file.type || "application/octet-stream";
  if (!uploadPolicy.allowedMimeTypes.includes(mimeType)) {
    return `${mimeType} is not an allowed evidence file type.`;
  }
  return null;
}

function classificationValue(value: string): EvidenceClassification {
  if (value === "internal" || value === "confidential") {
    return value;
  }
  return "restricted";
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }
  return `${bytes} bytes`;
}
