import { localDataUrlToArrayBuffer } from "./localDataUrl.js";

export function hasStoredPdfSource(documentRecord) {
  return Boolean(documentRecord?.pdfBlob instanceof Blob || documentRecord?.pdfDataUrl);
}

export async function storedPdfToArrayBuffer(documentRecord) {
  if (documentRecord?.pdfBlob instanceof Blob) {
    return documentRecord.pdfBlob.arrayBuffer();
  }
  if (documentRecord?.pdfDataUrl) {
    return localDataUrlToArrayBuffer(documentRecord.pdfDataUrl);
  }
  return null;
}
