// src/scripts/dashboardCredits.ts
import "../lib/firebase.client";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const auth = getAuth();
const db = getFirestore();

function initDashboardCredits() {
  const balanceEl = document.getElementById("credit-balance");
  if (!balanceEl) return;

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "/auth/login";
      return;
    }

    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      const data = snap.data() || {};
      const credits = typeof data.credits === "number" ? data.credits : 0;

      balanceEl.textContent = String(credits);
    } catch (err) {
      console.error("[Dashboard] Failed to load credits", err);
      balanceEl.textContent = "?";
    }
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", initDashboardCredits);
}
