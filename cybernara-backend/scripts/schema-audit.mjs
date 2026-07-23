import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { URL } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const migrationDir = path.resolve("supabase/migrations");
const moduleByMigration = new Map([
  ["0001_m0_foundations.sql", "M0 IdentityTenant/AuditSecurity/Outbox"],
  ["0002_m1_framework_content.sql", "FrameworkContent/Harmonization"],
  ["0003_m2_assessment_core.sql", "Assessment/EvidenceAssurance/RiskWorkflow/ReportingAnalytics"],
  ["0004_m3_ai_orchestration.sql", "AIOrchestration"],
  ["0005_m4_integration_platform.sql", "IntegrationPlatform"],
  ["0006_m5_privacy_enterprise_grc.sql", "PrivacyOperations/EnterpriseGRC"],
  ["0007_m6_platform_hardening.sql", "PlatformHardening"],
  ["0008_g10_rls_foundation.sql", "SchemaRemediation G-10 (RLS foundation)"],
  ["0009_g02_g05_integrity_and_catalog_scope.sql", "SchemaRemediation G-02/G-05 (FK + catalog scope)"],
  ["0010_g03_risk_acceptances.sql", "SchemaRemediation G-03 (risk acceptance)"],
  ["0011_g10_app_runtime_password_rotation.sql", "SchemaRemediation G-10 (password rotation)"],
  ["0012_g10_force_rls.sql", "SchemaRemediation G-10 (FORCE RLS)"],
  ["0013_g01_assessment_execution_normalization.sql", "SchemaRemediation G-01 (assessment execution)"],
  ["0014_g04_report_immutability.sql", "SchemaRemediation G-04 (report immutability)"],
  ["0015_g04_export_manifest_payload_column.sql", "SchemaRemediation G-04 (report immutability)"],
  ["0016_g04_export_manifest_signed_at_column.sql", "SchemaRemediation G-04 (report immutability)"],
  ["0017_g01_completion_remaining_tables.sql", "SchemaRemediation G-01 (assessment execution completion)"],
  ["0018_g01_framework_requirements_stable_ids.sql", "SchemaRemediation G-01 (stable requirement ids)"],
  ["0019_g09_enterprise_grc_risk_register.sql", "SchemaRemediation G-09 (risk register + GRC depth Phase 1)"],
  ["0020_g06_ai_provenance_lineage.sql", "SchemaRemediation G-06 (AI provenance lineage Phase 1)"],
  ["0021_g07_evidence_graph.sql", "SchemaRemediation G-07 (evidence graph)"],
  ["0022_g08_privacy_normalization.sql", "SchemaRemediation G-08 (privacy normalization)"],
  ["0023_g12_retention_deletion.sql", "SchemaRemediation G-12 (retention and deletion)"],
  ["0024_g11_audit_hash_chain_hardening.sql", "SchemaRemediation G-11 (audit hash chain hardening)"],
  ["0025_g13_custom_platform.sql", "SchemaRemediation G-13 (custom platform metadata)"],
  ["0026_g01_constrain_execution_graph_not_null.sql", "SchemaRemediation G-01 (pinned execution graph null constrain)"],
  ["0027_g01_contract_annotate_legacy_columns.sql", "SchemaRemediation G-01 (pinned execution graph legacy annotations)"],
  ["0028_g03_findings_test_result_source.sql", "SchemaRemediation G-03 (findings test result source link)"],
  ["0029_g05_target_catalog_expand.sql", "SchemaRemediation G-05 (normalized frameworks catalog expansion)"],
  ["0030_g05_target_catalog_backfill.sql", "SchemaRemediation G-05 (normalized frameworks backfill)"],
  ["0031_g05_constrain_and_global_rls.sql", "SchemaRemediation G-05 (normalized frameworks global rls constraints)"],
  ["0032_g05_triggers.sql", "SchemaRemediation G-05 (normalized frameworks sync triggers)"],
  ["0033_phase12_universal_tasks.sql", "SchemaRemediation Phase 12 (universal tasks)"],
  ["0034_phase16_framework_update_impact.sql", "SchemaRemediation Phase 16 (framework update impacts)"],
  ["0035_phase14_performance_indexes.sql", "SchemaRemediation G-14 (performance indexes)"],
  ["0036_phase17_freeze_legacy_tables.sql", "SchemaRemediation Phase 17 (legacy write freeze)"],
  ["0037_phase17_universal_tasks_framework_update_impact.sql", "SchemaRemediation Phase 17 (tasks/framework update constraints)"],
  ["0038_phase18_normalized_framework_publish.sql", "SchemaRemediation Phase 18 (normalized framework publish cutover)"],
  ["0039_phase18_remediation_task_guard_grant.sql", "SchemaRemediation Phase 18 (remediation task guard grant)"]
]);

const contentSeedTables = [
  "content_source_packages",
  "framework_content_packs",
  "framework_requirements",
  "harmonized_controls",
  "control_mappings",
  "content_rejected_records"
];

if (!process.env.SUPABASE_DB_URL) {
  console.error("SUPABASE_DB_URL is not set.");
  process.exit(1);
}

const files = (await readdir(migrationDir)).filter((file) => file.endsWith(".sql")).sort();
const migrations = [];
let dynamicContextPolicies = [];
for (const file of files) {
  const sql = await readFile(path.join(migrationDir, file), "utf8");
  migrations.push({
    file,
    version: file.replace(/_.+$/, ""),
    module: moduleByMigration.get(file) ?? "Unmapped",
    tables: matches(sql, /create table if not exists\s+([a-z_]+)/gi),
    indexes: matches(sql, /create index if not exists\s+([a-z_]+)/gi),
    // Literal `create policy` statements only. Migration 0008 additionally
    // creates one policy per tenant table via a dynamic `execute
    // format(...)` loop (see extractDynamicContextPolicies below) — those
    // are invisible to this regex by construction, since the policy name
    // never appears as a literal `create policy <name>` string.
    policies: matches(sql, /create policy\s+([a-z_]+)/gi),
    triggers: matches(sql, /create trigger\s+([a-z_]+)/gi),
    functions: matches(sql, /create (?:or replace )?function\s+([a-z_]+)/gi)
  });
  if (file === "0008_g10_rls_foundation.sql") {
    dynamicContextPolicies = extractDynamicContextPolicies(sql, file);
  }
}

const client = new pg.Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  const migrationHistory = await getMigrationHistory(client);
  const expectedTables = migrations.flatMap((migration) =>
    migration.tables.map((table) => ({ table, module: migration.module, migration: migration.file }))
  );
  const expectedIndexes = expectedObjects("indexes");
  const expectedPolicies = [...expectedObjects("policies"), ...dynamicContextPolicies];
  const expectedTriggers = expectedObjects("triggers");
  const expectedFunctions = expectedObjects("functions");
  const tableNames = expectedTables.map((entry) => entry.table);
  const tableStatus = await getTableStatus(client, tableNames);
  const namedObjectStatus = {
    indexes: await getNamedObjectStatus(client, "index", expectedIndexes),
    policies: await getNamedObjectStatus(client, "policy", expectedPolicies),
    triggers: await getNamedObjectStatus(client, "trigger", expectedTriggers),
    functions: await getNamedObjectStatus(client, "function", expectedFunctions)
  };
  const rowCounts = await getRowCounts(client, tableNames);
  const seedCounts = Object.fromEntries(
    Object.entries(rowCounts).filter(([table]) => contentSeedTables.includes(table))
  );
  const appRuntimeRole = await getAppRuntimeRoleStatus(client);
  const appRuntimeRoleIssues = [];
  if (!appRuntimeRole.exists) {
    appRuntimeRoleIssues.push("app_runtime role does not exist (expected since migration 0008_g10_rls_foundation.sql)");
  } else {
    if (!appRuntimeRole.canLogin) appRuntimeRoleIssues.push("app_runtime cannot log in");
    if (appRuntimeRole.bypassRls) appRuntimeRoleIssues.push("app_runtime has BYPASSRLS — this defeats the entire G-10 fix");
    if (appRuntimeRole.isSuperuser) appRuntimeRoleIssues.push("app_runtime is a superuser — this defeats the entire G-10 fix");
  }
  const schemaDiffs = {
    missingTables: expectedTables.filter((entry) => !tableStatus[entry.table]?.exists),
    tablesWithoutRls: expectedTables.filter((entry) => !tableStatus[entry.table]?.rlsEnabled),
    missingIndexes: namedObjectStatus.indexes.missing,
    missingPolicies: namedObjectStatus.policies.missing,
    missingTriggers: namedObjectStatus.triggers.missing,
    missingFunctions: namedObjectStatus.functions.missing,
    appRuntimeRoleIssues
  };
  const schemaDiffCount = Object.values(schemaDiffs).reduce((count, entries) => count + entries.length, 0);
  const forceRlsEnabledCount = expectedTables.filter((entry) => tableStatus[entry.table]?.forceRlsEnabled).length;

  console.log(
    JSON.stringify(
      {
        target: {
          host: new URL(process.env.SUPABASE_DB_URL).hostname,
          database: new URL(process.env.SUPABASE_DB_URL).pathname.replace("/", "")
        },
        localMigrations: migrations,
        migrationHistory,
        requiredObjectSummary: {
          tables: {
            expected: expectedTables.length,
            found: expectedTables.length - schemaDiffs.missingTables.length,
            rlsEnabled: expectedTables.length - schemaDiffs.tablesWithoutRls.length,
            // Deliberately expected to be 0 today: FORCE ROW LEVEL SECURITY
            // is a "Constrain" stage action per spec §24, applied only after
            // the app connection cutover off the table-owning `postgres`
            // role (tracked in docs/schema-remediation-report.md). A nonzero
            // value here before that cutover would mean some table now
            // denies the owning application entirely.
            forceRlsEnabled: forceRlsEnabledCount
          },
          indexes: namedObjectStatus.indexes.summary,
          policies: namedObjectStatus.policies.summary,
          triggers: namedObjectStatus.triggers.summary,
          functions: namedObjectStatus.functions.summary,
          unexpectedDiffCount: schemaDiffCount
        },
        schemaDiffs,
        appRuntimeRole,
        expectedTables: expectedTables.map((entry) => ({
          ...entry,
          exists: tableStatus[entry.table]?.exists ?? false,
          rlsEnabled: tableStatus[entry.table]?.rlsEnabled ?? false,
          forceRlsEnabled: tableStatus[entry.table]?.forceRlsEnabled ?? false,
          indexCount: tableStatus[entry.table]?.indexCount ?? 0,
          policyCount: tableStatus[entry.table]?.policyCount ?? 0,
          triggerCount: tableStatus[entry.table]?.triggerCount ?? 0,
          rowCount: rowCounts[entry.table] ?? null
        })),
        seedCounts
      },
      null,
      2
    )
  );
} finally {
  await client.end().catch(() => undefined);
}

// Migration 0008 builds one policy name per tenant table at runtime via
// `execute format('create policy %I on %I ...', tbl || '_app_context_isolation', tbl)`
// inside a `do $$ ... foreach tbl in array tenant_tables loop ... $$` block.
// The literal-`create policy` regex above cannot see these — this parses the
// `tenant_tables text[] := array[...]` literal directly out of the migration
// source so the audit can still assert every one of those ~58 policies
// actually exists in the live database (this is the G-14 tracking gap: schema
// drift in dynamically-created objects was previously invisible to this
// script).
function extractDynamicContextPolicies(sql, file) {
  const arrayMatch = /tenant_tables\s+text\[\]\s*:=\s*array\[([\s\S]*?)\];/i.exec(sql);
  if (!arrayMatch) {
    return [];
  }
  const tableNames = [...arrayMatch[1].matchAll(/'([a-z_]+)'/g)].map((match) => match[1]);
  return tableNames.map((table) => ({
    name: `${table}_app_context_isolation`,
    module: moduleByMigration.get(file) ?? "Unmapped",
    migration: file
  }));
}

function matches(sql, pattern) {
  const values = [];
  let match;
  while ((match = pattern.exec(sql))) {
    values.push(match[1]);
  }
  return values;
}

function expectedObjects(kind) {
  return migrations.flatMap((migration) =>
    migration[kind].map((name) => ({ name, module: migration.module, migration: migration.file }))
  );
}

async function getMigrationHistory(client) {
  const exists = await client.query(
    `select to_regclass('supabase_migrations.schema_migrations') as table_name`
  );
  if (!exists.rows[0]?.table_name) {
    return { tableExists: false, appliedVersions: [] };
  }

  const columns = await client.query(
    `select column_name
       from information_schema.columns
      where table_schema = 'supabase_migrations'
        and table_name = 'schema_migrations'`
  );
  const columnNames = new Set(columns.rows.map((row) => row.column_name));
  const timestampColumn = ["applied_at", "executed_at", "created_at", "inserted_at"].find((column) =>
    columnNames.has(column)
  );
  const timestampSelect = timestampColumn ? `${quoteIdent(timestampColumn)} as applied_at` : "null as applied_at";
  const nameSelect = columnNames.has("name") ? "name" : "null as name";
  const result = await client.query(
    `select version, ${nameSelect}, ${timestampSelect}
       from supabase_migrations.schema_migrations
      order by version`
  );

  return {
    tableExists: true,
    appliedVersions: result.rows.map((row) => ({
      version: String(row.version),
      name: row.name ?? null,
      appliedAt: row.applied_at ?? null
    }))
  };
}

async function getTableStatus(client, tableNames) {
  if (tableNames.length === 0) {
    return {};
  }
  const result = await client.query(
    `
      select
        c.relname as table_name,
        c.relrowsecurity as rls_enabled,
        c.relforcerowsecurity as force_rls_enabled,
        (select count(*)::int from pg_indexes i where i.schemaname = 'public' and i.tablename = c.relname) as index_count,
        (select count(*)::int from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policy_count,
        (select count(*)::int from pg_trigger t where t.tgrelid = c.oid and not t.tgisinternal) as trigger_count
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and c.relname = any($1::text[])
      order by c.relname
    `,
    [tableNames]
  );

  const status = Object.fromEntries(
    tableNames.map((table) => [
      table,
      { exists: false, rlsEnabled: false, forceRlsEnabled: false, indexCount: 0, policyCount: 0, triggerCount: 0 }
    ])
  );
  for (const row of result.rows) {
    status[row.table_name] = {
      exists: true,
      rlsEnabled: Boolean(row.rls_enabled),
      forceRlsEnabled: Boolean(row.force_rls_enabled),
      indexCount: Number(row.index_count),
      policyCount: Number(row.policy_count),
      triggerCount: Number(row.trigger_count)
    };
  }
  return status;
}

// G-10 follow-up visibility: reports whether the non-owner `app_runtime` role
// from migration 0008 exists with the properties the migration created it
// with (login-capable, cannot bypass RLS, not a superuser), plus its
// session-level statement/idle timeouts. This does not fail the audit by
// itself — the role is expected to exist only after 0008 has been applied —
// but it surfaces a security regression immediately if the role is ever
// dropped, recreated with BYPASSRLS, or granted superuser.
async function getAppRuntimeRoleStatus(client) {
  const result = await client.query(
    `
      select rolname, rolcanlogin, rolbypassrls, rolsuper, rolinherit
        from pg_roles
       where rolname = 'app_runtime'
    `
  );
  if (result.rows.length === 0) {
    return { exists: false };
  }
  const role = result.rows[0];
  const settings = await client.query(
    `
      select unnest(setconfig) as setting
        from pg_db_role_setting s
        join pg_roles r on r.oid = s.setrole
       where r.rolname = 'app_runtime'
    `
  );
  return {
    exists: true,
    canLogin: Boolean(role.rolcanlogin),
    bypassRls: Boolean(role.rolbypassrls),
    isSuperuser: Boolean(role.rolsuper),
    inherit: Boolean(role.rolinherit),
    sessionSettings: settings.rows.map((row) => row.setting)
  };
}

async function getNamedObjectStatus(client, kind, expectedObjects) {
  if (expectedObjects.length === 0) {
    return { summary: { expected: 0, found: 0, missing: 0 }, missing: [] };
  }

  const expectedNames = expectedObjects.map((entry) => entry.name);
  const result = await client.query(namedObjectQuery(kind), [expectedNames]);
  const foundNames = new Set(result.rows.map((row) => row.name));
  const missing = expectedObjects.filter((entry) => !foundNames.has(entry.name));

  return {
    summary: {
      expected: expectedObjects.length,
      found: expectedObjects.length - missing.length,
      missing: missing.length
    },
    missing
  };
}

function namedObjectQuery(kind) {
  if (kind === "index") {
    return `select indexname as name from pg_indexes where schemaname = 'public' and indexname = any($1::text[])`;
  }
  if (kind === "policy") {
    return `select policyname as name from pg_policies where schemaname = 'public' and policyname = any($1::text[])`;
  }
  if (kind === "trigger") {
    return `
      select t.tgname as name
        from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and not t.tgisinternal
         and t.tgname = any($1::text[])
    `;
  }
  if (kind === "function") {
    return `
      select p.proname as name
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.proname = any($1::text[])
    `;
  }
  throw new Error(`Unsupported object kind: ${kind}`);
}

async function getRowCounts(client, tableNames) {
  const counts = {};
  for (const table of tableNames) {
    const exists = await client.query(`select to_regclass($1) as table_name`, [`public.${table}`]);
    if (!exists.rows[0]?.table_name) {
      counts[table] = null;
      continue;
    }
    const result = await client.query(`select count(*)::bigint as count from public.${quoteIdent(table)}`);
    counts[table] = Number(result.rows[0].count);
  }
  return counts;
}

function quoteIdent(value) {
  return `"${value.replaceAll('"', '""')}"`;
}
