import { describe, expect, it, vi } from "vitest";
import { dataUrlToArrayBuffer } from "../../src/tools/dataUrl.js";

describe("data URL decoding", () => {
  it("decodes a browser-saved PDF without fetching the data URL", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const bytes = new Uint8Array(dataUrlToArrayBuffer("data:application/pdf;base64,JVBERi0xLjcKJSVFT0Y="));

    expect(new TextDecoder().decode(bytes)).toBe("%PDF-1.7\n%%EOF");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("decodes percent-encoded data URLs", () => {
    const bytes = new Uint8Array(dataUrlToArrayBuffer("data:text/plain,PDFEnrich%20works%20%E2%9C%93"));
    expect(new TextDecoder().decode(bytes)).toBe("PDFEnrich works ✓");
  });

  it("rejects malformed data URLs", () => {
    expect(() => dataUrlToArrayBuffer("not-a-data-url")).toThrow("valid data URL");
    expect(() => dataUrlToArrayBuffer("data:application/pdf;base64,%%%"))
      .toThrow("invalid base64 data");
  });
});
