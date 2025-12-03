
import type { SitePlan } from '@/models/site';
export async function createPlan(payload: any): Promise<SitePlan> {
  const res = await fetch('/api/plan', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error('Plan generation failed');
  return await res.json();
}
export async function downloadZip(plan: SitePlan) {
  const res = await fetch('/api/generate', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ plan }) });
  if (!res.ok) throw new Error('Zip generation failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${plan.site.name.replace(/\s+/g,'_')}.zip`; a.click();
  URL.revokeObjectURL(url);
}
