import { PDFString } from "pdf-lib";

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
