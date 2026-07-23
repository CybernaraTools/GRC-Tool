import { readFileSync } from "node:fs";

const matrix = readFileSync("docs/traceability-matrix.md", "utf8");
const failures = [];

if (!matrix.startsWith("# Cybernara Frontend Traceability Matrix")) {
  failures.push("Traceability matrix title is missing.");
}

if (!matrix.includes("Status: F7 final integration pass complete.")) {
  failures.push("Traceability matrix status must be final before F7 is complete.");
}

const tableRows = matrix
  .split(/\r?\n/)
  .filter((line) => line.startsWith("| ") && !line.includes("---"));

for (const row of tableRows.slice(1)) {
  const cells = row.split("|").slice(1, -1).map((cell) => cell.trim());
  if (cells.length !== 5) {
    failures.push(`Malformed traceability row: ${row}`);
    continue;
  }
  const [requirement, status, route, endpoint, verification] = cells;
  if (!requirement || !status || !route || !endpoint || !verification) {
    failures.push(`Traceability row has an empty required cell: ${row}`);
  }
}

for (const requiredToken of ["FE-01", "FE-02", "FE-03", "FE-04", "FE-05", "F7 final integration"]) {
  if (!matrix.includes(requiredToken)) {
    failures.push(`Traceability matrix is missing ${requiredToken}.`);
  }
}

if (failures.length > 0) {
  throw new Error(`Traceability check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log(`Traceability matrix passed with ${tableRows.length - 1} requirement/workflow rows.`);
