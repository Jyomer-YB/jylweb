// src/pages/api/generator/start.ts
import type { APIRoute } from "astro";
import { getOpenAI } from "../../../lib/openai";
import type { SiteFormInput, SiteBrief } from "../../../types/generator";
import { adminAuth } from "../../../lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1) Auth via Firebase ID token (en-tête Authorization: Bearer xxx)
    const authHeader = request.headers.get("authorization") || "";
    const match = authHeader.match(/^Bearer (.+)$/i);

    if (!match) {
      return new Response(
        JSON.stringify({ ok: false, error: "UNAUTHENTICATED" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const idToken = match[1];

    let decoded: any;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch (e) {
      console.error("[generator/start] invalid Firebase token", e);
      return new Response(
        JSON.stringify({ ok: false, error: "UNAUTHENTICATED" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const uid = decoded.uid as string;
    const email = (decoded.email as string) || null;

    // 2) Récupérer le body (brief du formulaire)
    const body = (await request.json()) as SiteFormInput;
    const locale = (body as any).locale || "fr";

    // 3) Vérifier les crédits (au moins 1 requis)
    const db = getFirestore();
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    const data = snap.data() || {};
    const currentCredits = Number(data.credits || 0);

    if (!Number.isFinite(currentCredits) || currentCredits < 1) {
      return new Response(
        JSON.stringify({ ok: false, error: "NOT_ENOUGH_CREDITS" }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4) Appel OpenAI pour construire le siteBrief
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are an assistant that turns a simple website form into a structured 'siteBrief' JSON object used to generate an Astro site.",
            "Always answer with STRICT JSON only, no markdown, no explanations.",
            "",
            "The JSON object MUST have the following keys:",
            "- elevatorPitch: string",
            "- keyBenefits: string[]",
            "- mainCTA: string",
            "- navItems: string[]",
            "- pages: array of { slug: string; title: string; sections: any[] }",
            "- seoKeywords: string[]",
            "- brandVoice: string",
            "",
            "Use the 'locale' field from the input to choose the language for ALL user-facing text:",
            "- if locale === 'fr' → write natural, professional French",
            "- if locale === 'en' → write natural, professional English",
            "",
            "Do not invent new keys, do not add comments, only return the JSON object."
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify(body),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const siteBrief = JSON.parse(raw) as SiteBrief;

    // 5) Décrémenter 1 crédit dans une transaction
    let remainingCredits = currentCredits;

    try {
      await db.runTransaction(async (tx) => {
        const snapTx = await tx.get(userRef);
        const prevData = snapTx.data() || {};
        const prevCredits = Number(prevData.credits || 0);

        if (!Number.isFinite(prevCredits) || prevCredits < 1) {
          throw new Error("NOT_ENOUGH_CREDITS");
        }

        const newCredits = prevCredits - 1;
        remainingCredits = newCredits;

        tx.set(
          userRef,
          {
            email: email || prevData.email || null,
            credits: newCredits,
            updatedAt: Date.now(),
          },
          { merge: true }
        );

        const usageRef = userRef.collection("usage").doc();
        tx.set(usageRef, {
          type: "generator-start",
          cost: 1,
          locale,
          createdAt: Date.now(),
        });
      });
    } catch (e: any) {
      if (e?.message === "NOT_ENOUGH_CREDITS") {
        return new Response(
          JSON.stringify({ ok: false, error: "NOT_ENOUGH_CREDITS" }),
          { status: 402, headers: { "Content-Type": "application/json" } }
        );
      }
      console.error("[generator/start] transaction error", e);
      return new Response(
        JSON.stringify({ ok: false, error: "GENERATOR_START_FAILED" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6) OK → on renvoie le brief + crédits restants (optionnel)
    return new Response(
      JSON.stringify({ ok: true, siteBrief, remainingCredits }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[jyLWeb] /api/generator/start error", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "GENERATOR_START_FAILED",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
