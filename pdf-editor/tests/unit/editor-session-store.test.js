import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAllEditorSessions,
  clearEditorSessionsForOwner,
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

  it("clears all sensitive editor sessions during account deletion", async () => {
    await saveEditorSession("doc-a", { sourceFile: { name: "a.pdf" } });
    await saveEditorSession("doc-b", { sourceFile: { name: "b.pdf" } });
    await clearAllEditorSessions();
    await expect(loadEditorSession("doc-a")).resolves.toBeNull();
    await expect(loadEditorSession("doc-b")).resolves.toBeNull();
  });

  it("clears only sessions belonging to the deleted account", async () => {
    await saveEditorSession("account-a-document", { ownerId: "account-a", zoom: 90 });
    await saveEditorSession("account-b-document", { ownerId: "account-b", zoom: 110 });

    await clearEditorSessionsForOwner("account-a");

    await expect(loadEditorSession("account-a-document", "account-a")).resolves.toBeNull();
    await expect(loadEditorSession("account-b-document", "account-b")).resolves.toMatchObject({
      ownerId: "account-b",
      zoom: 110,
    });
  });

  it("does not return another owner's colliding document session", async () => {
    await saveEditorSession("same-document-id", { ownerId: "account-a", zoom: 90 });
    await saveEditorSession("same-document-id", { ownerId: "account-b", zoom: 110 });

    await expect(loadEditorSession("same-document-id", "account-a")).resolves.toMatchObject({ zoom: 90 });
    await expect(loadEditorSession("same-document-id", "account-b")).resolves.toMatchObject({ zoom: 110 });
    await expect(loadEditorSession("same-document-id", "account-c")).resolves.toBeNull();
  });
});
