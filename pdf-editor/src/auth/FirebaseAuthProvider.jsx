import { useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "../firebase.js";
import { trackProductEvent } from "../analytics/productAnalytics.js";
import { AuthContext } from "./AuthContext.jsx";

export function mapFirebaseUser(user) {
  if (!user) return null;
  const fallbackName = user.email?.split("@")[0] || "Workspace owner";
  return {
    uid: user.uid,
    email: user.email || "",
    name: user.displayName || fallbackName,
    photoURL: user.photoURL || "",
  };
}

export function formatAuthError(error) {
  const code = error?.code || "";
  if (code.includes("auth/email-already-in-use")) return "That email already has an account. Log in instead.";
  if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password")) return "Email or password is incorrect.";
  if (code.includes("auth/user-not-found")) return "No account exists for that email.";
  if (code.includes("auth/weak-password")) return "Use a password with at least 6 characters.";
  if (code.includes("auth/popup-closed-by-user")) return "Google sign-in was closed before it finished.";
  if (code.includes("auth/unauthorized-domain")) return "This domain is not authorized in Firebase Authentication settings.";
  return error?.message || "Authentication failed. Try again.";
}

export default function FirebaseAuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);

  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return undefined;
    }

    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(mapFirebaseUser(user));
      setAuthReady(true);
    });
  }, []);

  const value = useMemo(() => ({
    authReady,
    currentUser,
    isFirebaseConfigured,
    async authenticate({ mode, email, password, name, provider }) {
      if (!auth) return { ok: false, error: "Firebase is not configured yet. Add the VITE_FIREBASE_* env vars first." };
      try {
        const credential = provider === "google"
          ? await signInWithPopup(auth, googleProvider)
          : mode === "signup"
            ? await createUserWithEmailAndPassword(auth, email, password)
            : await signInWithEmailAndPassword(auth, email, password);
        if (mode === "signup" && provider !== "google" && name?.trim()) {
          await updateProfile(credential.user, { displayName: name.trim() });
        }
        const user = mapFirebaseUser(auth.currentUser || credential.user);
        const additionalUserInfo = getAdditionalUserInfo(credential);
        const isNewAccount = provider === "google" ? Boolean(additionalUserInfo?.isNewUser) : mode === "signup";
        trackProductEvent(isNewAccount ? "account_signed_up" : "account_logged_in", {
          authMethod: provider === "google" ? "google" : "password",
        });
        setCurrentUser(user);
        return { ok: true, user };
      } catch (error) {
        return { ok: false, error: formatAuthError(error) };
      }
    },
    async resetPassword(email) {
      if (!auth) return { ok: false, error: "Firebase is not configured yet. Add the VITE_FIREBASE_* env vars first." };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return { ok: false, error: "Enter a valid email address first." };
      try {
        await sendPasswordResetEmail(auth, email.trim());
        return { ok: true };
      } catch (error) {
        return { ok: false, error: formatAuthError(error) };
      }
    },
    async logout() {
      if (auth) await signOut(auth);
      setCurrentUser(null);
    },
  }), [authReady, currentUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
