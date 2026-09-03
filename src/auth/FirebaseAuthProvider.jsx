import { useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  getAdditionalUserInfo,
  getIdTokenResult,
  getRedirectResult,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, authPersistenceReady, googleProvider, isFirebaseConfigured } from "../firebase.js";
import { trackProductEvent, trackProductEventAsync } from "../analytics/productAnalytics.js";
import {
  clearCloudHistoryPreference,
  deletePrivateCloudAccountData,
  isPrivateCloudConfigured,
} from "../cloud/privateCloudDocuments.js";
import { clearEditorSignatureLibrary } from "../tools/editorSignature.js";
import { clearEditorSession, clearEditorSessionsForOwner } from "../tools/editorSessionStore.js";
import { deleteLocalDocuments, loadLocalDocuments } from "../tools/localDocumentStore.js";
import { logRedactedClientError } from "../monitoring/productionMonitoring.js";
import { AuthContext } from "./AuthContext.jsx";
import { authenticateWithGoogleProvider } from "./googleAuthFlow.js";
import { syncAuthUserProfile } from "./authUserProfile.js";

const LOCAL_AUTH_STORAGE_KEY = "pdfenrich.local-auth-user.v1";

function readLocalAuthUser() {
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_AUTH_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function createLocalAuthUser({ email, name = "" }) {
  const normalizedEmail = email.trim().toLowerCase();
  return {
    uid: `local:${normalizedEmail}`,
    email: normalizedEmail,
    name: name.trim() || normalizedEmail.split("@")[0] || "Local user",
    photoURL: "",
    providers: ["local"],
  };
}

export function mapFirebaseUser(user) {
  if (!user) return null;
  const fallbackName = user.email?.split("@")[0] || "Workspace owner";
  return {
    uid: user.uid,
    email: user.email || "",
    name: user.displayName || fallbackName,
    photoURL: user.photoURL || "",
    providers: user.providerData?.map((provider) => provider.providerId).filter(Boolean) || [],
    isAnalyticsOwner: false,
  };
}

async function mapFirebaseUserWithClaims(user) {
  const mapped = mapFirebaseUser(user);
  if (!mapped) return null;
  try {
    // Refresh once when restoring the session so newly granted or revoked
    // authorization claims take effect without waiting for the cached token.
    const token = await getIdTokenResult(user, true);
    return { ...mapped, isAnalyticsOwner: token.claims?.pdfenrichAdmin === true };
  } catch {
    return mapped;
  }
}

async function clearBrowserAccountData(userId) {
  const localDocuments = await loadLocalDocuments(userId);
  const individualSessionResults = await Promise.all([
    ...localDocuments.map((documentRecord) => clearEditorSession(documentRecord.id, userId)),
    ...localDocuments.map((documentRecord) => clearEditorSession(documentRecord.id)),
  ]);
  if (individualSessionResults.some((result) => result !== true)) {
    throw new Error("browser_cleanup_failed");
  }
  await deleteLocalDocuments(userId);
  if ((await loadLocalDocuments(userId)).length) throw new Error("browser_cleanup_failed");
  if (await clearEditorSessionsForOwner(userId) !== true) throw new Error("browser_cleanup_failed");
  if (!clearEditorSignatureLibrary(undefined, userId)) throw new Error("browser_cleanup_failed");
  if (!clearCloudHistoryPreference(userId)) throw new Error("browser_cleanup_failed");
  try {
    Object.keys(window.localStorage).filter((key) => key.includes(userId)).forEach((key) => window.localStorage.removeItem(key));
  } catch {
    throw new Error("browser_cleanup_failed");
  }
}

async function purgeUserData(userId) {
  if (!isPrivateCloudConfigured) {
    throw new Error(
      "Account deletion is unavailable until the private deletion service is configured. Your account and cloud data were not partially deleted.",
    );
  }
  await deletePrivateCloudAccountData({ expectedUserId: userId });
  await clearBrowserAccountData(userId);
}

export function formatAuthError(error) {
  const code = error?.code || "";
  if (code.includes("auth/email-already-in-use")) return "That email already has an account. Log in instead.";
  if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password")) return "Email or password is incorrect.";
  if (code.includes("auth/user-not-found")) return "No account exists for that email.";
  if (code.includes("auth/weak-password")) return "Use a password with at least 6 characters.";
  if (code.includes("auth/popup-closed-by-user")) return "Google sign-in was closed before it finished.";
  if (code.includes("auth/popup-blocked")) return "Your browser blocked Google sign-in. Open PDFEnrich directly in Safari, Chrome, or Edge and try again.";
  if (code.includes("auth/cancelled-popup-request")) return "Another Google sign-in window is already open.";
  if (code.includes("auth/operation-not-supported-in-this-environment") || code.includes("auth/web-storage-unsupported")) return "Google sign-in is blocked in this browser window. Open PDFEnrich directly in Safari, Chrome, or Edge and try again.";
  if (code.includes("auth/embedded-browser")) return "Open PDFEnrich directly in Safari, Chrome, or Edge to sign in with Google. Sign-in does not work reliably inside social-media or search-app browsers.";
  if (code.includes("auth/redirect-cancelled-by-user") || code.includes("auth/redirect-operation-pending")) return "Google sign-in did not finish. Close any extra sign-in tabs, return to PDFEnrich, and try again once.";
  if (code.includes("auth/internal-error") || code.includes("auth/argument-error")) return "Google sign-in could not finish its secure browser handoff. Open PDFEnrich directly in Safari, Chrome, or Edge and try again.";
  if (code.includes("auth/network-request-failed")) return "Google sign-in could not reach the authentication service. Check your connection and try again.";
  if (code.includes("auth/unauthorized-domain")) return "This domain is not authorized in Firebase Authentication settings.";
  if (code.includes("auth/requires-recent-login")) return "For security, sign out and sign in again before deleting your account.";
  if (error?.message === "browser_cleanup_failed") {
    return "Cloud data was removed, but this browser could not clear every local copy. Clear PDFEnrich site data, then try account deletion again.";
  }
  if (error?.code === "account_purge_unconfirmed") {
    return "Private cloud deletion was not confirmed, so your sign-in account was kept. Try again later.";
  }
  return "Authentication failed. Try again.";
}

export default function FirebaseAuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authError, setAuthError] = useState("");
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);

  useEffect(() => {
    if (!auth) {
      setCurrentUser(readLocalAuthUser());
      setAuthReady(true);
      return undefined;
    }

    let active = true;
    let authStateResolved = false;
    let redirectResolved = false;
    let unsubscribe = () => {};
    const markReady = () => {
      if (active && authStateResolved && redirectResolved) setAuthReady(true);
    };

    const initializeAuthRecovery = async () => {
      await authPersistenceReady;
      if (!active) return;

      unsubscribe = onAuthStateChanged(auth, async (user) => {
        const mappedUser = user ? await mapFirebaseUserWithClaims(user) : null;
        if (active && (auth.currentUser?.uid === user?.uid || !user)) {
          setCurrentUser(mappedUser);
          if (user) setAuthError("");
        }
        authStateResolved = true;
        markReady();
        if (user) {
          syncAuthUserProfile(user).catch((error) => {
            logRedactedClientError("Could not update the owner sign-in ledger", error);
          });
        }
      });

      try {
        const credential = await getRedirectResult(auth);
        if (!active || !credential?.user) return;
        const user = await mapFirebaseUserWithClaims(credential.user);
        if (!active) return;
        const additionalUserInfo = getAdditionalUserInfo(credential);
        trackProductEvent(additionalUserInfo?.isNewUser ? "signup_completed" : "login_completed", { authMethod: "google" });
        setAuthError("");
        setCurrentUser(user);
      } catch (error) {
        if (active) setAuthError(formatAuthError(error));
      } finally {
        redirectResolved = true;
        markReady();
      }
    };

    initializeAuthRecovery();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    authReady,
    authError,
    currentUser,
    isFirebaseConfigured,
    async authenticate({ mode, email, password, name, provider }) {
      setAuthError("");
      if (mode === "signup") trackProductEvent("signup_started", { authMethod: provider === "google" ? "google" : "email" });
      if (!auth) {
        if (provider === "google") return { ok: false, error: "Google sign-in requires cloud authentication. Use email sign-in for this local workspace." };
        const user = createLocalAuthUser({ email, name });
        try {
          window.localStorage.setItem(LOCAL_AUTH_STORAGE_KEY, JSON.stringify(user));
        } catch {
          return { ok: false, error: "This browser blocked local workspace storage. Allow site storage and try again." };
        }
        trackProductEvent(mode === "signup" ? "signup_completed" : "login_completed", { authMethod: "local" });
        setCurrentUser(user);
        return { ok: true, user };
      }
      try {
        await authPersistenceReady;
        let credential;
        if (provider === "google") {
          const googleResult = await authenticateWithGoogleProvider({
            auth,
            provider: googleProvider,
            popup: signInWithPopup,
            redirect: signInWithRedirect,
            environment: window,
          });
          if (googleResult.errorCode) return { ok: false, error: formatAuthError({ code: googleResult.errorCode }) };
          if (googleResult.redirecting) return { ok: false, redirecting: true };
          credential = googleResult.credential;
        } else {
          credential = mode === "signup"
            ? await createUserWithEmailAndPassword(auth, email, password)
            : await signInWithEmailAndPassword(auth, email, password);
        }
        if (mode === "signup" && provider !== "google" && name?.trim()) {
          await updateProfile(credential.user, { displayName: name.trim() });
        }
        const user = await mapFirebaseUserWithClaims(auth.currentUser || credential.user);
        const additionalUserInfo = getAdditionalUserInfo(credential);
        const isNewAccount = provider === "google" ? Boolean(additionalUserInfo?.isNewUser) : mode === "signup";
        trackProductEvent(isNewAccount ? "signup_completed" : "login_completed", {
          authMethod: provider === "google" ? "google" : "email",
        });
        setCurrentUser(user);
        return { ok: true, user };
      } catch (error) {
        return { ok: false, error: formatAuthError(error) };
      }
    },
    async resetPassword(email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return { ok: false, error: "Enter a valid email address first." };
      if (!auth) return { ok: true, notice: "Local browser workspaces do not require password recovery. Return to sign in to continue." };
      try {
        await sendPasswordResetEmail(auth, email.trim());
        return { ok: true };
      } catch (error) {
        return { ok: false, error: formatAuthError(error) };
      }
    },
    async deleteAccount({ password = "" } = {}) {
      if (!auth && currentUser?.providers?.includes("local")) {
        try {
          await clearBrowserAccountData(currentUser.uid);
          window.localStorage.removeItem(LOCAL_AUTH_STORAGE_KEY);
          Object.keys(window.localStorage).filter((key) => key.includes(currentUser.uid)).forEach((key) => window.localStorage.removeItem(key));
          if (window.localStorage.getItem(LOCAL_AUTH_STORAGE_KEY)) throw new Error("browser_cleanup_failed");
        } catch (error) {
          return { ok: false, error: formatAuthError(error) };
        }
        setCurrentUser(null);
        return { ok: true };
      }
      const firebaseUser = auth?.currentUser;
      if (!firebaseUser) return { ok: false, error: "Sign in before deleting your account." };
      try {
        const usesPassword = firebaseUser.providerData.some((provider) => provider.providerId === "password");
        const usesGoogle = firebaseUser.providerData.some((provider) => provider.providerId === "google.com");
        if (usesPassword) {
          if (!password) return { ok: false, error: "Enter your current password to confirm permanent deletion." };
          await reauthenticateWithCredential(firebaseUser, EmailAuthProvider.credential(firebaseUser.email, password));
        } else if (usesGoogle) {
          await reauthenticateWithPopup(firebaseUser, googleProvider);
        }
        const userId = firebaseUser.uid;
        await purgeUserData(userId);
        await deleteUser(firebaseUser);
        setCurrentUser(null);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: formatAuthError(error) };
      }
    },
    async logout() {
      const analyticsRequest = trackProductEventAsync("logout_completed", {
        authMethod: currentUser?.providers?.includes("google.com") ? "google" : currentUser?.providers?.includes("local") ? "local" : "email",
      });
      await Promise.race([
        analyticsRequest,
        new Promise((resolve) => window.setTimeout(resolve, 120)),
      ]);
      if (auth) await signOut(auth);
      else {
        try {
          window.localStorage.removeItem(LOCAL_AUTH_STORAGE_KEY);
        } catch {
          // Clearing the in-memory session still signs the local user out.
        }
      }
      setCurrentUser(null);
    },
  }), [authError, authReady, currentUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
