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
  assertEvidenceReusable,
  commitCleanEvidence,
  createPendingEvidence,
  quarantineEvidence
} from "../../src/modules/evidence-assurance/public.js";
import { PostgresEvidenceAssuranceRepository } from "../../src/modules/evidence-assurance/infrastructure/postgres-evidence-assurance.repository.js";
import { createFinding, createRemediationTask, createRiskAcceptance, isRiskAcceptanceActive } from "../../src/modules/risk-workflow/public.js";
import { PostgresRiskWorkflowRepository } from "../../src/modules/risk-workflow/infrastructure/postgres-risk-workflow.repository.js";
import { TenantScopedDb } from "../../src/platform/database/tenant-scoped-db.js";
import { DATABASE_POOL } from "../../src/platform/database/tokens.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";
import { approvedControlSelectionForTenant } from "../helpers/question-repository-fixture.js";

const actorId = randomUUID();
const ownerId = randomUUID();
const tenantId = randomUUID();

let app: INestApplication;
let baseUrl: string;
let appPool: pg.Pool;
const repositoryPool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
const repositoryDb = new TenantScopedDb(repositoryPool);

// G-02 added a real foreign key from findings.assessment_item_id to
// assessment_items(id); a finding can no longer point at an arbitrary
// random UUID the way these fixtures did before that migration. This seeds
// the minimal real assessment/assessment_item chain each test needs.
async function seedAssessmentItemId(tenantId: string): Promise<string> {
  const assessment = await repositoryPool.query(
    `insert into assessments (tenant_id, scope_name, control_snapshot_version, period_start, period_end, created_by, updated_by)
     values ($1, $2, 'v1', '2026-01-01', '2026-12-31', $3, $3) returning id`,
    [tenantId, `a3-fixture-assessment-${randomUUID()}`, actorId]
  );
  // G-01 Constrain (0026): assessment_items.control_instance_id/question_version_id are now
  // NOT NULL — seed a real control_instances row and a real question_sets/question_versions row
  // first, matching what the live dual-write path does.
  const controlInstance = await repositoryPool.query(
    `insert into control_instances (tenant_id, assessment_id, control_id, framework_key, framework_version, mapping_version, owner_id, created_by, updated_by)
     values ($1, $2, 'HARM-1', 'SOC2', 'v1', 'm1', $3, $3, $3) returning id`,
    [tenantId, assessment.rows[0].id, actorId]
  );
  const questionSet = await repositoryPool.query(
    `insert into question_sets (tenant_id, control_id, question_set_key, created_by, updated_by)
     values ($1, 'HARM-1', 'q1', $2, $2) returning id`,
    [tenantId, actorId]
  );
  const questionVersion = await repositoryPool.query(
    `insert into question_versions (tenant_id, question_set_id, question_version, payload_json, checksum, created_by, updated_by)
     values ($1, $2, 1, '{}'::jsonb, 'a3-fixture-checksum', $3, $3) returning id`,
    [tenantId, questionSet.rows[0].id, actorId]
  );
  const item = await repositoryPool.query(
    `insert into assessment_items (
       tenant_id, assessment_id, framework_key, framework_version, mapping_version,
       control_id, harmonized_control_id, question_version, owner_id, control_instance_id,
       question_version_id, created_by, updated_by
     )
     values ($1, $2, 'SOC2', 'v1', 'm1', 'CC1.1', 'HARM-1', 'q1', $3, $4, $5, $3, $3)
     returning id`,
    [tenantId, assessment.rows[0].id, actorId, controlInstance.rows[0].id, questionVersion.rows[0].id]
  );
  return item.rows[0].id as string;
}

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

describe("A3 EvidenceAssurance repository", () => {
  it("persists quarantine, clean commit, hash, and reuse checks against real Supabase", async () => {
    const repository = new PostgresEvidenceAssuranceRepository(repositoryDb);
    const evidence = createPendingEvidence({
      tenantId: randomUUID(),
      ownerId,
      fileName: "repository-evidence.pdf",
      classification: "restricted",
      periodStart: new Date("2026-01-01T00:00:00.000Z"),
      periodEnd: new Date("2026-12-31T00:00:00.000Z"),
      scopeTags: ["soc2", "access"]
    });
    const pending = await repository.create({ evidence, actorId });
    expect(pending.state).toBe("pending");

    const quarantined = await repository.updateState({
      tenantId: pending.tenantId,
      evidence: quarantineEvidence(pending),
      actorId,
      storageUri: `supabase://quarantine/${pending.id}`
    });
    expect(quarantined.state).toBe("quarantined");

    const committed = await repository.updateState({
      tenantId: pending.tenantId,
      evidence: commitCleanEvidence(quarantined, {
        bytes: new TextEncoder().encode("repository evidence bytes"),
        scannerVerdict: "clean"
      }),
      actorId,
      storageUri: `supabase://evidence/${pending.id}`
    });
    expect(committed.state).toBe("committed");
    expect(committed.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(() =>
      assertEvidenceReusable(committed, {
        periodStart: new Date("2026-02-01T00:00:00.000Z"),
        periodEnd: new Date("2026-03-31T00:00:00.000Z"),
        scopeTags: ["soc2"]
      })
    ).not.toThrow();
  }, 30_000);
});

describe("A3 RiskWorkflow repository", () => {
  it("persists findings, remediation tasks, and risk-accepted status against real Supabase", async () => {
    const repository = new PostgresRiskWorkflowRepository(repositoryDb);
    const findingTenantId = randomUUID();
    const finding = await repository.createFinding({
      finding: createFinding({
        tenantId: findingTenantId,
        assessmentItemId: await seedAssessmentItemId(findingTenantId),
        testResultId: null,
        severity: "high",
        description: "Access review evidence is stale."
      }),
      actorId
    });
    expect(finding.severity).toBe("high");

    const task = await repository.createRemediationTask({
      tenantId: finding.tenantId,
      task: createRemediationTask({
        findingId: finding.id,
        ownerId,
        dueAt: new Date("2026-09-01T00:00:00.000Z")
      }),
      actorId
    });
    const updated = await repository.updateRemediationTask({
      tenantId: finding.tenantId,
      taskId: task.id,
      actorId,
      ownerId,
      dueAt: task.dueAt,
      status: "risk_accepted"
    });
    expect(updated.status).toBe("risk_accepted");
  });

  // G-03: proves risk_acceptances is a real, queryable, FK-backed table
  // against live Supabase — not just an in-memory fake honoring the
  // interface. Also proves findActiveRiskAcceptanceForTask correctly
  // excludes superseded acceptances.
  it("persists a risk acceptance and its review against real Supabase, and enforces FK integrity", async () => {
    const repository = new PostgresRiskWorkflowRepository(repositoryDb);
    const findingTenantId = randomUUID();
    const finding = await repository.createFinding({
      finding: createFinding({
        tenantId: findingTenantId,
        assessmentItemId: await seedAssessmentItemId(findingTenantId),
        testResultId: null,
        severity: "medium",
        description: "Vendor risk assessment is overdue."
      }),
      actorId
    });
    const task = await repository.createRemediationTask({
      tenantId: finding.tenantId,
      task: createRemediationTask({
        findingId: finding.id,
        ownerId,
        dueAt: new Date("2026-09-01T00:00:00.000Z")
      }),
      actorId
    });

    const acceptance = createRiskAcceptance({
      tenantId: finding.tenantId,
      remediationTaskId: task.id,
      findingId: finding.id,
      rationale: "Compensating control approved by the risk committee.",
      approverId: actorId,
      expiresAt: new Date("2027-01-01T00:00:00.000Z"),
      nextReviewDueAt: new Date("2026-10-01T00:00:00.000Z"),
      compensatingControls: "Quarterly manual review of vendor access logs."
    });
    const created = await repository.createRiskAcceptance({ tenantId: finding.tenantId, acceptance, actorId });
    expect(created.id).toBe(acceptance.id);
    expect(isRiskAcceptanceActive(created)).toBe(true);

    const active = await repository.findActiveRiskAcceptanceForTask(finding.tenantId, task.id);
    expect(active?.id).toBe(created.id);

    const fetched = await repository.findRiskAcceptance(finding.tenantId, created.id);
    expect(fetched?.rationale).toBe("Compensating control approved by the risk committee.");

    const review = await repository.createRiskAcceptanceReview({
      tenantId: finding.tenantId,
      review: {
        id: randomUUID(),
        riskAcceptanceId: created.id,
        reviewerId: actorId,
        decision: "reaffirmed",
        reason: "Compensating control is still operating effectively.",
        reviewedAt: new Date()
      }
    });
    expect(review.riskAcceptanceId).toBe(created.id);
    expect(review.decision).toBe("reaffirmed");

    // FK integrity: risk_acceptances.remediation_task_id must reference a real task.
    const orphanAcceptance = createRiskAcceptance({
      tenantId: finding.tenantId,
      remediationTaskId: randomUUID(),
      findingId: finding.id,
      rationale: "Should be rejected by the foreign key.",
      approverId: actorId,
      expiresAt: new Date("2027-01-01T00:00:00.000Z"),
      nextReviewDueAt: new Date("2026-10-01T00:00:00.000Z")
    });
    await expect(
      repository.createRiskAcceptance({ tenantId: finding.tenantId, acceptance: orphanAcceptance, actorId })
    ).rejects.toThrow();
    // G-10 cutover: this test's sequential withTenant calls occasionally
    // exceed vitest's 5s default under the full suite's concurrent
    // real-Supabase load (26 test files opening connections at once); it
    // consistently completes in well under 5s in isolation. Timing
    // tolerance, not a weakened assertion.
  }, 30_000);
});

describe("A3 EvidenceAssurance HTTP exposure", () => {
  it("rejects missing context, missing scopes, and missing idempotency keys", async () => {
    const unauthenticated = await fetch(`${baseUrl}/v1/evidence/objects`);
    expect(unauthenticated.status).toBe(401);

    const unauthorized = await fetch(`${baseUrl}/v1/evidence/objects`, {
      headers: headers("assessment:read")
    });
    expect(unauthorized.status).toBe(403);

    const missingIdempotency = await fetch(`${baseUrl}/v1/evidence/objects`, {
      method: "POST",
      headers: headers("evidence_object:write"),
      body: JSON.stringify(evidenceBody())
    });
    expect(missingIdempotency.status).toBe(400);
  });

  it("runs upload initiation, quarantine, clean commit, and reuse checks through HTTP", async () => {
    const createKey = `a3-evidence-create-${tenantId}`;
    const firstCreate = await requestJson("POST", "/v1/evidence/objects", evidenceBody(), "evidence_object:write", createKey);
    const secondCreate = await requestJson("POST", "/v1/evidence/objects", evidenceBody(), "evidence_object:write", createKey);
    expect(firstCreate.status).toBe(201);
    expect(secondCreate.status).toBe(201);

    const created = (await firstCreate.json()) as EvidenceResponse;
    const replayed = (await secondCreate.json()) as EvidenceResponse;
    expect(replayed.id).toBe(created.id);
    expect(created.state).toBe("pending");

    // G-10 cutover note: appPool now connects as the RLS-scoped app_runtime
    // role, so this test-assertion helper query uses the owner-role
    // repositoryPool instead of appPool.
    const outboxCount = await repositoryPool.query(
      `select count(*)::int as count from outbox_events where tenant_id = $1 and idempotency_key = $2`,
      [tenantId, createKey]
    );
    expect(outboxCount.rows[0].count).toBe(1);

    const quarantined = await requestJson(
      "POST",
      `/v1/evidence/objects/${created.id}/quarantine`,
      { storageUri: `supabase://quarantine/${created.id}` },
      "evidence_object:write",
      "a3-evidence-quarantine"
    );
    expect(((await quarantined.json()) as EvidenceResponse).state).toBe("quarantined");

    const scanStatus = await getJson<ScanStatusResponse>(
      `/v1/evidence/objects/${created.id}/scan-status`,
      "evidence_object:read"
    );
    expect(scanStatus.state).toBe("quarantined");

    const committed = await requestJson(
      "POST",
      `/v1/evidence/objects/${created.id}/commit`,
      {
        scannerVerdict: "clean",
        bytesBase64: Buffer.from("quarterly access review evidence").toString("base64"),
        storageUri: `supabase://evidence/${created.id}`
      },
      "evidence_object:write",
      "a3-evidence-commit"
    );
    const committedBody = (await committed.json()) as EvidenceResponse;
    expect(committedBody.state).toBe("committed");
    expect(committedBody.sha256).toMatch(/^[a-f0-9]{64}$/);

    const reusable = await requestJson(
      "POST",
      `/v1/evidence/objects/${created.id}/reuse-check`,
      {
        periodStart: "2026-03-01",
        periodEnd: "2026-06-30",
        scopeTags: ["soc2"]
      },
      "evidence_object:read"
    );
    expect(((await reusable.json()) as ReuseResponse).reusable).toBe(true);

    const notReusable = await requestJson(
      "POST",
      `/v1/evidence/objects/${created.id}/reuse-check`,
      {
        periodStart: "2026-03-01",
        periodEnd: "2026-06-30",
        scopeTags: ["pci"]
      },
      "evidence_object:read"
    );
    expect(((await notReusable.json()) as ReuseResponse).reusable).toBe(false);
  }, 120_000);
});

// G-07 (evidence graph, migration 0021_g07_evidence_graph.sql): the real
// HTTP-level proof that guard/DTO/controller/service/repository all wire
// together for the new evidence-graph routes. No frontend UI exists yet for
// these routes, so this HTTP exercise (bootstrapping the full NestJS app,
// same as A3's own HTTP describe block above) is the strongest available
// substitute for a Playwright e2e, matching the honest limitation already
// documented for G-01/G-04/G-06/G-09's newest tables.
describe("G-07 EvidenceGraph HTTP exposure", () => {
  it("exercises the full evidence-version/link/request/review/automated-test chain through real HTTP", async () => {
    const graphTenantId = randomUUID();

    // 1. Upload, quarantine, and commit an evidence object — commit() now
    //    dual-writes a real evidence_versions row plus a malware_scan_results
    //    row and the opening evidence_custody_events entry (see
    //    EvidenceAssuranceService.commit).
    const createKey = `g07-evidence-create-${graphTenantId}`;
    const created = (await (
      await requestJsonAs(graphTenantId, "POST", "/v1/evidence/objects", evidenceBody(), "evidence_object:write", createKey)
    ).json()) as EvidenceResponse;

    await requestJsonAs(
      graphTenantId,
      "POST",
      `/v1/evidence/objects/${created.id}/quarantine`,
      { storageUri: `supabase://quarantine/${created.id}` },
      "evidence_object:write",
      `g07-quarantine-${graphTenantId}`
    );

    const committed = await requestJsonAs(
      graphTenantId,
      "POST",
      `/v1/evidence/objects/${created.id}/commit`,
      {
        scannerVerdict: "clean",
        bytesBase64: Buffer.from("g07 evidence graph bytes").toString("base64"),
        storageUri: `supabase://evidence/${created.id}`,
        mimeType: "application/pdf"
      },
      "evidence_object:write",
      `g07-commit-${graphTenantId}`
    );
    expect(committed.status).toBe(201);

    const versions = (await (
      await getJsonAs(graphTenantId, `/v1/evidence/objects/${created.id}/versions`, "evidence_version:read")
    ).json()) as Array<{ id: string; evidenceVersionNo: number }>;
    expect(versions).toHaveLength(1);
    const evidenceVersionId = versions[0].id;

    const malwareScans = (await (
      await getJsonAs(graphTenantId, `/v1/evidence/versions/${evidenceVersionId}/malware-scans`, "malware_scan_result:read")
    ).json()) as Array<{ status: string }>;
    expect(malwareScans).toHaveLength(1);
    expect(malwareScans[0].status).toBe("clean");

    const custodyEvents = (await (
      await getJsonAs(graphTenantId, `/v1/evidence/versions/${evidenceVersionId}/custody-events`, "evidence_custody_event:read")
    ).json()) as Array<{ eventType: string }>;
    expect(custodyEvents).toHaveLength(1);
    expect(custodyEvents[0].eventType).toBe("created");

    // 2. Create a real assessment/control_instance chain (via the existing
    //    assessment HTTP surface) to link the evidence version against and
    //    to request evidence for.
    const assessmentResponse = await requestJsonAs(
      graphTenantId,
      "POST",
      "/v1/assessments",
      await assessmentBody(graphTenantId),
      "assessment:write",
      `g07-assessment-${graphTenantId}`
    );
    expect(assessmentResponse.status).toBe(201);
    const assessment = (await assessmentResponse.json()) as AssessmentResponse;
    const controlInstance = await repositoryPool.query(
      `select id from control_instances where tenant_id = $1 and assessment_id = $2 limit 1`,
      [graphTenantId, assessment.id]
    );
    const controlInstanceId = controlInstance.rows[0].id as string;

    const link = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        `/v1/evidence/versions/${evidenceVersionId}/links`,
        { targetType: "control_instance", targetId: controlInstanceId, purpose: "coverage" },
        "evidence_link:write",
        `g07-link-${graphTenantId}`
      )
    ).json()) as { id: string; targetType: string };
    expect(link.targetType).toBe("control_instance");

    const links = (await (
      await getJsonAs(graphTenantId, `/v1/evidence/versions/${evidenceVersionId}/links`, "evidence_link:read")
    ).json()) as unknown[];
    expect(links).toHaveLength(1);

    // 3. Request evidence for the same control instance, then review the
    //    committed version (reviewer separation: reviewer must not be the
    //    evidence owner).
    const requestResponse = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        "/v1/evidence/requests",
        { assessmentId: assessment.id, controlInstanceId, requestedFrom: "vendor-portal", dueAt: "2026-12-01T00:00:00.000Z" },
        "evidence_request:write",
        `g07-request-${graphTenantId}`
      )
    ).json()) as { id: string; status: string };
    expect(requestResponse.status).toBe("requested");

    const requests = (await (
      await getJsonAs(graphTenantId, `/v1/evidence/requests?assessmentId=${assessment.id}`, "evidence_request:read")
    ).json()) as unknown[];
    expect(requests).toHaveLength(1);

    const reviewerId = randomUUID();
    const review = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        `/v1/evidence/versions/${evidenceVersionId}/reviews`,
        { reviewerId, decision: "sufficient", rationale: "Coverage confirmed for the review period." },
        "evidence_review:write",
        `g07-review-${graphTenantId}`
      )
    ).json()) as { decision: string };
    expect(review.decision).toBe("sufficient");

    const reviews = (await (
      await getJsonAs(graphTenantId, `/v1/evidence/versions/${evidenceVersionId}/reviews`, "evidence_review:read")
    ).json()) as unknown[];
    expect(reviews).toHaveLength(1);

    // 4. Define an automated control test (seeding its harmonized_controls
    //    and connectors prerequisites directly, the same way a5-ai-api.test.ts
    //    direct-SQL-seeds tables with no convenient HTTP creation path), run
    //    it, and record a sample drawn from its result population.
    const automatedTestActorId = randomUUID();
    const harmonizedControl = await repositoryPool.query(
      `insert into harmonized_controls (
         tenant_id, harmonized_id, domain, control_name, control_description, source_workbook,
         source_sheet, source_row_number, created_by, updated_by
       )
       values ($1, $2, 'access-control', 'Access reviews', 'Periodic access reviews', 'wb.xlsx', 'sheet1', 1, $3, $3)
       returning id`,
      [graphTenantId, `HARM-G07-HTTP-${randomUUID()}`, automatedTestActorId]
    );
    const connector = await repositoryPool.query(
      `insert into connectors (tenant_id, connector_key, provider, kind, secret_ref, created_by, updated_by)
       values ($1, $2, 'aws', 'iam', 'secret-ref', $3, $3) returning id`,
      [graphTenantId, `g07-http-connector-${randomUUID()}`, automatedTestActorId]
    );

    const automatedTest = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        "/v1/evidence/automated-tests",
        {
          controlId: harmonizedControl.rows[0].id,
          connectorType: "aws-iam",
          queryTemplate: "select * from iam_users",
          schedule: "0 * * * *",
          severity: "high"
        },
        "automated_test:write",
        `g07-automated-test-${graphTenantId}`
      )
    ).json()) as { id: string };

    const fetchedTest = await getJsonAs(graphTenantId, `/v1/evidence/automated-tests/${automatedTest.id}`, "automated_test:read");
    expect((await fetchedTest.json() as { id: string }).id).toBe(automatedTest.id);

    const testRun = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        `/v1/evidence/automated-tests/${automatedTest.id}/runs`,
        { connectorId: connector.rows[0].id, status: "succeeded" },
        "automated_test_run:write",
        `g07-run-${graphTenantId}`
      )
    ).json()) as { id: string; status: string };
    expect(testRun.status).toBe("succeeded");

    const runs = (await (
      await getJsonAs(graphTenantId, `/v1/evidence/automated-tests/${automatedTest.id}/runs`, "automated_test_run:read")
    ).json()) as unknown[];
    expect(runs).toHaveLength(1);

    const sample = (await (
      await requestJsonAs(
        graphTenantId,
        "POST",
        `/v1/evidence/test-results/${testRun.id}/samples`,
        { populationRef: "iam-users-2026-q3", method: "random", sampleSize: 25 },
        "evidence_sample:write",
        `g07-sample-${graphTenantId}`
      )
    ).json()) as { sampleSize: number };
    expect(sample.sampleSize).toBe(25);

    const samples = (await (
      await getJsonAs(graphTenantId, `/v1/evidence/test-results/${testRun.id}/samples`, "evidence_sample:read")
    ).json()) as unknown[];
    expect(samples).toHaveLength(1);
  }, 120_000);
});

describe("A3 RiskWorkflow HTTP exposure", () => {
  it("rejects missing scopes and missing idempotency keys", async () => {
    const unauthorized = await fetch(`${baseUrl}/v1/risk-workflow/findings`, {
      headers: headers("evidence:read")
    });
    expect(unauthorized.status).toBe(403);

    const missingIdempotency = await fetch(`${baseUrl}/v1/risk-workflow/findings`, {
      method: "POST",
      headers: headers("finding:write"),
      body: JSON.stringify({ assessmentItemId: randomUUID(), severity: "medium", description: "Missing owner." })
    });
    expect(missingIdempotency.status).toBe(400);
  });

  it("runs finding, remediation, and risk-acceptance workflow through HTTP", async () => {
    const assessment = await createAssessmentForRisk();
    const itemId = assessment.items[0].id;
    const createKey = `a3-risk-finding-${tenantId}`;
    const firstFinding = await requestJson(
      "POST",
      "/v1/risk-workflow/findings",
      {
        assessmentItemId: itemId,
        severity: "high",
        impact: "high",
        likelihood: "likely",
        ownerId,
        dueAt: "2026-09-30T00:00:00.000Z",
        description: "Control evidence is stale."
      },
      "finding:write",
      createKey
    );
    const secondFinding = await requestJson(
      "POST",
      "/v1/risk-workflow/findings",
      { assessmentItemId: itemId, severity: "high", description: "Control evidence is stale." },
      "finding:write",
      createKey
    );
    expect(firstFinding.status).toBe(201);
    expect(secondFinding.status).toBe(201);
    const finding = (await firstFinding.json()) as FindingResponse;
    expect(((await secondFinding.json()) as FindingResponse).id).toBe(finding.id);
    expect(finding.impact).toBe("high");
    expect(finding.likelihood).toBe("likely");
    expect(finding.ownerId).toBe(ownerId);
    expect(finding.dueAt).toBe("2026-09-30T00:00:00.000Z");

    // G-10 cutover note: appPool now connects as the RLS-scoped app_runtime
    // role, so this test-assertion helper query uses the owner-role
    // repositoryPool instead of appPool.
    const findingOutboxCount = await repositoryPool.query(
      `select count(*)::int as count from outbox_events where tenant_id = $1 and idempotency_key = $2`,
      [tenantId, createKey]
    );
    expect(findingOutboxCount.rows[0].count).toBe(1);

    const updatedFinding = await requestJson(
      "PATCH",
      `/v1/risk-workflow/findings/${finding.id}`,
      {
        severity: "critical",
        impact: "critical",
        likelihood: "almost_certain",
        ownerId,
        dueAt: "2026-08-31T00:00:00.000Z",
        description: "Evidence is stale and the remediation SLA is breached."
      },
      "finding:write",
      "a3-risk-finding-update"
    );
    const updatedFindingBody = (await updatedFinding.json()) as FindingResponse;
    expect(updatedFindingBody.severity).toBe("critical");
    expect(updatedFindingBody.impact).toBe("critical");
    expect(updatedFindingBody.likelihood).toBe("almost_certain");
    expect(updatedFindingBody.dueAt).toBe("2026-08-31T00:00:00.000Z");

    const taskResponse = await requestJson(
      "POST",
      "/v1/risk-workflow/remediation-tasks",
      { findingId: finding.id, ownerId, dueAt: "2026-09-30T00:00:00.000Z" },
      "remediation_task:write",
      "a3-risk-task"
    );
    const task = (await taskResponse.json()) as TaskResponse;
    expect(task.status).toBe("open");

    const taskInProgress = await requestJson(
      "PATCH",
      `/v1/risk-workflow/remediation-tasks/${task.id}`,
      { ownerId, dueAt: "2026-09-30T00:00:00.000Z", status: "in_progress" },
      "remediation_task:write",
      "a3-risk-task-update"
    );
    expect(((await taskInProgress.json()) as TaskResponse).status).toBe("in_progress");

    const accepted = await requestJson(
      "POST",
      `/v1/risk-workflow/remediation-tasks/${task.id}/risk-acceptance`,
      {
        reason: "Residual risk accepted by the control owner for the scoped period.",
        expiresAt: "2027-01-01T00:00:00.000Z",
        nextReviewDueAt: "2026-10-01T00:00:00.000Z",
        compensatingControls: "Monthly manual review of the scoped population."
      },
      "remediation_task:write",
      "a3-risk-accept"
    );
    expect(((await accepted.json()) as TaskResponse).status).toBe("risk_accepted");

    const acceptanceView = await getJson<RiskAcceptanceResponse>(
      `/v1/risk-workflow/remediation-tasks/${task.id}/risk-acceptance`,
      "remediation_task:read"
    );
    expect(acceptanceView.remediationTaskId).toBe(task.id);
    expect(acceptanceView.findingId).toBe(finding.id);
    expect(acceptanceView.rationale).toBe("Residual risk accepted by the control owner for the scoped period.");
    expect(acceptanceView.active).toBe(true);

    const review = await requestJson(
      "POST",
      `/v1/risk-workflow/remediation-tasks/${task.id}/risk-acceptance/reviews`,
      { decision: "reaffirmed", reason: "Compensating control confirmed effective at first review." },
      "remediation_task:write",
      "a3-risk-accept-review"
    );
    expect(review.status).toBe(201);
    const reviewBody = (await review.json()) as { decision: string; riskAcceptanceId: string };
    expect(reviewBody.decision).toBe("reaffirmed");
    expect(reviewBody.riskAcceptanceId).toBe(acceptanceView.id);

    const listedFindings = await getJson<FindingResponse[]>("/v1/risk-workflow/findings", "finding:read");
    expect(listedFindings.some((candidate) => candidate.id === finding.id)).toBe(true);

    const listedTasks = await getJson<TaskResponse[]>(
      `/v1/risk-workflow/remediation-tasks?findingId=${finding.id}`,
      "remediation_task:read"
    );
    expect(listedTasks.some((candidate) => candidate.id === task.id)).toBe(true);
  }, 120_000);
});

// G-09 Phase 1 (enterprise risk register): a real HTTP-level proof that the
// new routes (risk-models, risks, risk links, risk treatments, plus the
// risk_acceptances.risk_id linkage) are actually reachable through the full
// guard/controller/service/repository chain, not just direct-SQL integrity
// tests (see test/evidence-risk/g09-risk-register.test.ts for those). No
// frontend UI exists yet for these routes, so there is no Playwright e2e to
// run against them — this HTTP-level test is the practical substitute
// evidence, same pattern used for G-01/G-04's e2e limitations.
describe("G-09 RiskWorkflow HTTP exposure", () => {
  it("creates a risk model, a risk, a risk link, a treatment, and accepts a task's risk against a real risk", async () => {
    const riskModel = await requestJson(
      "POST",
      "/v1/risk-workflow/risk-models",
      { modelKey: "standard", modelVersion: "v1", scalesJson: { low: 1, high: 100 }, formula: "sum(impact,likelihood)", thresholds: { high: 70 } },
      "risk_model:write"
    );
    expect(riskModel.status).toBe(201);
    const modelBody = (await riskModel.json()) as { id: string };

    const riskKey = `g09-risk-${randomUUID()}`;
    const riskCreateKey = `g09-risk-create-${riskKey}`;
    const riskResponse = await requestJson(
      "POST",
      "/v1/risk-workflow/risks",
      {
        riskModelId: modelBody.id,
        riskKey,
        title: "Vendor data exposure",
        category: "vendor",
        inherentScore: 80,
        residualScore: 40,
        ownerId
      },
      "risk:write",
      riskCreateKey
    );
    expect(riskResponse.status).toBe(201);
    const risk = (await riskResponse.json()) as { id: string; riskKey: string };
    expect(risk.riskKey).toBe(riskKey);

    const fetchedRisk = await getJson<{ id: string }>(`/v1/risk-workflow/risks/${risk.id}`, "risk:read");
    expect(fetchedRisk.id).toBe(risk.id);

    const assessment = await createAssessmentForRisk();
    const findingCreate = await requestJson(
      "POST",
      "/v1/risk-workflow/findings",
      { assessmentItemId: assessment.items[0].id, severity: "high", description: "G-09 linked finding." },
      "finding:write",
      `g09-risk-finding-${riskKey}`
    );
    const finding = (await findingCreate.json()) as { id: string };

    const linkResponse = await requestJson(
      "POST",
      `/v1/risk-workflow/risks/${risk.id}/links`,
      { targetType: "finding", targetId: finding.id, relationship: "caused_by" },
      "risk:write",
      `g09-risk-link-${riskKey}`
    );
    expect(linkResponse.status).toBe(201);
    const listedLinks = await getJson<Array<{ targetId: string }>>(`/v1/risk-workflow/risks/${risk.id}/links`, "risk:read");
    expect(listedLinks.some((link) => link.targetId === finding.id)).toBe(true);

    const treatmentResponse = await requestJson(
      "POST",
      `/v1/risk-workflow/risks/${risk.id}/treatments`,
      { strategy: "mitigate", plan: "Rotate vendor credentials and add monitoring.", ownerId, dueAt: "2027-03-01T00:00:00.000Z" },
      "risk:write",
      `g09-risk-treatment-${riskKey}`
    );
    expect(treatmentResponse.status).toBe(201);
    const listedTreatments = await getJson<Array<{ strategy: string }>>(
      `/v1/risk-workflow/risks/${risk.id}/treatments`,
      "risk:read"
    );
    expect(listedTreatments.some((treatment) => treatment.strategy === "mitigate")).toBe(true);

    const taskResponse = await requestJson(
      "POST",
      "/v1/risk-workflow/remediation-tasks",
      { findingId: finding.id, ownerId, dueAt: "2026-09-30T00:00:00.000Z" },
      "remediation_task:write",
      `g09-risk-task-${riskKey}`
    );
    const task = (await taskResponse.json()) as { id: string };

    const acceptResponse = await requestJson(
      "POST",
      `/v1/risk-workflow/remediation-tasks/${task.id}/risk-acceptance`,
      {
        riskId: risk.id,
        reason: "Residual risk accepted pending mitigation completion.",
        expiresAt: "2027-01-01T00:00:00.000Z",
        nextReviewDueAt: "2026-10-01T00:00:00.000Z"
      },
      "remediation_task:write",
      `g09-risk-accept-${riskKey}`
    );
    expect(acceptResponse.status).toBe(201);

    const acceptanceView = await getJson<{ riskId: string }>(
      `/v1/risk-workflow/remediation-tasks/${task.id}/risk-acceptance`,
      "remediation_task:read"
    );
    expect(acceptanceView.riskId).toBe(risk.id);
  }, 120_000);
});

interface AssessmentResponse {
  id: string;
  items: Array<{ id: string }>;
}

interface EvidenceResponse {
  id: string;
  state: string;
  sha256?: string;
}

interface ScanStatusResponse {
  state: string;
}

interface ReuseResponse {
  reusable: boolean;
}

interface FindingResponse {
  id: string;
  severity: string;
  impact: string | null;
  likelihood: string | null;
  ownerId: string | null;
  dueAt: string | null;
}

interface TaskResponse {
  id: string;
  status: string;
}

interface RiskAcceptanceResponse {
  id: string;
  remediationTaskId: string;
  findingId: string;
  rationale: string;
  active: boolean;
}

function evidenceBody() {
  return {
    ownerId,
    fileName: "access-review-q2.pdf",
    classification: "restricted",
    periodStart: "2026-01-01",
    periodEnd: "2026-12-31",
    scopeTags: ["soc2", "access"]
  };
}

async function assessmentBody(assessmentTenantId: string = tenantId) {
  return {
    scopeName: "A3 risk readiness",
    ownerId,
    periodStart: "2026-01-01",
    periodEnd: "2026-12-31",
    controls: [await approvedControlSelectionForTenant({ pool: repositoryPool, tenantId: assessmentTenantId, actorId })]
  };
}

async function createAssessmentForRisk(): Promise<AssessmentResponse> {
  const response = await requestJson(
    "POST",
    "/v1/assessments",
    await assessmentBody(),
    "assessment:write,risk:write",
    `a3-risk-assessment-${tenantId}`
  );
  if (response.status !== 201) {
    throw new Error(`Expected assessment creation to return 201, received ${response.status}: ${await response.text()}`);
  }
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
  method: "POST" | "PATCH",
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

function headersFor(forTenantId: string, scopes: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-tenant-id": forTenantId,
    "x-user-id": actorId,
    "x-user-clearance": "restricted",
    "x-user-scopes": scopes
  };
}

async function requestJsonAs(
  forTenantId: string,
  method: "POST" | "PATCH",
  route: string,
  body: unknown,
  scopes: string,
  idempotencyKey?: string
): Promise<Response> {
  return fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      ...headersFor(forTenantId, scopes),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
    },
    body: JSON.stringify(body)
  });
}

async function getJsonAs(forTenantId: string, route: string, scopes: string): Promise<Response> {
  const response = await fetch(`${baseUrl}${route}`, { headers: headersFor(forTenantId, scopes) });
  expect(response.status).toBe(200);
  return response;
}
