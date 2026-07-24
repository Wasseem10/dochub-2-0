import { degrees, rgb } from "pdf-lib";

function colorFromHex(hex = "#0f172a") {
  const normalized = String(hex).replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((part) => part + part).join("")
    : normalized.padEnd(6, "0").slice(0, 6);
  return rgb(
    Number.parseInt(value.slice(0, 2), 16) / 255,
    Number.parseInt(value.slice(2, 4), 16) / 255,
    Number.parseInt(value.slice(4, 6), 16) / 255,
  );
}

export async function drawFlattenedInputAnnotation({
  pdfDoc,
  page,
  annotation,
  helvetica,
  timesItalic,
  pickPdfFont,
  embedDataUrlImage,
}) {
  const supported = new Set(["checkbox", "radio", "choice", "field", "text", "signature", "initials"]);
  if (!supported.has(annotation.type)) return false;
  const { width, height } = page.getSize();
  const color = colorFromHex(annotation.color);

  if (annotation.type === "checkbox") {
    const markWidth = annotation.w * width;
    const markHeight = annotation.h * height;
    const x = annotation.x * width;
    const y = height - annotation.y * height - markHeight;
    if (annotation.checked) {
      const thickness = Math.max(1.8, Math.min(markWidth, markHeight) * 0.13);
      page.drawLine({ start: { x: x + markWidth * 0.08, y: y + markHeight * 0.48 }, end: { x: x + markWidth * 0.36, y: y + markHeight * 0.18 }, thickness, color, opacity: annotation.opacity });
      page.drawLine({ start: { x: x + markWidth * 0.36, y: y + markHeight * 0.18 }, end: { x: x + markWidth * 0.92, y: y + markHeight * 0.82 }, thickness, color, opacity: annotation.opacity });
    }
    return true;
  }

  if (annotation.type === "radio") {
    const markWidth = annotation.w * width;
    const markHeight = annotation.h * height;
    const x = annotation.x * width;
    const y = height - annotation.y * height - markHeight;
    const radius = Math.max(2, Math.min(markWidth, markHeight) / 2);
    page.drawCircle({ x: x + markWidth / 2, y: y + markHeight / 2, size: radius, borderColor: color, borderWidth: 1.2, opacity: annotation.opacity });
    if (annotation.selected) page.drawCircle({ x: x + markWidth / 2, y: y + markHeight / 2, size: radius * 0.48, color, opacity: annotation.opacity });
    return true;
  }

  if (annotation.type === "choice") {
    const x = annotation.x * width;
    const y = height - annotation.y * height - annotation.h * height;
    page.drawRectangle({ x, y, width: annotation.w * width, height: annotation.h * height, borderColor: color, borderWidth: 1.2, opacity: annotation.opacity });
    if (String(annotation.content || "").trim()) page.drawText(String(annotation.content), { x: x + 7, y: y + Math.max(7, annotation.h * height * 0.32), size: annotation.fontSize || 11, font: helvetica, color, opacity: annotation.opacity });
    return true;
  }

  if (annotation.type === "field") {
    const x = annotation.x * width;
    const y = height - annotation.y * height - annotation.h * height;
    page.drawRectangle({ x, y, width: annotation.w * width, height: annotation.h * height, borderColor: color, borderWidth: 1.2, opacity: annotation.opacity, rotate: degrees(Number(annotation.rotation || 0)) });
    if (String(annotation.content || "").trim()) {
      page.drawText(annotation.content, { x: x + 8, y: y + Math.max(8, annotation.h * height * 0.32), size: annotation.fontSize || 11, font: helvetica, color, opacity: Math.min(0.82, annotation.opacity ?? 1) });
    }
    return true;
  }

  if (annotation.type === "text") {
    const font = pickPdfFont(annotation.fontFamily, annotation.bold, annotation.italic);
    String(annotation.content || "").split("\n").forEach((line, index) => {
      const textWidth = font.widthOfTextAtSize(line, annotation.fontSize);
      const boxWidth = annotation.w * width;
      const alignOffset = annotation.textAlign === "center" ? Math.max(0, (boxWidth - textWidth) / 2) : annotation.textAlign === "right" ? Math.max(0, boxWidth - textWidth - 8) : 0;
      page.drawText(line, {
        x: annotation.x * width + 8 + alignOffset,
        y: height - annotation.y * height - 22 - index * (annotation.fontSize * (annotation.lineHeight || 1.25)),
        size: annotation.fontSize,
        font,
        color,
        opacity: annotation.opacity,
        rotate: degrees(Number(annotation.rotation || 0)),
      });
    });
    return true;
  }

  if (annotation.imageDataUrl) {
    const image = await embedDataUrlImage(pdfDoc, annotation.imageDataUrl);
    if (image) {
      page.drawImage(image, { x: annotation.x * width, y: height - annotation.y * height - annotation.h * height, width: annotation.w * width, height: annotation.h * height, opacity: annotation.opacity, rotate: degrees(Number(annotation.rotation || 0)) });
    }
  } else if (String(annotation.content || "").trim()) {
    page.drawText(annotation.content, { x: annotation.x * width + 6, y: height - annotation.y * height - annotation.h * height + 7, size: annotation.fontSize, font: timesItalic, color, opacity: annotation.opacity, rotate: degrees(Number(annotation.rotation || 0)) });
  }
  return true;
}
