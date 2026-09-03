import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const editorCss = readFileSync(new URL("../../src/editor-premium-color.css", import.meta.url), "utf8");

describe("desktop editor visual refinement", () => {
  it("keeps toolbar icons neutral and removes colored group underlines", () => {
    expect(editorCss).toMatch(
      /main\.editor-shell \.reference-toolbar-button svg \{[\s\S]*?color:\s*#3f4652 !important;/,
    );
    expect(editorCss).toMatch(
      /main\.editor-shell \.reference-content-tools::after,[\s\S]*?display:\s*none !important;/,
    );
  });

  it("starts the thumbnail list close to the top of the rail", () => {
    expect(editorCss).toMatch(
      /main\.editor-shell \.thumbnail-list,[\s\S]*?padding:\s*8px 32px 20px !important;/,
    );
  });
});
