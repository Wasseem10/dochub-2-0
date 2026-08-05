// Google Identity Services returns a signed ID token directly to this page. That
// lets mobile sign-in avoid Firebase's redirect-result storage handoff entirely.
export const GOOGLE_IDENTITY_CLIENT_ID = import.meta.env.VITE_GOOGLE_IDENTITY_CLIENT_ID
  || "371323215902-3adfvcghtckkg1stag8cv31hlenog1ls.apps.googleusercontent.com";

const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client";
let googleIdentityLoadPromise;

function identityApi(environment = globalThis) {
  return environment?.google?.accounts?.id || null;
}

export function canUseGoogleIdentityCredential(environment = globalThis) {
  return Boolean(environment?.document && GOOGLE_IDENTITY_CLIENT_ID);
}

export function loadGoogleIdentityCredential(environment = globalThis) {
  const existingApi = identityApi(environment);
  if (existingApi) return Promise.resolve(existingApi);
  if (googleIdentityLoadPromise) return googleIdentityLoadPromise;

  googleIdentityLoadPromise = new Promise((resolve, reject) => {
    const documentValue = environment?.document;
    if (!documentValue?.head) {
      reject(new Error("google_identity_unavailable"));
      return;
    }
    const existingScript = documentValue.querySelector(`script[src="${GOOGLE_IDENTITY_SCRIPT}"]`);
    const script = existingScript || documentValue.createElement("script");
    const finish = () => {
      const api = identityApi(environment);
      if (api) resolve(api);
      else reject(new Error("google_identity_unavailable"));
    };
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => reject(new Error("google_identity_unavailable")), { once: true });
    if (!existingScript) {
      script.src = GOOGLE_IDENTITY_SCRIPT;
      script.async = true;
      script.defer = true;
      documentValue.head.append(script);
    }
  }).catch((error) => {
    googleIdentityLoadPromise = undefined;
    throw error;
  });

  return googleIdentityLoadPromise;
}

export async function renderGoogleCredentialButton({
  element,
  onCredential,
  onError = () => {},
  text = "signin_with",
  environment = globalThis,
}) {
  if (!element || !canUseGoogleIdentityCredential(environment)) throw new Error("google_identity_unavailable");
  const api = await loadGoogleIdentityCredential(environment);
  api.initialize({
    client_id: GOOGLE_IDENTITY_CLIENT_ID,
    auto_select: false,
    cancel_on_tap_outside: true,
    callback: (response) => {
      if (typeof response?.credential === "string" && response.credential) onCredential(response.credential);
      else onError();
    },
  });
  element.replaceChildren();
  api.renderButton(element, {
    type: "standard",
    theme: "outline",
    size: "large",
    text,
    shape: "rectangular",
    logo_alignment: "left",
    width: Math.max(240, Math.floor(element.getBoundingClientRect().width || 320)),
  });
}
