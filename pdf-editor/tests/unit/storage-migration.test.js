import { describe, expect, it } from "vitest";
import { migratePdfEnrichStorage } from "../../src/brand/storageMigration.js";

function createStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe("PDFEnrich browser storage migration", () => {
  it("preserves local sessions, privacy choices, signatures, and analytics state", () => {
    const legacy = ["pdf", "arrow"].join("");
    const localStorage = createStorage({
      [`${legacy}.local-auth-user.v1`]: "local-user",
      [`${legacy}.privacy-choices.v1`]: "privacy-choice",
      [`${legacy}.signature-library.v1`]: "signatures",
    });
    const sessionStorage = createStorage({
      [`${legacy}_session_attribution_v1`]: "attribution",
      [`${legacy}_session_page_views_v1`]: "page-views",
      [`${legacy}_reported_diagnostics`]: "diagnostics",
    });

    migratePdfEnrichStorage({ localStorage, sessionStorage });

    expect(localStorage.getItem("pdfenrich.local-auth-user.v1")).toBe("local-user");
    expect(localStorage.getItem("pdfenrich.privacy-choices.v1")).toBe("privacy-choice");
    expect(localStorage.getItem("pdfenrich.signature-library.v1")).toBe("signatures");
    expect(sessionStorage.getItem("pdfenrich_session_attribution_v1")).toBe("attribution");
    expect(sessionStorage.getItem("pdfenrich_session_page_views_v1")).toBe("page-views");
    expect(sessionStorage.getItem("pdfenrich_reported_diagnostics")).toBe("diagnostics");
    expect(localStorage.getItem(`${legacy}.local-auth-user.v1`)).toBeNull();
    expect(sessionStorage.getItem(`${legacy}_session_attribution_v1`)).toBeNull();
  });

  it("does not replace an existing PDFEnrich value", () => {
    const legacy = ["pdf", "arrow"].join("");
    const localStorage = createStorage({
      [`${legacy}.privacy-choices.v1`]: "legacy-choice",
      "pdfenrich.privacy-choices.v1": "current-choice",
    });

    migratePdfEnrichStorage({ localStorage, sessionStorage: createStorage() });

    expect(localStorage.getItem("pdfenrich.privacy-choices.v1")).toBe("current-choice");
    expect(localStorage.getItem(`${legacy}.privacy-choices.v1`)).toBeNull();
  });
});
