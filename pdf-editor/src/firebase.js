import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { browserLocalPersistence, getAuth, GoogleAuthProvider, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export function resolveFirebaseAuthDomain(hostname = "", configuredDomain = "") {
  return /^(?:www\.)?pdfenrich\.com$/i.test(hostname) ? hostname.toLowerCase() : configuredDomain;
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: resolveFirebaseAuthDomain(
    typeof window !== "undefined" ? window.location.hostname : "",
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  ),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
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
// Redirect sign-in stores its pending result in the selected persistence layer. Expose
// this promise so redirect recovery never races the initial persistence configuration.
export const authPersistenceReady = auth
  ? setPersistence(auth, browserLocalPersistence).catch(() => {
      // Firebase keeps its default persistence when a browser limits local storage.
    })
  : Promise.resolve();
export const googleProvider = firebaseApp ? new GoogleAuthProvider() : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;
export const storage = firebaseApp ? getStorage(firebaseApp) : null;
