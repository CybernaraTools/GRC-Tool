# Scratch Script Rules — Read Before Writing Any Script

This directory contains throwaway scripts for debugging, backfill runs, and one-off migrations.

## MANDATORY RULES

### 1. No Hardcoded Secrets — Ever

Every script that touches the database MUST read credentials from environment variables:

```js
// ✅ CORRECT
const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) throw new Error('SUPABASE_DB_URL not set — copy .env.example to .env');

// ❌ FORBIDDEN — Will be treated as a security incident
const connectionString = '<literal database URL with password>';
```

### 2. Delete Before Committing

Scratch scripts are not part of the codebase. Before ending a session:
- Delete every `.js`, `.cjs`, `.mjs` file in this directory that was created during the session.
- A clean final diff should contain only intentional source changes, migrations, and tests.

### 3. Do Not Forge Migration Rows

No script may `INSERT INTO supabase_migrations.schema_migrations` to make the runner think a migration already ran. If the runner is stuck, fix the migration file or fix the state mismatch — do not forge rows.

### 4. No `any` Shortcuts

Scratch scripts that generate TypeScript patches must write the correct, specific type based on the actual data shape — not `as any` or blind regex replacements oscillating between `any` / `unknown`.

## Pattern for DB-Accessing Scripts

```js
import { createPool } from '../src/platform/database/...'; // use existing infra
// or
import pg from 'pg';
import 'dotenv/config'; // loads .env automatically

const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });
```
