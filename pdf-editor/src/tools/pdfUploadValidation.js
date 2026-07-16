export const MAX_PDF_UPLOAD_BYTES = 8 * 1024 * 1024;

export function validatePdfUpload(file) {
  if (!file) return "No file selected.";
  if (file.type !== "application/pdf" && !String(file.name || "").toLowerCase().endsWith(".pdf")) {
    return "Choose a PDF file to continue.";
  }
  if (file.size > MAX_PDF_UPLOAD_BYTES) {
    return "This PDF is too large for the browser editor. Choose a file smaller than 8 MB.";
  }
  if (!file.size) return "This PDF is empty. Choose a valid document.";
  return "";
}

export function getPdfLoadErrorMessage(error) {
  const name = String(error?.name || "");
  const message = String(error?.message || "").toLowerCase();
  if (name === "PasswordException" || message.includes("password")) {
    return "This PDF is password-protected. Remove the password from a copy you are authorized to edit, then try again.";
  }
  if (name === "InvalidPDFException" || message.includes("invalid pdf") || message.includes("corrupt")) {
    return "This PDF appears corrupted or invalid. Open it in another reader, save a fresh copy, and upload that copy.";
  }
  if (name === "MissingPDFException") {
    return "The PDF could not be read from your device. Choose the file again.";
  }
  return "FixThatPDF could not open this PDF. Try a valid, unencrypted file smaller than 8 MB.";
}
