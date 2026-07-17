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
