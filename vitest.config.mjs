import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    fileParallelism: false,
    maxWorkers: 1,
    include: ["tests/{unit,integration,security}/**/*.test.{js,jsx,mjs}"],
  },
});
