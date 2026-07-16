import { createServer } from "vite";
import react from "@vitejs/plugin-react";

console.log("creating vite server");

const server = await createServer({
  configFile: false,
  root: process.cwd(),
  publicDir: "runtime-public",
  optimizeDeps: {
    entries: ["index.html"],
    include: ["react", "react-dom/client", "pdf-lib"],
    exclude: ["pdfjs-dist"],
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
      useFsEvents: false,
    },
  },
  plugins: [react()],
});

console.log("listening");
await server.listen();
server.printUrls();
