import { describe, expect, it } from "vitest";
import { detectDocumentBounds, detectDocumentCorners, moveScanPage, nextScanRotation, validateScanFiles } from "../../src/tools/scanPdf.js";

function pointInsidePolygon(x, y, points) {
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const first = points[index];
    const second = points[previous];
    if ((first.y > y) !== (second.y > y) && x < (second.x - first.x) * (y - first.y) / (second.y - first.y) + first.x) inside = !inside;
  }
  return inside;
}

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

  it("finds four corners for a photographed page with perspective", () => {
    const width = 140;
    const height = 110;
    const expected = [{ x: 24, y: 12 }, { x: 118, y: 22 }, { x: 128, y: 98 }, { x: 12, y: 92 }];
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        const value = pointInsidePolygon(x, y, expected) ? 238 : 30;
        data.set([value, value, value, 255], offset);
      }
    }
    const corners = detectDocumentCorners({ width, height, data });
    expect(corners.confidence).toBeGreaterThan(50);
    [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft].forEach((corner, index) => {
      expect(Math.abs(corner.x - expected[index].x)).toBeLessThan(8);
      expect(Math.abs(corner.y - expected[index].y)).toBeLessThan(8);
    });
  });
});
