# Cybernara Row-Level Security (RLS) Configuration

## Table RLS Status

| Table Name | RLS Enabled | Force RLS Enabled |
|---|---|---|
| access_review_decisions | true | true |
| access_review_items | true | true |
| access_reviews | true | true |
| ai_evaluation_runs | true | true |
| ai_generation_runs | true | true |
| ai_model_deployments | true | true |
| ai_output_reviews | true | true |
| ai_prompt_versions | true | true |
| ai_publication_events | true | true |
| ai_question_versions | true | true |
| ai_retrieval_indexes | true | true |
| answer_revisions | true | true |
| applicability_decisions | true | true |
| assessment_frameworks | true | true |
| assessment_items | true | true |
| assessment_scopes | true | true |
| assessment_signoffs | true | true |
| assessment_snapshots | true | true |
| assessments | true | true |
| assurance_alerts | true | true |
| audit_checkpoints | true | true |
| audit_engagements | true | true |
| audit_events | true | true |
| audit_requests | true | true |
| audit_tests | true | true |
| audit_verifications | true | true |
| authorization_decision_logs | true | true |
| automated_control_tests | true | true |
| automated_test_runs | true | true |
| automated_tests | true | true |
| backup_restore_tests | true | true |
| connector_objects | true | true |
| connector_sync_runs | true | true |
| connectors | true | true |
| consent_events | true | true |
| consent_purposes | true | true |
| consent_records | true | true |
| content_rejected_records | true | true |
| content_source_packages | true | true |
| control_instances | true | true |
| control_mappings | true | true |
| control_sets | true | true |
| control_subcontrols | true | true |
| control_test_results | true | true |
| controls | true | true |
| custom_field_definitions | true | true |
| custom_object_definitions | true | true |
| custom_records | true | true |
| custom_values | true | true |
| data_categories | true | true |
| data_discovery_findings | true | true |
| data_discovery_scans | true | true |
| data_inventory_records | true | true |
| data_subject_categories | true | true |
| deletion_items | true | true |
| deletion_jobs | true | true |
| dpia_assessments | true | true |
| dpia_risks | true | true |
| dpias | true | true |
| encryption_key_records | true | true |
| evaluation_cases | true | true |
| evaluation_results | true | true |
| evaluation_suites | true | true |
| evidence_custody_events | true | true |
| evidence_expiry_events | true | true |
| evidence_links | true | true |
| evidence_objects | true | true |
| evidence_requests | true | true |
| evidence_reviews | true | true |
| evidence_samples | true | true |
| evidence_versions | true | true |
| export_manifests | true | true |
| findings | true | true |
| framework_content_packs | true | true |
| framework_requirements | true | true |
| framework_versions | true | true |
| frameworks | true | true |
| generation_citations | true | true |
| grc_workspaces | true | true |
| harmonized_controls | true | true |
| identity_role_grants | true | true |
| identity_roles | true | true |
| identity_service_accounts | true | true |
| identity_sessions | true | true |
| identity_tenants | true | true |
| identity_users | true | true |
| identity_workspace_delegations | true | true |
| incident_assessments | true | true |
| incident_notifications | true | true |
| knowledge_chunks | true | true |
| lawful_bases | true | true |
| legal_hold_items | true | true |
| legal_holds | true | true |
| malware_scan_results | true | true |
| mapping_conflicts | true | true |
| mapping_reviews | true | true |
| mapping_versions | true | true |
| outbox_events | true | true |
| policies | true | true |
| policy_attestations | true | true |
| policy_control_links | true | true |
| policy_versions | true | true |
| privacy_incidents | true | true |
| privacy_notice_versions | true | true |
| privacy_notices | true | true |
| privacy_rights_requests | true | true |
| processing_activities | true | true |
| processing_inventory_links | true | true |
| processing_purposes | true | true |
| processing_recipients | true | true |
| product_assurance_evidence | true | true |
| purposes | true | true |
| question_sets | true | true |
| question_versions | true | true |
| rate_limit_policies | true | true |
| recipients | true | true |
| remediation_tasks | true | true |
| report_exports | true | true |
| report_templates | true | true |
| requirement_instances | true | true |
| retention_assignments | true | true |
| retention_rules | true | true |
| retention_schedules | true | true |
| retrieval_runs | true | true |
| retrieved_chunks | true | true |
| review_decisions | true | true |
| rights_request_tasks | true | true |
| risk_acceptance_reviews | true | true |
| risk_acceptances | true | true |
| risk_links | true | true |
| risk_models | true | true |
| risk_treatments | true | true |
| risks | true | true |
| safety_checks | true | true |
| sdlc_release_gates | true | true |
| siem_export_records | true | true |
| systems_assets | true | true |
| tenant_catalog_subscriptions | true | true |
| test_procedures | true | true |
| transfers | true | true |
| trust_center_artifacts | true | true |
| upload_sessions | true | true |
| vendor_assessments | true | true |
| vendor_findings | true | true |
| vendors | true | true |
| webhook_contracts | true | true |
| webhook_deliveries | true | true |

## RLS Policies Details


### Table: access_review_decisions

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| access_review_decisions_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| access_review_decisions_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: access_review_items

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| access_review_items_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| access_review_items_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: access_reviews

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| access_reviews_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| access_reviews_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: ai_evaluation_runs

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| ai_evaluation_runs_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| ai_evaluation_runs_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: ai_generation_runs

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| ai_generation_runs_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| ai_generation_runs_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: ai_model_deployments

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| ai_model_deployments_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| ai_model_deployments_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: ai_output_reviews

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| ai_output_reviews_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| ai_output_reviews_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: ai_prompt_versions

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| ai_prompt_versions_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| ai_prompt_versions_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: ai_publication_events

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| ai_publication_events_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| ai_publication_events_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: ai_question_versions

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| ai_question_versions_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| ai_question_versions_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: ai_retrieval_indexes

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| ai_retrieval_indexes_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| ai_retrieval_indexes_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: answer_revisions

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| answer_revisions_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| answer_revisions_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: applicability_decisions

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| applicability_decisions_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| applicability_decisions_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: assessment_frameworks

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| assessment_frameworks_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| assessment_frameworks_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: assessment_items

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| assessment_items_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| assessment_items_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: assessment_scopes

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| assessment_scopes_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| assessment_scopes_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: assessment_signoffs

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| assessment_signoffs_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| assessment_signoffs_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: assessment_snapshots

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| assessment_snapshots_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| assessment_snapshots_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: assessments

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| assessments_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| assessments_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: assurance_alerts

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| assurance_alerts_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| assurance_alerts_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: audit_checkpoints

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| audit_checkpoints_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| audit_checkpoints_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: audit_engagements

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| audit_engagements_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| audit_engagements_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: audit_events

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| audit_events_app_context_append | {public} | INSERT | `None` | `(tenant_id = app_current_tenant())` |
| audit_events_app_context_read | {public} | SELECT | `(tenant_id = app_current_tenant())` | `None` |
| audit_events_tenant_read | {public} | SELECT | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `None` |

### Table: audit_requests

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| audit_requests_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| audit_requests_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: audit_tests

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| audit_tests_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| audit_tests_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: audit_verifications

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| audit_verifications_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| audit_verifications_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: authorization_decision_logs

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| authorization_decision_logs_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| authorization_decision_logs_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: automated_control_tests

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| automated_control_tests_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| automated_control_tests_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: automated_test_runs

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| automated_test_runs_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| automated_test_runs_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: automated_tests

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| automated_tests_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| automated_tests_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: backup_restore_tests

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| backup_restore_tests_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| backup_restore_tests_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: connector_objects

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| connector_objects_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| connector_objects_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: connector_sync_runs

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| connector_sync_runs_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| connector_sync_runs_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: connectors

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| connectors_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| connectors_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: consent_events

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| consent_events_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| consent_events_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: consent_purposes

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| consent_purposes_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| consent_purposes_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: consent_records

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| consent_records_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| consent_records_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: content_rejected_records

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| content_rejected_records_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| content_rejected_records_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: content_source_packages

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| content_source_packages_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| content_source_packages_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: control_instances

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| control_instances_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| control_instances_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: control_mappings

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| control_mappings_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| control_mappings_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: control_sets

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| control_sets_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| control_sets_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: control_subcontrols

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| control_subcontrols_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| control_subcontrols_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: control_test_results

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| control_test_results_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| control_test_results_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: controls

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| controls_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| controls_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: custom_field_definitions

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| custom_field_definitions_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| custom_field_definitions_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: custom_object_definitions

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| custom_object_definitions_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| custom_object_definitions_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: custom_records

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| custom_records_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| custom_records_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: custom_values

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| custom_values_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| custom_values_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: data_categories

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| data_categories_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| data_categories_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: data_discovery_findings

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| data_discovery_findings_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| data_discovery_findings_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: data_discovery_scans

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| data_discovery_scans_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| data_discovery_scans_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: data_inventory_records

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| data_inventory_records_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| data_inventory_records_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: data_subject_categories

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| data_subject_categories_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| data_subject_categories_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: deletion_items

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| deletion_items_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| deletion_items_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: deletion_jobs

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| deletion_jobs_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| deletion_jobs_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: dpia_assessments

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| dpia_assessments_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| dpia_assessments_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: dpia_risks

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| dpia_risks_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| dpia_risks_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: dpias

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| dpias_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| dpias_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: encryption_key_records

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| encryption_key_records_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| encryption_key_records_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: evaluation_cases

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| evaluation_cases_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| evaluation_cases_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: evaluation_results

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| evaluation_results_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| evaluation_results_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: evaluation_suites

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| evaluation_suites_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| evaluation_suites_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: evidence_custody_events

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| evidence_custody_events_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| evidence_custody_events_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: evidence_expiry_events

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| evidence_expiry_events_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| evidence_expiry_events_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: evidence_links

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| evidence_links_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| evidence_links_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: evidence_objects

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| evidence_objects_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| evidence_objects_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: evidence_requests

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| evidence_requests_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| evidence_requests_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: evidence_reviews

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| evidence_reviews_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| evidence_reviews_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: evidence_samples

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| evidence_samples_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| evidence_samples_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: evidence_versions

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| evidence_versions_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| evidence_versions_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: export_manifests

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| export_manifests_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| export_manifests_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: findings

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| findings_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| findings_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: framework_content_packs

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| framework_content_packs_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| framework_content_packs_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: framework_requirements

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| framework_requirements_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| framework_requirements_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: framework_versions

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| framework_versions_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| framework_versions_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: frameworks

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| frameworks_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| frameworks_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: generation_citations

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| generation_citations_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| generation_citations_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: grc_workspaces

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| grc_workspaces_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| grc_workspaces_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: harmonized_controls

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| harmonized_controls_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| harmonized_controls_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: identity_role_grants

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| identity_role_grants_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| identity_role_grants_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: identity_roles

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| identity_roles_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| identity_roles_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: identity_service_accounts

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| identity_service_accounts_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| identity_service_accounts_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: identity_sessions

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| identity_sessions_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| identity_sessions_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: identity_tenants

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| identity_tenants_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| identity_tenants_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: identity_users

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| identity_users_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| identity_users_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: identity_workspace_delegations

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| identity_workspace_delegations_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| identity_workspace_delegations_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: incident_assessments

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| incident_assessments_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| incident_assessments_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: incident_notifications

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| incident_notifications_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| incident_notifications_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: knowledge_chunks

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| knowledge_chunks_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| knowledge_chunks_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: lawful_bases

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| lawful_bases_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| lawful_bases_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: legal_hold_items

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| legal_hold_items_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| legal_hold_items_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: legal_holds

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| legal_holds_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| legal_holds_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: malware_scan_results

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| malware_scan_results_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| malware_scan_results_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: mapping_conflicts

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| mapping_conflicts_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| mapping_conflicts_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: mapping_reviews

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| mapping_reviews_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| mapping_reviews_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: mapping_versions

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| mapping_versions_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| mapping_versions_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: outbox_events

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| outbox_events_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| outbox_events_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: policies

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| policies_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| policies_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: policy_attestations

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| policy_attestations_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| policy_attestations_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: policy_control_links

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| policy_control_links_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| policy_control_links_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: policy_versions

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| policy_versions_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| policy_versions_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: privacy_incidents

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| privacy_incidents_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| privacy_incidents_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: privacy_notice_versions

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| privacy_notice_versions_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| privacy_notice_versions_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: privacy_notices

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| privacy_notices_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| privacy_notices_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: privacy_rights_requests

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| privacy_rights_requests_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| privacy_rights_requests_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: processing_activities

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| processing_activities_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| processing_activities_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: processing_inventory_links

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| processing_inventory_links_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| processing_inventory_links_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: processing_purposes

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| processing_purposes_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| processing_purposes_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: processing_recipients

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| processing_recipients_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| processing_recipients_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: product_assurance_evidence

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| product_assurance_evidence_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| product_assurance_evidence_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: purposes

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| purposes_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| purposes_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: question_sets

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| question_sets_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| question_sets_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: question_versions

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| question_versions_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| question_versions_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: rate_limit_policies

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| rate_limit_policies_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| rate_limit_policies_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: recipients

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| recipients_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| recipients_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: remediation_tasks

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| remediation_tasks_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| remediation_tasks_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: report_exports

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| report_exports_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| report_exports_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: report_templates

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| report_templates_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| report_templates_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: requirement_instances

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| requirement_instances_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| requirement_instances_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: retention_assignments

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| retention_assignments_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| retention_assignments_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: retention_rules

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| retention_rules_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| retention_rules_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: retention_schedules

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| retention_schedules_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| retention_schedules_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: retrieval_runs

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| retrieval_runs_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| retrieval_runs_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: retrieved_chunks

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| retrieved_chunks_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| retrieved_chunks_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: review_decisions

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| review_decisions_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| review_decisions_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: rights_request_tasks

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| rights_request_tasks_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| rights_request_tasks_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: risk_acceptance_reviews

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| risk_acceptance_reviews_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| risk_acceptance_reviews_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: risk_acceptances

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| risk_acceptances_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| risk_acceptances_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: risk_links

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| risk_links_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| risk_links_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: risk_models

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| risk_models_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| risk_models_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: risk_treatments

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| risk_treatments_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| risk_treatments_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: risks

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| risks_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| risks_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: safety_checks

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| safety_checks_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| safety_checks_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: sdlc_release_gates

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| sdlc_release_gates_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| sdlc_release_gates_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: siem_export_records

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| siem_export_records_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| siem_export_records_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: systems_assets

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| systems_assets_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| systems_assets_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: tenant_catalog_subscriptions

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| tenant_catalog_subscriptions_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| tenant_catalog_subscriptions_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: test_procedures

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| test_procedures_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| test_procedures_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: transfers

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| transfers_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| transfers_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: trust_center_artifacts

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| trust_center_artifacts_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| trust_center_artifacts_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: upload_sessions

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| upload_sessions_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| upload_sessions_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: vendor_assessments

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| vendor_assessments_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| vendor_assessments_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: vendor_findings

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| vendor_findings_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| vendor_findings_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: vendors

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| vendors_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| vendors_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: webhook_contracts

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| webhook_contracts_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| webhook_contracts_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |

### Table: webhook_deliveries

| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |
|---|---|---|---|---|
| webhook_deliveries_app_context_isolation | {public} | ALL | `(tenant_id = app_current_tenant())` | `(tenant_id = app_current_tenant())` |
| webhook_deliveries_tenant_isolation | {public} | ALL | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` | `((tenant_id)::text = COALESCE((auth.jwt() ->> 'tenant_id'::text), ''::text))` |
