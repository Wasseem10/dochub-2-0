const MOBILE_USER_AGENT = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile/i;
const POPUP_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
  "auth/web-storage-unsupported",
]);

export function prefersGoogleRedirect(environment = globalThis) {
  const navigatorValue = environment?.navigator;
  if (navigatorValue?.userAgentData?.mobile === true) return true;
  if (MOBILE_USER_AGENT.test(navigatorValue?.userAgent || "")) return true;
  const coarsePointer = environment?.matchMedia?.("(pointer: coarse)")?.matches === true;
  return coarsePointer && Number(environment?.innerWidth || 0) > 0 && Number(environment.innerWidth) <= 1100;
}
export function shouldFallbackFromGooglePopup(error) {
  return POPUP_FALLBACK_CODES.has(error?.code || "");
}

export async function authenticateWithGoogleProvider({
  auth,
  provider,
  popup,
  redirect,
  environment = globalThis,
}) {
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
