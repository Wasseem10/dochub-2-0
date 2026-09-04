import { describe, expect, it, vi } from "vitest";
import {
  authenticateWithGoogleProvider,
  isEmbeddedMobileBrowser,
  prefersGoogleRedirect,
  shouldFallbackFromGooglePopup,
} from "../../src/auth/googleAuthFlow.js";
import { formatAuthError, passwordResetActionSettings } from "../../src/auth/FirebaseAuthProvider.jsx";
import { resolveFirebaseAuthDomain } from "../../src/firebase.js";

function environment({ hostname = "localhost", userAgent = "Desktop", mobile = false, coarse = false, width = 1440 } = {}) {
  return {
    location: { hostname },
    navigator: { userAgent, userAgentData: { mobile } },
    innerWidth: width,
    matchMedia: () => ({ matches: coarse }),
  };
}

describe("Google authentication flow", () => {
  it("uses the same-origin Firebase helper on the PDFEnrich production domain", () => {
    expect(resolveFirebaseAuthDomain("pdfenrich.com", "project.firebaseapp.com")).toBe("pdfenrich.com");
    expect(resolveFirebaseAuthDomain("www.pdfenrich.com", "project.firebaseapp.com")).toBe("pdfenrich.com");
    expect(resolveFirebaseAuthDomain("localhost", "project.firebaseapp.com")).toBe("project.firebaseapp.com");
  });

  it("prefers a full-page redirect on production laptops and mobile browsers", () => {
    expect(prefersGoogleRedirect(environment({ hostname: "pdfenrich.com" }))).toBe(true);
    expect(prefersGoogleRedirect(environment({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" }))).toBe(true);
    expect(prefersGoogleRedirect(environment({ coarse: true, width: 820 }))).toBe(true);
    expect(prefersGoogleRedirect(environment())).toBe(false);
  });

  it("uses redirect directly on the production laptop without opening a popup", async () => {
    const popup = vi.fn();
    const redirect = vi.fn().mockResolvedValue(undefined);
    const result = await authenticateWithGoogleProvider({
      auth: "auth",
      provider: "google",
      popup,
      redirect,
      environment: environment({ hostname: "pdfenrich.com" }),
    });
    expect(result).toEqual({ credential: null, redirecting: true });
    expect(popup).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("auth", "google");
  });

  it("keeps popup locally and falls back for every recoverable browser error", async () => {
    for (const code of ["auth/popup-blocked", "auth/operation-not-supported-in-this-environment", "auth/web-storage-unsupported"]) {
      const popup = vi.fn().mockRejectedValue({ code });
      const redirect = vi.fn().mockResolvedValue(undefined);
      const result = await authenticateWithGoogleProvider({ auth: "auth", provider: "google", popup, redirect, environment: environment() });
      expect(result.redirecting).toBe(true);
      expect(redirect).toHaveBeenCalledOnce();
      expect(shouldFallbackFromGooglePopup({ code })).toBe(true);
    }
  });

  it("does not start Google sign-in inside known embedded browsers", async () => {
    const popup = vi.fn();
    const redirect = vi.fn();
    const embeddedEnvironment = environment({ userAgent: "Mozilla/5.0 (iPhone) Instagram 390.0" });
    const result = await authenticateWithGoogleProvider({ auth: "auth", provider: "google", popup, redirect, environment: embeddedEnvironment });
    expect(isEmbeddedMobileBrowser(embeddedEnvironment)).toBe(true);
    expect(result).toEqual({ credential: null, redirecting: false, errorCode: "auth/embedded-browser" });
    expect(popup).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns actionable errors without exposing provider details", () => {
    expect(formatAuthError({ code: "auth/operation-not-supported-in-this-environment" })).toMatch(/Safari, Chrome, or Edge/);
    expect(formatAuthError({ code: "auth/redirect-cancelled-by-user" })).toMatch(/try again once/);
    expect(formatAuthError({ code: "auth/network-request-failed" })).toMatch(/connection/);
    expect(formatAuthError({ code: "auth/too-many-requests" })).toMatch(/Wait a few minutes/);
  });

  it("returns password-reset users to the canonical sign-in page", () => {
    expect(passwordResetActionSettings({ location: { origin: "https://www.pdfenrich.com" } })).toEqual({
      url: "https://pdfenrich.com/login?passwordReset=complete",
      handleCodeInApp: false,
    });
    expect(passwordResetActionSettings({ location: { origin: "http://127.0.0.1:5173" } })).toEqual({
      url: "http://127.0.0.1:5173/login?passwordReset=complete",
      handleCodeInApp: false,
    });
    expect(passwordResetActionSettings({ location: { origin: "not a url" } })).toBeUndefined();
  });
});
