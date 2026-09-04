import React, { act, useState } from "react";
import TestRenderer from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { ToolSettingsPanel } from "../../src/App.jsx";

vi.mock("pdfjs-dist", () => ({ GlobalWorkerOptions: {}, getDocument: vi.fn() }));
vi.mock("pdfjs-dist/build/pdf.worker.mjs", () => ({}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function DrawSettingsHarness() {
  const [settings, setSettings] = useState({
    drawColor: "#2563EB",
    drawStroke: 4,
  });
  return <ToolSettingsPanel tool="draw" settings={settings} setSettings={setSettings} />;
}

function HighlightSettingsHarness({ tool = "textHighlight", hasSelectableTextLayer = false }) {
  const [settings, setSettings] = useState({
    highlightColor: "#FFDA66",
    highlightOpacity: 0.62,
  });
  return (
    <ToolSettingsPanel
      tool={tool}
      settings={settings}
      setSettings={setSettings}
      hasSelectableTextLayer={hasSelectableTextLayer}
    />
  );
}

function TextSettingsHarness() {
  const [settings, setSettings] = useState({
    textColor: "#111827",
    textSize: 16,
    fontFamily: "Arial",
    textAlign: "left",
    lineHeight: 1.25,
    textBold: false,
    textItalic: false,
    textUnderline: false,
  });
  return <ToolSettingsPanel tool="text" settings={settings} setSettings={setSettings} />;
}

describe("text tool settings", () => {
  it("shows fully labeled font size and line spacing values", async () => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<TextSettingsHarness />);
    });

    const toolbar = renderer.root.findByProps({ role: "toolbar", "aria-label": "Text formatting" });
    expect(toolbar.findByProps({ className: "text-setting-control text-size-control" }).findByType("span").children.join("")).toBe("Size");
    expect(toolbar.findByProps({ "aria-label": "Font size" }).props.value).toBe(16);
    expect(toolbar.findByProps({ className: "text-setting-control line-height-control" }).findByType("span").children.join("")).toBe("Spacing");
    expect(toolbar.findByProps({ "aria-label": "Line spacing" }).props.value).toBe(1.25);
    await act(async () => renderer.unmount());
  });
});

describe("draw tool settings", () => {
  it("exposes working preset colors, custom color choice, and pen sizes", async () => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<DrawSettingsHarness />);
    });

    const red = renderer.root.findByProps({ "aria-label": "Use red pen" });
    await act(async () => red.props.onClick());
    expect(renderer.root.findByProps({ "aria-label": "Use red pen" }).props["aria-pressed"]).toBe(true);

    const eightPixels = renderer.root.findByProps({ "aria-label": "Use 8 pixel pen" });
    await act(async () => eightPixels.props.onClick());
    expect(renderer.root.findByProps({ "aria-label": "Use 8 pixel pen" }).props["aria-pressed"]).toBe(true);
    expect(renderer.root.findByType("output").children.join("")).toBe("8px");

    const customColor = renderer.root.findByProps({ "aria-label": "Choose custom pen color" });
    await act(async () => customColor.props.onClick());
    expect(renderer.root.findByProps({ role: "dialog", "aria-label": "Choose color" })).toBeTruthy();
    await act(async () => renderer.unmount());
  });
});

describe("highlight tool settings", () => {
  it("shows a readable opacity percentage and updates it from the slider", async () => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<HighlightSettingsHarness />);
    });

    expect(renderer.root.findByProps({ role: "toolbar" }).props["aria-label"]).toBe("Text highlight settings");
    expect(renderer.root.findByProps({ className: "highlight-opacity-output" }).children.join("")).toBe("62%");

    const slider = renderer.root.findByProps({ "aria-label": "Highlight opacity" });
    await act(async () => slider.props.onChange({ target: { value: "75" } }));
    expect(renderer.root.findByProps({ className: "highlight-opacity-output" }).children.join("")).toBe("75%");
    await act(async () => renderer.unmount());
  });

  it.each([
    [false, "No text layer: place manually"],
    [true, "Manual band: place over text"],
  ])("explains manual placement before interaction when selectable text is %s", async (hasSelectableTextLayer, instruction) => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <HighlightSettingsHarness hasSelectableTextLayer={hasSelectableTextLayer} />,
      );
    });

    expect(renderer.root.findByProps({ role: "status" }).children.join("")).toBe(instruction);
    await act(async () => renderer.unmount());
  });
});

describe("direct page tool guidance", () => {
  it.each([
    ["erase", "Erase", "Select an annotation or existing text item to remove it."],
    ["stamp", "Stamp", "Click the page to place an Approved stamp."],
    ["link", "Link", "Click the page, then enter the web address for the link."],
    ["comment", "Note", "Click the page to place a note, then type your comment."],
  ])("keeps the %s instruction visible", async (tool, label, instruction) => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<ToolSettingsPanel tool={tool} settings={{}} setSettings={vi.fn()} />);
    });

    const status = renderer.root.findByProps({ role: "status" });
    expect(status.findByType("strong").children.join("")).toBe(label);
    expect(status.findByType("span").children.join("")).toBe(instruction);
    await act(async () => renderer.unmount());
  });
});

describe("edit text guidance", () => {
  it.each([
    [false, "No editable text on this page. Use Add Text to place new text."],
    [true, "Select an outlined text item on the page to edit it."],
  ])("keeps guidance inline when selectable text is %s", async (hasSelectableTextLayer, instruction) => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <ToolSettingsPanel
          tool="editText"
          settings={{}}
          setSettings={vi.fn()}
          hasSelectableTextLayer={hasSelectableTextLayer}
        />,
      );
    });

    const status = renderer.root.findByProps({ role: "status" });
    expect(status.findByType("strong").children.join("")).toBe("Edit Text");
    expect(status.findByType("span").children.join("")).toBe(instruction);
    await act(async () => renderer.unmount());
  });
});
