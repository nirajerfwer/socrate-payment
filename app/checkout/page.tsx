"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/components/provider/authoprovider";
import {
  GetMemberPlans,
  getOrderSummary,
  MemberPlan,
  OrderSummaryResponse,
} from "@/lib/services";
import type { RazorpayPaymentResponse } from "@/types/razorpay";

const AppUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.socrate.in";
const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

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

// "Pro Monthly" -> { base: "Pro", cycle: "monthly" }. Plans that don't follow
// this naming just get no cycle detected — the toggle only shows up when
// there's actually another plan to switch to.
function splitPlanName(name: string): { base: string; cycle: "monthly" | "yearly" | null } {
  const match = name.match(/^(.*?)\s*[-–]?\s*(monthly|yearly|annual(?:ly)?)$/i);
  if (!match) return { base: name.trim(), cycle: null };
  const cycle = /monthly/i.test(match[2]) ? "monthly" : "yearly";
  return { base: match[1].trim() || name.trim(), cycle };
}

function formatAmount(paise: number, currency: string) {
  const value = paise / 100;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function CheckoutPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planId = searchParams.get("planId");

  const { userInfo, refresh } = useUser();

  const [plans, setPlans] = useState<MemberPlan[]>([]);
  const [summary, setSummary] = useState<OrderSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the full plan list once, so we can offer a monthly/yearly switch
  // between sibling plans that share a base name.
  useEffect(() => {
    let cancelled = false;
    GetMemberPlans()
      .then((res) => {
        if (!cancelled) setPlans(res.data.PlanList);
      })
      .catch(() => {
        // Non-fatal — the cycle switcher just won't render.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the price breakdown for the currently selected plan.
  useEffect(() => {
    if (!planId) {
      setError("No plan selected.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getOrderSummary(planId)
      .then((res) => {
        if (!cancelled) setSummary(res);
      })
      .catch((err) => {
        console.error("Failed to load order summary:", err);
        if (!cancelled) setError("Couldn't load pricing for this plan. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  const currentPlan = useMemo(
    () => plans.find((p) => p._id === planId) ?? null,
    [plans, planId]
  );

  // Sibling plans sharing the same base name (e.g. "Pro Monthly" / "Pro
  // Yearly") but a different billing cycle — only rendered when there's
  // actually more than one to choose from.
  const cycleOptions = useMemo(() => {
    if (!currentPlan) return [];
    const { base } = splitPlanName(currentPlan.name);
    const siblings = plans.filter((p) => {
      if (p.price === 0) return false;
      const split = splitPlanName(p.name);
      return split.base.toLowerCase() === base.toLowerCase() && split.cycle !== null;
    });
    return siblings.length > 1 ? siblings : [];
  }, [plans, currentPlan]);

  const handlePay = async () => {
    if (!planId || !summary) return;
    setIsPaying(true);
    setError(null);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Failed to load Razorpay checkout script");
      }

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
      if (!order?.id || !keyId) throw new Error("Invalid order response");

      const razorpay = new window.Razorpay({
        key: keyId,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        name: "Socrate",
        description: summary.plan.name,
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

            await refresh();
            window.location.href = AppUrl;
          } catch (err) {
            console.error("Failed to verify Razorpay payment:", err);
            setError("Payment succeeded but activation failed. Contact support with your payment id.");
            setIsPaying(false);
          }
        },
        modal: {
          ondismiss: () => setIsPaying(false),
        },
      });

      razorpay.open();
    } catch (err) {
      console.error("Failed to open Razorpay checkout:", err);
      setError("Couldn't start checkout. Please try again.");
      setIsPaying(false);
    }
  };

  if (!userInfo) {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <p className="text-muted-foreground mb-6">You need to be signed in to check out.</p>
        <Button onClick={() => router.push(`/login?next=${encodeURIComponent(`/checkout?planId=${planId ?? ""}`)}`)}>
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-16">
      <Link
        href="/#pricing"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-4 w-4" /> Back to plans
      </Link>

      <h1 className="text-2xl font-bold mb-1">Checkout</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Review your order before paying — this is exactly what Razorpay will charge.
      </p>

      {loading && <p className="text-muted-foreground">Loading order summary…</p>}

      {!loading && error && !summary && (
        <p className="text-destructive">{error}</p>
      )}

      {!loading && summary && (
        <div className="rounded-xl border border-border bg-background p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-lg">{summary.plan.name}</h2>
            {cycleOptions.length > 0 && (
              <div className="inline-flex rounded-lg border border-border p-0.5 text-xs">
                {cycleOptions.map((p) => {
                  const { cycle } = splitPlanName(p.name);
                  const active = p._id === planId;
                  return (
                    <button
                      key={p._id}
                      onClick={() => router.push(`/checkout?planId=${p._id}`)}
                      className={`px-2.5 py-1 rounded-md capitalize transition-colors ${
                        active
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cycle}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {summary.plan.description && (
            <p className="text-sm text-muted-foreground mb-6">{summary.plan.description}</p>
          )}

          <dl className="space-y-2.5 text-sm mb-4">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Plan price</dt>
              <dd>{formatAmount(summary.breakdown.baseAmount, summary.breakdown.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                Convenience fee ({summary.breakdown.convenienceFeePercent}%)
              </dt>
              <dd>{formatAmount(summary.breakdown.convenienceFee, summary.breakdown.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">GST ({summary.breakdown.gstPercent}%)</dt>
              <dd>{formatAmount(summary.breakdown.gstAmount, summary.breakdown.currency)}</dd>
            </div>
          </dl>

          <div className="border-t border-border pt-4 flex justify-between items-baseline mb-6">
            <span className="font-semibold">Total due today</span>
            <span className="text-xl font-bold">
              {formatAmount(summary.breakdown.totalAmount, summary.breakdown.currency)}
            </span>
          </div>

          {error && <p className="text-destructive text-sm mb-4">{error}</p>}

          <Button onClick={handlePay} disabled={isPaying} className="w-full mb-4">
            {isPaying
              ? "Processing…"
              : `Pay ${formatAmount(summary.breakdown.totalAmount, summary.breakdown.currency)}`}
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Secured by Razorpay
          </p>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="max-w-xl mx-auto px-6 py-16">Loading…</div>}>
      <CheckoutPageInner />
    </Suspense>
  );
}
