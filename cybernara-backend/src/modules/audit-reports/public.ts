export { AuditReportsModule } from "./audit-reports.module.js";
export { AuditReportService } from "./application/audit-report.service.js";
export type {
  AuditReportInsertInput,
  AuditReportRecord,
  AuditReportRepository,
  ClosedAssessmentSummary,
  ReportLifecycleStatus,
  StructuredReportJson
} from "./application/audit-report.types.js";
export { runComplianceEngine } from "./domain/compliance-engine.js";
export type {
  ComplianceEngineResult,
  ControlDisposition,
  ControlDispositionResult,
  FrameworkComplianceResult
} from "./domain/compliance-engine.js";
export { buildCitationManifest, citationManifestToJson, citationManifestToPromptList } from "./domain/citation-manifest.js";
export type { CitationManifest, CitationRecord, CitationRecordType } from "./domain/citation-manifest.js";
export { validateNarrativeGroundedness, summarizeIssuesForRetry } from "./domain/groundedness-validator.js";
export type { StatementIssue, ValidationAttemptResult, ValidationCheck } from "./domain/groundedness-validator.js";
export { NARRATIVE_SECTION_KEYS, validateNarrativeSchema, narrativeJsonSchema, emptyNarrativePayload } from "./domain/narrative-schema.js";
export type { NarrativePayload, NarrativeSectionKey, NarrativeStatement, NumericClaim } from "./domain/narrative-schema.js";
export { renderAuditReportPdf, hashReportBytes } from "./domain/report-pdf.js";
