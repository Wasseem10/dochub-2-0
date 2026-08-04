import { describe, expect, it, vi } from "vitest";
import {
  authenticateWithGoogleProvider,
  isEmbeddedMobileBrowser,
  prefersGoogleRedirect,
  shouldFallbackFromGooglePopup,
} from "../../src/auth/googleAuthFlow.js";
import { formatAuthError } from "../../src/auth/FirebaseAuthProvider.jsx";
import { resolveFirebaseAuthDomain } from "../../src/firebase.js";

function environment({ userAgent = "Desktop", mobile = false, coarse = false, width = 1440 } = {}) {
  return {
    navigator: { userAgent, userAgentData: { mobile } },
    innerWidth: width,
    matchMedia: () => ({ matches: coarse }),
  };
}

describe("Google authentication flow", () => {
  it("uses the same-origin helper only on the production PDFEnrich domain", () => {
    expect(resolveFirebaseAuthDomain("pdfenrich.com", "project.firebaseapp.com")).toBe("pdfenrich.com");
    expect(resolveFirebaseAuthDomain("www.pdfenrich.com", "project.firebaseapp.com")).toBe("pdfenrich.com");
    expect(resolveFirebaseAuthDomain("localhost", "project.firebaseapp.com")).toBe("project.firebaseapp.com");
  });

  it("prefers full-page redirect on phones and coarse small-screen devices", () => {
    expect(prefersGoogleRedirect(environment({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" }))).toBe(true);
    expect(prefersGoogleRedirect(environment({ coarse: true, width: 820 }))).toBe(true);
    expect(prefersGoogleRedirect(environment())).toBe(false);
  });

  it("uses redirect directly on mobile without attempting a popup", async () => {
    const popup = vi.fn();
    const redirect = vi.fn().mockResolvedValue(undefined);
    const result = await authenticateWithGoogleProvider({ auth: "auth", provider: "google", popup, redirect, environment: environment({ mobile: true }) });
    expect(result).toEqual({ credential: null, redirecting: true });
    expect(popup).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("auth", "google");
  });

  it("does not start Google sign-in inside known embedded mobile browsers", async () => {
    const popup = vi.fn();
    const redirect = vi.fn();
    const embeddedEnvironment = environment({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Instagram 390.0" });
    const result = await authenticateWithGoogleProvider({ auth: "auth", provider: "google", popup, redirect, environment: embeddedEnvironment });
    expect(isEmbeddedMobileBrowser(embeddedEnvironment)).toBe(true);
    expect(result).toEqual({ credential: null, redirecting: false, errorCode: "auth/embedded-browser" });
    expect(popup).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("keeps popup on desktop and falls back to redirect when the browser blocks it", async () => {
    const popup = vi.fn().mockRejectedValue({ code: "auth/popup-blocked" });
    const redirect = vi.fn().mockResolvedValue(undefined);
    const result = await authenticateWithGoogleProvider({ auth: "auth", provider: "google", popup, redirect, environment: environment() });
    expect(result.redirecting).toBe(true);
    expect(redirect).toHaveBeenCalledOnce();
    expect(shouldFallbackFromGooglePopup({ code: "auth/popup-blocked" })).toBe(true);
  });

  it("returns actionable, privacy-safe errors for blocked mobile environments", () => {
    expect(formatAuthError({ code: "auth/operation-not-supported-in-this-environment" })).toMatch(/Safari or Chrome/);
    expect(formatAuthError({ code: "auth/redirect-cancelled-by-user" })).toMatch(/try again once/);
    expect(formatAuthError({ code: "auth/network-request-failed" })).toMatch(/connection/);
  });
});
