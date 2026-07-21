import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { EditorBrandButton, UploadLanding } from "../../src/App.jsx";
import { ROUTE_PATHS } from "../../src/router/routePaths.js";

vi.mock("pdfjs-dist", () => ({ GlobalWorkerOptions: {}, getDocument: vi.fn() }));
vi.mock("pdfjs-dist/build/pdf.worker.mjs", () => ({}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function textOf(node) {
  return node.children.flatMap((child) => typeof child === "string" ? [child] : child?.children ? [textOf(child)] : []).join("");
}

describe("simplified dashboard navigation", () => {
  it("returns to the dashboard from the editor wordmark", async () => {
    const onDashboard = vi.fn();
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<EditorBrandButton onDashboard={onDashboard} />);
    });

    const button = renderer.root.findByProps({ "aria-label": "Back to FixThatPDF dashboard" });
    await act(async () => button.props.onClick());
    expect(onDashboard).toHaveBeenCalledOnce();
    expect(textOf(button)).toBe("FixThatPDF");
    await act(async () => renderer.unmount());
  });

  it("keeps the dashboard focused on primary tasks and recent documents", async () => {
    const onNavigate = vi.fn();
    const onSelectFiles = vi.fn();
    const onBlankPage = vi.fn();
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <UploadLanding
          section="Home"
          onNavigate={onNavigate}
          fileInputRef={{ current: null }}
          onUpload={() => {}}
          onSelectFiles={onSelectFiles}
          onDropFile={() => {}}
          onBlankPage={onBlankPage}
          uploadError=""
          uploadStage={{ status: "idle", fileName: "" }}
          isDraggingFile={false}
          setIsDraggingFile={() => {}}
          documents={[]}
          onOpenDocument={() => {}}
          onRenameDocument={() => {}}
          onDeleteDocument={() => {}}
          onDuplicateDocument={() => {}}
          onDownloadDocument={() => {}}
          onToggleFavorite={() => {}}
          onMoveDocument={() => {}}
          currentUser={{ uid: "user-1", name: "Wasseem" }}
          onLogout={() => {}}
        />,
      );
    });

    const text = textOf(renderer.root);
    expect(text).toContain("Continue where you left off");
    expect(text).toContain("Recently opened");
    expect(text).toContain("Edit a PDF");
    expect(text).toContain("Sign a PDF");
    expect(text).toContain("Organize pages");
    expect(text).toContain("All documents");
    expect(text).toContain("All features");
    expect(text).not.toContain("AI Assistant");
    expect(text).not.toContain("Recent Activity");
    expect(text).not.toContain("Total Documents");
    expect(text).not.toContain("Invite members");

    const uploadButton = renderer.root.findAllByType("button").find((button) => textOf(button) === "Upload PDF");
    await act(async () => uploadButton.props.onClick());
    expect(onSelectFiles).toHaveBeenCalledOnce();

    const brand = renderer.root.findByProps({ "aria-label": "FixThatPDF dashboard" });
    await act(async () => brand.props.onClick());
    expect(onNavigate).toHaveBeenCalledWith(ROUTE_PATHS.dashboard);
    await act(async () => renderer.unmount());
  });
});
