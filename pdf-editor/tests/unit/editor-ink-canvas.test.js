import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(fileURLToPath(new URL("../../src/App.jsx", import.meta.url)), "utf8");
const stylesSource = readFileSync(fileURLToPath(new URL("../../src/styles.css", import.meta.url)), "utf8");

describe("editor ink canvas", () => {
  it("renders saved and in-progress ink across the full annotation layer", () => {
    const fullSizeInkCanvases = appSource.match(/<svg className=(?:\{`ink-layer[^>]+|"ink-layer drafting") width="100%" height="100%"/g) || [];

    expect(fullSizeInkCanvases).toHaveLength(2);
    expect(stylesSource).toMatch(/\.ink-layer\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;/s);
  });
});
