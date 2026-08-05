/**
 * @typedef {{ ASSETS: { fetch(request: Request): Promise<Response> } }} WorkerEnvironment
 */

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'wasm-unsafe-eval' https://www.google.com https://www.gstatic.com https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.gstatic.com https://*.googleusercontent.com",
  "font-src 'self' data:",
  "connect-src 'self' blob: https://udtddtoghuuazlczgkuf.supabase.co https://*.firebaseapp.com https://*.firebaseio.com wss://*.firebaseio.com https://*.googleapis.com wss://*.googleapis.com https://www.google.com https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com",
  "frame-src 'self' blob: https://*.firebaseapp.com https://accounts.google.com https://www.google.com",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "media-src 'self' data: blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

/**
 * @param {Response} response
 * @param {Request} request
 */
function withSecurityHeaders(response, request) {
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("Origin-Agent-Cluster", "?1");
  headers.set("Permissions-Policy", "accelerometer=(), browsing-topics=(), camera=(self), clipboard-read=(), clipboard-write=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), serial=(), usb=()");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-DNS-Prefetch-Control", "off");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Permitted-Cross-Domain-Policies", "none");
  headers.set("X-XSS-Protection", "0");
  const path = new URL(request.url).pathname;
  if (/^\/(?:app(?:\/|$)|login$|signup$|forgot-password$|share(?:\/|$)|sign(?:\/|$))/.test(path)) {
    headers.set("Cache-Control", "private, no-store, max-age=0");
    headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const worker = {
  /**
   * Serve static assets and fall back to the SPA entry point for browser routes.
   *
   * @param {Request} request
   * @param {WorkerEnvironment} env
   * @returns {Promise<Response>}
   */
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);

    if (response.status !== 404 || request.method !== "GET") {
      return withSecurityHeaders(response, request);
    }

    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    if (!acceptsHtml) return withSecurityHeaders(response, request);

    const fallbackUrl = new URL("/index.html", request.url);
    const fallback = await env.ASSETS.fetch(new Request(fallbackUrl, request));
    return withSecurityHeaders(fallback, request);
  },
};

export default worker;
