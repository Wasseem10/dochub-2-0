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

    const button = renderer.root.findByProps({ "aria-label": "Back to PDFEnrich dashboard" });
    await act(async () => button.props.onClick());
    expect(onDashboard).toHaveBeenCalledOnce();
    expect(button.props.title).toBe("Back to dashboard");
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
    expect(text).toContain("Documents");
    expect(text).toContain("Recent");
    expect(text).toContain("Edit a PDF");
    expect(text).toContain("Sign a PDF");
    expect(text).toContain("Organize pages");
    expect(text).toContain("Blank PDF");
    expect(text).toContain("All tools");
    expect(text).not.toContain("AI Assistant");
    expect(text).not.toContain("Recent Activity");
    expect(text).not.toContain("Total Documents");
    expect(text).not.toContain("Invite members");

    const uploadButton = renderer.root.findAllByType("button").find((button) => textOf(button) === "Upload PDF");
    await act(async () => uploadButton.props.onClick());
    expect(onSelectFiles).toHaveBeenCalledOnce();

    const brand = renderer.root.findByProps({ "aria-label": "PDFEnrich dashboard" });
    await act(async () => brand.props.onClick());
    expect(onNavigate).toHaveBeenCalledWith(ROUTE_PATHS.dashboard);

    const allToolsButton = renderer.root.findAllByType("button").find((button) => textOf(button) === "All tools");
    await act(async () => allToolsButton.props.onClick());
    expect(onNavigate).toHaveBeenCalledWith(ROUTE_PATHS.appTools);

    const mobileMenuButton = renderer.root.findByProps({ "aria-label": "Open dashboard navigation" });
    await act(async () => mobileMenuButton.props.onClick());
    const mobileDialog = renderer.root.findByProps({ "aria-label": "Dashboard navigation" });
    const mobileDocumentsButton = mobileDialog.findAllByType("button").find((button) => textOf(button) === "Documents");
    await act(async () => mobileDocumentsButton.props.onClick());
    expect(onNavigate).toHaveBeenCalledWith(ROUTE_PATHS.documents);
    expect(renderer.root.findAllByProps({ "aria-label": "Dashboard navigation" })).toHaveLength(0);
    await act(async () => renderer.unmount());
  });

  it("renders the working tool directory inside the editorial dashboard shell", async () => {
    const onNavigate = vi.fn();
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <UploadLanding
          section="Features"
          onNavigate={onNavigate}
          fileInputRef={{ current: null }}
          onUpload={() => {}}
          onSelectFiles={() => {}}
          onDropFile={() => {}}
          onBlankPage={() => {}}
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
          currentUser={null}
          onLogout={() => {}}
        />,
      );
    });

    const text = textOf(renderer.root);
    expect(text).toContain("All tools");
    expect(text).toContain("Most popular PDF tools");
    expect(text).toContain("Edit and view");
    expect(text).toContain("Edit PDF");
    expect(text).toContain("Private by design");

    const editPdfButton = renderer.root.findAllByType("button").find((button) => textOf(button).trim() === "Edit PDF");
    await act(async () => editPdfButton.props.onClick());
    expect(onNavigate).toHaveBeenCalledWith(ROUTE_PATHS.editPdf);
    await act(async () => renderer.unmount());
  });

  it("offers optional account sync without blocking the anonymous dashboard", async () => {
    const onNavigate = vi.fn();
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <UploadLanding
          section="Home"
          onNavigate={onNavigate}
          fileInputRef={{ current: null }}
          onUpload={() => {}}
          onSelectFiles={() => {}}
          onDropFile={() => {}}
          onBlankPage={() => {}}
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
          currentUser={null}
          onLogout={() => {}}
        />,
      );
    });

    const createAccountButton = renderer.root.findAllByType("button").find((button) => textOf(button) === "Create free account");
    expect(createAccountButton).toBeTruthy();
    await act(async () => createAccountButton.props.onClick());
    expect(onNavigate).toHaveBeenCalledWith(ROUTE_PATHS.signup);

    const mobileMenuButton = renderer.root.findByProps({ "aria-label": "Open dashboard navigation" });
    await act(async () => mobileMenuButton.props.onClick());
    expect(textOf(renderer.root.findByProps({ "aria-label": "Dashboard navigation" }))).toContain("Keep finished PDFs across devices");
    await act(async () => renderer.unmount());
  });

  it("renders documents as a compact editorial library", async () => {
    const onSelectFiles = vi.fn();
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <UploadLanding
          section="Documents"
          onNavigate={() => {}}
          fileInputRef={{ current: null }}
          onUpload={() => {}}
          onSelectFiles={onSelectFiles}
          onDropFile={() => {}}
          onBlankPage={() => {}}
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
    expect(text).toContain("Documents");
    expect(text).toContain("All your PDFs in one place");
    expect(text).toContain("0 documents");
    expect(text).toContain("Favorites");
    expect(text).toContain("Recently opened");
    expect(text).not.toContain("Upload your first PDF");

    const favoritesButton = renderer.root.findAllByType("button").find((button) => textOf(button).includes("Favorites"));
    expect(favoritesButton.props["aria-pressed"]).toBe(false);
    await act(async () => favoritesButton.props.onClick());
    expect(renderer.root.findAllByType("button").find((button) => textOf(button).includes("Favorites")).props["aria-pressed"]).toBe(true);

    const listViewButton = renderer.root.findByProps({ "aria-label": "List view" });
    const gridViewButton = renderer.root.findByProps({ "aria-label": "Grid view" });
    expect(listViewButton.props["aria-pressed"]).toBe(true);
    expect(gridViewButton.props["aria-pressed"]).toBe(false);
    await act(async () => gridViewButton.props.onClick());
    expect(renderer.root.findByProps({ "aria-label": "Grid view" }).props["aria-pressed"]).toBe(true);

    const uploadButton = renderer.root.findAllByType("button").find((button) => textOf(button).includes("Upload PDF"));
    await act(async () => uploadButton.props.onClick());
    expect(onSelectFiles).toHaveBeenCalledOnce();
    await act(async () => renderer.unmount());
  });
});
