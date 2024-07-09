import { defineConfig } from "vite";
import taichi from "rollup-plugin-taichi";

// Function to conditionally apply aliases based on the build mode
function customAlias(mode: string) {
  if (mode === 'production') {
    return [{ find: "../rayTracer", replacement: "https://markusrk.github.io/webgGPU/dist/v1/tracer.mjs" }];
  }
  return [];
}

export default defineConfig(({ mode }) => ({
  base: "/webgGPU/docs/",
  resolve: {
    // Use the customAlias function to conditionally set the alias
    alias: customAlias(mode),
  },
  build: {
    outDir: "docs",
    minify: false,
    watch: {},
    rollupOptions: {
      input: {
        main: 'index.html',
      },
      plugins: [
        taichi(),
      ]
    }
  },
}));