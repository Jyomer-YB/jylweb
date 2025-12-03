// src/pages/api/session.ts
import type { APIRoute } from "astro";
import { verifyFirebaseIdToken } from "../../lib/firebaseTokenVerifier";

const COOKIE_TOKEN = "jylweb_token"; // HttpOnly (sécurité back)
const COOKIE_AUTH = "jylweb_auth";   // visible côté JS pour le header

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json().catch(() => null);
    const idToken = body?.idToken as string | undefined;

    if (!idToken) {
      return new Response(JSON.stringify({ error: "Missing idToken" }), {
        status: 400,
      });
    }

    const user = await verifyFirebaseIdToken(idToken);

    // Cookie sécurisé pour le serveur (HttpOnly)
    cookies.set(COOKIE_TOKEN, idToken, {
      httpOnly: true,
      secure: true, // en dev HTTP ça peut être ignoré, garde si tu utilises HTTPS
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });

    // Cookie simple pour l'UI (lisible par JS)
    cookies.set("jylweb_auth", "1", {
        httpOnly: false,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
    });


    return new Response(
      JSON.stringify({
        ok: true,
        uid: user.uid,
        email: user.email,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Failed to create session", err);
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
    });
  }
};
