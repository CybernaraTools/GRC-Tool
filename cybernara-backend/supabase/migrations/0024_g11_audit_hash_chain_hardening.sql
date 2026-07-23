-- Gap remediation — G-11 (audit hash chain).
--
-- Gap report's exact sentence (both source PDFs re-read fresh before starting this gap): "Previous-
-- hash model lacks documented per-tenant ordering and concurrency strategy. Add monotonic sequence,
-- chain partition, unique constraints, signing checkpoints and verifier results." Traceability SEC-03.
-- Spec §17 (Reporting, Audit, and Platform) names the target tables: `audit_events` (already exists,
-- migration 0001), `audit_checkpoints` (new), `audit_verifications` (new). Spec §21 ("Audit Chain and
-- Tamper Evidence") describes the required behavior in full:
--   "Allocate sequence under advisory/row lock per chain_partition; unique(chain_partition, sequence)
--    prevents forks. event_hash covers canonical event bytes, previous_hash, sequence and partition.
--    Canonical serialization and hash version are stored. Periodically sign checkpoint root hashes
--    with KMS/HSM key... Verifier independently recomputes chain and signature and writes
--    audit_verifications. Verification failure raises a critical security alert."
--
-- What already existed (confirmed by reading 0001_m0_foundations.sql before touching anything): a
-- `sequence bigint generated always as identity` column with `unique(tenant_id, sequence)`, and
-- `previous_hash`/`event_hash` columns computed by `computeAuditHash()`
-- (src/modules/audit-security/domain/hash-chain.ts). Two real gaps existed underneath the
-- gap-report's one sentence, both fixed here:
-- 1. `sequence` was a single project-wide `generated always as identity` sequence, not a per-
--    partition one — under concurrency, two tenants' events interleave in the sequence numbering,
--    and nothing serializes concurrent `append()` calls for the SAME tenant either:
--    `AuditLogService.append()` reads the latest hash and inserts as two independent
--    `TenantScopedDb.withTenant()` transactions with no lock between them — a real TOCTOU race that
--    can fork the chain for the same tenant under concurrent writers. This is exactly what the gap
--    sentence's "concurrency strategy" phrase names. Fixed by dropping `identity` from `sequence`
--    (metadata-only ALTER, existing values untouched) and moving sequence allocation into the
--    application layer under `pg_advisory_xact_lock(hashtext(chain_partition::text))`, taken inside
--    the SAME transaction that reads the latest hash/sequence and performs the insert.
-- 2. `computeAuditHash()` did not include `sequence` in the hashed payload at all — so a value
--    tampered with at rest (e.g. two rows' sequence values swapped) would not be detected by
--    recomputing the hash. Spec §21 requires event_hash to cover "canonical event bytes,
--    previous_hash, sequence and partition." Fixed in the application layer (not this migration) by
--    extending `computeAuditHash()`'s input to include `sequence` and `chainPartition`. The
--    pre-existing `version integer not null default 1` column (already present on `audit_events`
--    from migration 0001, part of the standard cross-cutting column contract) is repurposed, from
--    this migration forward, to also carry the meaning "hash/canonical-serialization algorithm
--    version" for this specific table — bumped to `2` for newly-inserted rows whose hash covers
--    sequence+partition, leaving pre-migration rows at `1` (their hash legitimately does not cover
--    those fields, and is not recomputed/rewritten — an honest, stated limitation, not a bug).
--
-- Reconciliation and naming decisions (documented, not silently assumed):
-- 1. `chain_partition` is added as `uuid generated always as (tenant_id) stored` — a generated
--    column, so every existing row is backfilled automatically with zero application code changes
--    and it can never drift out of sync with `tenant_id`. Nothing in this codebase does finer-grained
--    partitioning (no monthly/physical partitioning exists anywhere, matching this campaign's
--    established "no opportunistic scope creep" precedent — see G-08's migration header on why
--    `lawful_bases` was simplified rather than inventing an unused parent table). `chain_partition`
--    is therefore, today, always equal to `tenant_id` — but it exists as its own named column (not
--    just an alias in code) so a future finer-partitioning scheme would only need a data migration,
--    not a schema/vocabulary change.
-- 2. The pre-existing `unique(tenant_id, sequence)` constraint from migration 0001 is left untouched
--    (never edit an already-applied migration). A NEW `unique(chain_partition, sequence)` index is
--    added alongside it — logically redundant today since chain_partition = tenant_id, but it is the
--    literal constraint spec §21 names, and keeping both is strictly safer than dropping/altering an
--    existing constraint for no functional gain.
-- 3. `audit_checkpoints`'s "nonoverlap ranges" critical constraint is enforced the same way this
--    campaign has enforced every other "nonoverlap"-labeled constraint so far (G-08's
--    `processing_purposes`/`consent_purposes`, G-12's `retention_assignments`): without a new
--    `btree_gist` extension dependency. Here that means `unique(chain_partition, start_sequence)` +
--    `unique(chain_partition, end_sequence)` + `check(start_sequence <= end_sequence)` as a database
--    safety net, with the actual "next checkpoint must start immediately after the previous one ends"
--    contiguity rule enforced by the checkpoint-creation service under the same
--    `pg_advisory_xact_lock` used for event append (documented in
--    `src/modules/audit-security/application/audit-log.service.ts`).
-- 4. `audit_checkpoints.signature` and `audit_verifications` do not use a real KMS/HSM integration —
--    none exists anywhere in this codebase today (confirmed by inspection: no `encryption_keys` table
--    or KMS client exists). This matches the exact precedent already set and honestly documented for
--    `report_exports.signature` in `0014_g04_report_immutability.sql` / the G-04 section of
--    `reporting-analytics.service.ts` ("a local SHA-256-based placeholder proving the artifact/
--    manifest weren't tampered with after being frozen, not a real asymmetric signature. Named
--    honestly, not presented as more than it is.") — the same honest framing applies here, not a new
--    pattern invented for this gap.
-- 5. Both new tables are append-only (matching spec's own labels: "audit_checkpoints... signed chain
--    checkpoint", "audit_verifications... append-only"), using the same generated-column
--    created_by/created_at trick plus a shared `prevent_audit_chain_mutation()` trigger function,
--    matching the `prevent_assessment_history_mutation()`/`prevent_evidence_graph_mutation()`/
--    `prevent_privacy_ledger_mutation()` precedent from migrations 0013/0021/0022.

alter table audit_events add column if not exists chain_partition uuid generated always as (tenant_id) stored;

alter table audit_events alter column sequence drop identity if exists;

create unique index if not exists idx_audit_events_chain_partition_sequence
  on audit_events(chain_partition, sequence);

-- @append_only
create table if not exists audit_checkpoints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  chain_partition uuid not null,
  start_sequence bigint not null,
  end_sequence bigint not null,
  root_hash text not null,
  signature text not null,
  signed_at timestamptz not null default now(),
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  check (start_sequence <= end_sequence),
  unique (chain_partition, start_sequence),
  unique (chain_partition, end_sequence)
);

create index if not exists idx_audit_checkpoints_chain_partition
  on audit_checkpoints(chain_partition, end_sequence desc);

-- @append_only
create table if not exists audit_verifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  checkpoint_id uuid not null references audit_checkpoints(id),
  verified_at timestamptz not null default now(),
  result text not null check (result in ('pass', 'fail')),
  mismatch_sequence bigint,
  verifier_version text not null,
  classification cybernara_classification not null default 'restricted',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  check (result = 'fail' or mismatch_sequence is null)
);

create index if not exists idx_audit_verifications_checkpoint
  on audit_verifications(checkpoint_id, result);

alter table audit_checkpoints enable row level security;
alter table audit_verifications enable row level security;

create policy audit_checkpoints_tenant_isolation on audit_checkpoints
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy audit_checkpoints_app_context_isolation on audit_checkpoints
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on audit_checkpoints to app_runtime;

create policy audit_verifications_tenant_isolation on audit_verifications
  using (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
  with check (tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''));
create policy audit_verifications_app_context_isolation on audit_verifications
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
grant select, insert, update, delete on audit_verifications to app_runtime;

alter table audit_checkpoints force row level security;
alter table audit_verifications force row level security;

-- Append-only enforcement, shared across this migration's two immutable tables (matching the
-- existing `prevent_assessment_history_mutation()`/`prevent_evidence_graph_mutation()`/
-- `prevent_privacy_ledger_mutation()` precedent from migrations 0013/0021/0022, which reuse one
-- function across several tables via tg_table_name).
create or replace function prevent_audit_chain_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

drop trigger if exists trg_prevent_audit_checkpoints_mutation on audit_checkpoints;
create trigger trg_prevent_audit_checkpoints_mutation
  before update or delete on audit_checkpoints
  for each row execute function prevent_audit_chain_mutation();

drop trigger if exists trg_prevent_audit_verifications_mutation on audit_verifications;
create trigger trg_prevent_audit_verifications_mutation
  before update or delete on audit_verifications
  for each row execute function prevent_audit_chain_mutation();
