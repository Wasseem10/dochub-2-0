import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const landingSource = readFileSync(new URL("../../src/LatticePdfLanding.jsx", import.meta.url), "utf8");

describe("homepage free promise", () => {
  it("renders the free promise as plain trust copy rather than a hyperlink", () => {
    expect(landingSource).toContain('<p className="freepdf-free-promise">');
    expect(landingSource).not.toContain('<Link className="freepdf-free-promise"');
  });
});
