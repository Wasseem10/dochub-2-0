import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  publicDir: "runtime-public",
  optimizeDeps: {
    entries: ["index.html"],
    include: ["react", "react-dom/client"],
    exclude: ["pdfjs-dist", "pdf-lib"],
  },
  server: {
    watch: {
      usePolling: true,
      useFsEvents: false,
    },
  },
  plugins: [react()],
});
