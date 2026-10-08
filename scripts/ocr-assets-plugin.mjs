import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const languages = ["eng", "spa", "fra", "deu", "ita", "por"];
const coreNames = [
  "tesseract-core.wasm.js", "tesseract-core-lstm.wasm.js",
  "tesseract-core-simd.wasm.js", "tesseract-core-simd-lstm.wasm.js",
  "tesseract-core-relaxedsimd.wasm.js", "tesseract-core-relaxedsimd-lstm.wasm.js",
];

// Resolve through Tesseract so pnpm's isolated dependency layout also works.
// The .wasm.js builds include their WASM bytes; no separate binary is needed.
export function getOcrAssetFiles() {
  const packagePath = require.resolve("tesseract.js/package.json");
  const runtimePackage = require(packagePath);
  const runtimeRoot = dirname(packagePath);
  const coreRoot = dirname(createRequire(packagePath).resolve("tesseract.js-core/package.json"));
  const prefix = `vendor/ocr/${runtimePackage.version}`;
  const files = new Map([
    [`${prefix}/worker.min.js`, join(runtimeRoot, "dist/worker.min.js")],
    [`${prefix}/LICENSE-tesseract.txt`, join(runtimeRoot, "LICENSE.md")],
    [`${prefix}/LICENSE-core.txt`, join(coreRoot, "LICENSE")],
  ]);
  for (const name of coreNames) files.set(`${prefix}/core/${name}`, join(coreRoot, name));
  for (const language of languages) {
    const root = dirname(require.resolve(`@tesseract.js-data/${language}/package.json`));
    files.set(`${prefix}/lang/${language}.traineddata.gz`, join(root, `4.0.0_best_int/${language}.traineddata.gz`));
    files.set(`${prefix}/lang/${language}-README.md`, join(root, "README.md"));
    files.set(`${prefix}/lang/${language}-package.json`, join(root, "package.json"));
  }
  return files;
}

/** @returns {import("vite").Plugin} */
export function ocrAssetsPlugin() {
  const files = getOcrAssetFiles();
  let base = "/";
  return {
    name: "pdfenrich-local-ocr-assets",
    configResolved(config) { base = config.base; },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url || "/", "http://localhost").pathname;
        const relative = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\//, "");
        const file = files.get(relative);
        if (!file) return next();
        try {
          const bytes = await readFile(file);
          response.setHeader("Content-Type", relative.endsWith(".js") ? "application/javascript" : "application/octet-stream");
          response.setHeader("Cache-Control", "no-cache");
          response.end(request.method === "HEAD" ? undefined : bytes);
        } catch (error) { next(error); }
      });
    },
    async generateBundle() {
      for (const [fileName, file] of files) {
        this.emitFile({ type: "asset", fileName, source: await readFile(file) });
      }
    },
  };
}
