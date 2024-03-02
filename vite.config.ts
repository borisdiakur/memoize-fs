import { defineConfig } from "vite";

import typescript from "@rollup/plugin-typescript";
import path from "path";

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      plugins: [
        typescript({
          sourceMap: false,
          declaration: true,
          outDir: "dist",
          exclude: ["src/index.test.ts"]
        }),
      ],
    },
  },
  esbuild: {
    minifyIdentifiers: false,
  }
});