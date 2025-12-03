// src/middleware.ts
import { defineMiddleware } from "astro:middleware";
import { verifyFirebaseIdToken } from "./lib/firebaseTokenVerifier";

const PROTECTED_PREFIXES = ["/app", "/generator"];
const COOKIE_NAME = "jylweb_token";

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies } = context;
  const pathname = url.pathname;

  // Routes publiques -> on laisse passer
  if (!PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return next();
  }

  const token = cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const redirectTo = encodeURIComponent(pathname + url.search);
    return context.redirect(`/auth/login?redirectTo=${redirectTo}`);
  }

  try {
    const user = await verifyFirebaseIdToken(token);

    // Optionnel : exposer l'utilisateur côté serveur
    // accessible dans les pages via Astro.locals.user
    // (penser à typer dans env.d.ts)
    // @ts-ignore (tu peux typer proprement juste après)
    context.locals.user = user;

    return next();
  } catch (err) {
    console.error("Invalid session token", err);
    cookies.delete(COOKIE_NAME, { path: "/" });
    const redirectTo = encodeURIComponent(pathname + url.search);
    return context.redirect(`/auth/login?redirectTo=${redirectTo}`);
  }
});
