import { beforeEach, describe, expect, it } from "vitest";
import {
  clearEditorSession,
  clearEditorSessionMemory,
  loadEditorSession,
  saveEditorSession,
} from "../../src/tools/editorSessionStore.js";

describe("temporary editor session storage", () => {
  beforeEach(() => clearEditorSessionMemory());

  it("preserves the local file, view state, history, and pending cloud action", async () => {
    const sourceFile = { name: "contract.pdf", type: "application/pdf", size: 321 };
    const undoStack = [{ pages: [{ id: "page-before-edit" }], annotations: [{ id: "text-before-edit" }] }];
    const redoStack = [{ pages: [{ id: "page-after-edit" }], annotations: [{ id: "text-after-edit" }] }];

    await saveEditorSession("guest-document", {
      sourceFile,
      pageIndex: 3,
      zoom: 140,
      selectedId: "signature-1",
      undoStack,
      redoStack,
      pendingAction: "save",
    });

    await expect(loadEditorSession("guest-document")).resolves.toMatchObject({
      sourceFile,
      pageIndex: 3,
      zoom: 140,
      selectedId: "signature-1",
      undoStack,
      redoStack,
      pendingAction: "save",
    });
  });

  it("clears a completed or discarded session", async () => {
    await saveEditorSession("guest-document", { zoom: 100 });
    await clearEditorSession("guest-document");
    await expect(loadEditorSession("guest-document")).resolves.toBeNull();
  });
});
