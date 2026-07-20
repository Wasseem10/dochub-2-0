import { describe, expect, it } from "vitest";
import { APP_ROUTE_SECTIONS, PUBLIC_PLACEHOLDER_ROUTES } from "../../src/router/routes.js";
import { currentLocationPath, editorPath, ROUTE_PATHS, sharePath, signPath } from "../../src/router/routePaths.js";
import { TOOL_REGISTRY } from "../../src/tools/toolRegistry.js";

describe("route path configuration", () => {
  it("contains every Stage 2 route", () => {
    const configured = new Set([
      ROUTE_PATHS.home,
      ROUTE_PATHS.tools,
      ROUTE_PATHS.editPdf,
      ROUTE_PATHS.support,
      ROUTE_PATHS.login,
      ROUTE_PATHS.signup,
      ROUTE_PATHS.forgotPassword,
      ROUTE_PATHS.editorPattern,
      ROUTE_PATHS.sharePattern,
      ROUTE_PATHS.signPattern,
      ...PUBLIC_PLACEHOLDER_ROUTES.map(({ path }) => path),
      ...TOOL_REGISTRY.map(({ route }) => route),
      ...Object.keys(APP_ROUTE_SECTIONS),
    ]);

    Object.values(ROUTE_PATHS).forEach((path) => expect(configured.has(path)).toBe(true));
  });

  it("encodes dynamic route identifiers", () => {
    expect(editorPath("doc / 1")).toBe("/app/editor/doc%20%2F%201");
    expect(sharePath("token / 1")).toBe("/share/token%20%2F%201");
    expect(signPath("token / 1")).toBe("/sign/token%20%2F%201");
  });

  it("preserves the uploaded public document query when navigation state is cleared", () => {
    expect(currentLocationPath({
      pathname: "/edit-pdf",
      search: "?tool=edit-pdf&document=doc-upload-1",
      hash: "#page-2",
    })).toBe("/edit-pdf?tool=edit-pdf&document=doc-upload-1#page-2");
  });
});
