import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RouteErrorView } from "../../src/router/RouteErrorBoundary.jsx";

function renderView(props = {}) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <RouteErrorView {...props} />
    </MemoryRouter>,
  );
}

describe("RouteErrorView", () => {
  it("renders the selected editorial recovery screen and all recovery paths", () => {
    const markup = renderView();

    expect(markup).toContain("The page paused.");
    expect(markup).toContain("Your PDF didn");
    expect(markup).toContain("Nothing changed in your document.");
    expect(markup).toContain("Reload page");
    expect(markup).toContain('href="/tools"');
    expect(markup).toContain('href="/"');
    expect(markup).toContain("/error-state/quiet-editorial-recovery.png");
  });

  it("uses an accurate status label for a non-network route failure", () => {
    const markup = renderView({ isLoadingFailure: false });

    expect(markup).toContain("Page unavailable");
    expect(markup).not.toContain("Connection interrupted");
  });
});
