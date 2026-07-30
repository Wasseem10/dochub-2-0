export const MAX_PDF_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_PDF_EDITOR_PAGES = 500;
const PDF_MAGIC = "%PDF-";
const PDF_EOF = "%%EOF";

export function validatePdfUpload(file) {
  if (!file) return "No file selected.";
  const fileName = String(file.name || "");
  if (!fileName.toLowerCase().endsWith(".pdf")) return "Choose a PDF file with a .pdf extension.";
  if (file.type && file.type !== "application/pdf") return "This file is not declared as a PDF. Choose a genuine PDF file.";
  if (file.size > MAX_PDF_UPLOAD_BYTES) {
    return "This PDF is too large for the browser editor. Choose a file smaller than 50 MB.";
  }
  if (!file.size) return "This PDF is empty. Choose a valid document.";
  return "";
}

function asciiPreview(bytes) {
  return new TextDecoder("latin1").decode(bytes);
}

export async function validatePdfFileContent(file) {
  const basicError = validatePdfUpload(file);
  if (basicError) return basicError;
  if (typeof file.slice !== "function") return "This browser could not inspect the selected PDF.";

  try {
    const headerBytes = new Uint8Array(await file.slice(0, Math.min(file.size, 1024)).arrayBuffer());
    const header = asciiPreview(headerBytes);
    if (!header.startsWith(PDF_MAGIC)) {
      if (/^\s*(?:<!doctype\s+html|<html|<script|<svg)/i.test(header)) {
        return "This is an HTML file disguised as a PDF.";
      }
      if (header.startsWith("MZ") || header.startsWith("\u007fELF") || header.startsWith("PK\u0003\u0004")) {
        return "This file contains executable or archive data instead of a PDF.";
      }
      return "This file does not have a valid PDF signature.";
    }

    const tailStart = Math.max(0, file.size - 8192);
    const tailBytes = new Uint8Array(await file.slice(tailStart, file.size).arrayBuffer());
    const tail = asciiPreview(tailBytes);
    const eofIndex = tail.lastIndexOf(PDF_EOF);
    if (eofIndex < 0) return "This PDF is incomplete or malformed.";
    const trailing = tail.slice(eofIndex + PDF_EOF.length);
    const allowedTrailingCharacters = new Set(["\u0000", "\t", "\n", "\f", "\r", " "]);
    if (Array.from(trailing).some((character) => !allowedTrailingCharacters.has(character))) {
      return "This PDF has unexpected data after its end marker and may be unsafe.";
    }

    const securitySampleSize = Math.min(file.size, 2 * 1024 * 1024);
    const securitySample = asciiPreview(new Uint8Array(
      await file.slice(0, securitySampleSize).arrayBuffer(),
    ));
    if (/\/(?:JavaScript|JS|Launch|EmbeddedFiles?|RichMedia)\b/.test(securitySample)) {
      return "PDFs with scripts, launch actions, or embedded files are not supported.";
    }
    return "";
  } catch {
    return "This browser could not safely inspect the selected PDF. Choose the file again.";
  }
}

export function getPdfLoadErrorMessage(error) {
  const name = String(error?.name || "");
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("supports up to") && message.includes("pages")) return String(error.message);
  if (name === "PasswordException" || message.includes("password")) {
    return "This PDF is password-protected. Remove the password from a copy you are authorized to edit, then try again.";
  }
  if (name === "InvalidPDFException" || message.includes("invalid pdf") || message.includes("corrupt")) {
    return "This PDF appears corrupted or invalid. Open it in another reader, save a fresh copy, and upload that copy.";
  }
  if (name === "MissingPDFException") {
    return "The PDF could not be read from your device. Choose the file again.";
  }
  return "PDFEnrich could not open this PDF. Try a valid, unencrypted file smaller than 50 MB.";
}
