// lib/pricing.ts

export type BillingCycle = "monthly" | "yearly";
// export type PlanId = "pro";
export type Region = "IN" | "GLOBAL";

type RegionPricing = Record<BillingCycle, { productId: string }>;

// All product IDs come from env vars — nothing hardcoded here.
const PLAN_PRICING: Record<any, Record<Region, RegionPricing>> = {
  pro: {
    IN: {
      monthly: { productId: process.env.DODO_PRICE_ID_PRO_IN_MONTHLY ?? "" },
      yearly: { productId: process.env.DODO_PRICE_ID_PRO_IN_YEARLY ?? "" },
    },
    GLOBAL: {
      monthly: { productId: process.env.DODO_PRICE_ID_PRO_GLOBAL_MONTHLY ?? "" },
      yearly: { productId: process.env.DODO_PRICE_ID_PRO_GLOBAL_YEARLY ?? "" },
    },
  },
};

export function regionFromCountryCode(countryCode: string): Region {
  // return countryCode === "IN" ? "IN" : "GLOBAL";
  return "IN"
}

function isValidPlan(planId: string): planId is any {
  return planId in PLAN_PRICING;
}

function isValidBillingCycle(cycle: string): cycle is BillingCycle {
  return cycle === "monthly" || cycle === "yearly";
}

/**
 * The ONLY function that should decide which Dodo product ID gets charged.
 * planId/billingCycle come from the client (trusted only as a *selection*),
 * region comes from server-side geolocation (never from the client).
 */
export function resolveProductId(
  planId: string,
  billingCycle: string,
  countryCode: string
): string | null {
  if (!isValidPlan(planId) || !isValidBillingCycle(billingCycle)) return null;

  const region = regionFromCountryCode(countryCode);
  const productId = PLAN_PRICING[planId][region][billingCycle].productId;

  return productId || null; // empty string (unset env var) → null
}

// Display-only pricing, also resolved server-side, kept in lockstep with
// the product IDs above so the UI never shows a price the backend won't honor.
export const PRO_DISPLAY_PRICING: Record<
  Region,
  { price: string; originalPrice: string | null; discountBadge: string | null }
> = {
  IN: { price: "₹399", originalPrice: "₹499", discountBadge: "20% off for First 100 Students*" },
  GLOBAL: { price: "$9", originalPrice: null, discountBadge: null },
};