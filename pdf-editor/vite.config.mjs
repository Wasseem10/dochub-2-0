import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const githubPagesBase = process.env.GITHUB_ACTIONS === "true" ? "/dochub-2-0/" : "/";

export default defineConfig({
  base: githubPagesBase,
  plugins: [react()],
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
  },
});
