import type pg from "pg";
import {
  QuestionRepositoryService,
  type AssessmentControlSelection,
  type AssessmentQuestionOption,
  type PinnedControlRef
} from "../../src/modules/assessment/public.js";
import { CANONICAL_CONTENT_TENANT_ID } from "../../src/modules/framework-content/public.js";
import { TenantScopedDb } from "../../src/platform/database/tenant-scoped-db.js";

export async function approvedQuestionOptionForTenant(input: {
  pool: pg.Pool;
  tenantId: string;
  actorId: string;
  frameworkKey?: string;
}): Promise<AssessmentQuestionOption> {
  const db = new TenantScopedDb(input.pool);
  const service = new QuestionRepositoryService(db, input.pool);
  const frameworkVersionId = await firstPublishedFrameworkVersionId(input.pool, input.frameworkKey ?? "SOC2");
  await service.enableFramework({
    tenantId: input.tenantId,
    actorId: input.actorId,
    frameworkVersionId
  });
  const options = await service.listAssessmentQuestionOptions(input.tenantId, {
    limit: 25,
    offset: 0
  });
  const option = options.find((candidate) => candidate.frameworkKey === (input.frameworkKey ?? "SOC2")) ?? options[0];
  if (!option) {
    throw new Error(`No approved question option found for ${input.frameworkKey ?? "SOC2"}.`);
  }
  return option;
}

export async function approvedControlRefForTenant(input: {
  pool: pg.Pool;
  tenantId: string;
  actorId: string;
  frameworkKey?: string;
}): Promise<PinnedControlRef> {
  const db = new TenantScopedDb(input.pool);
  const service = new QuestionRepositoryService(db, input.pool);
  const option = await approvedQuestionOptionForTenant(input);
  const controls = await service.resolveAssessmentControls({
    tenantId: input.tenantId,
    selections: [{ questionVersionId: option.questionVersionId }]
  });
  return controls[0];
}

export async function approvedControlSelectionForTenant(input: {
  pool: pg.Pool;
  tenantId: string;
  actorId: string;
  frameworkKey?: string;
}): Promise<AssessmentControlSelection> {
  const option = await approvedQuestionOptionForTenant(input);
  return { questionVersionId: option.questionVersionId };
}

async function firstPublishedFrameworkVersionId(pool: pg.Pool, frameworkKey: string): Promise<string> {
  const result = await pool.query(
    `
      select fv.id
      from framework_versions fv
      join frameworks f on f.id = fv.framework_id and f.tenant_id = fv.tenant_id
      where fv.tenant_id = $1 and fv.status = 'published' and f.framework_key = $2
      order by fv.published_at desc nulls last, fv.created_at desc
      limit 1
    `,
    [CANONICAL_CONTENT_TENANT_ID, frameworkKey]
  );
  if (!result.rows[0]) {
    throw new Error(`${frameworkKey} published framework version fixture is required.`);
  }
  return String(result.rows[0].id);
}
