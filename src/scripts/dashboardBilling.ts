// src/scripts/dashboardBilling.ts

import "../lib/firebase.client"; // init firebase client
import { getAuth } from "firebase/auth";

const PAYPAL_CLIENT_ID = "AbR5Euht0fua4w0NldRWER_47ytwgSvIAFYK1XEfOQPyU9l79577aRzdUk89ZWtF0gDGwgv4AYMNBv4g";
const PAYPAL_ENV: "sandbox" | "live" = "sandbox"; // plus tard tu pourras mettre "live"


function loadPayPalSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    const w = window as any;

    if (w.paypal) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    const host =
      PAYPAL_ENV === "sandbox" ? "www.sandbox.paypal.com" : "www.paypal.com";

    script.src = `https://${host}/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
    script.async = true;
    script.onload = () => {
      if (w.paypal) resolve();
      else reject(new Error("PayPal SDK loaded but window.paypal is undefined"));
    };
    script.onerror = (e) => reject(e);

    document.head.appendChild(script);
  });
}

function initDashboardBilling() {
  const amountInput = document.getElementById(
    "credit-amount"
  ) as HTMLInputElement | null;
  const buttonsContainer = document.getElementById(
    "paypal-buttons"
  ) as HTMLDivElement | null;
  const messageEl = document.getElementById(
    "billing-message"
  ) as HTMLParagraphElement | null;

  if (!amountInput || !buttonsContainer) return;

  const minLabel =
    buttonsContainer.dataset.minLabel || "Minimum purchase is 3 credits.";
  const successLabel =
    buttonsContainer.dataset.successLabel ||
    "Payment completed. Your credits have been updated.";
  const errorLabel =
    buttonsContainer.dataset.errorLabel ||
    "Payment failed or cancelled. Please try again.";

  function setMessage(
    text: string,
    type: "info" | "error" | "success" = "info"
  ) {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.classList.remove(
      "text-slate-500",
      "text-red-500",
      "text-emerald-600"
    );
    if (type === "info") messageEl.classList.add("text-slate-500");
    if (type === "error") messageEl.classList.add("text-red-500");
    if (type === "success") messageEl.classList.add("text-emerald-600");
  }

  amountInput.addEventListener("change", () => {
    const val = Number(amountInput.value || 0);
    if (!Number.isFinite(val) || val < 3) {
      setMessage(minLabel, "error");
    } else {
      setMessage("", "info");
    }
  });

  loadPayPalSdk()
    .then(() => {
      const w = window as any;
      const paypal = w.paypal;
      if (!paypal) {
        throw new Error("PayPal SDK not available after load");
      }

      paypal
        .Buttons({
          style: {
            shape: "rect",
            layout: "horizontal",
            label: "paypal",
          },

          createOrder: async () => {
            const credits = Number(amountInput.value || 0);
            if (!Number.isFinite(credits) || credits < 3) {
              alert(minLabel);
              throw new Error("MIN_CREDITS");
            }

            setMessage("", "info");

            const res = await fetch("/api/paypal/create-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credits }),
            });

            const data = await res.json();

            if (!data.ok || !data.orderId) {
              console.error("[PayPal] create-order failed", data);
              setMessage(errorLabel, "error");
              throw new Error(data.error || "PAYPAL_CREATE_FAILED");
            }

            return data.orderId;
          },

          onApprove: async (data: any) => {
            try {
              // 🔐 récupérer l’ID token Firebase de l’utilisateur connecté
              const auth = getAuth();
              const currentUser = auth.currentUser;
              if (!currentUser) {
                console.error("[PayPal] No authenticated Firebase user");
                setMessage(errorLabel, "error");
                return;
              }

              const idToken = await currentUser.getIdToken(true);

              const res = await fetch("/api/paypal/capture-order", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ orderId: data.orderID }),
              });

              const payload = await res.json();
              if (!payload.ok) {
                console.error("[PayPal] capture-order failed", payload);
                setMessage(errorLabel, "error");
                return;
              }

              setMessage(successLabel, "success");

              setTimeout(() => {
                window.location.reload();
              }, 1200);
            } catch (e) {
              console.error("[PayPal] onApprove error", e);
              setMessage(errorLabel, "error");
            }
          },

          onError: (err: any) => {
            console.error("[PayPal] Buttons error", err);
            setMessage(errorLabel, "error");
          },
        })
        .render("#paypal-buttons");
    })
    .catch((err) => {
      console.error("[PayPal] Failed to load SDK", err);
      setMessage(errorLabel, "error");
    });
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", initDashboardBilling);
}
