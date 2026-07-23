import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

if (!process.env.SUPABASE_DB_URL) {
  console.error("SUPABASE_DB_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

const outputDir = path.resolve("../schema-inventory");

async function main() {
  await mkdir(outputDir, { recursive: true });
  await client.connect();

  console.log("Connected to database. Fetching inventory...");

  try {
    // 1. Table list with row counts
    console.log("Fetching table list...");
    const tablesRes = await client.query(`
      select
        t.table_name,
        coalesce(c.reltuples::bigint, 0) as estimated_rows
      from information_schema.tables t
      left join pg_class c on c.relname = t.table_name
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = t.table_schema
      where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
      order by t.table_name
    `);
    
    // Get actual counts for public tables to be precise
    const tablesWithActual = [];
    for (const r of tablesRes.rows) {
      const cntRes = await client.query(`select count(*)::bigint as count from public."${r.table_name}"`);
      tablesWithActual.push({
        table_name: r.table_name,
        row_count: Number(cntRes.rows[0].count)
      });
    }

    await writeFile(
      path.join(outputDir, "tables.md"),
      "# Cybernara Live Tables & Row Counts\n\n" +
      "| Table Name | Row Count |\n|---|---|\n" +
      tablesWithActual.map(t => `| ${t.table_name} | ${t.row_count} |`).join("\n")
    );

    // 2. Columns, types, nullability, defaults
    console.log("Fetching columns...");
    const colsRes = await client.query(`
      select table_name, column_name, data_type, is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public'
      order by table_name, ordinal_position
    `);
    
    let colsMd = "# Cybernara Table Columns\n\n";
    let currentTable = "";
    for (const col of colsRes.rows) {
      if (col.table_name !== currentTable) {
        currentTable = col.table_name;
        colsMd += `\n## Table: ${currentTable}\n\n| Column Name | Data Type | Nullable | Default |\n|---|---|---|---|\n`;
      }
      colsMd += `| ${col.column_name} | ${col.data_type} | ${col.is_nullable} | ${col.column_default ?? "NULL"} |\n`;
    }
    await writeFile(path.join(outputDir, "columns.md"), colsMd);

    // 3. Constraints (PK, FK, UNIQUE, CHECK)
    console.log("Fetching constraints...");
    const constsRes = await client.query(`
      select
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        pg_get_constraintdef(c.oid) as constraint_definition
      from information_schema.table_constraints tc
      join pg_constraint c on c.conname = tc.constraint_name
      join pg_namespace n on n.oid = c.connamespace
      where tc.table_schema = 'public'
      order by tc.table_name, tc.constraint_type, tc.constraint_name
    `);

    let constsMd = "# Cybernara Constraints\n\n";
    let currentConstTable = "";
    for (const c of constsRes.rows) {
      if (c.table_name !== currentConstTable) {
        currentConstTable = c.table_name;
        constsMd += `\n## Table: ${currentConstTable}\n\n| Constraint Name | Type | Definition |\n|---|---|---|\n`;
      }
      constsMd += `| ${c.constraint_name} | ${c.constraint_type} | \`${c.constraint_definition}\` |\n`;
    }
    await writeFile(path.join(outputDir, "constraints.md"), constsMd);

    // 4. Indexes
    console.log("Fetching indexes...");
    const indexesRes = await client.query(`
      select tablename, indexname, indexdef
      from pg_indexes
      where schemaname = 'public'
      order by tablename, indexname
    `);

    let idxMd = "# Cybernara Indexes\n\n";
    let currentIdxTable = "";
    for (const idx of indexesRes.rows) {
      if (idx.tablename !== currentIdxTable) {
        currentIdxTable = idx.tablename;
        idxMd += `\n## Table: ${currentIdxTable}\n\n| Index Name | Definition |\n|---|---|\n`;
      }
      idxMd += `| ${idx.indexname} | \`${idx.indexdef}\` |\n`;
    }
    await writeFile(path.join(outputDir, "indexes.md"), idxMd);

    // 5. RLS Policies and forced row security per table
    console.log("Fetching RLS policies and table RLS status...");
    const rlsStatusRes = await client.query(`
      select
        c.relname as table_name,
        c.relrowsecurity as rls_enabled,
        c.relforcerowsecurity as force_rls_enabled
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
      order by c.relname
    `);

    const policiesRes = await client.query(`
      select tablename, policyname, roles, cmd, qual, with_check
      from pg_policies
      where schemaname = 'public'
      order by tablename, policyname
    `);

    let rlsMd = "# Cybernara Row-Level Security (RLS) Configuration\n\n";
    rlsMd += "## Table RLS Status\n\n| Table Name | RLS Enabled | Force RLS Enabled |\n|---|---|---|\n";
    for (const r of rlsStatusRes.rows) {
      rlsMd += `| ${r.table_name} | ${r.rls_enabled} | ${r.force_rls_enabled} |\n`;
    }

    rlsMd += "\n## RLS Policies Details\n\n";
    let currentRlsTable = "";
    for (const p of policiesRes.rows) {
      if (p.tablename !== currentRlsTable) {
        currentRlsTable = p.tablename;
        rlsMd += `\n### Table: ${currentRlsTable}\n\n| Policy Name | Roles | Command | USING (Qual) | WITH CHECK |\n|---|---|---|---|---|\n`;
      }
      rlsMd += `| ${p.policyname} | ${Array.isArray(p.roles) ? p.roles.join(", ") : String(p.roles)} | ${p.cmd} | \`${p.qual ?? "None"}\` | \`${p.with_check ?? "None"}\` |\n`;
    }
    await writeFile(path.join(outputDir, "rls.md"), rlsMd);

    // 6. Enums
    console.log("Fetching enums...");
    const enumsRes = await client.query(`
      select
        t.typname as enum_name,
        e.enumlabel as enum_value
      from pg_type t
      join pg_enum e on t.oid = e.enumtypid
      join pg_catalog.pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
      order by t.typname, e.enumsortorder
    `);

    let enumsMd = "# Cybernara PostgreSQL Enums\n\n";
    let currentEnum = "";
    for (const e of enumsRes.rows) {
      if (e.enum_name !== currentEnum) {
        currentEnum = e.enum_name;
        enumsMd += `\n### Enum: ${currentEnum}\n\nValues:\n`;
      }
      enumsMd += `- \`${e.enum_value}\`\n`;
    }
    await writeFile(path.join(outputDir, "enums.md"), enumsMd);

    // 7. Views and Materialized Views
    console.log("Fetching views...");
    const viewsRes = await client.query(`
      select table_name, view_definition
      from information_schema.views
      where table_schema = 'public'
      order by table_name
    `);
    const matViewsRes = await client.query(`
      select matviewname, definition
      from pg_matviews
      where schemaname = 'public'
      order by matviewname
    `);

    let viewsMd = "# Cybernara Views & Materialized Views\n\n";
    viewsMd += "## Standard Views\n\n";
    if (viewsRes.rows.length === 0) {
      viewsMd += "*No standard views found.*\n";
    } else {
      for (const v of viewsRes.rows) {
        viewsMd += `### View: ${v.table_name}\n\`\`\`sql\n${v.view_definition}\n\`\`\`\n\n`;
      }
    }

    viewsMd += "\n## Materialized Views\n\n";
    if (matViewsRes.rows.length === 0) {
      viewsMd += "*No materialized views found.*\n";
    } else {
      for (const mv of matViewsRes.rows) {
        viewsMd += `### Materialized View: ${mv.matviewname}\n\`\`\`sql\n${mv.definition}\n\`\`\`\n\n`;
      }
    }
    await writeFile(path.join(outputDir, "views.md"), viewsMd);

    // 8. Functions and Triggers
    console.log("Fetching functions and triggers...");
    const funcsRes = await client.query(`
      select
        p.proname as function_name,
        pg_get_functiondef(p.oid) as function_definition
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
      order by p.proname
    `);

    const triggersRes = await client.query(`
      select
        t.tgname as trigger_name,
        c.relname as table_name,
        pg_get_triggerdef(t.oid) as trigger_definition
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and not t.tgisinternal
      order by c.relname, t.tgname
    `);

    let funcsMd = "# Cybernara Functions & Triggers\n\n";
    funcsMd += "## Database Functions\n\n";
    for (const f of funcsRes.rows) {
      funcsMd += `### Function: ${f.function_name}\n\`\`\`sql\n${f.function_definition}\n\`\`\`\n\n`;
    }

    funcsMd += "\n## Triggers\n\n| Trigger Name | Table Name | Definition |\n|---|---|---|\n";
    for (const tg of triggersRes.rows) {
      funcsMd += `| ${tg.trigger_name} | ${tg.table_name} | \`${tg.trigger_definition}\` |\n`;
    }
    await writeFile(path.join(outputDir, "functions.md"), funcsMd);

    console.log("Inventory generated successfully in schema-inventory/ directory.");
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error("Error generating inventory:", err);
  process.exit(1);
});
