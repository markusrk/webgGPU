import { defineConfig } from "vite";
import taichi from "rollup-plugin-taichi";

export default defineConfig({
  base: "/webgGPU/dist/",
  build: {
    lib: {
      entry: "src/rayTracer.ts",
      name: "daylight",
      fileName: "tracer",
    },
    minify: false,
    watch: {},
    rollupOptions: {
      input: {
        lib: 'src/rayTracer.ts',
        // main: 'index.html',
        // test: 'test.html',
      },
      plugins: [
        taichi(),
      ]
    }
  },
});
