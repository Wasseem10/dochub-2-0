import { describe, expect, it, vi } from "vitest";
import { hasStoredPdfSource, storedPdfToArrayBuffer } from "../../src/tools/storedPdfSource.js";

describe("stored PDF sources", () => {
  it("reads a native Blob without converting the account PDF to a data URL", async () => {
    const pdfBlob = new Blob(["%PDF-1.7\n%%EOF\n"], { type: "application/pdf" });
    const record = { pdfBlob, pdfDataUrl: "" };

    expect(hasStoredPdfSource(record)).toBe(true);
    await expect(storedPdfToArrayBuffer(record)).resolves.toEqual(await pdfBlob.arrayBuffer());
  });

  it("keeps legacy data-URL browser documents readable", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\n%%EOF\n");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      arrayBuffer: async () => bytes.buffer,
    });
    const record = { pdfDataUrl: "data:application/pdf;base64,JVBERi0xLjcKJSVFT0YK" };

    expect(hasStoredPdfSource(record)).toBe(true);
    await expect(storedPdfToArrayBuffer(record)).resolves.toEqual(bytes.buffer);
    expect(fetchSpy).toHaveBeenCalledWith(record.pdfDataUrl);
  });

  it("returns no bytes for a blank document", async () => {
    expect(hasStoredPdfSource({ pages: [] })).toBe(false);
    await expect(storedPdfToArrayBuffer({ pages: [] })).resolves.toBeNull();
  });
});
