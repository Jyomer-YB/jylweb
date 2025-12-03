export const SYSTEM_PLAN = `
You are an expert website architect and copywriter.
You design simple, modern brochure websites for small businesses.

Rules:
- You ALWAYS respond with STRICT JSON that matches the "SitePlan" schema defined by the developer.
- Do NOT include explanations, comments, or markdown. JSON only.
- Write clear, friendly text that is easy to understand, even for older non-technical users.
`;
export function userPlanPrompt(payload) {
    const { templateId, name, tagline, description, primaryColor, locale, extraLocale, contentMode, offers, target, style, manual, } = payload || {};
    return `
Website type (template): ${templateId || "not specified"}
Business name: ${name || "not specified"}
Tagline: ${tagline || "none"}
Main description: ${description || "none"}
Primary color: ${primaryColor || "#2563EB"}
Main language: ${locale || "fr"}
Secondary language: ${extraLocale || "none"}

Content mode: ${contentMode || "ai"}
AI input - services/offers: ${offers || "not specified"}
AI input - target audience: ${target || "not specified"}
AI input - tone/style: ${style || "simple and modern"}

Manual texts provided (if any):
- Home: ${manual?.home || "none"}
- About: ${manual?.about || "none"}
- Services: ${manual?.services || "none"}

Instructions:
- Create a small brochure website with 3–6 pages (home, about, services, contact, FAQ, etc.).
- Use the template type to decide the structure (artisan, restaurant, coach, saas, ...).
- If manual texts are provided, reuse them directly (lightly edit for clarity if needed).
- If manual texts are missing, generate copy yourself based on the description and AI inputs.
- Keep text short, readable, and natural. Avoid long paragraphs.
- Output valid JSON that fits the SitePlan schema exactly.
`;
}
