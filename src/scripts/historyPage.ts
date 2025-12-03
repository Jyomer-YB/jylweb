// src/scripts/historyPage.ts

import "../lib/firebase.client";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { downloadZip } from "../controllers/siteController";

const auth = getAuth();
const db = getFirestore();

function initHistoryPage() {
  const list = document.getElementById("history") as HTMLUListElement | null;
  if (!list) return;

  const emptyLabel = list.dataset.emptyLabel || "No site generated yet.";
  const untitledLabel = list.dataset.untitledLabel || "Untitled site";
  const templateLabel = list.dataset.templateLabel || "Template";
  const languageLabel = list.dataset.languageLabel || "Language";
  const openLabel = list.dataset.openLabel || "Reopen";
  const zipLabel = list.dataset.zipLabel || "ZIP";
  const zipErrorLabel = list.dataset.zipErrorLabel || "ZIP error";

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "/auth/login";
      return;
    }

    try {
      const q = query(
        collection(db, "users", user.uid, "projects"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        list.innerHTML = `<li class="py-4 text-sm text-gray-500">${emptyLabel}</li>`;
        return;
      }

      list.innerHTML = "";

      snap.forEach((docSnap) => {
        const data = docSnap.data() || {};
        const li = document.createElement("li");
        li.className = "py-3 flex items-center justify-between gap-3";

        const name = data.name || untitledLabel;
        const templateId = data.templateId || "-";
        const locale = data.locale || "-";
        const plan = data.plan;

        li.innerHTML = `
          <div>
            <div class="font-medium">${name}</div>
            <div class="text-xs text-gray-500">
              ${templateLabel}: ${templateId} · ${languageLabel}: ${locale}
            </div>
          </div>
          <div class="flex gap-2">
            <button class="btn px-3 py-2 rounded-xl text-sm border border-gray-200" data-action="open">${openLabel}</button>
            <button class="btn btn-brand text-sm" data-action="zip">${zipLabel}</button>
          </div>
        `;

        const zipBtn = li.querySelector<HTMLButtonElement>("[data-action='zip']");
        const openBtn = li.querySelector<HTMLButtonElement>("[data-action='open']");

        if (zipBtn) {
          zipBtn.addEventListener("click", async () => {
            if (!plan) return;
            try {
              await downloadZip(plan);
            } catch (e) {
              console.error("[History] ZIP error", e);
              alert(zipErrorLabel);
            }
          });
        }

        if (openBtn) {
          openBtn.addEventListener("click", () => {
            // Plus tard: /app/generator?projectId=docSnap.id
            alert("TODO: reopen in editor with saved project");
          });
        }

        list.appendChild(li);
      });
    } catch (err) {
      console.error("[History] Failed to load projects", err);
      list.innerHTML = `<li class="py-4 text-sm text-red-500">Error loading history.</li>`;
    }
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", initHistoryPage);
}
