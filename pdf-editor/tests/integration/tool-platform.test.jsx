import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { MarketingFooter } from "../../src/components/public/MarketingFooter.jsx";
import { MarketingHeader } from "../../src/components/public/MarketingHeader.jsx";
import { ToolDirectoryPage } from "../../src/pages/public/ToolDirectoryPage.jsx";
import { ImageConversionPage } from "../../src/pages/public/ImageConversionPage.jsx";
import { PdfPageToolPage } from "../../src/pages/public/PdfPageToolPage.jsx";
import { ToolLandingPage } from "../../src/pages/public/ToolLandingPage.jsx";
import { TOOL_BY_ID } from "../../src/tools/toolRegistry.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function textOf(node) {
  return node.children.flatMap((child) => typeof child === "string" ? [child] : child?.children ? [textOf(child)] : []).join("");
}

async function render(element) {
  let renderer;
  await act(async () => {
    renderer = TestRenderer.create(<MemoryRouter>{element}</MemoryRouter>);
  });
  return renderer;
}

async function unmount(renderer) {
  await act(async () => renderer.unmount());
}

describe("public PDF tool platform", () => {
  it("prioritizes working tools while keeping planned tools separate", async () => {
    const renderer = await render(<ToolDirectoryPage />);
    const root = renderer.root;
    expect(textOf(root.findByProps({ "aria-live": "polite" }))).toBe("23 working tools");
    expect(textOf(root).includes("Planned tools (45)")).toBe(true);

    await act(async () => root.findByType("input").props.onChange({ target: { value: "PNG" } }));
    expect(textOf(root.findByProps({ "aria-live": "polite" }))).toBe("2 working tools");

    await act(async () => root.findByType("input").props.onChange({ target: { value: "" } }));
    await act(async () => root.findAllByType("button").find((button) => textOf(button) === "Protect").props.onClick());
    expect(textOf(root.findByProps({ "aria-live": "polite" }))).toBe("1 working tool");
    expect(textOf(root).includes("Protect PDF")).toBe(true);

    await act(async () => root.findAllByType("button").find((button) => textOf(button) === "All tools").props.onClick());
    expect(textOf(root.findByProps({ "aria-live": "polite" }))).toBe("23 working tools");
    await unmount(renderer);
  });

  it("shows real editor CTAs only for partial tools and no uploader for coming-soon tools", async () => {
    const partial = await render(<ToolLandingPage tool={TOOL_BY_ID.get("sign-pdf")} />);
    expect(partial.root.findAllByType("a").some((link) => textOf(link).includes("Open Sign PDF") && link.props.href === "/edit-pdf?tool=sign-pdf")).toBe(true);
    expect(textOf(partial.root).includes("Identity verification")).toBe(true);
    await unmount(partial);

    const coming = await render(<ToolLandingPage tool={TOOL_BY_ID.get("pdf-to-word")} />);
    expect(coming.root.findAllByType("input")).toHaveLength(0);
    expect(coming.root.findAllByType("button")).toHaveLength(0);
    expect(textOf(coming.root).includes("Coming soon")).toBe(true);
    expect(textOf(coming.root).includes("Layout-preserving DOCX conversion is not implemented.")).toBe(true);
    await unmount(coming);
  });

  it("renders real upload controls for dedicated image converters", async () => {
    const toPdf = await render(<ImageConversionPage tool={TOOL_BY_ID.get("jpg-to-pdf")} />);
    expect(toPdf.root.findAllByType("input").some((input) => input.props.type === "file" && input.props.multiple)).toBe(true);
    expect(textOf(toPdf.root).includes("Set the page layout")).toBe(true);
    await unmount(toPdf);

    const fromPdf = await render(<ImageConversionPage tool={TOOL_BY_ID.get("pdf-to-png")} />);
    expect(fromPdf.root.findAllByType("input").some((input) => input.props.type === "file" && !input.props.multiple)).toBe(true);
    expect(textOf(fromPdf.root).includes("Choose output quality")).toBe(true);
    await unmount(fromPdf);
  });

  it("renders real merge and page organizer workspaces", async () => {
    const merge = await render(<PdfPageToolPage tool={TOOL_BY_ID.get("merge-pdf")} />);
    expect(merge.root.findAllByType("input").some((input) => input.props.type === "file" && input.props.multiple)).toBe(true);
    expect(textOf(merge.root).includes("Combine complete PDFs")).toBe(true);
    await unmount(merge);

    const organize = await render(<PdfPageToolPage tool={TOOL_BY_ID.get("organize-pdf")} />);
    expect(organize.root.findAllByType("input").some((input) => input.props.type === "file" && !input.props.multiple)).toBe(true);
    expect(textOf(organize.root).includes("Arrange the final PDF")).toBe(true);
    await unmount(organize);
  });

  it("renders essential desktop and mobile navigation plus working footer links", async () => {
    const previousWindow = globalThis.window;
    globalThis.window = { addEventListener() {}, removeEventListener() {} };
    const renderer = await render(<MarketingHeader />);
    const root = renderer.root;

    expect(root.findAllByType("a").some((link) => textOf(link) === "All tools")).toBe(true);
    expect(root.findAllByType("a").some((link) => textOf(link) === "Privacy")).toBe(true);

    await act(async () => root.findByProps({ "aria-label": "Open navigation" }).props.onClick());
    expect(root.findAllByProps({ className: "marketing-mobile-nav" })).toHaveLength(1);
    await unmount(renderer);
    globalThis.window = previousWindow;

    const footer = await render(<MarketingFooter />);
    expect(footer.root.findAllByType("section")).toHaveLength(5);
    expect(textOf(footer.root).includes("Choose a PDF")).toBe(true);
    await unmount(footer);
  });
});
