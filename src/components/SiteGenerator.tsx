// src/components/SiteGenerator.tsx
import React, { useState } from "react";
import { createPlan, downloadZip, type SitePlan } from "../lib/siteApi";

const TEMPLATES = [
  { id: "artisan", label: "Artisan / Coach" },
  { id: "restaurant", label: "Restaurant / Café" },
  { id: "agency", label: "Agence / Services" },
  { id: "saas", label: "SaaS / App" },
  { id: "other", label: "Autre vitrine" },
];

const LANGS = [
  { id: "fr", label: "Français" },
  { id: "en", label: "English" },
];

export default function SiteGenerator() {
  const [templateId, setTemplateId] = useState("artisan");
  const [locale, setLocale] = useState<"fr" | "en">("fr");

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563EB");

  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<SitePlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [logoUrl, setLogoUrl] = useState("");
  const [heroUrl, setHeroUrl] = useState("");
  const [galleryRaw, setGalleryRaw] = useState("");

  const payload = {
    templateId,
    name,
    tagline,
    description,
    primaryColor,
    locale,
    media: {
        logoUrl,
        heroUrl,
        gallery: galleryRaw
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    },
};

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setPlan(null);

    try {
      const payload = {
        templateId,
        name,
        tagline,
        description,
        primaryColor,
        locale,
      };

      const result = await createPlan(payload);
      setPlan(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!plan) {
      setError("No site generated yet.");
      return;
    }
    setError(null);
    try {
      await downloadZip(plan);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error while downloading ZIP.");
    }
  }

  return (
    <div className="space-y-8">
      {/* Bloc 1 : Type de site & langue */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            1. Website type & language
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Choose what kind of website you want. jyLWeb will adapt the structure (home, services, contact, etc.).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setTemplateId(tpl.id)}
              className={
                "border rounded-lg px-3 py-2 text-left text-sm transition " +
                (templateId === tpl.id
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 hover:border-slate-400 bg-white")
              }
            >
              {tpl.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Main language</p>
          <div className="flex gap-3">
            {LANGS.map((lng) => (
              <button
                key={lng.id}
                type="button"
                onClick={() => setLocale(lng.id as "fr" | "en")}
                className={
                  "px-3 py-1.5 rounded-full text-xs font-medium " +
                  (locale === lng.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700")
                }
              >
                {lng.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Bloc 2 : Infos business + bouton Generate */}
      <form onSubmit={handleGenerate} className="space-y-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            2. Business info
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Keep it simple. jyLWeb will turn this into clean, pro copy.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Business / project name
          </label>
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: YB Coaching"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Short tagline (optional)
          </label>
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Helping you grow faster"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Describe what you do
          </label>
          <textarea
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
            placeholder="Explain your activity in simple words..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Main color (brand)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-10 h-10 rounded-md border border-slate-300"
            />
            <input
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
                Logo (lien image) – optionnel
            </label>
            <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="https://…/mon-logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
            />
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
                Grande photo principale (lien image) – optionnel
            </label>
            <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="https://…/façade-magasin.jpg"
                value={heroUrl}
                onChange={(e) => setHeroUrl(e.target.value)}
            />
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
                Autres photos (une URL par ligne)
            </label>
            <textarea
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm min-h-[80px]"
                placeholder={"https://…/photo1.jpg\nhttps://…/photo2.jpg\nhttps://…"}
                value={galleryRaw}
                onChange={(e) => setGalleryRaw(e.target.value)}
            />
            <p className="text-[11px] text-slate-500">
                Plus tard, jyLWeb vous proposera de téléverser les images directement (Firebase Storage),
                mais pour le moment vous pouvez coller des liens.
            </p>
        </div>


        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Generating with AI..." : "Generate website plan"}
          </button>
        </div>
      </form>

      {/* Bloc 3 : Preview + Download */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              3. Preview & ZIP
            </h2>
            <p className="text-sm text-slate-500">
              This is the JSON used to build your static site.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-800"
          >
            Download ZIP
          </button>
        </div>

        <div className="border border-slate-200 rounded-lg bg-slate-50 max-h-[260px] overflow-auto text-xs font-mono p-3">
          {plan ? (
            <pre>{JSON.stringify(plan, null, 2)}</pre>
          ) : (
            <p className="text-slate-500">
              No plan yet. Fill the form above and click “Generate website plan”.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
