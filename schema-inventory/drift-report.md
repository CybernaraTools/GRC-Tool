# Cybernara Schema Drift Report

This report reconciles the local migration history in the `cybernara-backend/supabase/migrations` directory against the live schema of the Supabase PostgreSQL database.

## Summary

- **Local Migrations**: 30 migration files found (`0001_m0_foundations.sql` through `0030_g05_target_catalog_backfill.sql`).
- **Applied Migrations**: 29 migrations have been applied.
- **Pending Migrations**: 1 migration (`0030_g05_target_catalog_backfill.sql`) is pending.
- **Unexpected Schema Drift**: **0 unexpected differences** found between the database and the migration files up to version `0029`.

## Verification Details

The schema audit script (`node scripts/schema-audit.mjs`) was executed to match all expected database objects (tables, indexes, policies, triggers, and functions) against the live database:

- **Tables**: 147 expected, 147 found.
- **Row-Level Security (RLS)**: Enabled and forced on all 147 tables.
- **Indexes**: 127 expected, 127 found.
- **Policies**: 295 expected, 295 found (including dynamic context policies).
- **Triggers**: 19 expected, 19 found.
- **Functions**: 14 expected, 14 found.
- **App Runtime Role**: Role `app_runtime` exists, is login-capable, cannot bypass RLS, is not a superuser, and has the correct transaction timeouts.

## Discrepancies & Deferred Migrations

### Pending Migration: `0030_g05_target_catalog_backfill.sql`
- **Status**: Not applied.
- **Issue**: Attempting to run this migration fails with:
  ```
  error: null value in column "title" of relation "control_subcontrols" violates not-null constraint
  ```
- **Root Cause**: The SQL script inserts `req.sub_control_title` into the `title` column of `control_subcontrols`. However, `req.sub_control_title` can be `null` in `framework_requirements`. The `control_subcontrols.title` column is defined as `NOT NULL`.
- **Remediation**: The select statement needs to fallback to `req.sub_control_id` if `sub_control_title` is null, using:
  ```sql
  coalesce(req.sub_control_title, req.sub_control_id) as title
  ```
