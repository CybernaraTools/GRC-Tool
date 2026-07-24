import { Inject, Injectable } from "@nestjs/common";
import { EvidenceAssuranceService } from "../../evidence-assurance/public.js";
import type { ClosureSnapshotRecord } from "../../closure-snapshot/public.js";
import { buildCitationManifest, type CitationManifest } from "../domain/citation-manifest.js";
import { runComplianceEngine, type ComplianceEngineResult } from "../domain/compliance-engine.js";
import { extractEvidenceText } from "./evidence-extraction.js";

export interface ReportContext {
  snapshot: ClosureSnapshotRecord;
  engineResult: ComplianceEngineResult;
  citationManifest: CitationManifest;
  evidenceLimitations: string[];
}

/**
 * Assembles the complete, governed report-generation context for one closed
 * assessment's closure (or legacy-reconstruction) snapshot: runs the
 * deterministic compliance engine, builds the citation manifest, then
 * enriches evidence citations with real content via the existing governed
 * EvidenceAssuranceService (never raw storage access) — re-verifying
 * integrity and extracting text for each evidence reference the snapshot
 * already scoped to this assessment's own evidence_links (see
 * PostgresClosureSnapshotRepository.gatherEvidenceForItems — cross-tenant
 * evidence cannot enter this context because the snapshot itself was never
 * built from anything but this assessment's own linked evidence).
 *
 * Note on version fidelity: EvidenceAssuranceService.downloadEvidenceObject
 * fetches the CURRENT latest evidence version for a given evidence object —
 * it has no "fetch this specific historical version" method. If the file has
 * been re-uploaded since closure (current latest version id differs from the
 * version id frozen in the snapshot), that citation is marked
 * integrityVerified:false with an explicit limitation rather than silently
 * treating post-closure content as if it were what was reviewed at closure.
 */
@Injectable()
export class ReportContextService {
  constructor(@Inject(EvidenceAssuranceService) private readonly evidenceService: EvidenceAssuranceService) {}

  async assemble(tenantId: string, snapshot: ClosureSnapshotRecord): Promise<ReportContext> {
    const engineResult = runComplianceEngine(snapshot.payload);
    const citationManifest = buildCitationManifest(snapshot.payload, engineResult);
    const evidenceLimitations: string[] = [];

    // Detect legacy/reconstruction data-quality limitation: Not Applicable controls with finding/remediation history.
    for (const item of snapshot.payload.items) {
      if (item.applicability && item.applicability.applicable === false) {
        const itemFindings = snapshot.payload.findings.filter((f) => f.assessmentItemId === item.itemId);
        if (itemFindings.length > 0) {
          const findingIds = itemFindings.map((f) => f.id).join(", ");
          evidenceLimitations.push(
            `Data Quality / Legacy Reconstruction Limitation: Control ${item.controlRef.controlId} is marked Not Applicable, but has ${itemFindings.length} finding(s) (${findingIds}) and associated remediation history in record history.`
          );
        }
      }
    }

    for (const evidenceRef of snapshot.payload.evidence) {
      const citationId = `EVIDENCE:${evidenceRef.evidenceId}`;
      const citation = citationManifest.get(citationId);
      if (!citation) {
        continue;
      }
      if (evidenceRef.evidenceId === "unknown") {
        citation.integrityVerified = false;
        evidenceLimitations.push(`Evidence linked to ${evidenceRef.linkedTargetType} ${evidenceRef.linkedTargetId} could not be resolved to a source evidence object; treated as Not available.`);
        continue;
      }
      try {
        const { version, bytes } = await this.evidenceService.downloadEvidenceObject(tenantId, evidenceRef.evidenceId);
        const versionDrifted = evidenceRef.evidenceVersionId !== null && evidenceRef.evidenceVersionId !== version.id;
        const extraction = await extractEvidenceText(bytes, version.mimeType, evidenceRef.fileName);
        citation.data = {
          ...citation.data,
          currentVersionId: version.id,
          snapshotVersionId: evidenceRef.evidenceVersionId,
          versionDrifted,
          extractedText: extraction.text,
          extractionNote: extraction.note
        };
        citation.integrityVerified = !versionDrifted;
        if (versionDrifted) {
          evidenceLimitations.push(
            `Evidence file "${evidenceRef.fileName}" has a newer version than the one linked at closure; the file reviewed at closure could not be re-verified and is treated as unverified.`
          );
        }
      } catch (error) {
        citation.integrityVerified = false;
        citation.data = { ...citation.data, integrityError: error instanceof Error ? error.message : String(error) };
        evidenceLimitations.push(
          `Evidence file "${evidenceRef.fileName}" failed integrity verification or could not be retrieved: ${error instanceof Error ? error.message : String(error)}.`
        );
      }
    }

    return { snapshot, engineResult, citationManifest, evidenceLimitations };
  }
}
