-- Gap remediation Phase 1 (Guard rails) — G-10 tenant security assurance foundation.
--
-- Root cause: every tenant table has `alter table ... enable row level security`
-- and a policy comparing tenant_id to auth.jwt()->>'tenant_id', but:
--   1. The application connects via SUPABASE_DB_URL as the `postgres` role, which
--      OWNS every table created by these migrations. PostgreSQL always lets the
--      table owner bypass RLS unless FORCE ROW LEVEL SECURITY is also set — so
--      today's RLS policies have never actually been evaluated for the running
--      application. Isolation currently rests entirely on the app filtering by
--      tenant_id in each query, not on the database.
--   2. Even if the owner-bypass problem were fixed, `auth.jwt()` is a Supabase
--      PostgREST helper that reads a per-connection GUC PostgREST sets from a
--      verified Supabase Auth JWT. This backend never talks to PostgREST for
--      business data (see ADR-0001: direct `pg` access) — auth.jwt() always
--      resolves to NULL on this connection, so even a non-owner role would be
--      denied everything under the existing policies alone.
--
-- This migration is pure "Expand" per the schema spec's migration/cutover
-- standard (§24): it creates a new, separate, non-owner application role and a
-- second, additive, permissive policy per table driven by transaction-local
-- `app.tenant_id`/`app.principal_id` settings (set via `set_config(..., true)`
-- inside a transaction — never from request bodies). Because these policies are
-- additive (multiple permissive policies OR together) and the existing
-- application keeps connecting as `postgres` for now, NOTHING about the running
-- application's behavior changes as a result of this migration. The actual
-- connection cutover to the new role happens only once every repository has
-- been migrated to set that transaction-local context (tracked separately;
-- risk-workflow is migrated as the first proof-of-mechanism in this same
-- remediation pass — see postgres-risk-workflow.repository.ts).
--
-- FORCE ROW LEVEL SECURITY is deliberately NOT enabled in this migration. Per
-- spec §24, enabling FORCE is a "Constrain" stage action, applied only after
-- the owning connection has actually moved off the table-owner role — enabling
-- it now, while the app still connects as owner and the owner would then also
-- be subject to the (currently always-false) auth.jwt() policy, would make
-- every table deny-all for the running application immediately.

-- 1. Non-owner, non-bypassrls, non-superuser application role. Grants are
--    additive; this role has no ability to alter schema, own objects, or
--    bypass RLS, so it cannot escalate regardless of what the application does
--    with it later.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_runtime') then
    create role app_runtime with login password 'change-me-before-production-cutover' noinherit;
  end if;
end $$;

alter role app_runtime set statement_timeout = '30s';
alter role app_runtime set idle_in_transaction_session_timeout = '15s';

grant usage on schema public to app_runtime;
grant usage, select on all sequences in schema public to app_runtime;
alter default privileges in schema public grant usage, select on sequences to app_runtime;

-- 2. Transaction-local tenant/principal context helpers. `current_setting(...,
--    true)` returns NULL instead of raising when unset, so a request that never
--    calls set_config (missing context) safely denies rather than erroring.
create or replace function app_current_tenant() returns uuid
language sql stable as $$
  select nullif(current_setting('app.tenant_id', true), '')::uuid
$$;

create or replace function app_current_principal() returns uuid
language sql stable as $$
  select nullif(current_setting('app.principal_id', true), '')::uuid
$$;

-- 3. Add one additive context-scoped policy per existing tenant table, and
--    grant app_runtime baseline DML. audit_events is append-only and keeps a
--    read-only context policy (no update/delete grant; insert is granted here
--    because there is not yet a separate dedicated audit-writer role per spec
--    §21 — that split is tracked as remaining work in the remediation report).
do $$
declare
  tbl text;
  tenant_tables text[] := array[
    'identity_tenants', 'identity_users', 'identity_roles', 'identity_role_grants',
    'identity_sessions', 'identity_service_accounts', 'identity_workspace_delegations',
    'outbox_events',
    'content_source_packages', 'framework_content_packs', 'framework_requirements',
    'harmonized_controls', 'control_mappings', 'content_rejected_records',
    'assessments', 'assessment_items', 'evidence_objects', 'findings',
    'remediation_tasks', 'report_exports',
    'ai_retrieval_indexes', 'ai_prompt_versions', 'ai_model_deployments',
    'ai_evaluation_runs', 'ai_generation_runs', 'ai_question_versions', 'ai_output_reviews',
    'connectors', 'connector_sync_runs', 'connector_objects', 'webhook_contracts',
    'webhook_deliveries', 'automated_control_tests', 'assurance_alerts',
    'data_inventory_records', 'processing_activities', 'dpia_assessments',
    'privacy_rights_requests', 'consent_records', 'privacy_incidents',
    'retention_schedules', 'policy_versions', 'access_reviews', 'vendors',
    'audit_engagements', 'trust_center_artifacts', 'grc_workspaces',
    'custom_object_definitions',
    'authorization_decision_logs', 'rate_limit_policies', 'export_manifests',
    'encryption_key_records', 'siem_export_records', 'backup_restore_tests',
    'product_assurance_evidence', 'sdlc_release_gates', 'upload_sessions'
  ];
begin
  foreach tbl in array tenant_tables loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = tbl and policyname = tbl || '_app_context_isolation'
    ) then
      execute format(
        'create policy %I on %I using (tenant_id = app_current_tenant()) with check (tenant_id = app_current_tenant())',
        tbl || '_app_context_isolation', tbl
      );
    end if;
    execute format('grant select, insert, update, delete on %I to app_runtime', tbl);
  end loop;

  -- audit_events: read policy only, matching its append-only design; no
  -- update/delete grant at all (the existing trigger also rejects them).
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'audit_events' and policyname = 'audit_events_app_context_read'
  ) then
    create policy audit_events_app_context_read on audit_events
      for select using (tenant_id = app_current_tenant());
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'audit_events' and policyname = 'audit_events_app_context_append'
  ) then
    create policy audit_events_app_context_append on audit_events
      for insert with check (tenant_id = app_current_tenant());
  end if;
  grant select, insert on audit_events to app_runtime;
end $$;
