# Cybernara Indexes


## Table: access_review_decisions

| Index Name | Definition |
|---|---|
| access_review_decisions_pkey | `CREATE UNIQUE INDEX access_review_decisions_pkey ON public.access_review_decisions USING btree (id)` |
| idx_access_review_decisions_item | `CREATE INDEX idx_access_review_decisions_item ON public.access_review_decisions USING btree (review_item_id, decision)` |

## Table: access_review_items

| Index Name | Definition |
|---|---|
| access_review_items_access_review_id_principal_ref_resource_key | `CREATE UNIQUE INDEX access_review_items_access_review_id_principal_ref_resource_key ON public.access_review_items USING btree (access_review_id, principal_ref, resource_ref, entitlement_ref)` |
| access_review_items_pkey | `CREATE UNIQUE INDEX access_review_items_pkey ON public.access_review_items USING btree (id)` |
| idx_access_review_items_review | `CREATE INDEX idx_access_review_items_review ON public.access_review_items USING btree (access_review_id)` |

## Table: access_reviews

| Index Name | Definition |
|---|---|
| access_reviews_pkey | `CREATE UNIQUE INDEX access_reviews_pkey ON public.access_reviews USING btree (id)` |

## Table: ai_evaluation_runs

| Index Name | Definition |
|---|---|
| ai_evaluation_runs_pkey | `CREATE UNIQUE INDEX ai_evaluation_runs_pkey ON public.ai_evaluation_runs USING btree (id)` |

## Table: ai_generation_runs

| Index Name | Definition |
|---|---|
| ai_generation_runs_pkey | `CREATE UNIQUE INDEX ai_generation_runs_pkey ON public.ai_generation_runs USING btree (id)` |
| idx_ai_generation_runs_tenant_status | `CREATE INDEX idx_ai_generation_runs_tenant_status ON public.ai_generation_runs USING btree (tenant_id, status)` |

## Table: ai_model_deployments

| Index Name | Definition |
|---|---|
| ai_model_deployments_pkey | `CREATE UNIQUE INDEX ai_model_deployments_pkey ON public.ai_model_deployments USING btree (id)` |
| ai_model_deployments_tenant_id_provider_model_name_deployme_key | `CREATE UNIQUE INDEX ai_model_deployments_tenant_id_provider_model_name_deployme_key ON public.ai_model_deployments USING btree (tenant_id, provider, model_name, deployment_version, region)` |

## Table: ai_output_reviews

| Index Name | Definition |
|---|---|
| ai_output_reviews_pkey | `CREATE UNIQUE INDEX ai_output_reviews_pkey ON public.ai_output_reviews USING btree (id)` |
| idx_ai_output_reviews_generation | `CREATE INDEX idx_ai_output_reviews_generation ON public.ai_output_reviews USING btree (tenant_id, generation_run_id)` |

## Table: ai_prompt_versions

| Index Name | Definition |
|---|---|
| ai_prompt_versions_pkey | `CREATE UNIQUE INDEX ai_prompt_versions_pkey ON public.ai_prompt_versions USING btree (id)` |
| ai_prompt_versions_tenant_id_prompt_key_prompt_version_key | `CREATE UNIQUE INDEX ai_prompt_versions_tenant_id_prompt_key_prompt_version_key ON public.ai_prompt_versions USING btree (tenant_id, prompt_key, prompt_version)` |

## Table: ai_publication_events

| Index Name | Definition |
|---|---|
| ai_publication_events_pkey | `CREATE UNIQUE INDEX ai_publication_events_pkey ON public.ai_publication_events USING btree (id)` |
| ai_publication_events_target_type_target_id_approved_versio_key | `CREATE UNIQUE INDEX ai_publication_events_target_type_target_id_approved_versio_key ON public.ai_publication_events USING btree (target_type, target_id, approved_version_id)` |
| idx_ai_publication_events_target | `CREATE INDEX idx_ai_publication_events_target ON public.ai_publication_events USING btree (target_type, target_id)` |

## Table: ai_question_versions

| Index Name | Definition |
|---|---|
| ai_question_versions_pkey | `CREATE UNIQUE INDEX ai_question_versions_pkey ON public.ai_question_versions USING btree (id)` |
| ai_question_versions_tenant_id_generation_run_id_question_v_key | `CREATE UNIQUE INDEX ai_question_versions_tenant_id_generation_run_id_question_v_key ON public.ai_question_versions USING btree (tenant_id, generation_run_id, question_version)` |
| idx_ai_question_versions_generation | `CREATE INDEX idx_ai_question_versions_generation ON public.ai_question_versions USING btree (tenant_id, generation_run_id)` |

## Table: ai_retrieval_indexes

| Index Name | Definition |
|---|---|
| ai_retrieval_indexes_pkey | `CREATE UNIQUE INDEX ai_retrieval_indexes_pkey ON public.ai_retrieval_indexes USING btree (id)` |
| ai_retrieval_indexes_tenant_id_index_key_index_version_key | `CREATE UNIQUE INDEX ai_retrieval_indexes_tenant_id_index_key_index_version_key ON public.ai_retrieval_indexes USING btree (tenant_id, index_key, index_version)` |

## Table: answer_revisions

| Index Name | Definition |
|---|---|
| answer_revisions_pkey | `CREATE UNIQUE INDEX answer_revisions_pkey ON public.answer_revisions USING btree (id)` |
| answer_revisions_tenant_id_assessment_item_id_revision_key | `CREATE UNIQUE INDEX answer_revisions_tenant_id_assessment_item_id_revision_key ON public.answer_revisions USING btree (tenant_id, assessment_item_id, revision)` |
| idx_answer_revisions_item | `CREATE INDEX idx_answer_revisions_item ON public.answer_revisions USING btree (tenant_id, assessment_item_id, revision)` |

## Table: applicability_decisions

| Index Name | Definition |
|---|---|
| applicability_decisions_pkey | `CREATE UNIQUE INDEX applicability_decisions_pkey ON public.applicability_decisions USING btree (id)` |
| idx_applicability_decisions_control_instance | `CREATE INDEX idx_applicability_decisions_control_instance ON public.applicability_decisions USING btree (tenant_id, control_instance_id)` |

## Table: assessment_frameworks

| Index Name | Definition |
|---|---|
| assessment_frameworks_pkey | `CREATE UNIQUE INDEX assessment_frameworks_pkey ON public.assessment_frameworks USING btree (id)` |
| assessment_frameworks_tenant_id_assessment_id_framework_key_key | `CREATE UNIQUE INDEX assessment_frameworks_tenant_id_assessment_id_framework_key_key ON public.assessment_frameworks USING btree (tenant_id, assessment_id, framework_key)` |
| idx_assessment_frameworks_assessment | `CREATE INDEX idx_assessment_frameworks_assessment ON public.assessment_frameworks USING btree (tenant_id, assessment_id)` |

## Table: assessment_items

| Index Name | Definition |
|---|---|
| assessment_items_pkey | `CREATE UNIQUE INDEX assessment_items_pkey ON public.assessment_items USING btree (id)` |
| idx_assessment_items_assessment | `CREATE INDEX idx_assessment_items_assessment ON public.assessment_items USING btree (tenant_id, assessment_id)` |
| idx_assessment_items_control_instance | `CREATE INDEX idx_assessment_items_control_instance ON public.assessment_items USING btree (tenant_id, control_instance_id)` |
| idx_assessment_items_question_version | `CREATE INDEX idx_assessment_items_question_version ON public.assessment_items USING btree (tenant_id, question_version_id)` |

## Table: assessment_scopes

| Index Name | Definition |
|---|---|
| assessment_scopes_pkey | `CREATE UNIQUE INDEX assessment_scopes_pkey ON public.assessment_scopes USING btree (id)` |
| idx_assessment_scopes_tenant_workspace | `CREATE INDEX idx_assessment_scopes_tenant_workspace ON public.assessment_scopes USING btree (tenant_id, workspace_id)` |

## Table: assessment_signoffs

| Index Name | Definition |
|---|---|
| assessment_signoffs_pkey | `CREATE UNIQUE INDEX assessment_signoffs_pkey ON public.assessment_signoffs USING btree (id)` |
| assessment_signoffs_tenant_id_assessment_id_scope_type_scop_key | `CREATE UNIQUE INDEX assessment_signoffs_tenant_id_assessment_id_scope_type_scop_key ON public.assessment_signoffs USING btree (tenant_id, assessment_id, scope_type, scope_id)` |
| idx_assessment_signoffs_assessment | `CREATE INDEX idx_assessment_signoffs_assessment ON public.assessment_signoffs USING btree (tenant_id, assessment_id, decision)` |

## Table: assessment_snapshots

| Index Name | Definition |
|---|---|
| assessment_snapshots_pkey | `CREATE UNIQUE INDEX assessment_snapshots_pkey ON public.assessment_snapshots USING btree (id)` |
| assessment_snapshots_tenant_id_assessment_id_sequence_key | `CREATE UNIQUE INDEX assessment_snapshots_tenant_id_assessment_id_sequence_key ON public.assessment_snapshots USING btree (tenant_id, assessment_id, sequence)` |
| idx_assessment_snapshots_assessment | `CREATE INDEX idx_assessment_snapshots_assessment ON public.assessment_snapshots USING btree (tenant_id, assessment_id, sequence)` |

## Table: assessments

| Index Name | Definition |
|---|---|
| assessments_pkey | `CREATE UNIQUE INDEX assessments_pkey ON public.assessments USING btree (id)` |

## Table: assurance_alerts

| Index Name | Definition |
|---|---|
| assurance_alerts_pkey | `CREATE UNIQUE INDEX assurance_alerts_pkey ON public.assurance_alerts USING btree (id)` |
| idx_assurance_alerts_triage | `CREATE INDEX idx_assurance_alerts_triage ON public.assurance_alerts USING btree (tenant_id, status, severity, sla_due_at)` |

## Table: audit_checkpoints

| Index Name | Definition |
|---|---|
| audit_checkpoints_chain_partition_end_sequence_key | `CREATE UNIQUE INDEX audit_checkpoints_chain_partition_end_sequence_key ON public.audit_checkpoints USING btree (chain_partition, end_sequence)` |
| audit_checkpoints_chain_partition_start_sequence_key | `CREATE UNIQUE INDEX audit_checkpoints_chain_partition_start_sequence_key ON public.audit_checkpoints USING btree (chain_partition, start_sequence)` |
| audit_checkpoints_pkey | `CREATE UNIQUE INDEX audit_checkpoints_pkey ON public.audit_checkpoints USING btree (id)` |
| idx_audit_checkpoints_chain_partition | `CREATE INDEX idx_audit_checkpoints_chain_partition ON public.audit_checkpoints USING btree (chain_partition, end_sequence DESC)` |

## Table: audit_engagements

| Index Name | Definition |
|---|---|
| audit_engagements_pkey | `CREATE UNIQUE INDEX audit_engagements_pkey ON public.audit_engagements USING btree (id)` |

## Table: audit_events

| Index Name | Definition |
|---|---|
| audit_events_pkey | `CREATE UNIQUE INDEX audit_events_pkey ON public.audit_events USING btree (id)` |
| audit_events_tenant_id_event_hash_key | `CREATE UNIQUE INDEX audit_events_tenant_id_event_hash_key ON public.audit_events USING btree (tenant_id, event_hash)` |
| audit_events_tenant_id_sequence_key | `CREATE UNIQUE INDEX audit_events_tenant_id_sequence_key ON public.audit_events USING btree (tenant_id, sequence)` |
| idx_audit_events_chain_partition_sequence | `CREATE UNIQUE INDEX idx_audit_events_chain_partition_sequence ON public.audit_events USING btree (chain_partition, sequence)` |
| idx_audit_events_tenant_sequence | `CREATE INDEX idx_audit_events_tenant_sequence ON public.audit_events USING btree (tenant_id, sequence DESC)` |

## Table: audit_requests

| Index Name | Definition |
|---|---|
| audit_requests_audit_engagement_id_control_id_requested_fro_key | `CREATE UNIQUE INDEX audit_requests_audit_engagement_id_control_id_requested_fro_key ON public.audit_requests USING btree (audit_engagement_id, control_id, requested_from)` |
| audit_requests_pkey | `CREATE UNIQUE INDEX audit_requests_pkey ON public.audit_requests USING btree (id)` |
| idx_audit_requests_engagement | `CREATE INDEX idx_audit_requests_engagement ON public.audit_requests USING btree (audit_engagement_id, status)` |

## Table: audit_tests

| Index Name | Definition |
|---|---|
| audit_tests_pkey | `CREATE UNIQUE INDEX audit_tests_pkey ON public.audit_tests USING btree (id)` |
| idx_audit_tests_engagement | `CREATE INDEX idx_audit_tests_engagement ON public.audit_tests USING btree (audit_engagement_id)` |

## Table: audit_verifications

| Index Name | Definition |
|---|---|
| audit_verifications_pkey | `CREATE UNIQUE INDEX audit_verifications_pkey ON public.audit_verifications USING btree (id)` |
| idx_audit_verifications_checkpoint | `CREATE INDEX idx_audit_verifications_checkpoint ON public.audit_verifications USING btree (checkpoint_id, result)` |

## Table: authorization_decision_logs

| Index Name | Definition |
|---|---|
| authorization_decision_logs_pkey | `CREATE UNIQUE INDEX authorization_decision_logs_pkey ON public.authorization_decision_logs USING btree (id)` |

## Table: automated_control_tests

| Index Name | Definition |
|---|---|
| automated_control_tests_pkey | `CREATE UNIQUE INDEX automated_control_tests_pkey ON public.automated_control_tests USING btree (id)` |
| idx_automated_control_tests_control | `CREATE INDEX idx_automated_control_tests_control ON public.automated_control_tests USING btree (tenant_id, control_ref, source_timestamp)` |

## Table: automated_test_runs

| Index Name | Definition |
|---|---|
| automated_test_runs_pkey | `CREATE UNIQUE INDEX automated_test_runs_pkey ON public.automated_test_runs USING btree (id)` |
| automated_test_runs_tenant_id_idempotency_key_key | `CREATE UNIQUE INDEX automated_test_runs_tenant_id_idempotency_key_key ON public.automated_test_runs USING btree (tenant_id, idempotency_key)` |
| idx_automated_test_runs_test_status | `CREATE INDEX idx_automated_test_runs_test_status ON public.automated_test_runs USING btree (automated_test_id, status)` |

## Table: automated_tests

| Index Name | Definition |
|---|---|
| automated_tests_pkey | `CREATE UNIQUE INDEX automated_tests_pkey ON public.automated_tests USING btree (id)` |
| automated_tests_tenant_id_control_id_connector_type_key | `CREATE UNIQUE INDEX automated_tests_tenant_id_control_id_connector_type_key ON public.automated_tests USING btree (tenant_id, control_id, connector_type)` |
| idx_automated_tests_control | `CREATE INDEX idx_automated_tests_control ON public.automated_tests USING btree (tenant_id, control_id, connector_type)` |

## Table: backup_restore_tests

| Index Name | Definition |
|---|---|
| backup_restore_tests_pkey | `CREATE UNIQUE INDEX backup_restore_tests_pkey ON public.backup_restore_tests USING btree (id)` |

## Table: connector_objects

| Index Name | Definition |
|---|---|
| connector_objects_pkey | `CREATE UNIQUE INDEX connector_objects_pkey ON public.connector_objects USING btree (id)` |
| connector_objects_tenant_id_connector_id_object_type_extern_key | `CREATE UNIQUE INDEX connector_objects_tenant_id_connector_id_object_type_extern_key ON public.connector_objects USING btree (tenant_id, connector_id, object_type, external_id)` |
| idx_connector_objects_external | `CREATE INDEX idx_connector_objects_external ON public.connector_objects USING btree (tenant_id, connector_id, object_type, external_id)` |

## Table: connector_sync_runs

| Index Name | Definition |
|---|---|
| connector_sync_runs_pkey | `CREATE UNIQUE INDEX connector_sync_runs_pkey ON public.connector_sync_runs USING btree (id)` |
| idx_connector_sync_runs_connector | `CREATE INDEX idx_connector_sync_runs_connector ON public.connector_sync_runs USING btree (tenant_id, connector_id, started_at)` |

## Table: connectors

| Index Name | Definition |
|---|---|
| connectors_pkey | `CREATE UNIQUE INDEX connectors_pkey ON public.connectors USING btree (id)` |
| connectors_tenant_id_connector_key_key | `CREATE UNIQUE INDEX connectors_tenant_id_connector_key_key ON public.connectors USING btree (tenant_id, connector_key)` |
| idx_connectors_tenant_status | `CREATE INDEX idx_connectors_tenant_status ON public.connectors USING btree (tenant_id, status, health)` |

## Table: consent_events

| Index Name | Definition |
|---|---|
| consent_events_pkey | `CREATE UNIQUE INDEX consent_events_pkey ON public.consent_events USING btree (id)` |
| consent_events_tenant_id_idempotency_key_key | `CREATE UNIQUE INDEX consent_events_tenant_id_idempotency_key_key ON public.consent_events USING btree (tenant_id, idempotency_key)` |
| idx_consent_events_subject_occurred | `CREATE INDEX idx_consent_events_subject_occurred ON public.consent_events USING btree (subject_token, occurred_at)` |

## Table: consent_purposes

| Index Name | Definition |
|---|---|
| consent_purposes_pkey | `CREATE UNIQUE INDEX consent_purposes_pkey ON public.consent_purposes USING btree (id)` |
| idx_consent_purposes_active_unique | `CREATE UNIQUE INDEX idx_consent_purposes_active_unique ON public.consent_purposes USING btree (tenant_id, purpose_id, channel, region) WHERE (active_to IS NULL)` |
| idx_consent_purposes_tenant_purpose | `CREATE INDEX idx_consent_purposes_tenant_purpose ON public.consent_purposes USING btree (tenant_id, purpose_id)` |

## Table: consent_records

| Index Name | Definition |
|---|---|
| consent_records_pkey | `CREATE UNIQUE INDEX consent_records_pkey ON public.consent_records USING btree (id)` |

## Table: content_rejected_records

| Index Name | Definition |
|---|---|
| content_rejected_records_pkey | `CREATE UNIQUE INDEX content_rejected_records_pkey ON public.content_rejected_records USING btree (id)` |

## Table: content_source_packages

| Index Name | Definition |
|---|---|
| content_source_packages_pkey | `CREATE UNIQUE INDEX content_source_packages_pkey ON public.content_source_packages USING btree (id)` |
| content_source_packages_tenant_id_source_file_name_source_s_key | `CREATE UNIQUE INDEX content_source_packages_tenant_id_source_file_name_source_s_key ON public.content_source_packages USING btree (tenant_id, source_file_name, source_sha256)` |

## Table: control_instances

| Index Name | Definition |
|---|---|
| control_instances_pkey | `CREATE UNIQUE INDEX control_instances_pkey ON public.control_instances USING btree (id)` |
| control_instances_tenant_id_assessment_id_control_id_key | `CREATE UNIQUE INDEX control_instances_tenant_id_assessment_id_control_id_key ON public.control_instances USING btree (tenant_id, assessment_id, control_id)` |
| idx_control_instances_assessment | `CREATE INDEX idx_control_instances_assessment ON public.control_instances USING btree (tenant_id, assessment_id, status, owner_id)` |

## Table: control_mappings

| Index Name | Definition |
|---|---|
| control_mappings_pkey | `CREATE UNIQUE INDEX control_mappings_pkey ON public.control_mappings USING btree (id)` |
| control_mappings_tenant_id_framework_key_source_control_id__key | `CREATE UNIQUE INDEX control_mappings_tenant_id_framework_key_source_control_id__key ON public.control_mappings USING btree (tenant_id, framework_key, source_control_id, harmonized_control_id, source_workbook, source_row_number)` |
| idx_control_mappings_mapping_version | `CREATE INDEX idx_control_mappings_mapping_version ON public.control_mappings USING btree (mapping_version_id)` |
| idx_control_mappings_owner_scope | `CREATE INDEX idx_control_mappings_owner_scope ON public.control_mappings USING btree (owner_scope)` |
| idx_control_mappings_source | `CREATE INDEX idx_control_mappings_source ON public.control_mappings USING btree (tenant_id, framework_key, source_control_id)` |
| idx_control_mappings_target | `CREATE INDEX idx_control_mappings_target ON public.control_mappings USING btree (tenant_id, harmonized_control_id)` |

## Table: control_sets

| Index Name | Definition |
|---|---|
| control_sets_pkey | `CREATE UNIQUE INDEX control_sets_pkey ON public.control_sets USING btree (id)` |
| control_sets_tenant_id_framework_version_id_set_key_key | `CREATE UNIQUE INDEX control_sets_tenant_id_framework_version_id_set_key_key ON public.control_sets USING btree (tenant_id, framework_version_id, set_key)` |
| idx_control_sets_framework_version | `CREATE INDEX idx_control_sets_framework_version ON public.control_sets USING btree (tenant_id, framework_version_id)` |

## Table: control_subcontrols

| Index Name | Definition |
|---|---|
| control_subcontrols_pkey | `CREATE UNIQUE INDEX control_subcontrols_pkey ON public.control_subcontrols USING btree (id)` |
| control_subcontrols_tenant_id_control_id_subcontrol_key_key | `CREATE UNIQUE INDEX control_subcontrols_tenant_id_control_id_subcontrol_key_key ON public.control_subcontrols USING btree (tenant_id, control_id, subcontrol_key)` |
| idx_control_subcontrols_control | `CREATE INDEX idx_control_subcontrols_control ON public.control_subcontrols USING btree (tenant_id, control_id)` |

## Table: control_test_results

| Index Name | Definition |
|---|---|
| control_test_results_pkey | `CREATE UNIQUE INDEX control_test_results_pkey ON public.control_test_results USING btree (id)` |
| idx_control_test_results_instance | `CREATE INDEX idx_control_test_results_instance ON public.control_test_results USING btree (tenant_id, control_instance_id, result)` |

## Table: controls

| Index Name | Definition |
|---|---|
| controls_pkey | `CREATE UNIQUE INDEX controls_pkey ON public.controls USING btree (id)` |
| controls_tenant_id_control_set_id_control_key_key | `CREATE UNIQUE INDEX controls_tenant_id_control_set_id_control_key_key ON public.controls USING btree (tenant_id, control_set_id, control_key)` |
| idx_controls_control_set | `CREATE INDEX idx_controls_control_set ON public.controls USING btree (tenant_id, control_set_id)` |

## Table: custom_field_definitions

| Index Name | Definition |
|---|---|
| custom_field_definitions_object_definition_id_field_key_key | `CREATE UNIQUE INDEX custom_field_definitions_object_definition_id_field_key_key ON public.custom_field_definitions USING btree (object_definition_id, field_key)` |
| custom_field_definitions_pkey | `CREATE UNIQUE INDEX custom_field_definitions_pkey ON public.custom_field_definitions USING btree (id)` |
| idx_custom_field_definitions_object | `CREATE INDEX idx_custom_field_definitions_object ON public.custom_field_definitions USING btree (object_definition_id)` |

## Table: custom_object_definitions

| Index Name | Definition |
|---|---|
| custom_object_definitions_pkey | `CREATE UNIQUE INDEX custom_object_definitions_pkey ON public.custom_object_definitions USING btree (id)` |
| custom_object_definitions_tenant_id_object_key_key | `CREATE UNIQUE INDEX custom_object_definitions_tenant_id_object_key_key ON public.custom_object_definitions USING btree (tenant_id, object_key)` |
| idx_custom_object_definitions_status | `CREATE INDEX idx_custom_object_definitions_status ON public.custom_object_definitions USING btree (tenant_id, status)` |

## Table: custom_records

| Index Name | Definition |
|---|---|
| custom_records_object_definition_id_record_key_key | `CREATE UNIQUE INDEX custom_records_object_definition_id_record_key_key ON public.custom_records USING btree (object_definition_id, record_key)` |
| custom_records_pkey | `CREATE UNIQUE INDEX custom_records_pkey ON public.custom_records USING btree (id)` |
| idx_custom_records_status | `CREATE INDEX idx_custom_records_status ON public.custom_records USING btree (tenant_id, status)` |

## Table: custom_values

| Index Name | Definition |
|---|---|
| custom_values_pkey | `CREATE UNIQUE INDEX custom_values_pkey ON public.custom_values USING btree (id)` |
| custom_values_record_id_field_definition_id_key | `CREATE UNIQUE INDEX custom_values_record_id_field_definition_id_key ON public.custom_values USING btree (record_id, field_definition_id)` |
| idx_custom_values_record | `CREATE INDEX idx_custom_values_record ON public.custom_values USING btree (record_id)` |

## Table: data_categories

| Index Name | Definition |
|---|---|
| data_categories_pkey | `CREATE UNIQUE INDEX data_categories_pkey ON public.data_categories USING btree (id)` |
| data_categories_tenant_id_category_key_key | `CREATE UNIQUE INDEX data_categories_tenant_id_category_key_key ON public.data_categories USING btree (tenant_id, category_key)` |
| idx_data_categories_sensitivity | `CREATE INDEX idx_data_categories_sensitivity ON public.data_categories USING btree (sensitivity)` |

## Table: data_discovery_findings

| Index Name | Definition |
|---|---|
| data_discovery_findings_pkey | `CREATE UNIQUE INDEX data_discovery_findings_pkey ON public.data_discovery_findings USING btree (id)` |
| data_discovery_findings_scan_id_locator_hash_data_category__key | `CREATE UNIQUE INDEX data_discovery_findings_scan_id_locator_hash_data_category__key ON public.data_discovery_findings USING btree (scan_id, locator_hash, data_category_id)` |
| idx_data_discovery_findings_scan_status | `CREATE INDEX idx_data_discovery_findings_scan_status ON public.data_discovery_findings USING btree (scan_id, review_status)` |

## Table: data_discovery_scans

| Index Name | Definition |
|---|---|
| data_discovery_scans_pkey | `CREATE UNIQUE INDEX data_discovery_scans_pkey ON public.data_discovery_scans USING btree (id)` |
| data_discovery_scans_tenant_id_idempotency_key_key | `CREATE UNIQUE INDEX data_discovery_scans_tenant_id_idempotency_key_key ON public.data_discovery_scans USING btree (tenant_id, idempotency_key)` |
| idx_data_discovery_scans_system_status | `CREATE INDEX idx_data_discovery_scans_system_status ON public.data_discovery_scans USING btree (system_id, status)` |

## Table: data_inventory_records

| Index Name | Definition |
|---|---|
| data_inventory_records_pkey | `CREATE UNIQUE INDEX data_inventory_records_pkey ON public.data_inventory_records USING btree (id)` |

## Table: data_subject_categories

| Index Name | Definition |
|---|---|
| data_subject_categories_pkey | `CREATE UNIQUE INDEX data_subject_categories_pkey ON public.data_subject_categories USING btree (id)` |
| data_subject_categories_tenant_id_subject_key_key | `CREATE UNIQUE INDEX data_subject_categories_tenant_id_subject_key_key ON public.data_subject_categories USING btree (tenant_id, subject_key)` |
| idx_data_subject_categories_key | `CREATE INDEX idx_data_subject_categories_key ON public.data_subject_categories USING btree (subject_key)` |

## Table: deletion_items

| Index Name | Definition |
|---|---|
| deletion_items_deletion_job_id_target_type_target_id_key | `CREATE UNIQUE INDEX deletion_items_deletion_job_id_target_type_target_id_key ON public.deletion_items USING btree (deletion_job_id, target_type, target_id)` |
| deletion_items_pkey | `CREATE UNIQUE INDEX deletion_items_pkey ON public.deletion_items USING btree (id)` |
| idx_deletion_items_job_status | `CREATE INDEX idx_deletion_items_job_status ON public.deletion_items USING btree (deletion_job_id, disposition)` |

## Table: deletion_jobs

| Index Name | Definition |
|---|---|
| deletion_jobs_pkey | `CREATE UNIQUE INDEX deletion_jobs_pkey ON public.deletion_jobs USING btree (id)` |
| idx_deletion_jobs_tenant_status | `CREATE INDEX idx_deletion_jobs_tenant_status ON public.deletion_jobs USING btree (tenant_id, status)` |

## Table: dpia_assessments

| Index Name | Definition |
|---|---|
| dpia_assessments_pkey | `CREATE UNIQUE INDEX dpia_assessments_pkey ON public.dpia_assessments USING btree (id)` |

## Table: dpia_risks

| Index Name | Definition |
|---|---|
| dpia_risks_pkey | `CREATE UNIQUE INDEX dpia_risks_pkey ON public.dpia_risks USING btree (id)` |
| idx_dpia_risks_dpia | `CREATE INDEX idx_dpia_risks_dpia ON public.dpia_risks USING btree (dpia_id)` |

## Table: dpias

| Index Name | Definition |
|---|---|
| dpias_pkey | `CREATE UNIQUE INDEX dpias_pkey ON public.dpias USING btree (id)` |
| idx_dpias_activity_status | `CREATE INDEX idx_dpias_activity_status ON public.dpias USING btree (processing_activity_id, status)` |

## Table: encryption_key_records

| Index Name | Definition |
|---|---|
| encryption_key_records_pkey | `CREATE UNIQUE INDEX encryption_key_records_pkey ON public.encryption_key_records USING btree (id)` |

## Table: evaluation_cases

| Index Name | Definition |
|---|---|
| evaluation_cases_pkey | `CREATE UNIQUE INDEX evaluation_cases_pkey ON public.evaluation_cases USING btree (id)` |
| evaluation_cases_suite_id_case_key_key | `CREATE UNIQUE INDEX evaluation_cases_suite_id_case_key_key ON public.evaluation_cases USING btree (suite_id, case_key)` |
| idx_evaluation_cases_suite | `CREATE INDEX idx_evaluation_cases_suite ON public.evaluation_cases USING btree (suite_id)` |

## Table: evaluation_results

| Index Name | Definition |
|---|---|
| evaluation_results_evaluation_run_id_case_id_metric_key | `CREATE UNIQUE INDEX evaluation_results_evaluation_run_id_case_id_metric_key ON public.evaluation_results USING btree (evaluation_run_id, case_id, metric)` |
| evaluation_results_pkey | `CREATE UNIQUE INDEX evaluation_results_pkey ON public.evaluation_results USING btree (id)` |
| idx_evaluation_results_run | `CREATE INDEX idx_evaluation_results_run ON public.evaluation_results USING btree (evaluation_run_id, passed)` |

## Table: evaluation_suites

| Index Name | Definition |
|---|---|
| evaluation_suites_pkey | `CREATE UNIQUE INDEX evaluation_suites_pkey ON public.evaluation_suites USING btree (id)` |
| evaluation_suites_tenant_id_use_case_suite_key_suite_versio_key | `CREATE UNIQUE INDEX evaluation_suites_tenant_id_use_case_suite_key_suite_versio_key ON public.evaluation_suites USING btree (tenant_id, use_case, suite_key, suite_version)` |
| idx_evaluation_suites_status | `CREATE INDEX idx_evaluation_suites_status ON public.evaluation_suites USING btree (tenant_id, status)` |

## Table: evidence_custody_events

| Index Name | Definition |
|---|---|
| evidence_custody_events_pkey | `CREATE UNIQUE INDEX evidence_custody_events_pkey ON public.evidence_custody_events USING btree (id)` |
| idx_evidence_custody_events_version | `CREATE INDEX idx_evidence_custody_events_version ON public.evidence_custody_events USING btree (evidence_version_id, occurred_at)` |

## Table: evidence_expiry_events

| Index Name | Definition |
|---|---|
| evidence_expiry_events_pkey | `CREATE UNIQUE INDEX evidence_expiry_events_pkey ON public.evidence_expiry_events USING btree (id)` |
| idx_evidence_expiry_events_evidence | `CREATE INDEX idx_evidence_expiry_events_evidence ON public.evidence_expiry_events USING btree (evidence_id, occurred_at)` |

## Table: evidence_links

| Index Name | Definition |
|---|---|
| evidence_links_evidence_version_id_target_type_target_id_pu_key | `CREATE UNIQUE INDEX evidence_links_evidence_version_id_target_type_target_id_pu_key ON public.evidence_links USING btree (evidence_version_id, target_type, target_id, purpose)` |
| evidence_links_pkey | `CREATE UNIQUE INDEX evidence_links_pkey ON public.evidence_links USING btree (id)` |
| idx_evidence_links_target | `CREATE INDEX idx_evidence_links_target ON public.evidence_links USING btree (target_type, target_id)` |

## Table: evidence_objects

| Index Name | Definition |
|---|---|
| evidence_objects_pkey | `CREATE UNIQUE INDEX evidence_objects_pkey ON public.evidence_objects USING btree (id)` |
| idx_evidence_objects_tenant_state | `CREATE INDEX idx_evidence_objects_tenant_state ON public.evidence_objects USING btree (tenant_id, state)` |

## Table: evidence_requests

| Index Name | Definition |
|---|---|
| evidence_requests_assessment_id_control_instance_id_request_key | `CREATE UNIQUE INDEX evidence_requests_assessment_id_control_instance_id_request_key ON public.evidence_requests USING btree (assessment_id, control_instance_id, requested_from)` |
| evidence_requests_pkey | `CREATE UNIQUE INDEX evidence_requests_pkey ON public.evidence_requests USING btree (id)` |
| idx_evidence_requests_assessment_status | `CREATE INDEX idx_evidence_requests_assessment_status ON public.evidence_requests USING btree (assessment_id, status, due_at)` |

## Table: evidence_reviews

| Index Name | Definition |
|---|---|
| evidence_reviews_pkey | `CREATE UNIQUE INDEX evidence_reviews_pkey ON public.evidence_reviews USING btree (id)` |
| idx_evidence_reviews_version_decision | `CREATE INDEX idx_evidence_reviews_version_decision ON public.evidence_reviews USING btree (evidence_version_id, decision)` |

## Table: evidence_samples

| Index Name | Definition |
|---|---|
| evidence_samples_pkey | `CREATE UNIQUE INDEX evidence_samples_pkey ON public.evidence_samples USING btree (id)` |
| idx_evidence_samples_test_result | `CREATE INDEX idx_evidence_samples_test_result ON public.evidence_samples USING btree (test_result_id)` |

## Table: evidence_versions

| Index Name | Definition |
|---|---|
| evidence_versions_evidence_id_evidence_version_no_key | `CREATE UNIQUE INDEX evidence_versions_evidence_id_evidence_version_no_key ON public.evidence_versions USING btree (evidence_id, evidence_version_no)` |
| evidence_versions_pkey | `CREATE UNIQUE INDEX evidence_versions_pkey ON public.evidence_versions USING btree (id)` |
| idx_evidence_versions_evidence | `CREATE INDEX idx_evidence_versions_evidence ON public.evidence_versions USING btree (evidence_id)` |

## Table: export_manifests

| Index Name | Definition |
|---|---|
| export_manifests_pkey | `CREATE UNIQUE INDEX export_manifests_pkey ON public.export_manifests USING btree (id)` |
| export_manifests_tenant_id_snapshot_id_template_version_man_key | `CREATE UNIQUE INDEX export_manifests_tenant_id_snapshot_id_template_version_man_key ON public.export_manifests USING btree (tenant_id, snapshot_id, template_version, manifest_hash)` |
| idx_export_manifests_report_export | `CREATE INDEX idx_export_manifests_report_export ON public.export_manifests USING btree (tenant_id, report_export_id)` |

## Table: findings

| Index Name | Definition |
|---|---|
| findings_pkey | `CREATE UNIQUE INDEX findings_pkey ON public.findings USING btree (id)` |
| idx_findings_assessment_item | `CREATE INDEX idx_findings_assessment_item ON public.findings USING btree (tenant_id, assessment_item_id)` |
| idx_findings_test_result | `CREATE INDEX idx_findings_test_result ON public.findings USING btree (tenant_id, test_result_id)` |

## Table: framework_content_packs

| Index Name | Definition |
|---|---|
| framework_content_packs_pkey | `CREATE UNIQUE INDEX framework_content_packs_pkey ON public.framework_content_packs USING btree (id)` |
| framework_content_packs_tenant_id_framework_key_pack_versio_key | `CREATE UNIQUE INDEX framework_content_packs_tenant_id_framework_key_pack_versio_key ON public.framework_content_packs USING btree (tenant_id, framework_key, pack_version)` |
| idx_framework_content_packs_framework_version | `CREATE INDEX idx_framework_content_packs_framework_version ON public.framework_content_packs USING btree (framework_version_id)` |
| idx_framework_content_packs_owner_scope | `CREATE INDEX idx_framework_content_packs_owner_scope ON public.framework_content_packs USING btree (owner_scope)` |

## Table: framework_requirements

| Index Name | Definition |
|---|---|
| framework_requirements_pkey | `CREATE UNIQUE INDEX framework_requirements_pkey ON public.framework_requirements USING btree (id)` |
| framework_requirements_source_row_key | `CREATE UNIQUE INDEX framework_requirements_source_row_key ON public.framework_requirements USING btree (tenant_id, source_workbook, source_sheet, source_row_number)` |
| framework_requirements_tenant_id_framework_pack_id_control__key | `CREATE UNIQUE INDEX framework_requirements_tenant_id_framework_pack_id_control__key ON public.framework_requirements USING btree (tenant_id, framework_pack_id, control_id, sub_control_id, source_sheet, source_row_number)` |
| idx_framework_requirements_control_ref | `CREATE INDEX idx_framework_requirements_control_ref ON public.framework_requirements USING btree (control_id_ref)` |
| idx_framework_requirements_lookup | `CREATE INDEX idx_framework_requirements_lookup ON public.framework_requirements USING btree (tenant_id, framework_key, control_id, sub_control_id)` |
| idx_framework_requirements_pack | `CREATE INDEX idx_framework_requirements_pack ON public.framework_requirements USING btree (tenant_id, framework_pack_id)` |
| idx_framework_requirements_subcontrol_ref | `CREATE INDEX idx_framework_requirements_subcontrol_ref ON public.framework_requirements USING btree (control_subcontrol_id)` |

## Table: framework_versions

| Index Name | Definition |
|---|---|
| framework_versions_pkey | `CREATE UNIQUE INDEX framework_versions_pkey ON public.framework_versions USING btree (id)` |
| framework_versions_tenant_id_framework_id_version_key_key | `CREATE UNIQUE INDEX framework_versions_tenant_id_framework_id_version_key_key ON public.framework_versions USING btree (tenant_id, framework_id, version_key)` |
| idx_framework_versions_framework | `CREATE INDEX idx_framework_versions_framework ON public.framework_versions USING btree (tenant_id, framework_id)` |
| idx_framework_versions_owner_scope | `CREATE INDEX idx_framework_versions_owner_scope ON public.framework_versions USING btree (owner_scope)` |

## Table: frameworks

| Index Name | Definition |
|---|---|
| frameworks_pkey | `CREATE UNIQUE INDEX frameworks_pkey ON public.frameworks USING btree (id)` |
| frameworks_tenant_id_framework_key_key | `CREATE UNIQUE INDEX frameworks_tenant_id_framework_key_key ON public.frameworks USING btree (tenant_id, framework_key)` |
| idx_frameworks_owner_scope | `CREATE INDEX idx_frameworks_owner_scope ON public.frameworks USING btree (owner_scope)` |

## Table: generation_citations

| Index Name | Definition |
|---|---|
| generation_citations_generation_run_id_output_path_knowledg_key | `CREATE UNIQUE INDEX generation_citations_generation_run_id_output_path_knowledg_key ON public.generation_citations USING btree (generation_run_id, output_path, knowledge_chunk_id)` |
| generation_citations_pkey | `CREATE UNIQUE INDEX generation_citations_pkey ON public.generation_citations USING btree (id)` |
| idx_generation_citations_run | `CREATE INDEX idx_generation_citations_run ON public.generation_citations USING btree (generation_run_id)` |

## Table: grc_workspaces

| Index Name | Definition |
|---|---|
| grc_workspaces_pkey | `CREATE UNIQUE INDEX grc_workspaces_pkey ON public.grc_workspaces USING btree (id)` |

## Table: harmonized_controls

| Index Name | Definition |
|---|---|
| harmonized_controls_pkey | `CREATE UNIQUE INDEX harmonized_controls_pkey ON public.harmonized_controls USING btree (id)` |
| harmonized_controls_tenant_id_harmonized_id_key | `CREATE UNIQUE INDEX harmonized_controls_tenant_id_harmonized_id_key ON public.harmonized_controls USING btree (tenant_id, harmonized_id)` |
| idx_harmonized_controls_owner_scope | `CREATE INDEX idx_harmonized_controls_owner_scope ON public.harmonized_controls USING btree (owner_scope)` |

## Table: identity_role_grants

| Index Name | Definition |
|---|---|
| identity_role_grants_pkey | `CREATE UNIQUE INDEX identity_role_grants_pkey ON public.identity_role_grants USING btree (id)` |
| identity_role_grants_tenant_id_user_id_role_id_resource_typ_key | `CREATE UNIQUE INDEX identity_role_grants_tenant_id_user_id_role_id_resource_typ_key ON public.identity_role_grants USING btree (tenant_id, user_id, role_id, resource_type, resource_id)` |
| idx_identity_role_grants_tenant_user | `CREATE INDEX idx_identity_role_grants_tenant_user ON public.identity_role_grants USING btree (tenant_id, user_id)` |

## Table: identity_roles

| Index Name | Definition |
|---|---|
| identity_roles_pkey | `CREATE UNIQUE INDEX identity_roles_pkey ON public.identity_roles USING btree (id)` |
| identity_roles_tenant_id_role_key_key | `CREATE UNIQUE INDEX identity_roles_tenant_id_role_key_key ON public.identity_roles USING btree (tenant_id, role_key)` |

## Table: identity_service_accounts

| Index Name | Definition |
|---|---|
| identity_service_accounts_pkey | `CREATE UNIQUE INDEX identity_service_accounts_pkey ON public.identity_service_accounts USING btree (id)` |
| identity_service_accounts_tenant_id_name_key | `CREATE UNIQUE INDEX identity_service_accounts_tenant_id_name_key ON public.identity_service_accounts USING btree (tenant_id, name)` |

## Table: identity_sessions

| Index Name | Definition |
|---|---|
| identity_sessions_pkey | `CREATE UNIQUE INDEX identity_sessions_pkey ON public.identity_sessions USING btree (id)` |
| identity_sessions_tenant_id_supabase_session_id_key | `CREATE UNIQUE INDEX identity_sessions_tenant_id_supabase_session_id_key ON public.identity_sessions USING btree (tenant_id, supabase_session_id)` |

## Table: identity_tenants

| Index Name | Definition |
|---|---|
| identity_tenants_pkey | `CREATE UNIQUE INDEX identity_tenants_pkey ON public.identity_tenants USING btree (id)` |

## Table: identity_users

| Index Name | Definition |
|---|---|
| identity_users_pkey | `CREATE UNIQUE INDEX identity_users_pkey ON public.identity_users USING btree (id)` |
| identity_users_tenant_id_email_key | `CREATE UNIQUE INDEX identity_users_tenant_id_email_key ON public.identity_users USING btree (tenant_id, email)` |
| identity_users_tenant_id_supabase_user_id_key | `CREATE UNIQUE INDEX identity_users_tenant_id_supabase_user_id_key ON public.identity_users USING btree (tenant_id, supabase_user_id)` |
| idx_identity_users_tenant | `CREATE INDEX idx_identity_users_tenant ON public.identity_users USING btree (tenant_id)` |

## Table: identity_workspace_delegations

| Index Name | Definition |
|---|---|
| identity_workspace_delegations_pkey | `CREATE UNIQUE INDEX identity_workspace_delegations_pkey ON public.identity_workspace_delegations USING btree (id)` |

## Table: incident_assessments

| Index Name | Definition |
|---|---|
| idx_incident_assessments_incident | `CREATE INDEX idx_incident_assessments_incident ON public.incident_assessments USING btree (incident_id)` |
| incident_assessments_incident_id_jurisdiction_assessment_ve_key | `CREATE UNIQUE INDEX incident_assessments_incident_id_jurisdiction_assessment_ve_key ON public.incident_assessments USING btree (incident_id, jurisdiction, assessment_version_no)` |
| incident_assessments_pkey | `CREATE UNIQUE INDEX incident_assessments_pkey ON public.incident_assessments USING btree (id)` |

## Table: incident_notifications

| Index Name | Definition |
|---|---|
| idx_incident_notifications_incident_due | `CREATE INDEX idx_incident_notifications_incident_due ON public.incident_notifications USING btree (incident_id, due_at)` |
| incident_notifications_pkey | `CREATE UNIQUE INDEX incident_notifications_pkey ON public.incident_notifications USING btree (id)` |

## Table: knowledge_chunks

| Index Name | Definition |
|---|---|
| idx_knowledge_chunks_index | `CREATE INDEX idx_knowledge_chunks_index ON public.knowledge_chunks USING btree (tenant_id, retrieval_index_id)` |
| knowledge_chunks_pkey | `CREATE UNIQUE INDEX knowledge_chunks_pkey ON public.knowledge_chunks USING btree (id)` |
| knowledge_chunks_retrieval_index_id_source_id_content_hash_key | `CREATE UNIQUE INDEX knowledge_chunks_retrieval_index_id_source_id_content_hash_key ON public.knowledge_chunks USING btree (retrieval_index_id, source_id, content_hash)` |

## Table: lawful_bases

| Index Name | Definition |
|---|---|
| idx_lawful_bases_key | `CREATE INDEX idx_lawful_bases_key ON public.lawful_bases USING btree (basis_key)` |
| lawful_bases_pkey | `CREATE UNIQUE INDEX lawful_bases_pkey ON public.lawful_bases USING btree (id)` |
| lawful_bases_tenant_id_jurisdiction_basis_key_key | `CREATE UNIQUE INDEX lawful_bases_tenant_id_jurisdiction_basis_key_key ON public.lawful_bases USING btree (tenant_id, jurisdiction, basis_key)` |

## Table: legal_hold_items

| Index Name | Definition |
|---|---|
| idx_legal_hold_items_target | `CREATE INDEX idx_legal_hold_items_target ON public.legal_hold_items USING btree (target_type, target_id)` |
| legal_hold_items_legal_hold_id_target_type_target_id_key | `CREATE UNIQUE INDEX legal_hold_items_legal_hold_id_target_type_target_id_key ON public.legal_hold_items USING btree (legal_hold_id, target_type, target_id)` |
| legal_hold_items_pkey | `CREATE UNIQUE INDEX legal_hold_items_pkey ON public.legal_hold_items USING btree (id)` |

## Table: legal_holds

| Index Name | Definition |
|---|---|
| idx_legal_holds_tenant_released | `CREATE INDEX idx_legal_holds_tenant_released ON public.legal_holds USING btree (tenant_id, released_at)` |
| legal_holds_pkey | `CREATE UNIQUE INDEX legal_holds_pkey ON public.legal_holds USING btree (id)` |
| legal_holds_tenant_id_hold_key_key | `CREATE UNIQUE INDEX legal_holds_tenant_id_hold_key_key ON public.legal_holds USING btree (tenant_id, hold_key)` |

## Table: malware_scan_results

| Index Name | Definition |
|---|---|
| idx_malware_scan_results_version_status | `CREATE INDEX idx_malware_scan_results_version_status ON public.malware_scan_results USING btree (evidence_version_id, status)` |
| malware_scan_results_evidence_version_id_engine_key | `CREATE UNIQUE INDEX malware_scan_results_evidence_version_id_engine_key ON public.malware_scan_results USING btree (evidence_version_id, engine)` |
| malware_scan_results_pkey | `CREATE UNIQUE INDEX malware_scan_results_pkey ON public.malware_scan_results USING btree (id)` |

## Table: mapping_conflicts

| Index Name | Definition |
|---|---|
| idx_mapping_conflicts_control_mapping | `CREATE INDEX idx_mapping_conflicts_control_mapping ON public.mapping_conflicts USING btree (tenant_id, control_mapping_id)` |
| mapping_conflicts_pkey | `CREATE UNIQUE INDEX mapping_conflicts_pkey ON public.mapping_conflicts USING btree (id)` |

## Table: mapping_reviews

| Index Name | Definition |
|---|---|
| idx_mapping_reviews_control_mapping | `CREATE INDEX idx_mapping_reviews_control_mapping ON public.mapping_reviews USING btree (tenant_id, control_mapping_id)` |
| mapping_reviews_pkey | `CREATE UNIQUE INDEX mapping_reviews_pkey ON public.mapping_reviews USING btree (id)` |

## Table: mapping_versions

| Index Name | Definition |
|---|---|
| idx_mapping_versions_owner_scope | `CREATE INDEX idx_mapping_versions_owner_scope ON public.mapping_versions USING btree (owner_scope)` |
| mapping_versions_pkey | `CREATE UNIQUE INDEX mapping_versions_pkey ON public.mapping_versions USING btree (id)` |
| mapping_versions_tenant_id_version_key_key | `CREATE UNIQUE INDEX mapping_versions_tenant_id_version_key_key ON public.mapping_versions USING btree (tenant_id, version_key)` |

## Table: outbox_events

| Index Name | Definition |
|---|---|
| idx_outbox_events_pending | `CREATE INDEX idx_outbox_events_pending ON public.outbox_events USING btree (status, available_at, created_at)` |
| outbox_events_pkey | `CREATE UNIQUE INDEX outbox_events_pkey ON public.outbox_events USING btree (id)` |
| outbox_events_tenant_id_idempotency_key_key | `CREATE UNIQUE INDEX outbox_events_tenant_id_idempotency_key_key ON public.outbox_events USING btree (tenant_id, idempotency_key)` |

## Table: policies

| Index Name | Definition |
|---|---|
| idx_policies_status | `CREATE INDEX idx_policies_status ON public.policies USING btree (tenant_id, status)` |
| policies_pkey | `CREATE UNIQUE INDEX policies_pkey ON public.policies USING btree (id)` |
| policies_tenant_id_policy_key_key | `CREATE UNIQUE INDEX policies_tenant_id_policy_key_key ON public.policies USING btree (tenant_id, policy_key)` |

## Table: policy_attestations

| Index Name | Definition |
|---|---|
| idx_policy_attestations_user | `CREATE INDEX idx_policy_attestations_user ON public.policy_attestations USING btree (tenant_id, user_id)` |
| policy_attestations_pkey | `CREATE UNIQUE INDEX policy_attestations_pkey ON public.policy_attestations USING btree (id)` |
| policy_attestations_policy_version_id_user_id_key | `CREATE UNIQUE INDEX policy_attestations_policy_version_id_user_id_key ON public.policy_attestations USING btree (policy_version_id, user_id)` |

## Table: policy_control_links

| Index Name | Definition |
|---|---|
| idx_policy_control_links_control | `CREATE INDEX idx_policy_control_links_control ON public.policy_control_links USING btree (control_id)` |
| policy_control_links_pkey | `CREATE UNIQUE INDEX policy_control_links_pkey ON public.policy_control_links USING btree (id)` |
| policy_control_links_policy_version_id_control_id_key | `CREATE UNIQUE INDEX policy_control_links_policy_version_id_control_id_key ON public.policy_control_links USING btree (policy_version_id, control_id)` |

## Table: policy_versions

| Index Name | Definition |
|---|---|
| policy_versions_pkey | `CREATE UNIQUE INDEX policy_versions_pkey ON public.policy_versions USING btree (id)` |
| policy_versions_tenant_id_template_key_policy_version_key | `CREATE UNIQUE INDEX policy_versions_tenant_id_template_key_policy_version_key ON public.policy_versions USING btree (tenant_id, template_key, policy_version)` |

## Table: privacy_incidents

| Index Name | Definition |
|---|---|
| privacy_incidents_pkey | `CREATE UNIQUE INDEX privacy_incidents_pkey ON public.privacy_incidents USING btree (id)` |

## Table: privacy_notice_versions

| Index Name | Definition |
|---|---|
| privacy_notice_versions_pkey | `CREATE UNIQUE INDEX privacy_notice_versions_pkey ON public.privacy_notice_versions USING btree (id)` |
| privacy_notice_versions_privacy_notice_id_notice_version_no_key | `CREATE UNIQUE INDEX privacy_notice_versions_privacy_notice_id_notice_version_no_key ON public.privacy_notice_versions USING btree (privacy_notice_id, notice_version_no)` |

## Table: privacy_notices

| Index Name | Definition |
|---|---|
| idx_privacy_notices_tenant_status | `CREATE INDEX idx_privacy_notices_tenant_status ON public.privacy_notices USING btree (tenant_id, status)` |
| privacy_notices_pkey | `CREATE UNIQUE INDEX privacy_notices_pkey ON public.privacy_notices USING btree (id)` |
| privacy_notices_tenant_id_notice_key_key | `CREATE UNIQUE INDEX privacy_notices_tenant_id_notice_key_key ON public.privacy_notices USING btree (tenant_id, notice_key)` |

## Table: privacy_rights_requests

| Index Name | Definition |
|---|---|
| privacy_rights_requests_pkey | `CREATE UNIQUE INDEX privacy_rights_requests_pkey ON public.privacy_rights_requests USING btree (id)` |

## Table: processing_activities

| Index Name | Definition |
|---|---|
| processing_activities_pkey | `CREATE UNIQUE INDEX processing_activities_pkey ON public.processing_activities USING btree (id)` |

## Table: processing_inventory_links

| Index Name | Definition |
|---|---|
| idx_processing_inventory_links_activity | `CREATE INDEX idx_processing_inventory_links_activity ON public.processing_inventory_links USING btree (processing_activity_id)` |
| processing_inventory_links_pkey | `CREATE UNIQUE INDEX processing_inventory_links_pkey ON public.processing_inventory_links USING btree (id)` |
| processing_inventory_links_processing_activity_id_inventory_key | `CREATE UNIQUE INDEX processing_inventory_links_processing_activity_id_inventory_key ON public.processing_inventory_links USING btree (processing_activity_id, inventory_record_id, role)` |

## Table: processing_purposes

| Index Name | Definition |
|---|---|
| idx_processing_purposes_active_unique | `CREATE UNIQUE INDEX idx_processing_purposes_active_unique ON public.processing_purposes USING btree (processing_activity_id, purpose_id) WHERE (effective_to IS NULL)` |
| idx_processing_purposes_activity | `CREATE INDEX idx_processing_purposes_activity ON public.processing_purposes USING btree (processing_activity_id)` |
| processing_purposes_pkey | `CREATE UNIQUE INDEX processing_purposes_pkey ON public.processing_purposes USING btree (id)` |

## Table: processing_recipients

| Index Name | Definition |
|---|---|
| idx_processing_recipients_activity | `CREATE INDEX idx_processing_recipients_activity ON public.processing_recipients USING btree (processing_activity_id)` |
| processing_recipients_pkey | `CREATE UNIQUE INDEX processing_recipients_pkey ON public.processing_recipients USING btree (id)` |
| processing_recipients_processing_activity_id_recipient_id_p_key | `CREATE UNIQUE INDEX processing_recipients_processing_activity_id_recipient_id_p_key ON public.processing_recipients USING btree (processing_activity_id, recipient_id, purpose_id)` |

## Table: product_assurance_evidence

| Index Name | Definition |
|---|---|
| product_assurance_evidence_pkey | `CREATE UNIQUE INDEX product_assurance_evidence_pkey ON public.product_assurance_evidence USING btree (id)` |

## Table: purposes

| Index Name | Definition |
|---|---|
| idx_purposes_key | `CREATE INDEX idx_purposes_key ON public.purposes USING btree (purpose_key)` |
| purposes_pkey | `CREATE UNIQUE INDEX purposes_pkey ON public.purposes USING btree (id)` |
| purposes_tenant_id_purpose_key_key | `CREATE UNIQUE INDEX purposes_tenant_id_purpose_key_key ON public.purposes USING btree (tenant_id, purpose_key)` |

## Table: question_sets

| Index Name | Definition |
|---|---|
| idx_question_sets_control | `CREATE INDEX idx_question_sets_control ON public.question_sets USING btree (tenant_id, control_id, status)` |
| question_sets_pkey | `CREATE UNIQUE INDEX question_sets_pkey ON public.question_sets USING btree (id)` |
| question_sets_tenant_id_control_id_question_set_key_key | `CREATE UNIQUE INDEX question_sets_tenant_id_control_id_question_set_key_key ON public.question_sets USING btree (tenant_id, control_id, question_set_key)` |

## Table: question_versions

| Index Name | Definition |
|---|---|
| idx_question_versions_set | `CREATE INDEX idx_question_versions_set ON public.question_versions USING btree (tenant_id, question_set_id, status)` |
| question_versions_pkey | `CREATE UNIQUE INDEX question_versions_pkey ON public.question_versions USING btree (id)` |
| question_versions_tenant_id_question_set_id_question_versio_key | `CREATE UNIQUE INDEX question_versions_tenant_id_question_set_id_question_versio_key ON public.question_versions USING btree (tenant_id, question_set_id, question_version)` |

## Table: rate_limit_policies

| Index Name | Definition |
|---|---|
| rate_limit_policies_pkey | `CREATE UNIQUE INDEX rate_limit_policies_pkey ON public.rate_limit_policies USING btree (id)` |
| rate_limit_policies_tenant_id_policy_key_key | `CREATE UNIQUE INDEX rate_limit_policies_tenant_id_policy_key_key ON public.rate_limit_policies USING btree (tenant_id, policy_key)` |

## Table: recipients

| Index Name | Definition |
|---|---|
| idx_recipients_tenant_type | `CREATE INDEX idx_recipients_tenant_type ON public.recipients USING btree (tenant_id, recipient_type)` |
| recipients_pkey | `CREATE UNIQUE INDEX recipients_pkey ON public.recipients USING btree (id)` |
| recipients_tenant_id_name_recipient_type_key | `CREATE UNIQUE INDEX recipients_tenant_id_name_recipient_type_key ON public.recipients USING btree (tenant_id, name, recipient_type)` |

## Table: remediation_tasks

| Index Name | Definition |
|---|---|
| remediation_tasks_pkey | `CREATE UNIQUE INDEX remediation_tasks_pkey ON public.remediation_tasks USING btree (id)` |

## Table: report_exports

| Index Name | Definition |
|---|---|
| idx_report_exports_idempotency | `CREATE INDEX idx_report_exports_idempotency ON public.report_exports USING btree (tenant_id, idempotency_key)` |
| idx_report_exports_snapshot | `CREATE INDEX idx_report_exports_snapshot ON public.report_exports USING btree (tenant_id, assessment_snapshot_id)` |
| idx_report_exports_template | `CREATE INDEX idx_report_exports_template ON public.report_exports USING btree (tenant_id, report_template_id)` |
| report_exports_pkey | `CREATE UNIQUE INDEX report_exports_pkey ON public.report_exports USING btree (id)` |
| report_exports_tenant_id_idempotency_key_key | `CREATE UNIQUE INDEX report_exports_tenant_id_idempotency_key_key ON public.report_exports USING btree (tenant_id, idempotency_key)` |

## Table: report_templates

| Index Name | Definition |
|---|---|
| idx_report_templates_key | `CREATE INDEX idx_report_templates_key ON public.report_templates USING btree (tenant_id, template_key, status)` |
| report_templates_pkey | `CREATE UNIQUE INDEX report_templates_pkey ON public.report_templates USING btree (id)` |
| report_templates_tenant_id_template_key_template_version_fo_key | `CREATE UNIQUE INDEX report_templates_tenant_id_template_key_template_version_fo_key ON public.report_templates USING btree (tenant_id, template_key, template_version, format)` |

## Table: requirement_instances

| Index Name | Definition |
|---|---|
| idx_requirement_instances_assessment | `CREATE INDEX idx_requirement_instances_assessment ON public.requirement_instances USING btree (tenant_id, assessment_id, status)` |
| idx_requirement_instances_requirement | `CREATE INDEX idx_requirement_instances_requirement ON public.requirement_instances USING btree (requirement_id)` |
| requirement_instances_pkey | `CREATE UNIQUE INDEX requirement_instances_pkey ON public.requirement_instances USING btree (id)` |
| requirement_instances_tenant_id_assessment_id_requirement_i_key | `CREATE UNIQUE INDEX requirement_instances_tenant_id_assessment_id_requirement_i_key ON public.requirement_instances USING btree (tenant_id, assessment_id, requirement_id)` |

## Table: retention_assignments

| Index Name | Definition |
|---|---|
| idx_retention_assignments_active_unique | `CREATE UNIQUE INDEX idx_retention_assignments_active_unique ON public.retention_assignments USING btree (target_type, target_id) WHERE (effective_to IS NULL)` |
| idx_retention_assignments_rule | `CREATE INDEX idx_retention_assignments_rule ON public.retention_assignments USING btree (retention_rule_id)` |
| retention_assignments_pkey | `CREATE UNIQUE INDEX retention_assignments_pkey ON public.retention_assignments USING btree (id)` |

## Table: retention_rules

| Index Name | Definition |
|---|---|
| idx_retention_rules_category_jurisdiction | `CREATE INDEX idx_retention_rules_category_jurisdiction ON public.retention_rules USING btree (data_category_id, jurisdiction)` |
| retention_rules_pkey | `CREATE UNIQUE INDEX retention_rules_pkey ON public.retention_rules USING btree (id)` |

## Table: retention_schedules

| Index Name | Definition |
|---|---|
| retention_schedules_pkey | `CREATE UNIQUE INDEX retention_schedules_pkey ON public.retention_schedules USING btree (id)` |

## Table: retrieval_runs

| Index Name | Definition |
|---|---|
| idx_retrieval_runs_tenant_started | `CREATE INDEX idx_retrieval_runs_tenant_started ON public.retrieval_runs USING btree (tenant_id, started_at)` |
| retrieval_runs_pkey | `CREATE UNIQUE INDEX retrieval_runs_pkey ON public.retrieval_runs USING btree (id)` |

## Table: retrieved_chunks

| Index Name | Definition |
|---|---|
| idx_retrieved_chunks_run | `CREATE INDEX idx_retrieved_chunks_run ON public.retrieved_chunks USING btree (retrieval_run_id)` |
| retrieved_chunks_pkey | `CREATE UNIQUE INDEX retrieved_chunks_pkey ON public.retrieved_chunks USING btree (id)` |
| retrieved_chunks_retrieval_run_id_knowledge_chunk_id_key | `CREATE UNIQUE INDEX retrieved_chunks_retrieval_run_id_knowledge_chunk_id_key ON public.retrieved_chunks USING btree (retrieval_run_id, knowledge_chunk_id)` |
| retrieved_chunks_retrieval_run_id_rank_key | `CREATE UNIQUE INDEX retrieved_chunks_retrieval_run_id_rank_key ON public.retrieved_chunks USING btree (retrieval_run_id, rank)` |

## Table: review_decisions

| Index Name | Definition |
|---|---|
| idx_review_decisions_item | `CREATE INDEX idx_review_decisions_item ON public.review_decisions USING btree (tenant_id, assessment_item_id, decision)` |
| review_decisions_pkey | `CREATE UNIQUE INDEX review_decisions_pkey ON public.review_decisions USING btree (id)` |

## Table: rights_request_tasks

| Index Name | Definition |
|---|---|
| idx_rights_request_tasks_request_status | `CREATE INDEX idx_rights_request_tasks_request_status ON public.rights_request_tasks USING btree (rights_request_id, status)` |
| rights_request_tasks_pkey | `CREATE UNIQUE INDEX rights_request_tasks_pkey ON public.rights_request_tasks USING btree (id)` |
| rights_request_tasks_rights_request_id_system_id_task_type_key | `CREATE UNIQUE INDEX rights_request_tasks_rights_request_id_system_id_task_type_key ON public.rights_request_tasks USING btree (rights_request_id, system_id, task_type)` |

## Table: risk_acceptance_reviews

| Index Name | Definition |
|---|---|
| idx_risk_acceptance_reviews_acceptance | `CREATE INDEX idx_risk_acceptance_reviews_acceptance ON public.risk_acceptance_reviews USING btree (tenant_id, risk_acceptance_id)` |
| risk_acceptance_reviews_pkey | `CREATE UNIQUE INDEX risk_acceptance_reviews_pkey ON public.risk_acceptance_reviews USING btree (id)` |

## Table: risk_acceptances

| Index Name | Definition |
|---|---|
| idx_risk_acceptances_expiry | `CREATE INDEX idx_risk_acceptances_expiry ON public.risk_acceptances USING btree (tenant_id, expires_at)` |
| idx_risk_acceptances_finding | `CREATE INDEX idx_risk_acceptances_finding ON public.risk_acceptances USING btree (tenant_id, finding_id)` |
| idx_risk_acceptances_task | `CREATE INDEX idx_risk_acceptances_task ON public.risk_acceptances USING btree (tenant_id, remediation_task_id)` |
| risk_acceptances_pkey | `CREATE UNIQUE INDEX risk_acceptances_pkey ON public.risk_acceptances USING btree (id)` |

## Table: risk_links

| Index Name | Definition |
|---|---|
| idx_risk_links_target | `CREATE INDEX idx_risk_links_target ON public.risk_links USING btree (target_type, target_id)` |
| risk_links_pkey | `CREATE UNIQUE INDEX risk_links_pkey ON public.risk_links USING btree (id)` |
| risk_links_risk_id_target_type_target_id_relationship_key | `CREATE UNIQUE INDEX risk_links_risk_id_target_type_target_id_relationship_key ON public.risk_links USING btree (risk_id, target_type, target_id, relationship)` |

## Table: risk_models

| Index Name | Definition |
|---|---|
| idx_risk_models_status | `CREATE INDEX idx_risk_models_status ON public.risk_models USING btree (tenant_id, status)` |
| risk_models_pkey | `CREATE UNIQUE INDEX risk_models_pkey ON public.risk_models USING btree (id)` |
| risk_models_tenant_id_model_key_model_version_key | `CREATE UNIQUE INDEX risk_models_tenant_id_model_key_model_version_key ON public.risk_models USING btree (tenant_id, model_key, model_version)` |

## Table: risk_treatments

| Index Name | Definition |
|---|---|
| idx_risk_treatments_status | `CREATE INDEX idx_risk_treatments_status ON public.risk_treatments USING btree (risk_id, status)` |
| risk_treatments_pkey | `CREATE UNIQUE INDEX risk_treatments_pkey ON public.risk_treatments USING btree (id)` |

## Table: risks

| Index Name | Definition |
|---|---|
| idx_risks_status | `CREATE INDEX idx_risks_status ON public.risks USING btree (tenant_id, status, owner_id)` |
| risks_pkey | `CREATE UNIQUE INDEX risks_pkey ON public.risks USING btree (id)` |
| risks_tenant_id_risk_key_key | `CREATE UNIQUE INDEX risks_tenant_id_risk_key_key ON public.risks USING btree (tenant_id, risk_key)` |

## Table: safety_checks

| Index Name | Definition |
|---|---|
| idx_safety_checks_run_result | `CREATE INDEX idx_safety_checks_run_result ON public.safety_checks USING btree (generation_run_id, result)` |
| safety_checks_generation_run_id_check_type_policy_version_key | `CREATE UNIQUE INDEX safety_checks_generation_run_id_check_type_policy_version_key ON public.safety_checks USING btree (generation_run_id, check_type, policy_version)` |
| safety_checks_pkey | `CREATE UNIQUE INDEX safety_checks_pkey ON public.safety_checks USING btree (id)` |

## Table: sdlc_release_gates

| Index Name | Definition |
|---|---|
| sdlc_release_gates_pkey | `CREATE UNIQUE INDEX sdlc_release_gates_pkey ON public.sdlc_release_gates USING btree (id)` |

## Table: siem_export_records

| Index Name | Definition |
|---|---|
| siem_export_records_pkey | `CREATE UNIQUE INDEX siem_export_records_pkey ON public.siem_export_records USING btree (id)` |

## Table: systems_assets

| Index Name | Definition |
|---|---|
| idx_systems_assets_tenant_type | `CREATE INDEX idx_systems_assets_tenant_type ON public.systems_assets USING btree (tenant_id, asset_type)` |
| systems_assets_pkey | `CREATE UNIQUE INDEX systems_assets_pkey ON public.systems_assets USING btree (id)` |
| systems_assets_tenant_id_workspace_id_name_key | `CREATE UNIQUE INDEX systems_assets_tenant_id_workspace_id_name_key ON public.systems_assets USING btree (tenant_id, workspace_id, name)` |

## Table: tenant_catalog_subscriptions

| Index Name | Definition |
|---|---|
| idx_tenant_catalog_subscriptions_tenant | `CREATE INDEX idx_tenant_catalog_subscriptions_tenant ON public.tenant_catalog_subscriptions USING btree (tenant_id)` |
| tenant_catalog_subscriptions_pkey | `CREATE UNIQUE INDEX tenant_catalog_subscriptions_pkey ON public.tenant_catalog_subscriptions USING btree (id)` |

## Table: test_procedures

| Index Name | Definition |
|---|---|
| idx_test_procedures_control | `CREATE INDEX idx_test_procedures_control ON public.test_procedures USING btree (tenant_id, control_id, status)` |
| test_procedures_pkey | `CREATE UNIQUE INDEX test_procedures_pkey ON public.test_procedures USING btree (id)` |
| test_procedures_tenant_id_control_id_procedure_key_version_key | `CREATE UNIQUE INDEX test_procedures_tenant_id_control_id_procedure_key_version_key ON public.test_procedures USING btree (tenant_id, control_id, procedure_key, version)` |

## Table: transfers

| Index Name | Definition |
|---|---|
| idx_transfers_activity_status | `CREATE INDEX idx_transfers_activity_status ON public.transfers USING btree (processing_activity_id, status)` |
| transfers_pkey | `CREATE UNIQUE INDEX transfers_pkey ON public.transfers USING btree (id)` |

## Table: trust_center_artifacts

| Index Name | Definition |
|---|---|
| trust_center_artifacts_pkey | `CREATE UNIQUE INDEX trust_center_artifacts_pkey ON public.trust_center_artifacts USING btree (id)` |

## Table: upload_sessions

| Index Name | Definition |
|---|---|
| upload_sessions_pkey | `CREATE UNIQUE INDEX upload_sessions_pkey ON public.upload_sessions USING btree (id)` |

## Table: vendor_assessments

| Index Name | Definition |
|---|---|
| idx_vendor_assessments_status | `CREATE INDEX idx_vendor_assessments_status ON public.vendor_assessments USING btree (tenant_id, status)` |
| vendor_assessments_pkey | `CREATE UNIQUE INDEX vendor_assessments_pkey ON public.vendor_assessments USING btree (id)` |
| vendor_assessments_vendor_id_assessment_type_period_key | `CREATE UNIQUE INDEX vendor_assessments_vendor_id_assessment_type_period_key ON public.vendor_assessments USING btree (vendor_id, assessment_type, period)` |

## Table: vendor_findings

| Index Name | Definition |
|---|---|
| idx_vendor_findings_assessment | `CREATE INDEX idx_vendor_findings_assessment ON public.vendor_findings USING btree (vendor_assessment_id)` |
| vendor_findings_pkey | `CREATE UNIQUE INDEX vendor_findings_pkey ON public.vendor_findings USING btree (id)` |

## Table: vendors

| Index Name | Definition |
|---|---|
| vendors_pkey | `CREATE UNIQUE INDEX vendors_pkey ON public.vendors USING btree (id)` |

## Table: webhook_contracts

| Index Name | Definition |
|---|---|
| webhook_contracts_pkey | `CREATE UNIQUE INDEX webhook_contracts_pkey ON public.webhook_contracts USING btree (id)` |
| webhook_contracts_tenant_id_webhook_key_contract_version_key | `CREATE UNIQUE INDEX webhook_contracts_tenant_id_webhook_key_contract_version_key ON public.webhook_contracts USING btree (tenant_id, webhook_key, contract_version)` |

## Table: webhook_deliveries

| Index Name | Definition |
|---|---|
| idx_webhook_deliveries_status | `CREATE INDEX idx_webhook_deliveries_status ON public.webhook_deliveries USING btree (tenant_id, webhook_id, delivery_status)` |
| webhook_deliveries_pkey | `CREATE UNIQUE INDEX webhook_deliveries_pkey ON public.webhook_deliveries USING btree (id)` |
| webhook_deliveries_tenant_id_webhook_id_idempotency_key_key | `CREATE UNIQUE INDEX webhook_deliveries_tenant_id_webhook_id_idempotency_key_key ON public.webhook_deliveries USING btree (tenant_id, webhook_id, idempotency_key)` |
