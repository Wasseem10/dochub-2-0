import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { createPdfFromImages, createStoredZip, getImagePageLayout, isSupportedImageType } from "../../src/tools/imageConversion.js";

const ONE_PIXEL_PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=", "base64"));

describe("image conversion engine", () => {
  it("validates supported image inputs and calculates centered layouts", () => {
    expect(isSupportedImageType("image/jpeg", "photo.jpg")).toBe(true);
    expect(isSupportedImageType("image/png", "diagram.png")).toBe(true);
    expect(isSupportedImageType("image/gif", "animation.gif")).toBe(false);

    const layout = getImagePageLayout(1200, 600, { pageSize: "letter", orientation: "landscape", margin: 24 });
    expect(layout.pageWidth).toBeGreaterThan(layout.pageHeight);
    expect(layout.drawWidth).toBeLessThanOrEqual(layout.pageWidth - 48);
    expect(layout.drawHeight).toBeLessThanOrEqual(layout.pageHeight - 48);
    expect(layout.x).toBeGreaterThanOrEqual(24);
    expect(layout.y).toBeGreaterThanOrEqual(24);
  });

  it("creates a readable multi-page PDF from ordered images", async () => {
    const bytes = await createPdfFromImages([
      { bytes: ONE_PIXEL_PNG, mimeType: "image/png", width: 300, height: 200 },
      { bytes: ONE_PIXEL_PNG, mimeType: "image/png", width: 200, height: 300 },
    ], { pageSize: "a4", orientation: "auto", margin: 24, title: "Conversion test" });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getTitle()).toBe("Conversion test");
  });

  it("packages multiple page images in a standards-shaped ZIP archive", () => {
    const bytes = createStoredZip([
      { name: "page-001.png", data: new Uint8Array([1, 2, 3]) },
      { name: "page-002.png", data: new Uint8Array([4, 5]) },
    ]);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054b50);
    expect(new TextDecoder().decode(bytes)).toContain("page-001.png");
    expect(new TextDecoder().decode(bytes)).toContain("page-002.png");
  });
});
