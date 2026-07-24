import { describe, expect, it, vi } from "vitest";
import { planCloudDocumentSync, runWithConcurrency } from "../../src/tools/cloudDocumentSync.js";

describe("cloud document sync planning", () => {
  it("uploads only new or changed documents and deletes removed documents", () => {
    const unchanged = { id: "same", name: "Same.pdf", updatedAt: "2026-07-21T10:00:00.000Z", pageCount: 1 };
    const changedBefore = { id: "changed", name: "Before.pdf", updatedAt: "2026-07-21T10:00:00.000Z", pageCount: 2 };
    const changedAfter = { ...changedBefore, name: "After.pdf", updatedAt: "2026-07-21T10:01:00.000Z" };
    const removed = { id: "removed", name: "Removed.pdf", updatedAt: "2026-07-21T10:00:00.000Z" };
    const added = { id: "added", name: "Added.pdf", updatedAt: "2026-07-21T10:02:00.000Z" };

    const result = planCloudDocumentSync(
      [unchanged, changedBefore, removed],
      [{ ...unchanged }, changedAfter, added],
    );

    expect(result.uploads.map(({ id }) => id)).toEqual(["changed", "added"]);
    expect(result.deletes.map(({ id }) => id)).toEqual(["removed"]);
  });

  it("does no work when the catalog is unchanged", () => {
    const documentRecord = { id: "same", name: "Same.pdf", updatedAt: "2026-07-21T10:00:00.000Z" };
    expect(planCloudDocumentSync([documentRecord], [{ ...documentRecord }])).toEqual({ uploads: [], deletes: [] });
  });
});

describe("bounded cloud sync execution", () => {
  it("runs every task and limits simultaneous uploads", async () => {
    let active = 0;
    let maxActive = 0;
    const completed = [];
    const tasks = Array.from({ length: 8 }, (_, index) => vi.fn(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      completed.push(index);
      active -= 1;
    }));

    await runWithConcurrency(tasks, 3);

    expect(completed).toHaveLength(8);
    expect(maxActive).toBeLessThanOrEqual(3);
    expect(tasks.every((task) => task.mock.calls.length === 1)).toBe(true);
  });
});
