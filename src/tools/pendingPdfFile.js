let pendingDocumentFile = null;

export function setPendingPdfFile(file) {
  setPendingDocumentFile(file, "edit-pdf");
}

export function takePendingPdfFile() {
  return takePendingDocumentFile("edit-pdf");
}

export function setPendingDocumentFile(file, toolId) {
  pendingDocumentFile = file ? { file, toolId } : null;
}

export function takePendingDocumentFile(toolId) {
  if (!pendingDocumentFile || pendingDocumentFile.toolId !== toolId) return null;
  const { file } = pendingDocumentFile;
  pendingDocumentFile = null;
  return file;
}
