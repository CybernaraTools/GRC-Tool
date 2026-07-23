# Cybernara Constraints


## Table: access_review_decisions

| Constraint Name | Type | Definition |
|---|---|---|
| access_review_decisions_decision_check | CHECK | `CHECK ((decision = ANY (ARRAY['approved'::text, 'revoked'::text, 'flagged'::text])))` |
| access_review_decisions_review_item_id_fkey | FOREIGN KEY | `FOREIGN KEY (review_item_id) REFERENCES access_review_items(id)` |
| access_review_decisions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: access_review_items

| Constraint Name | Type | Definition |
|---|---|---|
| access_review_items_risk_level_check | CHECK | `CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))` |
| access_review_items_access_review_id_fkey | FOREIGN KEY | `FOREIGN KEY (access_review_id) REFERENCES access_reviews(id)` |
| access_review_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| access_review_items_access_review_id_principal_ref_resource_key | UNIQUE | `UNIQUE (access_review_id, principal_ref, resource_ref, entitlement_ref)` |

## Table: access_reviews

| Constraint Name | Type | Definition |
|---|---|---|
| access_reviews_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: ai_evaluation_runs

| Constraint Name | Type | Definition |
|---|---|---|
| ai_evaluation_runs_target_type_check | CHECK | `CHECK ((target_type = ANY (ARRAY['prompt'::text, 'model'::text, 'retrieval_policy'::text])))` |
| ai_evaluation_runs_suite_id_fkey | FOREIGN KEY | `FOREIGN KEY (suite_id) REFERENCES evaluation_suites(id)` |
| ai_evaluation_runs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: ai_generation_runs

| Constraint Name | Type | Definition |
|---|---|---|
| ai_generation_runs_model_deployment_id_fkey | FOREIGN KEY | `FOREIGN KEY (model_deployment_id) REFERENCES ai_model_deployments(id)` |
| ai_generation_runs_prompt_version_id_fkey | FOREIGN KEY | `FOREIGN KEY (prompt_version_id) REFERENCES ai_prompt_versions(id)` |
| ai_generation_runs_retrieval_index_id_fkey | FOREIGN KEY | `FOREIGN KEY (retrieval_index_id) REFERENCES ai_retrieval_indexes(id)` |
| ai_generation_runs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: ai_model_deployments

| Constraint Name | Type | Definition |
|---|---|---|
| ai_model_deployments_risk_tier_check | CHECK | `CHECK ((risk_tier = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))` |
| ai_model_deployments_status_check | CHECK | `CHECK ((status = ANY (ARRAY['draft'::text, 'approved'::text, 'retired'::text])))` |
| ai_model_deployments_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| ai_model_deployments_tenant_id_provider_model_name_deployme_key | UNIQUE | `UNIQUE (tenant_id, provider, model_name, deployment_version, region)` |

## Table: ai_output_reviews

| Constraint Name | Type | Definition |
|---|---|---|
| ai_output_reviews_decision_check | CHECK | `CHECK ((decision = ANY (ARRAY['approved'::text, 'rejected'::text, 'needs_changes'::text])))` |
| ai_output_reviews_generation_run_id_fkey | FOREIGN KEY | `FOREIGN KEY (generation_run_id) REFERENCES ai_generation_runs(id)` |
| ai_output_reviews_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: ai_prompt_versions

| Constraint Name | Type | Definition |
|---|---|---|
| ai_prompt_versions_status_check | CHECK | `CHECK ((status = ANY (ARRAY['draft'::text, 'approved'::text, 'retired'::text])))` |
| ai_prompt_versions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| ai_prompt_versions_tenant_id_prompt_key_prompt_version_key | UNIQUE | `UNIQUE (tenant_id, prompt_key, prompt_version)` |

## Table: ai_publication_events

| Constraint Name | Type | Definition |
|---|---|---|
| ai_publication_events_target_type_check | CHECK | `CHECK ((target_type = ANY (ARRAY['ai_question_version'::text, 'prompt_version'::text, 'model_deployment'::text])))` |
| ai_publication_events_generation_run_id_fkey | FOREIGN KEY | `FOREIGN KEY (generation_run_id) REFERENCES ai_generation_runs(id)` |
| ai_publication_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| ai_publication_events_target_type_target_id_approved_versio_key | UNIQUE | `UNIQUE (target_type, target_id, approved_version_id)` |

## Table: ai_question_versions

| Constraint Name | Type | Definition |
|---|---|---|
| ai_question_versions_confidence_check | CHECK | `CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)))` |
| ai_question_versions_response_type_check | CHECK | `CHECK ((response_type = ANY (ARRAY['boolean'::text, 'text'::text, 'maturity'::text, 'multi_select'::text])))` |
| ai_question_versions_generation_run_id_fkey | FOREIGN KEY | `FOREIGN KEY (generation_run_id) REFERENCES ai_generation_runs(id)` |
| ai_question_versions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| ai_question_versions_tenant_id_generation_run_id_question_v_key | UNIQUE | `UNIQUE (tenant_id, generation_run_id, question_version)` |

## Table: ai_retrieval_indexes

| Constraint Name | Type | Definition |
|---|---|---|
| ai_retrieval_indexes_status_check | CHECK | `CHECK ((status = ANY (ARRAY['draft'::text, 'approved'::text, 'retired'::text])))` |
| ai_retrieval_indexes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| ai_retrieval_indexes_tenant_id_index_key_index_version_key | UNIQUE | `UNIQUE (tenant_id, index_key, index_version)` |

## Table: answer_revisions

| Constraint Name | Type | Definition |
|---|---|---|
| answer_revisions_revision_check | CHECK | `CHECK ((revision > 0))` |
| answer_revisions_assessment_item_id_fkey | FOREIGN KEY | `FOREIGN KEY (assessment_item_id) REFERENCES assessment_items(id)` |
| answer_revisions_supersedes_id_fkey | FOREIGN KEY | `FOREIGN KEY (supersedes_id) REFERENCES answer_revisions(id)` |
| answer_revisions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| answer_revisions_tenant_id_assessment_item_id_revision_key | UNIQUE | `UNIQUE (tenant_id, assessment_item_id, revision)` |

## Table: applicability_decisions

| Constraint Name | Type | Definition |
|---|---|---|
| applicability_decisions_check | CHECK | `CHECK (((approved_by IS NULL) OR (approved_by <> decided_by)))` |
| applicability_decisions_decision_check | CHECK | `CHECK ((decision = ANY (ARRAY['applicable'::text, 'not_applicable'::text])))` |
| applicability_decisions_rationale_check | CHECK | `CHECK ((length(TRIM(BOTH FROM rationale)) > 0))` |
| applicability_decisions_control_instance_id_fkey | FOREIGN KEY | `FOREIGN KEY (control_instance_id) REFERENCES control_instances(id)` |
| applicability_decisions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: assessment_frameworks

| Constraint Name | Type | Definition |
|---|---|---|
| assessment_frameworks_assessment_id_fkey | FOREIGN KEY | `FOREIGN KEY (assessment_id) REFERENCES assessments(id)` |
| assessment_frameworks_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| assessment_frameworks_tenant_id_assessment_id_framework_key_key | UNIQUE | `UNIQUE (tenant_id, assessment_id, framework_key)` |

## Table: assessment_items

| Constraint Name | Type | Definition |
|---|---|---|
| assessment_items_assessment_id_fkey | FOREIGN KEY | `FOREIGN KEY (assessment_id) REFERENCES assessments(id)` |
| assessment_items_control_instance_id_fkey | FOREIGN KEY | `FOREIGN KEY (control_instance_id) REFERENCES control_instances(id)` |
| assessment_items_question_version_id_fkey | FOREIGN KEY | `FOREIGN KEY (question_version_id) REFERENCES question_versions(id)` |
| assessment_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: assessment_scopes

| Constraint Name | Type | Definition |
|---|---|---|
| assessment_scopes_check | CHECK | `CHECK ((period_end >= period_start))` |
| assessment_scopes_name_check | CHECK | `CHECK ((length(TRIM(BOTH FROM name)) > 0))` |
| assessment_scopes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: assessment_signoffs

| Constraint Name | Type | Definition |
|---|---|---|
| assessment_signoffs_decision_check | CHECK | `CHECK ((decision = ANY (ARRAY['approved'::text, 'rejected'::text])))` |
| assessment_signoffs_scope_type_check | CHECK | `CHECK ((scope_type = ANY (ARRAY['section'::text, 'final'::text])))` |
| assessment_signoffs_assessment_id_fkey | FOREIGN KEY | `FOREIGN KEY (assessment_id) REFERENCES assessments(id)` |
| assessment_signoffs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| assessment_signoffs_tenant_id_assessment_id_scope_type_scop_key | UNIQUE | `UNIQUE (tenant_id, assessment_id, scope_type, scope_id)` |

## Table: assessment_snapshots

| Constraint Name | Type | Definition |
|---|---|---|
| assessment_snapshots_sequence_check | CHECK | `CHECK ((sequence > 0))` |
| assessment_snapshots_snapshot_type_check | CHECK | `CHECK ((length(TRIM(BOTH FROM snapshot_type)) > 0))` |
| assessment_snapshots_assessment_id_fkey | FOREIGN KEY | `FOREIGN KEY (assessment_id) REFERENCES assessments(id)` |
| assessment_snapshots_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| assessment_snapshots_tenant_id_assessment_id_sequence_key | UNIQUE | `UNIQUE (tenant_id, assessment_id, sequence)` |

## Table: assessments

| Constraint Name | Type | Definition |
|---|---|---|
| assessments_scope_id_fkey | FOREIGN KEY | `FOREIGN KEY (scope_id) REFERENCES assessment_scopes(id)` |
| assessments_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: assurance_alerts

| Constraint Name | Type | Definition |
|---|---|---|
| assurance_alerts_severity_check | CHECK | `CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))` |
| assurance_alerts_source_type_check | CHECK | `CHECK ((source_type = ANY (ARRAY['control_test'::text, 'connector_health'::text, 'evidence_freshness'::text])))` |
| assurance_alerts_status_check | CHECK | `CHECK ((status = ANY (ARRAY['open'::text, 'triaged'::text, 'resolved'::text])))` |
| assurance_alerts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: audit_checkpoints

| Constraint Name | Type | Definition |
|---|---|---|
| audit_checkpoints_check | CHECK | `CHECK ((start_sequence <= end_sequence))` |
| audit_checkpoints_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| audit_checkpoints_chain_partition_end_sequence_key | UNIQUE | `UNIQUE (chain_partition, end_sequence)` |
| audit_checkpoints_chain_partition_start_sequence_key | UNIQUE | `UNIQUE (chain_partition, start_sequence)` |

## Table: audit_engagements

| Constraint Name | Type | Definition |
|---|---|---|
| audit_engagements_status_check | CHECK | `CHECK ((status = ANY (ARRAY['planned'::text, 'fieldwork'::text, 'management_response'::text, 'closed'::text])))` |
| audit_engagements_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: audit_events

| Constraint Name | Type | Definition |
|---|---|---|
| audit_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| audit_events_tenant_id_event_hash_key | UNIQUE | `UNIQUE (tenant_id, event_hash)` |
| audit_events_tenant_id_sequence_key | UNIQUE | `UNIQUE (tenant_id, sequence)` |

## Table: audit_requests

| Constraint Name | Type | Definition |
|---|---|---|
| audit_requests_status_check | CHECK | `CHECK ((status = ANY (ARRAY['requested'::text, 'submitted'::text, 'accepted'::text, 'rejected'::text])))` |
| audit_requests_audit_engagement_id_fkey | FOREIGN KEY | `FOREIGN KEY (audit_engagement_id) REFERENCES audit_engagements(id)` |
| audit_requests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| audit_requests_audit_engagement_id_control_id_requested_fro_key | UNIQUE | `UNIQUE (audit_engagement_id, control_id, requested_from)` |

## Table: audit_tests

| Constraint Name | Type | Definition |
|---|---|---|
| audit_tests_conclusion_check | CHECK | `CHECK ((conclusion = ANY (ARRAY['effective'::text, 'ineffective'::text, 'not_tested'::text])))` |
| audit_tests_audit_engagement_id_fkey | FOREIGN KEY | `FOREIGN KEY (audit_engagement_id) REFERENCES audit_engagements(id)` |
| audit_tests_control_instance_id_fkey | FOREIGN KEY | `FOREIGN KEY (control_instance_id) REFERENCES control_instances(id)` |
| audit_tests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: audit_verifications

| Constraint Name | Type | Definition |
|---|---|---|
| audit_verifications_check | CHECK | `CHECK (((result = 'fail'::text) OR (mismatch_sequence IS NULL)))` |
| audit_verifications_result_check | CHECK | `CHECK ((result = ANY (ARRAY['pass'::text, 'fail'::text])))` |
| audit_verifications_checkpoint_id_fkey | FOREIGN KEY | `FOREIGN KEY (checkpoint_id) REFERENCES audit_checkpoints(id)` |
| audit_verifications_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: authorization_decision_logs

| Constraint Name | Type | Definition |
|---|---|---|
| authorization_decision_logs_decision_check | CHECK | `CHECK ((decision = ANY (ARRAY['allow'::text, 'deny'::text])))` |
| authorization_decision_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: automated_control_tests

| Constraint Name | Type | Definition |
|---|---|---|
| automated_control_tests_connector_id_fkey | FOREIGN KEY | `FOREIGN KEY (connector_id) REFERENCES connectors(id)` |
| automated_control_tests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: automated_test_runs

| Constraint Name | Type | Definition |
|---|---|---|
| automated_test_runs_status_check | CHECK | `CHECK ((status = ANY (ARRAY['running'::text, 'succeeded'::text, 'failed'::text])))` |
| automated_test_runs_automated_test_id_fkey | FOREIGN KEY | `FOREIGN KEY (automated_test_id) REFERENCES automated_tests(id)` |
| automated_test_runs_connector_id_fkey | FOREIGN KEY | `FOREIGN KEY (connector_id) REFERENCES connectors(id)` |
| automated_test_runs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| automated_test_runs_tenant_id_idempotency_key_key | UNIQUE | `UNIQUE (tenant_id, idempotency_key)` |

## Table: automated_tests

| Constraint Name | Type | Definition |
|---|---|---|
| automated_tests_connector_type_check | CHECK | `CHECK ((length(TRIM(BOTH FROM connector_type)) > 0))` |
| automated_tests_severity_check | CHECK | `CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))` |
| automated_tests_control_id_fkey | FOREIGN KEY | `FOREIGN KEY (control_id) REFERENCES harmonized_controls(id)` |
| automated_tests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| automated_tests_tenant_id_control_id_connector_type_key | UNIQUE | `UNIQUE (tenant_id, control_id, connector_type)` |

## Table: backup_restore_tests

| Constraint Name | Type | Definition |
|---|---|---|
| backup_restore_tests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: connector_objects

| Constraint Name | Type | Definition |
|---|---|---|
| connector_objects_delivery_status_check | CHECK | `CHECK ((delivery_status = ANY (ARRAY['pending'::text, 'delivered'::text, 'failed'::text, 'dead_lettered'::text])))` |
| connector_objects_connector_id_fkey | FOREIGN KEY | `FOREIGN KEY (connector_id) REFERENCES connectors(id)` |
| connector_objects_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| connector_objects_tenant_id_connector_id_object_type_extern_key | UNIQUE | `UNIQUE (tenant_id, connector_id, object_type, external_id)` |

## Table: connector_sync_runs

| Constraint Name | Type | Definition |
|---|---|---|
| connector_sync_runs_status_check | CHECK | `CHECK ((status = ANY (ARRAY['started'::text, 'succeeded'::text, 'failed'::text])))` |
| connector_sync_runs_connector_id_fkey | FOREIGN KEY | `FOREIGN KEY (connector_id) REFERENCES connectors(id)` |
| connector_sync_runs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: connectors

| Constraint Name | Type | Definition |
|---|---|---|
| connectors_health_check | CHECK | `CHECK ((health = ANY (ARRAY['healthy'::text, 'degraded'::text, 'failing'::text])))` |
| connectors_status_check | CHECK | `CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'disabled'::text])))` |
| connectors_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| connectors_tenant_id_connector_key_key | UNIQUE | `UNIQUE (tenant_id, connector_key)` |

## Table: consent_events

| Constraint Name | Type | Definition |
|---|---|---|
| consent_events_event_type_check | CHECK | `CHECK ((event_type = ANY (ARRAY['granted'::text, 'withdrawn'::text, 'updated'::text])))` |
| consent_events_consent_purpose_id_fkey | FOREIGN KEY | `FOREIGN KEY (consent_purpose_id) REFERENCES consent_purposes(id)` |
| consent_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| consent_events_tenant_id_idempotency_key_key | UNIQUE | `UNIQUE (tenant_id, idempotency_key)` |

## Table: consent_purposes

| Constraint Name | Type | Definition |
|---|---|---|
| consent_purposes_notice_version_id_fkey | FOREIGN KEY | `FOREIGN KEY (notice_version_id) REFERENCES privacy_notice_versions(id)` |
| consent_purposes_purpose_id_fkey | FOREIGN KEY | `FOREIGN KEY (purpose_id) REFERENCES purposes(id)` |
| consent_purposes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: consent_records

| Constraint Name | Type | Definition |
|---|---|---|
| consent_records_status_check | CHECK | `CHECK ((status = ANY (ARRAY['active'::text, 'withdrawn'::text])))` |
| consent_records_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: content_rejected_records

| Constraint Name | Type | Definition |
|---|---|---|
| content_rejected_records_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: content_source_packages

| Constraint Name | Type | Definition |
|---|---|---|
| content_source_packages_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| content_source_packages_tenant_id_source_file_name_source_s_key | UNIQUE | `UNIQUE (tenant_id, source_file_name, source_sha256)` |

## Table: control_instances

| Constraint Name | Type | Definition |
|---|---|---|
| control_instances_applicability_status_check | CHECK | `CHECK ((applicability_status = ANY (ARRAY['pending'::text, 'applicable'::text, 'not_applicable'::text])))` |
| control_instances_assessment_id_fkey | FOREIGN KEY | `FOREIGN KEY (assessment_id) REFERENCES assessments(id)` |
| control_instances_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| control_instances_tenant_id_assessment_id_control_id_key | UNIQUE | `UNIQUE (tenant_id, assessment_id, control_id)` |

## Table: control_mappings

| Constraint Name | Type | Definition |
|---|---|---|
| control_mappings_mapping_version_id_fkey | FOREIGN KEY | `FOREIGN KEY (mapping_version_id) REFERENCES mapping_versions(id)` |
| control_mappings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| control_mappings_tenant_id_framework_key_source_control_id__key | UNIQUE | `UNIQUE (tenant_id, framework_key, source_control_id, harmonized_control_id, source_workbook, source_row_number)` |

## Table: control_sets

| Constraint Name | Type | Definition |
|---|---|---|
| control_sets_framework_version_id_fkey | FOREIGN KEY | `FOREIGN KEY (framework_version_id) REFERENCES framework_versions(id)` |
| control_sets_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| control_sets_tenant_id_framework_version_id_set_key_key | UNIQUE | `UNIQUE (tenant_id, framework_version_id, set_key)` |

## Table: control_subcontrols

| Constraint Name | Type | Definition |
|---|---|---|
| control_subcontrols_control_id_fkey | FOREIGN KEY | `FOREIGN KEY (control_id) REFERENCES controls(id)` |
| control_subcontrols_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| control_subcontrols_tenant_id_control_id_subcontrol_key_key | UNIQUE | `UNIQUE (tenant_id, control_id, subcontrol_key)` |

## Table: control_test_results

| Constraint Name | Type | Definition |
|---|---|---|
| control_test_results_result_check | CHECK | `CHECK ((result = ANY (ARRAY['pass'::text, 'fail'::text, 'not_tested'::text])))` |
| control_test_results_control_instance_id_fkey | FOREIGN KEY | `FOREIGN KEY (control_instance_id) REFERENCES control_instances(id)` |
| control_test_results_test_procedure_id_fkey | FOREIGN KEY | `FOREIGN KEY (test_procedure_id) REFERENCES test_procedures(id)` |
| control_test_results_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: controls

| Constraint Name | Type | Definition |
|---|---|---|
| controls_control_set_id_fkey | FOREIGN KEY | `FOREIGN KEY (control_set_id) REFERENCES control_sets(id)` |
| controls_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| controls_tenant_id_control_set_id_control_key_key | UNIQUE | `UNIQUE (tenant_id, control_set_id, control_key)` |

## Table: custom_field_definitions

| Constraint Name | Type | Definition |
|---|---|---|
| custom_field_definitions_data_type_check | CHECK | `CHECK ((data_type = ANY (ARRAY['text'::text, 'number'::text, 'boolean'::text, 'date'::text, 'datetime'::text, 'uuid'::text, 'json'::text, 'enum'::text])))` |
| custom_field_definitions_object_definition_id_fkey | FOREIGN KEY | `FOREIGN KEY (object_definition_id) REFERENCES custom_object_definitions(id)` |
| custom_field_definitions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| custom_field_definitions_object_definition_id_field_key_key | UNIQUE | `UNIQUE (object_definition_id, field_key)` |

## Table: custom_object_definitions

| Constraint Name | Type | Definition |
|---|---|---|
| custom_object_definitions_status_check | CHECK | `CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'deprecated'::text])))` |
| custom_object_definitions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| custom_object_definitions_tenant_id_object_key_key | UNIQUE | `UNIQUE (tenant_id, object_key)` |

## Table: custom_records

| Constraint Name | Type | Definition |
|---|---|---|
| custom_records_status_check | CHECK | `CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text])))` |
| custom_records_object_definition_id_fkey | FOREIGN KEY | `FOREIGN KEY (object_definition_id) REFERENCES custom_object_definitions(id)` |
| custom_records_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| custom_records_object_definition_id_record_key_key | UNIQUE | `UNIQUE (object_definition_id, record_key)` |

## Table: custom_values

| Constraint Name | Type | Definition |
|---|---|---|
| custom_values_field_definition_id_fkey | FOREIGN KEY | `FOREIGN KEY (field_definition_id) REFERENCES custom_field_definitions(id)` |
| custom_values_record_id_fkey | FOREIGN KEY | `FOREIGN KEY (record_id) REFERENCES custom_records(id)` |
| custom_values_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| custom_values_record_id_field_definition_id_key | UNIQUE | `UNIQUE (record_id, field_definition_id)` |

## Table: data_categories

| Constraint Name | Type | Definition |
|---|---|---|
| data_categories_sensitivity_check | CHECK | `CHECK ((sensitivity = ANY (ARRAY['low'::text, 'moderate'::text, 'high'::text, 'special_category'::text])))` |
| data_categories_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| data_categories_tenant_id_category_key_key | UNIQUE | `UNIQUE (tenant_id, category_key)` |

## Table: data_discovery_findings

| Constraint Name | Type | Definition |
|---|---|---|
| data_discovery_findings_confidence_check | CHECK | `CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)))` |
| data_discovery_findings_review_status_check | CHECK | `CHECK ((review_status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rejected'::text])))` |
| data_discovery_findings_data_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (data_category_id) REFERENCES data_categories(id)` |
| data_discovery_findings_scan_id_fkey | FOREIGN KEY | `FOREIGN KEY (scan_id) REFERENCES data_discovery_scans(id)` |
| data_discovery_findings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| data_discovery_findings_scan_id_locator_hash_data_category__key | UNIQUE | `UNIQUE (scan_id, locator_hash, data_category_id)` |

## Table: data_discovery_scans

| Constraint Name | Type | Definition |
|---|---|---|
| data_discovery_scans_status_check | CHECK | `CHECK ((status = ANY (ARRAY['running'::text, 'succeeded'::text, 'failed'::text])))` |
| data_discovery_scans_connector_id_fkey | FOREIGN KEY | `FOREIGN KEY (connector_id) REFERENCES connectors(id)` |
| data_discovery_scans_system_id_fkey | FOREIGN KEY | `FOREIGN KEY (system_id) REFERENCES systems_assets(id)` |
| data_discovery_scans_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| data_discovery_scans_tenant_id_idempotency_key_key | UNIQUE | `UNIQUE (tenant_id, idempotency_key)` |

## Table: data_inventory_records

| Constraint Name | Type | Definition |
|---|---|---|
| fk_data_inventory_records_category | FOREIGN KEY | `FOREIGN KEY (data_category_id) REFERENCES data_categories(id)` |
| fk_data_inventory_records_system | FOREIGN KEY | `FOREIGN KEY (system_id) REFERENCES systems_assets(id)` |
| data_inventory_records_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: data_subject_categories

| Constraint Name | Type | Definition |
|---|---|---|
| data_subject_categories_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| data_subject_categories_tenant_id_subject_key_key | UNIQUE | `UNIQUE (tenant_id, subject_key)` |

## Table: deletion_items

| Constraint Name | Type | Definition |
|---|---|---|
| deletion_items_disposition_check | CHECK | `CHECK ((disposition = ANY (ARRAY['deleted'::text, 'anonymized'::text, 'blocked_by_hold'::text, 'not_found'::text])))` |
| deletion_items_target_type_check | CHECK | `CHECK ((target_type = ANY (ARRAY['data_inventory_record'::text, 'evidence_object'::text, 'evidence_version'::text, 'rights_request'::text, 'consent_event'::text])))` |
| deletion_items_deletion_job_id_fkey | FOREIGN KEY | `FOREIGN KEY (deletion_job_id) REFERENCES deletion_jobs(id)` |
| deletion_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| deletion_items_deletion_job_id_target_type_target_id_key | UNIQUE | `UNIQUE (deletion_job_id, target_type, target_id)` |

## Table: deletion_jobs

| Constraint Name | Type | Definition |
|---|---|---|
| deletion_jobs_status_check | CHECK | `CHECK ((status = ANY (ARRAY['requested'::text, 'running'::text, 'completed'::text, 'failed'::text])))` |
| deletion_jobs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: dpia_assessments

| Constraint Name | Type | Definition |
|---|---|---|
| dpia_assessments_residual_risk_score_check | CHECK | `CHECK (((residual_risk_score >= 0) AND (residual_risk_score <= 100)))` |
| dpia_assessments_risk_level_check | CHECK | `CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))` |
| dpia_assessments_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: dpia_risks

| Constraint Name | Type | Definition |
|---|---|---|
| dpia_risks_impact_check | CHECK | `CHECK ((impact = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))` |
| dpia_risks_likelihood_check | CHECK | `CHECK ((likelihood = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))` |
| dpia_risks_residual_score_check | CHECK | `CHECK (((residual_score >= 0) AND (residual_score <= 100)))` |
| dpia_risks_dpia_id_fkey | FOREIGN KEY | `FOREIGN KEY (dpia_id) REFERENCES dpias(id)` |
| dpia_risks_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: dpias

| Constraint Name | Type | Definition |
|---|---|---|
| dpias_status_check | CHECK | `CHECK ((status = ANY (ARRAY['draft'::text, 'in_review'::text, 'approved'::text, 'rejected'::text])))` |
| dpias_processing_activity_id_fkey | FOREIGN KEY | `FOREIGN KEY (processing_activity_id) REFERENCES processing_activities(id)` |
| dpias_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: encryption_key_records

| Constraint Name | Type | Definition |
|---|---|---|
| encryption_key_records_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: evaluation_cases

| Constraint Name | Type | Definition |
|---|---|---|
| evaluation_cases_suite_id_fkey | FOREIGN KEY | `FOREIGN KEY (suite_id) REFERENCES evaluation_suites(id)` |
| evaluation_cases_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| evaluation_cases_suite_id_case_key_key | UNIQUE | `UNIQUE (suite_id, case_key)` |

## Table: evaluation_results

| Constraint Name | Type | Definition |
|---|---|---|
| evaluation_results_case_id_fkey | FOREIGN KEY | `FOREIGN KEY (case_id) REFERENCES evaluation_cases(id)` |
| evaluation_results_evaluation_run_id_fkey | FOREIGN KEY | `FOREIGN KEY (evaluation_run_id) REFERENCES ai_evaluation_runs(id)` |
| evaluation_results_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| evaluation_results_evaluation_run_id_case_id_metric_key | UNIQUE | `UNIQUE (evaluation_run_id, case_id, metric)` |

## Table: evaluation_suites

| Constraint Name | Type | Definition |
|---|---|---|
| evaluation_suites_status_check | CHECK | `CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'retired'::text])))` |
| evaluation_suites_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| evaluation_suites_tenant_id_use_case_suite_key_suite_versio_key | UNIQUE | `UNIQUE (tenant_id, use_case, suite_key, suite_version)` |

## Table: evidence_custody_events

| Constraint Name | Type | Definition |
|---|---|---|
| evidence_custody_events_event_type_check | CHECK | `CHECK ((event_type = ANY (ARRAY['created'::text, 'transferred'::text, 'accessed'::text, 'exported'::text, 'disposed'::text])))` |
| evidence_custody_events_evidence_version_id_fkey | FOREIGN KEY | `FOREIGN KEY (evidence_version_id) REFERENCES evidence_versions(id)` |
| evidence_custody_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: evidence_expiry_events

| Constraint Name | Type | Definition |
|---|---|---|
| evidence_expiry_events_reason_check | CHECK | `CHECK ((length(TRIM(BOTH FROM reason)) > 0))` |
| evidence_expiry_events_evidence_id_fkey | FOREIGN KEY | `FOREIGN KEY (evidence_id) REFERENCES evidence_objects(id)` |
| evidence_expiry_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: evidence_links

| Constraint Name | Type | Definition |
|---|---|---|
| evidence_links_purpose_check | CHECK | `CHECK ((length(TRIM(BOTH FROM purpose)) > 0))` |
| evidence_links_target_type_check | CHECK | `CHECK ((target_type = ANY (ARRAY['control_instance'::text, 'assessment_item'::text, 'automated_test_run'::text])))` |
| evidence_links_evidence_version_id_fkey | FOREIGN KEY | `FOREIGN KEY (evidence_version_id) REFERENCES evidence_versions(id)` |
| evidence_links_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| evidence_links_evidence_version_id_target_type_target_id_pu_key | UNIQUE | `UNIQUE (evidence_version_id, target_type, target_id, purpose)` |

## Table: evidence_objects

| Constraint Name | Type | Definition |
|---|---|---|
| evidence_objects_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: evidence_requests

| Constraint Name | Type | Definition |
|---|---|---|
| evidence_requests_status_check | CHECK | `CHECK ((status = ANY (ARRAY['requested'::text, 'submitted'::text, 'accepted'::text, 'rejected'::text])))` |
| evidence_requests_assessment_id_fkey | FOREIGN KEY | `FOREIGN KEY (assessment_id) REFERENCES assessments(id)` |
| evidence_requests_control_instance_id_fkey | FOREIGN KEY | `FOREIGN KEY (control_instance_id) REFERENCES control_instances(id)` |
| evidence_requests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| evidence_requests_assessment_id_control_instance_id_request_key | UNIQUE | `UNIQUE (assessment_id, control_instance_id, requested_from)` |

## Table: evidence_reviews

| Constraint Name | Type | Definition |
|---|---|---|
| evidence_reviews_decision_check | CHECK | `CHECK ((decision = ANY (ARRAY['sufficient'::text, 'insufficient'::text, 'needs_more_context'::text])))` |
| evidence_reviews_rationale_check | CHECK | `CHECK ((length(TRIM(BOTH FROM rationale)) > 0))` |
| evidence_reviews_evidence_version_id_fkey | FOREIGN KEY | `FOREIGN KEY (evidence_version_id) REFERENCES evidence_versions(id)` |
| evidence_reviews_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: evidence_samples

| Constraint Name | Type | Definition |
|---|---|---|
| evidence_samples_method_check | CHECK | `CHECK ((method = ANY (ARRAY['random'::text, 'stratified'::text, 'judgmental'::text, 'full_population'::text])))` |
| evidence_samples_sample_size_check | CHECK | `CHECK ((sample_size >= 0))` |
| evidence_samples_test_result_id_fkey | FOREIGN KEY | `FOREIGN KEY (test_result_id) REFERENCES automated_test_runs(id)` |
| evidence_samples_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: evidence_versions

| Constraint Name | Type | Definition |
|---|---|---|
| evidence_versions_check | CHECK | `CHECK ((period_end >= period_start))` |
| evidence_versions_evidence_version_no_check | CHECK | `CHECK ((evidence_version_no > 0))` |
| evidence_versions_sha256_check | CHECK | `CHECK ((length(TRIM(BOTH FROM sha256)) = 64))` |
| evidence_versions_size_bytes_check | CHECK | `CHECK ((size_bytes >= 0))` |
| evidence_versions_evidence_id_fkey | FOREIGN KEY | `FOREIGN KEY (evidence_id) REFERENCES evidence_objects(id)` |
| evidence_versions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| evidence_versions_evidence_id_evidence_version_no_key | UNIQUE | `UNIQUE (evidence_id, evidence_version_no)` |

## Table: export_manifests

| Constraint Name | Type | Definition |
|---|---|---|
| export_manifests_report_export_id_fkey | FOREIGN KEY | `FOREIGN KEY (report_export_id) REFERENCES report_exports(id)` |
| export_manifests_signing_key_id_fkey | FOREIGN KEY | `FOREIGN KEY (signing_key_id) REFERENCES encryption_key_records(id)` |
| export_manifests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| export_manifests_tenant_id_snapshot_id_template_version_man_key | UNIQUE | `UNIQUE (tenant_id, snapshot_id, template_version, manifest_hash)` |

## Table: findings

| Constraint Name | Type | Definition |
|---|---|---|
| findings_has_source | CHECK | `CHECK (((assessment_item_id IS NOT NULL) OR (test_result_id IS NOT NULL)))` |
| findings_severity_check | CHECK | `CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))` |
| findings_assessment_item_id_fkey | FOREIGN KEY | `FOREIGN KEY (assessment_item_id) REFERENCES assessment_items(id)` |
| findings_test_result_id_fkey | FOREIGN KEY | `FOREIGN KEY (test_result_id) REFERENCES control_test_results(id)` |
| findings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: framework_content_packs

| Constraint Name | Type | Definition |
|---|---|---|
| framework_content_packs_framework_version_id_fkey | FOREIGN KEY | `FOREIGN KEY (framework_version_id) REFERENCES framework_versions(id)` |
| framework_content_packs_source_package_id_fkey | FOREIGN KEY | `FOREIGN KEY (source_package_id) REFERENCES content_source_packages(id)` |
| framework_content_packs_supersedes_pack_id_fkey | FOREIGN KEY | `FOREIGN KEY (supersedes_pack_id) REFERENCES framework_content_packs(id)` |
| framework_content_packs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| framework_content_packs_tenant_id_framework_key_pack_versio_key | UNIQUE | `UNIQUE (tenant_id, framework_key, pack_version)` |

## Table: framework_requirements

| Constraint Name | Type | Definition |
|---|---|---|
| framework_requirements_control_id_ref_fkey | FOREIGN KEY | `FOREIGN KEY (control_id_ref) REFERENCES controls(id)` |
| framework_requirements_control_subcontrol_id_fkey | FOREIGN KEY | `FOREIGN KEY (control_subcontrol_id) REFERENCES control_subcontrols(id)` |
| framework_requirements_framework_pack_id_fkey | FOREIGN KEY | `FOREIGN KEY (framework_pack_id) REFERENCES framework_content_packs(id)` |
| framework_requirements_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| framework_requirements_source_row_key | UNIQUE | `UNIQUE (tenant_id, source_workbook, source_sheet, source_row_number)` |
| framework_requirements_tenant_id_framework_pack_id_control__key | UNIQUE | `UNIQUE (tenant_id, framework_pack_id, control_id, sub_control_id, source_sheet, source_row_number)` |

## Table: framework_versions

| Constraint Name | Type | Definition |
|---|---|---|
| framework_versions_framework_id_fkey | FOREIGN KEY | `FOREIGN KEY (framework_id) REFERENCES frameworks(id)` |
| framework_versions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| framework_versions_tenant_id_framework_id_version_key_key | UNIQUE | `UNIQUE (tenant_id, framework_id, version_key)` |

## Table: frameworks

| Constraint Name | Type | Definition |
|---|---|---|
| frameworks_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| frameworks_tenant_id_framework_key_key | UNIQUE | `UNIQUE (tenant_id, framework_key)` |

## Table: generation_citations

| Constraint Name | Type | Definition |
|---|---|---|
| generation_citations_entailment_score_check | CHECK | `CHECK (((entailment_score >= (0)::numeric) AND (entailment_score <= (1)::numeric)))` |
| generation_citations_generation_run_id_fkey | FOREIGN KEY | `FOREIGN KEY (generation_run_id) REFERENCES ai_generation_runs(id)` |
| generation_citations_knowledge_chunk_id_fkey | FOREIGN KEY | `FOREIGN KEY (knowledge_chunk_id) REFERENCES knowledge_chunks(id)` |
| generation_citations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| generation_citations_generation_run_id_output_path_knowledg_key | UNIQUE | `UNIQUE (generation_run_id, output_path, knowledge_chunk_id)` |

## Table: grc_workspaces

| Constraint Name | Type | Definition |
|---|---|---|
| grc_workspaces_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: harmonized_controls

| Constraint Name | Type | Definition |
|---|---|---|
| harmonized_controls_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| harmonized_controls_tenant_id_harmonized_id_key | UNIQUE | `UNIQUE (tenant_id, harmonized_id)` |

## Table: identity_role_grants

| Constraint Name | Type | Definition |
|---|---|---|
| identity_role_grants_role_id_fkey | FOREIGN KEY | `FOREIGN KEY (role_id) REFERENCES identity_roles(id)` |
| identity_role_grants_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES identity_tenants(id)` |
| identity_role_grants_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES identity_users(id)` |
| identity_role_grants_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| identity_role_grants_tenant_id_user_id_role_id_resource_typ_key | UNIQUE | `UNIQUE (tenant_id, user_id, role_id, resource_type, resource_id)` |

## Table: identity_roles

| Constraint Name | Type | Definition |
|---|---|---|
| identity_roles_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES identity_tenants(id)` |
| identity_roles_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| identity_roles_tenant_id_role_key_key | UNIQUE | `UNIQUE (tenant_id, role_key)` |

## Table: identity_service_accounts

| Constraint Name | Type | Definition |
|---|---|---|
| identity_service_accounts_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES identity_tenants(id)` |
| identity_service_accounts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| identity_service_accounts_tenant_id_name_key | UNIQUE | `UNIQUE (tenant_id, name)` |

## Table: identity_sessions

| Constraint Name | Type | Definition |
|---|---|---|
| identity_sessions_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES identity_tenants(id)` |
| identity_sessions_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES identity_users(id)` |
| identity_sessions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| identity_sessions_tenant_id_supabase_session_id_key | UNIQUE | `UNIQUE (tenant_id, supabase_session_id)` |

## Table: identity_tenants

| Constraint Name | Type | Definition |
|---|---|---|
| identity_tenants_check | CHECK | `CHECK ((tenant_id = id))` |
| identity_tenants_status_check | CHECK | `CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'archived'::text])))` |
| identity_tenants_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: identity_users

| Constraint Name | Type | Definition |
|---|---|---|
| identity_users_status_check | CHECK | `CHECK ((status = ANY (ARRAY['active'::text, 'invited'::text, 'disabled'::text])))` |
| identity_users_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES identity_tenants(id)` |
| identity_users_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| identity_users_tenant_id_email_key | UNIQUE | `UNIQUE (tenant_id, email)` |
| identity_users_tenant_id_supabase_user_id_key | UNIQUE | `UNIQUE (tenant_id, supabase_user_id)` |

## Table: identity_workspace_delegations

| Constraint Name | Type | Definition |
|---|---|---|
| identity_workspace_delegations_delegated_by_fkey | FOREIGN KEY | `FOREIGN KEY (delegated_by) REFERENCES identity_users(id)` |
| identity_workspace_delegations_principal_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (principal_user_id) REFERENCES identity_users(id)` |
| identity_workspace_delegations_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES identity_tenants(id)` |
| identity_workspace_delegations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: incident_assessments

| Constraint Name | Type | Definition |
|---|---|---|
| incident_assessments_assessment_version_no_check | CHECK | `CHECK ((assessment_version_no > 0))` |
| incident_assessments_incident_id_fkey | FOREIGN KEY | `FOREIGN KEY (incident_id) REFERENCES privacy_incidents(id)` |
| incident_assessments_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| incident_assessments_incident_id_jurisdiction_assessment_ve_key | UNIQUE | `UNIQUE (incident_id, jurisdiction, assessment_version_no)` |

## Table: incident_notifications

| Constraint Name | Type | Definition |
|---|---|---|
| incident_notifications_recipient_type_check | CHECK | `CHECK ((recipient_type = ANY (ARRAY['regulator'::text, 'data_subject'::text, 'partner'::text])))` |
| incident_notifications_incident_id_fkey | FOREIGN KEY | `FOREIGN KEY (incident_id) REFERENCES privacy_incidents(id)` |
| incident_notifications_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: knowledge_chunks

| Constraint Name | Type | Definition |
|---|---|---|
| knowledge_chunks_retrieval_index_id_fkey | FOREIGN KEY | `FOREIGN KEY (retrieval_index_id) REFERENCES ai_retrieval_indexes(id)` |
| knowledge_chunks_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| knowledge_chunks_retrieval_index_id_source_id_content_hash_key | UNIQUE | `UNIQUE (retrieval_index_id, source_id, content_hash)` |

## Table: lawful_bases

| Constraint Name | Type | Definition |
|---|---|---|
| lawful_bases_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| lawful_bases_tenant_id_jurisdiction_basis_key_key | UNIQUE | `UNIQUE (tenant_id, jurisdiction, basis_key)` |

## Table: legal_hold_items

| Constraint Name | Type | Definition |
|---|---|---|
| legal_hold_items_target_type_check | CHECK | `CHECK ((target_type = ANY (ARRAY['data_inventory_record'::text, 'evidence_object'::text, 'evidence_version'::text, 'rights_request'::text, 'consent_event'::text])))` |
| legal_hold_items_legal_hold_id_fkey | FOREIGN KEY | `FOREIGN KEY (legal_hold_id) REFERENCES legal_holds(id)` |
| legal_hold_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| legal_hold_items_legal_hold_id_target_type_target_id_key | UNIQUE | `UNIQUE (legal_hold_id, target_type, target_id)` |

## Table: legal_holds

| Constraint Name | Type | Definition |
|---|---|---|
| legal_holds_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| legal_holds_tenant_id_hold_key_key | UNIQUE | `UNIQUE (tenant_id, hold_key)` |

## Table: malware_scan_results

| Constraint Name | Type | Definition |
|---|---|---|
| malware_scan_results_status_check | CHECK | `CHECK ((status = ANY (ARRAY['clean'::text, 'infected'::text, 'error'::text])))` |
| malware_scan_results_evidence_version_id_fkey | FOREIGN KEY | `FOREIGN KEY (evidence_version_id) REFERENCES evidence_versions(id)` |
| malware_scan_results_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| malware_scan_results_evidence_version_id_engine_key | UNIQUE | `UNIQUE (evidence_version_id, engine)` |

## Table: mapping_conflicts

| Constraint Name | Type | Definition |
|---|---|---|
| mapping_conflicts_check | CHECK | `CHECK (((resolution_status = 'open'::mapping_conflict_resolution_status) OR ((resolved_by IS NOT NULL) AND (resolved_at IS NOT NULL))))` |
| mapping_conflicts_conflicting_mapping_id_fkey | FOREIGN KEY | `FOREIGN KEY (conflicting_mapping_id) REFERENCES control_mappings(id)` |
| mapping_conflicts_control_mapping_id_fkey | FOREIGN KEY | `FOREIGN KEY (control_mapping_id) REFERENCES control_mappings(id)` |
| mapping_conflicts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: mapping_reviews

| Constraint Name | Type | Definition |
|---|---|---|
| mapping_reviews_control_mapping_id_fkey | FOREIGN KEY | `FOREIGN KEY (control_mapping_id) REFERENCES control_mappings(id)` |
| mapping_reviews_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: mapping_versions

| Constraint Name | Type | Definition |
|---|---|---|
| mapping_versions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| mapping_versions_tenant_id_version_key_key | UNIQUE | `UNIQUE (tenant_id, version_key)` |

## Table: outbox_events

| Constraint Name | Type | Definition |
|---|---|---|
| outbox_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| outbox_events_tenant_id_idempotency_key_key | UNIQUE | `UNIQUE (tenant_id, idempotency_key)` |

## Table: policies

| Constraint Name | Type | Definition |
|---|---|---|
| policies_status_check | CHECK | `CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'retired'::text])))` |
| policies_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| policies_tenant_id_policy_key_key | UNIQUE | `UNIQUE (tenant_id, policy_key)` |

## Table: policy_attestations

| Constraint Name | Type | Definition |
|---|---|---|
| policy_attestations_decision_check | CHECK | `CHECK ((decision = ANY (ARRAY['attested'::text, 'declined'::text])))` |
| policy_attestations_policy_version_id_fkey | FOREIGN KEY | `FOREIGN KEY (policy_version_id) REFERENCES policy_versions(id)` |
| policy_attestations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| policy_attestations_policy_version_id_user_id_key | UNIQUE | `UNIQUE (policy_version_id, user_id)` |

## Table: policy_control_links

| Constraint Name | Type | Definition |
|---|---|---|
| policy_control_links_coverage_check | CHECK | `CHECK ((coverage = ANY (ARRAY['full'::text, 'partial'::text, 'not_covered'::text])))` |
| policy_control_links_policy_version_id_fkey | FOREIGN KEY | `FOREIGN KEY (policy_version_id) REFERENCES policy_versions(id)` |
| policy_control_links_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| policy_control_links_policy_version_id_control_id_key | UNIQUE | `UNIQUE (policy_version_id, control_id)` |

## Table: policy_versions

| Constraint Name | Type | Definition |
|---|---|---|
| policy_versions_status_check | CHECK | `CHECK ((status = ANY (ARRAY['draft'::text, 'in_review'::text, 'approved'::text, 'published'::text, 'retired'::text])))` |
| policy_versions_policy_id_fkey | FOREIGN KEY | `FOREIGN KEY (policy_id) REFERENCES policies(id)` |
| policy_versions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| policy_versions_tenant_id_template_key_policy_version_key | UNIQUE | `UNIQUE (tenant_id, template_key, policy_version)` |

## Table: privacy_incidents

| Constraint Name | Type | Definition |
|---|---|---|
| privacy_incidents_severity_check | CHECK | `CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))` |
| privacy_incidents_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: privacy_notice_versions

| Constraint Name | Type | Definition |
|---|---|---|
| privacy_notice_versions_notice_version_no_check | CHECK | `CHECK ((notice_version_no > 0))` |
| privacy_notice_versions_sha256_check | CHECK | `CHECK ((length(TRIM(BOTH FROM sha256)) = 64))` |
| privacy_notice_versions_privacy_notice_id_fkey | FOREIGN KEY | `FOREIGN KEY (privacy_notice_id) REFERENCES privacy_notices(id)` |
| privacy_notice_versions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| privacy_notice_versions_privacy_notice_id_notice_version_no_key | UNIQUE | `UNIQUE (privacy_notice_id, notice_version_no)` |

## Table: privacy_notices

| Constraint Name | Type | Definition |
|---|---|---|
| privacy_notices_status_check | CHECK | `CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'retired'::text])))` |
| privacy_notices_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| privacy_notices_tenant_id_notice_key_key | UNIQUE | `UNIQUE (tenant_id, notice_key)` |

## Table: privacy_rights_requests

| Constraint Name | Type | Definition |
|---|---|---|
| privacy_rights_requests_request_type_check | CHECK | `CHECK ((request_type = ANY (ARRAY['access'::text, 'delete'::text, 'correct'::text, 'export'::text, 'restrict'::text])))` |
| privacy_rights_requests_status_check | CHECK | `CHECK ((status = ANY (ARRAY['open'::text, 'verified'::text, 'searching'::text, 'exception_applied'::text, 'completed'::text])))` |
| privacy_rights_requests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: processing_activities

| Constraint Name | Type | Definition |
|---|---|---|
| processing_activities_controller_processor_role_check | CHECK | `CHECK (((controller_processor_role IS NULL) OR (controller_processor_role = ANY (ARRAY['controller'::text, 'processor'::text, 'joint_controller'::text]))))` |
| processing_activities_retention_months_check | CHECK | `CHECK ((retention_months > 0))` |
| processing_activities_status_check | CHECK | `CHECK (((status IS NULL) OR (status = ANY (ARRAY['draft'::text, 'active'::text, 'retired'::text]))))` |
| processing_activities_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: processing_inventory_links

| Constraint Name | Type | Definition |
|---|---|---|
| processing_inventory_links_role_check | CHECK | `CHECK ((role = ANY (ARRAY['source'::text, 'destination'::text, 'processor'::text])))` |
| processing_inventory_links_inventory_record_id_fkey | FOREIGN KEY | `FOREIGN KEY (inventory_record_id) REFERENCES data_inventory_records(id)` |
| processing_inventory_links_processing_activity_id_fkey | FOREIGN KEY | `FOREIGN KEY (processing_activity_id) REFERENCES processing_activities(id)` |
| processing_inventory_links_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| processing_inventory_links_processing_activity_id_inventory_key | UNIQUE | `UNIQUE (processing_activity_id, inventory_record_id, role)` |

## Table: processing_purposes

| Constraint Name | Type | Definition |
|---|---|---|
| processing_purposes_lawful_basis_id_fkey | FOREIGN KEY | `FOREIGN KEY (lawful_basis_id) REFERENCES lawful_bases(id)` |
| processing_purposes_processing_activity_id_fkey | FOREIGN KEY | `FOREIGN KEY (processing_activity_id) REFERENCES processing_activities(id)` |
| processing_purposes_purpose_id_fkey | FOREIGN KEY | `FOREIGN KEY (purpose_id) REFERENCES purposes(id)` |
| processing_purposes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: processing_recipients

| Constraint Name | Type | Definition |
|---|---|---|
| processing_recipients_processing_activity_id_fkey | FOREIGN KEY | `FOREIGN KEY (processing_activity_id) REFERENCES processing_activities(id)` |
| processing_recipients_purpose_id_fkey | FOREIGN KEY | `FOREIGN KEY (purpose_id) REFERENCES purposes(id)` |
| processing_recipients_recipient_id_fkey | FOREIGN KEY | `FOREIGN KEY (recipient_id) REFERENCES recipients(id)` |
| processing_recipients_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| processing_recipients_processing_activity_id_recipient_id_p_key | UNIQUE | `UNIQUE (processing_activity_id, recipient_id, purpose_id)` |

## Table: product_assurance_evidence

| Constraint Name | Type | Definition |
|---|---|---|
| product_assurance_evidence_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: purposes

| Constraint Name | Type | Definition |
|---|---|---|
| purposes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| purposes_tenant_id_purpose_key_key | UNIQUE | `UNIQUE (tenant_id, purpose_key)` |

## Table: question_sets

| Constraint Name | Type | Definition |
|---|---|---|
| question_sets_source_type_check | CHECK | `CHECK ((source_type = ANY (ARRAY['curated'::text, 'ai_generated'::text])))` |
| question_sets_status_check | CHECK | `CHECK ((status = ANY (ARRAY['active'::text, 'deprecated'::text])))` |
| question_sets_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| question_sets_tenant_id_control_id_question_set_key_key | UNIQUE | `UNIQUE (tenant_id, control_id, question_set_key)` |

## Table: question_versions

| Constraint Name | Type | Definition |
|---|---|---|
| question_versions_status_check | CHECK | `CHECK ((status = ANY (ARRAY['draft'::text, 'approved'::text, 'deprecated'::text])))` |
| question_versions_question_set_id_fkey | FOREIGN KEY | `FOREIGN KEY (question_set_id) REFERENCES question_sets(id)` |
| question_versions_source_ai_question_version_id_fkey | FOREIGN KEY | `FOREIGN KEY (source_ai_question_version_id) REFERENCES ai_question_versions(id)` |
| question_versions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| question_versions_tenant_id_question_set_id_question_versio_key | UNIQUE | `UNIQUE (tenant_id, question_set_id, question_version)` |

## Table: rate_limit_policies

| Constraint Name | Type | Definition |
|---|---|---|
| rate_limit_policies_limit_count_check | CHECK | `CHECK ((limit_count > 0))` |
| rate_limit_policies_timeout_ms_check | CHECK | `CHECK ((timeout_ms > 0))` |
| rate_limit_policies_window_seconds_check | CHECK | `CHECK ((window_seconds > 0))` |
| rate_limit_policies_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| rate_limit_policies_tenant_id_policy_key_key | UNIQUE | `UNIQUE (tenant_id, policy_key)` |

## Table: recipients

| Constraint Name | Type | Definition |
|---|---|---|
| recipients_recipient_type_check | CHECK | `CHECK ((recipient_type = ANY (ARRAY['controller'::text, 'processor'::text, 'sub_processor'::text])))` |
| recipients_vendor_id_fkey | FOREIGN KEY | `FOREIGN KEY (vendor_id) REFERENCES vendors(id)` |
| recipients_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| recipients_tenant_id_name_recipient_type_key | UNIQUE | `UNIQUE (tenant_id, name, recipient_type)` |

## Table: remediation_tasks

| Constraint Name | Type | Definition |
|---|---|---|
| remediation_tasks_priority_check | CHECK | `CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))` |
| remediation_tasks_status_check | CHECK | `CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'verified'::text, 'risk_accepted'::text])))` |
| remediation_tasks_finding_id_fkey | FOREIGN KEY | `FOREIGN KEY (finding_id) REFERENCES findings(id)` |
| remediation_tasks_treatment_id_fkey | FOREIGN KEY | `FOREIGN KEY (treatment_id) REFERENCES risk_treatments(id)` |
| remediation_tasks_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: report_exports

| Constraint Name | Type | Definition |
|---|---|---|
| report_exports_format_check | CHECK | `CHECK ((format = ANY (ARRAY['pdf'::text, 'xlsx'::text])))` |
| report_exports_assessment_id_fkey | FOREIGN KEY | `FOREIGN KEY (assessment_id) REFERENCES assessments(id)` |
| report_exports_assessment_snapshot_id_fkey | FOREIGN KEY | `FOREIGN KEY (assessment_snapshot_id) REFERENCES assessment_snapshots(id)` |
| report_exports_report_template_id_fkey | FOREIGN KEY | `FOREIGN KEY (report_template_id) REFERENCES report_templates(id)` |
| report_exports_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| report_exports_tenant_id_idempotency_key_key | UNIQUE | `UNIQUE (tenant_id, idempotency_key)` |

## Table: report_templates

| Constraint Name | Type | Definition |
|---|---|---|
| report_templates_format_check | CHECK | `CHECK ((format = ANY (ARRAY['pdf'::text, 'xlsx'::text])))` |
| report_templates_status_check | CHECK | `CHECK ((status = ANY (ARRAY['active'::text, 'deprecated'::text])))` |
| report_templates_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| report_templates_tenant_id_template_key_template_version_fo_key | UNIQUE | `UNIQUE (tenant_id, template_key, template_version, format)` |

## Table: requirement_instances

| Constraint Name | Type | Definition |
|---|---|---|
| requirement_instances_applicability_status_check | CHECK | `CHECK ((applicability_status = ANY (ARRAY['pending'::text, 'applicable'::text, 'not_applicable'::text])))` |
| requirement_instances_coverage_status_check | CHECK | `CHECK ((coverage_status = ANY (ARRAY['uncovered'::text, 'partially_covered'::text, 'covered'::text])))` |
| requirement_instances_assessment_id_fkey | FOREIGN KEY | `FOREIGN KEY (assessment_id) REFERENCES assessments(id)` |
| requirement_instances_requirement_id_fkey | FOREIGN KEY | `FOREIGN KEY (requirement_id) REFERENCES framework_requirements(id)` |
| requirement_instances_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| requirement_instances_tenant_id_assessment_id_requirement_i_key | UNIQUE | `UNIQUE (tenant_id, assessment_id, requirement_id)` |

## Table: retention_assignments

| Constraint Name | Type | Definition |
|---|---|---|
| retention_assignments_target_type_check | CHECK | `CHECK ((target_type = ANY (ARRAY['data_inventory_record'::text, 'evidence_object'::text, 'evidence_version'::text, 'rights_request'::text, 'consent_event'::text])))` |
| retention_assignments_retention_rule_id_fkey | FOREIGN KEY | `FOREIGN KEY (retention_rule_id) REFERENCES retention_rules(id)` |
| retention_assignments_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: retention_rules

| Constraint Name | Type | Definition |
|---|---|---|
| retention_rules_disposition_check | CHECK | `CHECK ((disposition = ANY (ARRAY['delete'::text, 'anonymize'::text, 'archive'::text])))` |
| retention_rules_duration_days_check | CHECK | `CHECK ((duration_days > 0))` |
| retention_rules_data_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (data_category_id) REFERENCES data_categories(id)` |
| retention_rules_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: retention_schedules

| Constraint Name | Type | Definition |
|---|---|---|
| retention_schedules_retention_months_check | CHECK | `CHECK ((retention_months > 0))` |
| retention_schedules_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: retrieval_runs

| Constraint Name | Type | Definition |
|---|---|---|
| retrieval_runs_top_k_check | CHECK | `CHECK (((top_k > 0) AND (top_k <= 50)))` |
| retrieval_runs_retrieval_index_id_fkey | FOREIGN KEY | `FOREIGN KEY (retrieval_index_id) REFERENCES ai_retrieval_indexes(id)` |
| retrieval_runs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: retrieved_chunks

| Constraint Name | Type | Definition |
|---|---|---|
| retrieved_chunks_acl_decision_check | CHECK | `CHECK ((acl_decision = ANY (ARRAY['allowed'::text, 'denied'::text])))` |
| retrieved_chunks_rank_check | CHECK | `CHECK ((rank > 0))` |
| retrieved_chunks_knowledge_chunk_id_fkey | FOREIGN KEY | `FOREIGN KEY (knowledge_chunk_id) REFERENCES knowledge_chunks(id)` |
| retrieved_chunks_retrieval_run_id_fkey | FOREIGN KEY | `FOREIGN KEY (retrieval_run_id) REFERENCES retrieval_runs(id)` |
| retrieved_chunks_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| retrieved_chunks_retrieval_run_id_knowledge_chunk_id_key | UNIQUE | `UNIQUE (retrieval_run_id, knowledge_chunk_id)` |
| retrieved_chunks_retrieval_run_id_rank_key | UNIQUE | `UNIQUE (retrieval_run_id, rank)` |

## Table: review_decisions

| Constraint Name | Type | Definition |
|---|---|---|
| review_decisions_decision_check | CHECK | `CHECK ((decision = ANY (ARRAY['approved'::text, 'needs_changes'::text])))` |
| review_decisions_answer_revision_id_fkey | FOREIGN KEY | `FOREIGN KEY (answer_revision_id) REFERENCES answer_revisions(id)` |
| review_decisions_assessment_item_id_fkey | FOREIGN KEY | `FOREIGN KEY (assessment_item_id) REFERENCES assessment_items(id)` |
| review_decisions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: rights_request_tasks

| Constraint Name | Type | Definition |
|---|---|---|
| rights_request_tasks_status_check | CHECK | `CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'blocked'::text])))` |
| rights_request_tasks_task_type_check | CHECK | `CHECK ((task_type = ANY (ARRAY['search'::text, 'decision'::text, 'fulfillment'::text])))` |
| rights_request_tasks_rights_request_id_fkey | FOREIGN KEY | `FOREIGN KEY (rights_request_id) REFERENCES privacy_rights_requests(id)` |
| rights_request_tasks_system_id_fkey | FOREIGN KEY | `FOREIGN KEY (system_id) REFERENCES systems_assets(id)` |
| rights_request_tasks_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| rights_request_tasks_rights_request_id_system_id_task_type_key | UNIQUE | `UNIQUE (rights_request_id, system_id, task_type)` |

## Table: risk_acceptance_reviews

| Constraint Name | Type | Definition |
|---|---|---|
| risk_acceptance_reviews_decision_check | CHECK | `CHECK ((decision = ANY (ARRAY['reaffirmed'::text, 'revoked'::text, 'escalated'::text])))` |
| risk_acceptance_reviews_reason_check | CHECK | `CHECK ((length(TRIM(BOTH FROM reason)) > 0))` |
| risk_acceptance_reviews_risk_acceptance_id_fkey | FOREIGN KEY | `FOREIGN KEY (risk_acceptance_id) REFERENCES risk_acceptances(id)` |
| risk_acceptance_reviews_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: risk_acceptances

| Constraint Name | Type | Definition |
|---|---|---|
| risk_acceptances_check | CHECK | `CHECK ((expires_at > approved_at))` |
| risk_acceptances_check1 | CHECK | `CHECK ((next_review_due_at > approved_at))` |
| risk_acceptances_rationale_check | CHECK | `CHECK ((length(TRIM(BOTH FROM rationale)) > 0))` |
| risk_acceptances_finding_id_fkey | FOREIGN KEY | `FOREIGN KEY (finding_id) REFERENCES findings(id)` |
| risk_acceptances_remediation_task_id_fkey | FOREIGN KEY | `FOREIGN KEY (remediation_task_id) REFERENCES remediation_tasks(id)` |
| risk_acceptances_risk_id_fkey | FOREIGN KEY | `FOREIGN KEY (risk_id) REFERENCES risks(id)` |
| risk_acceptances_superseded_by_id_fkey | FOREIGN KEY | `FOREIGN KEY (superseded_by_id) REFERENCES risk_acceptances(id)` |
| risk_acceptances_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: risk_links

| Constraint Name | Type | Definition |
|---|---|---|
| risk_links_relationship_check | CHECK | `CHECK ((relationship = ANY (ARRAY['related_to'::text, 'caused_by'::text, 'mitigated_by'::text, 'threatens'::text])))` |
| risk_links_target_type_check | CHECK | `CHECK ((target_type = ANY (ARRAY['finding'::text, 'control_instance'::text, 'vendor'::text, 'evidence_object'::text, 'assessment'::text, 'requirement_instance'::text])))` |
| risk_links_risk_id_fkey | FOREIGN KEY | `FOREIGN KEY (risk_id) REFERENCES risks(id)` |
| risk_links_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| risk_links_risk_id_target_type_target_id_relationship_key | UNIQUE | `UNIQUE (risk_id, target_type, target_id, relationship)` |

## Table: risk_models

| Constraint Name | Type | Definition |
|---|---|---|
| risk_models_status_check | CHECK | `CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'retired'::text])))` |
| risk_models_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| risk_models_tenant_id_model_key_model_version_key | UNIQUE | `UNIQUE (tenant_id, model_key, model_version)` |

## Table: risk_treatments

| Constraint Name | Type | Definition |
|---|---|---|
| risk_treatments_status_check | CHECK | `CHECK ((status = ANY (ARRAY['planned'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))` |
| risk_treatments_strategy_check | CHECK | `CHECK ((strategy = ANY (ARRAY['accept'::text, 'mitigate'::text, 'transfer'::text, 'avoid'::text])))` |
| risk_treatments_risk_id_fkey | FOREIGN KEY | `FOREIGN KEY (risk_id) REFERENCES risks(id)` |
| risk_treatments_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: risks

| Constraint Name | Type | Definition |
|---|---|---|
| risks_inherent_score_check | CHECK | `CHECK (((inherent_score >= (0)::numeric) AND (inherent_score <= (100)::numeric)))` |
| risks_residual_score_check | CHECK | `CHECK (((residual_score >= (0)::numeric) AND (residual_score <= (100)::numeric)))` |
| risks_status_check | CHECK | `CHECK ((status = ANY (ARRAY['identified'::text, 'assessed'::text, 'treatment_planned'::text, 'monitoring'::text, 'closed'::text])))` |
| risks_risk_model_id_fkey | FOREIGN KEY | `FOREIGN KEY (risk_model_id) REFERENCES risk_models(id)` |
| risks_workspace_id_fkey | FOREIGN KEY | `FOREIGN KEY (workspace_id) REFERENCES grc_workspaces(id)` |
| risks_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| risks_tenant_id_risk_key_key | UNIQUE | `UNIQUE (tenant_id, risk_key)` |

## Table: safety_checks

| Constraint Name | Type | Definition |
|---|---|---|
| safety_checks_check_type_check | CHECK | `CHECK ((check_type = ANY (ARRAY['prompt_injection'::text, 'pii_exposure'::text, 'toxicity'::text, 'policy_bypass'::text, 'jailbreak'::text])))` |
| safety_checks_result_check | CHECK | `CHECK ((result = ANY (ARRAY['pass'::text, 'fail'::text, 'warn'::text])))` |
| safety_checks_generation_run_id_fkey | FOREIGN KEY | `FOREIGN KEY (generation_run_id) REFERENCES ai_generation_runs(id)` |
| safety_checks_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| safety_checks_generation_run_id_check_type_policy_version_key | UNIQUE | `UNIQUE (generation_run_id, check_type, policy_version)` |

## Table: sdlc_release_gates

| Constraint Name | Type | Definition |
|---|---|---|
| sdlc_release_gates_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: siem_export_records

| Constraint Name | Type | Definition |
|---|---|---|
| siem_export_records_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: systems_assets

| Constraint Name | Type | Definition |
|---|---|---|
| systems_assets_criticality_check | CHECK | `CHECK ((criticality = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))` |
| systems_assets_workspace_id_fkey | FOREIGN KEY | `FOREIGN KEY (workspace_id) REFERENCES grc_workspaces(id)` |
| systems_assets_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| systems_assets_tenant_id_workspace_id_name_key | UNIQUE | `UNIQUE (tenant_id, workspace_id, name)` |

## Table: tenant_catalog_subscriptions

| Constraint Name | Type | Definition |
|---|---|---|
| tenant_catalog_subscriptions_check | CHECK | `CHECK (((framework_id IS NOT NULL) OR (source_package_id IS NOT NULL)))` |
| tenant_catalog_subscriptions_framework_id_fkey | FOREIGN KEY | `FOREIGN KEY (framework_id) REFERENCES frameworks(id)` |
| tenant_catalog_subscriptions_source_package_id_fkey | FOREIGN KEY | `FOREIGN KEY (source_package_id) REFERENCES content_source_packages(id)` |
| tenant_catalog_subscriptions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: test_procedures

| Constraint Name | Type | Definition |
|---|---|---|
| test_procedures_status_check | CHECK | `CHECK ((status = ANY (ARRAY['active'::text, 'deprecated'::text])))` |
| test_procedures_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| test_procedures_tenant_id_control_id_procedure_key_version_key | UNIQUE | `UNIQUE (tenant_id, control_id, procedure_key, version)` |

## Table: transfers

| Constraint Name | Type | Definition |
|---|---|---|
| transfers_mechanism_check | CHECK | `CHECK ((mechanism = ANY (ARRAY['sccs'::text, 'adequacy_decision'::text, 'bcr'::text, 'derogation'::text])))` |
| transfers_status_check | CHECK | `CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'terminated'::text])))` |
| transfers_processing_activity_id_fkey | FOREIGN KEY | `FOREIGN KEY (processing_activity_id) REFERENCES processing_activities(id)` |
| transfers_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: trust_center_artifacts

| Constraint Name | Type | Definition |
|---|---|---|
| trust_center_artifacts_visibility_check | CHECK | `CHECK ((visibility = ANY (ARRAY['public'::text, 'private'::text])))` |
| trust_center_artifacts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: upload_sessions

| Constraint Name | Type | Definition |
|---|---|---|
| upload_sessions_scan_status_check | CHECK | `CHECK ((scan_status = ANY (ARRAY['quarantined'::text, 'clean'::text, 'malicious'::text])))` |
| upload_sessions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: vendor_assessments

| Constraint Name | Type | Definition |
|---|---|---|
| vendor_assessments_assessment_type_check | CHECK | `CHECK ((assessment_type = ANY (ARRAY['onboarding'::text, 'renewal'::text, 'ad_hoc'::text])))` |
| vendor_assessments_score_check | CHECK | `CHECK (((score >= (0)::numeric) AND (score <= (100)::numeric)))` |
| vendor_assessments_status_check | CHECK | `CHECK ((status = ANY (ARRAY['planned'::text, 'in_progress'::text, 'completed'::text])))` |
| vendor_assessments_vendor_id_fkey | FOREIGN KEY | `FOREIGN KEY (vendor_id) REFERENCES vendors(id)` |
| vendor_assessments_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| vendor_assessments_vendor_id_assessment_type_period_key | UNIQUE | `UNIQUE (vendor_id, assessment_type, period)` |

## Table: vendor_findings

| Constraint Name | Type | Definition |
|---|---|---|
| vendor_findings_severity_check | CHECK | `CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))` |
| vendor_findings_status_check | CHECK | `CHECK ((status = ANY (ARRAY['open'::text, 'remediated'::text, 'accepted'::text])))` |
| vendor_findings_vendor_assessment_id_fkey | FOREIGN KEY | `FOREIGN KEY (vendor_assessment_id) REFERENCES vendor_assessments(id)` |
| vendor_findings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: vendors

| Constraint Name | Type | Definition |
|---|---|---|
| vendors_tier_check | CHECK | `CHECK ((tier = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))` |
| vendors_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |

## Table: webhook_contracts

| Constraint Name | Type | Definition |
|---|---|---|
| webhook_contracts_direction_check | CHECK | `CHECK ((direction = ANY (ARRAY['inbound'::text, 'outbound'::text])))` |
| webhook_contracts_rate_limit_per_minute_check | CHECK | `CHECK ((rate_limit_per_minute > 0))` |
| webhook_contracts_status_check | CHECK | `CHECK ((status = ANY (ARRAY['active'::text, 'disabled'::text])))` |
| webhook_contracts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| webhook_contracts_tenant_id_webhook_key_contract_version_key | UNIQUE | `UNIQUE (tenant_id, webhook_key, contract_version)` |

## Table: webhook_deliveries

| Constraint Name | Type | Definition |
|---|---|---|
| webhook_deliveries_attempts_check | CHECK | `CHECK ((attempts > 0))` |
| webhook_deliveries_delivery_status_check | CHECK | `CHECK ((delivery_status = ANY (ARRAY['pending'::text, 'delivered'::text, 'failed'::text, 'dead_lettered'::text])))` |
| webhook_deliveries_webhook_id_fkey | FOREIGN KEY | `FOREIGN KEY (webhook_id) REFERENCES webhook_contracts(id)` |
| webhook_deliveries_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |
| webhook_deliveries_tenant_id_webhook_id_idempotency_key_key | UNIQUE | `UNIQUE (tenant_id, webhook_id, idempotency_key)` |
