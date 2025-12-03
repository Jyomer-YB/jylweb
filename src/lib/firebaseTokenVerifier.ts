// src/lib/firebaseTokenVerifier.ts
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { JWTPayload } from "jose";


// On réutilise ton ID de projet déjà présent
const projectId = import.meta.env.PUBLIC_FIREBASE_PROJECT_ID;

if (!projectId) {
  throw new Error("PUBLIC_FIREBASE_PROJECT_ID is not defined");
}

// JWKS Firebase pour tous les projets (clés publiques)
const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

export interface FirebaseIdTokenPayload extends JWTPayload {
  user_id?: string;
  email?: string;
  email_verified?: boolean;
  // + les autres champs Firebase si tu veux
}

export interface FirebaseUserFromToken {
  uid: string;
  email?: string;
  emailVerified: boolean;
  raw: FirebaseIdTokenPayload;
}

export async function verifyFirebaseIdToken(
  idToken: string
): Promise<FirebaseUserFromToken> {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  const firebasePayload = payload as FirebaseIdTokenPayload;
  const uid = firebasePayload.user_id ?? (payload.sub as string | undefined);

  if (!uid) {
    throw new Error("Invalid Firebase token: missing uid");
  }

  return {
    uid,
    email: firebasePayload.email,
    emailVerified: !!firebasePayload.email_verified,
    raw: firebasePayload,
  };
}
