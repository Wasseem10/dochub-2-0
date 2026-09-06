import { afterEach, describe, expect, it, vi } from "vitest";
import { localDataUrlToArrayBuffer } from "../../src/tools/localDataUrl.js";

describe("local data URL decoding", () => {
  afterEach(() => vi.restoreAllMocks());
  it("preserves all binary byte values without a network request", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("CSP"));
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
    const encoded = btoa(String.fromCharCode(...bytes));
    expect(new Uint8Array(localDataUrlToArrayBuffer(`data:application/pdf;base64,${encoded}`))).toEqual(bytes);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("supports image export data, MIME parameters, and escaped base64", () => {
    expect(new Uint8Array(localDataUrlToArrayBuffer("data:image/png;charset=utf-8;BASE64,%2Bw%3D%3D"))).toEqual(Uint8Array.of(251));
  });
  it("preserves non-UTF-8 percent-encoded PDF bytes and literal plus", () => {
    expect(new Uint8Array(localDataUrlToArrayBuffer("data:application/pdf,%25PDF%00%FF+"))).toEqual(Uint8Array.of(37,80,68,70,0,255,43));
  });
  it.each([null, "https://example.com/private.pdf", "blob:private", "data:application/pdf", "data:application/pdf;base64,not!base64", "data:application/pdf,%GG"])("rejects invalid or remote input without disclosing it", (value) => {
    expect(() => localDataUrlToArrayBuffer(value)).toThrow("Invalid local document data.");
  });
});
