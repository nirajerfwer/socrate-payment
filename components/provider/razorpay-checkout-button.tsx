"use client";

import { Button } from "@/components/ui/button";
import { useUser } from "@/components/provider/authoprovider";
import { useState } from "react";
import type { RazorpayPaymentResponse } from "@/types/razorpay";

const AppUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.socrate.in";

const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

type RazorpayCheckoutButtonProps = {
  label: string;
  planId: string;
};

let razorpayScriptPromise: Promise<boolean> | null = null;

function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = RAZORPAY_CHECKOUT_SRC;
      script.onload = () => resolve(true);
      script.onerror = () => {
        razorpayScriptPromise = null;
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }

  return razorpayScriptPromise;
}

export function RazorpayCheckoutButton({
  label,
  planId,
}: RazorpayCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { userInfo, refresh } = useUser();

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Failed to load Razorpay checkout script");
      }

      // Backend looks up the plan, creates the Razorpay order, and persists
      // an Order record — this route is a thin proxy to it.
      const res = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (!res.ok) throw new Error("Failed to create order");

      const data = await res.json();
      const { order, keyId } = data as {
        order?: { id: string; amount: number; currency: string };
        keyId?: string;
      };

      if (!order?.id || !keyId) {
        throw new Error("Invalid order response");
      }

      const razorpay = new window.Razorpay({
        key: keyId,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        name: "Socrate",
        description: "Pro plan",
        prefill: {
          name: userInfo?.name,
          email: userInfo?.email,
        },
        notes: { planId },
        theme: { color: "#000000" },
        handler: async (response: RazorpayPaymentResponse) => {
          try {
            const verifyRes = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!verifyRes.ok) throw new Error("Payment verification failed");

            await refresh(); // pick up the new membership before leaving
            window.location.href = AppUrl;
          } catch (error) {
            console.error("Failed to verify Razorpay payment:", error);
            setIsLoading(false);
          }
        },
        modal: {
          ondismiss: () => setIsLoading(false),
        },
      });

      razorpay.open();
    } catch (error) {
      console.error("Failed to open Razorpay checkout:", error);
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleCheckout} disabled={isLoading} className="w-full mb-6">
      {isLoading ? "Loading..." : label}
    </Button>
  );
}
