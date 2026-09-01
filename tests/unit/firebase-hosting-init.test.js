import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolveFirebaseAuthDomain } from "../../src/firebase.js";

describe("Firebase hosting initialization", () => {
  it("ships the config required by the same-origin auth callback", async () => {
    const config = JSON.parse(await readFile(new URL("../../runtime-public/firebase-init.json", import.meta.url), "utf8"));

    expect(config).toMatchObject({
      apiKey: expect.stringMatching(/^AIza/),
      authDomain: "pdfenrich.com",
      projectId: "pdf-editor-1137a",
      messagingSenderId: "371323215902",
    });
  });

  it("uses the same-origin helper only on the production PDFEnrich domain", () => {
    expect(resolveFirebaseAuthDomain("pdfenrich.com", "project.firebaseapp.com")).toBe("pdfenrich.com");
    expect(resolveFirebaseAuthDomain("www.pdfenrich.com", "project.firebaseapp.com")).toBe("pdfenrich.com");
    expect(resolveFirebaseAuthDomain("localhost", "project.firebaseapp.com")).toBe("project.firebaseapp.com");
  });
});
