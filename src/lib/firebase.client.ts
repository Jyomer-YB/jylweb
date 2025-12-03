// src/lib/firebase.client.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const storage = getStorage(app);

export function getFirebaseApp() {
  if (!getApps().length) {
    console.log("[jyLWeb] init Firebase", firebaseConfig);
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

export function getFirebaseStorage() {
  const app = getFirebaseApp();
  return getStorage(app);
}

export function getFirebaseAuth() {
  const app = getFirebaseApp();
  return getAuth(app);
}

/**
 * Upload une liste de fichiers images vers Firebase Storage
 * et renvoie la liste des URLs publiques.
 */
export async function uploadImageFiles(files: File[]): Promise<string[]> {
  if (!files.length) return [];

  const storage = getFirebaseStorage();
  const folder = "jylweb-sites";
  const urls: string[] = [];

  for (const file of files) {
    const cleanName = file.name.replace(/\s+/g, "-").toLowerCase();
    const fileId = `${Date.now()}-${cleanName}`;
    const ref = storageRef(storage, `${folder}/${fileId}`);

    try {
      const snap = await uploadBytes(ref, file);
      const url = await getDownloadURL(snap.ref);
      urls.push(url);
    } catch (err: any) {
      console.error("[jyLWeb] upload error", err.code, err.message, err.serverResponse ?? err);
      throw err;
    }
  }

  return urls;
}

export default app;
