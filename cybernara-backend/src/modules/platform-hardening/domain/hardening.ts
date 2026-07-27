import { createHash, randomUUID } from "node:crypto";

export type Classification = "public" | "internal" | "confidential" | "restricted";
export type Decision = "allow" | "deny";
export type UploadScanStatus = "quarantined" | "clean" | "malicious";
export type FindingSeverity = "low" | "medium" | "high" | "critical";

export interface PolicySubject {
  tenantId: string;
  userId: string;
  roles: string[];
  scopes: string[];
  clearance: Classification;
  breakGlassUntil?: Date;
}

export interface PolicyResource {
  tenantId: string;
  resourceType: string;
  resourceId: string;
  classification: Classification;
  state: string;
}

export interface PolicyDecision {
  decision: Decision;
  reason: string;
  traceId: string;
}

/**
 * Baseline classification per guarded resource type, mirroring each resource's
 * own table `classification` column default (see supabase/migrations). This is
 * the floor PolicyGuard checks before a scope grant is evaluated; it is not a
 * substitute for reading a specific row's actual persisted classification.
 * Any resourceType not listed here defaults to "restricted" (fail closed).
 */
const resourceTypeClassification: Record<string, Classification> = {
  "framework-content": "restricted",
  harmonization: "restricted",
  evidence_object: "restricted",
  assessment: "confidential",
  finding: "confidential",
  remediation_task: "confidential",
  report_export: "confidential",
  admin_user: "restricted",
  admin_role: "restricted",
  audit_event: "confidential",
  audit_checkpoint: "restricted",
  ai_generation_run: "confidential",
  ai_question_version: "confidential",
  question_version: "confidential",
  connector: "confidential",
  connector_sync_run: "confidential",
  connector_object: "confidential",
  webhook_contract: "confidential",
  webhook_delivery: "confidential",
  automated_control_test: "confidential",
  assurance_alert: "confidential",
  data_inventory_record: "confidential",
  processing_activity: "confidential",
  dpia_assessment: "confidential",
  privacy_rights_request: "confidential",
  consent_record: "confidential",
  privacy_incident: "confidential",
  retention_schedule: "confidential",
  policy_version: "confidential",
  access_review: "confidential",
  vendor: "confidential",
  audit_engagement: "confidential",
  trust_center_artifact: "confidential",
  grc_workspace: "confidential",
  custom_object_definition: "confidential",
  custom_field_definition: "confidential",
  custom_record: "confidential",
  custom_value: "restricted",
  // G-09 Phase 1 (0019_g09_enterprise_grc_risk_register.sql) — matches the
  // `classification cybernara_classification not null default 'confidential'`
  // baseline every new table in that migration carries.
  risk_model: "confidential",
  risk: "confidential",
  risk_link: "confidential",
  risk_treatment: "confidential",
  policy: "confidential",
  policy_control_link: "confidential",
  policy_attestation: "confidential",
  access_review_item: "confidential",
  access_review_decision: "confidential",
  vendor_assessment: "confidential",
  vendor_finding: "confidential",
  audit_request: "confidential",
  audit_test: "confidential",
  // G-06 Phase 1 (0020_g06_ai_provenance_lineage.sql) — matches the
  // `classification cybernara_classification not null default 'confidential'`
  // baseline every new table in that migration carries.
  knowledge_chunk: "confidential",
  retrieval_run: "confidential",
  retrieved_chunk: "confidential",
  generation_citation: "confidential",
  safety_check: "confidential",
  evaluation_suite: "confidential",
  evaluation_case: "confidential",
  evaluation_result: "confidential",
  // G-07 (0021_g07_evidence_graph.sql) — matches each new table's own
  // `classification cybernara_classification not null default '...'` baseline.
  evidence_version: "restricted",
  evidence_link: "confidential",
  evidence_request: "confidential",
  evidence_review: "confidential",
  automated_test: "confidential",
  automated_test_run: "confidential",
  evidence_sample: "confidential",
  malware_scan_result: "restricted",
  evidence_expiry_event: "confidential",
  evidence_custody_event: "restricted",
  // G-08 (0022_g08_privacy_normalization.sql) — matches each new table's own
  // `classification cybernara_classification not null default '...'` baseline.
  systems_asset: "confidential",
  data_category: "confidential",
  data_subject_category: "confidential",
  data_discovery_scan: "confidential",
  data_discovery_finding: "confidential",
  privacy_notice: "confidential",
  privacy_notice_version: "restricted",
  processing_inventory_link: "confidential",
  purpose: "confidential",
  lawful_basis: "confidential",
  processing_purpose_assignment: "confidential",
  recipient: "confidential",
  processing_recipient_link: "confidential",
  transfer: "confidential",
  dpia: "confidential",
  dpia_risk: "confidential",
  rights_request_task: "confidential",
  consent_purpose_version: "confidential",
  consent_event: "restricted",
  incident_assessment: "confidential",
  incident_notification: "confidential",
  retention_rule: "confidential",
  // G-12 (0023_g12_retention_deletion.sql) — matches each new table's own
  // `classification cybernara_classification not null default '...'` baseline.
  retention_assignment: "confidential",
  legal_hold: "confidential",
  legal_hold_item: "confidential",
  deletion_job: "confidential",
  deletion_item: "restricted",
  universal_task: "confidential",
  framework_diff: "restricted",
  framework_update_impact: "restricted",
  // Closed Assessment AI Audit Reports feature — matches
  // `classification cybernara_classification not null default 'confidential'`
  // on ai_audit_reports (0051_g15_ai_audit_reports.sql).
  audit_report: "confidential",
  // Questions Page / Compliance Dashboard feature — matches each new
  // table's own `classification cybernara_classification not null default
  // 'confidential'` baseline (0052_tenant_custom_questions.sql).
  tenant_question: "confidential",
  questions_dashboard: "confidential",
  // Task & Notification Hub - purely derived from existing confidential
  // assessment/finding/remediation state, no table of its own.
  notification: "confidential"
};

export function classificationForResourceType(resourceType: string): Classification {
  return resourceTypeClassification[resourceType] ?? "restricted";
}

export interface RateLimitPolicy {
  id: string;
  key: string;
  limit: number;
  windowSeconds: number;
  timeoutMs: number;
}

export interface ExportManifest {
  id: string;
  snapshotId: string;
  templateVersion: string;
  artifactHashes: string[];
  manifestHash: string;
  signingKeyRef: string;
  signature: string;
}

export interface EncryptionKeyRecord {
  id: string;
  tenantId: string;
  kmsKeyRef: string;
  algorithm: "AES-256-GCM";
  rotationDueAt: Date;
  revokedAt?: Date;
  auditEventIds: string[];
}

export interface SiemExportRecord {
  id: string;
  tenantId: string;
  actorId: string;
  target: string;
  beforeHash: string;
  afterHash: string;
  traceId: string;
  delivered: boolean;
}

export interface BackupRestoreTest {
  id: string;
  tenantId: string;
  rpoMinutes: number;
  rtoHours: number;
  backupCredentialRef: string;
  restoredAt: Date;
  passed: boolean;
}

export interface ProductAssuranceEvidence {
  id: string;
  tenantId: string;
  framework: "ISO_27001" | "SOC2" | "NIST_CSF" | "SSDF" | "OWASP_ASVS" | "CIS" | "NIST_AI_RMF";
  controlRef: string;
  evidenceId: string;
  exceptionReason?: string;
}

export interface SdlcReleaseGate {
  id: string;
  tenantId: string;
  sbomHash: string;
  signedBuildRef: string;
  scanFindings: Array<{ tool: "sast" | "dast" | "sca" | "secrets" | "iac" | "container"; severity: FindingSeverity; resolved: boolean }>;
  penetrationTestEvidenceId: string;
  releasable: boolean;
}

export interface UploadSession {
  id: string;
  tenantId: string;
  fileName: string;
  classification: Classification;
  status: UploadScanStatus;
  sha256?: string;
}

const classificationRank: Record<Classification, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3
};

export function evaluatePolicyDecision(input: {
  subject: PolicySubject;
  resource: PolicyResource;
  action: string;
  traceId: string;
  now?: Date;
}): PolicyDecision {
  if (input.subject.tenantId !== input.resource.tenantId) {
    return deny("Tenant mismatch.", input.traceId);
  }
  if (classificationRank[input.subject.clearance] < classificationRank[input.resource.classification]) {
    return deny("Insufficient classification clearance.", input.traceId);
  }

  const requiredScope = `${input.resource.resourceType}:${input.action}`;
  if (input.subject.scopes.includes(requiredScope)) {
    return { decision: "allow", reason: "Scope grant matched.", traceId: input.traceId };
  }

  const now = input.now ?? new Date();
  if (input.subject.roles.includes("break_glass") && input.subject.breakGlassUntil && input.subject.breakGlassUntil > now) {
    return { decision: "allow", reason: "Break-glass access is active.", traceId: input.traceId };
  }

  return deny("No matching role, scope, resource, state, and classification grant.", input.traceId);
}

export function assertOptimisticConcurrency(currentVersion: number, expectedVersion: number): void {
  if (currentVersion !== expectedVersion) {
    throw new Error("Optimistic concurrency check failed.");
  }
}

export function idempotencyKeyFor(input: { tenantId: string; operation: string; payload: Record<string, unknown> }): string {
  return hashObject(input);
}

export function createRateLimitPolicy(input: {
  key: string;
  limit: number;
  windowSeconds: number;
  timeoutMs: number;
}): RateLimitPolicy {
  if (input.limit <= 0 || input.windowSeconds <= 0 || input.timeoutMs <= 0) {
    throw new Error("Rate-limit policies require positive limit, window, and timeout.");
  }

  return { id: randomUUID(), ...input };
}

export function evaluateRateLimit(policy: RateLimitPolicy, observedCount: number): { allowed: boolean; retryAfterSeconds: number } {
  if (observedCount >= policy.limit) {
    return { allowed: false, retryAfterSeconds: policy.windowSeconds };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function createSignedExportManifest(input: {
  snapshotId: string;
  templateVersion: string;
  artifactHashes: string[];
  signingKeyRef: string;
}): ExportManifest {
  assertSecretRef(input.signingKeyRef);
  if (input.artifactHashes.length === 0) {
    throw new Error("Export manifests require artifacts.");
  }

  const manifestHash = hashObject({
    snapshotId: input.snapshotId,
    templateVersion: input.templateVersion,
    artifactHashes: [...input.artifactHashes].sort()
  });

  return {
    id: randomUUID(),
    snapshotId: input.snapshotId,
    templateVersion: input.templateVersion,
    artifactHashes: [...input.artifactHashes],
    manifestHash,
    signingKeyRef: input.signingKeyRef,
    signature: sha256(`${manifestHash}:${input.signingKeyRef}`)
  };
}

export function createEncryptionKeyRecord(input: {
  tenantId: string;
  kmsKeyRef: string;
  rotationDueAt: Date;
  auditEventIds: string[];
}): EncryptionKeyRecord {
  assertSecretRef(input.kmsKeyRef);
  if (input.auditEventIds.length === 0) {
    throw new Error("Encryption key records require key-use audit events.");
  }

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    kmsKeyRef: input.kmsKeyRef,
    algorithm: "AES-256-GCM",
    rotationDueAt: input.rotationDueAt,
    auditEventIds: [...input.auditEventIds]
  };
}

export function createSiemExportRecord(input: {
  tenantId: string;
  actorId: string;
  target: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  traceId: string;
  delivered: boolean;
}): SiemExportRecord {
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    actorId: input.actorId,
    target: input.target,
    beforeHash: hashObject(input.before),
    afterHash: hashObject(input.after),
    traceId: input.traceId,
    delivered: input.delivered
  };
}

export function recordBackupRestoreTest(input: {
  tenantId: string;
  rpoMinutes: number;
  rtoHours: number;
  backupCredentialRef: string;
  restoredAt: Date;
}): BackupRestoreTest {
  assertSecretRef(input.backupCredentialRef);

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    rpoMinutes: input.rpoMinutes,
    rtoHours: input.rtoHours,
    backupCredentialRef: input.backupCredentialRef,
    restoredAt: input.restoredAt,
    passed: input.rpoMinutes <= 15 && input.rtoHours <= 4
  };
}

export function recordProductAssuranceEvidence(input: Omit<ProductAssuranceEvidence, "id">): ProductAssuranceEvidence {
  if (!input.controlRef || !input.evidenceId) {
    throw new Error("Assurance evidence requires control and evidence references.");
  }
  return { ...input, id: randomUUID() };
}

export function createSdlcReleaseGate(input: Omit<SdlcReleaseGate, "id" | "releasable">): SdlcReleaseGate {
  if (!input.sbomHash.match(/^[a-f0-9]{64}$/) || !input.signedBuildRef.trim() || !input.penetrationTestEvidenceId) {
    throw new Error("Release gates require SBOM hash, signed build, and penetration test evidence.");
  }

  const unresolvedBlockingFindings = input.scanFindings.filter(
    (finding) => !finding.resolved && (finding.severity === "critical" || finding.severity === "high")
  );

  return {
    ...input,
    id: randomUUID(),
    releasable: unresolvedBlockingFindings.length === 0
  };
}

export function createUploadSession(input: {
  tenantId: string;
  fileName: string;
  classification: Classification;
}): UploadSession {
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    fileName: input.fileName,
    classification: input.classification,
    status: "quarantined"
  };
}

export function markUploadClean(upload: UploadSession, bytes: Uint8Array): UploadSession {
  return {
    ...upload,
    status: "clean",
    sha256: createHash("sha256").update(bytes).digest("hex")
  };
}

export function assertUploadAccessible(upload: UploadSession): void {
  if (upload.status !== "clean" || !upload.sha256) {
    throw new Error("Files cannot be accessed before clean validation.");
  }
}

function deny(reason: string, traceId: string): PolicyDecision {
  return { decision: "deny", reason, traceId };
}

function assertSecretRef(secretRef: string): void {
  if (!secretRef.startsWith("secret://")) {
    throw new Error("Sensitive platform material must be stored by reference.");
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashObject(value: unknown): string {
  return sha256(stableStringify(value));
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right)
    );
    return `{${entries
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
