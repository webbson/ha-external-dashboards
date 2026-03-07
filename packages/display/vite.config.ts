import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks: {
          uplot: ["uplot"],
          handlebars: ["handlebars"],
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:8099",
      "/assets": "http://localhost:8099",
      "/d/": "http://localhost:8099",
      "/ws": {
        target: "http://localhost:8099",
        ws: true,
      },
    },
  },
});
