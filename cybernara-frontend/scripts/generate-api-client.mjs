import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildClientSource } from "./api-client-generator.mjs";

const fallback = "../cybernara-backend/openapi/cybernara.openapi.json";
const specPath = process.env.BACKEND_OPENAPI_PATH || fallback;
const resolvedSpecPath = path.resolve(specPath);

const spec = JSON.parse(await readFile(resolvedSpecPath, "utf8"));
const source = buildClientSource(spec);

await mkdir("src/lib/api", { recursive: true });
await writeFile("src/lib/api/generated.ts", source);

console.log(`Generated API client from ${resolvedSpecPath}`);

