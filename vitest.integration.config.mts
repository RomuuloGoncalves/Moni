import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
  test: {
    include: [
      "repositories/**/*.integration.test.ts",
      "app/**/*.integration.test.ts",
      "lib/auth/*.integration.test.ts",
      "lib/db/*.integration.test.ts",
      "middleware.integration.test.ts",
    ],
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    hookTimeout: 60000,
    testTimeout: 30000,
    // integration tests share one in-memory replica set per worker; run test files serially
    // to avoid cross-file interference on shared collections.
    fileParallelism: false,
  },
});
