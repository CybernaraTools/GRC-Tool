-- Gap remediation — G-13 (custom platform).
--
-- Gap report's exact sentence (both source PDFs re-read fresh before starting this gap): "Definitions
-- exist without fields, records, values, validation, permissions or workflow binding." Traceability
-- GRC-08. Spec §14/§16 ("Enterprise GRC - Trust, Questionnaires, and Extensions") name the target
-- shape directly:
--   custom_object_definitions | tenant_id, object_key, version, status, validation_schema | unique
--     tenant/object/version | tenant_id,status
--   custom_field_definitions | object_definition_id, field_key, data_type, required, validation_json
--     | unique object/field_key | object_definition_id
--   custom_records | object_definition_id, tenant_id, record_key, status | unique
--     definition/record_key | tenant_id,status
--   custom_values | record_id, field_definition_id, value_json, search_text | unique record/field |
--     record_id
--
-- `custom_object_definitions` already exists (migration 0006), fully wired end-to-end (domain,
-- repository, service, HTTP routes at `v1/enterprise-grc/custom-object-definitions`) — but exactly
-- matches the gap sentence's complaint: `fields jsonb`/`workflow_states text[]`/
-- `permission_role_ids uuid[]` are all inline JSON/array blobs, and there is nothing underneath it
-- for records or values at all. This migration adds the 3 missing tables plus 2 additive columns
-- to close the "definitions... without fields[as rows], records, values, validation" half of the
-- gap sentence. No `AskUserQuestion` scope-fork was needed: spec §14/§16 fully and unambiguously
-- bound this gap to exactly these 4 tables (3 new + additive columns on 1 existing), matching the
-- same "no larger surrounding section to phase" situation already confirmed for G-11/G-12.
--
-- Reconciliation and naming decisions (documented, not silently assumed):
-- 1. Spec's target `custom_object_definitions` is `unique(tenant_id, object_key, version)` — a
--    separate immutable row per version, matching the "published content is versioned" pattern used
--    for `framework_versions`/`policy_versions` elsewhere in this schema. The table that actually
--    exists today is `unique(tenant_id, object_key)` with a plain `version integer not null default
--    1` column used as the standard optimistic-row-version counter from this schema's own
--    cross-cutting column contract (§2), not a separate-row-per-version history. Converting the
--    existing table to spec's versioned-history model would be a real, destructive restructuring
--    far beyond what this gap's own sentence asks for ("fields, records, values, validation,
--    permissions, workflow binding" — nothing about versioning strategy) — matching this campaign's
--    standing precedent (G-01/G-07/G-08) of leaving a pre-existing table's own shape/constraint
--    untouched (Expand-only) rather than restructuring it, and stating the mismatch honestly as not
--    fully closed rather than silently reinterpreting spec's intent. Only 2 additive columns
--    (`status`, `validation_schema`) are added to the existing table, matching spec's own literal
--    column list for it.
-- 2. `custom_field_definitions.data_type` is a CHECK-constraint closed set
--    (`text`/`number`/`boolean`/`date`/`datetime`/`uuid`/`json`/`enum`) — spec names the column but
--    does not enumerate its values; this is a design decision, documented here rather than silently
--    assumed, matching the closed-set-of-basic-types pattern this schema already uses everywhere a
--    "kind of value" needs a fixed vocabulary.
-- 3. `custom_records.object_definition_id` is a plain FK to `custom_object_definitions(id)`, not a
--    polymorphic `target_type`/`target_id` pair — unlike this campaign's other polymorphic-link
--    tables (`risk_links`, `ai_publication_events`, `evidence_links`, `retention_assignments`/
--    `legal_hold_items`/`deletion_items`), a custom record only ever belongs to exactly one kind of
--    parent (the object definition that shapes it), so the static-registry CHECK-constraint pattern
--    used for genuinely multi-target relationships does not apply here.
-- 4. `custom_records.status`/`custom_object_definitions.status` are small CHECK-constraint lifecycle
--    enums (`draft`/`active`/`deprecated` for definitions; `active`/`archived` for records) —
--    "workflow binding" in the gap sentence is satisfied by the pre-existing `workflow_states`
--    array on `custom_object_definitions` (already built, already exposed via HTTP); spec's own
--    4-table target list does not name a separate workflow-binding table, so none is invented here.
-- 5. Both new child tables are tenant-scoped (`tenant_id not null`) — including `custom_values`,
--    whose spec's own key-column list omits `tenant_id` — matching the same reasoning already used
--    for G-07/G-08's taxonomy-like tables: every tenant-owned table in this schema carries a real
--    `tenant_id` for RLS, regardless of what spec's column list happens to enumerate.
-- 6. "Validation" (the gap sentence's own word) is implemented as real service-layer business logic,
--    not just a schema column: `EnterpriseGrcService.createCustomValue` looks up the owning field
--    definition and rejects a null/undefined value when `required = true`, and rejects a value whose
--    JSON type does not match the field's `data_type` — matching the "real business-logic
--    implementation, not just schema" precedent already established for G-12's
--    legal-hold-blocks-deletion.

alter table custom_object_definitions add column if not exists status text not null default 'active' check (status in ('draft', 'active', 'deprecated'));
alter table custom_object_definitions add column if not exists validation_schema jsonb;

create index if not exists idx_custom_object_definitions_status on custom_object_definitions(tenant_id, status);

create table if not exists custom_field_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  object_definition_id uuid not null references custom_object_definitions(id),
  field_key text not null,
  data_type text not null check (data_type in ('text', 'number', 'boolean', 'date', 'datetime', 'uuid', 'json', 'enum')),
  required boolean not null default false,
  validation_json jsonb not null default '{}'::jsonb,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (object_definition_id, field_key)
);

create index if not exists idx_custom_field_definitions_object on custom_field_definitions(object_definition_id);

create table if not exists custom_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  object_definition_id uuid not null references custom_object_definitions(id),
  record_key text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (object_definition_id, record_key)
);

create index if not exists idx_custom_records_status on custom_records(tenant_id, status);

create table if not exists custom_values (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  record_id uuid not null references custom_records(id),
  field_definition_id uuid not null references custom_field_definitions(id),
  value_json jsonb,
  search_text text,
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (record_id, field_definition_id)
);

create index if not exists idx_custom_values_record on custom_values(record_id);

alter table custom_field_definitions enable row level security;
alter table custom_records enable row level security;
alter table custom_values enable row level security;

create policy custom_field_definitions_tenant_isolation on custom_field_definitions
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy custom_field_definitions_app_context_isolation on custom_field_definitions
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on custom_field_definitions to app_runtime;

create policy custom_records_tenant_isolation on custom_records
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy custom_records_app_context_isolation on custom_records
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on custom_records to app_runtime;

create policy custom_values_tenant_isolation on custom_values
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy custom_values_app_context_isolation on custom_values
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on custom_values to app_runtime;

alter table custom_field_definitions force row level security;
alter table custom_records force row level security;
alter table custom_values force row level security;
