let pendingPdfFile = null;

export function setPendingPdfFile(file) {
  pendingPdfFile = file || null;
}

export function takePendingPdfFile() {
  const file = pendingPdfFile;
  pendingPdfFile = null;
  return file;
}
