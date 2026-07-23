# Production Reset Report - 2026-07-10

Authoritative workspace: C:\Users\Sourjya Saha\Desktop\GRC_Tool_V3. No sibling GRC_Tool_V2 workspace was found under the Desktop scan, so V3 is authoritative for this reset.

## Backup Evidence

- Custom dump: pre_reset_backup_20260710_155134.dump, 11,708,769 bytes.
- Schema-only snapshot: pre_reset_schema_20260710_155134.sql, 745,200 bytes.
- Both were created before any data deletion.

## Classification Before Deletion

Canonical shared catalog tenant: 00000000-0000-4000-8000-000000000001. Note: live catalog rows currently use owner_scope=tenant, but source code defines this fixed tenant as shared catalog content. Therefore canonical rows are preserved even though owner_scope is not global.

| Table | Before rows | Canonical rows | Non-canonical rows | Action | Delete condition | Justification |
|---|---:|---:|---:|---|---|---|
| public.access_review_decisions | 89 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.access_review_items | 175 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.access_reviews | 377 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.ai_evaluation_runs | 117 |  |  | WIPE all rows | delete all rows | Tenant-scoped AI generation/provenance/evaluation data, not platform-global configuration in this schema. |
| public.ai_generation_runs | 716 |  |  | WIPE all rows | delete all rows | Tenant-scoped AI generation/provenance/evaluation data, not platform-global configuration in this schema. |
| public.ai_model_deployments | 628 |  |  | WIPE all rows | delete all rows | Tenant-scoped AI generation/provenance/evaluation data, not platform-global configuration in this schema. |
| public.ai_output_reviews | 228 |  |  | WIPE all rows | delete all rows | Tenant-scoped AI generation/provenance/evaluation data, not platform-global configuration in this schema. |
| public.ai_prompt_versions | 629 |  |  | WIPE all rows | delete all rows | Tenant-scoped AI generation/provenance/evaluation data, not platform-global configuration in this schema. |
| public.ai_publication_events | 90 |  |  | WIPE all rows | delete all rows | Tenant-scoped AI generation/provenance/evaluation data, not platform-global configuration in this schema. |
| public.ai_question_versions | 397 |  |  | WIPE all rows | delete all rows | Tenant-scoped AI generation/provenance/evaluation data, not platform-global configuration in this schema. |
| public.ai_retrieval_indexes | 865 |  |  | WIPE all rows | delete all rows | Tenant-scoped AI generation/provenance/evaluation data, not platform-global configuration in this schema. |
| public.answer_revisions | 552 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.applicability_decisions | 387 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.assessment_frameworks | 662 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.assessment_items | 2923 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.assessment_scopes | 662 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.assessment_signoffs | 139 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.assessment_snapshots | 874 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.assessments | 4107 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.assurance_alerts | 200 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.audit_checkpoints | 492 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.audit_engagements | 334 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.audit_events | 11545 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.audit_requests | 89 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.audit_tests | 89 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.audit_verifications | 246 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.authorization_decision_logs | 202 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.automated_control_tests | 200 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.automated_test_runs | 119 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.automated_tests | 156 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.backup_restore_tests | 0 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.connector_objects | 205 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.connector_sync_runs | 206 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.connectors | 620 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.consent_events | 58 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.consent_purposes | 86 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.consent_records | 217 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.content_rejected_records | 822 | 820 | 2 | KEEP canonical, WIPE non-canonical | delete where tenant_id <> 00000000-0000-4000-8000-000000000001 | Canonical shared catalog/reference content is stored under the fixed catalog tenant; non-canonical rows are tenant overlays/test data. |
| public.content_source_packages | 66 | 13 | 53 | KEEP canonical, WIPE non-canonical | delete where tenant_id <> 00000000-0000-4000-8000-000000000001 | Canonical shared catalog/reference content is stored under the fixed catalog tenant; non-canonical rows are tenant overlays/test data. |
| public.control_instances | 3455 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.control_mappings | 4548 | 4522 | 26 | KEEP canonical, WIPE non-canonical | delete where tenant_id <> 00000000-0000-4000-8000-000000000001 | Canonical shared catalog/reference content is stored under the fixed catalog tenant; non-canonical rows are tenant overlays/test data. |
| public.control_sets | 381 | 13 | 368 | KEEP canonical, WIPE non-canonical | delete where tenant_id <> 00000000-0000-4000-8000-000000000001 | Canonical shared catalog/reference content is stored under the fixed catalog tenant; non-canonical rows are tenant overlays/test data. |
| public.control_subcontrols | 1474 | 1418 | 56 | KEEP canonical, WIPE non-canonical | delete where tenant_id <> 00000000-0000-4000-8000-000000000001 | Canonical shared catalog/reference content is stored under the fixed catalog tenant; non-canonical rows are tenant overlays/test data. |
| public.control_test_results | 58 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.controls | 2763 | 2482 | 281 | KEEP canonical, WIPE non-canonical | delete where tenant_id <> 00000000-0000-4000-8000-000000000001 | Canonical shared catalog/reference content is stored under the fixed catalog tenant; non-canonical rows are tenant overlays/test data. |
| public.custom_field_definitions | 316 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.custom_object_definitions | 795 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.custom_records | 293 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.custom_values | 165 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.data_categories | 346 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.data_discovery_findings | 63 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.data_discovery_scans | 91 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.data_inventory_records | 422 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.data_subject_categories | 0 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.deletion_items | 119 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.deletion_jobs | 116 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.dpia_assessments | 219 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.dpia_risks | 34 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.dpias | 62 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.encryption_key_records | 0 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.evaluation_cases | 78 |  |  | WIPE all rows | delete all rows | Tenant-scoped AI generation/provenance/evaluation data, not platform-global configuration in this schema. |
| public.evaluation_results | 78 |  |  | WIPE all rows | delete all rows | Tenant-scoped AI generation/provenance/evaluation data, not platform-global configuration in this schema. |
| public.evaluation_suites | 270 |  |  | WIPE all rows | delete all rows | Tenant-scoped AI generation/provenance/evaluation data, not platform-global configuration in this schema. |
| public.evidence_custody_events | 181 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.evidence_expiry_events | 37 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.evidence_links | 98 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.evidence_objects | 1066 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.evidence_requests | 82 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.evidence_reviews | 45 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.evidence_samples | 45 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.evidence_versions | 511 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.export_manifests | 300 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.findings | 1767 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.framework_content_packs | 48 | 13 | 35 | KEEP canonical, WIPE non-canonical | delete where tenant_id <> 00000000-0000-4000-8000-000000000001 | Canonical shared catalog/reference content is stored under the fixed catalog tenant; non-canonical rows are tenant overlays/test data. |
| public.framework_diff_items | 141 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.framework_diffs | 141 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.framework_requirements | 3668 | 3642 | 26 | KEEP canonical, WIPE non-canonical | delete where tenant_id <> 00000000-0000-4000-8000-000000000001 | Canonical shared catalog/reference content is stored under the fixed catalog tenant; non-canonical rows are tenant overlays/test data. |
| public.framework_update_impacts | 55 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.framework_versions | 649 | 13 | 636 | KEEP canonical, WIPE non-canonical | delete where tenant_id <> 00000000-0000-4000-8000-000000000001 | Canonical shared catalog/reference content is stored under the fixed catalog tenant; non-canonical rows are tenant overlays/test data. |
| public.frameworks | 653 | 13 | 640 | KEEP canonical, WIPE non-canonical | delete where tenant_id <> 00000000-0000-4000-8000-000000000001 | Canonical shared catalog/reference content is stored under the fixed catalog tenant; non-canonical rows are tenant overlays/test data. |
| public.generation_citations | 79 |  |  | WIPE all rows | delete all rows | Tenant-scoped AI generation/provenance/evaluation data, not platform-global configuration in this schema. |
| public.grc_workspaces | 278 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.harmonized_controls | 358 | 200 | 158 | KEEP canonical, WIPE non-canonical | delete where tenant_id <> 00000000-0000-4000-8000-000000000001 | Canonical shared catalog/reference content is stored under the fixed catalog tenant; non-canonical rows are tenant overlays/test data. |
| public.identity_role_grants | 16 |  |  | WIPE all rows | delete all rows | Customer identity, tenant, role, session, or delegation data; reset requires a single newly-created bootstrap tenant/admin. |
| public.identity_roles | 10 |  |  | WIPE all rows | delete all rows | Customer identity, tenant, role, session, or delegation data; reset requires a single newly-created bootstrap tenant/admin. |
| public.identity_service_accounts | 0 |  |  | WIPE all rows | delete all rows | Customer identity, tenant, role, session, or delegation data; reset requires a single newly-created bootstrap tenant/admin. |
| public.identity_sessions | 0 |  |  | WIPE all rows | delete all rows | Customer identity, tenant, role, session, or delegation data; reset requires a single newly-created bootstrap tenant/admin. |
| public.identity_tenants | 340 |  |  | WIPE all rows | delete all rows | Customer identity, tenant, role, session, or delegation data; reset requires a single newly-created bootstrap tenant/admin. |
| public.identity_users | 16 |  |  | WIPE all rows | delete all rows | Customer identity, tenant, role, session, or delegation data; reset requires a single newly-created bootstrap tenant/admin. |
| public.identity_workspace_delegations | 0 |  |  | WIPE all rows | delete all rows | Customer identity, tenant, role, session, or delegation data; reset requires a single newly-created bootstrap tenant/admin. |
| public.incident_assessments | 58 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.incident_notifications | 30 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.knowledge_chunks | 197 |  |  | WIPE all rows | delete all rows | Tenant-scoped AI generation/provenance/evaluation data, not platform-global configuration in this schema. |
| public.lawful_bases | 63 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.legal_hold_items | 59 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.legal_holds | 167 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.malware_scan_results | 181 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.mapping_conflicts | 67 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.mapping_reviews | 4572 | 4520 | 52 | KEEP canonical, WIPE non-canonical | delete where tenant_id <> 00000000-0000-4000-8000-000000000001 | Canonical shared catalog/reference content is stored under the fixed catalog tenant; non-canonical rows are tenant overlays/test data. |
| public.mapping_versions | 62 | 3 | 59 | KEEP canonical, WIPE non-canonical | delete where tenant_id <> 00000000-0000-4000-8000-000000000001 | Canonical shared catalog/reference content is stored under the fixed catalog tenant; non-canonical rows are tenant overlays/test data. |
| public.outbox_events | 10529 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.policies | 91 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.policy_attestations | 89 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.policy_control_links | 91 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.policy_versions | 583 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.privacy_incidents | 302 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.privacy_notice_versions | 119 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.privacy_notices | 119 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.privacy_rights_requests | 253 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.processing_activities | 367 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.processing_inventory_links | 0 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.processing_purposes | 63 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.processing_recipients | 34 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.product_assurance_evidence | 0 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.purposes | 119 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.question_sets | 2840 | 105 | 2735 | KEEP canonical, WIPE non-canonical | delete where tenant_id <> 00000000-0000-4000-8000-000000000001 | Canonical shared catalog/reference content is stored under the fixed catalog tenant; non-canonical rows are tenant overlays/test data. |
| public.question_versions | 2655 | 105 | 2550 | KEEP canonical, WIPE non-canonical | delete where tenant_id <> 00000000-0000-4000-8000-000000000001 | Canonical shared catalog/reference content is stored under the fixed catalog tenant; non-canonical rows are tenant overlays/test data. |
| public.rate_limit_policies | 0 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.recipients | 35 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.remediation_tasks | 1300 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.report_exports | 426 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.report_templates | 334 | 1 | 333 | KEEP canonical, WIPE non-canonical | delete where tenant_id <> 00000000-0000-4000-8000-000000000001 | Canonical shared catalog/reference content is stored under the fixed catalog tenant; non-canonical rows are tenant overlays/test data. |
| public.requirement_instances | 4323 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.retention_assignments | 111 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.retention_rules | 141 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.retention_schedules | 216 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.retrieval_runs | 119 |  |  | WIPE all rows | delete all rows | Tenant-scoped AI generation/provenance/evaluation data, not platform-global configuration in this schema. |
| public.retrieved_chunks | 80 |  |  | WIPE all rows | delete all rows | Tenant-scoped AI generation/provenance/evaluation data, not platform-global configuration in this schema. |
| public.review_decisions | 109 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.rights_request_tasks | 22 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.risk_acceptance_reviews | 342 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.risk_acceptances | 733 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.risk_links | 104 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.risk_models | 112 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.risk_treatments | 104 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.risks | 532 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.safety_checks | 78 |  |  | WIPE all rows | delete all rows | Tenant-scoped AI generation/provenance/evaluation data, not platform-global configuration in this schema. |
| public.sdlc_release_gates | 0 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.siem_export_records | 0 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.systems_assets | 120 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.tenant_catalog_subscriptions | 48 |  |  | WIPE all rows | delete all rows | Tenant-specific catalog opt-ins; canonical catalog rows remain in catalog tables, subscriptions are customer state. |
| public.test_procedures | 58 | 18 | 40 | KEEP canonical, WIPE non-canonical | delete where tenant_id <> 00000000-0000-4000-8000-000000000001 | Canonical shared catalog/reference content is stored under the fixed catalog tenant; non-canonical rows are tenant overlays/test data. |
| public.transfers | 34 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.trust_center_artifacts | 202 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.universal_tasks | 1369 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.upload_sessions | 0 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.vendor_assessments | 132 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.vendor_findings | 46 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.vendors | 336 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.webhook_contracts | 205 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| public.webhook_deliveries | 202 |  |  | WIPE all rows | delete all rows | Tenant-scoped or transactional application data not identified as canonical shared catalog content. |
| supabase_migrations.schema_migrations | 39 |  |  | KEEP all rows | No delete | Migration tracking table; never touched by data reset. |

## Data Wipe Evidence

Delete execution: FK-ordered DELETE statements against public tables; canonical catalog tenant 00000000-0000-4000-8000-000000000001 preserved in catalog tables.

Temporarily disabled append-only BEFORE DELETE triggers in transaction: access_review_decisions.trg_prevent_access_review_decision_mutation, ai_publication_events.trg_prevent_ai_publication_event_mutation, answer_revisions.trg_prevent_answer_revisions_mutation, applicability_decisions.trg_prevent_applicability_decisions_mutation, assessment_snapshots.trg_prevent_assessment_snapshots_mutation, audit_checkpoints.trg_prevent_audit_checkpoints_mutation, audit_events.trg_prevent_audit_event_update, audit_verifications.trg_prevent_audit_verifications_mutation, consent_events.trg_prevent_consent_events_mutation, evidence_custody_events.trg_prevent_evidence_custody_events_mutation, evidence_expiry_events.trg_prevent_evidence_expiry_events_mutation, evidence_versions.trg_prevent_evidence_versions_mutation, export_manifests.trg_prevent_export_manifest_mutation, policy_attestations.trg_prevent_policy_attestation_mutation, privacy_notice_versions.trg_prevent_privacy_notice_versions_mutation, review_decisions.trg_prevent_review_decisions_mutation, risk_acceptance_reviews.trg_prevent_risk_acceptance_review_update. All were re-enabled before commit.

| Table | Before rows | Deleted rows | After rows |
|---|---:|---:|---:|
| public.access_review_decisions | 89 | 89 | 0 |
| public.access_review_items | 175 | 175 | 0 |
| public.access_reviews | 377 | 377 | 0 |
| public.ai_evaluation_runs | 117 | 117 | 0 |
| public.ai_generation_runs | 716 | 716 | 0 |
| public.ai_model_deployments | 628 | 628 | 0 |
| public.ai_output_reviews | 228 | 228 | 0 |
| public.ai_prompt_versions | 629 | 629 | 0 |
| public.ai_publication_events | 90 | 90 | 0 |
| public.ai_question_versions | 397 | 397 | 0 |
| public.ai_retrieval_indexes | 865 | 865 | 0 |
| public.answer_revisions | 552 | 552 | 0 |
| public.applicability_decisions | 387 | 387 | 0 |
| public.assessment_frameworks | 662 | 662 | 0 |
| public.assessment_items | 2923 | 2923 | 0 |
| public.assessment_scopes | 662 | 662 | 0 |
| public.assessment_signoffs | 139 | 139 | 0 |
| public.assessment_snapshots | 874 | 874 | 0 |
| public.assessments | 4107 | 4107 | 0 |
| public.assurance_alerts | 200 | 200 | 0 |
| public.audit_checkpoints | 492 | 492 | 0 |
| public.audit_engagements | 334 | 334 | 0 |
| public.audit_events | 11545 | 11545 | 0 |
| public.audit_requests | 89 | 89 | 0 |
| public.audit_tests | 89 | 89 | 0 |
| public.audit_verifications | 246 | 246 | 0 |
| public.authorization_decision_logs | 202 | 202 | 0 |
| public.automated_control_tests | 200 | 200 | 0 |
| public.automated_test_runs | 119 | 119 | 0 |
| public.automated_tests | 156 | 156 | 0 |
| public.backup_restore_tests | 0 | 0 | 0 |
| public.connector_objects | 205 | 205 | 0 |
| public.connector_sync_runs | 206 | 206 | 0 |
| public.connectors | 620 | 620 | 0 |
| public.consent_events | 58 | 58 | 0 |
| public.consent_purposes | 86 | 86 | 0 |
| public.consent_records | 217 | 217 | 0 |
| public.content_rejected_records | 822 | 2 | 820 |
| public.content_source_packages | 66 | 53 | 13 |
| public.control_instances | 3455 | 3455 | 0 |
| public.control_mappings | 4548 | 26 | 4522 |
| public.control_sets | 381 | 368 | 13 |
| public.control_subcontrols | 1474 | 56 | 1418 |
| public.control_test_results | 58 | 58 | 0 |
| public.controls | 2763 | 281 | 2482 |
| public.custom_field_definitions | 316 | 316 | 0 |
| public.custom_object_definitions | 795 | 795 | 0 |
| public.custom_records | 293 | 293 | 0 |
| public.custom_values | 165 | 165 | 0 |
| public.data_categories | 346 | 346 | 0 |
| public.data_discovery_findings | 63 | 63 | 0 |
| public.data_discovery_scans | 91 | 91 | 0 |
| public.data_inventory_records | 422 | 422 | 0 |
| public.data_subject_categories | 0 | 0 | 0 |
| public.deletion_items | 119 | 119 | 0 |
| public.deletion_jobs | 116 | 116 | 0 |
| public.dpia_assessments | 219 | 219 | 0 |
| public.dpia_risks | 34 | 34 | 0 |
| public.dpias | 62 | 62 | 0 |
| public.encryption_key_records | 0 | 0 | 0 |
| public.evaluation_cases | 78 | 78 | 0 |
| public.evaluation_results | 78 | 78 | 0 |
| public.evaluation_suites | 270 | 270 | 0 |
| public.evidence_custody_events | 181 | 181 | 0 |
| public.evidence_expiry_events | 37 | 37 | 0 |
| public.evidence_links | 98 | 98 | 0 |
| public.evidence_objects | 1066 | 1066 | 0 |
| public.evidence_requests | 82 | 82 | 0 |
| public.evidence_reviews | 45 | 45 | 0 |
| public.evidence_samples | 45 | 45 | 0 |
| public.evidence_versions | 511 | 511 | 0 |
| public.export_manifests | 300 | 300 | 0 |
| public.findings | 1767 | 1767 | 0 |
| public.framework_content_packs | 48 | 35 | 13 |
| public.framework_diff_items | 141 | 141 | 0 |
| public.framework_diffs | 141 | 141 | 0 |
| public.framework_requirements | 3668 | 26 | 3642 |
| public.framework_update_impacts | 55 | 55 | 0 |
| public.framework_versions | 649 | 636 | 13 |
| public.frameworks | 653 | 640 | 13 |
| public.generation_citations | 79 | 79 | 0 |
| public.grc_workspaces | 278 | 278 | 0 |
| public.harmonized_controls | 358 | 158 | 200 |
| public.identity_role_grants | 16 | 16 | 0 |
| public.identity_roles | 10 | 10 | 0 |
| public.identity_service_accounts | 0 | 0 | 0 |
| public.identity_sessions | 0 | 0 | 0 |
| public.identity_tenants | 340 | 340 | 0 |
| public.identity_users | 16 | 16 | 0 |
| public.identity_workspace_delegations | 0 | 0 | 0 |
| public.incident_assessments | 58 | 58 | 0 |
| public.incident_notifications | 30 | 30 | 0 |
| public.knowledge_chunks | 197 | 197 | 0 |
| public.lawful_bases | 63 | 63 | 0 |
| public.legal_hold_items | 59 | 59 | 0 |
| public.legal_holds | 167 | 167 | 0 |
| public.malware_scan_results | 181 | 181 | 0 |
| public.mapping_conflicts | 67 | 67 | 0 |
| public.mapping_reviews | 4572 | 52 | 4520 |
| public.mapping_versions | 62 | 59 | 3 |
| public.outbox_events | 10529 | 10529 | 0 |
| public.policies | 91 | 91 | 0 |
| public.policy_attestations | 89 | 89 | 0 |
| public.policy_control_links | 91 | 91 | 0 |
| public.policy_versions | 583 | 583 | 0 |
| public.privacy_incidents | 302 | 302 | 0 |
| public.privacy_notice_versions | 119 | 119 | 0 |
| public.privacy_notices | 119 | 119 | 0 |
| public.privacy_rights_requests | 253 | 253 | 0 |
| public.processing_activities | 367 | 367 | 0 |
| public.processing_inventory_links | 0 | 0 | 0 |
| public.processing_purposes | 63 | 63 | 0 |
| public.processing_recipients | 34 | 34 | 0 |
| public.product_assurance_evidence | 0 | 0 | 0 |
| public.purposes | 119 | 119 | 0 |
| public.question_sets | 2840 | 2735 | 105 |
| public.question_versions | 2655 | 2550 | 105 |
| public.rate_limit_policies | 0 | 0 | 0 |
| public.recipients | 35 | 35 | 0 |
| public.remediation_tasks | 1300 | 1300 | 0 |
| public.report_exports | 426 | 426 | 0 |
| public.report_templates | 334 | 333 | 1 |
| public.requirement_instances | 4323 | 4323 | 0 |
| public.retention_assignments | 111 | 111 | 0 |
| public.retention_rules | 141 | 141 | 0 |
| public.retention_schedules | 216 | 216 | 0 |
| public.retrieval_runs | 119 | 119 | 0 |
| public.retrieved_chunks | 80 | 80 | 0 |
| public.review_decisions | 109 | 109 | 0 |
| public.rights_request_tasks | 22 | 22 | 0 |
| public.risk_acceptance_reviews | 342 | 342 | 0 |
| public.risk_acceptances | 733 | 733 | 0 |
| public.risk_links | 104 | 104 | 0 |
| public.risk_models | 112 | 112 | 0 |
| public.risk_treatments | 104 | 104 | 0 |
| public.risks | 532 | 532 | 0 |
| public.safety_checks | 78 | 78 | 0 |
| public.sdlc_release_gates | 0 | 0 | 0 |
| public.siem_export_records | 0 | 0 | 0 |
| public.systems_assets | 120 | 120 | 0 |
| public.tenant_catalog_subscriptions | 48 | 48 | 0 |
| public.test_procedures | 58 | 40 | 18 |
| public.transfers | 34 | 34 | 0 |
| public.trust_center_artifacts | 202 | 202 | 0 |
| public.universal_tasks | 1369 | 23 | 0 |
| public.upload_sessions | 0 | 0 | 0 |
| public.vendor_assessments | 132 | 132 | 0 |
| public.vendor_findings | 46 | 46 | 0 |
| public.vendors | 336 | 336 | 0 |
| public.webhook_contracts | 205 | 205 | 0 |
| public.webhook_deliveries | 202 | 202 | 0 |

Canonical catalog retained row counts after wipe: content_rejected_records:820, content_source_packages:13, control_mappings:4522, control_sets:13, control_subcontrols:1418, controls:2482, framework_content_packs:13, framework_requirements:3642, framework_versions:13, frameworks:13, harmonized_controls:200, mapping_reviews:4520, mapping_versions:3, question_sets:105, question_versions:105, report_templates:1, test_procedures:18.

## Schema Verification After Wipe

- Command: `node scripts/schema-audit.mjs` from `cybernara-backend`.
- Result: completed successfully; audited migrated tables remain present with RLS/FORCE RLS and expected catalog seed counts. Representative post-wipe row counts from output: `identity_tenants=0`, `identity_users=0`, `assessments=0`, `evidence_objects=0`, `universal_tasks=0`, `frameworks=13`, `framework_requirements=3642`, `control_mappings=4522`.
- Command: `pg_dump --schema-only` to `post_reset_schema_20260710_155134.sql`.
- Result: `post_reset_schema_20260710_155134.sql` size 745,200 bytes.
- Schema compare: pre/post SHA256 both `8678B9DB07B99E9C984AB412D7CD0A79350309899C13450D0FD8BDFCAE79894B`; schema is identical.

## Supabase Auth Reset Evidence

- Auth users before deletion: 15.
- Auth users deleted: 15.
- Auth users after deletion: 0.

## Bootstrap Admin Creation Evidence

- Tenant: Primary Tenant (113b6a99-dde1-4a24-9716-9468206916bb).
- Bootstrap login email: bootstrap.admin@cybernara.com.
- Supabase Auth users after bootstrap creation: 1.
- Identity counts after bootstrap creation: identity_tenants=1, identity_users=1, identity_roles=1, identity_role_grants=1.
- Bootstrap role/clearance: platform_admin / restricted.
- Bootstrap password intentionally omitted from this file; it is returned only in final chat.

## Bootstrap Browser Verification Evidence

- Command: `BOOTSTRAP_EMAIL=<email> BOOTSTRAP_PASSWORD=<password> npx playwright test e2e/reset-bootstrap-verification.spec.ts --reporter=line` from `cybernara-frontend`.
- First run result: failed after successful invite/login cleanup because the invited user's role catalog row remained (identity_roles=2). Cleanup was tightened to remove non-bootstrap role rows.
- Rerun result: `1 passed (22.5s)`. The temporary spec was deleted after verification.
- Final Supabase Auth user count: 1.
- Final identity counts: tenants=1, users=1, roles=1, grants=1.
- Final transactional spot checks: assessments=0, evidence_objects=0, universal_tasks=0.
- Bootstrap row: Primary Tenant / bootstrap.admin@cybernara.com / platform_admin / restricted / active.

## Bootstrap Scope Refresh Evidence

- Source fix: `cybernara-backend/src/modules/identity-tenant/application/admin-role-catalog.ts` now defines platform_admin from 187 guarded API scopes.
- Bootstrap Supabase Auth metadata refreshed for `bootstrap.admin@cybernara.com` with 187 platform_admin scopes.

- Bootstrap platform_admin metadata trimmed/refreshed to 90 UI-required production scopes after cookie-size verification.

## Bootstrap Navigation Verification Evidence

- Source fix: `cybernara-backend/src/modules/identity-tenant/application/admin-role-catalog.ts` now trims the platform-admin browser grant to 90 UI-required production scopes so Supabase session cookies remain usable while all built routes are visible.
- Command: `npm run typecheck` from `cybernara-backend`.
- Result: passed (`tsc --noEmit`).
- Command: `BOOTSTRAP_EMAIL=<email> BOOTSTRAP_PASSWORD=<password> npx playwright test e2e/reset-bootstrap-nav.spec.ts --reporter=line` from `cybernara-frontend`.
- First nav run after broad 187-scope metadata: failed before nav because browser session cookie was too large / no usable session. After scope trim: `1 passed (18.5s)`.
- Verified visible primary nav links: Audit Log, User Admin, My Tasks, Framework Library, Framework Updates, Harmonization, Assessments, AI Review, Integrations, Privacy Operations, Enterprise GRC.
- Verified direct page access for Privacy Operations, Enterprise GRC, and Integration Command Center without the feature-access-denied state.
- Temporary Playwright nav spec was deleted after verification.

## Manual Testing Guide Evidence

- File created: `MANUAL_TESTING_GUIDE.md` at workspace root.
- Size: 24,065 bytes before final coverage patch; includes smoke test, admin onboarding, framework/harmonization, assessment, AI Review, integrations, evidence upload, findings, risk, tasks, framework impacts, privacy, custom objects, audit, reporting, navigation, and edge cases.
- Bootstrap password intentionally omitted from the guide.

- Corrected final guide size after AI/Integrations coverage patch: 24065 bytes. Reset report size at this checkpoint: 42568 bytes.
