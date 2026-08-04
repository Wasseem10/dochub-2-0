import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("Firebase hosting initialization", () => {
  it("ships the config required by the same-origin auth callback", async () => {
    const config = JSON.parse(await readFile(new URL("../../runtime-public/firebase-init.json", import.meta.url), "utf8"));

    expect(config).toMatchObject({
      apiKey: expect.stringMatching(/^AIza/),
      authDomain: "pdf-editor-1137a.firebaseapp.com",
      projectId: "pdf-editor-1137a",
      messagingSenderId: "371323215902",
    });
  });
});
