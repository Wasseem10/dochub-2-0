const PATH_SEPARATORS = /[\\/]+/g;
const UNSAFE_PUNCTUATION = /[<>:"|?*]+/g;

function stripControlAndBidiCharacters(value) {
  return Array.from(value, (character) => {
    const codePoint = character.codePointAt(0);
    const isControl = codePoint <= 31 || (codePoint >= 127 && codePoint <= 159);
    const isBidiOverride = (codePoint >= 0x202a && codePoint <= 0x202e)
      || (codePoint >= 0x2066 && codePoint <= 0x2069);
    return isControl || isBidiOverride ? "" : character;
  }).join("");
}

export function sanitizePdfDisplayName(value, fallback = "Untitled document.pdf") {
  let name = stripControlAndBidiCharacters(String(value || "").normalize("NFKC"))
    .replace(PATH_SEPARATORS, "-")
    .replace(UNSAFE_PUNCTUATION, "-")
    .replace(/-{2,}/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[.\s-]+|[.\s-]+$/g, "")
    .slice(0, 120)
    .trim();
  if (!name) name = fallback;
  if (!/\.pdf$/i.test(name)) name = `${name.replace(/\.+$/g, "")}.pdf`;
  return name.slice(0, 124);
}
