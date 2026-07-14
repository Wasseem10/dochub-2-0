import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",
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
    rollupOptions: {
      output: {
        manualChunks(id) {
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
