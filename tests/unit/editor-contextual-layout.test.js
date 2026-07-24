import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const editorCss = readFileSync(new URL("../../src/editor-editorial.css", import.meta.url), "utf8");

describe("editor contextual toolbar layout", () => {
  it("keeps the contextual toolbar in the grid and gives the workspace the remaining row", () => {
    expect(editorCss).toMatch(
      /main\.editor-shell > \.tool-settings,[\s\S]*?position:\s*relative !important;[\s\S]*?grid-row:\s*3 !important;/,
    );
    expect(editorCss).toMatch(
      /main\.editor-shell\.has-tool-settings \.workspace,[\s\S]*?grid-row:\s*4 \/ -1 !important;/,
    );
  });
});
