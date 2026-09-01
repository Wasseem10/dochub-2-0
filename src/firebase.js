import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { browserLocalPersistence, getAuth, GoogleAuthProvider, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase web app identifiers are public client configuration, not secrets.
// Environment values still win so staging deployments can use a separate app.
const productionFirebaseConfig = Object.freeze({
  apiKey: "AIzaSyDciB_bwz04gAkgGTWAbctTZ2IMhslCE54",
  authDomain: "pdf-editor-1137a.firebaseapp.com",
  projectId: "pdf-editor-1137a",
  storageBucket: "pdf-editor-1137a.firebasestorage.app",
  messagingSenderId: "371323215902",
  appId: "1:371323215902:web:dfab0b21f9521b5841ce0f",
  measurementId: "G-NSFEX2FLH4",
});
const useProductionFirebaseDefaults = typeof window !== "undefined";

export function resolveFirebaseAuthDomain(hostname = "", configuredDomain = "") {
  return /^(?:www\.)?pdfenrich\.com$/i.test(hostname) ? "pdfenrich.com" : configuredDomain;
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (useProductionFirebaseDefaults ? productionFirebaseConfig.apiKey : ""),
  authDomain: resolveFirebaseAuthDomain(
    typeof window !== "undefined" ? window.location.hostname : "",
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (useProductionFirebaseDefaults ? productionFirebaseConfig.authDomain : ""),
  ),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || (useProductionFirebaseDefaults ? productionFirebaseConfig.projectId : ""),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (useProductionFirebaseDefaults ? productionFirebaseConfig.storageBucket : ""),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || (useProductionFirebaseDefaults ? productionFirebaseConfig.messagingSenderId : ""),
  appId: import.meta.env.VITE_FIREBASE_APP_ID || (useProductionFirebaseDefaults ? productionFirebaseConfig.appId : ""),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || (useProductionFirebaseDefaults ? productionFirebaseConfig.measurementId : ""),
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey
    && firebaseConfig.authDomain
    && firebaseConfig.projectId
    && firebaseConfig.appId,
);

export const firebaseApp = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY;
export const appCheck = firebaseApp && appCheckSiteKey && typeof window !== "undefined"
  ? initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    })
  : null;
export const auth = firebaseApp ? getAuth(firebaseApp) : null;
if (auth) {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    // Auth still works without this, but refresh persistence may depend on browser settings.
  });
}
export const googleProvider = firebaseApp ? new GoogleAuthProvider() : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;
export const storage = firebaseApp ? getStorage(firebaseApp) : null;
