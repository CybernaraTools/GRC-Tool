import { Inject, Injectable } from "@nestjs/common";
import pg from "pg";
import { ADMIN_DATABASE_POOL } from "../../../platform/database/tokens.js";
import { CANONICAL_CONTENT_TENANT_ID } from "../../framework-content/public.js";
import type { Classification, TenantStatus } from "../domain/identity-tenant.js";
import type {
  PlatformDashboardCount,
  PlatformDashboardFrameworkSummary,
  PlatformDashboardRecentAssessment,
  PlatformDashboardTenant,
  PlatformOnboardingRepository,
  PlatformOperator,
  PlatformOperatorStatus,
  PlatformRole,
  PlatformTenant
} from "../application/platform-onboarding.types.js";

@Injectable()
export class PostgresPlatformOnboardingRepository implements PlatformOnboardingRepository {
  constructor(@Inject(ADMIN_DATABASE_POOL) private readonly pool: pg.Pool) {}

  async findActiveOperator(input: {
    supabaseUserId: string;
    platformRole: PlatformRole;
  }): Promise<PlatformOperator | null> {
    const result = await this.pool.query(
      `
        select id, supabase_user_id, email, display_name, platform_role, status,
               classification, version, created_at, updated_at
        from platform_operators
        where supabase_user_id = $1
          and platform_role = $2
          and status = 'active'
      `,
      [input.supabaseUserId, input.platformRole]
    );
    return result.rows[0] ? mapOperator(result.rows[0]) : null;
  }

  async listTenants(): Promise<PlatformTenant[]> {
    const result = await this.pool.query(
      `
        select id, name, status, classification, version, created_at, updated_at
        from identity_tenants
        order by created_at desc, name asc
      `
    );
    return result.rows.map(mapTenant);
  }

  async getDashboard(): Promise<PlatformDashboardTenant[]> {
    const result = await this.pool.query(
      `
        with tenant_base as (
          select id, name, status, classification, version, created_at, updated_at
          from identity_tenants
        ),
        user_counts as (
          select
            tenant_id,
            count(*)::int as user_count,
            count(*) filter (where status = 'active')::int as active_user_count,
            count(*) filter (where status = 'invited')::int as invited_user_count,
            count(*) filter (where status = 'disabled')::int as disabled_user_count
          from identity_users
          group by tenant_id
        ),
        user_status_counts as (
          select
            tenant_id,
            jsonb_agg(
              jsonb_build_object(
                'key', status,
                'label', initcap(replace(status, '_', ' ')),
                'count', row_count
              )
              order by status
            ) as status_counts
          from (
            select tenant_id, status, count(*)::int as row_count
            from identity_users
            group by tenant_id, status
          ) status_rows
          group by tenant_id
        ),
        role_counts as (
          select
            tenant_id,
            jsonb_agg(
              jsonb_build_object(
                'key', role_key,
                'label', initcap(replace(role_key, '_', ' ')),
                'count', row_count
              )
              order by role_key
            ) as role_counts
          from (
            select g.tenant_id, r.role_key, count(distinct g.user_id)::int as row_count
            from identity_role_grants g
            join identity_roles r on r.id = g.role_id and r.tenant_id = g.tenant_id
            group by g.tenant_id, r.role_key
          ) role_rows
          group by tenant_id
        ),
        assessment_counts as (
          select
            tenant_id,
            count(*)::int as assessment_count,
            count(*) filter (where status in ('approved', 'closed'))::int as closed_assessment_count,
            count(*) filter (where status not in ('approved', 'closed'))::int as open_assessment_count
          from assessments
          group by tenant_id
        ),
        assessment_status_counts as (
          select
            tenant_id,
            jsonb_agg(
              jsonb_build_object(
                'key', status,
                'label', initcap(replace(status, '_', ' ')),
                'count', row_count
              )
              order by status
            ) as status_counts
          from (
            select tenant_id, status::text as status, count(*)::int as row_count
            from assessments
            group by tenant_id, status
          ) status_rows
          group by tenant_id
        ),
        assessment_item_counts as (
          select tenant_id, count(*)::int as assessment_item_count
          from assessment_items
          group by tenant_id
        ),
        evidence_counts as (
          select
            tenant_id,
            count(*)::int as evidence_object_count,
            count(*) filter (where state = 'committed')::int as committed_evidence_object_count
          from evidence_objects
          group by tenant_id
        ),
        finding_counts as (
          select
            f.tenant_id,
            count(distinct f.id)::int as finding_count,
            count(distinct f.id) filter (
              where coalesce(rt.status, 'open') not in ('verified', 'risk_accepted')
            )::int as open_finding_count
          from findings f
          left join remediation_tasks rt on rt.tenant_id = f.tenant_id and rt.finding_id = f.id
          group by f.tenant_id
        ),
        risk_counts as (
          select
            tenant_id,
            count(*)::int as risk_count,
            count(*) filter (where status <> 'closed')::int as open_risk_count
          from risks
          group by tenant_id
        ),
        task_counts as (
          select
            tenant_id,
            count(*)::int as task_count,
            count(*) filter (where status in ('pending', 'in_progress'))::int as pending_task_count
          from universal_tasks
          group by tenant_id
        ),
        active_subscriptions as (
          select tcs.tenant_id, tcs.framework_id, tcs.source_package_id
          from tenant_catalog_subscriptions tcs
          join tenant_base tb on tb.id = tcs.tenant_id
          where tcs.status = 'active'
        ),
        enabled_framework_counts as (
          select tenant_id, count(distinct framework_id)::int as enabled_framework_count
          from active_subscriptions
          group by tenant_id
        ),
        enabled_versions as (
          select
            s.tenant_id,
            f.id as framework_id,
            f.framework_key,
            fv.id as framework_version_id,
            fv.source_package_id
          from active_subscriptions s
          join frameworks f
            on f.tenant_id = $1
           and f.id = s.framework_id
          join framework_versions fv
            on fv.tenant_id = $1
           and fv.framework_id = f.id
           and fv.source_package_id = s.source_package_id
           and fv.status = 'published'
        ),
        mapping_rows as (
          select
            ev.tenant_id,
            ev.framework_key,
            cm.harmonized_control_id,
            qv.id as question_version_id,
            lower(regexp_replace(trim(coalesce(qv.payload_json ->> 'questionText', '')), '\\s+', ' ', 'g')) as question_semantic_key,
            coalesce(qv.payload_json ->> 'responseType', 'text') as question_response_key,
            qv.approved_at,
            qv.created_at
          from enabled_versions ev
          join control_sets cs
            on cs.tenant_id = $1
           and cs.framework_version_id = ev.framework_version_id
          join controls c
            on c.tenant_id = $1
           and c.control_set_id = cs.id
          join control_mappings cm
            on cm.tenant_id = $1
           and cm.framework_key = ev.framework_key
           and (cm.source_control_id = c.control_key or cm.source_control_id like c.control_key || '.%')
           and cm.status = 'published'
          join harmonized_controls hc
            on hc.tenant_id = $1
           and hc.harmonized_id = cm.harmonized_control_id
           and hc.status = 'published'
          join question_sets qs
            on qs.tenant_id = $1
           and qs.control_id = cm.harmonized_control_id
           and qs.status = 'active'
          join question_versions qv
            on qv.tenant_id = $1
           and qv.question_set_id = qs.id
           and qv.status = 'approved'
        ),
        question_frameworks as (
          select
            tenant_id,
            harmonized_control_id,
            question_semantic_key,
            question_response_key,
            array_agg(distinct framework_key order by framework_key) as framework_keys
          from mapping_rows
          group by tenant_id, harmonized_control_id, question_semantic_key, question_response_key
        ),
        canonical_questions as (
          select distinct on (mr.tenant_id, mr.harmonized_control_id, mr.question_semantic_key, mr.question_response_key)
            mr.tenant_id,
            mr.question_version_id,
            qf.framework_keys
          from mapping_rows mr
          join question_frameworks qf
            on qf.tenant_id = mr.tenant_id
           and qf.harmonized_control_id = mr.harmonized_control_id
           and qf.question_semantic_key = mr.question_semantic_key
           and qf.question_response_key = mr.question_response_key
          order by
            mr.tenant_id,
            mr.harmonized_control_id,
            mr.question_semantic_key,
            mr.question_response_key,
            mr.approved_at desc nulls last,
            mr.created_at desc,
            mr.framework_key
        ),
        custom_questions as (
          select
            tq.tenant_id,
            tq.backing_question_version_id as question_version_id,
            coalesce(array_agg(distinct tqf.framework_key order by tqf.framework_key) filter (where tqf.framework_key is not null), array[]::text[]) as framework_keys
          from tenant_questions tq
          left join tenant_question_frameworks tqf
            on tqf.tenant_id = tq.tenant_id
           and tqf.tenant_question_id = tq.id
          where tq.status = 'active'
          group by tq.tenant_id, tq.id, tq.backing_question_version_id
        ),
        all_questions as (
          select tenant_id, question_version_id, framework_keys from canonical_questions
          union all
          select tenant_id, question_version_id, framework_keys from custom_questions
        ),
        question_states as (
          select
            q.tenant_id,
            q.framework_keys,
            (
              q.question_version_id is not null
              and exists (
                select 1
                from assessment_items ai
                join assessments a
                  on a.tenant_id = ai.tenant_id
                 and a.id = ai.assessment_id
                where ai.tenant_id = q.tenant_id
                  and ai.question_version_id = q.question_version_id
                  and a.status in ('approved', 'closed')
              )
            ) as completed
          from all_questions q
        ),
        question_counts as (
          select
            tenant_id,
            count(*)::int as total_questions,
            count(*) filter (where completed)::int as completed_questions,
            count(*) filter (where not completed)::int as remaining_questions
          from question_states
          group by tenant_id
        ),
        framework_counts as (
          select
            tenant_id,
            jsonb_agg(
              jsonb_build_object(
                'frameworkKey', framework_key,
                'totalQuestions', total_questions,
                'completedQuestions', completed_questions,
                'remainingQuestions', total_questions - completed_questions,
                'compliancePercent', case when total_questions > 0 then round((completed_questions::numeric / total_questions::numeric) * 100, 2) else 0 end
              )
              order by framework_key
            ) as frameworks
          from (
            select
              tenant_id,
              framework_key,
              count(*)::int as total_questions,
              count(*) filter (where completed)::int as completed_questions
            from (
              select tenant_id, completed, unnest(framework_keys) as framework_key
              from question_states
              where cardinality(framework_keys) > 0
            ) framework_question_rows
            group by tenant_id, framework_key
          ) grouped_frameworks
          group by tenant_id
        )
        select
          tb.id,
          tb.name,
          tb.status,
          tb.classification,
          tb.version,
          tb.created_at,
          tb.updated_at,
          coalesce(uc.user_count, 0)::int as user_count,
          coalesce(uc.active_user_count, 0)::int as active_user_count,
          coalesce(uc.invited_user_count, 0)::int as invited_user_count,
          coalesce(uc.disabled_user_count, 0)::int as disabled_user_count,
          coalesce(rc.role_counts, '[]'::jsonb) as role_counts,
          coalesce(usc.status_counts, '[]'::jsonb) as user_status_counts,
          coalesce(efc.enabled_framework_count, 0)::int as enabled_framework_count,
          coalesce(qc.total_questions, 0)::int as total_questions,
          coalesce(qc.completed_questions, 0)::int as completed_questions,
          coalesce(qc.remaining_questions, 0)::int as remaining_questions,
          case
            when coalesce(qc.total_questions, 0) > 0
            then round((qc.completed_questions::numeric / qc.total_questions::numeric) * 100, 2)
            else 0
          end as compliance_percent,
          coalesce(fc.frameworks, '[]'::jsonb) as frameworks,
          coalesce(ac.assessment_count, 0)::int as assessment_count,
          coalesce(ac.open_assessment_count, 0)::int as open_assessment_count,
          coalesce(ac.closed_assessment_count, 0)::int as closed_assessment_count,
          coalesce(ascs.status_counts, '[]'::jsonb) as assessment_status_counts,
          coalesce(aic.assessment_item_count, 0)::int as assessment_item_count,
          coalesce(ec.evidence_object_count, 0)::int as evidence_object_count,
          coalesce(ec.committed_evidence_object_count, 0)::int as committed_evidence_object_count,
          coalesce(fic.finding_count, 0)::int as finding_count,
          coalesce(fic.open_finding_count, 0)::int as open_finding_count,
          coalesce(riskc.risk_count, 0)::int as risk_count,
          coalesce(riskc.open_risk_count, 0)::int as open_risk_count,
          coalesce(tc.task_count, 0)::int as task_count,
          coalesce(tc.pending_task_count, 0)::int as pending_task_count,
          coalesce(recent.recent_assessments, '[]'::jsonb) as recent_assessments
        from tenant_base tb
        left join user_counts uc on uc.tenant_id = tb.id
        left join role_counts rc on rc.tenant_id = tb.id
        left join user_status_counts usc on usc.tenant_id = tb.id
        left join enabled_framework_counts efc on efc.tenant_id = tb.id
        left join question_counts qc on qc.tenant_id = tb.id
        left join framework_counts fc on fc.tenant_id = tb.id
        left join assessment_counts ac on ac.tenant_id = tb.id
        left join assessment_status_counts ascs on ascs.tenant_id = tb.id
        left join assessment_item_counts aic on aic.tenant_id = tb.id
        left join evidence_counts ec on ec.tenant_id = tb.id
        left join finding_counts fic on fic.tenant_id = tb.id
        left join risk_counts riskc on riskc.tenant_id = tb.id
        left join task_counts tc on tc.tenant_id = tb.id
        left join lateral (
          select jsonb_agg(
            jsonb_build_object(
              'id', id,
              'scopeName', scope_name,
              'status', status,
              'itemCount', item_count,
              'createdAt', created_at
            )
            order by created_at desc
          ) as recent_assessments
          from (
            select
              a.id,
              a.scope_name,
              a.status::text as status,
              a.created_at,
              count(ai.id)::int as item_count
            from assessments a
            left join assessment_items ai
              on ai.tenant_id = a.tenant_id
             and ai.assessment_id = a.id
            where a.tenant_id = tb.id
            group by a.id, a.scope_name, a.status, a.created_at
            order by a.created_at desc
            limit 5
          ) recent_rows
        ) recent on true
        order by tb.created_at desc, tb.name asc
      `,
      [CANONICAL_CONTENT_TENANT_ID]
    );
    return result.rows.map(mapDashboardTenant);
  }

  async findTenantById(tenantId: string): Promise<PlatformTenant | null> {
    const result = await this.pool.query(
      `
        select id, name, status, classification, version, created_at, updated_at
        from identity_tenants
        where id = $1
      `,
      [tenantId]
    );
    return result.rows[0] ? mapTenant(result.rows[0]) : null;
  }

  async createTenant(input: {
    tenantId: string;
    name: string;
    classification: Classification;
    createdBy: string;
  }): Promise<PlatformTenant> {
    const result = await this.pool.query(
      `
        insert into identity_tenants (
          id, tenant_id, name, status, classification, version,
          created_by, created_at, updated_by, updated_at
        )
        values ($1, $1, $2, 'active', $3, 1, $4, now(), $4, now())
        returning id, name, status, classification, version, created_at, updated_at
      `,
      [input.tenantId, input.name.trim(), input.classification, input.createdBy]
    );
    return mapTenant(result.rows[0]);
  }

  async updateTenantStatus(input: {
    tenantId: string;
    status: TenantStatus;
    updatedBy: string;
  }): Promise<PlatformTenant | null> {
    const result = await this.pool.query(
      `
        update identity_tenants
        set status = $2,
            updated_by = $3,
            updated_at = now(),
            version = version + 1
        where id = $1
        returning id, name, status, classification, version, created_at, updated_at
      `,
      [input.tenantId, input.status, input.updatedBy]
    );
    return result.rows[0] ? mapTenant(result.rows[0]) : null;
  }
}

function mapOperator(row: Record<string, unknown>): PlatformOperator {
  return {
    id: String(row.id),
    supabaseUserId: String(row.supabase_user_id),
    email: String(row.email),
    displayName: typeof row.display_name === "string" ? row.display_name : undefined,
    platformRole: row.platform_role as PlatformRole,
    status: row.status as PlatformOperatorStatus,
    classification: row.classification as Classification,
    version: Number(row.version),
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date
  };
}

function mapDashboardTenant(row: Record<string, unknown>): PlatformDashboardTenant {
  const totalQuestions = numberValue(row.total_questions);
  const completedQuestions = numberValue(row.completed_questions);
  return {
    id: String(row.id),
    name: String(row.name),
    status: row.status as PlatformTenant["status"],
    classification: row.classification as Classification,
    version: Number(row.version),
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
    userCount: numberValue(row.user_count),
    activeUserCount: numberValue(row.active_user_count),
    invitedUserCount: numberValue(row.invited_user_count),
    disabledUserCount: numberValue(row.disabled_user_count),
    roleCounts: countArray(row.role_counts),
    userStatusCounts: countArray(row.user_status_counts),
    enabledFrameworkCount: numberValue(row.enabled_framework_count),
    totalQuestions,
    completedQuestions,
    remainingQuestions: numberValue(row.remaining_questions),
    compliancePercent: numberValue(row.compliance_percent),
    frameworks: frameworkArray(row.frameworks),
    assessmentCount: numberValue(row.assessment_count),
    openAssessmentCount: numberValue(row.open_assessment_count),
    closedAssessmentCount: numberValue(row.closed_assessment_count),
    assessmentStatusCounts: countArray(row.assessment_status_counts),
    assessmentItemCount: numberValue(row.assessment_item_count),
    evidenceObjectCount: numberValue(row.evidence_object_count),
    committedEvidenceObjectCount: numberValue(row.committed_evidence_object_count),
    findingCount: numberValue(row.finding_count),
    openFindingCount: numberValue(row.open_finding_count),
    riskCount: numberValue(row.risk_count),
    openRiskCount: numberValue(row.open_risk_count),
    taskCount: numberValue(row.task_count),
    pendingTaskCount: numberValue(row.pending_task_count),
    recentAssessments: recentAssessmentArray(row.recent_assessments)
  };
}

function mapTenant(row: Record<string, unknown>): PlatformTenant {
  return {
    id: String(row.id),
    name: String(row.name),
    status: row.status as PlatformTenant["status"],
    classification: row.classification as Classification,
    version: Number(row.version),
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date
  };
}

function countArray(value: unknown): PlatformDashboardCount[] {
  return jsonArray(value).map((entry) => {
    const row = jsonObject(entry);
    const key = String(row.key ?? "");
    return {
      key,
      label: String(row.label ?? key),
      count: numberValue(row.count)
    };
  });
}

function frameworkArray(value: unknown): PlatformDashboardFrameworkSummary[] {
  return jsonArray(value).map((entry) => {
    const row = jsonObject(entry);
    const totalQuestions = numberValue(row.totalQuestions);
    const completedQuestions = numberValue(row.completedQuestions);
    return {
      frameworkKey: String(row.frameworkKey ?? ""),
      totalQuestions,
      completedQuestions,
      remainingQuestions: numberValue(row.remainingQuestions),
      compliancePercent: numberValue(row.compliancePercent)
    };
  });
}

function recentAssessmentArray(value: unknown): PlatformDashboardRecentAssessment[] {
  return jsonArray(value).map((entry) => {
    const row = jsonObject(entry);
    return {
      id: String(row.id ?? ""),
      scopeName: String(row.scopeName ?? ""),
      status: String(row.status ?? ""),
      itemCount: numberValue(row.itemCount),
      createdAt: new Date(String(row.createdAt))
    };
  });
}

function jsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  }
  return [];
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberValue(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
