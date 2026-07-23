# ADR-0001: Backend Data Access

Status: Accepted

## Context

M0 uses Supabase-hosted PostgreSQL as the system of record and Supabase Storage/Auth as platform services. The engineering requirements require clean architecture, module-owned repositories, policy enforcement, and PostgreSQL constraints/RLS as defense in depth.

## Decision

Use direct PostgreSQL access through `pg` for authoritative domain repositories and migrations. Use `@supabase/supabase-js` only for Supabase Auth and Storage platform operations where Supabase APIs are the contract.

## Consequences

- Domain/application code depends on repository ports, not provider SDKs.
- SQL migrations remain explicit and reviewable.
- Supabase Auth can issue identity/session credentials while Cybernara owns authorization and grants.
- Storage bucket policy work remains a platform adapter concern for M2 evidence and report artifacts.

