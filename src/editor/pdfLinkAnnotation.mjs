import { PDFString } from "pdf-lib";

export function normalizeEditorLinkUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname) return "";
    return url.href;
  } catch {
    return "";
  }
}

export function addPdfLinkAnnotation(page, pdfDocument, { x, y, width, height, url }) {
  if (!page?.node || !pdfDocument?.context || !url) return null;
  const safeWidth = Math.max(0, Number(width) || 0);
  const safeHeight = Math.max(0, Number(height) || 0);
  if (!safeWidth || !safeHeight) return null;

  const linkRef = pdfDocument.context.register(pdfDocument.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [x, y, x + safeWidth, y + safeHeight],
    Border: [0, 0, 0],
    A: { Type: "Action", S: "URI", URI: PDFString.of(String(url)) },
  }));
  page.node.addAnnot(linkRef);
  return linkRef;
}
