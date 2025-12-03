import "../lib/firebase.client"; // initialise Firebase côté client

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

const INITIAL_CREDITS = 3; // 🎯 crédits offerts à l’inscription

export async function login(email: string, password: string) {
  const auth = getAuth();
  const cred = await signInWithEmailAndPassword(auth, email, password);

  const idToken = await cred.user.getIdToken(true);
  await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  return cred.user;
}

export async function register(email: string, password: string) {
  const auth = getAuth();
  const db = getFirestore();

  // 1) Création du compte Firebase Auth
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  // 2) Création / init du doc Firestore users/{uid}
  await setDoc(
    doc(db, "users", uid),
    {
      email,
      credits: INITIAL_CREDITS,    // 💰 solde initial
      totalGeneratedSites: 0,      // pour tes stats
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true } // au cas où tu réappelles plus tard
  );

  // 3) Création de la session côté serveur (comme avant)
  const idToken = await cred.user.getIdToken(true);
  await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  return cred.user;
}

export async function reset(email: string) {
  const auth = getAuth();
  await sendPasswordResetEmail(auth, email);
}
