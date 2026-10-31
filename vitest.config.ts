import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Match Next.js: JSX compiles with the automatic runtime (no React import needed).
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    include: ["lib/**/*.test.ts", "test/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
