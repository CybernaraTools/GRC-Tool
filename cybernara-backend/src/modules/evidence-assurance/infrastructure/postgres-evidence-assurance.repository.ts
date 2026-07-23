import { Inject, Injectable } from "@nestjs/common";
import { TenantScopedDb } from "../../../platform/database/tenant-scoped-db.js";
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
import type {
  AutomatedTestRow,
  AutomatedTestRunRow,
  EvidenceCustodyEventRow,
  EvidenceExpiryEventRow,
  EvidenceLinkRow,
  EvidenceRecord,
  EvidenceRepository,
  EvidenceRequestRow,
  EvidenceReviewRow,
  EvidenceSampleRow,
  EvidenceVersionRow,
  MalwareScanResultRow
} from "../application/evidence-assurance.types.js";

@Injectable()
export class PostgresEvidenceAssuranceRepository implements EvidenceRepository {
  constructor(@Inject(TenantScopedDb) private readonly db: TenantScopedDb) {}

  async create(input: { evidence: EvidenceObject; actorId: string }): Promise<EvidenceRecord> {
    return this.db.withTenant(input.evidence.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          insert into evidence_objects (
            id, tenant_id, owner_id, file_name, state, sha256, period_start, period_end,
            scope_tags, classification, created_by, created_at, updated_by, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10, $11, $12, $11, $12)
          returning ${evidenceColumns()}
        `,
        [
          input.evidence.id,
          input.evidence.tenantId,
          input.evidence.ownerId,
          input.evidence.fileName,
          input.evidence.state,
          input.evidence.sha256 ?? null,
          input.evidence.periodStart,
          input.evidence.periodEnd,
          input.evidence.scopeTags,
          input.evidence.classification,
          input.actorId,
          input.evidence.createdAt
        ]
      );
      return mapEvidence(result.rows[0]);
    });
  }

  async list(input: {
    tenantId: string;
    state?: EvidenceState;
    pagination: { limit: number; offset: number };
  }): Promise<EvidenceRecord[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const values: unknown[] = [input.tenantId, input.pagination.limit, input.pagination.offset];
      const statePredicate = input.state ? "and state = $4" : "";
      if (input.state) {
        values.push(input.state);
      }
      const result = await client.query(
        `
          select ${evidenceColumns()}
          from evidence_objects
          where tenant_id = $1
          ${statePredicate}
          order by created_at desc
          limit $2 offset $3
        `,
        values
      );
      return result.rows.map(mapEvidence);
    });
  }

  async find(tenantId: string, evidenceId: string): Promise<EvidenceRecord | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${evidenceColumns()}
          from evidence_objects
          where tenant_id = $1 and id = $2
        `,
        [tenantId, evidenceId]
      );
      return result.rows[0] ? mapEvidence(result.rows[0]) : null;
    });
  }

  async updateState(input: {
    tenantId: string;
    evidence: EvidenceObject;
    actorId: string;
    storageUri?: string;
  }): Promise<EvidenceRecord> {
    return this.db.withTenant(input.tenantId, input.actorId, async (client) => {
      const result = await client.query(
        `
          update evidence_objects
          set state = $3,
              sha256 = $4,
              storage_uri = $5,
              updated_by = $6,
              updated_at = now(),
              version = version + 1
          where tenant_id = $1 and id = $2
          returning ${evidenceColumns()}
        `,
        [
          input.tenantId,
          input.evidence.id,
          input.evidence.state,
          input.evidence.sha256 ?? null,
          input.storageUri ?? null,
          input.actorId
        ]
      );
      if (!result.rows[0]) {
        throw new Error("Evidence object was not found.");
      }
      return mapEvidence(result.rows[0]);
    });
  }

  async createEvidenceVersion(input: { version: EvidenceVersion; actorId: string; contentBytes?: Buffer }): Promise<EvidenceVersionRow> {
    return this.db.withTenant(input.version.tenantId, input.actorId, async (client) => {
      const v = input.version;
      const result = await client.query(
        `
          insert into evidence_versions (
            id, tenant_id, evidence_id, evidence_version_no, object_uri, sha256, size_bytes,
            mime_type, observed_at, period_start, period_end, uploaded_by, content_bytes
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          returning ${evidenceVersionColumns()}
        `,
        [
          v.id,
          v.tenantId,
          v.evidenceId,
          v.evidenceVersionNo,
          v.objectUri,
          v.sha256,
          v.sizeBytes,
          v.mimeType,
          v.observedAt,
          v.periodStart,
          v.periodEnd,
          v.uploadedBy,
          input.contentBytes ?? null
        ]
      );
      return mapEvidenceVersion(result.rows[0]);
    });
  }

  async listEvidenceVersions(input: {
    tenantId: string;
    evidenceId: string;
    pagination: { limit: number; offset: number };
  }): Promise<EvidenceVersionRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${evidenceVersionColumns()}
          from evidence_versions
          where tenant_id = $1 and evidence_id = $2
          order by evidence_version_no desc
          limit $3 offset $4
        `,
        [input.tenantId, input.evidenceId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapEvidenceVersion);
    });
  }

  async findEvidenceVersion(tenantId: string, evidenceVersionId: string): Promise<EvidenceVersionRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${evidenceVersionColumns()} from evidence_versions where tenant_id = $1 and id = $2`,
        [tenantId, evidenceVersionId]
      );
      return result.rows[0] ? mapEvidenceVersion(result.rows[0]) : null;
    });
  }

  async findEvidenceVersionBytes(tenantId: string, evidenceVersionId: string): Promise<Buffer | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query<{ content_bytes: Buffer | null }>(
        `select content_bytes from evidence_versions where tenant_id = $1 and id = $2`,
        [tenantId, evidenceVersionId]
      );
      return result.rows[0]?.content_bytes ?? null;
    });
  }

  async createEvidenceLink(input: { link: EvidenceLink; actorId: string }): Promise<EvidenceLinkRow> {
    return this.db.withTenant(input.link.tenantId, input.actorId, async (client) => {
      const l = input.link;
      const result = await client.query(
        `
          insert into evidence_links (
            id, tenant_id, evidence_version_id, target_type, target_id, purpose, scope_match,
            period_match, created_by, created_at, updated_by, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $9, now())
          returning ${evidenceLinkColumns()}
        `,
        [l.id, l.tenantId, l.evidenceVersionId, l.targetType, l.targetId, l.purpose, l.scopeMatch, l.periodMatch, input.actorId]
      );
      return mapEvidenceLink(result.rows[0]);
    });
  }

  async listEvidenceLinks(input: {
    tenantId: string;
    evidenceVersionId: string;
    pagination: { limit: number; offset: number };
  }): Promise<EvidenceLinkRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${evidenceLinkColumns()}
          from evidence_links
          where tenant_id = $1 and evidence_version_id = $2
          order by created_at desc
          limit $3 offset $4
        `,
        [input.tenantId, input.evidenceVersionId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapEvidenceLink);
    });
  }

  async createEvidenceRequest(input: { request: EvidenceRequest; actorId: string }): Promise<EvidenceRequestRow> {
    return this.db.withTenant(input.request.tenantId, input.actorId, async (client) => {
      const r = input.request;
      const result = await client.query(
        `
          insert into evidence_requests (
            id, tenant_id, assessment_id, control_instance_id, requested_from, due_at, status,
            instructions, created_by, created_at, updated_by, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $9, now())
          returning ${evidenceRequestColumns()}
        `,
        [r.id, r.tenantId, r.assessmentId, r.controlInstanceId, r.requestedFrom, r.dueAt, r.status, r.instructions ?? null, input.actorId]
      );
      return mapEvidenceRequest(result.rows[0]);
    });
  }

  async listEvidenceRequests(input: {
    tenantId: string;
    assessmentId: string;
    pagination: { limit: number; offset: number };
  }): Promise<EvidenceRequestRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${evidenceRequestColumns()}
          from evidence_requests
          where tenant_id = $1 and assessment_id = $2
          order by due_at asc
          limit $3 offset $4
        `,
        [input.tenantId, input.assessmentId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapEvidenceRequest);
    });
  }

  async createEvidenceReview(input: { review: EvidenceReview; actorId: string }): Promise<EvidenceReviewRow> {
    return this.db.withTenant(input.review.tenantId, input.actorId, async (client) => {
      const r = input.review;
      const result = await client.query(
        `
          insert into evidence_reviews (
            id, tenant_id, evidence_version_id, reviewer_id, decision, rationale, reviewed_at,
            created_by, created_at, updated_by, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, now(), $8, now())
          returning ${evidenceReviewColumns()}
        `,
        [r.id, r.tenantId, r.evidenceVersionId, r.reviewerId, r.decision, r.rationale, r.reviewedAt, input.actorId]
      );
      return mapEvidenceReview(result.rows[0]);
    });
  }

  async listEvidenceReviews(input: {
    tenantId: string;
    evidenceVersionId: string;
    pagination: { limit: number; offset: number };
  }): Promise<EvidenceReviewRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${evidenceReviewColumns()}
          from evidence_reviews
          where tenant_id = $1 and evidence_version_id = $2
          order by reviewed_at desc
          limit $3 offset $4
        `,
        [input.tenantId, input.evidenceVersionId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapEvidenceReview);
    });
  }

  async createAutomatedTest(input: { test: AutomatedTest; actorId: string }): Promise<AutomatedTestRow> {
    return this.db.withTenant(input.test.tenantId, input.actorId, async (client) => {
      const t = input.test;
      const result = await client.query(
        `
          insert into automated_tests (
            id, tenant_id, control_id, connector_type, query_template, schedule, severity,
            created_by, created_at, updated_by, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, now(), $8, now())
          returning ${automatedTestColumns()}
        `,
        [t.id, t.tenantId, t.controlId, t.connectorType, t.queryTemplate, t.schedule, t.severity, input.actorId]
      );
      return mapAutomatedTest(result.rows[0]);
    });
  }

  async listAutomatedTests(input: {
    tenantId: string;
    pagination: { limit: number; offset: number };
  }): Promise<AutomatedTestRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${automatedTestColumns()}
          from automated_tests
          where tenant_id = $1
          order by created_at desc
          limit $2 offset $3
        `,
        [input.tenantId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapAutomatedTest);
    });
  }

  async findAutomatedTest(tenantId: string, automatedTestId: string): Promise<AutomatedTestRow | null> {
    return this.db.withTenant(tenantId, undefined, async (client) => {
      const result = await client.query(
        `select ${automatedTestColumns()} from automated_tests where tenant_id = $1 and id = $2`,
        [tenantId, automatedTestId]
      );
      return result.rows[0] ? mapAutomatedTest(result.rows[0]) : null;
    });
  }

  async createAutomatedTestRun(input: { run: AutomatedTestRun; actorId: string }): Promise<AutomatedTestRunRow> {
    return this.db.withTenant(input.run.tenantId, input.actorId, async (client) => {
      const r = input.run;
      const result = await client.query(
        `
          insert into automated_test_runs (
            id, tenant_id, automated_test_id, connector_id, started_at, finished_at, status,
            result_json, source_watermark, idempotency_key, created_by, created_at, updated_by, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, now(), $11, now())
          returning ${automatedTestRunColumns()}
        `,
        [
          r.id,
          r.tenantId,
          r.automatedTestId,
          r.connectorId,
          r.startedAt,
          r.finishedAt ?? null,
          r.status,
          JSON.stringify(r.resultJson),
          r.sourceWatermark ?? null,
          r.idempotencyKey,
          input.actorId
        ]
      );
      return mapAutomatedTestRun(result.rows[0]);
    });
  }

  async listAutomatedTestRuns(input: {
    tenantId: string;
    automatedTestId: string;
    pagination: { limit: number; offset: number };
  }): Promise<AutomatedTestRunRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${automatedTestRunColumns()}
          from automated_test_runs
          where tenant_id = $1 and automated_test_id = $2
          order by started_at desc
          limit $3 offset $4
        `,
        [input.tenantId, input.automatedTestId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapAutomatedTestRun);
    });
  }

  async createEvidenceSample(input: { sample: EvidenceSample; actorId: string }): Promise<EvidenceSampleRow> {
    return this.db.withTenant(input.sample.tenantId, input.actorId, async (client) => {
      const s = input.sample;
      const result = await client.query(
        `
          insert into evidence_samples (
            id, tenant_id, test_result_id, population_ref, method, sample_size, sample_json, seed,
            created_by, created_at, updated_by, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, now(), $9, now())
          returning ${evidenceSampleColumns()}
        `,
        [s.id, s.tenantId, s.testResultId, s.populationRef, s.method, s.sampleSize, JSON.stringify(s.sampleJson), s.seed ?? null, input.actorId]
      );
      return mapEvidenceSample(result.rows[0]);
    });
  }

  async listEvidenceSamples(input: {
    tenantId: string;
    testResultId: string;
    pagination: { limit: number; offset: number };
  }): Promise<EvidenceSampleRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${evidenceSampleColumns()}
          from evidence_samples
          where tenant_id = $1 and test_result_id = $2
          order by created_at desc
          limit $3 offset $4
        `,
        [input.tenantId, input.testResultId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapEvidenceSample);
    });
  }

  async createMalwareScanResult(input: { scan: MalwareScanResult; actorId: string }): Promise<MalwareScanResultRow> {
    return this.db.withTenant(input.scan.tenantId, input.actorId, async (client) => {
      const m = input.scan;
      const result = await client.query(
        `
          insert into malware_scan_results (
            id, tenant_id, evidence_version_id, engine, signature_version, status, details_hash,
            scanned_at, created_by, created_at, updated_by, updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $9, now())
          returning ${malwareScanResultColumns()}
        `,
        [m.id, m.tenantId, m.evidenceVersionId, m.engine, m.signatureVersion, m.status, m.detailsHash ?? null, m.scannedAt, input.actorId]
      );
      return mapMalwareScanResult(result.rows[0]);
    });
  }

  async listMalwareScanResults(input: {
    tenantId: string;
    evidenceVersionId: string;
    pagination: { limit: number; offset: number };
  }): Promise<MalwareScanResultRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${malwareScanResultColumns()}
          from malware_scan_results
          where tenant_id = $1 and evidence_version_id = $2
          order by scanned_at desc
          limit $3 offset $4
        `,
        [input.tenantId, input.evidenceVersionId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapMalwareScanResult);
    });
  }

  async createEvidenceExpiryEvent(input: {
    event: EvidenceExpiryEvent;
    actorId: string;
  }): Promise<EvidenceExpiryEventRow> {
    return this.db.withTenant(input.event.tenantId, input.actorId, async (client) => {
      const e = input.event;
      const result = await client.query(
        `
          insert into evidence_expiry_events (
            id, tenant_id, evidence_id, previous_state, new_state, reason, actor_id, occurred_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8)
          returning ${evidenceExpiryEventColumns()}
        `,
        [e.id, e.tenantId, e.evidenceId, e.previousState, e.newState, e.reason, e.actorId, e.occurredAt]
      );
      return mapEvidenceExpiryEvent(result.rows[0]);
    });
  }

  async listEvidenceExpiryEvents(input: {
    tenantId: string;
    evidenceId: string;
    pagination: { limit: number; offset: number };
  }): Promise<EvidenceExpiryEventRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${evidenceExpiryEventColumns()}
          from evidence_expiry_events
          where tenant_id = $1 and evidence_id = $2
          order by occurred_at desc
          limit $3 offset $4
        `,
        [input.tenantId, input.evidenceId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapEvidenceExpiryEvent);
    });
  }

  async createEvidenceCustodyEvent(input: {
    event: EvidenceCustodyEvent;
    actorId: string;
  }): Promise<EvidenceCustodyEventRow> {
    return this.db.withTenant(input.event.tenantId, input.actorId, async (client) => {
      const e = input.event;
      const result = await client.query(
        `
          insert into evidence_custody_events (
            id, tenant_id, evidence_version_id, event_type, actor_id, location_ref, event_hash, occurred_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8)
          returning ${evidenceCustodyEventColumns()}
        `,
        [e.id, e.tenantId, e.evidenceVersionId, e.eventType, e.actorId, e.locationRef, e.eventHash, e.occurredAt]
      );
      return mapEvidenceCustodyEvent(result.rows[0]);
    });
  }

  async listEvidenceCustodyEvents(input: {
    tenantId: string;
    evidenceVersionId: string;
    pagination: { limit: number; offset: number };
  }): Promise<EvidenceCustodyEventRow[]> {
    return this.db.withTenant(input.tenantId, undefined, async (client) => {
      const result = await client.query(
        `
          select ${evidenceCustodyEventColumns()}
          from evidence_custody_events
          where tenant_id = $1 and evidence_version_id = $2
          order by occurred_at desc
          limit $3 offset $4
        `,
        [input.tenantId, input.evidenceVersionId, input.pagination.limit, input.pagination.offset]
      );
      return result.rows.map(mapEvidenceCustodyEvent);
    });
  }
}

function evidenceColumns(): string {
  return `
    id, tenant_id, version, owner_id, file_name, storage_uri, state, sha256,
    period_start, period_end, scope_tags, classification, created_by, created_at, updated_by, updated_at
  `;
}

function mapEvidence(row: Record<string, unknown>): EvidenceRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    version: Number(row.version),
    ownerId: String(row.owner_id),
    fileName: String(row.file_name),
    storageUri: (row.storage_uri as string | null) ?? undefined,
    state: row.state as EvidenceState,
    sha256: (row.sha256 as string | null) ?? undefined,
    periodStart: new Date(String(row.period_start)),
    periodEnd: new Date(String(row.period_end)),
    scopeTags: (row.scope_tags as string[] | null) ?? [],
    classification: row.classification as EvidenceRecord["classification"],
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date,
    committedAt: row.state === "committed" ? (row.updated_at as Date) : undefined
  };
}

function recordMetadata(row: Record<string, unknown>) {
  return {
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date,
    updatedBy: String(row.updated_by),
    updatedAt: row.updated_at as Date
  };
}

// evidence_versions/evidence_expiry_events/evidence_custody_events are append-only (0021) — no
// updated_by/updated_at column exists.
function appendOnlyMetadata(row: Record<string, unknown>) {
  return {
    classification: String(row.classification),
    createdBy: String(row.created_by),
    createdAt: row.created_at as Date
  };
}

function evidenceVersionColumns(): string {
  return `
    id, tenant_id, evidence_id, evidence_version_no, object_uri, sha256, size_bytes, mime_type,
    observed_at, period_start, period_end, uploaded_by, content_bytes is not null as content_available,
    classification, created_by, created_at
  `;
}

function mapEvidenceVersion(row: Record<string, unknown>): EvidenceVersionRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    evidenceId: String(row.evidence_id),
    evidenceVersionNo: Number(row.evidence_version_no),
    objectUri: String(row.object_uri),
    sha256: String(row.sha256),
    sizeBytes: Number(row.size_bytes),
    mimeType: String(row.mime_type),
    observedAt: row.observed_at as Date,
    periodStart: new Date(String(row.period_start)),
    periodEnd: new Date(String(row.period_end)),
    uploadedBy: String(row.uploaded_by),
    contentAvailable: row.content_available === true,
    ...appendOnlyMetadata(row)
  };
}

function evidenceLinkColumns(): string {
  return `
    id, tenant_id, evidence_version_id, target_type, target_id, purpose, scope_match,
    period_match, classification, created_by, created_at, updated_by, updated_at
  `;
}

function mapEvidenceLink(row: Record<string, unknown>): EvidenceLinkRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    evidenceVersionId: String(row.evidence_version_id),
    targetType: row.target_type as EvidenceLinkRow["targetType"],
    targetId: String(row.target_id),
    purpose: String(row.purpose),
    scopeMatch: Boolean(row.scope_match),
    periodMatch: Boolean(row.period_match),
    ...recordMetadata(row)
  };
}

function evidenceRequestColumns(): string {
  return `
    id, tenant_id, assessment_id, control_instance_id, requested_from, due_at, status,
    instructions, classification, created_by, created_at, updated_by, updated_at
  `;
}

function mapEvidenceRequest(row: Record<string, unknown>): EvidenceRequestRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    assessmentId: String(row.assessment_id),
    controlInstanceId: String(row.control_instance_id),
    requestedFrom: String(row.requested_from),
    dueAt: row.due_at as Date,
    status: row.status as EvidenceRequestRow["status"],
    instructions: (row.instructions as string | null) ?? undefined,
    ...recordMetadata(row)
  };
}

function evidenceReviewColumns(): string {
  return `
    id, tenant_id, evidence_version_id, reviewer_id, decision, rationale, reviewed_at,
    classification, created_by, created_at, updated_by, updated_at
  `;
}

function mapEvidenceReview(row: Record<string, unknown>): EvidenceReviewRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    evidenceVersionId: String(row.evidence_version_id),
    reviewerId: String(row.reviewer_id),
    decision: row.decision as EvidenceReviewRow["decision"],
    rationale: String(row.rationale),
    reviewedAt: row.reviewed_at as Date,
    ...recordMetadata(row)
  };
}

function automatedTestColumns(): string {
  return `
    id, tenant_id, control_id, connector_type, query_template, schedule, severity,
    classification, created_by, created_at, updated_by, updated_at
  `;
}

function mapAutomatedTest(row: Record<string, unknown>): AutomatedTestRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    controlId: String(row.control_id),
    connectorType: String(row.connector_type),
    queryTemplate: String(row.query_template),
    schedule: String(row.schedule),
    severity: row.severity as AutomatedTestRow["severity"],
    ...recordMetadata(row)
  };
}

function automatedTestRunColumns(): string {
  return `
    id, tenant_id, automated_test_id, connector_id, started_at, finished_at, status, result_json,
    source_watermark, idempotency_key, classification, created_by, created_at, updated_by, updated_at
  `;
}

function mapAutomatedTestRun(row: Record<string, unknown>): AutomatedTestRunRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    automatedTestId: String(row.automated_test_id),
    connectorId: String(row.connector_id),
    startedAt: row.started_at as Date,
    finishedAt: (row.finished_at as Date | null) ?? undefined,
    status: row.status as AutomatedTestRunRow["status"],
    resultJson: (row.result_json as Record<string, unknown>) ?? {},
    sourceWatermark: (row.source_watermark as string | null) ?? undefined,
    idempotencyKey: String(row.idempotency_key),
    ...recordMetadata(row)
  };
}

function evidenceSampleColumns(): string {
  return `
    id, tenant_id, test_result_id, population_ref, method, sample_size, sample_json, seed,
    classification, created_by, created_at, updated_by, updated_at
  `;
}

function mapEvidenceSample(row: Record<string, unknown>): EvidenceSampleRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    testResultId: String(row.test_result_id),
    populationRef: String(row.population_ref),
    method: row.method as EvidenceSampleRow["method"],
    sampleSize: Number(row.sample_size),
    sampleJson: (row.sample_json as unknown[]) ?? [],
    seed: (row.seed as string | null) ?? undefined,
    ...recordMetadata(row)
  };
}

function malwareScanResultColumns(): string {
  return `
    id, tenant_id, evidence_version_id, engine, signature_version, status, details_hash,
    scanned_at, classification, created_by, created_at, updated_by, updated_at
  `;
}

function mapMalwareScanResult(row: Record<string, unknown>): MalwareScanResultRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    evidenceVersionId: String(row.evidence_version_id),
    engine: String(row.engine),
    signatureVersion: String(row.signature_version),
    status: row.status as MalwareScanResultRow["status"],
    detailsHash: (row.details_hash as string | null) ?? undefined,
    scannedAt: row.scanned_at as Date,
    ...recordMetadata(row)
  };
}

function evidenceExpiryEventColumns(): string {
  return `
    id, tenant_id, evidence_id, previous_state, new_state, reason, actor_id, occurred_at,
    classification, created_by, created_at
  `;
}

function mapEvidenceExpiryEvent(row: Record<string, unknown>): EvidenceExpiryEventRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    evidenceId: String(row.evidence_id),
    previousState: String(row.previous_state),
    newState: String(row.new_state),
    reason: String(row.reason),
    actorId: String(row.actor_id),
    occurredAt: row.occurred_at as Date,
    ...appendOnlyMetadata(row)
  };
}

function evidenceCustodyEventColumns(): string {
  return `
    id, tenant_id, evidence_version_id, event_type, actor_id, location_ref, event_hash, occurred_at,
    classification, created_by, created_at
  `;
}

function mapEvidenceCustodyEvent(row: Record<string, unknown>): EvidenceCustodyEventRow {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    evidenceVersionId: String(row.evidence_version_id),
    eventType: row.event_type as EvidenceCustodyEventRow["eventType"],
    actorId: String(row.actor_id),
    locationRef: String(row.location_ref),
    eventHash: String(row.event_hash),
    occurredAt: row.occurred_at as Date,
    ...appendOnlyMetadata(row)
  };
}

