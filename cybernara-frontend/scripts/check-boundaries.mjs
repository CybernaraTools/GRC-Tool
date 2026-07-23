import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const roots = ["app", "src"].map((root) => path.resolve(root));
const violations = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

for (const root of roots) {
  for (const file of await walk(root)) {
    const relative = path.relative(process.cwd(), file).replaceAll("\\", "/");
    const source = await readFile(file, "utf8");

    if (source.includes("cybernara-backend/src") || source.includes("../cybernara-backend")) {
      violations.push(`${relative} imports or references backend source instead of the OpenAPI contract.`);
    }

    if (source.includes("@supabase/supabase-js") && relative !== "src/lib/supabase/server.ts") {
      violations.push(`${relative} imports Supabase outside the BFF session adapter.`);
    }

    const sourceWithoutSafeConstructors = source.replace(/\bBuffer\.from\s*\(/g, "");
    if (/\.(from|rpc)\s*\(/.test(sourceWithoutSafeConstructors)) {
      violations.push(`${relative} appears to call Supabase table/RPC APIs directly.`);
    }
  }
}

if (violations.length > 0) {
  console.error("Frontend boundary violations:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Frontend boundary check passed.");
