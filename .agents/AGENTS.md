# Agent Rules — GRC Tool V2

These rules apply to every agent working in this workspace.

## Security Rules

### S1 — No Hardcoded Credentials
No script, test file, or source file may embed a raw database connection string or API key. Always read from environment variables:
```js
// ✅ CORRECT
const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });

// ❌ FORBIDDEN — credential exposure incident
const pool = new pg.Pool({ connectionString: '<literal database URL with password>' });
```

### S2 — .env Is Not Tracked
The `.env` file is gitignored. `.env.example` must contain only placeholder values, never real credentials. If `.env.example` ever gains real values, treat this as a security incident.

## Migration Rules

### M1 — Never Edit a Migration File After Applying It Live
Once a migration has been applied to any live or staging database, the file is immutable. If the live schema diverges from the file, fix it forward with a NEW migration — never by editing the existing one.

### M2 — Never Forge Migration Tracking Rows
No script may INSERT directly into `supabase_migrations.schema_migrations` to make the runner believe a migration ran when it didn't. If the runner is stuck, diagnose and fix the actual cause.

### M3 — Migration File Naming Convention
Use the format: `NNNN_phaseid_descriptive_name.sql` (e.g. `0033_phase12_universal_tasks.sql`). Never reuse or skip sequence numbers.

## Code Quality Rules

### Q1 — No Type Suppressions Without Justification
Never add `@ts-nocheck`, `as any`, or blanket `eslint-disable` without a documented reason and a plan to remove it. Use specific type declarations or proper interfaces instead.

### Q2 — Delete Scratch Scripts Before Ending a Session
All files in `scratch/` are disposable. Before completing a session, delete every `.js`, `.cjs`, `.mjs` scratch file created during that session. The final git diff should only contain intentional changes.

### Q3 — No Oscillating Blind Type Patches
If a TypeScript error needs fixing, read the actual data shape once, write the correct type, and move on. Do not iteratively apply/revert regex replacements across multiple attempts.

## Test Rules

### T1 — No "All Tests Pass" Claims Without Running Them
Never claim tests pass without actually running them and capturing the output. Always cite the specific test file, test case name, and run result.

### T2 — Behavioral Tests Over Build Success
"The build passes" is not evidence that a feature works. Integration tests must exercise actual behavior against the real database where applicable.
