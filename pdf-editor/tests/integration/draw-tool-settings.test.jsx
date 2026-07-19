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

function HighlightSettingsHarness({ tool = "textHighlight" }) {
  const [settings, setSettings] = useState({
    highlightColor: "#FFDA66",
    highlightOpacity: 0.62,
  });
  return <ToolSettingsPanel tool={tool} settings={settings} setSettings={setSettings} />;
}

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
});
