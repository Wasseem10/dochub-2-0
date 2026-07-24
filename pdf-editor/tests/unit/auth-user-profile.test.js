import { describe, expect, it } from "vitest";
import { createAuthUserProfile, normalizeAuthProvider } from "../../src/auth/authUserProfile.js";

describe("owner sign-in directory profiles", () => {
  it("distinguishes Google and email authentication", () => {
    expect(normalizeAuthProvider("google.com")).toBe("google");
    expect(normalizeAuthProvider("", [{ providerId: "google.com" }])).toBe("google");
    expect(normalizeAuthProvider("password")).toBe("email");
  });

  it("stores bounded account identity and the Firebase last sign-in time", () => {
    expect(createAuthUserProfile({
      uid: "user-1",
      email: "Person@Example.com",
      displayName: "Person One",
      providerData: [{ providerId: "google.com" }],
      metadata: { lastSignInTime: "2026-07-23T14:30:00.000Z" },
    }, "google.com")).toEqual({
      uid: "user-1",
      email: "person@example.com",
      displayName: "Person One",
      provider: "google",
      lastSignInAt: "2026-07-23T14:30:00.000Z",
    });
  });

  it("falls back to the supplied timestamp for incomplete metadata", () => {
    expect(createAuthUserProfile({
      uid: "user-2",
      email: "second@example.com",
      displayName: "",
      providerData: [{ providerId: "password" }],
      metadata: {},
    }, "password", new Date("2026-07-23T18:00:00.000Z"))).toMatchObject({
      displayName: "second",
      provider: "email",
      lastSignInAt: "2026-07-23T18:00:00.000Z",
    });
  });
});
