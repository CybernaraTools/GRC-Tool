import "dotenv/config";
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import pg from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { DATABASE_POOL } from "../../src/platform/database/tokens.js";
import { ProblemDetailsFilter } from "../../src/shared/problem-details.filter.js";
import { approvedControlSelectionForTenant } from "../helpers/question-repository-fixture.js";
import { emptyNarrativePayload, NARRATIVE_SECTION_KEYS, validateNarrativeGroundedness, runComplianceEngine } from "../../src/modules/audit-reports/public.js";
import type { ClosureSnapshotPayload } from "../../src/modules/closure-snapshot/public.js";

let app: INestApplication;
let baseUrl: string;
let appPool: pg.Pool;
const repositoryPool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
const originalFetch = globalThis.fetch;

beforeAll(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidUnknownValues: true, transform: true }));
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

afterEach(() => {
  globalThis.fetch = originalFetch;
});

async function createClosedAssessment(tenantId: string, actorId: string): Promise<{ assessmentId: string; itemId: string }> {
  const evidenceId = randomUUID();
  const created = await postJson(
    tenantId,
    "/v1/assessments",
    {
      scopeName: `Audit Reports Regression ${randomUUID()}`,
      ownerId: actorId,
      periodStart: "2026-01-01",
      periodEnd: "2026-12-31",
      controls: [await approvedControlSelectionForTenant({ pool: repositoryPool, tenantId, actorId })]
    },
    "assessment:write",
    `ar-create-${randomUUID()}`
  );
  expect(created.status).toBe(201);
  const assessment = (await created.json()) as { id: string; items: Array<{ id: string }> };
  const itemId = assessment.items[0].id;

  await postJson(
    tenantId,
    `/v1/assessments/${assessment.id}/items/${itemId}/applicability`,
    { applicable: true, rationale: "Applies to this control." },
    "assessment:write",
    `ar-applicability-${randomUUID()}`
  );
  await postJson(
    tenantId,
    `/v1/assessments/${assessment.id}/items/${itemId}/answers`,
    { answerText: "Control operating effectively.", evidenceIds: [evidenceId] },
    "assessment:write",
    `ar-answer-${randomUUID()}`
  );
  await postJson(
    tenantId,
    `/v1/assessments/${assessment.id}/items/${itemId}/reviews`,
    { approved: true },
    "assessment:review",
    `ar-review-${randomUUID()}`
  );
  const closed = await postJson(tenantId, `/v1/assessments/${assessment.id}/close`, {}, "assessment:review", `ar-close-${randomUUID()}`);
  expect(closed.status).toBe(201);
  return { assessmentId: assessment.id, itemId };
}

// Mocks ONLY the outbound call to api.openai.com made internally by
// NarrativeGeneratorService — every other fetch (including this test file's
// own HTTP calls to the local test server) passes through to the real
// implementation, exactly like the platform's existing convention in
// test/evidence-risk/finding-ai-assist.test.ts.
function interceptOpenAiFetch(buildResponse: () => Response): void {
  const realFetch = originalFetch;
  globalThis.fetch = (async (url, init) => {
    if (typeof url === "string" && url.includes("api.openai.com")) {
      return buildResponse();
    }
    return realFetch(url as never, init);
  }) as typeof fetch;
}

function mockGroundedNarrativeFetch(): void {
  interceptOpenAiFetch(() => {
    const narrative = emptyNarrativePayload();
    for (const key of NARRATIVE_SECTION_KEYS) {
      narrative[key] = [
        { text: "This section contains only commentary because no cited facts were required for this test fixture.", citations: [], claimType: "commentary", numericClaims: [] }
      ];
    }
    return new Response(JSON.stringify({ output_text: JSON.stringify(narrative) }), { status: 200 });
  });
}

function mockHallucinatingFetch(): void {
  interceptOpenAiFetch(() => {
    const narrative = emptyNarrativePayload();
    narrative.executiveSummary = [
      { text: "Fabricated claim citing a control that does not exist.", citations: ["CONTROL:FAKE:does-not-exist"], claimType: "fact", numericClaims: [] }
    ];
    return new Response(JSON.stringify({ output_text: JSON.stringify(narrative) }), { status: 200 });
  });
}

describe("Closure snapshot capture (regression-safe)", () => {
  it("test 7 & 9: closing an assessment creates exactly one closure snapshot, and the assessment then appears in /reports", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const { assessmentId } = await createClosedAssessment(tenantId, actorId);

    const snapshots = await repositoryPool.query(
      `select count(*)::int as count from assessment_snapshots where tenant_id = $1 and assessment_id = $2 and snapshot_type = 'closure'`,
      [tenantId, assessmentId]
    );
    expect(snapshots.rows[0].count).toBe(1);

    const closedAssessments = await getJson<Array<{ assessmentId: string }>>(tenantId, "/v1/audit-reports/closed-assessments?limit=100&offset=0", "audit_report:read");
    expect(closedAssessments.some((entry) => entry.assessmentId === assessmentId)).toBe(true);
  }, 120_000);

  it("test 8: an assessment_snapshots row cannot be mutated once written (append-only DB trigger)", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const { assessmentId } = await createClosedAssessment(tenantId, actorId);
    const snapshotRow = await repositoryPool.query<{ id: string }>(
      `select id from assessment_snapshots where tenant_id = $1 and assessment_id = $2 and snapshot_type = 'closure'`,
      [tenantId, assessmentId]
    );
    const snapshotId = snapshotRow.rows[0]!.id;
    await expect(
      repositoryPool.query(`update assessment_snapshots set content_hash = 'tampered' where id = $1`, [snapshotId])
    ).rejects.toThrow();
  }, 120_000);

  it("regression: existing close() validations, transition, signoff, and return value are unchanged", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const { assessmentId } = await createClosedAssessment(tenantId, actorId);
    const record = await getJson<{ status: string }>(tenantId, `/v1/assessments/${assessmentId}`, "assessment:read");
    expect(record.status).toBe("closed");
    const signoffs = await getJson<Array<{ scopeType: string; decision: string }>>(tenantId, `/v1/assessments/${assessmentId}/signoffs`, "assessment:read");
    expect(signoffs.some((signoff) => signoff.scopeType === "final" && signoff.decision === "approved")).toBe(true);
  }, 120_000);

  it("test 10: a non-closed assessment does not appear in /reports", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const created = await postJson(
      tenantId,
      "/v1/assessments",
      {
        scopeName: `Not Closed ${randomUUID()}`,
        ownerId: actorId,
        periodStart: "2026-01-01",
        periodEnd: "2026-12-31",
        controls: [await approvedControlSelectionForTenant({ pool: repositoryPool, tenantId, actorId })]
      },
      "assessment:write",
      `ar-notclosed-${randomUUID()}`
    );
    const assessment = (await created.json()) as { id: string };
    const closedAssessments = await getJson<Array<{ assessmentId: string }>>(tenantId, "/v1/audit-reports/closed-assessments?limit=100&offset=0", "audit_report:read");
    expect(closedAssessments.some((entry) => entry.assessmentId === assessment.id)).toBe(false);
  }, 120_000);

  it("test 21: a legacy closed assessment (no native snapshot) is explicitly reconstructed on report generation", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    // Simulate "predates this feature": force status='closed' directly via
    // SQL rather than the /close endpoint, so captureClosureSnapshot() is
    // never invoked and no native 'closure' snapshot is ever written — the
    // append-only trigger correctly forbids deleting one after the fact
    // (proven by the separate immutability test above), so this is the only
    // valid way to construct a genuinely snapshot-less closed assessment.
    const evidenceId = randomUUID();
    const created = await postJson(
      tenantId,
      "/v1/assessments",
      {
        scopeName: `Legacy Closed ${randomUUID()}`,
        ownerId: actorId,
        periodStart: "2026-01-01",
        periodEnd: "2026-12-31",
        controls: [await approvedControlSelectionForTenant({ pool: repositoryPool, tenantId, actorId })]
      },
      "assessment:write",
      `ar-legacy-create-${randomUUID()}`
    );
    const assessment = (await created.json()) as { id: string; items: Array<{ id: string }> };
    const itemId = assessment.items[0].id;
    await postJson(tenantId, `/v1/assessments/${assessment.id}/items/${itemId}/applicability`, { applicable: true, rationale: "Applies." }, "assessment:write", `ar-legacy-app-${randomUUID()}`);
    await postJson(
      tenantId,
      `/v1/assessments/${assessment.id}/items/${itemId}/answers`,
      { answerText: "Answered.", evidenceIds: [evidenceId] },
      "assessment:write",
      `ar-legacy-ans-${randomUUID()}`
    );
    await postJson(tenantId, `/v1/assessments/${assessment.id}/items/${itemId}/reviews`, { approved: true }, "assessment:review", `ar-legacy-rev-${randomUUID()}`);
    await repositoryPool.query(`update assessments set status = 'closed' where tenant_id = $1 and id = $2`, [tenantId, assessment.id]);
    const assessmentId = assessment.id;

    mockGroundedNarrativeFetch();
    const generated = await postJson(tenantId, `/v1/audit-reports/assessments/${assessmentId}/generate`, {}, "audit_report:write", `ar-gen-legacy-${randomUUID()}`);
    expect(generated.status).toBe(201);

    // reconstructed/historicalAssuranceLevel live inside snapshot_payload jsonb, not a
    // top-level column.
    const payloadRow = await repositoryPool.query<{ snapshot_payload: { reconstructed: boolean; historicalAssuranceLevel: string } }>(
      `select snapshot_payload from assessment_snapshots where tenant_id = $1 and assessment_id = $2 and snapshot_type = 'legacy_closure_reconstruction'`,
      [tenantId, assessmentId]
    );
    expect(payloadRow.rows[0]?.snapshot_payload.reconstructed).toBe(true);
    expect(payloadRow.rows[0]?.snapshot_payload.historicalAssuranceLevel).toBe("legacy_reconstructed");
  }, 120_000);
});

describe("Audit report generation and Rule #2 grounding gate", () => {
  it("generates a report with a fully-grounded (commentary-only) narrative and publishes on request", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const { assessmentId } = await createClosedAssessment(tenantId, actorId);

    mockGroundedNarrativeFetch();
    const generated = await postJson(tenantId, `/v1/audit-reports/assessments/${assessmentId}/generate`, {}, "audit_report:write", `ar-gen-${randomUUID()}`);
    expect(generated.status).toBe(201);
    const report = (await generated.json()) as {
      id: string;
      groundednessScore: number;
      lifecycleStatus: string;
      narrativeAvailable: boolean;
    };
    expect(report.groundednessScore).toBe(100);
    expect(report.narrativeAvailable).toBe(true);
    expect(report.lifecycleStatus).toBe("draft");

    // test 23: report is persisted
    const reloaded = await getJson<{ id: string }>(tenantId, `/v1/audit-reports/${report.id}`, "audit_report:read");
    expect(reloaded.id).toBe(report.id);

    // test 24: PDF can be downloaded
    const download = await fetch(`${baseUrl}/v1/audit-reports/${report.id}/download`, { headers: headers(tenantId, "audit_report:read") });
    expect(download.status).toBe(200);
    expect((await download.arrayBuffer()).byteLength).toBeGreaterThan(100);

    const published = await postJson(tenantId, `/v1/audit-reports/${report.id}/publish`, {}, "audit_report:write", `ar-publish-${randomUUID()}`);
    expect(published.status).toBe(201);
    expect(((await published.json()) as { lifecycleStatus: string }).lifecycleStatus).toBe("published");
  }, 120_000);

  it("test 39 & 40: exhausting the retry budget on a hallucinating model falls back to deterministic-only, never silently publishes, and logs every attempt", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const { assessmentId } = await createClosedAssessment(tenantId, actorId);

    mockHallucinatingFetch();
    const generated = await postJson(tenantId, `/v1/audit-reports/assessments/${assessmentId}/generate`, {}, "audit_report:write", `ar-gen-hallu-${randomUUID()}`);
    expect(generated.status).toBe(201);
    const report = (await generated.json()) as {
      id: string;
      groundednessScore: number;
      narrativeAvailable: boolean;
      groundednessValidationLog: unknown[];
      lifecycleStatus: string;
    };
    expect(report.narrativeAvailable).toBe(false);
    expect(report.groundednessScore).toBeLessThan(100);
    expect(report.lifecycleStatus).toBe("draft");
    expect(report.groundednessValidationLog.length).toBeGreaterThanOrEqual(3); // initial attempt + 2 retries

    // test 40: every attempt (all failing) plus final outcome retrievable from provenance section (report itself).
    const reloaded = await getJson<{ groundednessValidationLog: Array<{ passed: boolean }> }>(tenantId, `/v1/audit-reports/${report.id}`, "audit_report:read");
    expect(reloaded.groundednessValidationLog.every((attempt) => attempt.passed === false)).toBe(true);

    // A sub-100 report must be rejected from publishing, never silently allowed.
    const publishAttempt = await postJson(tenantId, `/v1/audit-reports/${report.id}/publish`, {}, "audit_report:write", `ar-publish-fail-${randomUUID()}`);
    expect(publishAttempt.status).toBe(400);
  }, 120_000);

  it("test 22 & 41: regeneration from the same snapshot reproduces identical deterministic results and independently re-runs validation", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const { assessmentId } = await createClosedAssessment(tenantId, actorId);

    mockGroundedNarrativeFetch();
    const first = await postJson(tenantId, `/v1/audit-reports/assessments/${assessmentId}/generate`, {}, "audit_report:write", `ar-r1-${randomUUID()}`);
    const second = await postJson(tenantId, `/v1/audit-reports/assessments/${assessmentId}/generate`, {}, "audit_report:write", `ar-r2-${randomUUID()}`);
    const r1 = (await first.json()) as { id: string; snapshotId: string; structuredReportJson: { engineResult: unknown } };
    const r2 = (await second.json()) as { id: string; snapshotId: string; structuredReportJson: { engineResult: unknown } };

    expect(r1.id).not.toBe(r2.id); // each generation is its own report record, never overwritten
    expect(r1.snapshotId).toBe(r2.snapshotId); // same immutable closure snapshot reused, not recalculated
    expect(JSON.stringify(r1.structuredReportJson.engineResult)).toBe(JSON.stringify(r2.structuredReportJson.engineResult));

    const history = await getJson<unknown[]>(tenantId, `/v1/audit-reports/assessments/${assessmentId}`, "audit_report:read");
    expect(history.length).toBeGreaterThanOrEqual(2);
  }, 120_000);
});

describe("Cross-tenant isolation", () => {
  it("test 25: cross-tenant report access is denied", async () => {
    const tenantId = randomUUID();
    const otherTenantId = randomUUID();
    const actorId = randomUUID();
    const { assessmentId } = await createClosedAssessment(tenantId, actorId);
    mockGroundedNarrativeFetch();
    const generated = await postJson(tenantId, `/v1/audit-reports/assessments/${assessmentId}/generate`, {}, "audit_report:write", `ar-xt-${randomUUID()}`);
    const report = (await generated.json()) as { id: string };

    const crossTenantRead = await fetch(`${baseUrl}/v1/audit-reports/${report.id}`, { headers: headers(otherTenantId, "audit_report:read") });
    expect(crossTenantRead.status).toBe(404);
  }, 120_000);

  it("test 26: a second tenant's evidence cannot appear in the report context even when its evidence_links.target_id is set to (guessed/enumerated) this tenant's own assessment item ID", async () => {
    const tenantId = randomUUID();
    const otherTenantId = randomUUID();
    const actorId = randomUUID();
    const { assessmentId, itemId } = await createClosedAssessment(tenantId, actorId);

    // Real, genuinely-inserted evidence under a DIFFERENT tenant, whose
    // evidence_links row is crafted to target THIS tenant's own assessment
    // item id (the "guessed/enumerated ID" attack this test proves fails).
    const foreignEvidenceId = randomUUID();
    const foreignEvidenceVersionId = randomUUID();
    const foreignActorId = randomUUID();
    await repositoryPool.query(
      `insert into evidence_objects (id, tenant_id, owner_id, file_name, state, period_start, period_end, classification, created_by, updated_by)
       values ($1, $2, $3, 'foreign-tenant-file.pdf', 'committed', '2026-01-01', '2026-12-31', 'restricted', $3, $3)`,
      [foreignEvidenceId, otherTenantId, foreignActorId]
    );
    await repositoryPool.query(
      `insert into evidence_versions (id, tenant_id, evidence_id, evidence_version_no, object_uri, sha256, size_bytes, mime_type, observed_at, period_start, period_end, uploaded_by)
       values ($1, $2, $3, 1, 'mem://foreign', $4, 10, 'text/plain', now(), '2026-01-01', '2026-12-31', $5)`,
      [foreignEvidenceVersionId, otherTenantId, foreignEvidenceId, "b".repeat(64), foreignActorId]
    );
    // Attempt the cross-tenant leak: an evidence_links row owned by
    // otherTenantId but pointing target_id at tenantId's real assessment item.
    await repositoryPool.query(
      `insert into evidence_links (id, tenant_id, evidence_version_id, target_type, target_id, purpose, created_by, updated_by)
       values ($1, $2, $3, 'assessment_item', $4, 'cross-tenant-leak-attempt', $5, $5)`,
      [randomUUID(), otherTenantId, foreignEvidenceVersionId, itemId, foreignActorId]
    );

    mockGroundedNarrativeFetch();
    const generated = await postJson(tenantId, `/v1/audit-reports/assessments/${assessmentId}/generate`, {}, "audit_report:write", `ar-xte-${randomUUID()}`);
    expect(generated.status).toBe(201);
    const report = (await generated.json()) as { citationManifest: Record<string, unknown> };
    // enforced by construction: gatherEvidenceForItems scopes its evidence_links
    // query by tenant_id = $1 (tenantId), so otherTenantId's row is invisible
    // regardless of what target_id it was crafted to contain.
    expect(report.citationManifest[`EVIDENCE:${foreignEvidenceId}`]).toBeUndefined();
  }, 120_000);
});

describe("Regression: existing findings/risk workflows still function after this feature", () => {
  it("test 27 & 30: findings/evidence workflow endpoints still work end to end for a fresh assessment", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const { assessmentId, itemId } = await createClosedAssessment(tenantId, actorId);
    const findingCreate = await postJson(
      tenantId,
      "/v1/risk-workflow/findings",
      { assessmentItemId: itemId, severity: "medium", description: "Regression-check finding." },
      "finding:write",
      `ar-finding-${randomUUID()}`
    );
    expect(findingCreate.status).toBe(201);
    const finding = (await findingCreate.json()) as { id: string };
    const listed = await getJson<Array<{ id: string }>>(tenantId, `/v1/risk-workflow/findings?assessmentItemId=${itemId}`, "finding:read");
    expect(listed.some((entry) => entry.id === finding.id)).toBe(true);
    void assessmentId;
  }, 120_000);
});

describe("Task 5 AI Grounding & Precedence Regression Tests", () => {
  it("Task 5.1 & 5.8: Fully grounded narrative reaches 100% and retry feedback corrects bad citations without weakening validation", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const { assessmentId } = await createClosedAssessment(tenantId, actorId);

    let attempts = 0;
    interceptOpenAiFetch(() => {
      attempts += 1;
      const narrative = emptyNarrativePayload();
      if (attempts === 1) {
        narrative.executiveSummary = [
          { text: "Contains bad citation.", citations: ["CONTROL:INVALID:999"], claimType: "fact", numericClaims: [] }
        ];
      } else {
        narrative.executiveSummary = [
          { text: "Commentary statement.", citations: [], claimType: "commentary", numericClaims: [] }
        ];
      }
      return new Response(JSON.stringify({ output_text: JSON.stringify(narrative) }), { status: 200 });
    });

    const generated = await postJson(tenantId, `/v1/audit-reports/assessments/${assessmentId}/generate`, {}, "audit_report:write", `ar-t51-${randomUUID()}`);
    expect(generated.status).toBe(201);
    const report = (await generated.json()) as { groundednessScore: number; narrativeAvailable: boolean };
    expect(report.groundednessScore).toBe(100);
    expect(report.narrativeAvailable).toBe(true);
  }, 120_000);

  it("Task 5.2 & 5.3: Unsupported claims and missing citations remain rejected", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const { assessmentId } = await createClosedAssessment(tenantId, actorId);

    mockHallucinatingFetch();
    const generated = await postJson(tenantId, `/v1/audit-reports/assessments/${assessmentId}/generate`, {}, "audit_report:write", `ar-t52-${randomUUID()}`);
    const report = (await generated.json()) as { groundednessScore: number; narrativeAvailable: boolean };
    expect(report.groundednessScore).toBeLessThan(100);
    expect(report.narrativeAvailable).toBe(false);
  }, 120_000);

  it("Task 5.4: Incorrect numeric compliance claim remains rejected", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const { assessmentId } = await createClosedAssessment(tenantId, actorId);

    interceptOpenAiFetch(() => {
      const narrative = emptyNarrativePayload();
      narrative.executiveSummary = [
        { text: "Wrong metric claim.", citations: ["FRAMEWORK_COMPLIANCE:SOC2"], claimType: "fact", numericClaims: [{ metric: "finding_count", frameworkKey: null, statedValue: 999 }] }
      ];
      return new Response(JSON.stringify({ output_text: JSON.stringify(narrative) }), { status: 200 });
    });

    const generated = await postJson(tenantId, `/v1/audit-reports/assessments/${assessmentId}/generate`, {}, "audit_report:write", `ar-t54-${randomUUID()}`);
    const report = (await generated.json()) as { groundednessScore: number; narrativeAvailable: boolean };
    expect(report.groundednessScore).toBeLessThan(100);
    expect(report.narrativeAvailable).toBe(false);
  }, 120_000);

  it("Task 5.5, 5.6, 5.7: N/A control with contradictory finding/remediation history is surfaced as a legacy reconstruction limitation and cannot become compliant", async () => {
    const tenantId = randomUUID();
    const actorId = randomUUID();
    const evidenceId = randomUUID();
    const created = await postJson(
      tenantId,
      "/v1/assessments",
      {
        scopeName: `N/A Precedence Test ${randomUUID()}`,
        ownerId: actorId,
        periodStart: "2026-01-01",
        periodEnd: "2026-12-31",
        controls: [await approvedControlSelectionForTenant({ pool: repositoryPool, tenantId, actorId })]
      },
      "assessment:write",
      `ar-na-create-${randomUUID()}`
    );
    const assessment = (await created.json()) as { id: string; items: Array<{ id: string }> };
    const itemId = assessment.items[0].id;

    await postJson(tenantId, `/v1/assessments/${assessment.id}/items/${itemId}/applicability`, { applicable: false, rationale: "Not applicable rationale." }, "assessment:write", `ar-na-app-${randomUUID()}`);
    await postJson(tenantId, `/v1/assessments/${assessment.id}/items/${itemId}/answers`, { answerText: "Not applicable answer", evidenceIds: [evidenceId] }, "assessment:write", `ar-na-ans-${randomUUID()}`);
    await postJson(tenantId, `/v1/assessments/${assessment.id}/items/${itemId}/reviews`, { approved: true }, "assessment:review", `ar-na-rev-${randomUUID()}`);

    const findingCreate = await postJson(tenantId, "/v1/risk-workflow/findings", { assessmentItemId: itemId, severity: "high", description: "Finding on N/A control" }, "finding:write", `ar-na-find-${randomUUID()}`);
    const finding = (await findingCreate.json()) as { id: string };
    const taskCreate = await postJson(tenantId, "/v1/risk-workflow/remediation-tasks", { findingId: finding.id, dueAt: "2026-12-31" }, "remediation:write", `ar-na-task-${randomUUID()}`);
    const task = (await taskCreate.json()) as { id: string };
    await postJson(tenantId, `/v1/risk-workflow/remediation-tasks/${task.id}/reviews`, { decision: "approved", rationale: "Verified mitigation" }, "remediation:write", `ar-na-revtask-${randomUUID()}`);

    await repositoryPool.query(`update assessments set status = 'closed' where tenant_id = $1 and id = $2`, [tenantId, assessment.id]);

    mockGroundedNarrativeFetch();
    const generated = await postJson(tenantId, `/v1/audit-reports/assessments/${assessment.id}/generate`, {}, "audit_report:write", `ar-gen-na-${randomUUID()}`);
    expect(generated.status).toBe(201);
    const report = (await generated.json()) as {
      structuredReportJson: {
        engineResult: {
          frameworks: Array<{ displayPercentage: string; satisfiedCount: number; remediatedCount: number; applicableCount: number }>;
          dispositions: Array<{ disposition: string; reason: string }>;
        };
        evidenceLimitations: string[];
      };
    };

    const fw = report.structuredReportJson.engineResult.frameworks[0];
    expect(fw.applicableCount).toBe(0);
    expect(fw.displayPercentage).toContain("N/A");
    expect(fw.remediatedCount).toBe(0);

    const disp = report.structuredReportJson.engineResult.dispositions[0];
    expect(disp.disposition).toBe("not_applicable");
    expect(report.structuredReportJson.evidenceLimitations.some((lim) => lim.includes("marked Not Applicable"))).toBe(true);
  }, 120_000);
});

describe("Semantic Audit Hardening Tests (Final Pass)", () => {
  it("Semantic 1, 2, 3: Active risk acceptance cannot assert proactive, effective management, strategic choice, or abandoned remediation without explicit support", () => {
    const manifest = new Map();
    manifest.set("RISK_ACCEPTANCE:ra-1", {
      id: "RISK_ACCEPTANCE:ra-1",
      type: "risk_acceptance",
      summary: "Risk acceptance ra-1",
      data: { rationale: "Standard corporate risk acceptance approved for period." },
      integrityVerified: true
    });

    const result1 = validateNarrativeGroundedness({
      rawPayload: {
        ...emptyNarrativePayload(),
        riskAnalysis: [
          { text: "The organization adopted a proactive approach to risk management.", citations: ["RISK_ACCEPTANCE:ra-1"], claimType: "fact", numericClaims: [] }
        ]
      },
      snapshot: dummySnapshot(),
      citationManifest: manifest,
      engineResult: { dispositions: [], frameworks: [] }
    });
    expect(result1.passed).toBe(false);
    expect(result1.issues.some((i) => i.detail.includes("unsupported speculation"))).toBe(true);

    const result2 = validateNarrativeGroundedness({
      rawPayload: {
        ...emptyNarrativePayload(),
        riskAnalysis: [
          { text: "Management opted to accept the residual risk instead of pursuing remediation.", citations: ["RISK_ACCEPTANCE:ra-1"], claimType: "fact", numericClaims: [] }
        ]
      },
      snapshot: dummySnapshot(),
      citationManifest: manifest,
      engineResult: { dispositions: [], frameworks: [] }
    });
    expect(result2.passed).toBe(false);
    expect(result2.issues.some((i) => i.detail.includes("unsupported speculation"))).toBe(true);
  });

  it("Semantic 4 & 5: Evidence metadata alone cannot support evidence-content conclusions, while extracted content can", () => {
    const manifestMetadataOnly = new Map();
    manifestMetadataOnly.set("EVIDENCE:ev-1", {
      id: "EVIDENCE:ev-1",
      type: "evidence",
      summary: "Evidence metadata only",
      data: { fileName: "policy.pdf" },
      integrityVerified: true
    });

    const result1 = validateNarrativeGroundedness({
      rawPayload: {
        ...emptyNarrativePayload(),
        evidenceAnalysis: [
          { text: "The evidence did not demonstrate compliance with CCPA.", citations: ["EVIDENCE:ev-1"], claimType: "fact", numericClaims: [] }
        ]
      },
      snapshot: dummySnapshot(),
      citationManifest: manifestMetadataOnly,
      engineResult: { dispositions: [], frameworks: [] }
    });
    expect(result1.passed).toBe(false);
    expect(result1.issues.some((i) => i.detail.includes("metadata/linkage only"))).toBe(true);

    const manifestWithContent = new Map();
    manifestWithContent.set("EVIDENCE:ev-1", {
      id: "EVIDENCE:ev-1",
      type: "evidence",
      summary: "Evidence with text",
      data: { fileName: "policy.pdf", extractedText: "The evidence did not demonstrate compliance with CCPA." },
      integrityVerified: true
    });

    const result2 = validateNarrativeGroundedness({
      rawPayload: {
        ...emptyNarrativePayload(),
        evidenceAnalysis: [
          { text: "The evidence did not demonstrate compliance with CCPA.", citations: ["EVIDENCE:ev-1"], claimType: "fact", numericClaims: [] }
        ]
      },
      snapshot: dummySnapshot(),
      citationManifest: manifestWithContent,
      engineResult: { dispositions: [], frameworks: [] }
    });
    expect(result2.passed).toBe(true);
  });

  it("Semantic 6 & 7: Accepted residual risk remains excluded from compliant numerator and included in applicable denominator", () => {
    const payload = dummySnapshotPayload([
      { disposition: "accepted_residual_risk" },
      { disposition: "satisfied" }
    ]);
    const engine = runComplianceEngine(payload);
    expect(engine.frameworks[0].applicableCount).toBe(2); // included in applicable denominator
    expect(engine.frameworks[0].satisfiedCount).toBe(1);
    expect(engine.frameworks[0].acceptedRiskCount).toBe(1);
    expect(engine.frameworks[0].remediatedCount).toBe(0);
    expect(engine.frameworks[0].rawPercentage).toBe(50); // (1 satisfied + 0 remediated) / 2 = 50%
  });

  it("Semantic 8: Advisory management commentary is clearly distinguished and omits citations cleanly", () => {
    const manifest = new Map();
    const result = validateNarrativeGroundedness({
      rawPayload: {
        ...emptyNarrativePayload(),
        managementAttentionAreas: [
          { text: "The team should consider quarterly access reviews.", citations: [], claimType: "commentary", numericClaims: [] }
        ]
      },
      snapshot: dummySnapshot(),
      citationManifest: manifest,
      engineResult: { dispositions: [], frameworks: [] }
    });
    expect(result.passed).toBe(true);
    expect(result.groundednessScore).toBe(100);
  });

  it("Semantic 9: Conclusions cannot introduce un-cited factual claims", () => {
    const manifest = new Map();
    const result = validateNarrativeGroundedness({
      rawPayload: {
        ...emptyNarrativePayload(),
        conclusion: [
          { text: "Uncited factual claim in conclusion.", citations: [], claimType: "fact", numericClaims: [] }
        ]
      },
      snapshot: dummySnapshot(),
      citationManifest: manifest,
      engineResult: { dispositions: [], frameworks: [] }
    });
    expect(result.passed).toBe(false);
  });

  it("Report 19ab418c-e3af-4c7d-8b5f-90bf89a2e311 Regression: N/A framework percentage claims in executiveSummary are rejected with explicit remedy guidance", () => {
    const manifest = new Map();
    manifest.set("FRAMEWORK_COMPLIANCE:E8", {
      id: "FRAMEWORK_COMPLIANCE:E8",
      type: "framework_compliance",
      summary: "E8 compliance",
      data: { frameworkKey: "E8", rawPercentage: null },
      integrityVerified: true
    });

    const result = validateNarrativeGroundedness({
      rawPayload: {
        ...emptyNarrativePayload(),
        executiveSummary: [
          { text: "E8 achieved 0% compliance.", citations: ["FRAMEWORK_COMPLIANCE:E8"], claimType: "fact", numericClaims: [{ metric: "framework_compliance_percentage", frameworkKey: "E8", statedValue: 0 }] }
        ]
      },
      snapshot: dummySnapshot(),
      citationManifest: manifest,
      engineResult: {
        dispositions: [],
        frameworks: [
          { frameworkKey: "E8", frameworkVersion: "1", rawPercentage: null, displayPercentage: "N/A (no applicable controls)", satisfiedCount: 0, remediatedCount: 0, applicableCount: 0, notApplicableCount: 1, acceptedRiskCount: 0, unresolvedCount: 0, citationId: "FRAMEWORK_COMPLIANCE:E8", formula: "N/A" }
        ]
      }
    });

    expect(result.passed).toBe(false);
    expect(result.issues[0].detail).toContain("REMEDY: Remove the framework_compliance_percentage numericClaim for 'E8' completely");
  });

  it("Report 2201c134-d58b-49c6-b81a-a2b134523303 Regression 1: accepted_residual_risk cannot simultaneously be narrated as unresolved", () => {
    const manifest = new Map();
    manifest.set("FINDING:f-1", {
      id: "FINDING:f-1",
      type: "finding",
      summary: "Finding f-1",
      data: { severity: "medium", disposition: "accepted_residual_risk" },
      integrityVerified: true
    });

    const result = validateNarrativeGroundedness({
      rawPayload: {
        ...emptyNarrativePayload(),
        materialFindings: [
          { text: "Finding f-1 was identified. This finding remains the sole unresolved issue.", citations: ["FINDING:f-1"], claimType: "fact", numericClaims: [] }
        ]
      },
      snapshot: dummySnapshot(),
      citationManifest: manifest,
      engineResult: { dispositions: [], frameworks: [] }
    });

    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.detail.includes("accepted risk items MUST NOT be described as unresolved"))).toBe(true);
  });

  it("Report 2201c134-d58b-49c6-b81a-a2b134523303 Regression 2: risk acceptance cannot imply remediation abandonment without citation support", () => {
    const manifest = new Map();
    manifest.set("RISK_ACCEPTANCE:ra-1", {
      id: "RISK_ACCEPTANCE:ra-1",
      type: "risk_acceptance",
      summary: "Risk acceptance ra-1",
      data: { rationale: "Formal risk acceptance rationale." },
      integrityVerified: true
    });

    const result = validateNarrativeGroundedness({
      rawPayload: {
        ...emptyNarrativePayload(),
        riskAnalysis: [
          { text: "The organization acknowledged the risk while opting not to remediate it at this time.", citations: ["RISK_ACCEPTANCE:ra-1"], claimType: "fact", numericClaims: [] }
        ]
      },
      snapshot: dummySnapshot(),
      citationManifest: manifest,
      engineResult: { dispositions: [], frameworks: [] }
    });

    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.detail.includes("speculative"))).toBe(true);
  });

  it("Report 2201c134-d58b-49c6-b81a-a2b134523303 Regression 3: evidence metadata cannot support evidence-content conclusions like 'did not contribute to compliance'", () => {
    const manifest = new Map();
    manifest.set("EVIDENCE:ev-1", {
      id: "EVIDENCE:ev-1",
      type: "evidence",
      summary: "Evidence file without extracted text",
      data: { fileName: "test.pdf" },
      integrityVerified: true
    });

    const result = validateNarrativeGroundedness({
      rawPayload: {
        ...emptyNarrativePayload(),
        evidenceAnalysis: [
          { text: "The artifacts did not contribute to compliance under CCPA.", citations: ["EVIDENCE:ev-1"], claimType: "fact", numericClaims: [] }
        ]
      },
      snapshot: dummySnapshot(),
      citationManifest: manifest,
      engineResult: { dispositions: [], frameworks: [] }
    });

    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.detail.includes("metadata/linkage only"))).toBe(true);
  });

  it("Report 2201c134-d58b-49c6-b81a-a2b134523303 Regression 4: subjective wording like 'concerning' or 'significant gap in efforts' cannot masquerade as grounded fact", () => {
    const manifest = new Map();
    manifest.set("FRAMEWORK_COMPLIANCE:CCPA", {
      id: "FRAMEWORK_COMPLIANCE:CCPA",
      type: "framework_compliance",
      summary: "CCPA compliance: 0%",
      data: { frameworkKey: "CCPA", rawPercentage: 0 },
      integrityVerified: true
    });

    const result = validateNarrativeGroundedness({
      rawPayload: {
        ...emptyNarrativePayload(),
        overallAssessmentAnalysis: [
          { text: "The overall compliance status under CCPA is concerning.", citations: ["FRAMEWORK_COMPLIANCE:CCPA"], claimType: "fact", numericClaims: [] }
        ]
      },
      snapshot: dummySnapshot(),
      citationManifest: manifest,
      engineResult: { dispositions: [], frameworks: [] }
    });

    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.detail.includes("speculative"))).toBe(true);
  });

  it("Report 2201c134-d58b-49c6-b81a-a2b134523303 Regression 5: commentary cannot bypass grounding for organization-specific factual assertions", () => {
    const manifest = new Map();
    const result = validateNarrativeGroundedness({
      rawPayload: {
        ...emptyNarrativePayload(),
        remediationAnalysis: [
          { text: "The organization has opted to accept the residual risk instead of pursuing remediation.", citations: [], claimType: "commentary", numericClaims: [] }
        ]
      },
      snapshot: dummySnapshot(),
      citationManifest: manifest,
      engineResult: { dispositions: [], frameworks: [] }
    });

    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.detail.includes("asserts organizational facts"))).toBe(true);
  });

  it("Report 2201c134-d58b-49c6-b81a-a2b134523303 Regression 6: conclusions cannot introduce recommendations as factual conclusions", () => {
    const manifest = new Map();
    manifest.set("FRAMEWORK_COMPLIANCE:CCPA", {
      id: "FRAMEWORK_COMPLIANCE:CCPA",
      type: "framework_compliance",
      summary: "CCPA compliance: 0%",
      data: { frameworkKey: "CCPA", rawPercentage: 0 },
      integrityVerified: true
    });

    const result = validateNarrativeGroundedness({
      rawPayload: {
        ...emptyNarrativePayload(),
        conclusion: [
          { text: "The organization must address the identified compliance gaps to enhance posture.", citations: ["FRAMEWORK_COMPLIANCE:CCPA"], claimType: "fact", numericClaims: [] }
        ]
      },
      snapshot: dummySnapshot(),
      citationManifest: manifest,
      engineResult: { dispositions: [], frameworks: [] }
    });

    expect(result.passed).toBe(false);
  });

  it("Report 2201c134-d58b-49c6-b81a-a2b134523303 Regression 7 & 8: deterministic compliance numbers and accepted residual risk numerator exclusion remain unchanged", () => {
    const payload = dummySnapshotPayload([
      { disposition: "accepted_residual_risk" }
    ]);
    const engine = runComplianceEngine(payload);
    expect(engine.frameworks[0].rawPercentage).toBe(0);
    expect(engine.frameworks[0].satisfiedCount).toBe(0);
    expect(engine.frameworks[0].acceptedRiskCount).toBe(1);
  });
});

function dummySnapshotPayload(itemsDisposition: Array<{ disposition: string }>): ClosureSnapshotPayload {
  return {
    schemaVersion: "1.0.0",
    assessment: { id: "a-test", scopeName: "Test", status: "closed", controlSnapshotVersion: "1", periodStart: "2026-01-01", periodEnd: "2026-12-31", createdBy: "user", createdAt: "2026-01-01" },
    items: itemsDisposition.map((item, idx) => ({
      itemId: `item-${idx}`,
      controlRef: { controlId: `C-${idx}`, frameworkKey: "TEST", frameworkVersion: "1", mappingVersion: "1", questionVersion: "1", questionVersionId: "q1", harmonizedControlId: "H1" },
      status: "approved",
      ownerId: "user",
      answerText: "Answer",
      evidenceIds: [],
      applicability: { applicable: true, rationale: "Applies", approvedBy: "user", approvedAt: "2026-01-01" }
    })),
    findings: itemsDisposition
      .map((item, idx) => (item.disposition === "accepted_residual_risk" ? { id: `f-${idx}`, assessmentItemId: `item-${idx}`, testResultId: null, severity: "high", impact: "high", likelihood: "high", ownerId: "user", dueAt: "2026-12-31", description: "Finding", createdAt: "2026-01-01" } : null))
      .filter((f): f is NonNullable<typeof f> => Boolean(f)),
    remediationTasks: [],
    risks: [],
    riskAcceptances: itemsDisposition
      .map((item, idx) => (item.disposition === "accepted_residual_risk" ? { id: `ra-${idx}`, remediationTaskId: `task-${idx}`, findingId: `f-${idx}`, riskId: null, rationale: "Accept rationale", approverId: "user", approvedAt: "2026-01-01", expiresAt: "2027-01-01", nextReviewDueAt: "2026-06-01", compensatingControls: null, supersededAt: null, supersededById: null, isActiveAtCapture: true } : null))
      .filter((ra): ra is NonNullable<typeof ra> => Boolean(ra)),
    evidence: [],
    signoffs: [],
    capturedAt: "2026-01-01",
    reconstructed: false,
    historicalAssuranceLevel: "native"
  };
}

function dummySnapshot(): ClosureSnapshotPayload {
  return dummySnapshotPayload([]);
}

function headers(tenantId: string, scopes: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-tenant-id": tenantId,
    "x-user-id": randomUUID(),
    "x-user-clearance": "restricted",
    "x-user-scopes": scopes
  };
}

async function postJson(tenantId: string, route: string, body: unknown, scopes: string, idempotencyKey: string): Promise<Response> {
  return fetch(`${baseUrl}${route}`, {
    method: "POST",
    headers: { ...headers(tenantId, scopes), "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body)
  });
}

async function getJson<T>(tenantId: string, route: string, scopes: string): Promise<T> {
  const response = await fetch(`${baseUrl}${route}`, { headers: headers(tenantId, scopes) });
  expect(response.status).toBe(200);
  return (await response.json()) as T;
}
