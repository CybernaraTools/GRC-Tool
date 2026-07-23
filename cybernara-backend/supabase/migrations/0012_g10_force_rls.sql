-- Gap remediation Phase 1/G-10 — enable FORCE ROW LEVEL SECURITY, the final
-- "Constrain" stage action per spec §24's Design->Expand->Backfill->Dual
-- operation->Constrain->Cut over->Contract sequence.
--
-- Migration 0008 deliberately left FORCE unset, reasoning that the app still
-- connected as the `postgres` owner role at that point, and enabling FORCE
-- while the owner was still the live connection would have made every table
-- immediately deny-all (the owner would then also be subject to the
-- context-scoped policies, and no request sets app.tenant_id when connecting
-- as postgres). That blocking condition is now gone: database.module.ts's
-- DATABASE_POOL connects as app_runtime via SUPABASE_APP_RUNTIME_DB_URL (see
-- 0011_g10_app_runtime_password_rotation.sql for the password rotation and
-- docs/schema-remediation-progress.md for the cutover verification), and the
-- full backend test suite (161/161) passed against that connection before
-- this migration was written. This is the "Cut over" stage having already
-- landed; this migration is the following "Constrain" stage.
--
-- FORCE ROW LEVEL SECURITY only changes behavior for the table *owner*
-- (`postgres`); app_runtime is already subject to RLS regardless, since it
-- does not own any of these tables. Enabling FORCE closes the specific
-- residual gap that a future accidental owner-role connection (e.g. a
-- one-off admin script run as `postgres`) would otherwise silently bypass
-- every tenant-isolation policy in this schema.
--
-- Scope: every table that received an `_app_context_isolation` /
-- `_app_context_read` / `_app_context_append` policy in 0008, plus
-- risk_acceptances and risk_acceptance_reviews (added in 0010, already RLS
-- enabled with their own context policies, but predate this FORCE pass).
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
    'product_assurance_evidence', 'sdlc_release_gates', 'upload_sessions',
    'audit_events',
    'risk_acceptances', 'risk_acceptance_reviews'
  ];
begin
  foreach tbl in array tenant_tables loop
    execute format('alter table %I force row level security', tbl);
  end loop;
end $$;
