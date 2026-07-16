import { PDFHexString, PDFString } from "pdf-lib";

function formatThread(annotation) {
  const lines = [annotation.content || "Comment"];
  (annotation.replies || []).forEach((reply) => {
    lines.push(`\n${reply.author || "You"}: ${reply.content || ""}`);
  });
  if (annotation.assignee && annotation.assignee !== "Unassigned") lines.push(`\nAssigned to: ${annotation.assignee}`);
  lines.push(`\nStatus: ${annotation.status === "resolved" ? "Resolved" : "Open"}`);
  return lines.join("");
}

export function attachPdfCommentAnnotation({ pdfDoc, page, annotation, x, y, size }) {
  const context = pdfDoc.context;
  const updatedAt = annotation.updatedAt ? new Date(annotation.updatedAt) : new Date();
  const safeDate = Number.isNaN(updatedAt.getTime()) ? new Date() : updatedAt;
  const annotationDictionary = context.obj({
    Type: "Annot",
    Subtype: "Text",
    Rect: [x, y, x + size, y + size],
    Contents: PDFHexString.fromText(formatThread(annotation)),
    T: PDFHexString.fromText(annotation.author || "FixThatPDF reviewer"),
    NM: PDFHexString.fromText(annotation.id || `comment-${Date.now()}`),
    M: PDFString.fromDate(safeDate),
    Name: "Comment",
    C: [1, 0.74, 0.25],
    F: 4,
    Open: false,
  });
  const annotationReference = context.register(annotationDictionary);
  page.node.addAnnot(annotationReference);
  return annotationReference;
}
