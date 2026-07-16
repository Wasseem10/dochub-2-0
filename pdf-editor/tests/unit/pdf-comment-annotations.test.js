import { describe, expect, it } from "vitest";
import { PDFDocument, PDFName } from "pdf-lib";
import { attachPdfCommentAnnotation } from "../../src/tools/pdfCommentAnnotations.js";

describe("PDF comment annotations", () => {
  it("embeds the complete local thread in a standard PDF text annotation", async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    attachPdfCommentAnnotation({
      pdfDoc: pdf,
      page,
      x: 40,
      y: 700,
      size: 24,
      annotation: {
        id: "comment-1",
        author: "You",
        content: "Please verify this amount.",
        status: "resolved",
        assignee: "Me",
        updatedAt: "2026-07-16T12:00:00.000Z",
        replies: [{ id: "reply-1", author: "You", content: "Verified against the invoice." }],
      },
    });

    const loaded = await PDFDocument.load(await pdf.save());
    const annotationReference = loaded.getPage(0).node.Annots().get(0);
    const annotation = loaded.context.lookup(annotationReference);
    const contents = annotation.lookup(PDFName.of("Contents")).decodeText();
    expect(contents).toContain("Please verify this amount.");
    expect(contents).toContain("Verified against the invoice.");
    expect(contents).toContain("Status: Resolved");
  });
});
