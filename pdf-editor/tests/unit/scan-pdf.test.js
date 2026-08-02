import { describe, expect, it } from "vitest";
import { detectDocumentBounds, moveScanPage, nextScanRotation, validateScanFiles } from "../../src/tools/scanPdf.js";

describe("scan page preparation", () => {
  it("validates supported page images", () => {
    expect(validateScanFiles([{ name: "page.jpg", type: "image/jpeg", size: 1000 }])).toBe("");
    expect(validateScanFiles([{ name: "notes.txt", type: "text/plain", size: 10 }])).toMatch(/JPG and PNG/);
  });

  it("moves pages without mutating the source and rotates in quarter turns", () => {
    const source = ["one", "two", "three"];
    expect(moveScanPage(source, 2, 0)).toEqual(["three", "one", "two"]);
    expect(source).toEqual(["one", "two", "three"]);
    expect(nextScanRotation(270)).toBe(0);
  });

  it("detects a high-contrast paper boundary without cropping uniform images", () => {
    const width = 100;
    const height = 80;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        const value = x >= 12 && x < 88 && y >= 8 && y < 72 ? 238 : 32;
        data.set([value, value, value, 255], offset);
      }
    }
    const bounds = detectDocumentBounds({ width, height, data });
    expect(bounds).toMatchObject({ x: expect.any(Number), y: expect.any(Number), width: expect.any(Number), height: expect.any(Number) });
    expect(bounds.x).toBeLessThanOrEqual(12);
    expect(bounds.y).toBeLessThanOrEqual(8);
    expect(bounds.width).toBeLessThan(width);
    expect(bounds.height).toBeLessThan(height);

    const uniform = new Uint8ClampedArray(width * height * 4).fill(255);
    expect(detectDocumentBounds({ width, height, data: uniform })).toBeNull();
  });
});
