import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { MarketingFooter } from "../../src/components/public/MarketingFooter.jsx";
import { MarketingHeader } from "../../src/components/public/MarketingHeader.jsx";
import { ToolDirectoryPage } from "../../src/pages/public/ToolDirectoryPage.jsx";
import { ImageConversionPage } from "../../src/pages/public/ImageConversionPage.jsx";
import { OfficeConversionPage } from "../../src/pages/public/OfficeConversionPage.jsx";
import { PdfPageToolPage } from "../../src/pages/public/PdfPageToolPage.jsx";
import { StructuredPdfConversionPage } from "../../src/pages/public/StructuredPdfConversionPage.jsx";
import { EditorToolUploadPage } from "../../src/pages/public/EditorToolUploadPage.jsx";
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

  it("renders the large functional upload workspace for released editor tools", async () => {
    const fileInputRef = { current: null };
    const editor = await render(
      <EditorToolUploadPage
        toolId="sign-pdf"
        fileInputRef={fileInputRef}
        onUpload={() => {}}
        onDropFiles={() => {}}
        uploadError=""
        uploadStage={{ status: "idle", percent: 0, fileName: "" }}
      />,
    );
    expect(editor.root.findAllByType("input").some((input) => input.props.type === "file" && input.props.accept.includes("application/pdf"))).toBe(true);
    expect(textOf(editor.root).includes("Sign a PDF online")).toBe(true);
    expect(textOf(editor.root).includes("Upload from your device")).toBe(true);
    expect(textOf(editor.root).includes("No account required to edit")).toBe(true);
    expect(textOf(editor.root).includes("No login required to download")).toBe(true);
    expect(editor.root.findAllByProps({ role: "button" })).toHaveLength(1);
    await unmount(editor);

    const protect = await render(<EditorToolUploadPage toolId="protect-pdf" fileInputRef={{ current: null }} onUpload={() => {}} onDropFiles={() => {}} uploadError="" uploadStage={{ status: "idle" }} />);
    expect(textOf(protect.root).includes("Protect a PDF with a password")).toBe(true);
    expect(protect.root.findAllByType("input").some((input) => input.props.type === "file")).toBe(true);
    await unmount(protect);
  });

  it("opens complete review tools and keeps unavailable tools informational", async () => {
    const review = await render(<EditorToolUploadPage toolId="review-pdf" fileInputRef={{ current: null }} onUpload={() => {}} onDropFiles={() => {}} uploadError="" uploadStage={{ status: "idle" }} />);
    expect(textOf(review.root).includes("Review a PDF online")).toBe(true);
    expect(review.root.findAllByType("input").some((input) => input.props.type === "file")).toBe(true);
    await unmount(review);

    const comment = await render(<EditorToolUploadPage toolId="comment-on-pdf" fileInputRef={{ current: null }} onUpload={() => {}} onDropFiles={() => {}} uploadError="" uploadStage={{ status: "idle" }} />);
    expect(textOf(comment.root).includes("Comment on a PDF online")).toBe(true);
    await unmount(comment);

    const coming = await render(<ToolLandingPage tool={TOOL_BY_ID.get("contract-analyzer")} />);
    expect(coming.root.findAllByType("input")).toHaveLength(0);
    expect(coming.root.findAllByType("button")).toHaveLength(0);
    expect(textOf(coming.root).includes("Coming soon")).toBe(true);
    expect(textOf(coming.root).includes("Clause extraction is not implemented")).toBe(true);
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

  it("renders complete browser workspaces for Office conversions", async () => {
    const toWord = await render(<OfficeConversionPage tool={TOOL_BY_ID.get("pdf-to-word")} />);
    expect(toWord.root.findAllByType("input").some((input) => input.props.type === "file" && input.props.accept.includes("application/pdf"))).toBe(true);
    expect(toWord.root.findAllByType("option").map((option) => textOf(option))).toEqual(["Editable text", "Visual fidelity"]);
    expect(textOf(toWord.root).includes("page breaks, indentation, vertical spacing")).toBe(true);
    await unmount(toWord);

    const toPdf = await render(<OfficeConversionPage tool={TOOL_BY_ID.get("word-to-pdf")} />);
    expect(toPdf.root.findAllByType("input").some((input) => input.props.type === "file" && input.props.accept.includes(".docx"))).toBe(true);
    expect(textOf(toPdf.root).includes("Legacy .doc files are not supported yet.")).toBe(true);
    expect(textOf(toPdf.root).includes("searchable and selectable")).toBe(true);
    await unmount(toPdf);
  });

  it("renders complete browser workspaces for structured PDF conversions", async () => {
    const cases = [
      ["pdf-to-excel", "Extract rows into a real workbook", "Download XLSX"],
      ["pdf-to-powerpoint", "Preserve every page as a slide", "Download PPTX"],
      ["pdf-to-html", "Create standalone selectable HTML", "Download HTML"],
    ];

    for (const [toolId, heading, downloadLabel] of cases) {
      const renderer = await render(<StructuredPdfConversionPage tool={TOOL_BY_ID.get(toolId)} />);
      expect(renderer.root.findAllByType("input").some((input) => input.props.type === "file" && input.props.accept.includes("application/pdf"))).toBe(true);
      expect(textOf(renderer.root).includes(heading)).toBe(true);
      expect(textOf(renderer.root).includes(downloadLabel)).toBe(true);
      await unmount(renderer);
    }
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

    const pageNumbers = await render(<PdfPageToolPage tool={TOOL_BY_ID.get("add-page-numbers")} />);
    expect(pageNumbers.root.findAllByType("input").some((input) => input.props.type === "file")).toBe(true);
    expect(textOf(pageNumbers.root).includes("Choose the number style")).toBe(true);
    expect(textOf(pageNumbers.root).includes("Download numbered PDF")).toBe(true);
    await unmount(pageNumbers);

    const watermark = await render(<PdfPageToolPage tool={TOOL_BY_ID.get("watermark-pdf")} />);
    expect(watermark.root.findAllByType("input").some((input) => input.props.type === "file" && input.props.accept.includes("application/pdf"))).toBe(true);
    expect(textOf(watermark.root).includes("Make it unmistakable")).toBe(true);
    expect(textOf(watermark.root).includes("Download watermarked PDF")).toBe(true);
    await unmount(watermark);

    const crop = await render(<PdfPageToolPage tool={TOOL_BY_ID.get("crop-pdf")} />);
    expect(textOf(crop.root).includes("Trim the edges")).toBe(true);
    expect(textOf(crop.root).includes("Download cropped PDF")).toBe(true);
    await unmount(crop);

    const compress = await render(<PdfPageToolPage tool={TOOL_BY_ID.get("compress-pdf")} />);
    expect(textOf(compress.root).includes("Make image-heavy PDFs lighter")).toBe(true);
    expect(textOf(compress.root).includes("Download compressed PDF")).toBe(true);
    await unmount(compress);
  });

  it("renders essential desktop and mobile navigation plus working footer links", async () => {
    const previousWindow = globalThis.window;
    globalThis.window = { addEventListener() {}, removeEventListener() {} };
    const renderer = await render(<MarketingHeader />);
    const root = renderer.root;

    expect(textOf(root).includes("All tools")).toBe(true);
    expect(textOf(root).includes("Choose a PDF")).toBe(true);

    await act(async () => root.findByProps({ "aria-label": "Open navigation" }).props.onClick());
    expect(root.findAllByProps({ className: "marketing-mobile-nav" })).toHaveLength(1);
    expect(textOf(root.findByProps({ className: "marketing-mobile-nav" })).includes("Privacy")).toBe(true);
    await unmount(renderer);
    globalThis.window = previousWindow;

    const footer = await render(<MarketingFooter />);
    expect(footer.root.findAllByType("section").length).toBeGreaterThan(0);
    expect(textOf(footer.root).includes("Completely free")).toBe(true);
    await unmount(footer);
  });
});
