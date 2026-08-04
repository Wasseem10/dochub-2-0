export function dataUrlToArrayBuffer(dataUrl) {
  const candidate = String(dataUrl || "");
  const commaIndex = candidate.indexOf(",");
  if (!candidate.startsWith("data:") || commaIndex < 5) {
    throw new TypeError("A valid data URL is required.");
  }

  const metadata = candidate.slice(5, commaIndex);
  const payload = candidate.slice(commaIndex + 1);
  if (/(?:^|;)base64(?:;|$)/i.test(metadata)) {
    const encoded = payload.replace(/\s+/g, "");
    if (!encoded || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
      throw new TypeError("The data URL contains invalid base64 data.");
    }
    try {
      const binary = atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return bytes.buffer;
    } catch {
      throw new TypeError("The data URL contains invalid base64 data.");
    }
  }

  try {
    return new TextEncoder().encode(decodeURIComponent(payload)).buffer;
  } catch {
    throw new TypeError("The data URL contains invalid encoded data.");
  }
}
