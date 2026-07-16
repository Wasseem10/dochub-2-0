import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { MarketingFooter } from "../../src/components/public/MarketingFooter.jsx";
import { MarketingHeader } from "../../src/components/public/MarketingHeader.jsx";
import { ToolDirectoryPage } from "../../src/pages/public/ToolDirectoryPage.jsx";
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
  it("searches, filters, and clears the complete tool directory", async () => {
    const renderer = await render(<ToolDirectoryPage />);
    const root = renderer.root;
    expect(textOf(root.findByProps({ "aria-live": "polite" }))).toBe("68 tools");

    await act(async () => root.findByType("input").props.onChange({ target: { value: "PowerPoint" } }));
    expect(textOf(root.findByProps({ "aria-live": "polite" }))).toBe("2 tools");

    await act(async () => root.findAllByType("button").find((button) => textOf(button) === "Protect").props.onClick());
    expect(textOf(root.findByProps({ "aria-live": "polite" }))).toBe("0 tools");
    expect(root.findAllByType("h2").some((heading) => textOf(heading) === "No tools match that search")).toBe(true);

    await act(async () => root.findAllByType("button").find((button) => textOf(button) === "Clear filters").props.onClick());
    expect(textOf(root.findByProps({ "aria-live": "polite" }))).toBe("68 tools");
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

  it("opens desktop and mobile registry menus and renders grouped footer links", async () => {
    const previousWindow = globalThis.window;
    globalThis.window = { addEventListener() {}, removeEventListener() {} };
    const renderer = await render(<MarketingHeader />);
    const root = renderer.root;

    await act(async () => root.findByProps({ "aria-controls": "tools-mega-menu" }).props.onClick());
    expect(root.findByProps({ id: "tools-mega-menu" })).toBeTruthy();
    expect(textOf(root.findByProps({ id: "tools-mega-menu" })).includes("View all 68 tools")).toBe(true);

    await act(async () => root.findByProps({ "aria-label": "Open navigation" }).props.onClick());
    await act(async () => root.findAllByType("button").find((button) => textOf(button).includes("PDF tools")).props.onClick());
    expect(root.findAllByProps({ className: "marketing-mobile-tools" })).toHaveLength(1);
    await unmount(renderer);
    globalThis.window = previousWindow;

    const footer = await render(<MarketingFooter />);
    expect(footer.root.findAllByType("section")).toHaveLength(6);
    expect(textOf(footer.root).includes("View all PDF tools")).toBe(true);
    await unmount(footer);
  });
});
