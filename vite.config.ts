import { defineConfig } from "vite";
import taichi from "rollup-plugin-taichi";

export default defineConfig({
  base: "/webgGPU/dist/",
  build: {
    lib: {
      entry: "src.rayTracer.ts",
      name: "daylightTracer",
      fileName: "daylightTracer",
    },
    minify: false,
    watch: {},
    commonjsOptions: { include: [] },
    rollupOptions: {
      input: {
        main: 'index.html',
        test: 'test.html'
      },
      plugins: [
        taichi(),
      ]
    }
  },
});
