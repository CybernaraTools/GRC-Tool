import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildClientSource } from "./api-client-generator.mjs";

const fallback = "../cybernara-backend/openapi/cybernara.openapi.json";
const specPath = process.env.BACKEND_OPENAPI_PATH || fallback;
const spec = JSON.parse(await readFile(path.resolve(specPath), "utf8"));
const expected = buildClientSource(spec);
const actual = await readFile("src/lib/api/generated.ts", "utf8");

if (actual !== expected) {
  console.error("Generated API client is stale. Run npm run contract:generate.");
  process.exit(1);
}

console.log("Generated API client is current.");
