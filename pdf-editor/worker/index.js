/**
 * @typedef {{ ASSETS: { fetch(request: Request): Promise<Response> } }} WorkerEnvironment
 */

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
      return response;
    }

    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    if (!acceptsHtml) return response;

    const fallbackUrl = new URL("/index.html", request.url);
    return env.ASSETS.fetch(new Request(fallbackUrl, request));
  },
};

export default worker;
