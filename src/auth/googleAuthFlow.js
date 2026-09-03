const MOBILE_USER_AGENT = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile/i;
const EMBEDDED_BROWSER_USER_AGENT = /\b(?:FBAN|FBAV|Instagram|Line\/|Twitter|Snapchat|TikTok|LinkedInApp)\b/i;
const POPUP_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
  "auth/web-storage-unsupported",
]);

export function isCanonicalProductionHost(environment = globalThis) {
  return /^(?:www\.)?pdfenrich\.com$/i.test(environment?.location?.hostname || "");
}

export function prefersGoogleRedirect(environment = globalThis) {
  if (isCanonicalProductionHost(environment)) return true;
  const navigatorValue = environment?.navigator;
  if (navigatorValue?.userAgentData?.mobile === true) return true;
  if (MOBILE_USER_AGENT.test(navigatorValue?.userAgent || "")) return true;
  const coarsePointer = environment?.matchMedia?.("(pointer: coarse)")?.matches === true;
  return coarsePointer && Number(environment?.innerWidth || 0) > 0 && Number(environment.innerWidth) <= 1100;
}

export function shouldFallbackFromGooglePopup(error) {
  return POPUP_FALLBACK_CODES.has(error?.code || "");
}

export function isEmbeddedMobileBrowser(environment = globalThis) {
  return EMBEDDED_BROWSER_USER_AGENT.test(environment?.navigator?.userAgent || "");
}

export async function authenticateWithGoogleProvider({
  auth,
  provider,
  popup,
  redirect,
  environment = globalThis,
}) {
  if (isEmbeddedMobileBrowser(environment)) {
    return { credential: null, redirecting: false, errorCode: "auth/embedded-browser" };
  }

  if (prefersGoogleRedirect(environment)) {
    await redirect(auth, provider);
    return { credential: null, redirecting: true };
  }

  try {
    return { credential: await popup(auth, provider), redirecting: false };
  } catch (error) {
    if (!shouldFallbackFromGooglePopup(error)) throw error;
    await redirect(auth, provider);
    return { credential: null, redirecting: true };
  }
}
