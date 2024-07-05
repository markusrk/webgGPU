import { defineConfig } from "vite";

export default defineConfig({
  build: {
    minify: false,
    // watch: {},
    commonjsOptions: { include: [] },
    rollupOptions: {
      input: {
        main: 'src/index.html',
        test: 'src/test.html'
      }
    }
  },
});
