import { PDFParse } from "pdf-parse";

// Independent copy of the PDF/text extraction approach already used by
// finding-ai-assistant.service.ts / risk-ai-assistant.service.ts, scoped
// entirely to audit-reports. Deliberately NOT shared/refactored out of those
// two existing, working AI-assist services — this feature must not touch
// files outside its own module, and de-duplicating this logic properly is a
// separate, out-of-scope cleanup.

export interface ExtractedEvidenceText {
  text: string | null;
  note: string | null;
}

export async function extractEvidenceText(bytes: Buffer, mimeType: string, fileName: string): Promise<ExtractedEvidenceText> {
  const normalizedMime = mimeType.toLowerCase();
  if (
    normalizedMime.startsWith("text/") ||
    normalizedMime.includes("json") ||
    normalizedMime.includes("csv") ||
    /\.(txt|md|csv|json|log)$/i.test(fileName)
  ) {
    return { text: normalizeExtractedText(bytes.toString("utf8")), note: null };
  }
  if (normalizedMime === "application/pdf" || /\.pdf$/i.test(fileName)) {
    const parsedText = await extractPdfText(bytes);
    if (parsedText) {
      return { text: parsedText, note: "PDF text was extracted for AI report synthesis." };
    }
    const fallback = extractPdfTextBestEffort(bytes);
    return fallback
      ? { text: fallback, note: "PDF text was extracted with fallback parsing for AI report synthesis." }
      : { text: null, note: "PDF text could not be extracted; the file may be scanned, encrypted, or image-only." };
  }
  return { text: null, note: `MIME type ${mimeType} is not text-extractable; only file metadata was available.` };
}

async function extractPdfText(bytes: Buffer): Promise<string | null> {
  const parser = new PDFParse({ data: Uint8Array.from(bytes) });
  try {
    const result = await parser.getText({ first: 20, pageJoiner: "\n" });
    const normalized = normalizeExtractedText(result.text);
    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

function extractPdfTextBestEffort(bytes: Buffer): string | null {
  const raw = bytes.subarray(0, Math.min(bytes.length, 400_000)).toString("latin1");
  const matches = raw.matchAll(/\(((?:\\.|[^\\()]){3,})\)\s*Tj/g);
  const chunks: string[] = [];
  for (const match of matches) {
    const decoded = decodePdfLiteral(match[1]).trim();
    if (decoded.length > 2) {
      chunks.push(decoded);
    }
  }
  const joined = normalizeExtractedText(chunks.join(" "));
  return joined.length > 0 ? joined : null;
}

function decodePdfLiteral(value: string): string {
  let result = "";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char !== "\\") {
      result += char;
      continue;
    }
    const next = value[index + 1];
    index += 1;
    if (next === "n") result += "\n";
    else if (next === "r") result += "\r";
    else if (next === "t") result += "\t";
    else if (next === "b" || next === "f") result += " ";
    else result += next ?? "";
  }
  return result;
}

function normalizeExtractedText(text: string): string {
  return text
    .replace(/[^ -~]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12_000);
}
