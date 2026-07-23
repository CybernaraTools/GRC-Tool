import type {
  AutomatedTest,
  AutomatedTestRun,
  EvidenceCustodyEvent,
  EvidenceExpiryEvent,
  EvidenceLink,
  EvidenceObject,
  EvidenceRequest,
  EvidenceReview,
  EvidenceSample,
  EvidenceState,
  EvidenceVersion,
  MalwareScanResult
} from "../domain/evidence.js";
import type { Pagination } from "../../../shared/pagination.js";

export interface EvidenceRecord extends EvidenceObject {
  version: number;
  storageUri?: string;
  createdBy: string;
  updatedBy: string;
  updatedAt: Date;
}

export interface EvidenceGraphRecordMetadata {
  classification: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

// evidence_versions/evidence_expiry_events/evidence_custody_events are append-only
// (0021) — created_by/created_at are generated columns; there is no updated_by/updated_at.
export interface EvidenceGraphAppendOnlyMetadata {
  classification: string;
  createdBy: string;
  createdAt: Date;
}

export interface EvidenceVersionRow extends EvidenceVersion, EvidenceGraphAppendOnlyMetadata {}
export interface EvidenceLinkRow extends EvidenceLink, EvidenceGraphRecordMetadata {}
export interface EvidenceRequestRow extends EvidenceRequest, EvidenceGraphRecordMetadata {}
export interface EvidenceReviewRow extends EvidenceReview, EvidenceGraphRecordMetadata {}
export interface AutomatedTestRow extends AutomatedTest, EvidenceGraphRecordMetadata {}
export interface AutomatedTestRunRow extends AutomatedTestRun, EvidenceGraphRecordMetadata {}
export interface EvidenceSampleRow extends EvidenceSample, EvidenceGraphRecordMetadata {}
export interface MalwareScanResultRow extends MalwareScanResult, EvidenceGraphRecordMetadata {}
export interface EvidenceExpiryEventRow extends EvidenceExpiryEvent, EvidenceGraphAppendOnlyMetadata {}
export interface EvidenceCustodyEventRow extends EvidenceCustodyEvent, EvidenceGraphAppendOnlyMetadata {}

export interface EvidenceRepository {
  create(input: { evidence: EvidenceObject; actorId: string }): Promise<EvidenceRecord>;
  list(input: { tenantId: string; state?: EvidenceState; pagination: Pagination }): Promise<EvidenceRecord[]>;
  find(tenantId: string, evidenceId: string): Promise<EvidenceRecord | null>;
  updateState(input: {
    tenantId: string;
    evidence: EvidenceObject;
    actorId: string;
    storageUri?: string;
  }): Promise<EvidenceRecord>;

  createEvidenceVersion(input: { version: EvidenceVersion; actorId: string; contentBytes?: Buffer }): Promise<EvidenceVersionRow>;
  listEvidenceVersions(input: {
    tenantId: string;
    evidenceId: string;
    pagination: Pagination;
  }): Promise<EvidenceVersionRow[]>;
  findEvidenceVersion(tenantId: string, evidenceVersionId: string): Promise<EvidenceVersionRow | null>;
  findEvidenceVersionBytes(tenantId: string, evidenceVersionId: string): Promise<Buffer | null>;

  createEvidenceLink(input: { link: EvidenceLink; actorId: string }): Promise<EvidenceLinkRow>;
  listEvidenceLinks(input: {
    tenantId: string;
    evidenceVersionId: string;
    pagination: Pagination;
  }): Promise<EvidenceLinkRow[]>;

  createEvidenceRequest(input: { request: EvidenceRequest; actorId: string }): Promise<EvidenceRequestRow>;
  listEvidenceRequests(input: {
    tenantId: string;
    assessmentId: string;
    pagination: Pagination;
  }): Promise<EvidenceRequestRow[]>;

  createEvidenceReview(input: { review: EvidenceReview; actorId: string }): Promise<EvidenceReviewRow>;
  listEvidenceReviews(input: {
    tenantId: string;
    evidenceVersionId: string;
    pagination: Pagination;
  }): Promise<EvidenceReviewRow[]>;

  createAutomatedTest(input: { test: AutomatedTest; actorId: string }): Promise<AutomatedTestRow>;
  listAutomatedTests(input: { tenantId: string; pagination: Pagination }): Promise<AutomatedTestRow[]>;
  findAutomatedTest(tenantId: string, automatedTestId: string): Promise<AutomatedTestRow | null>;

  createAutomatedTestRun(input: { run: AutomatedTestRun; actorId: string }): Promise<AutomatedTestRunRow>;
  listAutomatedTestRuns(input: {
    tenantId: string;
    automatedTestId: string;
    pagination: Pagination;
  }): Promise<AutomatedTestRunRow[]>;

  createEvidenceSample(input: { sample: EvidenceSample; actorId: string }): Promise<EvidenceSampleRow>;
  listEvidenceSamples(input: {
    tenantId: string;
    testResultId: string;
    pagination: Pagination;
  }): Promise<EvidenceSampleRow[]>;

  createMalwareScanResult(input: { scan: MalwareScanResult; actorId: string }): Promise<MalwareScanResultRow>;
  listMalwareScanResults(input: {
    tenantId: string;
    evidenceVersionId: string;
    pagination: Pagination;
  }): Promise<MalwareScanResultRow[]>;

  createEvidenceExpiryEvent(input: {
    event: EvidenceExpiryEvent;
    actorId: string;
  }): Promise<EvidenceExpiryEventRow>;
  listEvidenceExpiryEvents(input: {
    tenantId: string;
    evidenceId: string;
    pagination: Pagination;
  }): Promise<EvidenceExpiryEventRow[]>;

  createEvidenceCustodyEvent(input: {
    event: EvidenceCustodyEvent;
    actorId: string;
  }): Promise<EvidenceCustodyEventRow>;
  listEvidenceCustodyEvents(input: {
    tenantId: string;
    evidenceVersionId: string;
    pagination: Pagination;
  }): Promise<EvidenceCustodyEventRow[]>;
}
