// Decode browser-local bytes without fetch(): production CSP deliberately
// forbids data: connections, and document contents must never become requests.
export function localDataUrlToArrayBuffer(value) {
  if (typeof value !== "string" || !value.startsWith("data:")) {
    throw new Error("Invalid local document data.");
  }
  const comma = value.indexOf(",");
  if (comma < 0) throw new Error("Invalid local document data.");
  const header = value.slice(5, comma);
  const payload = value.slice(comma + 1);
  try {
    if (/;base64$/i.test(header)) {
      const binary = atob(decodeURIComponent(payload));
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      return bytes.buffer;
    }
    // Percent-encoded binary is not necessarily valid UTF-8. Decode escaped
    // octets directly and encode only literal text, preserving bytes above 127.
    const chunks = payload.split(/(%[0-9a-f]{2})/i);
    const encoder = new TextEncoder();
    const parts = chunks.map((chunk) => {
      if (/^%[0-9a-f]{2}$/i.test(chunk)) return Uint8Array.of(parseInt(chunk.slice(1), 16));
      if (chunk.includes("%")) throw new Error("Invalid escape");
      return encoder.encode(chunk);
    });
    const result = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
    let offset = 0;
    for (const part of parts) { result.set(part, offset); offset += part.length; }
    return result.buffer;
  } catch {
    // Never echo source bytes or provider errors into user-visible diagnostics.
    throw new Error("Invalid local document data.");
  }
}
