import "dotenv/config";
import { randomUUID } from "node:crypto";
import path from "node:path";
import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import type { AuditLogService } from "../../src/modules/audit-security/public.js";
import { ContentIngestionService } from "../../src/modules/framework-content/application/content-ingestion.service.js";
import type {
  ContentRowCounts,
  FrameworkContentRepository,
  PublishedContentIngestion
} from "../../src/modules/framework-content/public.js";
import { PostgresFrameworkContentRepository } from "../../src/modules/framework-content/infrastructure/postgres-framework-content.repository.js";
import { TenantScopedDb } from "../../src/platform/database/tenant-scoped-db.js";
import type { OutboxService } from "../../src/modules/outbox/public.js";

const actorId = "00000000-0000-4000-8000-000000000002";
const sourcesDir = path.resolve(process.cwd(), "sources");
const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
const repositoryDb = new TenantScopedDb(pool);

// G-05 fix: this test publishes synthetic fixture content (deliberately fake framework key
// "TEST" / hash "aaaa...a", not the real catalog) under a fresh tenant per run, to test
// publishIngestion's own idempotency mechanics in isolation from the real corpus. Since this
// tenant is disposable-by-design (not the canonical shared-catalog identity), it must clean up
// after itself rather than accumulate one throwaway tenant's worth of rows in the live database
// on every test run - this is exactly the pattern missing that let the G-05 duplication incident
// happen (see docs/schema-remediation-report.md).
const generatedTenantIds: string[] = [];

afterAll(async () => {
  if (generatedTenantIds.length > 0) {
    for (const table of [
      "mapping_reviews",
      "mapping_conflicts",
      "control_mappings",
      "framework_requirements",
      "control_subcontrols",
      "controls",
      "control_sets",
      "framework_content_packs",
      "framework_versions",
      "frameworks",
      "mapping_versions",
      "content_rejected_records",
      "harmonized_controls",
      "content_source_packages"
    ]) {
      await pool.query(`delete from ${table} where tenant_id = any($1::uuid[])`, [generatedTenantIds]);
    }
  }
  await pool.end();
});

describe("A1 FrameworkContent persistence", () => {
  it("publishes content, harmonization, and rejects to the real Supabase schema idempotently", async () => {
    const tenantId = randomUUID();
    generatedTenantIds.push(tenantId);
    const repository = new PostgresFrameworkContentRepository(repositoryDb);
    const input = minimalPublishInput(tenantId);

    const first = await repository.publishIngestion(input);
    const second = await repository.publishIngestion(input);
    const counts = await repository.countRows(tenantId);

    expect(first).toMatchObject({
      sourcePackageCount: 1,
      contentPackCount: 1,
      requirementCount: 1,
      harmonizedControlCount: 1,
      mappingCount: 1,
      rejectedRecordCount: 1
    });
    expect(second.contentPackIds).toEqual(first.contentPackIds);
    expect(counts).toEqual({
      contentSourcePackages: 1,
      frameworkContentPacks: 1,
      frameworkRequirements: 1,
      harmonizedControls: 1,
      controlMappings: 1,
      contentRejectedRecords: 1
    });

    const packs = await repository.listContentPacks(tenantId, { limit: 10, offset: 0 });
    const requirements = await repository.listRequirements({
      tenantId,
      packId: packs[0]?.id,
      pagination: { limit: 10, offset: 0 }
    });
    const rejected = await repository.listRejectedRecords(tenantId, { limit: 10, offset: 0 });

    expect(packs).toHaveLength(1);
    expect(requirements).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  }, 30_000);
});

describe("A1 FrameworkContent service orchestration", () => {
  it("parses real workbooks, persists through the repository, and emits outbox/audit side effects", async () => {
    const repository = new RecordingFrameworkContentRepository();
    const outbox = new RecordingOutboxService();
    const audit = new RecordingAuditLogService();
    const service = new ContentIngestionService(
      repository,
      outbox as unknown as OutboxService,
      audit as unknown as AuditLogService
    );

    const result = await service.publishSources({
      tenantId: randomUUID(),
      actorId,
      idempotencyKey: "a1-service-unit",
      sourcesDir
    });

    expect(repository.lastPublished?.packs.length).toBe(13);
    expect(repository.lastPublished?.harmonization.mappings.length).toBeGreaterThan(100);
    expect(outbox.published).toHaveLength(1);
    expect(audit.appended).toHaveLength(1);
    expect(result.published.contentPackCount).toBe(13);
    expect(result.parsed.acceptedMappingCount).toBeGreaterThan(100);
  }, 30_000);
});

function minimalPublishInput(tenantId: string): Parameters<FrameworkContentRepository["publishIngestion"]>[0] {
  return {
    tenantId,
    actorId,
    packs: [
      {
        frameworkKey: "TEST",
        version: "v1",
        sourceWorkbook: "TEST_Controls.xlsx",
        sourceChecksum: "a".repeat(64),
        requirementCount: 1,
        controlCount: 1,
        subControlCount: 0,
        signature: "b".repeat(64),
        requirements: [
          {
            frameworkKey: "TEST",
            controlId: "TEST-1",
            controlTitle: "Test control",
            subControlId: null,
            subControlTitle: null,
            requirementText: "Test requirement",
            citation: "T1",
            category: "Test",
            source: {
              workbookFile: "TEST_Controls.xlsx",
              sheetName: "Controls",
              rowNumber: 2,
              sourceChecksum: "a".repeat(64)
            },
            raw: { "Control ID": "TEST-1" }
          }
        ],
        rejectedRecords: []
      }
    ],
    harmonization: {
      controls: [
        {
          harmonizedId: "H-TEST-1",
          domain: "Test",
          controlName: "Harmonized test",
          controlDescription: "Harmonized control for testing",
          sourceWorkbook: "TEST_Harmonization.xlsx",
          sourceSheet: "Master Control Library",
          sourceRowNumber: 2
        }
      ],
      mappings: [
        {
          sourceWorkbook: "TEST_Harmonization.xlsx",
          frameworkKey: "TEST",
          sourceControlId: "TEST-1",
          targetControlId: "H-TEST-1",
          classification: "mapped",
          coverage: "full",
          confidence: "high",
          rationale: "Same control intent",
          reviewer: "unit-test",
          sourceSheet: "Traceability Matrix",
          sourceRowNumber: 2
        }
      ],
      rejectedRecords: [
        {
          workbookFile: "TEST_Harmonization.xlsx",
          sheetName: "Traceability Matrix",
          rowNumber: 3,
          reason: "Unresolvable source ID"
        }
      ]
    }
  };
}

class RecordingFrameworkContentRepository implements FrameworkContentRepository {
  lastPublished?: Parameters<FrameworkContentRepository["publishIngestion"]>[0];

  async publishIngestion(
    input: Parameters<FrameworkContentRepository["publishIngestion"]>[0]
  ): Promise<PublishedContentIngestion> {
    this.lastPublished = input;
    return {
      sourcePackageCount: input.packs.length,
      contentPackCount: input.packs.length,
      requirementCount: input.packs.reduce((count, pack) => count + pack.requirements.length, 0),
      harmonizedControlCount: new Set(input.harmonization.controls.map((control) => control.harmonizedId)).size,
      mappingCount: input.harmonization.mappings.length,
      rejectedRecordCount: input.harmonization.rejectedRecords.length,
      sourcePackageIds: [randomUUID()],
      contentPackIds: [randomUUID()]
    };
  }

  async countRows(): Promise<ContentRowCounts> {
    return {
      contentSourcePackages: 13,
      frameworkContentPacks: 13,
      frameworkRequirements: 3642,
      harmonizedControls: 200,
      controlMappings: 4522,
      contentRejectedRecords: 820
    };
  }

  async listSourcePackages() {
    return [];
  }

  async listContentPacks() {
    return [];
  }

  async findContentPack() {
    return null;
  }

  async listRequirements() {
    return [];
  }

  async listRejectedRecords() {
    return [];
  }
}

class RecordingOutboxService {
  readonly published: Array<Record<string, unknown>> = [];

  async publish(input: Record<string, unknown>) {
    this.published.push(input);
    const now = input.now instanceof Date ? input.now : new Date();
    return {
      id: randomUUID(),
      tenantId: String(input.tenantId),
      eventType: String(input.eventType),
      aggregateType: String(input.aggregateType),
      aggregateId: String(input.aggregateId),
      schemaVersion: 1,
      payload: input.payload as Record<string, unknown>,
      idempotencyKey: String(input.idempotencyKey),
      status: "pending" as const,
      attempts: 0,
      availableAt: now,
      createdBy: String(input.createdBy),
      createdAt: now
    };
  }
}

class RecordingAuditLogService {
  readonly appended: Array<Record<string, unknown>> = [];

  async append(input: Record<string, unknown>) {
    this.appended.push(input);
    return {
      id: randomUUID(),
      sequence: 1n,
      previousHash: "0".repeat(64),
      eventHash: "1".repeat(64),
      occurredAt: new Date(),
      ...input
    };
  }
}
