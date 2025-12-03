// src/lib/siteApi.ts

export type SitePlan = any;

const PROJECT_ID = "jylweb-4-0";

const API_BASE = import.meta.env.DEV
  ? `http://127.0.0.1:5001/${PROJECT_ID}/europe-west1/api`
  : "/api"; // plus tard : rewrites Firebase Hosting

export async function createPlan(payload: any): Promise<SitePlan> {
  const res = await fetch(`${API_BASE}/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error("Plan API error: " + text);
  }

  return res.json();
}

export async function downloadZip(plan: SitePlan): Promise<void> {
  const res = await fetch(`${API_BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error("Generate API error: " + text);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(plan.site?.name || "site").replace(/\s+/g, "_")}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
