import { describe, expect, it } from "vitest";
import { moveScanPage, nextScanRotation, validateScanFiles } from "../../src/tools/scanPdf.js";

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
});
