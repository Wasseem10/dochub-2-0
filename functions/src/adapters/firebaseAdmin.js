import { getApps, initializeApp } from "firebase-admin/app";
import { getAppCheck } from "firebase-admin/app-check";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

export function firebaseAdminServices(bucketName) {
  const app = getApps()[0] || initializeApp();
  return Object.freeze({
    app,
    appCheck: getAppCheck(app),
    auth: getAuth(app),
    db: getFirestore(app),
    bucket: bucketName ? getStorage(app).bucket(bucketName) : null,
  });
}
