export function hasStoredPdfSource(documentRecord) {
  return Boolean(documentRecord?.pdfBlob instanceof Blob || documentRecord?.pdfDataUrl);
}

export async function storedPdfToArrayBuffer(documentRecord) {
  if (documentRecord?.pdfBlob instanceof Blob) {
    return documentRecord.pdfBlob.arrayBuffer();
  }
  if (documentRecord?.pdfDataUrl) {
    const response = await fetch(documentRecord.pdfDataUrl);
    return response.arrayBuffer();
  }
  return null;
}
