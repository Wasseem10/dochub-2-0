import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { buildEditedPdfBytes } from "./pdf-export.js";

describe("buildEditedPdfBytes", () => {
  it("creates a parseable PDF that preserves a supported text edit", async () => {
    const bytes = await buildEditedPdfBytes({
      pages: [{ id: "page-1", source: "blank", width: 760, height: 984 }],
      annotations: [{
        id: "text-1",
        type: "text",
        page: 0,
        x: 0.1,
        y: 0.1,
        w: 0.5,
        h: 0.08,
        content: "Persisted edit",
        color: "#111827",
        fontSize: 18,
        opacity: 1,
      }],
    });

    const parsed = await PDFDocument.load(bytes);
    expect(parsed.getPageCount()).toBe(1);

    const rendered = await pdfjs.getDocument({ data: bytes.slice(0), disableWorker: true }).promise;
    const text = await (await rendered.getPage(1)).getTextContent();
    expect(text.items.map((item) => item.str).join(" ")).toContain("Persisted edit");
  });

  it("rejects empty documents", async () => {
    await expect(buildEditedPdfBytes({ pages: [] })).rejects.toThrow(/at least one page/i);
  });
});
