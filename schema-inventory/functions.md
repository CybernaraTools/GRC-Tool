# Cybernara Functions & Triggers

## Database Functions

### Function: app_current_principal
```sql
CREATE OR REPLACE FUNCTION public.app_current_principal()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select nullif(current_setting('app.principal_id', true), '')::uuid
$function$

```

### Function: app_current_tenant
```sql
CREATE OR REPLACE FUNCTION public.app_current_tenant()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select nullif(current_setting('app.tenant_id', true), '')::uuid
$function$

```

### Function: prevent_access_review_decision_mutation
```sql
CREATE OR REPLACE FUNCTION public.prevent_access_review_decision_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  raise exception 'access_review_decisions is append-only';
end;
$function$

```

### Function: prevent_ai_publication_event_mutation
```sql
CREATE OR REPLACE FUNCTION public.prevent_ai_publication_event_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  raise exception 'ai_publication_events is append-only';
end;
$function$

```

### Function: prevent_approved_question_version_mutation
```sql
CREATE OR REPLACE FUNCTION public.prevent_approved_question_version_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if old.approved_at is not null then
    raise exception 'question_versions: an approved question version is immutable';
  end if;
  return new;
end;
$function$

```

### Function: prevent_assessment_history_mutation
```sql
CREATE OR REPLACE FUNCTION public.prevent_assessment_history_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  raise exception '% is append-only', tg_table_name;
end;
$function$

```

### Function: prevent_audit_chain_mutation
```sql
CREATE OR REPLACE FUNCTION public.prevent_audit_chain_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  raise exception '% is append-only', tg_table_name;
end;
$function$

```

### Function: prevent_audit_event_mutation
```sql
CREATE OR REPLACE FUNCTION public.prevent_audit_event_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  raise exception 'audit_events is append-only';
end;
$function$

```

### Function: prevent_evidence_graph_mutation
```sql
CREATE OR REPLACE FUNCTION public.prevent_evidence_graph_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  raise exception '% is append-only', tg_table_name;
end;
$function$

```

### Function: prevent_export_manifest_mutation
```sql
CREATE OR REPLACE FUNCTION public.prevent_export_manifest_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  raise exception 'export_manifests is append-only';
end;
$function$

```

### Function: prevent_policy_attestation_mutation
```sql
CREATE OR REPLACE FUNCTION public.prevent_policy_attestation_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  raise exception 'policy_attestations is append-only';
end;
$function$

```

### Function: prevent_privacy_ledger_mutation
```sql
CREATE OR REPLACE FUNCTION public.prevent_privacy_ledger_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  raise exception '% is append-only', tg_table_name;
end;
$function$

```

### Function: prevent_review_decision_self_review
```sql
CREATE OR REPLACE FUNCTION public.prevent_review_decision_self_review()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  submitter uuid;
begin
  select submitted_by into submitter from answer_revisions where id = new.answer_revision_id;
  if submitter = new.reviewer_id then
    raise exception 'review_decisions: reviewer must not be the same principal as the answer submitter';
  end if;
  return new;
end;
$function$

```

### Function: prevent_risk_acceptance_review_mutation
```sql
CREATE OR REPLACE FUNCTION public.prevent_risk_acceptance_review_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  raise exception 'risk_acceptance_reviews is append-only';
end;
$function$

```

### Function: rls_auto_enable
```sql
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$

```


## Triggers

| Trigger Name | Table Name | Definition |
|---|---|---|
| trg_prevent_access_review_decision_mutation | access_review_decisions | `CREATE TRIGGER trg_prevent_access_review_decision_mutation BEFORE DELETE OR UPDATE ON public.access_review_decisions FOR EACH ROW EXECUTE FUNCTION prevent_access_review_decision_mutation()` |
| trg_prevent_ai_publication_event_mutation | ai_publication_events | `CREATE TRIGGER trg_prevent_ai_publication_event_mutation BEFORE DELETE OR UPDATE ON public.ai_publication_events FOR EACH ROW EXECUTE FUNCTION prevent_ai_publication_event_mutation()` |
| trg_prevent_answer_revisions_mutation | answer_revisions | `CREATE TRIGGER trg_prevent_answer_revisions_mutation BEFORE DELETE OR UPDATE ON public.answer_revisions FOR EACH ROW EXECUTE FUNCTION prevent_assessment_history_mutation()` |
| trg_prevent_applicability_decisions_mutation | applicability_decisions | `CREATE TRIGGER trg_prevent_applicability_decisions_mutation BEFORE DELETE OR UPDATE ON public.applicability_decisions FOR EACH ROW EXECUTE FUNCTION prevent_assessment_history_mutation()` |
| trg_prevent_assessment_snapshots_mutation | assessment_snapshots | `CREATE TRIGGER trg_prevent_assessment_snapshots_mutation BEFORE DELETE OR UPDATE ON public.assessment_snapshots FOR EACH ROW EXECUTE FUNCTION prevent_assessment_history_mutation()` |
| trg_prevent_audit_checkpoints_mutation | audit_checkpoints | `CREATE TRIGGER trg_prevent_audit_checkpoints_mutation BEFORE DELETE OR UPDATE ON public.audit_checkpoints FOR EACH ROW EXECUTE FUNCTION prevent_audit_chain_mutation()` |
| trg_prevent_audit_event_update | audit_events | `CREATE TRIGGER trg_prevent_audit_event_update BEFORE DELETE OR UPDATE ON public.audit_events FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation()` |
| trg_prevent_audit_verifications_mutation | audit_verifications | `CREATE TRIGGER trg_prevent_audit_verifications_mutation BEFORE DELETE OR UPDATE ON public.audit_verifications FOR EACH ROW EXECUTE FUNCTION prevent_audit_chain_mutation()` |
| trg_prevent_consent_events_mutation | consent_events | `CREATE TRIGGER trg_prevent_consent_events_mutation BEFORE DELETE OR UPDATE ON public.consent_events FOR EACH ROW EXECUTE FUNCTION prevent_privacy_ledger_mutation()` |
| trg_prevent_evidence_custody_events_mutation | evidence_custody_events | `CREATE TRIGGER trg_prevent_evidence_custody_events_mutation BEFORE DELETE OR UPDATE ON public.evidence_custody_events FOR EACH ROW EXECUTE FUNCTION prevent_evidence_graph_mutation()` |
| trg_prevent_evidence_expiry_events_mutation | evidence_expiry_events | `CREATE TRIGGER trg_prevent_evidence_expiry_events_mutation BEFORE DELETE OR UPDATE ON public.evidence_expiry_events FOR EACH ROW EXECUTE FUNCTION prevent_evidence_graph_mutation()` |
| trg_prevent_evidence_versions_mutation | evidence_versions | `CREATE TRIGGER trg_prevent_evidence_versions_mutation BEFORE DELETE OR UPDATE ON public.evidence_versions FOR EACH ROW EXECUTE FUNCTION prevent_evidence_graph_mutation()` |
| trg_prevent_export_manifest_mutation | export_manifests | `CREATE TRIGGER trg_prevent_export_manifest_mutation BEFORE DELETE OR UPDATE ON public.export_manifests FOR EACH ROW EXECUTE FUNCTION prevent_export_manifest_mutation()` |
| trg_prevent_policy_attestation_mutation | policy_attestations | `CREATE TRIGGER trg_prevent_policy_attestation_mutation BEFORE DELETE OR UPDATE ON public.policy_attestations FOR EACH ROW EXECUTE FUNCTION prevent_policy_attestation_mutation()` |
| trg_prevent_privacy_notice_versions_mutation | privacy_notice_versions | `CREATE TRIGGER trg_prevent_privacy_notice_versions_mutation BEFORE DELETE OR UPDATE ON public.privacy_notice_versions FOR EACH ROW EXECUTE FUNCTION prevent_privacy_ledger_mutation()` |
| trg_prevent_approved_question_version_mutation | question_versions | `CREATE TRIGGER trg_prevent_approved_question_version_mutation BEFORE UPDATE ON public.question_versions FOR EACH ROW EXECUTE FUNCTION prevent_approved_question_version_mutation()` |
| trg_prevent_review_decision_self_review | review_decisions | `CREATE TRIGGER trg_prevent_review_decision_self_review BEFORE INSERT ON public.review_decisions FOR EACH ROW EXECUTE FUNCTION prevent_review_decision_self_review()` |
| trg_prevent_review_decisions_mutation | review_decisions | `CREATE TRIGGER trg_prevent_review_decisions_mutation BEFORE DELETE OR UPDATE ON public.review_decisions FOR EACH ROW EXECUTE FUNCTION prevent_assessment_history_mutation()` |
| trg_prevent_risk_acceptance_review_update | risk_acceptance_reviews | `CREATE TRIGGER trg_prevent_risk_acceptance_review_update BEFORE DELETE OR UPDATE ON public.risk_acceptance_reviews FOR EACH ROW EXECUTE FUNCTION prevent_risk_acceptance_review_mutation()` |
