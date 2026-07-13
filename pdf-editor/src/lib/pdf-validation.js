export const MAX_PDF_BYTES = 8 * 1024 * 1024;

export const PDF_ERROR_CODES = Object.freeze({
  MISSING: "missing",
  EMPTY: "empty",
  TYPE: "type",
  OVERSIZED: "oversized",
  INVALID_SIGNATURE: "invalid-signature",
  ENCRYPTED: "encrypted",
  CORRUPTED: "corrupted",
  UNREADABLE: "unreadable",
});

const messages = Object.freeze({
  [PDF_ERROR_CODES.MISSING]: "Choose a PDF file to continue.",
  [PDF_ERROR_CODES.EMPTY]: "This PDF is empty. Choose a file that contains PDF data.",
  [PDF_ERROR_CODES.TYPE]: "This file is not a PDF. Choose a file ending in .pdf.",
  [PDF_ERROR_CODES.OVERSIZED]: "This PDF is larger than the 8 MB browser-workspace limit.",
  [PDF_ERROR_CODES.INVALID_SIGNATURE]: "This file does not contain a valid PDF header. It may have the wrong extension or be corrupted.",
  [PDF_ERROR_CODES.ENCRYPTED]: "This PDF is password-protected. Remove the password, then upload it again.",
  [PDF_ERROR_CODES.CORRUPTED]: "This PDF appears to be corrupted or incomplete. Try downloading a fresh copy.",
  [PDF_ERROR_CODES.UNREADABLE]: "RealPDF could not read this PDF. Try a different, unprotected copy.",
});

function failure(code, detail = "") {
  return { ok: false, error: { code, message: detail || messages[code] } };
}

export async function validatePdfCandidate(file, { maxBytes = MAX_PDF_BYTES } = {}) {
  if (!file) return failure(PDF_ERROR_CODES.MISSING);
  if (!Number.isFinite(file.size) || file.size <= 0) return failure(PDF_ERROR_CODES.EMPTY);
  if (file.size > maxBytes) {
    const limitMb = Math.round(maxBytes / (1024 * 1024));
    return failure(PDF_ERROR_CODES.OVERSIZED, `This PDF is larger than the ${limitMb} MB browser-workspace limit.`);
  }

  const fileName = String(file.name || "").toLowerCase();
  const declaredPdf = file.type === "application/pdf" || fileName.endsWith(".pdf");
  if (!declaredPdf) return failure(PDF_ERROR_CODES.TYPE);

  try {
    const headerBytes = new Uint8Array(await file.slice(0, Math.min(file.size, 1024)).arrayBuffer());
    const header = new TextDecoder("latin1").decode(headerBytes);
    if (!header.includes("%PDF-")) return failure(PDF_ERROR_CODES.INVALID_SIGNATURE);
  } catch {
    return failure(PDF_ERROR_CODES.UNREADABLE);
  }

  return { ok: true };
}

export function classifyPdfOpenError(error) {
  const name = String(error?.name || "");
  const code = Number(error?.code);
  const message = String(error?.message || "").toLowerCase();

  if (name === "PasswordException" || code === 1 || code === 2 || /password|encrypted/.test(message)) {
    return failure(PDF_ERROR_CODES.ENCRYPTED).error;
  }
  if (name === "InvalidPDFException" || /invalid pdf|corrupt|xref|trailer|unexpected eof/.test(message)) {
    return failure(PDF_ERROR_CODES.CORRUPTED).error;
  }
  return failure(PDF_ERROR_CODES.UNREADABLE).error;
}
