import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";

const POSITIONS = new Set(["top-left", "top-center", "top-right", "center", "bottom-left", "bottom-center", "bottom-right"]);

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

function hexToRgb(value) {
  const normalized = String(value || "").replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(normalized)) throw new Error("Choose a valid six-digit watermark color.");
  return rgb(
    Number.parseInt(normalized.slice(0, 2), 16) / 255,
    Number.parseInt(normalized.slice(2, 4), 16) / 255,
    Number.parseInt(normalized.slice(4, 6), 16) / 255,
  );
}

function positionFor(width, height, contentWidth, contentHeight, position, margin) {
  const horizontal = position.endsWith("left") ? margin : position.endsWith("right") ? width - contentWidth - margin : (width - contentWidth) / 2;
  const vertical = position.startsWith("top") ? height - contentHeight - margin : position.startsWith("bottom") ? margin : (height - contentHeight) / 2;
  return { x: Math.max(margin, horizontal), y: Math.max(margin, vertical) };
}

function normalizeSelectedPages(selectedPages, count) {
  const requested = selectedPages == null ? Array.from({ length: count }, (_, index) => index) : [...new Set(selectedPages.map(Number))];
  if (!requested.length) throw new Error("Select at least one page to watermark.");
  if (requested.some((index) => !Number.isInteger(index) || index < 0 || index >= count)) throw new Error("The watermark selection includes a page that does not exist.");
  return requested;
}

function detectImageKind(bytes, mimeType) {
  const mime = String(mimeType || "").toLowerCase();
  if (mime.includes("png") || (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71)) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg") || (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)) return "jpg";
  throw new Error("Choose a PNG or JPG watermark image.");
}

/**
 * Adds a text or image watermark to selected PDF pages without rasterizing their original content.
 * @param {Uint8Array | ArrayBuffer} sourceBytes
 * @param {{kind?: "text" | "image", text?: string, imageBytes?: Uint8Array | ArrayBuffer, imageMimeType?: string, selectedPages?: number[], position?: string, layout?: "single" | "tile", opacity?: number, rotation?: number, fontSize?: number, color?: string, imageScale?: number}} options
 */
export async function addWatermarkToPdf(sourceBytes, options = {}) {
  const pdf = await PDFDocument.load(sourceBytes, { updateMetadata: false });
  const pages = pdf.getPages();
  const selectedPages = normalizeSelectedPages(options.selectedPages, pages.length);
  const kind = options.kind === "image" ? "image" : "text";
  const layout = options.layout === "tile" ? "tile" : "single";
  const position = POSITIONS.has(options.position) ? options.position : "center";
  const opacity = clamp(options.opacity ?? 0.28, 0.05, 1);
  const rotation = clamp(options.rotation ?? -35, -180, 180);
  const margin = 26;

  const text = String(options.text ?? "CONFIDENTIAL").trim();
  if (kind === "text" && !text) throw new Error("Enter watermark text before downloading.");
  const font = kind === "text" ? await pdf.embedFont(StandardFonts.HelveticaBold) : null;
  const fontSize = clamp(options.fontSize ?? 42, 8, 144);
  const color = kind === "text" ? hexToRgb(options.color || "#2851eb") : null;

  let image;
  if (kind === "image") {
    const rawImage = options.imageBytes instanceof Uint8Array ? options.imageBytes : options.imageBytes ? new Uint8Array(options.imageBytes) : null;
    if (!rawImage?.length) throw new Error("Choose a PNG or JPG watermark image.");
    image = detectImageKind(rawImage, options.imageMimeType) === "png" ? await pdf.embedPng(rawImage) : await pdf.embedJpg(rawImage);
  }

  selectedPages.forEach((pageIndex) => {
    const page = pages[pageIndex];
    const { width, height } = page.getSize();
    if (kind === "text" && font) {
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const drawText = (x, y) => page.drawText(text, { x, y, size: fontSize, font, color, opacity, rotate: degrees(rotation) });
      if (layout === "tile") {
        const stepX = Math.max(150, textWidth + 92);
        const stepY = Math.max(110, fontSize * 2.6);
        for (let y = -height * 0.15; y < height + stepY; y += stepY) {
          for (let x = -width * 0.18; x < width + stepX; x += stepX) drawText(x, y);
        }
      } else {
        const { x, y } = positionFor(width, height, textWidth, fontSize, position, margin);
        drawText(x, y);
      }
      return;
    }

    if (image) {
      const imageScale = clamp(options.imageScale ?? 0.3, 0.06, 0.9);
      const imageWidth = Math.min(width - margin * 2, width * imageScale);
      const imageHeight = imageWidth * (image.height / Math.max(1, image.width));
      const drawImage = (x, y) => page.drawImage(image, { x, y, width: imageWidth, height: imageHeight, opacity, rotate: degrees(rotation) });
      if (layout === "tile") {
        const stepX = imageWidth + 72;
        const stepY = imageHeight + 72;
        for (let y = -imageHeight * 0.25; y < height + stepY; y += stepY) {
          for (let x = -imageWidth * 0.25; x < width + stepX; x += stepX) drawImage(x, y);
        }
      } else {
        const { x, y } = positionFor(width, height, imageWidth, imageHeight, position, margin);
        drawImage(x, y);
      }
    }
  });

  pdf.setTitle("Watermarked PDF");
  pdf.setCreator("PDFArrow");
  return pdf.save();
}
