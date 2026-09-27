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
      "services/**/*.test.ts",
      "lib/parsers/**/*.test.ts",
    ],
    environment: "node",
    passWithNoTests: true,
  },
});
