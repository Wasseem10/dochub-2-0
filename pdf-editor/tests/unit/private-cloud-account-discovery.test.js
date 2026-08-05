import { describe, expect, it } from "vitest";

import { shouldLoadAccountCloudDocuments } from "../../src/cloud/privateCloudDocuments.js";

describe("private cloud account discovery", () => {
  it("loads documents already saved to the account on every signed-in device", () => {
    expect(shouldLoadAccountCloudDocuments({
      userId: "account-user",
      configured: true,
      publicEditor: false,
    })).toBe(true);
  });

  it("does not run without an authenticated private-cloud context", () => {
    expect(shouldLoadAccountCloudDocuments({ configured: true })).toBe(false);
    expect(shouldLoadAccountCloudDocuments({ userId: "account-user" })).toBe(false);
    expect(shouldLoadAccountCloudDocuments({
      userId: "account-user",
      configured: true,
      publicEditor: true,
    })).toBe(false);
  });
});
