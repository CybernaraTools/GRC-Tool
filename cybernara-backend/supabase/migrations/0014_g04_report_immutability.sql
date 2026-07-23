-- Gap remediation — G-04 report immutability.
--
-- Root cause, confirmed by direct code read of `ReportingAnalyticsService.download()`
-- (src/modules/reporting-analytics/application/reporting-analytics.service.ts) against
-- spec §17: today `download()` RE-RENDERS the PDF/XLSX from the assessment's *current* live
-- state on every single call, then defensively checks the freshly-rendered bytes' SHA-256
-- still matches the value stored at export time (throwing if not). Nothing physically
-- persists a frozen artifact anywhere — `report_exports.storage_uri` is just set to the API's
-- own download route, not a real object reference. This is exactly the gap report's RPT-01
-- finding: "Downloads may re-render rather than serve a frozen immutable artifact."
--
-- Real, non-obvious finding while writing this migration: `export_manifests` ALREADY EXISTS
-- (migration 0007_m6_platform_hardening.sql, predates this campaign) with a shape that closely
-- matches spec §17's target (`snapshot_id`, `template_version`, `artifact_hashes`,
-- `manifest_hash`, `signing_key_ref`, `signature`) — but a repo-wide grep confirms zero
-- application code anywhere reads or writes it. This is the exact same "schema built as
-- groundwork, never wired up" pattern as G-05's `owner_scope` column. This migration extends
-- that existing table (real FK columns added additively) rather than creating a conflicting
-- duplicate — an earlier draft of this migration tried `create table if not exists
-- export_manifests (...)` with a different shape, which Postgres silently no-op'd against the
-- already-existing table (per `if not exists` semantics) and then failed on a later `create
-- index` referencing a column that consequently never existed. Caught via the failed
-- migration's own error, not assumed away.
--
-- Scoping decision (documented per the standing instruction to make the smallest correct
-- decision when the two source documents don't fully settle something): spec §3 names
-- "object bytes in S3-compatible vault" as the target architecture. A repo-wide grep found
-- zero object-storage integration anywhere in this codebase today — not for reports, not for
-- evidence (`evidence_objects.storage_uri` is likewise just an optional caller-supplied string,
-- never actually written by an upload pipeline). Building real S3/MinIO integration is a
-- separate infrastructure project, not database schema remediation. Given assessment reports
-- are modest-sized documents (KBs, not GBs), this migration persists the actual rendered bytes
-- directly in Postgres (`bytea`) — a legitimate, defensible choice for this data shape and
-- scale, and one that fully closes the specific defect named ("serve a frozen artifact instead
-- of re-rendering on every download"). Migrating to real object storage later is additive
-- (add a storage_uri-based path, backfill, cut over, drop the bytea column) and does not
-- require revisiting this decision's correctness today.
--
-- Real cryptographic signing (KMS/HSM-backed, per spec §21/§22) is likewise not built anywhere
-- in this codebase (no KMS/HSM client integration exists; `encryption_key_records` is an
-- inventory/reference table only). `export_manifests.signature`/`signing_key_ref` already exist
-- as plain text columns from 0007; this migration adds a real `signing_key_id` FK alongside the
-- existing text ref (so the shape is correct and query-ready) but the application populates it
-- with a local SHA-256-based manifest hash rather than a real asymmetric signature — honestly
-- weaker than spec's target, and named here rather than glossed over. Wiring a real KMS signer
-- is a separate, later piece of work.
--
-- Migration discipline (spec §24): pure "Expand". `report_exports` and `export_manifests` both
-- gain new nullable columns only; every existing column and existing row on both tables is
-- untouched. `report_templates` is the one genuinely new table. Application code (this same
-- remediation pass) starts populating the new columns for every *new* export request;
-- pre-existing exports keep working via the legacy re-render path (dual-operate) since they
-- have no persisted bytes to serve.

create table if not exists report_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  template_key text not null,
  template_version text not null,
  format text not null check (format in ('pdf', 'xlsx')),
  renderer_version text not null,
  checksum text not null,
  status text not null default 'active' check (status in ('active', 'deprecated')),
  classification cybernara_classification not null default 'confidential',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, template_key, template_version, format)
);

-- report_exports gains: a real FK to the immutable assessment_snapshots root this export was
-- generated from (G-01, migration 0013 — replacing the bare `snapshot_id` text column's
-- informal match against assessment.controlSnapshotVersion with an actual referential link,
-- additively — the text column stays exactly as it was for every existing row/reader),
-- a real FK to report_templates, the frozen artifact bytes themselves, a signature placeholder,
-- and the timestamp the frozen artifact was finalized.
alter table report_exports add column if not exists assessment_snapshot_id uuid references assessment_snapshots(id);
alter table report_exports add column if not exists report_template_id uuid references report_templates(id);
alter table report_exports add column if not exists artifact_bytes bytea;
alter table report_exports add column if not exists signature text;
alter table report_exports add column if not exists completed_at timestamptz;

-- export_manifests (pre-existing, see header comment) gains a real FK to the specific export it
-- certifies, a real FK to the signing key inventory alongside the existing text `signing_key_ref`,
-- and an append-only guarantee it never had before (safe to add now: zero application code
-- writes to this table today, so there is no existing behavior to break).
alter table export_manifests add column if not exists report_export_id uuid references report_exports(id);
alter table export_manifests add column if not exists signing_key_id uuid references encryption_key_records(id);

create index if not exists idx_report_templates_key on report_templates(tenant_id, template_key, status);
create index if not exists idx_report_exports_snapshot on report_exports(tenant_id, assessment_snapshot_id);
create index if not exists idx_report_exports_template on report_exports(tenant_id, report_template_id);
create index if not exists idx_export_manifests_report_export on export_manifests(tenant_id, report_export_id);

alter table report_templates enable row level security;

create policy report_templates_tenant_isolation on report_templates
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy report_templates_app_context_isolation on report_templates
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on report_templates to app_runtime;

-- FORCE ROW LEVEL SECURITY applied immediately at creation time for report_templates (zero
-- rows, zero existing owner-connection traffic to break; G-10's cutover is already complete —
-- see 0013's identical reasoning for why this is safe to do now rather than deferred).
-- export_manifests already has FORCE RLS from 0012_g10_force_rls.sql; not touched again here.
alter table report_templates force row level security;

-- Append-only enforcement for export_manifests, newly added (see header comment — this table
-- predates this migration but has never been written to by application code, so adding this
-- guarantee now breaks nothing).
create or replace function prevent_export_manifest_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'export_manifests is append-only';
end;
$$;

drop trigger if exists trg_prevent_export_manifest_mutation on export_manifests;
create trigger trg_prevent_export_manifest_mutation
  before update or delete on export_manifests
  for each row execute function prevent_export_manifest_mutation();
