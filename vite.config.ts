import { defineConfig } from "vite";

import typescript from "@rollup/plugin-typescript";
import path from "path";
import { readdirSync } from "fs";

const nodeModules = readdirSync(path.resolve(__dirname, 'node_modules'));

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
      // do not bundle Node dependencies
      external: nodeModules,
    },
    ssr: true
  },
  esbuild: {
    minifyIdentifiers: false,
  }
});