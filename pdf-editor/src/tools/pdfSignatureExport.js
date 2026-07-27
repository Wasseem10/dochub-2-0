import { degrees } from "pdf-lib";

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizedBox(annotation, pageWidth, pageHeight) {
  const width = Math.max(1, finiteNumber(annotation?.w) * pageWidth);
  const height = Math.max(1, finiteNumber(annotation?.h) * pageHeight);
  const x = finiteNumber(annotation?.x) * pageWidth;
  const y = pageHeight - finiteNumber(annotation?.y) * pageHeight - height;
  return {
    x,
    y,
    width,
    height,
    centerX: x + width / 2,
    centerY: y + height / 2,
    rotation: finiteNumber(annotation?.rotation),
  };
}

function rotatedOrigin(centerX, centerY, width, height, rotation) {
  const radians = rotation * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: centerX - (width / 2) * cosine + (height / 2) * sine,
    y: centerY - (width / 2) * sine - (height / 2) * cosine,
  };
}

export function getSignatureImagePlacement(annotation, pageWidth, pageHeight, image) {
  const box = normalizedBox(annotation, pageWidth, pageHeight);
  const sourceWidth = Math.max(1, finiteNumber(image?.width, 1));
  const sourceHeight = Math.max(1, finiteNumber(image?.height, 1));
  const scale = Math.min(box.width / sourceWidth, box.height / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    ...rotatedOrigin(box.centerX, box.centerY, width, height, box.rotation),
    width,
    height,
    rotation: box.rotation,
    centerX: box.centerX,
    centerY: box.centerY,
  };
}

export function getSignatureTextPlacement(annotation, pageWidth, pageHeight, font) {
  const box = normalizedBox(annotation, pageWidth, pageHeight);
  const content = String(annotation?.content || "").trim();
  const heightBound = Math.max(5, box.height * 0.66);
  let fontSize = Math.min(96, heightBound);
  const availableWidth = Math.max(1, box.width - 8);
  const measuredWidth = Math.max(1, font.widthOfTextAtSize(content, fontSize));
  if (measuredWidth > availableWidth) fontSize *= availableWidth / measuredWidth;
  fontSize = Math.max(5, fontSize);
  const textWidth = font.widthOfTextAtSize(content, fontSize);
  const visualHeight = fontSize;
  return {
    ...rotatedOrigin(box.centerX, box.centerY, textWidth, visualHeight, box.rotation),
    fontSize,
    textWidth,
    visualHeight,
    rotation: box.rotation,
    centerX: box.centerX,
    centerY: box.centerY,
  };
}

export async function drawPdfSignatureAnnotation({
  pdfDoc,
  page,
  annotation,
  font,
  color,
  embedDataUrlImage,
}) {
  if (!["signature", "initials"].includes(annotation?.type)) return false;
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const opacity = Math.max(0, Math.min(1, finiteNumber(annotation.opacity, 1)));

  if (annotation.imageDataUrl) {
    const image = await embedDataUrlImage(pdfDoc, annotation.imageDataUrl);
    if (!image) return true;
    const placement = getSignatureImagePlacement(annotation, pageWidth, pageHeight, image);
    page.drawImage(image, {
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      opacity,
      rotate: degrees(placement.rotation),
    });
    return true;
  }

  const content = String(annotation.content || "").trim();
  if (!content) return true;
  const placement = getSignatureTextPlacement(annotation, pageWidth, pageHeight, font);
  page.drawText(content, {
    x: placement.x,
    y: placement.y,
    size: placement.fontSize,
    font,
    color,
    opacity,
    rotate: degrees(placement.rotation),
  });
  return true;
}
