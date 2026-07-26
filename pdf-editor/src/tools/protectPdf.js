export function buildProtectPdfArgs(userPassword, ownerPassword, inputName = "input.pdf", outputName = "protected.pdf") {
  return ["--encrypt", userPassword, ownerPassword, "256", "--", inputName, outputName];
}

export function buildUnlockPdfArgs(password, inputName = "input.pdf", outputName = "unlocked.pdf") {
  return [`--password=${String(password)}`, "--decrypt", "--", inputName, outputName];
}

function makeOwnerPassword() {
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function formatQpdfProtectionError(error, operation) {
  const detail = [error?.code, error?.message, ...(error?.stderr || [])].join(" ").toLowerCase();
  if (operation === "unlock" && (detail.includes("password") || detail.includes("encrypted"))) {
    return "That password did not unlock this PDF. Check it and try again.";
  }
  if (detail.includes("qpdf_timeout") || detail.includes("timed out")) {
    const task = operation === "unlock" ? "Password removal" : "Password protection";
    return `${task} took too long in this browser. Close other PDFArrow tabs and try again.`;
  }
  return operation === "unlock"
    ? "This PDF could not be unlocked in the browser."
    : "This PDF could not be password-protected in the browser.";
}

export async function protectPdfBytes(input, password) {
  if (!(input instanceof Uint8Array) || !input.length) throw new Error("A PDF is required.");
  if (String(password).length < 8) throw new Error("Use a password with at least 8 characters.");

  const { createQpdfRunner } = await import("qpdf-run");
  let runner;

  try {
    runner = await createQpdfRunner({
      workerUrl: new URL("qpdf-run/worker", import.meta.url).href,
      qpdfJsUrl: new URL("qpdf-run/qpdf.js", import.meta.url).href,
      wasmUrl: new URL("qpdf-run/qpdf.wasm", import.meta.url).href,
      timeoutMs: 60000,
    });
    return await runner.runOne({
      input,
      inputName: "input.pdf",
      outputName: "protected.pdf",
      args: buildProtectPdfArgs(String(password), makeOwnerPassword()),
    });
  } catch (error) {
    throw new Error(formatQpdfProtectionError(error, "protect"));
  } finally {
    await runner?.destroy();
  }
}

export async function unlockPdfBytes(input, password) {
  if (!(input instanceof Uint8Array) || !input.length) throw new Error("A PDF is required.");
  if (!String(password).length) throw new Error("Enter the PDF's current password.");

  const { createQpdfRunner } = await import("qpdf-run");
  let runner;

  try {
    runner = await createQpdfRunner({
      workerUrl: new URL("qpdf-run/worker", import.meta.url).href,
      qpdfJsUrl: new URL("qpdf-run/qpdf.js", import.meta.url).href,
      wasmUrl: new URL("qpdf-run/qpdf.wasm", import.meta.url).href,
      timeoutMs: 60000,
    });
    return await runner.runOne({
      input,
      inputName: "input.pdf",
      outputName: "unlocked.pdf",
      args: buildUnlockPdfArgs(password),
    });
  } catch (error) {
    throw new Error(formatQpdfProtectionError(error, "unlock"));
  } finally {
    await runner?.destroy();
  }
}
