import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// scher-pages imports scher by bare specifier (`scher/society`), the way any
// consumer does. In THIS repo that specifier has no node_modules entry to
// resolve against, so tests alias it back to source. Consumers do not need
// this — package.json exports handle them; see examples/vite-consumer, which
// deliberately carries no aliases and would break if the exports were wrong.
const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^scher\/(.*)\.js$/, replacement: src("$1.ts") },
      { find: /^scher\/(.*)$/, replacement: src("$1.ts") },
      { find: /^scher$/, replacement: src("index.ts") },
    ],
  },
});
