// src/pages/api/paypal/create-order.ts
import type { APIRoute } from "astro";

const PAYPAL_ENV = import.meta.env.PAYPAL_ENV ?? "sandbox";
const PAYPAL_CLIENT_ID = import.meta.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = import.meta.env.PAYPAL_CLIENT_SECRET;

function getPaypalBase() {
  return PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    console.error("[PayPal] Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET");
    throw new Error("PAYPAL_CONFIG_MISSING");
  }

  const base = getPaypalBase();
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

  const data = await res.json();

  if (!res.ok) {
    console.error("[PayPal] oauth error", data);
    throw new Error("PAYPAL_OAUTH_ERROR");
  }

  return data.access_token as string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const credits = Number(body.credits);

    if (!Number.isFinite(credits) || credits < 3) {
    //if (!Number.isFinite(credits) || credits <0.25) {
      return new Response(
        JSON.stringify({ ok: false, error: "MIN_CREDITS" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const accessToken = await getAccessToken();
    const base = getPaypalBase();

    const amountValue = credits.toFixed(2); // 1 credit = 1 USD

    const orderRes = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
        body: JSON.stringify({
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: "JYLWEB_CREDITS",
        description: "jyLWeb credits",
        amount: {
          currency_code: "USD",
          value: amountValue,
          breakdown: {
            item_total: {
              currency_code: "USD",
              value: amountValue,
            },
          },
        },
        items: [
          {
            name: "jyLWeb credits",
            description: `${credits} credits`,
            quantity: "1",
            unit_amount: {
              currency_code: "USD",
              value: amountValue,
            },
            category: "DIGITAL_GOODS",
          },
        ],
      },
    ],
    application_context: {
      brand_name: "jyLWeb",
      shipping_preference: "NO_SHIPPING", // ⬅️ important
      user_action: "PAY_NOW",
    },
  }),

    });

    const orderData = await orderRes.json();

    if (!orderRes.ok) {
      console.error("[PayPal] create order error", orderData);
      return new Response(
        JSON.stringify({ ok: false, error: "PAYPAL_CREATE_FAILED" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // c'est orderData.id que PayPal Buttons utilisera
    return new Response(
      JSON.stringify({ ok: true, orderId: orderData.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[PayPal] create-order route error", err);
    return new Response(
      JSON.stringify({ ok: false, error: "SERVER_ERROR" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
