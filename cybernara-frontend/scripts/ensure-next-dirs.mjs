import { mkdir } from "node:fs/promises";

await mkdir(".next/diagnostics", { recursive: true });

