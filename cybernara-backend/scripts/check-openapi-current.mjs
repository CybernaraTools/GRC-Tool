import { readFile } from "node:fs/promises";
import { buildOpenApiSpec } from "./openapi-spec.mjs";

const expected = `${JSON.stringify(buildOpenApiSpec(), null, 2)}\n`;
const actual = await readFile("openapi/cybernara.openapi.json", "utf8");

if (actual !== expected) {
  console.error("OpenAPI contract is stale. Run npm run openapi:generate.");
  process.exit(1);
}

console.log("OpenAPI contract is current.");
