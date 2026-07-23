import { readFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import path from "node:path";

const migrationDir = path.resolve("supabase/migrations");
const requiredMutableColumns = [
  "tenant_id",
  "version",
  "created_by",
  "created_at",
  "updated_by",
  "updated_at",
  "classification"
];
const violations = [];

const rlsEnabledTables = new Map(); // table -> file that enabled RLS
const appContextCoveredTables = new Set(); // tables with a dedicated app-context policy (literal or dynamic)
let allSql = "";

for (const file of readdirSync(migrationDir).filter((name) => name.endsWith(".sql")).sort()) {
  const sql = await readFile(path.join(migrationDir, file), "utf8");
  allSql += `\n-- ${file}\n${sql}`;
  const createTablePattern = /(--)?.*?create table if not exists\s+([a-z_]+)\s*\(([\s\S]*?)\n\);/gi;
  let match;
  while ((match = createTablePattern.exec(sql))) {
    const prefix = sql.slice(Math.max(0, match.index - 80), match.index);
    const table = match[2];
    const body = match[3].toLowerCase();
    const appendOnly = prefix.includes("@append_only");
    const platformScope = prefix.includes("@platform_scope");

    if (!appendOnly) {
      for (const column of requiredMutableColumns) {
        if (platformScope && column === "tenant_id") {
          continue;
        }
        if (!new RegExp(`\\b${column}\\b`).test(body)) {
          violations.push(`${file}: ${table} missing ${column}`);
        }
      }
    }

    if (!new RegExp(`alter table\\s+${table}\\s+enable row level security`, "i").test(sql)) {
      violations.push(`${file}: ${table} does not enable RLS`);
    } else {
      rlsEnabledTables.set(table, file);
    }
  }

  // Tables covered by a literal app-context policy in this file (e.g. the
  // audit_events read/append policies, or 0010's risk_acceptances policies).
  for (const policyMatch of sql.matchAll(/create policy\s+[a-z_]+\s+on\s+([a-z_]+)[\s\S]*?app_current_tenant/gi)) {
    appContextCoveredTables.add(policyMatch[1]);
  }
}

// G-14 (partial) drift guard: migration 0008 grants every "tenant table" an
// app-context RLS policy via a dynamic `execute format(...)` loop over a
// literal `tenant_tables text[] := array[...]` list, rather than one `create
// policy` statement per table. That means a future migration can add a new
// RLS-enabled tenant table and silently end up with NO app-context policy
// (only the legacy, permanently-inert auth.jwt() one) if nobody remembers to
// also add it to that array or give it its own dedicated policy — exactly
// the kind of drift that made G-10 possible in the first place. This check
// makes that failure mode loud instead of silent.
const tenantTablesMatch = /tenant_tables\s+text\[\]\s*:=\s*array\[([\s\S]*?)\];/i.exec(allSql);
const dynamicallyCoveredTables = new Set(
  tenantTablesMatch ? [...tenantTablesMatch[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]) : []
);
for (const [table, file] of rlsEnabledTables) {
  const platformScopedCreate = new RegExp(`@platform_scope[\\s\\S]{0,160}create table if not exists\\s+${table}\\b`, "i");
  if (platformScopedCreate.test(allSql)) {
    continue;
  }
  if (!dynamicallyCoveredTables.has(table) && !appContextCoveredTables.has(table)) {
    violations.push(
      `${file}: ${table} enables RLS but has no app-context policy (not in 0008's tenant_tables array and no dedicated app_current_tenant() policy) — it will be unreachable once the app cuts over to the app_runtime role`
    );
  }
}
for (const table of dynamicallyCoveredTables) {
  if (!rlsEnabledTables.has(table)) {
    violations.push(`0008_g10_rls_foundation.sql: tenant_tables references '${table}', but no migration creates that table with RLS enabled`);
  }
}

if (violations.length > 0) {
  console.error("Migration convention violations:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Migration convention check passed.");

