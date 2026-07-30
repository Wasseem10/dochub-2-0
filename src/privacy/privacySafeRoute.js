const PRIVATE_ROUTE_PATTERNS = Object.freeze([
  { pattern: /^\/share(?:\/|$)/i, replacement: "/share/:token" },
  { pattern: /^\/sign(?:\/|$)/i, replacement: "/sign/:token" },
  { pattern: /^\/app\/editor(?:\/|$)/i, replacement: "/app/editor/:documentId" },
]);

function pathnameFrom(value) {
  const raw = String(value || "/").trim();
  try {
    return new URL(raw, "https://pdfenrich.invalid").pathname || "/";
  } catch {
    return raw.split(/[?#]/, 1)[0] || "/";
  }
}

function stripAsciiControls(value) {
  return Array.from(String(value || "")).filter((character) => {
    const code = character.charCodeAt(0);
    return code > 31 && code !== 127;
  }).join("");
}

export function privacySafeRoute(value = "/", maximumLength = 160) {
  const pathname = stripAsciiControls(pathnameFrom(value)
    .replace(/%(?:0[0-9a-f]|1[0-9a-f]|7f)/gi, "")
    .replace(/\/{2,}/g, "/"));
  const normalized = pathname.startsWith("/") ? pathname : "/";
  const privateRoute = PRIVATE_ROUTE_PATTERNS.find(({ pattern }) => pattern.test(normalized));
  if (privateRoute) return privateRoute.replacement;
  return normalized.slice(0, Math.max(1, maximumLength));
}
