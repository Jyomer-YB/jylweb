
import type { SitePlan } from '@/models/site';
export function renderSite(plan: SitePlan) {
  const files: { path: string; content: string }[] = [];
  const css = `body{font-family:system-ui,sans-serif;margin:0;color:#111} .container{max-width:1100px;margin:0 auto;padding:24px} header,footer{background:#f6f7fb} .btn{background:${plan.site.primaryColor};color:#fff;padding:10px 16px;border-radius:12px;text-decoration:none}`;
  files.push({ path: 'styles/main.css', content: css });
  const layout = (title: string, body: string) => `<!doctype html><html lang="${plan.locale}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title} — ${plan.site.name}</title><link rel="stylesheet" href="/styles/main.css"/></head><body><header><div class="container"><h1>${plan.site.name}</h1></div></header><main><div class="container">${body}</div></main><footer><div class="container">© ${plan.site.name}</div></footer></body></html>`;
  for (const page of plan.pages) {
    const blocks = page.blocks.map(b => {
      switch (b.type) {
        case 'hero': return `<section><h2>${plan.site.tagline ?? ''}</h2><p>${plan.site.description}</p><a class="btn" href="/pages/contact.html">Nous contacter</a></section>`;
        case 'services': return `<section><h3>Nos services</h3></section>`;
        case 'about': return `<section><h3>À propos</h3></section>`;
        case 'contact': return `<section><h3>Contact</h3><p>${plan.contact?.email ?? ''}</p></section>`;
        case 'faq': return `<section><h3>FAQ</h3></section>`;
        case 'cta': return `<section><a class="btn" href="/pages/contact.html">Parler projet</a></section>`;
        default: return '';
      }
    }).join('\n');
    const html = layout(page.title, blocks);
    const path = page.slug === 'index' ? 'index.html' : `pages/${page.slug}.html`;
    files.push({ path, content: html });
  }
  return files;
}
