// components/pricing/pricing-client.tsx
"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Reveal, RevealGroup } from "@/hooks/use-reveal";
import { GetMemberPlans, grantFreePlan, MemberPlan } from "@/lib/services";
import { useUser } from "@/components/provider/authoprovider";

const AppUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.socrate.in";

export function PricingClient() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [plans, setPlans] = useState<MemberPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingPlanId, setClaimingPlanId] = useState<string | null>(null);

  const { userInfo, isLoading: userLoading, refresh } = useUser();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      try {
        const res = await GetMemberPlans();
        if (cancelled) return;
        setPlans(res.data.PlanList);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to fetch plans:", err);
        setError("Failed to load pricing plans. Please try again later.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPlans();

    return () => {
      cancelled = true;
    };
  }, []);

  // Sends an unauthenticated visitor to log in and come straight back to
  // pricing so they can pick up the flow (free grant or checkout) right after.
  const redirectToLogin = () => {
    router.push(`/login?next=${encodeURIComponent("/pricing")}`);
  };

  const handleFreePlan = async (plan: MemberPlan) => {
    if (!userInfo) {
      redirectToLogin();
      return;
    }

    setError(null);
    setClaimingPlanId(plan._id);
    try {
      await grantFreePlan(plan._id);
      await refresh(); // pick up the new membership before leaving
      window.location.href = AppUrl;
    } catch (err) {
      console.error("Failed to grant free plan:", err);
      setError("Couldn't activate your free plan. Please try again.");
      setClaimingPlanId(null);
    }
  };

  return (
    <section id="pricing" className="py-20 md:py-28 bg-muted/50">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-muted-foreground text-lg">
              Start free. Upgrade when you&apos;re ready.
            </p>
          </div>
        </Reveal>

        {loading && (
          <p className="text-center text-muted-foreground">Loading plans…</p>
        )}

        {error && !loading && (
          <p className="text-center text-destructive">{error}</p>
        )}

        {!loading && !error && (
          <RevealGroup className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto" staggerMs={100}>
            {plans.map((plan) => {
              const highlighted = plan.name === "Pro";
              const isFree = plan.price === 0;
              const isClaiming = claimingPlanId === plan._id;

              return (
                <div
                  key={plan._id}
                  className={`relative rounded-xl p-7 border transition-all ${
                    highlighted
                      ? "border-foreground bg-background shadow-xl shadow-foreground/5 scale-[1.02]"
                      : "border-border bg-background"
                  }`}
                >
                  {highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-foreground text-background text-xs font-medium">
                      Most Popular
                    </div>
                  )}

                  <h3 className="font-semibold text-lg mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

                  <div className="mb-4">
                    <span className="text-4xl font-bold">
                      {isFree ? "0" : `₹${plan.price}`}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {isFree ? "/forever" : "/month"}
                    </span>
                  </div>

                  {isFree ? (
                    <Button
                      className="w-full mb-6"
                      variant={highlighted ? "default" : "outline"}
                      onClick={() => handleFreePlan(plan)}
                      disabled={userLoading || isClaiming}
                    >
                      {isClaiming ? "Activating…" : "Get Started"}
                    </Button>
                  ) : plan.name === "Pro" ? (
                    userInfo ? (
                      <Button
                        className="w-full mb-6"
                        variant="default"
                        onClick={() => router.push(`/checkout?planId=${plan._id}`)}
                      >
                        Start your 7 day free trial
                      </Button>
                    ) : (
                      <Button
                        className="w-full mb-6"
                        variant="default"
                        onClick={redirectToLogin}
                        disabled={userLoading}
                      >
                        Start your 7 day free trial
                      </Button>
                    )
                  ) : (
                    <Button
                      className="w-full mb-6"
                      variant={highlighted ? "default" : "outline"}
                      asChild
                    >
                      <Link href="/login">Choose Plan</Link>
                    </Button>
                  )}

                  <ul className="space-y-3">
                    {plan.planFeatures
                      .filter((f) => f.enabled)
                      .map((f) => (
                        <li
                          key={f.featureId}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <Check className="h-4 w-4 text-foreground shrink-0" />
                          {f.limit} {f.featureKey.replace(/_/g, " ")}/month
                        </li>
                      ))}
                  </ul>
                </div>
              );
            })}
          </RevealGroup>
        )}
      </div>
    </section>
  );
}