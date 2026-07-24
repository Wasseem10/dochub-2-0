import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";

export function normalizeAuthProvider(providerId, providerData = []) {
  const ids = [providerId, ...providerData.map((provider) => provider?.providerId)].filter(Boolean);
  return ids.includes("google.com") || ids.includes("google") ? "google" : "email";
}

export function createAuthUserProfile(firebaseUser, providerId = "", now = new Date()) {
  if (!firebaseUser?.uid || !firebaseUser?.email) return null;
  const metadataDate = new Date(firebaseUser.metadata?.lastSignInTime || "");
  const lastSignInAt = Number.isNaN(metadataDate.getTime()) ? now.toISOString() : metadataDate.toISOString();
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email.trim().toLowerCase().slice(0, 160),
    displayName: (firebaseUser.displayName || firebaseUser.email.split("@")[0] || "PDFArrow user").trim().slice(0, 120),
    provider: normalizeAuthProvider(providerId, firebaseUser.providerData),
    lastSignInAt,
  };
}

export async function syncAuthUserProfile(firebaseUser) {
  if (!db || !firebaseUser) return false;
  let providerId = "";
  try {
    providerId = (await firebaseUser.getIdTokenResult())?.signInProvider || "";
  } catch {
    providerId = "";
  }
  const profile = createAuthUserProfile(firebaseUser, providerId);
  if (!profile) return false;
  await setDoc(doc(db, "authUserProfiles", profile.uid), {
    ...profile,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return true;
}
