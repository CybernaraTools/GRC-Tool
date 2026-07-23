# Cybernara Table Columns


## Table: access_review_decisions

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| review_item_id | uuid | NO | NULL |
| reviewer_id | uuid | NO | NULL |
| decision | text | NO | NULL |
| rationale | text | YES | NULL |
| decided_at | timestamp with time zone | NO | now() |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | YES | NULL |
| created_at | timestamp with time zone | YES | NULL |

## Table: access_review_items

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| access_review_id | uuid | NO | NULL |
| principal_ref | text | NO | NULL |
| resource_ref | text | NO | NULL |
| entitlement_ref | text | NO | NULL |
| risk_level | text | NO | 'low'::text |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: access_reviews

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| population_source | text | NO | NULL |
| certifier_id | uuid | NO | NULL |
| decisions | jsonb | NO | '[]'::jsonb |
| remediation_task_ids | ARRAY | NO | '{}'::text[] |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: ai_evaluation_runs

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| target_type | text | NO | NULL |
| target_id | uuid | NO | NULL |
| score | numeric | NO | NULL |
| passed | boolean | NO | NULL |
| adversarial_passed | boolean | NO | NULL |
| tenant_isolation_passed | boolean | NO | NULL |
| drift_within_threshold | boolean | NO | NULL |
| evaluation_report | jsonb | NO | '{}'::jsonb |
| approved_by | uuid | NO | NULL |
| approved_at | timestamp with time zone | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |
| suite_id | uuid | YES | NULL |

## Table: ai_generation_runs

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| use_case | text | NO | NULL |
| status | USER-DEFINED | NO | NULL |
| actor_id | uuid | NO | NULL |
| prompt_version_id | uuid | NO | NULL |
| model_deployment_id | uuid | NO | NULL |
| retrieval_index_id | uuid | NO | NULL |
| generation_parameters | jsonb | NO | NULL |
| input_fingerprint | text | NO | NULL |
| output_fingerprint | text | NO | NULL |
| failure_reason | text | YES | NULL |
| provenance | jsonb | NO | '{}'::jsonb |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: ai_model_deployments

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| provider | text | NO | NULL |
| model_name | text | NO | NULL |
| deployment_version | text | NO | NULL |
| region | text | NO | NULL |
| risk_tier | text | NO | NULL |
| no_training | boolean | NO | NULL |
| egress_allow_list | ARRAY | NO | '{}'::text[] |
| status | text | NO | 'draft'::text |
| kill_switch | boolean | NO | false |
| evaluation_id | uuid | YES | NULL |
| approved_by | uuid | YES | NULL |
| approved_at | timestamp with time zone | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: ai_output_reviews

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| generation_run_id | uuid | NO | NULL |
| reviewer_id | uuid | NO | NULL |
| decision | text | NO | NULL |
| rationale | text | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: ai_prompt_versions

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| prompt_key | text | NO | NULL |
| prompt_version | text | NO | NULL |
| template_sha256 | text | NO | NULL |
| parameters_schema | jsonb | NO | '{}'::jsonb |
| status | text | NO | 'draft'::text |
| evaluation_id | uuid | YES | NULL |
| approved_by | uuid | YES | NULL |
| approved_at | timestamp with time zone | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: ai_publication_events

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| target_type | text | NO | NULL |
| target_id | uuid | NO | NULL |
| generation_run_id | uuid | YES | NULL |
| approved_version_id | uuid | NO | NULL |
| approver_id | uuid | NO | NULL |
| published_at | timestamp with time zone | NO | now() |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | YES | NULL |
| created_at | timestamp with time zone | YES | NULL |

## Table: ai_question_versions

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| generation_run_id | uuid | NO | NULL |
| question_version | text | NO | NULL |
| question_text | text | NO | NULL |
| response_type | text | NO | NULL |
| evidence_expectations | jsonb | NO | '[]'::jsonb |
| citations | jsonb | NO | '[]'::jsonb |
| confidence | numeric | NO | NULL |
| state | USER-DEFINED | NO | 'pending_review'::ai_review_state |
| approved_by | uuid | YES | NULL |
| approved_at | timestamp with time zone | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: ai_retrieval_indexes

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| index_key | text | NO | NULL |
| index_version | text | NO | NULL |
| source_pack_versions | jsonb | NO | '[]'::jsonb |
| acl_tenant_ids | ARRAY | NO | '{}'::uuid[] |
| status | text | NO | 'draft'::text |
| approved_by | uuid | YES | NULL |
| approved_at | timestamp with time zone | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: answer_revisions

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| assessment_item_id | uuid | NO | NULL |
| revision | integer | NO | NULL |
| response_json | jsonb | NO | NULL |
| submitted_by | uuid | NO | NULL |
| submitted_at | timestamp with time zone | NO | now() |
| supersedes_id | uuid | YES | NULL |
| created_by | uuid | YES | NULL |
| created_at | timestamp with time zone | YES | NULL |

## Table: applicability_decisions

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| control_instance_id | uuid | NO | NULL |
| decision | text | NO | NULL |
| rationale | text | NO | NULL |
| decided_by | uuid | NO | NULL |
| approved_by | uuid | YES | NULL |
| decided_at | timestamp with time zone | NO | now() |
| created_by | uuid | YES | NULL |
| created_at | timestamp with time zone | YES | NULL |

## Table: assessment_frameworks

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| assessment_id | uuid | NO | NULL |
| framework_key | text | NO | NULL |
| framework_version | text | NO | NULL |
| mapping_version | text | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: assessment_items

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| assessment_id | uuid | NO | NULL |
| framework_key | text | NO | NULL |
| framework_version | text | NO | NULL |
| mapping_version | text | NO | NULL |
| control_id | text | NO | NULL |
| harmonized_control_id | text | NO | NULL |
| question_version | text | NO | NULL |
| status | USER-DEFINED | NO | 'not_started'::assessment_status |
| owner_id | uuid | NO | NULL |
| answer_text | text | YES | NULL |
| applicability | jsonb | YES | NULL |
| evidence_ids | ARRAY | NO | '{}'::uuid[] |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |
| control_instance_id | uuid | NO | NULL |
| sequence_no | integer | YES | NULL |
| required | boolean | NO | true |
| question_version_id | uuid | NO | NULL |

## Table: assessment_scopes

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| workspace_id | uuid | YES | NULL |
| name | text | NO | NULL |
| period_start | date | NO | NULL |
| period_end | date | NO | NULL |
| scope_json | jsonb | NO | '{}'::jsonb |
| approved_by | uuid | NO | NULL |
| approved_at | timestamp with time zone | NO | now() |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: assessment_signoffs

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| assessment_id | uuid | NO | NULL |
| scope_type | text | NO | NULL |
| scope_id | uuid | NO | NULL |
| signer_id | uuid | NO | NULL |
| decision | text | NO | NULL |
| signed_at | timestamp with time zone | NO | now() |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: assessment_snapshots

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| assessment_id | uuid | NO | NULL |
| snapshot_type | text | NO | NULL |
| sequence | integer | NO | NULL |
| content_hash | text | NO | NULL |
| snapshot_payload | jsonb | NO | '{}'::jsonb |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |

## Table: assessments

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| scope_name | text | NO | NULL |
| status | USER-DEFINED | NO | 'not_started'::assessment_status |
| control_snapshot_version | text | NO | NULL |
| period_start | date | NO | NULL |
| period_end | date | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |
| scope_id | uuid | YES | NULL |

## Table: assurance_alerts

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| source_type | text | NO | NULL |
| source_id | uuid | NO | NULL |
| severity | text | NO | NULL |
| owner_id | uuid | NO | NULL |
| sla_due_at | timestamp with time zone | NO | NULL |
| status | text | NO | 'triaged'::text |
| reason | text | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: audit_checkpoints

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| chain_partition | uuid | NO | NULL |
| start_sequence | bigint | NO | NULL |
| end_sequence | bigint | NO | NULL |
| root_hash | text | NO | NULL |
| signature | text | NO | NULL |
| signed_at | timestamp with time zone | NO | now() |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |

## Table: audit_engagements

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| name | text | NO | NULL |
| status | text | NO | NULL |
| request_list_ids | ARRAY | NO | '{}'::text[] |
| evidence_ids | ARRAY | NO | '{}'::uuid[] |
| finding_ids | ARRAY | NO | '{}'::text[] |
| management_responses | jsonb | NO | '[]'::jsonb |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: audit_events

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| sequence | bigint | NO | NULL |
| version | integer | NO | 1 |
| event_type | text | NO | NULL |
| actor_id | uuid | NO | NULL |
| target_type | text | NO | NULL |
| target_id | text | NO | NULL |
| trace_id | text | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| body | jsonb | NO | NULL |
| previous_hash | text | NO | NULL |
| event_hash | text | NO | NULL |
| occurred_at | timestamp with time zone | NO | now() |
| created_by | uuid | YES | NULL |
| created_at | timestamp with time zone | YES | NULL |
| chain_partition | uuid | YES | NULL |

## Table: audit_requests

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| audit_engagement_id | uuid | NO | NULL |
| control_id | text | YES | NULL |
| requested_from | text | NO | NULL |
| due_at | timestamp with time zone | NO | NULL |
| status | text | NO | 'requested'::text |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: audit_tests

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| audit_engagement_id | uuid | NO | NULL |
| control_instance_id | uuid | YES | NULL |
| procedure | text | NO | NULL |
| sample_ref | text | YES | NULL |
| conclusion | text | NO | 'not_tested'::text |
| reviewer_id | uuid | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: audit_verifications

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| checkpoint_id | uuid | NO | NULL |
| verified_at | timestamp with time zone | NO | now() |
| result | text | NO | NULL |
| mismatch_sequence | bigint | YES | NULL |
| verifier_version | text | NO | NULL |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |

## Table: authorization_decision_logs

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| actor_id | uuid | NO | NULL |
| resource_type | text | NO | NULL |
| resource_id | text | NO | NULL |
| action | text | NO | NULL |
| decision | text | NO | NULL |
| reason | text | NO | NULL |
| trace_id | text | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: automated_control_tests

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| connector_id | uuid | NO | NULL |
| control_ref | text | NO | NULL |
| query | text | NO | NULL |
| population | jsonb | NO | NULL |
| sample | jsonb | NO | NULL |
| result | jsonb | NO | NULL |
| source_timestamp | timestamp with time zone | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: automated_test_runs

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| automated_test_id | uuid | NO | NULL |
| connector_id | uuid | NO | NULL |
| started_at | timestamp with time zone | NO | now() |
| finished_at | timestamp with time zone | YES | NULL |
| status | text | NO | 'running'::text |
| result_json | jsonb | NO | '{}'::jsonb |
| source_watermark | text | YES | NULL |
| idempotency_key | text | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: automated_tests

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| control_id | uuid | NO | NULL |
| connector_type | text | NO | NULL |
| query_template | text | NO | NULL |
| schedule | text | NO | NULL |
| severity | text | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: backup_restore_tests

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| rpo_minutes | integer | NO | NULL |
| rto_hours | numeric | NO | NULL |
| backup_credential_ref | text | NO | NULL |
| restored_at | timestamp with time zone | NO | NULL |
| passed | boolean | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: connector_objects

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| connector_id | uuid | NO | NULL |
| object_type | text | NO | NULL |
| external_id | text | NO | NULL |
| source_hash | text | NO | NULL |
| provenance | jsonb | NO | NULL |
| delivery_status | text | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: connector_sync_runs

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| connector_id | uuid | NO | NULL |
| status | text | NO | NULL |
| cursor_before | text | YES | NULL |
| cursor_after | text | YES | NULL |
| started_at | timestamp with time zone | NO | NULL |
| finished_at | timestamp with time zone | YES | NULL |
| object_counts | jsonb | NO | '{}'::jsonb |
| error | text | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: connectors

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| connector_key | text | NO | NULL |
| provider | text | NO | NULL |
| kind | text | NO | NULL |
| scopes | jsonb | NO | '[]'::jsonb |
| secret_ref | text | NO | NULL |
| status | text | NO | 'active'::text |
| health | text | NO | 'healthy'::text |
| sync_cursor | text | YES | NULL |
| last_seen_at | timestamp with time zone | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: consent_events

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| subject_token | text | NO | NULL |
| consent_purpose_id | uuid | NO | NULL |
| event_type | text | NO | NULL |
| occurred_at | timestamp with time zone | NO | now() |
| source | text | NO | NULL |
| proof_hash | text | NO | NULL |
| idempotency_key | text | NO | NULL |
| recorded_by | uuid | NO | NULL |
| recorded_at | timestamp with time zone | NO | now() |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | YES | NULL |
| created_at | timestamp with time zone | YES | NULL |

## Table: consent_purposes

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| purpose_id | uuid | NO | NULL |
| notice_version_id | uuid | NO | NULL |
| channel | text | NO | NULL |
| region | text | NO | NULL |
| active_from | timestamp with time zone | NO | now() |
| active_to | timestamp with time zone | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: consent_records

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| subject_id | text | NO | NULL |
| purpose | text | NO | NULL |
| notice_version | text | NO | NULL |
| region | text | NO | NULL |
| status | text | NO | NULL |
| history | jsonb | NO | '[]'::jsonb |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: content_rejected_records

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| source_workbook | text | NO | NULL |
| source_sheet | text | NO | NULL |
| source_row_number | integer | NO | NULL |
| reason | text | NO | NULL |
| remediation_status | text | NO | 'open'::text |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: content_source_packages

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| source_file_name | text | NO | NULL |
| source_sha256 | text | NO | NULL |
| storage_uri | text | YES | NULL |
| status | USER-DEFINED | NO | 'quarantined'::content_pack_status |
| diagnostic_summary | jsonb | NO | '{}'::jsonb |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: control_instances

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| assessment_id | uuid | NO | NULL |
| control_id | text | NO | NULL |
| framework_key | text | NO | NULL |
| framework_version | text | NO | NULL |
| mapping_version | text | NO | NULL |
| owner_id | uuid | NO | NULL |
| applicability_status | text | NO | 'pending'::text |
| status | USER-DEFINED | NO | 'not_started'::assessment_status |
| score | numeric | YES | NULL |
| maturity | text | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: control_mappings

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| framework_key | text | NO | NULL |
| source_control_id | text | NO | NULL |
| harmonized_control_id | text | NO | NULL |
| mapping_classification | USER-DEFINED | NO | NULL |
| coverage | text | YES | NULL |
| confidence | text | YES | NULL |
| rationale | text | YES | NULL |
| reviewer | text | YES | NULL |
| source_workbook | text | NO | NULL |
| source_sheet | text | NO | NULL |
| source_row_number | integer | NO | NULL |
| status | USER-DEFINED | NO | 'staged'::content_pack_status |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |
| owner_scope | USER-DEFINED | NO | 'tenant'::catalog_owner_scope |
| mapping_version_id | uuid | YES | NULL |

## Table: control_sets

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| framework_version_id | uuid | NO | NULL |
| set_key | text | NO | NULL |
| name | text | NO | NULL |
| owner_scope | USER-DEFINED | NO | 'tenant'::catalog_owner_scope |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: control_subcontrols

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| control_id | uuid | NO | NULL |
| subcontrol_key | text | NO | NULL |
| title | text | NO | NULL |
| requirement_text | text | YES | NULL |
| citation | text | YES | NULL |
| source_workbook | text | YES | NULL |
| source_sheet | text | YES | NULL |
| source_row_number | integer | YES | NULL |
| owner_scope | USER-DEFINED | NO | 'tenant'::catalog_owner_scope |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: control_test_results

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| control_instance_id | uuid | NO | NULL |
| test_procedure_id | uuid | NO | NULL |
| run_id | uuid | NO | gen_random_uuid() |
| population | text | YES | NULL |
| sample_json | jsonb | NO | '{}'::jsonb |
| result | text | NO | NULL |
| tested_by | uuid | NO | NULL |
| tested_at | timestamp with time zone | NO | now() |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: controls

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| control_set_id | uuid | NO | NULL |
| control_key | text | NO | NULL |
| title | text | NO | NULL |
| category | text | YES | NULL |
| requirement_text | text | YES | NULL |
| citation | text | YES | NULL |
| source_workbook | text | YES | NULL |
| source_sheet | text | YES | NULL |
| source_row_number | integer | YES | NULL |
| owner_scope | USER-DEFINED | NO | 'tenant'::catalog_owner_scope |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: custom_field_definitions

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| object_definition_id | uuid | NO | NULL |
| field_key | text | NO | NULL |
| data_type | text | NO | NULL |
| required | boolean | NO | false |
| validation_json | jsonb | NO | '{}'::jsonb |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: custom_object_definitions

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| object_key | text | NO | NULL |
| fields | jsonb | NO | '[]'::jsonb |
| workflow_states | ARRAY | NO | '{}'::text[] |
| permission_role_ids | ARRAY | NO | '{}'::uuid[] |
| upgrade_safe | boolean | NO | true |
| connector_sdk_enabled | boolean | NO | false |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |
| status | text | NO | 'active'::text |
| validation_schema | jsonb | YES | NULL |

## Table: custom_records

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| object_definition_id | uuid | NO | NULL |
| record_key | text | NO | NULL |
| status | text | NO | 'active'::text |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: custom_values

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| record_id | uuid | NO | NULL |
| field_definition_id | uuid | NO | NULL |
| value_json | jsonb | YES | NULL |
| search_text | text | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: data_categories

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| category_key | text | NO | NULL |
| name | text | NO | NULL |
| sensitivity | text | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: data_discovery_findings

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| scan_id | uuid | NO | NULL |
| locator_hash | text | NO | NULL |
| data_category_id | uuid | NO | NULL |
| confidence | numeric | NO | NULL |
| sample_prohibited | boolean | NO | false |
| review_status | text | NO | 'pending'::text |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: data_discovery_scans

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| system_id | uuid | NO | NULL |
| connector_id | uuid | NO | NULL |
| started_at | timestamp with time zone | NO | now() |
| finished_at | timestamp with time zone | YES | NULL |
| status | text | NO | 'running'::text |
| classifier_version | text | NO | NULL |
| idempotency_key | text | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: data_inventory_records

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| system_name | text | NO | NULL |
| data_elements | jsonb | NO | '[]'::jsonb |
| owner_id | uuid | NO | NULL |
| locations | ARRAY | NO | '{}'::text[] |
| lineage | jsonb | NO | '[]'::jsonb |
| processing_activity_ids | ARRAY | NO | '{}'::uuid[] |
| control_ids | ARRAY | NO | '{}'::text[] |
| vendor_ids | ARRAY | NO | '{}'::uuid[] |
| evidence_ids | ARRAY | NO | '{}'::uuid[] |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |
| system_id | uuid | YES | NULL |
| data_category_id | uuid | YES | NULL |
| location | text | YES | NULL |
| format | text | YES | NULL |
| source | text | YES | NULL |
| steward_id | uuid | YES | NULL |

## Table: data_subject_categories

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| subject_key | text | NO | NULL |
| name | text | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: deletion_items

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| deletion_job_id | uuid | NO | NULL |
| target_type | text | NO | NULL |
| target_id | uuid | NO | NULL |
| disposition | text | NO | NULL |
| key_destroyed | boolean | NO | false |
| proof_hash | text | YES | NULL |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: deletion_jobs

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| deletion_trigger | text | NO | NULL |
| requested_by | uuid | NO | NULL |
| status | text | NO | 'requested'::text |
| started_at | timestamp with time zone | YES | NULL |
| finished_at | timestamp with time zone | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: dpia_assessments

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| processing_activity_id | uuid | NO | NULL |
| risk_level | text | NO | NULL |
| residual_risk_score | integer | NO | NULL |
| approvals | jsonb | NO | '[]'::jsonb |
| findings | ARRAY | NO | '{}'::text[] |
| review_obligation_ids | ARRAY | NO | '{}'::text[] |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: dpia_risks

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| dpia_id | uuid | NO | NULL |
| description | text | NO | NULL |
| likelihood | text | NO | NULL |
| impact | text | NO | NULL |
| treatment | text | YES | NULL |
| residual_score | integer | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: dpias

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| processing_activity_id | uuid | NO | NULL |
| trigger_reason | text | NO | NULL |
| status | text | NO | 'draft'::text |
| owner_id | uuid | NO | NULL |
| approved_by | uuid | YES | NULL |
| approved_at | timestamp with time zone | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: encryption_key_records

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| kms_key_ref | text | NO | NULL |
| algorithm | text | NO | NULL |
| rotation_due_at | timestamp with time zone | NO | NULL |
| revoked_at | timestamp with time zone | YES | NULL |
| audit_event_ids | ARRAY | NO | '{}'::uuid[] |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: evaluation_cases

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| suite_id | uuid | NO | NULL |
| case_key | text | NO | NULL |
| input_fixture_uri | text | NO | NULL |
| expected_json | jsonb | NO | '{}'::jsonb |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: evaluation_results

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| evaluation_run_id | uuid | NO | NULL |
| case_id | uuid | NO | NULL |
| metric | text | NO | NULL |
| score | numeric | NO | NULL |
| threshold | numeric | NO | NULL |
| passed | boolean | NO | NULL |
| artifact_uri | text | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: evaluation_suites

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| use_case | text | NO | NULL |
| suite_key | text | NO | NULL |
| suite_version | text | NO | NULL |
| status | text | NO | 'draft'::text |
| threshold_policy | jsonb | NO | '{}'::jsonb |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: evidence_custody_events

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| evidence_version_id | uuid | NO | NULL |
| event_type | text | NO | NULL |
| actor_id | uuid | NO | NULL |
| location_ref | text | NO | NULL |
| event_hash | text | NO | NULL |
| occurred_at | timestamp with time zone | NO | now() |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | YES | NULL |
| created_at | timestamp with time zone | YES | NULL |

## Table: evidence_expiry_events

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| evidence_id | uuid | NO | NULL |
| previous_state | text | NO | NULL |
| new_state | text | NO | NULL |
| reason | text | NO | NULL |
| actor_id | uuid | NO | NULL |
| occurred_at | timestamp with time zone | NO | now() |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | YES | NULL |
| created_at | timestamp with time zone | YES | NULL |

## Table: evidence_links

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| evidence_version_id | uuid | NO | NULL |
| target_type | text | NO | NULL |
| target_id | uuid | NO | NULL |
| purpose | text | NO | NULL |
| scope_match | boolean | NO | false |
| period_match | boolean | NO | false |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: evidence_objects

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| owner_id | uuid | NO | NULL |
| file_name | text | NO | NULL |
| storage_uri | text | YES | NULL |
| state | USER-DEFINED | NO | 'pending'::evidence_state |
| sha256 | text | YES | NULL |
| period_start | date | NO | NULL |
| period_end | date | NO | NULL |
| scope_tags | ARRAY | NO | '{}'::text[] |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |
| title | text | YES | NULL |
| source_type | text | YES | NULL |
| retention_until | timestamp with time zone | YES | NULL |

## Table: evidence_requests

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| assessment_id | uuid | NO | NULL |
| control_instance_id | uuid | NO | NULL |
| requested_from | text | NO | NULL |
| due_at | timestamp with time zone | NO | NULL |
| status | text | NO | 'requested'::text |
| instructions | text | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: evidence_reviews

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| evidence_version_id | uuid | NO | NULL |
| reviewer_id | uuid | NO | NULL |
| decision | text | NO | NULL |
| rationale | text | NO | NULL |
| reviewed_at | timestamp with time zone | NO | now() |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: evidence_samples

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| test_result_id | uuid | NO | NULL |
| population_ref | text | NO | NULL |
| method | text | NO | NULL |
| sample_size | integer | NO | NULL |
| sample_json | jsonb | NO | '[]'::jsonb |
| seed | text | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: evidence_versions

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| evidence_id | uuid | NO | NULL |
| evidence_version_no | integer | NO | NULL |
| object_uri | text | NO | NULL |
| sha256 | text | NO | NULL |
| size_bytes | bigint | NO | NULL |
| mime_type | text | NO | NULL |
| observed_at | timestamp with time zone | NO | NULL |
| period_start | date | NO | NULL |
| period_end | date | NO | NULL |
| uploaded_by | uuid | NO | NULL |
| uploaded_at | timestamp with time zone | NO | now() |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | YES | NULL |
| created_at | timestamp with time zone | YES | NULL |

## Table: export_manifests

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| snapshot_id | text | NO | NULL |
| template_version | text | NO | NULL |
| artifact_hashes | ARRAY | NO | NULL |
| manifest_hash | text | NO | NULL |
| signing_key_ref | text | NO | NULL |
| signature | text | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |
| report_export_id | uuid | YES | NULL |
| signing_key_id | uuid | YES | NULL |
| manifest_payload | jsonb | NO | '{}'::jsonb |
| signed_at | timestamp with time zone | NO | now() |

## Table: findings

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| assessment_item_id | uuid | YES | NULL |
| severity | text | NO | NULL |
| description | text | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |
| test_result_id | uuid | YES | NULL |

## Table: framework_content_packs

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| framework_key | text | NO | NULL |
| pack_version | text | NO | NULL |
| source_package_id | uuid | NO | NULL |
| source_sha256 | text | NO | NULL |
| signature | text | NO | NULL |
| status | USER-DEFINED | NO | 'staged'::content_pack_status |
| published_at | timestamp with time zone | YES | NULL |
| supersedes_pack_id | uuid | YES | NULL |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |
| owner_scope | USER-DEFINED | NO | 'tenant'::catalog_owner_scope |
| framework_version_id | uuid | YES | NULL |

## Table: framework_requirements

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| framework_pack_id | uuid | NO | NULL |
| framework_key | text | NO | NULL |
| control_id | text | NO | NULL |
| control_title | text | NO | NULL |
| sub_control_id | text | YES | NULL |
| sub_control_title | text | YES | NULL |
| requirement_text | text | NO | NULL |
| citation | text | YES | NULL |
| category | text | YES | NULL |
| source_workbook | text | NO | NULL |
| source_sheet | text | NO | NULL |
| source_row_number | integer | NO | NULL |
| source_sha256 | text | NO | NULL |
| raw_record | jsonb | NO | NULL |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |
| control_id_ref | uuid | YES | NULL |
| control_subcontrol_id | uuid | YES | NULL |

## Table: framework_versions

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| framework_id | uuid | NO | NULL |
| version_key | text | NO | NULL |
| status | USER-DEFINED | NO | 'staged'::content_pack_status |
| published_at | timestamp with time zone | YES | NULL |
| owner_scope | USER-DEFINED | NO | 'tenant'::catalog_owner_scope |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: frameworks

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| framework_key | text | NO | NULL |
| name | text | NO | NULL |
| description | text | YES | NULL |
| owner_scope | USER-DEFINED | NO | 'tenant'::catalog_owner_scope |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: generation_citations

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| generation_run_id | uuid | NO | NULL |
| output_path | text | NO | NULL |
| knowledge_chunk_id | uuid | NO | NULL |
| locator | text | YES | NULL |
| entailment_score | numeric | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: grc_workspaces

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| business_unit | text | NO | NULL |
| parent_workspace_id | uuid | YES | NULL |
| inherited_control_ids | ARRAY | NO | '{}'::text[] |
| delegated_admin_ids | ARRAY | NO | '{}'::uuid[] |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: harmonized_controls

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| harmonized_id | text | NO | NULL |
| domain | text | NO | NULL |
| control_name | text | NO | NULL |
| control_description | text | NO | NULL |
| source_workbook | text | NO | NULL |
| source_sheet | text | NO | NULL |
| source_row_number | integer | NO | NULL |
| status | USER-DEFINED | NO | 'staged'::content_pack_status |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |
| owner_scope | USER-DEFINED | NO | 'tenant'::catalog_owner_scope |

## Table: identity_role_grants

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| user_id | uuid | NO | NULL |
| role_id | uuid | NO | NULL |
| resource_type | text | NO | NULL |
| resource_id | uuid | YES | NULL |
| expires_at | timestamp with time zone | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: identity_roles

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| role_key | text | NO | NULL |
| display_name | text | NO | NULL |
| description | text | YES | NULL |
| classification | USER-DEFINED | NO | 'internal'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: identity_service_accounts

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| name | text | NO | NULL |
| scopes | ARRAY | NO | '{}'::text[] |
| disabled_at | timestamp with time zone | YES | NULL |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: identity_sessions

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| user_id | uuid | NO | NULL |
| supabase_session_id | text | NO | NULL |
| issued_at | timestamp with time zone | NO | NULL |
| expires_at | timestamp with time zone | NO | NULL |
| revoked_at | timestamp with time zone | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: identity_tenants

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| name | text | NO | NULL |
| status | text | NO | 'active'::text |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: identity_users

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| supabase_user_id | uuid | NO | NULL |
| email | text | NO | NULL |
| display_name | text | YES | NULL |
| status | text | NO | 'active'::text |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: identity_workspace_delegations

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| workspace_id | uuid | NO | NULL |
| principal_user_id | uuid | NO | NULL |
| delegated_by | uuid | NO | NULL |
| reason | text | NO | NULL |
| expires_at | timestamp with time zone | NO | NULL |
| revoked_at | timestamp with time zone | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: incident_assessments

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| incident_id | uuid | NO | NULL |
| jurisdiction | text | NO | NULL |
| reportable | boolean | NO | NULL |
| rationale | text | NO | NULL |
| assessor_id | uuid | NO | NULL |
| decided_at | timestamp with time zone | NO | now() |
| assessment_version_no | integer | NO | 1 |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: incident_notifications

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| incident_id | uuid | NO | NULL |
| recipient_type | text | NO | NULL |
| jurisdiction | text | NO | NULL |
| due_at | timestamp with time zone | NO | NULL |
| sent_at | timestamp with time zone | YES | NULL |
| artifact_id | uuid | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: knowledge_chunks

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| retrieval_index_id | uuid | NO | NULL |
| source_type | text | NO | NULL |
| source_id | text | NO | NULL |
| source_version | text | NO | NULL |
| content_hash | text | NO | NULL |
| acl_json | jsonb | NO | '{}'::jsonb |
| text_uri | text | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: lawful_bases

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| jurisdiction | text | NO | NULL |
| basis_key | text | NO | NULL |
| name | text | NO | NULL |
| citation | text | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: legal_hold_items

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| legal_hold_id | uuid | NO | NULL |
| target_type | text | NO | NULL |
| target_id | uuid | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: legal_holds

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| hold_key | text | NO | NULL |
| reason | text | NO | NULL |
| issued_by | uuid | NO | NULL |
| issued_at | timestamp with time zone | NO | now() |
| released_at | timestamp with time zone | YES | NULL |
| scope_json | jsonb | NO | '{}'::jsonb |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: malware_scan_results

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| evidence_version_id | uuid | NO | NULL |
| engine | text | NO | NULL |
| signature_version | text | NO | NULL |
| status | text | NO | NULL |
| details_hash | text | YES | NULL |
| scanned_at | timestamp with time zone | NO | now() |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: mapping_conflicts

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| control_mapping_id | uuid | NO | NULL |
| conflicting_mapping_id | uuid | YES | NULL |
| description | text | NO | NULL |
| resolution_status | USER-DEFINED | NO | 'open'::mapping_conflict_resolution_status |
| resolved_by | uuid | YES | NULL |
| resolved_at | timestamp with time zone | YES | NULL |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: mapping_reviews

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| control_mapping_id | uuid | NO | NULL |
| reviewer_id | uuid | NO | NULL |
| decision | USER-DEFINED | NO | NULL |
| rationale | text | NO | NULL |
| reviewed_at | timestamp with time zone | NO | now() |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: mapping_versions

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| version_key | text | NO | NULL |
| status | USER-DEFINED | NO | 'staged'::content_pack_status |
| published_at | timestamp with time zone | YES | NULL |
| owner_scope | USER-DEFINED | NO | 'tenant'::catalog_owner_scope |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: outbox_events

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| event_type | text | NO | NULL |
| aggregate_type | text | NO | NULL |
| aggregate_id | text | NO | NULL |
| schema_version | integer | NO | 1 |
| payload | jsonb | NO | NULL |
| idempotency_key | text | NO | NULL |
| status | USER-DEFINED | NO | 'pending'::outbox_status |
| attempts | integer | NO | 0 |
| last_error | text | YES | NULL |
| available_at | timestamp with time zone | NO | now() |
| processed_at | timestamp with time zone | YES | NULL |
| classification | USER-DEFINED | NO | 'internal'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: policies

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| policy_key | text | NO | NULL |
| title | text | NO | NULL |
| owner_id | uuid | NO | NULL |
| category | text | NO | NULL |
| status | text | NO | 'draft'::text |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: policy_attestations

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| policy_version_id | uuid | NO | NULL |
| user_id | uuid | NO | NULL |
| decision | text | NO | NULL |
| attested_at | timestamp with time zone | NO | now() |
| evidence_hash | text | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | YES | NULL |
| created_at | timestamp with time zone | YES | NULL |

## Table: policy_control_links

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| policy_version_id | uuid | NO | NULL |
| control_id | text | NO | NULL |
| coverage | text | NO | 'full'::text |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: policy_versions

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| template_key | text | NO | NULL |
| title | text | NO | NULL |
| policy_version | text | NO | NULL |
| status | text | NO | NULL |
| approver_id | uuid | YES | NULL |
| published_at | timestamp with time zone | YES | NULL |
| attestation_evidence_ids | ARRAY | NO | '{}'::uuid[] |
| exceptions | jsonb | NO | '[]'::jsonb |
| content_hash | text | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |
| policy_id | uuid | YES | NULL |

## Table: privacy_incidents

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| severity | text | NO | NULL |
| impacted_processing_activity_ids | ARRAY | NO | '{}'::uuid[] |
| evidence_ids | ARRAY | NO | '{}'::uuid[] |
| report_ids | ARRAY | NO | '{}'::uuid[] |
| discovered_at | timestamp with time zone | NO | NULL |
| regulator_notification_due_at | timestamp with time zone | NO | NULL |
| data_subject_notification_due_at | timestamp with time zone | NO | NULL |
| timeline | jsonb | NO | '[]'::jsonb |
| actions | jsonb | NO | '[]'::jsonb |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: privacy_notice_versions

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| privacy_notice_id | uuid | NO | NULL |
| notice_version_no | integer | NO | NULL |
| content_uri | text | NO | NULL |
| sha256 | text | NO | NULL |
| jurisdictions | ARRAY | NO | '{}'::text[] |
| effective_from | timestamp with time zone | NO | NULL |
| effective_to | timestamp with time zone | YES | NULL |
| approved_by | uuid | NO | NULL |
| published_at | timestamp with time zone | NO | now() |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | YES | NULL |
| created_at | timestamp with time zone | YES | NULL |

## Table: privacy_notices

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| notice_key | text | NO | NULL |
| audience | text | NO | NULL |
| owner_id | uuid | NO | NULL |
| status | text | NO | 'draft'::text |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: privacy_rights_requests

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| subject_id | text | NO | NULL |
| request_type | text | NO | NULL |
| status | text | NO | NULL |
| identity_verified | boolean | NO | false |
| opened_at | timestamp with time zone | NO | NULL |
| deadline_at | timestamp with time zone | NO | NULL |
| search_tasks | jsonb | NO | '[]'::jsonb |
| exceptions | jsonb | NO | '[]'::jsonb |
| communications | jsonb | NO | '[]'::jsonb |
| completion_evidence_ids | ARRAY | NO | '{}'::uuid[] |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: processing_activities

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| purpose | text | NO | NULL |
| lawful_basis | text | NO | NULL |
| data_subject_categories | ARRAY | NO | '{}'::text[] |
| recipients | ARRAY | NO | '{}'::text[] |
| transfers | ARRAY | NO | '{}'::text[] |
| retention_months | integer | NO | NULL |
| jurisdiction | text | NO | NULL |
| inventory_record_ids | ARRAY | NO | '{}'::uuid[] |
| report_version | text | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |
| workspace_id | uuid | YES | NULL |
| name | text | YES | NULL |
| controller_processor_role | text | YES | NULL |
| status | text | YES | NULL |

## Table: processing_inventory_links

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| processing_activity_id | uuid | NO | NULL |
| inventory_record_id | uuid | NO | NULL |
| role | text | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: processing_purposes

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| processing_activity_id | uuid | NO | NULL |
| purpose_id | uuid | NO | NULL |
| lawful_basis_id | uuid | NO | NULL |
| effective_from | timestamp with time zone | NO | now() |
| effective_to | timestamp with time zone | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: processing_recipients

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| processing_activity_id | uuid | NO | NULL |
| recipient_id | uuid | NO | NULL |
| purpose_id | uuid | NO | NULL |
| data_categories | ARRAY | NO | '{}'::uuid[] |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: product_assurance_evidence

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| framework | text | NO | NULL |
| control_ref | text | NO | NULL |
| evidence_id | uuid | NO | NULL |
| exception_reason | text | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: purposes

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| purpose_key | text | NO | NULL |
| name | text | NO | NULL |
| description | text | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: question_sets

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| control_id | text | NO | NULL |
| question_set_key | text | NO | NULL |
| status | text | NO | 'active'::text |
| source_type | text | NO | 'curated'::text |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: question_versions

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| question_set_id | uuid | NO | NULL |
| question_version | integer | NO | NULL |
| payload_json | jsonb | NO | NULL |
| source_ai_question_version_id | uuid | YES | NULL |
| approved_by | uuid | YES | NULL |
| approved_at | timestamp with time zone | YES | NULL |
| checksum | text | NO | NULL |
| status | text | NO | 'draft'::text |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: rate_limit_policies

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| policy_key | text | NO | NULL |
| limit_count | integer | NO | NULL |
| window_seconds | integer | NO | NULL |
| timeout_ms | integer | NO | NULL |
| classification | USER-DEFINED | NO | 'internal'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: recipients

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| name | text | NO | NULL |
| recipient_type | text | NO | NULL |
| country | text | NO | NULL |
| vendor_id | uuid | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: remediation_tasks

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| finding_id | uuid | NO | NULL |
| owner_id | uuid | NO | NULL |
| due_at | timestamp with time zone | NO | NULL |
| status | text | NO | 'open'::text |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |
| treatment_id | uuid | YES | NULL |
| priority | text | YES | NULL |
| verified_at | timestamp with time zone | YES | NULL |

## Table: report_exports

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| assessment_id | uuid | NO | NULL |
| snapshot_id | text | NO | NULL |
| template_version | text | NO | NULL |
| format | text | NO | NULL |
| idempotency_key | text | NO | NULL |
| sha256 | text | NO | NULL |
| storage_uri | text | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |
| assessment_snapshot_id | uuid | YES | NULL |
| report_template_id | uuid | YES | NULL |
| artifact_bytes | bytea | YES | NULL |
| signature | text | YES | NULL |
| completed_at | timestamp with time zone | YES | NULL |

## Table: report_templates

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| template_key | text | NO | NULL |
| template_version | text | NO | NULL |
| format | text | NO | NULL |
| renderer_version | text | NO | NULL |
| checksum | text | NO | NULL |
| status | text | NO | 'active'::text |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: requirement_instances

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| assessment_id | uuid | NO | NULL |
| requirement_id | uuid | NO | NULL |
| applicability_status | text | NO | 'pending'::text |
| coverage_status | text | NO | 'uncovered'::text |
| owner_id | uuid | NO | NULL |
| status | USER-DEFINED | NO | 'not_started'::assessment_status |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: retention_assignments

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| retention_rule_id | uuid | NO | NULL |
| target_type | text | NO | NULL |
| target_id | uuid | NO | NULL |
| effective_from | timestamp with time zone | NO | now() |
| effective_to | timestamp with time zone | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: retention_rules

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| data_category_id | uuid | NO | NULL |
| jurisdiction | text | NO | NULL |
| retention_trigger | text | NO | NULL |
| duration_days | integer | NO | NULL |
| disposition | text | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: retention_schedules

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| data_category | text | NO | NULL |
| jurisdiction | text | NO | NULL |
| residency | text | NO | NULL |
| transfer_mechanism | text | NO | NULL |
| retention_months | integer | NO | NULL |
| legal_hold | boolean | NO | false |
| disposal_evidence_ids | ARRAY | NO | '{}'::uuid[] |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: retrieval_runs

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| query_hash | text | NO | NULL |
| filters_json | jsonb | NO | '{}'::jsonb |
| retrieval_index_id | uuid | NO | NULL |
| top_k | integer | NO | NULL |
| started_at | timestamp with time zone | NO | now() |
| finished_at | timestamp with time zone | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: retrieved_chunks

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| retrieval_run_id | uuid | NO | NULL |
| knowledge_chunk_id | uuid | NO | NULL |
| rank | integer | NO | NULL |
| score | numeric | NO | NULL |
| acl_decision | text | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: review_decisions

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| assessment_item_id | uuid | NO | NULL |
| answer_revision_id | uuid | NO | NULL |
| reviewer_id | uuid | NO | NULL |
| decision | text | NO | NULL |
| rationale | text | YES | NULL |
| decided_at | timestamp with time zone | NO | now() |
| created_by | uuid | YES | NULL |
| created_at | timestamp with time zone | YES | NULL |

## Table: rights_request_tasks

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| rights_request_id | uuid | NO | NULL |
| system_id | uuid | NO | NULL |
| owner_id | uuid | NO | NULL |
| task_type | text | NO | NULL |
| status | text | NO | 'pending'::text |
| result_ref | text | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: risk_acceptance_reviews

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| risk_acceptance_id | uuid | NO | NULL |
| reviewer_id | uuid | NO | NULL |
| decision | text | NO | NULL |
| reason | text | NO | NULL |
| reviewed_at | timestamp with time zone | NO | now() |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | YES | NULL |
| created_at | timestamp with time zone | YES | NULL |

## Table: risk_acceptances

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| remediation_task_id | uuid | NO | NULL |
| finding_id | uuid | NO | NULL |
| rationale | text | NO | NULL |
| approver_id | uuid | NO | NULL |
| approved_at | timestamp with time zone | NO | now() |
| expires_at | timestamp with time zone | NO | NULL |
| next_review_due_at | timestamp with time zone | NO | NULL |
| compensating_controls | text | YES | NULL |
| superseded_at | timestamp with time zone | YES | NULL |
| superseded_by_id | uuid | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |
| risk_id | uuid | YES | NULL |

## Table: risk_links

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| risk_id | uuid | NO | NULL |
| target_type | text | NO | NULL |
| target_id | uuid | NO | NULL |
| relationship | text | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: risk_models

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| model_key | text | NO | NULL |
| model_version | text | NO | NULL |
| scales_json | jsonb | NO | '{}'::jsonb |
| formula | text | NO | NULL |
| thresholds | jsonb | NO | '{}'::jsonb |
| status | text | NO | 'active'::text |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: risk_treatments

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| risk_id | uuid | NO | NULL |
| strategy | text | NO | NULL |
| plan | text | NO | NULL |
| owner_id | uuid | NO | NULL |
| due_at | timestamp with time zone | NO | NULL |
| status | text | NO | 'planned'::text |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: risks

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| workspace_id | uuid | YES | NULL |
| risk_model_id | uuid | YES | NULL |
| risk_key | text | NO | NULL |
| title | text | NO | NULL |
| category | text | NO | NULL |
| inherent_score | numeric | NO | NULL |
| residual_score | numeric | NO | NULL |
| owner_id | uuid | NO | NULL |
| status | text | NO | 'identified'::text |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: safety_checks

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| generation_run_id | uuid | NO | NULL |
| check_type | text | NO | NULL |
| policy_version | text | NO | NULL |
| result | text | NO | NULL |
| score | numeric | YES | NULL |
| redaction_summary | jsonb | NO | '{}'::jsonb |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: sdlc_release_gates

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| sbom_hash | text | NO | NULL |
| signed_build_ref | text | NO | NULL |
| scan_findings | jsonb | NO | '[]'::jsonb |
| penetration_test_evidence_id | uuid | NO | NULL |
| releasable | boolean | NO | false |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: siem_export_records

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| actor_id | uuid | NO | NULL |
| target | text | NO | NULL |
| before_hash | text | NO | NULL |
| after_hash | text | NO | NULL |
| trace_id | text | NO | NULL |
| delivered | boolean | NO | false |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: systems_assets

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| workspace_id | uuid | YES | NULL |
| name | text | NO | NULL |
| asset_type | text | NO | NULL |
| owner_id | uuid | NO | NULL |
| region | text | YES | NULL |
| criticality | text | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: tenant_catalog_subscriptions

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| framework_id | uuid | YES | NULL |
| source_package_id | uuid | YES | NULL |
| status | USER-DEFINED | NO | 'active'::catalog_subscription_status |
| subscribed_at | timestamp with time zone | NO | now() |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: test_procedures

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| control_id | text | NO | NULL |
| procedure_key | text | NO | NULL |
| method | text | NO | NULL |
| expected_result | text | NO | NULL |
| status | text | NO | 'active'::text |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: transfers

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| processing_activity_id | uuid | NO | NULL |
| from_country | text | NO | NULL |
| to_country | text | NO | NULL |
| mechanism | text | NO | NULL |
| safeguards | text | YES | NULL |
| status | text | NO | 'active'::text |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: trust_center_artifacts

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| title | text | NO | NULL |
| artifact_version | text | NO | NULL |
| approved | boolean | NO | false |
| visibility | text | NO | NULL |
| artifact_evidence_id | uuid | NO | NULL |
| nda_required | boolean | NO | false |
| crm_account_id | text | YES | NULL |
| download_events | jsonb | NO | '[]'::jsonb |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: upload_sessions

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| file_name | text | NO | NULL |
| scan_status | text | NO | NULL |
| sha256 | text | YES | NULL |
| classification | USER-DEFINED | NO | 'restricted'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: vendor_assessments

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| vendor_id | uuid | NO | NULL |
| assessment_type | text | NO | NULL |
| period | text | NO | NULL |
| status | text | NO | 'planned'::text |
| reviewer_id | uuid | NO | NULL |
| score | numeric | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: vendor_findings

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| vendor_assessment_id | uuid | NO | NULL |
| severity | text | NO | NULL |
| title | text | NO | NULL |
| status | text | NO | 'open'::text |
| due_at | timestamp with time zone | YES | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: vendors

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| name | text | NO | NULL |
| tier | text | NO | NULL |
| systems | ARRAY | NO | '{}'::text[] |
| contract_ids | ARRAY | NO | '{}'::text[] |
| control_ids | ARRAY | NO | '{}'::text[] |
| incident_ids | ARRAY | NO | '{}'::text[] |
| questionnaire_ids | ARRAY | NO | '{}'::text[] |
| monitoring_findings | ARRAY | NO | '{}'::text[] |
| renewal_at | timestamp with time zone | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: webhook_contracts

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| webhook_key | text | NO | NULL |
| contract_version | text | NO | NULL |
| direction | text | NO | NULL |
| signing_secret_ref | text | NO | NULL |
| rate_limit_per_minute | integer | NO | NULL |
| status | text | NO | 'active'::text |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |

## Table: webhook_deliveries

| Column Name | Data Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | NULL |
| version | integer | NO | 1 |
| webhook_id | uuid | NO | NULL |
| idempotency_key | text | NO | NULL |
| payload_hash | text | NO | NULL |
| delivery_status | text | NO | NULL |
| attempts | integer | NO | NULL |
| last_error | text | YES | NULL |
| observed_at | timestamp with time zone | NO | NULL |
| classification | USER-DEFINED | NO | 'confidential'::cybernara_classification |
| created_by | uuid | NO | NULL |
| created_at | timestamp with time zone | NO | now() |
| updated_by | uuid | NO | NULL |
| updated_at | timestamp with time zone | NO | now() |
