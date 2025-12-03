// src/pages/api/generator/history.ts
import type { APIRoute } from "astro";
import { adminAuth } from "../../../lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";

export const GET: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const match = authHeader.match(/^Bearer (.+)$/i);

    if (!match) {
      return new Response(
        JSON.stringify({ ok: false, error: "UNAUTHENTICATED" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const idToken = match[1];

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch (e: any) {
      console.error(
        "[generator.history] invalid Firebase token",
        e?.code,
        e?.message || e
      );
      return new Response(
        JSON.stringify({ ok: false, error: "UNAUTHENTICATED" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const uid = decoded.uid;
    const db = getFirestore();

    const snap = await db
      .collection("users")
      .doc(uid)
      .collection("generatorHistory")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const items = snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as any),
    }));

    return new Response(JSON.stringify({ ok: true, items }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[jyLWeb] /api/generator/history error", err);
    return new Response(
      JSON.stringify({ ok: false, error: "SERVER_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
