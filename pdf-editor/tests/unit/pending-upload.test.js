import { describe, expect, it } from "vitest";
import { consumePendingPdfFile, setPendingPdfFile } from "../../src/router/pendingUpload.js";

describe("pending editor uploads", () => {
  it("keeps simultaneous tool uploads isolated by token and consumes each once", () => {
    const first = { name: "first.pdf" };
    const second = { name: "second.pdf" };
    const firstToken = setPendingPdfFile(first);
    const secondToken = setPendingPdfFile(second);

    expect(firstToken).not.toBe(secondToken);
    expect(consumePendingPdfFile(secondToken)).toBe(second);
    expect(consumePendingPdfFile(firstToken)).toBe(first);
    expect(consumePendingPdfFile(firstToken)).toBeNull();
  });
});
