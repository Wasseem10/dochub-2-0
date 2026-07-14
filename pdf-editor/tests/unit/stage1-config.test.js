import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import viteConfig from "../../vite.config.mjs";
import worker from "../../worker/index.js";

describe("Stage 1 production configuration", () => {
  it("uses one explicit runtime asset directory", () => {
    expect(viteConfig.publicDir).toBe("runtime-public");
    const expectedBase = process.env.GITHUB_ACTIONS === "true" ? "/dochub-2-0/" : "/";
    expect(viteConfig.base).toBe(expectedBase);
  });

  it("contains the required hosting and worker files", async () => {
    await expect(access(".openai/hosting.json")).resolves.toBeUndefined();
    await expect(access("worker/index.js")).resolves.toBeUndefined();
  });

  it("exposes the required quality scripts", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8"));
    expect(Object.keys(packageJson.scripts)).toEqual(expect.arrayContaining([
      "dev",
      "build",
      "preview",
      "lint",
      "typecheck",
      "test",
      "test:e2e",
    ]));
  });

  it("serves the SPA entry point only for missing HTML GET requests", async () => {
    const requestedPaths = [];
    const env = {
      ASSETS: {
        async fetch(request) {
          const url = new URL(request.url);
          requestedPaths.push(url.pathname);
          if (url.pathname === "/index.html") {
            return new Response("<div id=\"root\"></div>", {
              status: 200,
              headers: { "content-type": "text/html" },
            });
          }
          return new Response("missing", { status: 404 });
        },
      },
    };

    const response = await worker.fetch(new Request("https://realpdf.example/edit-pdf", {
      headers: { accept: "text/html" },
    }), env);

    expect(response.status).toBe(200);
    expect(requestedPaths).toEqual(["/edit-pdf", "/index.html"]);
  });
});
