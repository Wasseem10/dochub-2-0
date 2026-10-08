# Browser OCR runtime

PDFEnrich serves Tesseract's worker, embedded-WASM core builds, and all six
supported language models from the site's own origin. The Vite plugin in
`scripts/ocr-assets-plugin.mjs` serves them during development and emits them
under `dist/vendor/ocr/{tesseract-version}/` for deployment. They are requested
only when OCR starts, so the homepage does not preload these assets.

The model packages are pinned in the pnpm lockfile. The build uses their
`4.0.0_best_int` models, matching Tesseract's default LSTM-only engine. Core
selection remains automatic for devices with and without SIMD support. The
generated directory also includes upstream license and package notices.

Every OCR entry point uses `src/tools/browserOcrWorker.js`, which selects local
asset URLs and provides safe messages for engine, model, and initialization
failures. The production Content Security Policy stays unchanged.

`patches/tesseract.js@7.0.0.patch` fixes startup rejection and worker cleanup:
upstream 7.0.0 otherwise discards failed language/initialization promises and
can leave `createWorker` pending. Reevaluate this patch when upgrading
Tesseract; retain the failure-and-retry regression test.

Verification: `tests/browser/ocr-production-assets.spec.mjs` applies the
production security policy to documents and worker assets, recognizes an
image-only synthetic PDF, checks the downloaded text layer, verifies all six
models, and exercises missing-model recovery. `tests/unit/ocr-pdf.test.js`
also protects sparse and blank pages from being blackened by automatic levels.
