
import type { APIRoute } from 'astro';
import JSZip from 'jszip';
import { renderSite } from '@/lib/render';
import type { SitePlan } from '@/models/site';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const plan = body?.plan as SitePlan;
    if (!plan) return new Response('Missing plan', { status: 400 });

    const files = renderSite(plan);
    const zip = new JSZip();
    for (const f of files) zip.file(f.path, f.content);

    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${plan.site.name.replace(/\s+/g,'_')}.zip"`
      }
    });
  } catch (e: any) {
    return new Response('Zip failed: ' + e.message', { status: 500 });
  }
};
