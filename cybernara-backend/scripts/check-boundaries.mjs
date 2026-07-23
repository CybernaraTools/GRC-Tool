import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("src/modules");
const violations = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

const files = await walk(root);
const importPattern = /from\s+["']([^"']+)["']|import\(["']([^"']+)["']\)/g;

for (const file of files) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  const [ownModule] = relative.split("/");
  const source = await readFile(file, "utf8");
  let match;
  while ((match = importPattern.exec(source))) {
    const specifier = match[1] ?? match[2];
    if (!specifier.startsWith(".")) {
      continue;
    }

    const resolved = path
      .normalize(path.join(path.dirname(file), specifier))
      .replaceAll("\\", "/");
    const marker = "/src/modules/";
    const markerIndex = resolved.indexOf(marker);
    if (markerIndex === -1) {
      continue;
    }

    const moduleRelative = resolved.slice(markerIndex + marker.length);
    const [targetModule, ...rest] = moduleRelative.split("/");
    const isPublicImport = rest.join("/") === "public.js" || rest.join("/") === "public";
    if (targetModule && targetModule !== ownModule && !isPublicImport) {
      violations.push(`${relative} imports internal code from ${targetModule}: ${specifier}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Architecture boundary violations:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Architecture boundary check passed.");

