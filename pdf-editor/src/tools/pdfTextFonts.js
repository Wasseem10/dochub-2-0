import fontkit from "@pdf-lib/fontkit";
import { StandardFonts } from "pdf-lib";

const baseUrl = typeof import.meta.env?.BASE_URL === "string" ? import.meta.env.BASE_URL.replace(/\/?$/, "/") : "/";
const FONT_ASSETS = Object.freeze({
  regular: `${baseUrl}fonts/LiberationSans-Regular.ttf`,
  bold: `${baseUrl}fonts/LiberationSans-Bold.ttf`,
});

const fontAssetPromises = new Map();

function asBytes(value) {
  if (!value) return null;
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return null;
}

async function loadFontAsset(url) {
  if (typeof fetch !== "function") return null;
  if (!fontAssetPromises.has(url)) {
    fontAssetPromises.set(url, fetch(url, { cache: "force-cache" })
      .then((response) => {
        if (!response.ok) throw new Error(`Font request failed with ${response.status}.`);
        return response.arrayBuffer();
      })
      .then((buffer) => new Uint8Array(buffer))
      .catch(() => null));
  }
  return fontAssetPromises.get(url);
}

export function normalizeUnicodePdfText(value) {
  return Array.from(String(value ?? ""))
    .filter((character) => {
      const codePoint = character.codePointAt(0) || 0;
      return codePoint === 9 || codePoint === 10 || codePoint === 13 || (codePoint >= 32 && codePoint !== 127);
    })
    .join("")
    .normalize("NFC");
}

export function normalizeWinAnsiPdfText(value) {
  const normalized = normalizeUnicodePdfText(value)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  return Array.from(normalized, (character) => {
    const codePoint = character.codePointAt(0) || 0;
    return codePoint === 9 || codePoint === 10 || codePoint === 13 || (codePoint >= 32 && codePoint <= 255) ? character : "?";
  }).join("");
}

export function textForPdfFont(font, value, unicode = false) {
  const normalized = unicode ? normalizeUnicodePdfText(value) : normalizeWinAnsiPdfText(value);
  if (!normalized) return "";
  try {
    font.encodeText(normalized);
    return normalized;
  } catch {
    return Array.from(normalized, (character) => {
      try {
        font.encodeText(character);
        return character;
      } catch {
        return "?";
      }
    }).join("");
  }
}

export async function embedPdfTextFonts(pdf, options = {}) {
  const regularBytes = asBytes(options.regularFontBytes) || await loadFontAsset(FONT_ASSETS.regular);
  const boldBytes = asBytes(options.boldFontBytes) || await loadFontAsset(FONT_ASSETS.bold) || regularBytes;
  if (regularBytes && boldBytes) {
    try {
      pdf.registerFontkit(fontkit);
      const [regular, bold] = await Promise.all([
        pdf.embedFont(regularBytes, { subset: true }),
        pdf.embedFont(boldBytes, { subset: true }),
      ]);
      return { regular, bold, unicode: true };
    } catch {
      // Keep conversion available if a browser cannot load or subset the bundled fonts.
    }
  }
  const [regular, bold] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica),
    pdf.embedFont(StandardFonts.HelveticaBold),
  ]);
  return { regular, bold, unicode: false };
}
