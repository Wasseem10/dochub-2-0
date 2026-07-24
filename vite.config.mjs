import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const githubPagesBase = process.env.GITHUB_ACTIONS === "true" ? "/dochub-2-0/" : "/";

export default defineConfig({
  base: githubPagesBase,
  plugins: [react({ jsxRuntime: "automatic" })],
  publicDir: "runtime-public",
  envPrefix: "VITE_",
  optimizeDeps: {
    entries: ["index.html"],
    include: ["react", "react-dom/client", "pdf-lib"],
    exclude: ["pdfjs-dist"],
  },
  server: {
    host: "127.0.0.1",
    watch: {
      usePolling: true,
      useFsEvents: false,
    },
  },
  preview: {
    host: "127.0.0.1",
  },
  build: {
    target: "es2022",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep Vite's tiny dynamic-import helper out of the first large lazy
          // dependency chunk. Otherwise Rollup can place it inside PDF.js,
          // forcing the marketing homepage to download the entire PDF renderer.
          if (id.includes("vite/preload-helper")) return "preload-helper";
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("pdfjs-dist")) return "pdfjs";
          if (id.includes("pdf-lib") || id.includes("@pdf-lib")) return "pdf-tools";
          if (id.includes("firebase") || id.includes("@firebase")) return "firebase";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("react") || id.includes("scheduler")) return "react";
          return undefined;
        },
      },
    },
  },
});
