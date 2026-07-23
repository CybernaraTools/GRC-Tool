import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"],
    fileParallelism: false,
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    coverage: {
      reporter: ["text", "json-summary"]
    }
  }
});
