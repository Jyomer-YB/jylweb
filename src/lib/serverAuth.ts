// src/lib/serverAuth.ts
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export type SessionUser = {
  uid: string;
  email?: string | null;
};

export async function getUserFromSession(request: Request): Promise<SessionUser | null> {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/session=([^;]+)/); // adapte le nom du cookie si besoin

  if (!match) return null;

  const sessionCookie = decodeURIComponent(match[1]);

  try {
    const decoded = await admin.auth().verifySessionCookie(sessionCookie, true);
    return {
      uid: decoded.uid,
      email: (decoded as any).email || null,
    };
  } catch (err) {
    console.error("[serverAuth] invalid session cookie", err);
    return null;
  }
}
