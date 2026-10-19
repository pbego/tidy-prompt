import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * The app resolves @tidy-prompt/core to the package's source rather than its
 * build output. Editing the serializers then hot-reloads the preview like any
 * other file; `packages/core/dist` stays reserved for external consumers such as
 * the browser extension.
 */
const corePath = fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url));

export default defineConfig({
  // Relative asset URLs, so the bundle works from any sub-path — GitHub Pages
  // serves a project site at /<repo>/, where "/assets/..." would 404.
  base: "./",
  plugins: [react()],
  resolve: {
    alias: [{ find: /^@tidy-prompt\/core$/, replacement: corePath }],
  },
  // strictPort so a busy port fails loudly instead of silently drifting to the
  // next one, which would leave .claude/launch.json pointing at nothing.
  server: { port: 5180, strictPort: true },
});
