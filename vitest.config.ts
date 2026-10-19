import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.ts", "apps/*/src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: [
      {
        find: /^@tidy-prompt\/core$/,
        replacement: fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url)),
      },
    ],
  },
});
