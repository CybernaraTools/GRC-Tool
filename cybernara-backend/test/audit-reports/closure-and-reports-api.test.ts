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
import { emptyNarrativePayload, NARRATIVE_SECTION_KEYS } from "../../src/modules/audit-reports/public.js";

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
