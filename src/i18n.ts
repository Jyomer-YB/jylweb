// src/i18n.ts

import enMessages from "./locales/en.json";
import frMessages from "./locales/fr.json";

const SUPPORTED_LANGS = ["en", "fr"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

const DEFAULT_LANG: Lang = "en";

function detectLangFromHeader(header: string | null): Lang {
  if (!header) return DEFAULT_LANG;

  // exemple: "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"
  const raw = header.split(",")[0]?.trim().toLowerCase() || "";
  const code = raw.slice(0, 2); // "fr" ou "en"

  if ((SUPPORTED_LANGS as readonly string[]).includes(code)) {
    return code as Lang;
  }

  return DEFAULT_LANG;
}

export function getLangFromRequest(request: Request | undefined): Lang {
  if (!request) return DEFAULT_LANG;
  const header = request.headers.get("accept-language");
  return detectLangFromHeader(header);
}

const MESSAGES: Record<Lang, any> = {
  en: enMessages,
  fr: frMessages,
};

export function t(lang: Lang) {
  return MESSAGES[lang] || MESSAGES[DEFAULT_LANG];
}
