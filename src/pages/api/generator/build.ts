// src/pages/api/generator/build.ts
import type { APIRoute } from "astro";
import JSZip from "jszip";
import { getOpenAI } from "../../../lib/openai";
import { adminAuth } from "../../../lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1) Auth Firebase via Bearer token
    const authHeader = request.headers.get("authorization") || "";
    const match = authHeader.match(/^Bearer (.+)$/i);

    if (!match) {
      console.warn("[generator.build] No Bearer token");
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
        "[generator.build] verifyIdToken OK uid=",
        decoded.uid,
        "email=",
        (decoded as any).email || null
      );
    } catch (e: any) {
      console.error(
        "[generator.build] invalid Firebase token",
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

    // 2) Body (brief + template)
    const body = await request.json();
    const brief = body?.brief;
    const template = body?.template || "pro";

    if (!brief) {
      return new Response(
        JSON.stringify({ ok: false, error: "MISSING_BRIEF" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3) Vérifier les crédits AVANT de lancer l’IA
    const db = getFirestore();
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.data() || {};
    const prevCredits = Number(userData.credits || 0);

    if (!Number.isFinite(prevCredits) || prevCredits < 2) {
      console.warn(
        "[generator.build] NOT_ENOUGH_CREDITS before generation, uid=",
        uid,
        "credits=",
        prevCredits
      );
      return new Response(
        JSON.stringify({ ok: false, error: "NOT_ENOUGH_CREDITS" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4) Appel OpenAI pour générer le projet Astro complet
    const openai = getOpenAI();

    const response = await openai.responses.create({
      model: "gpt-5.1",
      input: [
        {
          role: "system",
          content: [
            "You are an expert Astro developer.",
            "You receive a structured brief (pages, sections, tone, etc.) plus a 'template' style.",
            "You must return STRICT JSON of the form:",
            '{ "files": [ { "path": "...", "content": "..." }, ... ] }',
            "",
            "The project MUST be a complete, runnable Astro project with at least:",
            "- package.json (Astro project with scripts: dev, build, preview).",
            "- astro.config.mjs.",
            "- tsconfig.json (or jsconfig.json).",
            "- src/env.d.ts (if using TypeScript).",
            "- src/pages/index.astro and any other required pages.",
            "- src/layouts/MainLayout.astro (if you reference it).",
            "",
            "Do NOT wrap the JSON in ``` or any other text. Return ONLY raw JSON."
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({ brief, template }),
        },
      ],
    });

    // 5) Extraction du texte renvoyé par la nouvelle API /responses
    let rawText = "";
    const anyResponse = response as any;
    const output = anyResponse.output;

    if (output && Array.isArray(output) && output[0]?.content?.[0]) {
      const firstContent = output[0].content[0];
      if (firstContent.text?.value) {
        rawText = firstContent.text.value;
      } else if (typeof firstContent.text === "string") {
        rawText = firstContent.text;
      }
    }

    if (!rawText) {
      throw new Error("Réponse IA vide ou illisible.");
    }

    // Au cas où le modèle renvoie quand même ```json ... ```
    rawText = rawText.trim();
    if (rawText.startsWith("```")) {
      rawText = rawText
        .replace(/^```[a-zA-Z]*\n?/, "")
        .replace(/```$/, "")
        .trim();
    }

    let manifest: { files: { path: string; content: string }[] };

    try {
      manifest = JSON.parse(rawText);
    } catch (e) {
      console.error("[jyLWeb] build parse error, rawText =", rawText);
      throw new Error("Réponse IA non JSON / invalide");
    }

    if (!manifest.files || !Array.isArray(manifest.files)) {
      throw new Error("Manifest.files manquant ou invalide");
    }

    // 6) Construire le ZIP
    const zip = new JSZip();

    for (const file of manifest.files) {
      if (!file.path || typeof file.content !== "string") continue;
      zip.file(file.path, file.content);
    }

    // README bonus
    zip.file(
      "README-jyLWeb.txt",
      [
        "Projet généré automatiquement par jyLWeb.",
        "",
        "Pour lancer :",
        "1) npm install",
        "2) npm audit fix --force",
        "3) npm run dev",
        "",
        "Tu peux ensuite adapter le contenu des pages dans src/pages/ et src/layouts/.",
      ].join("\n")
    );

    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

    // 7) Décrémenter 2 crédits + créer une entrée d'historique dans une transaction
    await db.runTransaction(async (tx) => {
      const snap2 = await tx.get(userRef);
      const data2 = snap2.data() || {};
      const currentCredits = Number(data2.credits || 0);

      if (!Number.isFinite(currentCredits) || currentCredits < 2) {
        throw new Error("NOT_ENOUGH_CREDITS_AFTER");
      }

      tx.set(
        userRef,
        {
          credits: currentCredits - 2,
          email: email || data2.email || null,
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      const historyRef = userRef.collection("generatorHistory").doc();
      tx.set(historyRef, {
        type: "generator_build",
        template,
        elevatorPitch: (brief as any)?.elevatorPitch || null,
        mainCTA: (brief as any)?.mainCTA || null,
        locale: (brief as any)?.locale || null,
        createdAt: Date.now(),
      });
    });

    // 8) Retourner le ZIP au front
    return new Response(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition":
          'attachment; filename="site-jylweb-generated.zip"',
      },
    });
  } catch (err: any) {
    console.error("[jyLWeb] /api/generator/build error", err);

    // Cas particulier : plus assez de crédits dans la transaction
    if (err?.message === "NOT_ENOUGH_CREDITS_AFTER") {
      return new Response(
        JSON.stringify({ ok: false, error: "NOT_ENOUGH_CREDITS" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: false,
        error: err?.message || "Erreur interne build",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
