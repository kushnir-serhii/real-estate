import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const EMPTY_MODULE_ID = "\0empty-module";

export default defineConfig({
  plugins: [
    {
      // `server-only` throws outside the react-server condition; in tests it is a no-op.
      name: "stub-server-only",
      enforce: "pre",
      resolveId: (id) => (id === "server-only" ? EMPTY_MODULE_ID : null),
      load: (id) => (id === EMPTY_MODULE_ID ? "export {};" : null),
    },
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
