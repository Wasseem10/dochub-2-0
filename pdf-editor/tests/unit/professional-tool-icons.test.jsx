import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  PROFESSIONAL_TOOL_ICONS,
  ProfessionalToolIcon,
} from "../../src/components/public/ProfessionalToolIcon.jsx";

const EXPECTED_TOOL_IDS = [
  "merge-pdf",
  "compress-pdf",
  "edit-pdf",
  "pdf-to-word",
  "split-pdf",
  "sign-pdf",
  "fill-pdf",
  "organize-pdf",
  "ocr-pdf",
  "protect-pdf",
];

describe("ProfessionalToolIcon", () => {
  it("defines one production icon for every homepage tool", () => {
    expect(Object.keys(PROFESSIONAL_TOOL_ICONS)).toEqual(EXPECTED_TOOL_IDS);
    expect(Object.values(PROFESSIONAL_TOOL_ICONS).every(({ Base, Command }) => Base && Command)).toBe(true);
  });

  it.each(EXPECTED_TOOL_IDS)("renders stable production SVG layers for %s", (toolId) => {
    const markup = renderToStaticMarkup(<ProfessionalToolIcon toolId={toolId} />);

    expect(markup.match(/<svg/g)?.length).toBeGreaterThanOrEqual(2);
    expect(markup).toContain('viewBox="0 0 24 24"');
    expect(markup).toContain(`data-tool-icon="${toolId}"`);
    expect(markup).toContain('stroke-width="0.65"');
    expect(markup).not.toContain("transform=");
  });
});
