import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { createCompletionFiles } from "../../src/pages/public/SigningRequestPage.jsx";

async function createSourcePdf() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([612, 792]);
  page.drawText("Service agreement", { x: 72, y: 700, size: 18, font });
  return pdf.save();
}

describe("completed signing files", () => {
  it("embeds assigned values and creates a fingerprinted receipt", async () => {
    const sourceBytes = await createSourcePdf();
    const request = {
      requestId: "a".repeat(32),
      identityVerified: true,
      recipient: { name: "Jordan Lee", email: "jordan@example.com" },
      requester: { name: "Alex Owner", email: "alex@example.com" },
      fields: [
        { id: "name-1", page: 0, x: 0.15, y: 0.35, w: 0.42, h: 0.06, type: "text", label: "Full name", required: true },
        { id: "signature-1", page: 0, x: 0.15, y: 0.55, w: 0.42, h: 0.09, type: "signature", label: "Signature", required: true },
      ],
    };

    const completed = await createCompletionFiles(sourceBytes, request, {
      "name-1": { text: "Jordan Lee" },
      "signature-1": { text: "Jordan Lee" },
    }, "service-agreement.pdf");

    const signedPdf = await PDFDocument.load(completed.signedBytes);
    const receiptPdf = await PDFDocument.load(completed.receiptBytes);

    expect(signedPdf.getPageCount()).toBe(1);
    expect(receiptPdf.getPageCount()).toBe(1);
    expect(completed.signedBytes.byteLength).toBeGreaterThan(sourceBytes.byteLength);
    expect(completed.receiptBytes.byteLength).toBeGreaterThan(500);
    expect(completed.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(signedPdf.getSubject()).toContain(request.requestId);
  });
});
