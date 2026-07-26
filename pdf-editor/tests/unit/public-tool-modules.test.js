import { describe, expect, it } from "vitest";
import { getPublicToolModuleLoader, PUBLIC_TOOL_MODULE_LOADERS } from "../../src/router/publicToolModules.js";
import { TOOL_REGISTRY } from "../../src/tools/toolRegistry.js";

describe("public tool module preloading", () => {
  it("assigns every released interactive tool to a preloadable module", () => {
    for (const tool of TOOL_REGISTRY.filter(({ status }) => status !== "coming-soon" && status !== "information")) {
      if (tool.workflowType === "information") continue;
      expect(getPublicToolModuleLoader(tool), tool.id).toBeTypeOf("function");
    }
  });

  it("keeps representative tools aligned with their routed module", () => {
    const byId = (id) => TOOL_REGISTRY.find((tool) => tool.id === id);
    expect(getPublicToolModuleLoader(byId("edit-pdf"))).toBe(PUBLIC_TOOL_MODULE_LOADERS.app);
    expect(getPublicToolModuleLoader(byId("merge-pdf"))).toBe(PUBLIC_TOOL_MODULE_LOADERS.pdfPageTool);
    expect(getPublicToolModuleLoader(byId("pdf-to-word"))).toBe(PUBLIC_TOOL_MODULE_LOADERS.officeConversion);
    expect(getPublicToolModuleLoader(byId("translate-pdf"))).toBe(PUBLIC_TOOL_MODULE_LOADERS.documentAnalysis);
    expect(getPublicToolModuleLoader(byId("protect-pdf"))).toBe(PUBLIC_TOOL_MODULE_LOADERS.app);
  });
});
