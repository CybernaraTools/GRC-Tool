export { PlatformHardeningModule } from "./platform-hardening.module.js";
export { RequirePolicy } from "./application/policy.decorator.js";
export type { PolicyRouteMetadata } from "./application/policy.decorator.js";
export { PolicyGuard } from "./application/policy.guard.js";
export {
  assertOptimisticConcurrency,
  assertUploadAccessible,
  createEncryptionKeyRecord,
  createRateLimitPolicy,
  createSdlcReleaseGate,
  createSiemExportRecord,
  createSignedExportManifest,
  createUploadSession,
  evaluatePolicyDecision,
  evaluateRateLimit,
  idempotencyKeyFor,
  markUploadClean,
  recordBackupRestoreTest,
  recordProductAssuranceEvidence
} from "./domain/hardening.js";
export type {
  BackupRestoreTest,
  Classification,
  Decision,
  EncryptionKeyRecord,
  ExportManifest,
  FindingSeverity,
  PolicyDecision,
  PolicyResource,
  PolicySubject,
  ProductAssuranceEvidence,
  RateLimitPolicy,
  SdlcReleaseGate,
  SiemExportRecord,
  UploadScanStatus,
  UploadSession
} from "./domain/hardening.js";
