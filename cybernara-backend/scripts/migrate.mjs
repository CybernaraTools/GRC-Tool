import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const dryRun = process.argv.includes("--dry-run");
const migrationDir = path.resolve("supabase/migrations");

if (!process.env.SUPABASE_DB_URL) {
  console.error("SUPABASE_DB_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  if (!dryRun) {
    await ensureMigrationTable(client);
  }

  const files = (await readdir(migrationDir)).filter((file) => file.endsWith(".sql")).sort();
  const applied = await getAppliedVersions(client);
  const pending = files
    .map((file) => ({ file, version: versionFromFile(file), name: nameFromFile(file) }))
    .filter((migration) => !applied.has(migration.version));

  if (dryRun) {
    if (pending.length === 0) {
      console.log("No pending migrations.");
    } else {
      console.log("Pending migrations:");
      for (const migration of pending) {
        console.log(`- ${migration.file}`);
      }
    }
  } else if (pending.length === 0) {
    console.log("No pending migrations.");
  } else {
    for (const migration of pending) {
      await applyMigration(client, migration);
    }
  }
} finally {
  await client.end().catch(() => undefined);
}

async function ensureMigrationTable(client) {
  await client.query(`
    create schema if not exists supabase_migrations;

    create table if not exists supabase_migrations.schema_migrations (
      version text primary key,
      name text,
      applied_at timestamptz default now()
    );
  `);
}

async function getAppliedVersions(client) {
  const exists = await client.query(
    `select to_regclass('supabase_migrations.schema_migrations') as table_name`
  );
  if (!exists.rows[0]?.table_name) {
    return new Set();
  }

  const result = await client.query(
    `select version from supabase_migrations.schema_migrations order by version`
  );
  return new Set(result.rows.map((row) => String(row.version)));
}

async function applyMigration(client, migration) {
  const rawSql = await readFile(path.join(migrationDir, migration.file), "utf8");
  const sql = substituteSecrets(rawSql, migration.file);
  console.log(`Applying ${migration.file}...`);

  try {
    await client.query("begin");
    await client.query(sql);
    await client.query(
      `insert into supabase_migrations.schema_migrations (version, name)
       values ($1, $2)`,
      [migration.version, migration.name]
    );
    await client.query("commit");
    console.log(`Applied ${migration.file}.`);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    console.error(`Migration failed: ${migration.file}`);
    console.error(error);
    process.exit(1);
  }
}

// Substitutes `%%ENV_VAR_NAME%%` placeholder tokens in migration SQL with the value of the
// matching environment variable, so secrets (e.g. role passwords) never need to be
// committed to a migration file in plaintext. Fails loudly rather than silently applying
// an empty/missing secret if a placeholder's environment variable isn't set.
function substituteSecrets(sql, fileName) {
  const placeholderPattern = /%%([A-Z][A-Z0-9_]*)%%/g;
  return sql.replace(placeholderPattern, (match, envVarName) => {
    const value = process.env[envVarName];
    if (!value) {
      console.error(
        `Migration ${fileName} references %%${envVarName}%%, but the ${envVarName} environment variable is not set.`
      );
      process.exit(1);
    }
    return value;
  });
}

function versionFromFile(file) {
  return file.replace(/_.+$/, "").replace(/\.sql$/, "");
}

function nameFromFile(file) {
  return file.replace(/^[0-9]+_/, "").replace(/\.sql$/, "");
}
