import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { drawFlattenedInputAnnotation } from "../../src/tools/pdfEditorAnnotationExport.js";
import { verifySignedPdfExport } from "../../src/tools/pdfExportVerification.js";

const standardFontDataUrl = new URL("../../node_modules/pdfjs-dist/standard_fonts/", import.meta.url).href;
const PNG_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function embedDataUrlImage(pdfDoc, dataUrl) {
  return pdfDoc.embedPng(Buffer.from(dataUrl.split(",")[1], "base64"));
}

describe("editor PDF export", () => {
  it("produces an openable PDF containing filled fields, dates, initials, and signatures", async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    const annotations = [
      { type: "field", x: .1, y: .1, w: .45, h: .06, content: "Ada Lovelace", fontSize: 12, color: "#155ee8", opacity: 1 },
      { type: "checkbox", x: .1, y: .2, w: .04, h: .04, checked: true, color: "#155ee8", opacity: 1 },
      { type: "text", x: .1, y: .3, w: .3, h: .05, content: "07/15/2026", fontSize: 12, color: "#0f172a", opacity: 1, lineHeight: 1.25, rotation: 15 },
      { type: "initials", x: .1, y: .4, w: .12, h: .05, content: "AL", fontSize: 20, color: "#0f172a", opacity: 1 },
      { type: "signature", x: .1, y: .5, w: .25, h: .06, content: "Ada Lovelace", fontSize: 24, color: "#0f172a", opacity: 1 },
    ];
    const pickPdfFont = (_fontFamily, bold) => bold ? helveticaBold : helvetica;

    for (const annotation of annotations) {
      expect(await drawFlattenedInputAnnotation({ pdfDoc, page, annotation, helvetica, timesItalic, pickPdfFont, embedDataUrlImage: async () => null })).toBe(true);
    }

    const bytes = await pdfDoc.save();
    const reopened = await PDFDocument.load(bytes);
    expect(reopened.getPageCount()).toBe(1);

    const rendered = await pdfjsLib.getDocument({ data: bytes.slice(0), disableWorker: true, standardFontDataUrl, verbosity: 0 }).promise;
    const content = await (await rendered.getPage(1)).getTextContent();
    const extracted = content.items.map((item) => item.str).join(" ");
    expect(extracted).toContain("Ada Lovelace");
    expect(extracted).toContain("07/15/2026");
    expect(extracted).toContain("AL");
    const rotatedDate = content.items.find((item) => item.str === "07/15/2026");
    expect(Math.abs(rotatedDate.transform[1])).toBeGreaterThan(0);
  });

  it("reopens and verifies typed, drawn, and uploaded signatures across pages", async () => {
    const pdfDoc = await PDFDocument.create();
    const firstPage = pdfDoc.addPage([612, 792]);
    const secondPage = pdfDoc.addPage([500, 700]);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    const annotations = [
      { page: 0, type: "signature", x: .12, y: .16, w: .32, h: .09, content: "Ada Lovelace", fontSize: 24, color: "#0f172a", opacity: .72, rotation: 22 },
      { page: 0, type: "signature", x: .2, y: .45, w: .42, h: .12, content: "Drawn signature", imageDataUrl: PNG_DATA_URL, fontSize: 24, color: "#0f172a", opacity: .45, rotation: -18 },
      { page: 1, type: "signature", x: .18, y: .28, w: .28, h: .08, content: "Uploaded signature", imageDataUrl: PNG_DATA_URL, fontSize: 24, color: "#0f172a", opacity: .8, rotation: 33 },
    ];

    for (const annotation of annotations) {
      const page = annotation.page === 0 ? firstPage : secondPage;
      expect(await drawFlattenedInputAnnotation({
        pdfDoc,
        page,
        annotation,
        helvetica,
        timesItalic,
        pickPdfFont: () => helvetica,
        embedDataUrlImage,
      })).toBe(true);
    }

    const bytes = await pdfDoc.save();
    const reopened = await PDFDocument.load(bytes);
    expect(reopened.getPageCount()).toBe(2);

    const verification = await verifySignedPdfExport({
      bytes,
      annotations,
      getDocument: (source) => pdfjsLib.getDocument({ ...source, standardFontDataUrl }),
      operations: pdfjsLib.OPS,
    });
    expect(verification).toEqual({ ok: true, verifiedCount: 3, pageCount: 2 });

    const rendered = await pdfjsLib.getDocument({ data: bytes.slice(0), disableWorker: true, standardFontDataUrl, verbosity: 0 }).promise;
    const firstPageText = await (await rendered.getPage(1)).getTextContent();
    const typedSignature = firstPageText.items.find((item) => item.str === "Ada Lovelace");
    expect(typedSignature).toBeTruthy();
    expect(Math.abs(typedSignature.transform[1])).toBeGreaterThan(0);
    rendered.cleanup?.();
  });
});
