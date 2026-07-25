import { describe, expect, it } from "vitest";
import { workflowErrorTitle } from "../../src/components/public/WorkflowErrorState.jsx";

describe("workflow error recovery copy", () => {
  it("labels common upload and processing failures clearly", () => {
    expect(workflowErrorTitle("This PDF is password protected.")).toBe("This PDF is locked");
    expect(workflowErrorTitle("Invalid PDF structure.")).toBe("We couldn’t read this file");
    expect(workflowErrorTitle("4 files were skipped: one.jpg is not a PDF.")).toBe("Some files were skipped");
    expect(workflowErrorTitle("The file exceeds the 50 MB limit.")).toBe("This file exceeds the limit");
  });

  it("uses a calm fallback for unknown failures", () => {
    expect(workflowErrorTitle("The conversion worker stopped.")).toBe("This task couldn’t finish");
  });
});
