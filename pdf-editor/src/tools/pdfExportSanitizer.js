export function buildPdfSanitizeArgs(inputName = "edited.pdf", outputName = "sanitized.pdf") {
  return [
    "--object-streams=generate",
    "--recompress-flate",
    "--remove-unreferenced-resources=yes",
    "--",
    inputName,
    outputName,
  ];
}

export async function sanitizeReplacedPdfBytes(input) {
  if (!(input instanceof Uint8Array) || !input.length) throw new Error("A PDF is required for final cleanup.");
  const { createQpdfRunner } = await import("qpdf-run");
  const runner = await createQpdfRunner({
    workerUrl: new URL("qpdf-run/worker", import.meta.url).href,
    qpdfJsUrl: new URL("qpdf-run/qpdf.js", import.meta.url).href,
    wasmUrl: new URL("qpdf-run/qpdf.wasm", import.meta.url).href,
    timeoutMs: 60000,
  });
  try {
    return await runner.runOne({
      input,
      inputName: "edited.pdf",
      outputName: "sanitized.pdf",
      args: buildPdfSanitizeArgs(),
    });
  } finally {
    await runner.destroy();
  }
}
