import { describe, expect, it, vi } from "vitest";
import { rgb } from "pdf-lib";
import {
  drawPdfSignatureAnnotation,
  getSignatureImagePlacement,
  getSignatureTextPlacement,
} from "../../src/tools/pdfSignatureExport.js";

const annotation = {
  type: "signature",
  x: 0.1,
  y: 0.2,
  w: 0.4,
  h: 0.2,
  content: "Ada Lovelace",
  imageDataUrl: "data:image/png;base64,test",
  opacity: 0.45,
  rotation: 30,
};

describe("signature export geometry", () => {
  it("contains image signatures without stretching and rotates around the box center", () => {
    const placement = getSignatureImagePlacement(annotation, 1000, 500, { width: 4, height: 1 });
    expect(placement.width).toBe(400);
    expect(placement.height).toBe(100);
    expect(placement.centerX).toBe(300);
    expect(placement.centerY).toBe(350);

    const radians = placement.rotation * Math.PI / 180;
    const rotatedCenterX = placement.x
      + (placement.width / 2) * Math.cos(radians)
      - (placement.height / 2) * Math.sin(radians);
    const rotatedCenterY = placement.y
      + (placement.width / 2) * Math.sin(radians)
      + (placement.height / 2) * Math.cos(radians);
    expect(rotatedCenterX).toBeCloseTo(placement.centerX, 6);
    expect(rotatedCenterY).toBeCloseTo(placement.centerY, 6);
  });

  it("scales typed signatures with their resized annotation box", () => {
    const font = { widthOfTextAtSize: (text, size) => text.length * size * 0.5 };
    const small = getSignatureTextPlacement({ ...annotation, imageDataUrl: "", w: 0.2, h: 0.08 }, 1000, 500, font);
    const large = getSignatureTextPlacement({ ...annotation, imageDataUrl: "", w: 0.5, h: 0.2 }, 1000, 500, font);
    expect(large.fontSize).toBeGreaterThan(small.fontSize);
    expect(large.textWidth).toBeLessThanOrEqual(500);
  });

  it("passes rotation, transparency, and contained dimensions to the PDF renderer", async () => {
    const page = {
      getSize: () => ({ width: 1000, height: 500 }),
      drawImage: vi.fn(),
      drawText: vi.fn(),
    };
    const image = { width: 4, height: 1 };
    const handled = await drawPdfSignatureAnnotation({
      pdfDoc: {},
      page,
      annotation,
      font: { widthOfTextAtSize: () => 10 },
      color: rgb(0, 0, 0),
      embedDataUrlImage: vi.fn().mockResolvedValue(image),
    });

    expect(handled).toBe(true);
    expect(page.drawImage).toHaveBeenCalledOnce();
    const options = page.drawImage.mock.calls[0][1];
    expect(options.width / options.height).toBe(4);
    expect(options.opacity).toBe(0.45);
    expect(options.rotate.angle).toBe(30);
  });
});
