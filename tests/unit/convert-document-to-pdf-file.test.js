import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { convertDocumentToPdfFile } from "../../src/tools/convertDocumentToPdfFile.js";

describe("document uploads for the editor", () => {
  it("keeps a PDF unchanged for the existing editor validation path", async () => {
    const file = new File(["%PDF-1.7"], "draft.pdf", { type: "application/pdf" });
    expect(await convertDocumentToPdfFile(file)).toBe(file);
  });

  it("turns a TXT upload into a valid searchable PDF file", async () => {
    const file = new File(["A line of text\nAnother line"], "notes.txt", { type: "text/plain" });
    const converted = await convertDocumentToPdfFile(file);
    expect(converted.name).toBe("notes.pdf");
    expect(converted.type).toBe("application/pdf");
    const pdf = await PDFDocument.load(await converted.arrayBuffer());
    expect(pdf.getPageCount()).toBe(1);
  });

  it("accepts RTF by MIME type even when its name has no extension", async () => {
    const file = new File(["{\\rtf1\\ansi Hello world}"], "draft", { type: "application/rtf" });
    const converted = await convertDocumentToPdfFile(file);
    expect(converted.name).toBe("draft.pdf");
    expect((await PDFDocument.load(await converted.arrayBuffer())).getPageCount()).toBe(1);
  });

  it("stops unsupported files with a usable error", async () => {
    const file = new File(["GIF89a"], "animation.gif", { type: "image/gif" });
    await expect(convertDocumentToPdfFile(file)).rejects.toThrow("supported document or image");
  });
});
