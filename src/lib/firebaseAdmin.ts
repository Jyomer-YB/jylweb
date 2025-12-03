// src/lib/firebaseAdmin.ts
import {
  initializeApp,
  getApps,
  applicationDefault,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// ⚠️ projectId côté serveur (pas PUBLIC_)
const projectId =
  import.meta.env.PUBLIC_FIREBASE_PROJECT_ID || "jylweb-4-0";

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(), // utilise ADC (gcloud, etc.)
    projectId,                        // ⬅️ très important
  });
  console.log(
    "[firebaseAdmin] Initialized with ADC, projectId =",
    projectId
  );
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
