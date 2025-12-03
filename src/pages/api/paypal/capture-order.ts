// src/pages/api/paypal/capture-order.ts
import type { APIRoute } from "astro";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

const PAYPAL_ENV = import.meta.env.PAYPAL_ENV || "sandbox";
const PAYPAL_CLIENT_ID = import.meta.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = import.meta.env.PAYPAL_CLIENT_SECRET;

async function getPayPalAccessToken() {
  const base =
    PAYPAL_ENV === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[PayPal] oauth error", text);
    throw new Error("PAYPAL_OAUTH_FAILED");
  }

  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1) Auth via Firebase ID token
    const authHeader = request.headers.get("authorization") || "";
    console.log("[capture-order] authHeader =", authHeader || "(none)");

    const match = authHeader.match(/^Bearer (.+)$/i);
    if (!match) {
      console.warn("[capture-order] No Bearer token in header");
      return new Response(
        JSON.stringify({ ok: false, error: "UNAUTHENTICATED" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const idToken = match[1];

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
      console.log(
        "[capture-order] verifyIdToken OK, uid =",
        decoded.uid,
        "email =",
        (decoded as any).email || null
      );
    } catch (e: any) {
      console.error(
        "[capture-order] invalid Firebase token",
        e?.code,
        e?.message || e
      );
      return new Response(
        JSON.stringify({ ok: false, error: "UNAUTHENTICATED" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const uid = decoded.uid;
    const email = (decoded as any).email || null;

    // 2) Body
    const body = await request.json();
    const orderId = body?.orderId as string | undefined;
    if (!orderId) {
      return new Response(
        JSON.stringify({ ok: false, error: "MISSING_ORDER_ID" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const base =
      PAYPAL_ENV === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";

    const accessToken = await getPayPalAccessToken();

    // 3) Capture
    const captureRes = await fetch(
      `${base}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const captureData = await captureRes.json();

    if (!captureRes.ok) {
      console.error("[PayPal] capture error", captureData);
      return new Response(
        JSON.stringify({ ok: false, error: "CAPTURE_FAILED" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4) Montant / crédits
    const pu = captureData?.purchase_units?.[0];
    const cap = pu?.payments?.captures?.[0];

    const amountStr = cap?.amount?.value as string | undefined;
    const currency = (cap?.amount?.currency_code as string | undefined) || "USD";
    const status = (cap?.status as string | undefined) || captureData?.status;

    if (!amountStr) {
      console.error("[PayPal] missing amount", captureData);
      return new Response(
        JSON.stringify({ ok: false, error: "MISSING_AMOUNT" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const credits = Number(amountStr);
    if (!Number.isFinite(credits) || credits <= 0) {
      console.error("[PayPal] invalid credits value", amountStr);
      return new Response(
        JSON.stringify({ ok: false, error: "INVALID_CREDITS" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5) Firestore
    const userRef = adminDb.collection("users").doc(uid);
    const billingRef = userRef.collection("billing").doc();

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const prevData = snap.data() || {};
      const prevCredits = Number(prevData.credits || 0);

      tx.set(
        userRef,
        {
          email: email || prevData.email || null,
          credits: prevCredits + credits,
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      tx.set(billingRef, {
        orderId,
        captureId: cap?.id || null,
        amount: credits,
        currency,
        credits,
        status,
        raw: captureData,
        createdAt: Date.now(),
      });
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[PayPal] capture-order error", err);

    // ⚠️ À garder seulement en DEV (ne pas laisser ces détails en prod)
    return new Response(
      JSON.stringify({
        ok: false,
        error: "SERVER_ERROR",
        detail: err?.message || String(err),
        // stack: err?.stack || null, // tu peux le décommenter si tu veux
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

};
