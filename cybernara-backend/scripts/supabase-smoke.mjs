import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();
const { Client } = pg;

const required = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_URL",
  "OPENAI_API_KEY"
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
  process.exit(1);
}

const pgClient = new Client({ connectionString: process.env.SUPABASE_DB_URL });
await pgClient.connect();
const dbResult = await pgClient.query("select 1 as ok");
await pgClient.end();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
const buckets = await supabase.storage.listBuckets();

if (buckets.error) {
  throw buckets.error;
}

console.log(
  JSON.stringify({
    postgres: dbResult.rows[0].ok === 1 ? "ok" : "unexpected",
    storage: "ok",
    bucketCount: buckets.data.length
  })
);
