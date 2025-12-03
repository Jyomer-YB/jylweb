// src/pages/api/logout.ts
import type { APIRoute } from "astro";

const COOKIE_NAME = "jylweb_token";

export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete(COOKIE_NAME, { path: "/" });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
  });
};
