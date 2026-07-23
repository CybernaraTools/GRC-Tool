import { mkdir, writeFile } from "node:fs/promises";
import { buildOpenApiSpec } from "./openapi-spec.mjs";

const spec = buildOpenApiSpec();
const serialized = `${JSON.stringify(spec, null, 2)}\n`;

await mkdir("openapi", { recursive: true });
await mkdir("dist/openapi", { recursive: true });
await writeFile("openapi/cybernara.openapi.json", serialized);
await writeFile("dist/openapi/cybernara.openapi.json", serialized);

console.log("Generated OpenAPI contract at openapi/cybernara.openapi.json");

