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
    expect(new Set(Object.values(PROFESSIONAL_TOOL_ICONS)).size).toBe(EXPECTED_TOOL_IDS.length);
    expect(Object.values(PROFESSIONAL_TOOL_ICONS).every((source) => source.endsWith(".png"))).toBe(true);
  });

  it.each(EXPECTED_TOOL_IDS)("renders the exact square source asset for %s", (toolId) => {
    const markup = renderToStaticMarkup(<ProfessionalToolIcon toolId={toolId} />);

    expect(markup).toContain("<img");
    expect(markup).toContain(`src="${PROFESSIONAL_TOOL_ICONS[toolId]}"`);
    expect(markup).toContain(`data-tool-icon="${toolId}"`);
    expect(markup).toContain('width="150"');
    expect(markup).toContain('height="150"');
    expect(markup).not.toContain("<svg");
  });
});
