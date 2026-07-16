import { PDFDocument } from "pdf-lib";

export const IMAGE_CONVERSION_LIMITS = Object.freeze({
  maxInputBytes: 50 * 1024 * 1024,
  maxImageCount: 100,
  maxPdfPages: 100,
});

const PAGE_SIZES = Object.freeze({
  a4: [595.28, 841.89],
  letter: [612, 792],
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function isSupportedImageType(type = "", name = "") {
  const lowerName = name.toLowerCase();
  return type === "image/jpeg" || type === "image/png" || /\.(jpe?g|png)$/.test(lowerName);
}

export function getImagePageLayout(imageWidth, imageHeight, options = {}) {
  const pageSize = options.pageSize || "fit";
  const orientation = options.orientation || "auto";
  const margin = Number(options.margin || 0);
  const safeWidth = Math.max(1, imageWidth || 1);
  const safeHeight = Math.max(1, imageHeight || 1);

  let pageWidth;
  let pageHeight;
  if (pageSize === "fit") {
    pageWidth = clamp(safeWidth * 0.75 + margin * 2, 72, 1440);
    pageHeight = clamp(safeHeight * 0.75 + margin * 2, 72, 1440);
  } else {
    [pageWidth, pageHeight] = PAGE_SIZES[pageSize] || PAGE_SIZES.a4;
  }

  const wantsLandscape = orientation === "landscape" || (orientation === "auto" && safeWidth > safeHeight);
  if (wantsLandscape && pageHeight > pageWidth) [pageWidth, pageHeight] = [pageHeight, pageWidth];
  if (orientation === "portrait" && pageWidth > pageHeight) [pageWidth, pageHeight] = [pageHeight, pageWidth];

  const availableWidth = Math.max(1, pageWidth - margin * 2);
  const availableHeight = Math.max(1, pageHeight - margin * 2);
  const scale = Math.min(availableWidth / safeWidth, availableHeight / safeHeight);
  const drawWidth = safeWidth * scale;
  const drawHeight = safeHeight * scale;

  return {
    pageWidth,
    pageHeight,
    drawWidth,
    drawHeight,
    x: (pageWidth - drawWidth) / 2,
    y: (pageHeight - drawHeight) / 2,
  };
}

export async function createPdfFromImages(images, options = {}) {
  if (!Array.isArray(images) || images.length === 0) throw new Error("Choose at least one JPG or PNG image.");
  if (images.length > IMAGE_CONVERSION_LIMITS.maxImageCount) throw new Error(`Choose no more than ${IMAGE_CONVERSION_LIMITS.maxImageCount} images at once.`);

  const pdf = await PDFDocument.create();
  for (const imageRecord of images) {
    const bytes = imageRecord.bytes instanceof Uint8Array ? imageRecord.bytes : new Uint8Array(imageRecord.bytes);
    const embedded = imageRecord.mimeType === "image/png"
      ? await pdf.embedPng(bytes)
      : await pdf.embedJpg(bytes);
    const layout = getImagePageLayout(imageRecord.width || embedded.width, imageRecord.height || embedded.height, options);
    const page = pdf.addPage([layout.pageWidth, layout.pageHeight]);
    page.drawImage(embedded, {
      x: layout.x,
      y: layout.y,
      width: layout.drawWidth,
      height: layout.drawHeight,
    });
  }
  pdf.setTitle(options.title || "Converted images");
  pdf.setCreator("RealPDF");
  return pdf.save();
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(view, offset, value) {
  view.setUint16(offset, value, true);
}

function writeUint32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

function concatBytes(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });
  return result;
}

export function createStoredZip(files) {
  if (!Array.isArray(files) || files.length === 0) throw new Error("No files were selected for download.");
  const encoder = new TextEncoder();
  const localChunks = [];
  const centralChunks = [];
  let localOffset = 0;

  files.forEach((file) => {
    const name = encoder.encode(file.name);
    const data = file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length + data.length);
    const localView = new DataView(local.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0x0800);
    writeUint16(localView, 8, 0);
    writeUint32(localView, 14, crc);
    writeUint32(localView, 18, data.length);
    writeUint32(localView, 22, data.length);
    writeUint16(localView, 26, name.length);
    local.set(name, 30);
    local.set(data, 30 + name.length);
    localChunks.push(local);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0x0800);
    writeUint16(centralView, 10, 0);
    writeUint32(centralView, 16, crc);
    writeUint32(centralView, 20, data.length);
    writeUint32(centralView, 24, data.length);
    writeUint16(centralView, 28, name.length);
    writeUint32(centralView, 42, localOffset);
    central.set(name, 46);
    centralChunks.push(central);
    localOffset += local.length;
  });

  const centralDirectory = concatBytes(centralChunks);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 8, files.length);
  writeUint16(endView, 10, files.length);
  writeUint32(endView, 12, centralDirectory.length);
  writeUint32(endView, 16, localOffset);
  return concatBytes([...localChunks, centralDirectory, end]);
}
