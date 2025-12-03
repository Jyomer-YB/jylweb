
import type { APIRoute } from 'astro';
import { SitePlanSchema, type SitePlan } from '@/models/site';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, tagline, description, primaryColor, locale, theme } = body;

    const system = 'Tu es un architecte de sites vitrines. Réponds uniquement en JSON valide.';
    const user = `Entreprise: ${name}\nSlogan: ${tagline}\nDescription: ${description}\nCouleur: ${primaryColor}\nLangue: ${locale}\nThème: ${theme}.\nDonne un plan JSON (schema SitePlan).`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return new Response('OPENAI_API_KEY missing', { status: 500 });

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
        max_tokens: 900
      })
    });

    if (!res.ok) return new Response('OpenAI error', { status: 500 });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(text);
    const plan: SitePlan = SitePlanSchema.parse(parsed);
    return new Response(JSON.stringify(plan), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response('Plan failed: ' + e.message, { status: 500 });
  }
};
