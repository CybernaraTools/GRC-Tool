import { readEnv } from "../../../config/env.js";

export interface EvidenceUploadPolicy {
  maxBytes: number;
  allowedMimeTypes: string[];
}

export function readEvidenceUploadPolicy(): EvidenceUploadPolicy {
  const env = readEnv();
  return {
    maxBytes: env.EVIDENCE_UPLOAD_MAX_BYTES,
    allowedMimeTypes: env.EVIDENCE_UPLOAD_ALLOWED_MIME_TYPES.split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
  };
}
