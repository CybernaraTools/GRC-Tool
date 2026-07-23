import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const appManifestPath = path.resolve(".next", "app-build-manifest.json");
const staticRoot = path.resolve(".next");
const maxPageJsBytes = 700_000;
const maxSingleChunkBytes = 260_000;
const interactiveRoutes = new Set([
  "/",
  "/audit",
  "/frameworks",
  "/harmonization",
  "/assessments",
  "/ai",
  "/integrations",
  "/privacy",
  "/enterprise",
  "/login"
]);

if (!existsSync(appManifestPath)) {
  throw new Error("Missing .next/app-build-manifest.json. Run `npm run build` before checking the performance budget.");
}

const manifest = JSON.parse(readFileSync(appManifestPath, "utf8"));
const pages = manifest.pages ?? {};
const failures = [];

for (const [manifestRoute, files] of Object.entries(pages)) {
  const route = normalizeManifestRoute(manifestRoute);
  if (!interactiveRoutes.has(route)) {
    continue;
  }

  const jsFiles = files.filter((file) => file.endsWith(".js"));
  const totalBytes = sumUnique(jsFiles.map((file) => path.resolve(staticRoot, file)));
  if (totalBytes > maxPageJsBytes) {
    failures.push(`${route} loads ${totalBytes} JS bytes, above ${maxPageJsBytes}.`);
  }
}

for (const file of new Set(Object.values(pages).flat().filter((candidate) => candidate.endsWith(".js")))) {
  const absolutePath = path.resolve(staticRoot, file);
  const size = statSync(absolutePath).size;
  if (size > maxSingleChunkBytes) {
    failures.push(`${file} is ${size} bytes, above single-chunk budget ${maxSingleChunkBytes}.`);
  }
}

if (failures.length > 0) {
  throw new Error(`Performance budget failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(`Performance budget passed for ${interactiveRoutes.size} interactive routes.`);

function normalizeManifestRoute(route) {
  if (route === "/page") {
    return "/";
  }
  return route.replace(/\/page$/, "");
}

function sumUnique(paths) {
  return [...new Set(paths)].reduce((sum, file) => sum + statSync(file).size, 0);
}
