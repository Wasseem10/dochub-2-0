import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FINISH_EXPORT_FORMATS, FinishExportModal } from "../../src/components/editor/FinishExportModal.jsx";
import { createEditorFormatDownload, editorExportBaseName } from "../../src/tools/editorFinishExport.js";

vi.mock("pdfjs-dist", () => ({ getDocument: vi.fn() }));

describe("editor finish export chooser", () => {
  it("offers six real download formats with PDF recommended", () => {
    expect(FINISH_EXPORT_FORMATS.map((format) => format.id)).toEqual([
      "pdf",
      "png",
      "word",
      "excel",
      "jpg",
      "powerpoint",
    ]);
    expect(FINISH_EXPORT_FORMATS.find((format) => format.recommended)?.id).toBe("pdf");
  });

  it("renders the selected format and document summary accessibly", () => {
    const html = renderToStaticMarkup(
      <FinishExportModal
        fileName="Contract.pdf"
        pageCount={3}
        selectedFormat="word"
        onSelectFormat={() => {}}
        onClose={() => {}}
        onDownload={() => {}}
      />,
    );

    expect(html).toContain("Your document is ready");
    expect(html).toContain("Contract.pdf");
    expect(html).toContain("3 pages ready to export");
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain("Download Word");
  });

  it("rejects conversion when no edited PDF bytes are available", async () => {
    await expect(createEditorFormatDownload({
      format: "png",
      pdfBytes: new Uint8Array(),
      fileName: "Contract.pdf",
    })).rejects.toThrow("could not be prepared");
  });

  it.each([
    ["Resume_Wasseem-edited.pdf", "Resume_Wasseem"],
    ["Resume_Wasseem.png-edited.pdf", "Resume_Wasseem"],
    ["Resume_Wasseem.jpg.pdf", "Resume_Wasseem"],
    ["quarterly.report.v2.pdf", "quarterly.report.v2"],
  ])("creates one clean base name from %s", (value, expected) => {
    expect(editorExportBaseName(value)).toBe(expected);
  });
});
