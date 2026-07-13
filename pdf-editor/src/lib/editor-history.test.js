import { describe, expect, it } from "vitest";
import { appendHistorySnapshot, redoHistory, undoHistory } from "./editor-history.js";

describe("editor history", () => {
  it("caps snapshots and preserves operation order", () => {
    let stack = [];
    for (let index = 0; index < 30; index += 1) stack = appendHistorySnapshot(stack, { index });
    expect(stack).toHaveLength(25);
    expect(stack[0]).toEqual({ index: 5 });
    expect(stack.at(-1)).toEqual({ index: 29 });
  });

  it("undoes and redoes complete editor snapshots", () => {
    const before = { pages: [{ id: "page" }], annotations: [], detectedTextItems: [], pageIndex: 0 };
    const after = { ...before, annotations: [{ id: "text" }] };
    const undo = undoHistory({ undoStack: [before], redoStack: [], currentSnapshot: after });
    expect(undo.snapshot.annotations).toEqual([]);
    const redo = redoHistory({ undoStack: undo.undoStack, redoStack: undo.redoStack, currentSnapshot: undo.snapshot });
    expect(redo.snapshot.annotations).toEqual([{ id: "text" }]);
  });
});
