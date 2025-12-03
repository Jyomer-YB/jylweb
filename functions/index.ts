// functions/index.ts
import express from "express";
import cors from "cors";
import JSZip from "jszip";
import { onRequest } from "firebase-functions/v2/https";
import * as functions from "firebase-functions";
import { z } from "zod";
import OpenAI from "openai";
import { SYSTEM_PLAN, userPlanPrompt } from "./prompts";

// ---------- Models ----------
const MODEL_PLAN = process.env.OPENAI_MODEL_PLAN || "gpt-4.1-mini";

const SitePlanSchema = z.object({
  locale: z.enum(["fr", "en"]).default("fr"),
  site: z.object({
    name: z.string(),
    tagline: z.string().optional(),
    description: z.string(),
    primaryColor: z.string().default("#2563EB"),
    theme: z
      .enum(["classic", "agency", "artisan", "restaurant", "saas"])
      .default("classic"),
  }),
  business: z
    .object({
      sector: z.string().optional().default(""),
      offers: z.array(z.object({ title: z.string(), desc: z.string() })).optional(),
      faqs: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
    })
    .optional(),
  media: z
    .object({
      logoUrl: z.string().optional(),
      heroUrl: z.string().optional(),
      gallery: z.array(z.string()).optional(), // ✅ plusieurs images
    })
    .optional(),
  contact: z
    .object({
      city: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
    })
    .optional(),
  pages: z.array(
    z.object({
      slug: z.string(),
      title: z.string(),
      blocks: z.array(
        z.object({
          type: z.enum(["hero", "services", "about", "contact", "faq", "cta"]),
          data: z.record(z.any()).optional(),
        })
      ),
    })
  ),
});

export type SitePlan = z.infer<typeof SitePlanSchema>;

// ---------- Render ----------
function renderSite(plan: SitePlan) {
  const files: { path: string; content: string }[] = [];

  const css = `body{font-family:system-ui,sans-serif;margin:0;color:#111;background:#f3f4f6}
.container{max-width:1100px;margin:0 auto;padding:24px}
header,footer{background:#ffffff;border-bottom:1px solid #e5e7eb}
main{padding-top:16px;padding-bottom:32px}
.btn{background:${plan.site.primaryColor};color:#fff;padding:10px 16px;border-radius:999px;text-decoration:none}
section{margin:32px 0}
h1,h2,h3{margin-bottom:12px}
p{margin:4px 0 12px}
.hero-img{max-width:100%;border-radius:16px;margin-top:16px}
.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:12px}
.gallery img{width:100%;border-radius:12px;}`;
  files.push({ path: "styles/main.css", content: css });

  const layout = (title: string, body: string) =>
    `<!doctype html><html lang="${plan.locale}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} — ${plan.site.name}</title>
<link rel="stylesheet" href="/styles/main.css"/>
</head>
<body>
<header>
  <div class="container">
    <h1>${plan.site.name}</h1>
    ${plan.site.tagline ? `<p>${plan.site.tagline}</p>` : ""}
  </div>
</header>
<main>
  <div class="container">
    ${body}
  </div>
</main>
<footer>
  <div class="container">
    © ${new Date().getFullYear()} ${plan.site.name}
  </div>
</footer>
</body>
</html>`;

  for (const page of plan.pages) {
    const blocks = page.blocks
      .map((b) => {
        switch (b.type) {
          case "hero":
            return `<section>
  <h2>${page.title}</h2>
  <p>${plan.site.description}</p>
  ${
    plan.media?.heroUrl
      ? `<img src="${plan.media.heroUrl}" alt="" class="hero-img"/>`
      : ""
  }
  <a class="btn" href="/pages/contact.html">${plan.locale === "fr" ? "Nous contacter" : "Contact us"}</a>
</section>`;
          case "services":
            return `<section><h3>${plan.locale === "fr" ? "Nos services" : "Our services"}</h3></section>`;
          case "about":
            return `<section><h3>${plan.locale === "fr" ? "À propos" : "About us"}</h3></section>`;
          case "contact":
            return `<section>
  <h3>${plan.locale === "fr" ? "Contact" : "Contact"}</h3>
  <p>${plan.contact?.email ?? ""}</p>
  <p>${plan.contact?.phone ?? ""}</p>
  <p>${plan.contact?.city ?? ""}</p>
</section>`;
          case "faq":
            return `<section><h3>FAQ</h3></section>`;
          case "cta":
            return `<section><a class="btn" href="/pages/contact.html">${
              plan.locale === "fr" ? "Parler de votre projet" : "Start a project"
            }</a></section>`;
          default:
            return "";
        }
      })
      .join("\n");

    // petite galerie d'images si fournie
    const galleryHtml =
      plan.media?.gallery && plan.media.gallery.length
        ? `<section>
  <h3>${plan.locale === "fr" ? "Galerie" : "Gallery"}</h3>
  <div class="gallery">
    ${plan.media.gallery
      .map((url) => `<img src="${url}" alt="" loading="lazy" />`)
      .join("\n")}
  </div>
</section>`
        : "";

    const html = layout(page.title, blocks + "\n" + galleryHtml);
    const path = page.slug === "index" ? "index.html" : `pages/${page.slug}.html`;
    files.push({ path, content: html });
  }

  return files;
}

// ---------- Express ----------
const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "3mb" }));

// /plan → génération du plan JSON via OpenAI
app.post("/plan", async (req, res) => {
  try {
    const payload = req.body || {};

    const apiKey =
      process.env.OPENAI_API_KEY ||
      (functions.config() as any)?.openai?.key;
    if (!apiKey) {
      res.status(500).send("OPENAI_API_KEY missing");
      return;
    }

    const openai = new OpenAI({ apiKey });

    const system = SYSTEM_PLAN;
    const user = userPlanPrompt(payload); // texte en anglais

    const response: any = await openai.responses.create({
      model: MODEL_PLAN,
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.5,
      max_output_tokens: 900,
    });

    const text = response.output_text as string;
    const parsed = JSON.parse(text);
    const plan = SitePlanSchema.parse(parsed);

    res.json(plan);
  } catch (e: any) {
    console.error("Plan error", e);
    res.status(500).send("Plan failed: " + e.message);
  }
});

// /generate → ZIP à partir du plan
app.post("/generate", async (req, res) => {
  try {
    const plan = req.body?.plan as SitePlan | undefined;
    if (!plan) {
      res.status(400).send("Missing plan");
      return;
    }

    const files = renderSite(plan);
    const zip = new JSZip();
    for (const f of files) {
      zip.file(f.path, f.content);
    }

    const buf = await zip.generateAsync({ type: "nodebuffer" });
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${plan.site.name.replace(/\s+/g, "_")}.zip"`
    );
    res.send(buf);
  } catch (e: any) {
    console.error("ZIP error", e);
    res.status(500).send("Zip failed: " + e.message);
  }
});

// ---------- Firebase HTTPS function ----------
export const api = onRequest({ region: "europe-west1" }, app);
