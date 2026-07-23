import "dotenv/config";
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import {
  createAssessment,
  type AssessmentService,
  type AssessmentRecord
} from "../../src/modules/assessment/public.js";
import { PostgresAssessmentRepository } from "../../src/modules/assessment/infrastructure/postgres-assessment.repository.js";
import type { AuditEventInput, AuditLogService } from "../../src/modules/audit-security/public.js";
import { createOutboxEvent } from "../../src/modules/outbox/domain/outbox-event.js";
import type { OutboxEvent, OutboxService } from "../../src/modules/outbox/public.js";
import {
  ReportingAnalyticsService,
  renderAssessmentPdf,
  reportIdempotencyKey,
  type ReportExportRecord,
  type ReportingAnalyticsRepository
} from "../../src/modules/reporting-analytics/public.js";
import { PostgresReportingAnalyticsRepository } from "../../src/modules/reporting-analytics/infrastructure/postgres-reporting-analytics.repository.js";
import { TenantScopedDb } from "../../src/platform/database/tenant-scoped-db.js";
import { DATABASE_POOL } from "../../src/platform/database/tokens.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";
import { approvedControlRefForTenant, approvedControlSelectionForTenant } from "../helpers/question-repository-fixture.js";

const actorId = randomUUID();
const ownerId = randomUUID();
const tenantId = randomUUID();
const templateVersion = "m2-readiness-v1";

let app: INestApplication;
let baseUrl: string;
let appPool: pg.Pool;
const repositoryPool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
const repositoryDb = new TenantScopedDb(repositoryPool);

beforeAll(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidUnknownValues: true,
      transform: true
    })
  );
  await app.listen(0);
  appPool = app.get<pg.Pool>(DATABASE_POOL);
  const address = app.getHttpServer().address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
}, 120_000);

afterAll(async () => {
  await app.close();
  await appPool.end();
  await repositoryPool.end();
});

describe("A4 ReportingAnalytics repository", () => {
  it("persists report export metadata idempotently against real Supabase", async () => {
    // G-09-session note: PostgresAssessmentRepository.createAssessment now also
    // resolves canonical requirement ids and writes requirement_instances/
    // question_sets/question_versions (G-01 completion, 0017), pushing this
    // real-Supabase call chain past the default 5000ms vitest timeout — same
    // documented pattern as the 30_000ms bumps already applied elsewhere in
    // this suite (a3-evidence-risk-api.test.ts, a7-privacy-api.test.ts).
    const assessmentRepository = new PostgresAssessmentRepository(repositoryDb);
    const reportRepository = new PostgresReportingAnalyticsRepository(repositoryDb);
    const repositoryTenantId = randomUUID();
    const assessment = createAssessment({
      tenantId: repositoryTenantId,
      scopeName: "Repository A4",
      createdBy: actorId,
      ownerId,
      controls: [await approvedControlRefForTenant({ pool: repositoryPool, tenantId: repositoryTenantId, actorId })]
    });
    const persistedAssessment = await assessmentRepository.createAssessment({
      assessment,
      periodStart: new Date("2026-01-01T00:00:00.000Z"),
      periodEnd: new Date("2026-12-31T00:00:00.000Z")
    });
    const artifact = await renderAssessmentPdf(persistedAssessment, templateVersion);
    const exportId = randomUUID();
    const persistedExport = await reportRepository.createExport({
      id: exportId,
      tenantId: persistedAssessment.tenantId,
      assessmentId: persistedAssessment.id,
      snapshotId: persistedAssessment.controlSnapshotVersion,
      templateVersion,
      format: artifact.format,
      idempotencyKey: artifact.idempotencyKey,
      sha256: artifact.sha256,
      storageUri: `/v1/report-exports/${exportId}/download`,
      actorId
    });

    const reloaded = await reportRepository.findByIdempotencyKey(
      persistedAssessment.tenantId,
      artifact.idempotencyKey
    );
    expect(reloaded?.id).toBe(persistedExport.id);
    expect(reloaded?.sha256).toBe(artifact.sha256);
  }, 30_000);
});

describe("A4 ReportingAnalytics service orchestration", () => {
  it("renders, stores, deduplicates, and emits one outbox/audit side effect", async () => {
    const assessment = assessmentRecord(randomUUID());
    const repository = new InMemoryReportingRepository();
    const outbox = new InMemoryOutbox();
    const audit = new InMemoryAuditLog();
    const service = new ReportingAnalyticsService(
      repository,
      { get: async () => assessment } as unknown as AssessmentService,
      outbox as unknown as OutboxService,
      audit as unknown as AuditLogService
    );
    const idempotencyKey = reportIdempotencyKey({
      snapshotId: assessment.controlSnapshotVersion,
      templateVersion,
      format: "pdf"
    });
    const input = {
      tenantId: assessment.tenantId,
      actorId,
      requestIdempotencyKey: idempotencyKey,
      assessmentId: assessment.id,
      snapshotId: assessment.controlSnapshotVersion,
      templateVersion,
      format: "pdf" as const
    };

    const first = await service.requestExport(input);
    const second = await service.requestExport(input);

    expect(second.id).toBe(first.id);
    expect(repository.records.size).toBe(1);
    expect(outbox.events).toHaveLength(1);
    expect(audit.events).toHaveLength(1);
    expect(first.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("A4 ReportingAnalytics HTTP exposure", () => {
  it("rejects missing context, missing scopes, and missing idempotency keys", async () => {
    const unauthenticated = await fetch(`${baseUrl}/v1/report-exports`);
    expect(unauthenticated.status).toBe(401);

    const unauthorized = await fetch(`${baseUrl}/v1/report-exports`, {
      headers: headers("assessment:read")
    });
    expect(unauthorized.status).toBe(403);

    const assessment = await createAssessmentForReport();
    const missingIdempotency = await fetch(`${baseUrl}/v1/report-exports`, {
      method: "POST",
      headers: headers("report_export:write"),
      body: JSON.stringify(exportBody(assessment, "pdf"))
    });
    expect(missingIdempotency.status).toBe(400);
  }, 120_000);

  it("requests, polls, and downloads PDF/XLSX exports idempotently", async () => {
    const assessment = await createAssessmentForReport();
    const pdfKey = reportIdempotencyKey({
      snapshotId: assessment.controlSnapshotVersion,
      templateVersion,
      format: "pdf"
    });
    const firstPdf = await requestJson(
      "POST",
      "/v1/report-exports",
      exportBody(assessment, "pdf"),
      "report_export:write",
      pdfKey
    );
    const secondPdf = await requestJson(
      "POST",
      "/v1/report-exports",
      exportBody(assessment, "pdf"),
      "report_export:write",
      pdfKey
    );
    expect(firstPdf.status).toBe(201);
    expect(secondPdf.status).toBe(201);
    const pdfExport = (await firstPdf.json()) as ReportExportResponse;
    expect(((await secondPdf.json()) as ReportExportResponse).id).toBe(pdfExport.id);

    // G-10 cutover note: appPool now connects as the RLS-scoped app_runtime
    // role, so this test-assertion helper query uses the owner-role
    // repositoryPool instead of appPool.
    const outboxCount = await repositoryPool.query(
      `select count(*)::int as count from outbox_events where tenant_id = $1 and idempotency_key = $2`,
      [tenantId, pdfKey]
    );
    expect(outboxCount.rows[0].count).toBe(1);

    const polled = await getJson<ReportExportResponse>(`/v1/report-exports/${pdfExport.id}`, "report_export:read");
    expect(polled.sha256).toBe(pdfExport.sha256);

    const pdfDownload = await fetch(`${baseUrl}/v1/report-exports/${pdfExport.id}/download`, {
      headers: headers("report_export:read")
    });
    expect(pdfDownload.status).toBe(200);
    expect(pdfDownload.headers.get("content-type")).toContain("application/pdf");
    expect((await pdfDownload.arrayBuffer()).byteLength).toBeGreaterThan(100);

    const xlsxKey = reportIdempotencyKey({
      snapshotId: assessment.controlSnapshotVersion,
      templateVersion,
      format: "xlsx"
    });
    const xlsxResponse = await requestJson(
      "POST",
      "/v1/report-exports",
      exportBody(assessment, "xlsx"),
      "report_export:write",
      xlsxKey
    );
    expect(xlsxResponse.status).toBe(201);
    const xlsxExport = (await xlsxResponse.json()) as ReportExportResponse;
    const xlsxDownload = await fetch(`${baseUrl}/v1/report-exports/${xlsxExport.id}/download`, {
      headers: headers("report_export:read")
    });
    expect(xlsxDownload.status).toBe(200);
    expect((await xlsxDownload.arrayBuffer()).byteLength).toBeGreaterThan(100);

    const listed = await getJson<ReportExportResponse[]>(
      `/v1/report-exports?assessmentId=${assessment.id}`,
      "report_export:read"
    );
    expect(listed.some((entry) => entry.id === pdfExport.id)).toBe(true);
    expect(listed.some((entry) => entry.id === xlsxExport.id)).toBe(true);
  }, 120_000);
});

interface AssessmentResponse {
  id: string;
  controlSnapshotVersion: string;
}

interface ReportExportResponse {
  id: string;
  sha256: string;
}

function controlRef() {
  return {
    frameworkKey: "SOC2",
    frameworkVersion: "b01c65d04ae5",
    mappingVersion: "m1-harmonization",
    controlId: "CC6.1",
    harmonizedControlId: "HARM-00002",
    questionVersion: "curated-baseline-v1"
  };
}

function assessmentRecord(tenant: string): AssessmentRecord {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  return {
    id: randomUUID(),
    tenantId: tenant,
    version: 1,
    scopeName: "A4 service readiness",
    status: "approved",
    controlSnapshotVersion: reportSnapshot(),
    periodStart: new Date("2026-01-01T00:00:00.000Z"),
    periodEnd: new Date("2026-12-31T00:00:00.000Z"),
    items: [
      {
        id: randomUUID(),
        ownerId,
        status: "approved",
        answerText: "Control evidence approved.",
        evidenceIds: [randomUUID()],
        applicability: {
          applicable: true,
          rationale: "Applies",
          approvedBy: actorId,
          approvedAt: createdAt
        },
        controlRef: controlRef()
      }
    ],
    classification: "confidential",
    createdBy: actorId,
    createdAt,
    updatedBy: actorId,
    updatedAt: createdAt
  };
}

function reportSnapshot(): string {
  const ref = controlRef();
  return [
    ref.frameworkKey,
    ref.frameworkVersion,
    ref.mappingVersion,
    ref.controlId,
    ref.harmonizedControlId,
    ref.questionVersion
  ].join(":");
}

async function assessmentBody() {
  return {
    scopeName: "A4 reporting readiness",
    ownerId,
    periodStart: "2026-01-01",
    periodEnd: "2026-12-31",
    controls: [await approvedControlSelectionForTenant({ pool: repositoryPool, tenantId, actorId })]
  };
}

function exportBody(assessment: AssessmentResponse, format: "pdf" | "xlsx") {
  return {
    assessmentId: assessment.id,
    snapshotId: assessment.controlSnapshotVersion,
    templateVersion,
    format
  };
}

async function createAssessmentForReport(): Promise<AssessmentResponse> {
  const response = await requestJson(
    "POST",
    "/v1/assessments",
    await assessmentBody(),
    "assessment:write",
    `a4-report-assessment-${randomUUID()}`
  );
  expect(response.status).toBe(201);
  return (await response.json()) as AssessmentResponse;
}

function headers(scopes: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-tenant-id": tenantId,
    "x-user-id": actorId,
    "x-user-clearance": "restricted",
    "x-user-scopes": scopes
  };
}

async function requestJson(
  method: "POST",
  route: string,
  body: unknown,
  scopes: string,
  idempotencyKey?: string
): Promise<Response> {
  return fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      ...headers(scopes),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
    },
    body: JSON.stringify(body)
  });
}

async function getJson<T>(route: string, scopes: string): Promise<T> {
  const response = await fetch(`${baseUrl}${route}`, { headers: headers(scopes) });
  expect(response.status).toBe(200);
  return (await response.json()) as T;
}

class InMemoryOutbox {
  readonly events: OutboxEvent[] = [];

  async findByIdempotencyKey(tenant: string, idempotencyKey: string): Promise<OutboxEvent | null> {
    return this.events.find((event) => event.tenantId === tenant && event.idempotencyKey === idempotencyKey) ?? null;
  }

  async publish(input: {
    tenantId: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    payload: Record<string, unknown>;
    idempotencyKey: string;
    createdBy: string;
    now?: Date;
  }): Promise<OutboxEvent> {
    const existing = await this.findByIdempotencyKey(input.tenantId, input.idempotencyKey);
    if (existing) {
      return existing;
    }
    const event = createOutboxEvent(input);
    this.events.push(event);
    return event;
  }
}

class InMemoryAuditLog {
  readonly events: AuditEventInput[] = [];

  async append(input: AuditEventInput): Promise<AuditEventInput> {
    this.events.push(input);
    return input;
  }
}

class InMemoryReportingRepository implements ReportingAnalyticsRepository {
  readonly records = new Map<string, ReportExportRecord>();
  // G-04: mirrors the real repository's separate lean-query split (artifact_bytes is
  // never carried on the ReportExportRecord itself, see postgres-reporting-analytics.repository.ts).
  readonly artifactBytesByExportId = new Map<string, Buffer>();
  readonly manifests: Array<{ reportExportId: string; manifestHash: string }> = [];

  async createExport(input: {
    id: string;
    tenantId: string;
    assessmentId: string;
    snapshotId: string;
    templateVersion: string;
    format: "pdf" | "xlsx";
    idempotencyKey: string;
    sha256: string;
    storageUri: string;
    actorId: string;
    assessmentSnapshotId?: string;
    reportTemplateId?: string;
    artifactBytes?: Buffer;
    signature?: string;
    completedAt?: Date;
  }): Promise<ReportExportRecord> {
    const existing = await this.findByIdempotencyKey(input.tenantId, input.idempotencyKey);
    if (existing) {
      return existing;
    }
    const now = new Date();
    const record: ReportExportRecord = {
      id: input.id,
      tenantId: input.tenantId,
      version: 1,
      assessmentId: input.assessmentId,
      snapshotId: input.snapshotId,
      templateVersion: input.templateVersion,
      format: input.format,
      idempotencyKey: input.idempotencyKey,
      sha256: input.sha256,
      storageUri: input.storageUri,
      assessmentSnapshotId: input.assessmentSnapshotId,
      reportTemplateId: input.reportTemplateId,
      completedAt: input.completedAt,
      classification: "confidential",
      createdBy: input.actorId,
      createdAt: now,
      updatedBy: input.actorId,
      updatedAt: now
    };
    this.records.set(record.id, record);
    if (input.artifactBytes) {
      this.artifactBytesByExportId.set(record.id, input.artifactBytes);
    }
    return record;
  }

  async listExports(): Promise<ReportExportRecord[]> {
    return [...this.records.values()];
  }

  async findExport(tenant: string, exportId: string): Promise<ReportExportRecord | null> {
    const record = this.records.get(exportId);
    return record?.tenantId === tenant ? record : null;
  }

  async findByIdempotencyKey(tenant: string, idempotencyKey: string): Promise<ReportExportRecord | null> {
    return (
      [...this.records.values()].find(
        (record) => record.tenantId === tenant && record.idempotencyKey === idempotencyKey
      ) ?? null
    );
  }

  async findArtifactBytes(tenant: string, exportId: string): Promise<Buffer | null> {
    const record = this.records.get(exportId);
    if (record?.tenantId !== tenant) {
      return null;
    }
    return this.artifactBytesByExportId.get(exportId) ?? null;
  }

  async findLatestAssessmentSnapshotId(): Promise<string | null> {
    return null;
  }

  async upsertReportTemplate(): Promise<string> {
    return randomUUID();
  }

  async createExportManifest(input: { reportExportId: string; manifestHash: string }): Promise<void> {
    this.manifests.push({ reportExportId: input.reportExportId, manifestHash: input.manifestHash });
  }
}
